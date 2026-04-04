# Système d'Export des Commandes vers les Sociétés de Livraison

Ce document décrit la configuration et l'utilisation du système d'export des commandes vers les sociétés de livraison via API.

## Vue d'ensemble

Le système est composé de plusieurs tables de base de données et API endpoints pour gérer:
- Les identifiants des fournisseurs de livraison
- L'historique des envois exportés
- Le suivi des shipments
- Les logs d'export API
- Les webhooks de livraison
- Les tarifs de livraison

## Architecture de la base de données

### Tables principales

#### 1. `delivery_provider_credentials`
Stocke les identifiants API pour chaque fournisseur de livraison par tenant.

```sql
- id: UUID (clé primaire)
- tenant_id: TEXT (référence au tenant)
- provider_code: TEXT (code du fournisseur: 'best_delivery', 'aramex', 'first_delivery')
- provider_name: TEXT (nom du fournisseur)
- api_key: TEXT (clé API)
- api_secret: TEXT (secret API)
- account_number: TEXT (numéro de compte)
- account_pin: TEXT (PIN du compte)
- username: TEXT (nom d'utilisateur)
- password: TEXT (mot de passe)
- base_url: TEXT (URL de base de l'API)
- webhook_url: TEXT (URL du webhook)
- extra_config: JSONB (configuration additionnelle)
- is_enabled: BOOLEAN (activé/désactivé)
- is_default: BOOLEAN (fournisseur par défaut)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `delivery_shipments`
Historique de tous les envois exportés vers les fournisseurs de livraison.

```sql
- id: UUID (clé primaire)
- tenant_id: TEXT
- order_id: UUID (référence à la commande)
- order_number: TEXT (numéro de commande)
- provider_code: TEXT
- customer_name: TEXT
- customer_phone: TEXT
- customer_address: TEXT
- customer_city: TEXT
- customer_governorate: TEXT (gouvernorat de livraison)
- customer_postal_code: TEXT
- delivery_type: TEXT ('standard', 'express', 'same_day')
- tracking_number: TEXT (numéro de suivi)
- provider_shipment_id: TEXT (ID du shipment chez le fournisseur)
- awb_number: TEXT (numéro de lettre de transport aérien)
- cod_amount: DECIMAL (montant à la livraison)
- shipping_cost: DECIMAL (coût de livraison)
- status: TEXT (statut: 'pending', 'sent', 'in_transit', 'delivered', 'failed')
- status_history: JSONB (historique des changements de statut)
- notes: TEXT
- response_data: JSONB (réponse brute de l'API)
- error_message: TEXT (message d'erreur si échec)
- exported_at: TIMESTAMP (date d'export)
- last_sync_at: TIMESTAMP (dernière synchronisation)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 3. `delivery_shipment_items`
Articles dans chaque shipment.

```sql
- id: UUID
- shipment_id: UUID (référence au shipment)
- product_name: TEXT
- quantity: INTEGER
- weight: DECIMAL
- description: TEXT
- created_at: TIMESTAMP
```

#### 4. `delivery_export_logs`
Journal détaillé de toutes les opérations d'export API.

```sql
- id: UUID
- tenant_id: TEXT
- shipment_id: UUID (référence au shipment)
- provider_code: TEXT
- operation: TEXT ('create', 'update', 'cancel', 'track', 'webhook')
- status: TEXT ('success', 'error', 'pending')
- request_payload: JSONB (données envoyées)
- response_payload: JSONB (données reçues)
- error_message: TEXT
- http_status: INTEGER (code HTTP)
- created_at: TIMESTAMP
```

#### 5. `delivery_webhooks`
Configuration des webhooks pour recevoir les mises à jour des fournisseurs.

```sql
- id: UUID
- tenant_id: TEXT
- provider_code: TEXT
- webhook_url: TEXT
- events: TEXT[] (événements à recevoir)
- is_active: BOOLEAN
- secret_token: TEXT (token de sécurité)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 6. `delivery_rates`
Tarifs de livraison par zone et fournisseur.

```sql
- id: UUID
- tenant_id: TEXT
- provider_code: TEXT
- governorate: TEXT (gouvernorat)
- delivery_type: TEXT
- base_rate: DECIMAL (tarif de base)
- per_kg_rate: DECIMAL (tarif par kg)
- cod_fee_percentage: DECIMAL (frais à la livraison)
- min_weight: DECIMAL
- max_weight: DECIMAL
- currency: TEXT (devise: 'TND', 'EUR', etc.)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Initialisation des tables

### Option 1: Via API (recommandé)

Pour initialiser les tables depuis l'API:

```bash
curl -X POST http://localhost:3000/api/delivery/init-tables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 2: Via Dashboard Supabase

1. Accédez au dashboard Supabase
2. Allez dans l'onglet "SQL Editor"
3. Créez une nouvelle requête
4. Copiez et exécutez le contenu du fichier `scripts/070-delivery-export-tables.sql`

### Option 3: Via Scripts SQL

Les scripts SQL sont disponibles dans le dossier `scripts/`:
- `070a-delivery-tables-create.sql` - Création des tables
- `070b-delivery-functions.sql` - Fonctions utilitaires
- `070c-delivery-triggers-rls.sql` - Triggers et RLS

## API Endpoints

### Envoyer une commande à la livraison

```bash
POST /api/delivery/send-order

Body:
{
  "order_id": "uuid",
  "order_number": "ORDER-001",
  "customer_name": "John Doe",
  "customer_phone": "+216XXXXXXXX",
  "customer_address": "123 Main St",
  "customer_city": "Tunis",
  "customer_governorate": "Tunis",
  "customer_postal_code": "2000",
  "cod_amount": 100,
  "delivery_type": "standard",
  "items_description": "Product 1, Product 2",
  "total_weight": 5,
  "provider_code": "best_delivery"
}

Response:
{
  "success": true,
  "tracking_number": "TRACK-001",
  "provider_shipment_id": "PS-12345",
  "awb_number": "AWB-12345",
  "shipment_id": "uuid"
}
```

### Récupérer les fournisseurs

```bash
GET /api/delivery/providers?tenant_id=TENANT_ID

Response:
{
  "providers": [
    {
      "code": "best_delivery",
      "name": "Best Delivery",
      "description": "Service de livraison local tunisien",
      "is_enabled": true,
      "is_default": true
    },
    ...
  ]
}
```

### Synchroniser le statut

```bash
POST /api/delivery/sync-status

Body:
{
  "tracking_number": "TRACK-001",
  "provider_code": "best_delivery"
}

Response:
{
  "success": true,
  "current_status": "in_transit",
  "updated_at": "2026-04-04T09:00:00Z"
}
```

## Configuration des fournisseurs

### Best Delivery

1. Obtenez vos identifiants API auprès de Best Delivery
2. Créez une entrée dans `delivery_provider_credentials`:

```sql
INSERT INTO delivery_provider_credentials (
  tenant_id, provider_code, provider_name, api_key, 
  base_url, is_enabled, is_default
) VALUES (
  'tenant-id', 'best_delivery', 'Best Delivery',
  'YOUR_API_KEY', 'https://api.bestdelivery.tn',
  true, true
);
```

### Aramex

Configuration similaire avec les identifiants Aramex.

### First Delivery

Configuration similaire avec les identifiants First Delivery.

## Sécurité (RLS)

Toutes les tables ont les politiques de sécurité RLS activées pour assurer:
- Les utilisateurs ne voient que les données de leur tenant
- Les données sont isolées par tenant_id
- Les accès non autorisés sont bloqués au niveau de la base de données

## Utilisation dans le code

### Créer un service de livraison

```typescript
import { createDeliveryService } from '@/lib/delivery/service';

const deliveryService = createDeliveryService(tenantId);
```

### Envoyer une commande

```typescript
const result = await deliveryService.sendToDeliveryProvider(
  orderRequest,
  'best_delivery'
);

if (result.success) {
  console.log('Tracking number:', result.tracking_number);
}
```

### Tracker un envoi

```typescript
const trackingInfo = await deliveryService.trackShipment(
  'TRACK-001',
  'best_delivery'
);
```

### Synchroniser le statut

```typescript
const statusInfo = await deliveryService.syncDeliveryStatus(
  'TRACK-001'
);
```

## Fournisseurs de livraison supportés

- **Best Delivery** (`best_delivery`): Service local tunisien
- **Aramex** (`aramex`): Livraison internationale
- **First Delivery** (`first_delivery`): Service express local
- Extensions possibles: MyDHL, FedEx, TNT, etc.

## Logs et monitoring

Tous les appels API sont enregistrés dans `delivery_export_logs` avec:
- Timestamp de l'opération
- Type d'opération
- Statut (success/error)
- Payload de la requête et réponse
- Messages d'erreur
- Code de statut HTTP

## Webhooks

Les fournisseurs de livraison peuvent envoyer des mises à jour via webhooks:

```bash
POST /api/delivery/webhooks

Body:
{
  "provider_code": "best_delivery",
  "event": "delivery.updated",
  "tracking_number": "TRACK-001",
  "new_status": "in_transit",
  "timestamp": "2026-04-04T09:00:00Z"
}
```

## Troubleshooting

### Les tables n'existent pas

Vérifiez que vous avez exécuté les scripts SQL d'initialisation ou appelez l'endpoint `/api/delivery/init-tables`.

### Erreur de permission RLS

Assurez-vous que:
1. L'utilisateur est authentifié
2. L'utilisateur est membre du tenant
3. Les politiques RLS sont correctement configurées

### Erreur de connexion au fournisseur

Vérifiez:
1. Les identifiants API sont corrects
2. L'URL de base de l'API est correcte
3. Le fournisseur est activé (`is_enabled = true`)

## Références

- [Documentation Best Delivery](#)
- [Documentation Aramex](#)
- [Documentation First Delivery](#)
