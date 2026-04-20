# Intégration POS80 - Guide complet

## Vue d'ensemble

L'intégration POS80 permet de synchroniser automatiquement les transactions de votre caisse enregistreuse POS80 directement dans KIFSHOP. Les transactions sont importées en temps réel via polling automatique toutes les 5 minutes.

## Architecture

### Composants principaux

1. **Client POS80** (`lib/pos80/client.ts`)
   - Classe `POS80ApiClient` pour communiquer avec l'API REST POS80
   - Gestion de l'authentification (Bearer, API Key, Basic Auth)
   - Récupération des transactions et rapports

2. **Actions serveur** (`lib/pos80/actions.ts`)
   - Gestion de la configuration POS80
   - Stockage sécurisé des paramètres API
   - Test de connexion

3. **Logique de synchronisation** (`lib/pos80/sync.ts`)
   - Synchronisation des transactions POS80
   - Intégration avec la base de données
   - Mise à jour du stock et des revenus
   - Logging détaillé

4. **Routes API**
   - `POST /api/pos80/sync` - Synchronisation manuelle
   - `POST /api/pos80/test-connection` - Test de connexion
   - `GET /api/pos80/status` - État de la configuration
   - `GET /api/cron/sync-pos80` - Cron job automatique (5 min)

5. **Interface utilisateur**
   - `/pos80` - Accueil et navigation
   - `/pos80/config` - Configuration des paramètres API
   - `/pos80/monitoring` - Dashboard de monitoring

## Base de données

### Tables

#### `pos80_config`
Stocke la configuration API POS80 par tenant
```sql
- tenant_id (TEXT) - Référence au tenant
- api_url (TEXT) - URL de l'API POS80
- api_key (TEXT) - Clé API (chiffrée)
- merchant_id (TEXT) - ID Merchant
- terminal_id (TEXT, optionnel) - ID Terminal
- auth_type (VARCHAR) - Type d'authentification
- is_active (BOOLEAN) - Activation/désactivation
- last_tested_at (TIMESTAMP) - Dernier test
- test_status (VARCHAR) - Résultat du dernier test
```

#### `pos80_sync_logs`
Enregistre l'historique de toutes les synchronisations
```sql
- tenant_id (TEXT)
- sync_type (VARCHAR) - 'manual', 'cron', 'webhook'
- status (VARCHAR) - 'running', 'success', 'failed', 'partial'
- transactions_count (INT) - Nombre trouvé
- transactions_created (INT) - Créées
- transactions_updated (INT) - Mises à jour
- stock_updated (INT) - Lignes de stock mises à jour
- revenue_created (DECIMAL) - Revenu importé
- duration_ms (INT) - Temps d'exécution
- pos80_response_time_ms (INT) - Temps réponse API
- error_message (TEXT) - Message d'erreur si applicable
```

#### `pos_sales` (colonnes ajoutées)
```sql
- source (VARCHAR) - 'manual', 'pos80', 'other'
- pos80_transaction_id (TEXT) - Lien vers transaction POS80
- pos80_sync_log_id (BIGINT) - Lien vers le log de sync
```

## Configuration

### 1. Obtenir les paramètres POS80

Contactez votre administrateur POS80 pour obtenir:
- **URL de l'API** - Ex: `https://api.pos80.com/v1`
- **Merchant ID** - Identifiant de votre commerce
- **Terminal ID** (optionnel) - ID spécifique du terminal
- **Type d'authentification** - Bearer, API Key ou Basic Auth
- **Clé API / Token** - Credentials de connexion

### 2. Configurer via l'interface

1. Allez à `/pos80/config`
2. Entrez vos paramètres POS80
3. Testez la connexion avec le bouton "Tester la connexion"
4. Sauvegardez la configuration

### 3. Déploiement

Pour Vercel:
- La config Cron est définie dans `vercel.json`
- Route: `/api/cron/sync-pos80`
- Fréquence: Toutes les 5 minutes
- Authentification: `CRON_SECRET` via en-têtes

## Flux de synchronisation

```
┌─────────────────────┐
│   Cron Job          │ (toutes les 5 min)
│ /api/cron/sync-pos80│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Fetch transactions │ Depuis POS80 API
│  du dernier appel   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check duplicates   │ Via pos80_transaction_id
│  dans pos_sales     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create/Update      │ Dans pos_sales
│  transactions       │ Avec source='pos80'
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update stock       │ Déduction si items
│  log sync result    │
└─────────────────────┘
```

## Gestion des erreurs

### Types d'erreurs gérées

1. **Connexion API**
   - Timeout (30s)
   - Erreur HTTP 401/403/404
   - Réponse invalide

2. **Validation**
   - Données manquantes
   - Format invalide
   - Doublon détecté

3. **Base de données**
   - Erreur RLS
   - Constraints violées
   - Références manquantes

### Retry logic

- Cron job: Automatique via Vercel
- Erreurs réseau: 1 retry après 30s (côté client)
- Erreurs de validation: Loggées, pas de retry

## Monitoring

### Dashboard `/pos80/monitoring`

Affiche:
- **Statistiques** - Total syncs, taux succès, transactions, revenu
- **Historique** - Dernières 50 synchronisations
- **Erreurs** - Liste des syncs échouées avec messages
- **Performance** - Durée sync, temps réponse API

### Logs

Tous les appels API POS80 sont loggés:
```
[v0] POS80 Cron Job Started
[v0] Found X active tenants for sync
[v0] Synced X transactions for tenant Y
```

## API Endpoints

### POST /api/pos80/sync
Déclenche une synchronisation manuelle

**Request:**
```json
{
  "syncType": "manual",
  "since": "2026-03-17T00:00:00Z",
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionsFound": 15,
    "transactionsCreated": 12,
    "transactionsUpdated": 3,
    "stockUpdated": 8,
    "revenueCreated": 2500.50,
    "duration": "245ms"
  }
}
```

### POST /api/pos80/test-connection
Test la connexion POS80

**Response:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "responseTime": 128
}
```

### GET /api/pos80/status
Récupère le statut de configuration

**Response:**
```json
{
  "configured": true,
  "config": {
    "merchantId": "MERCHANT123",
    "terminalId": "TERM001",
    "isActive": true,
    "lastTestedAt": "2026-03-17T15:30:00Z",
    "testStatus": "success"
  },
  "latestSync": { /* sync log */ },
  "recentSyncs": [ /* array */ ]
}
```

## Sécurité

### Chiffrement

- Les clés API sont stockées chiffrées dans Supabase
- Utiliser `createAdminClient()` pour les opérations sensibles
- Variables d'environnement : `SUPABASE_SERVICE_ROLE_KEY`

### Row Level Security (RLS)

Toutes les tables pos80_* ont RLS activé:
- Les utilisateurs voient seulement les données de leurs tenants
- Seuls les admin/gérants peuvent modifier la configuration
- Logs accessibles à tous les membres du tenant

### Secrets

```env
# .env.local
CRON_SECRET=your-secret-here

# Vercel Secrets (via UI)
CRON_SECRET=your-secret-here
```

## Dépannage

### Erreur: "Configuration POS80 non trouvée"
- Assurez-vous d'avoir configuré les paramètres
- Vérifiez que `is_active = true`

### Erreur: "Erreur HTTP 401"
- Vérifiez la clé API
- Vérifiez le Merchant ID
- Testez la connexion depuis un client REST

### Pas de transactions synchronisées
- Vérifiez que le terminal POS80 a enregistré des transactions
- Consultez le dashboard monitoring pour les erreurs
- Vérifiez que la table `pos_sales` n'est pas saturée (RLS)

### Cron job ne s'exécute pas
- Vérifiez `CRON_SECRET` dans les variables d'environnement Vercel
- Vérifiez les logs Vercel Deployments
- Assurez-vous que `vercel.json` est correct

## Performance

### Optimisations

1. **Indexation**
   - Index sur `tenant_id` pour les tables pos80_*
   - Index sur `pos80_transaction_id` pour recherche rapide

2. **Pagination**
   - Limite par défaut: 100 transactions par sync
   - Logs: 50 dernières syncs

3. **Timeout**
   - API: 30 secondes
   - Test connexion: 10 secondes

## Maintenance

### Archivage des logs

Recommandé après 90 jours:
```sql
DELETE FROM pos80_sync_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Vérification de la santé

Exécuter mensuellement:
```sql
SELECT 
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
  AVG(duration_ms) as avg_duration
FROM pos80_sync_logs
WHERE created_at > NOW() - INTERVAL '30 days';
```

## Support

Pour toute question ou problème:
1. Consultez le dashboard monitoring
2. Vérifiez les logs Vercel
3. Contactez le support KIFSHOP

---

**Dernière mise à jour:** 17 mars 2026
