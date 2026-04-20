# Configuration de l'Export des Commandes vers les Sociétés de Livraison

## Statut: ✅ Configuré

Vous disposez maintenant d'un système complet pour exporter vos commandes vers les sociétés de livraison via API.

## Composants configurés

### 1. **Tables de base de données** 
   - ✅ `delivery_provider_credentials` - Stockage des identifiants API
   - ✅ `delivery_shipments` - Historique des envois
   - ✅ `delivery_shipment_items` - Articles des envois
   - ✅ `delivery_export_logs` - Journal des opérations API
   - ✅ `delivery_webhooks` - Configuration des webhooks
   - ✅ `delivery_rates` - Tarifs de livraison

### 2. **Services et utilitaires**
   - ✅ `UnifiedDeliveryService` - Service unifié pour tous les fournisseurs
   - ✅ `DeliveryProviderFactory` - Fabrique pour créer les instances de fournisseurs
   - ✅ Providers implémentés:
     - Best Delivery (Tunisie)
     - Aramex (International)
     - First Delivery (Express local)

### 3. **API Endpoints**
   - ✅ `POST /api/delivery/send-order` - Exporter une commande
   - ✅ `GET /api/delivery/providers` - Récupérer les fournisseurs configurés
   - ✅ `POST /api/delivery/sync-status` - Synchroniser le statut
   - ✅ `POST /api/delivery/init-tables` - Initialiser les tables (nouveau)

### 4. **Sécurité**
   - ✅ Row Level Security (RLS) activé sur toutes les tables
   - ✅ Isolation par tenant
   - ✅ Authentification requise sur tous les endpoints

## Comment utiliser

### Initialiser les tables

Les tables peuvent être créées de 3 façons:

#### Méthode 1: Via API (recommandée)
```bash
curl -X POST http://votre-domain/api/delivery/init-tables \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Méthode 2: Via Dashboard Supabase
1. Allez dans SQL Editor
2. Exécutez le fichier `scripts/070-delivery-export-tables.sql`

#### Méthode 3: Via scripts individuels
```bash
# Dans votre terminal
psql -h votre-host -d votre-db -f scripts/070a-delivery-tables-create.sql
psql -h votre-host -d votre-db -f scripts/070b-delivery-functions.sql
psql -h votre-host -d votre-db -f scripts/070c-delivery-triggers-rls.sql
```

### Configurer les fournisseurs de livraison

Une fois les tables créées:

```sql
INSERT INTO delivery_provider_credentials (
  tenant_id, 
  provider_code, 
  provider_name, 
  api_key,
  api_secret,
  base_url,
  is_enabled,
  is_default
) VALUES (
  'votre-tenant-id',
  'best_delivery',
  'Best Delivery',
  'votre-api-key',
  'votre-api-secret',
  'https://api.bestdelivery.tn',
  true,
  true
);
```

### Exporter une commande

```typescript
import { createDeliveryService } from '@/lib/delivery/service';

const deliveryService = createDeliveryService(tenantId);

const result = await deliveryService.sendToDeliveryProvider({
  order_id: 'uuid-de-la-commande',
  order_number: 'CMD-001',
  customer_name: 'John Doe',
  customer_phone: '+216XXXXXXXX',
  customer_address: '123 Main St',
  customer_city: 'Tunis',
  customer_governorate: 'Tunis',
  cod_amount: 100,
  delivery_type: 'standard',
  total_weight: 5
}, 'best_delivery');

if (result.success) {
  console.log('Numéro de suivi:', result.tracking_number);
  console.log('Shipment ID:', result.shipment_id);
}
```

### Tracker un envoi

```typescript
const trackingInfo = await deliveryService.trackShipment('TRACK-001');
console.log('Statut:', trackingInfo?.status);
console.log('Dernière mise à jour:', trackingInfo?.last_update);
```

### Synchroniser les statuts

```typescript
const statusUpdate = await deliveryService.syncDeliveryStatus('TRACK-001');
console.log('Nouveau statut:', statusUpdate?.current_status);
console.log('Mis à jour le:', statusUpdate?.updated_at);
```

## Architecture du système

```
┌─────────────────────────────────────────────────────────────┐
│                  Application Next.js                         │
└────────────────┬──────────────────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  API Endpoints    │
        │  /api/delivery/*  │
        └────────┬──────────┘
                 │
        ┌────────▼─────────────────────────┐
        │  UnifiedDeliveryService           │
        │  - sendToDeliveryProvider()       │
        │  - trackShipment()                │
        │  - syncDeliveryStatus()           │
        └────────┬──────────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │  DeliveryProviderFactory       │
        │  - Crée les instances         │
        └────────┬───────────────────────┘
                 │
    ┌────────────┼────────────┬──────────────┐
    │            │            │              │
┌───▼──┐    ┌───▼──┐    ┌───▼────────┐
│Best  │    │Aramex│    │First       │
│Deliv.│    │      │    │Delivery    │
└───┬──┘    └───┬──┘    └───┬────────┘
    │           │            │
    └───────────┴────────────┘
         │ (HTTP Requests)
    ┌────▼──────────────────────────────────┐
    │  Delivery Company APIs                 │
    │  - Best Delivery API                   │
    │  - Aramex API                          │
    │  - First Delivery API                  │
    └───────────────────────────────────────┘
```

## Supabase Database Schema

```
┌─────────────────────────────────────────┐
│          Tenant Management               │
├─────────────────────────────────────────┤
│  tenants                                 │
│  tenant_users                            │
│  profiles                                │
└─────────────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────┐
    │   Delivery Export System (RLS)       │
    ├──────────────────────────────────────┤
    │ delivery_provider_credentials        │
    │ delivery_shipments                   │
    │ delivery_shipment_items              │
    │ delivery_export_logs                 │
    │ delivery_webhooks                    │
    │ delivery_rates                       │
    └──────────────────────────────────────┘
```

## Points clés

1. **Multi-tenant**: Chaque tenant a ses propres fournisseurs et commandes
2. **Sécurité**: RLS garantit l'isolation des données par tenant
3. **Extensibilité**: Facile d'ajouter de nouveaux fournisseurs
4. **Traçabilité**: Tous les appels API sont enregistrés
5. **Webhooks**: Support des notifications du fournisseur
6. **Tarification**: Gestion des tarifs par zone et fournisseur

## Fichiers à consulter

- `lib/delivery/types.ts` - Définition des types
- `lib/delivery/service.ts` - Service principal
- `lib/delivery/factory.ts` - Fabrique de fournisseurs
- `lib/delivery/providers/*.ts` - Implémentations des fournisseurs
- `app/api/delivery/*.ts` - API endpoints
- `DELIVERY_SYSTEM.md` - Documentation complète

## Prochaines étapes

1. ✅ Initialiser les tables
2. ✅ Configurer les fournisseurs de livraison
3. ✅ Tester l'API d'export
4. ✅ Configurer les webhooks
5. ✅ Monitoring et logs

## Support

Consultez `DELIVERY_SYSTEM.md` pour:
- Documentation complète des tables
- Exemples d'utilisation
- Troubleshooting
- Configuration avancée

Tous les logs d'export sont disponibles dans la table `delivery_export_logs` pour monitoring et debugging.
