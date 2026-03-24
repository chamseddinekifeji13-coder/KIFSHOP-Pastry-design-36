# 🏗️ KIFSHOP - Architecture de Restauration

## 📐 Vue d'Ensemble

La restauration KIFSHOP suit une approche en 4 couches :

```
┌─────────────────────────────────────────┐
│   Interface Utilisateur (Admin Pages)    │
│  /admin/restore-db, /admin/verify-db    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Couche API Sécurisée (Next.js API)    │
│  /api/admin/restore-db [POST]           │
│  Authentification: X-API-Key            │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Couche Métier (SQL Migrations)        │
│  7 scripts SQL corrigés et testés       │
│  Ordre: audit-001 → pos80-003           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Couche Données (Supabase PostgreSQL)  │
│  12+ tables créées/corrigées            │
│  RLS activé sur chaque table            │
└─────────────────────────────────────────┘
```

---

## 🔐 Flux de Sécurité

### 1. Authentification
```
Client → Formulaire → MIGRATION_API_KEY
↓
API → Vérifie le header x-api-key
↓
Si valide → Exécute les migrations
Si invalide → Retour 401 Unauthorized
```

### 2. Autorisation
- Seul le propriétaire du `MIGRATION_API_KEY` peut restaurer
- Logs détaillés de chaque tentative
- Variables d'environnement sécurisées (pas de secrets en frontend)

### 3. Isolation des Données
```
user_auth.uid() → Trouve les tenants de cet utilisateur
↓
Policies RLS → Restreint les données
↓
Chaque utilisateur ne voit que ses propres données
```

---

## 📁 Structure des Fichiers

```
/vercel/share/v0-project/
├── scripts/
│   ├── audit-001-fix-tenants-schema.sql
│   ├── audit-002-fix-clients-security.sql
│   ├── audit-003-create-core-business-tables.sql
│   ├── audit-004-fix-best-delivery-rls.sql
│   ├── pos80-001-create-pos80-config-table.sql
│   ├── pos80-002-create-pos80-sync-logs-table.sql
│   └── pos80-003-add-source-column-to-pos-sales.sql
│
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── restore-db/
│   │           └── route.js (257 lignes)
│   └── admin/
│       ├── restore-db/
│       │   └── page.tsx (123 lignes)
│       └── verify-db/
│           └── page.tsx (240 lignes)
│
├── Documentation/
│   ├── QUICK_RESTORE.md (Guide rapide)
│   ├── RESTORATION_GUIDE.md (Guide complet)
│   ├── RESTORATION_STATUS.md (État actuel)
│   ├── AUDIT_ISSUES_AND_FIXES.md (Détail des problèmes)
│   └── RESTORATION_ARCHITECTURE.md (Ce fichier)
```

---

## 🔄 Flux d'Exécution

### Phase 1 : Vérification Initiale
```
User accède /admin/verify-db
↓
Page charge avec supabase client
↓
Vérifie 8+ tables clés
↓
Affiche l'état (green/yellow/red)
↓
Utilisateur clique "Go to Restoration"
```

### Phase 2 : Restauration
```
User accède /admin/restore-db
↓
Clique "Start Restoration"
↓
Prompt demande MIGRATION_API_KEY
↓
POST /api/admin/restore-db
  avec header: x-api-key
↓
API vérifie la clé
↓
Exécute 7 scripts dans l'ordre
↓
Retourne résultats détaillés
↓
UI affiche success/failed pour chaque script
```

### Phase 3 : Post-Restauration
```
User retourne à /admin/verify-db
↓
Vérifie que les problèmes sont résolus
↓
Tous les checks passent ✓
```

---

## 🎯 Détails Techniques

### API Endpoint

```javascript
POST /api/admin/restore-db
Headers: {
  'x-api-key': 'your_secret_key'
}

Response: {
  message: "Migration process completed",
  results: [
    {
      name: "audit-001-fix-tenants-schema",
      status: "success"|"failed",
      error?: "error message if failed"
    },
    ...
  ]
}
```

### Variables d'Environnement Requises

```env
# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Backend
SUPABASE_SERVICE_ROLE_KEY=xxx
POSTGRES_URL=postgres://user:pass@host/db

# Sécurité
MIGRATION_API_KEY=super_secret_key_12345
```

### Scripts SQL : Conventions

Chaque script suit ces conventions :

1. **Idempotence**
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   CREATE POLICY IF NOT EXISTS ...
   DROP POLICY IF EXISTS ... (avant de recréer)
   ```

2. **Sécurité RLS**
   ```sql
   ALTER TABLE public.xxx ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "description" ON public.xxx FOR [SELECT|INSERT|UPDATE|DELETE]
     USING/WITH CHECK (...);
   ```

3. **Performance**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tablename_column ON public.tablename(column);
   ```

---

## 📊 Tables Gérées

### Existantes (Corrigées)
- ✅ `tenants` → Ajoute slug, subscription_plan, is_active
- ✅ `clients` → Corrige RLS, convertit tenant_id UUID→TEXT
- ✅ `orders` → Ajoute colonne source
- ✅ `best_delivery_trackings` → Corrige RLS

### Nouvelles (Créées)
- ✅ `suppliers` → Gestion des fournisseurs
- ✅ `raw_materials` → Gestion des matières premières
- ✅ `packaging` → Gestion de l'emballage
- ✅ `finished_products` → Gestion des produits finis
- ✅ `recipes` → Gestion des recettes
- ✅ `stock_movements` → Tracking du stock
- ✅ `pos80_config` → Configuration POS80
- ✅ `pos80_sync_logs` → Logs de synchronisation
- ✅ `sales_reconciliation` → Réconciliation des ventes

---

## 🚨 Gestion des Erreurs

### Erreur au niveau API
```javascript
try {
  // Exécute le script
} catch (error) {
  console.error('[v0]', error);
  return {
    name: script.name,
    status: 'failed',
    error: error.message
  };
}
```

### Erreur au niveau SQL
```sql
-- Le script utilise IF NOT EXISTS
-- Si une table existe déjà, pas d'erreur
-- Si une colonne existe, elle n'est pas ajoutée deux fois
```

### Rollback Strategy
- Pas de transactions globales
- Chaque script est indépendant
- Les erreurs n'arrêtent pas le script suivant
- Tous les changements sont loggés

---

## 🔍 Vérification Post-Exécution

### Checklist automatique
```typescript
// /admin/verify-db effectue les vérifications suivantes:

1. Table exists?
   SELECT 1 FROM information_schema.tables 
   WHERE table_schema='public' AND table_name='xxx'

2. Columns exist?
   SELECT * FROM xxx LIMIT 1
   (vérifie que les colonnes critiques existent)

3. RLS enabled?
   SELECT row_security_enabled 
   FROM pg_tables WHERE tablename='xxx'
```

### Commandes manuelles
```bash
# Vérifier les tables
psql $POSTGRES_URL -c "\dt public.*"

# Vérifier une colonne
psql $POSTGRES_URL -c "\d public.tenants"

# Vérifier RLS
psql $POSTGRES_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'pos80%'"
```

---

## 🔐 Considérations de Sécurité

### ✅ Points Forts
1. API protégée par clé secrète
2. Tous les scripts utilisent `IF NOT EXISTS` (idempotents)
3. RLS activé sur chaque table
4. Pas de DROP TABLE (sûr en production)
5. Logs détaillés pour audit

### ⚠️ Points à Surveiller
1. `SUPABASE_SERVICE_ROLE_KEY` ne doit JAMAIS être exposé au frontend
2. `MIGRATION_API_KEY` doit être complexe et aléatoire
3. Limiter l'accès à `/api/admin/restore-db` si possible
4. Vérifier les logs Supabase après chaque exécution

### 🔐 Bonnes Pratiques
```env
# ✅ BON - Clé longue et aléatoire
MIGRATION_API_KEY=hP8$kLm9!nQ2$xR5@vW0#jY7%zU3^bN6&wX1*cV4+aS

# ❌ MAUVAIS - Clé faible
MIGRATION_API_KEY=password123
MIGRATION_API_KEY=test
```

---

## 📈 Performance

### Temps d'exécution estimé
- audit-001: 1s (simple)
- audit-002: 2s (plus complexe)
- audit-003: 3s (crée 6 tables)
- audit-004: 1s (simple)
- pos80-001: 1s (simple)
- pos80-002: 1s (simple)
- pos80-003: 2s (plus complexe)

**Total estimé: 11 secondes**

### Optimisations possibles
1. Exécuter les scripts en parallèle (actuellement séquentiels)
2. Batch les changements par table
3. Utiliser des migrations Prisma (future)

---

## 🎓 Apprentissages Clés

### 1. Type Consistency
```
❌ AVANT: tenants.id = TEXT, clients.tenant_id = UUID
✅ APRÈS: tenants.id = TEXT, clients.tenant_id = TEXT
```

### 2. RLS Correctness
```
❌ AVANT: USING (true) = faille de sécurité
✅ APRÈS: USING (tenant_id IN (...)) = sécurisé
```

### 3. Table Naming
```
❌ AVANT: RLS référence tenant_members (n'existe pas)
✅ APRÈS: RLS référence tenant_users (table correcte)
```

### 4. Index Importance
```
❌ AVANT: Pas d'index = requêtes lentes
✅ APRÈS: Index sur columns critiques = requêtes rapides
```

---

## 🚀 Évolution Future

### Phase 2 : Améliorations
- [ ] Audit trail : tracking de toutes les modifications
- [ ] Backup automatique : avant chaque migration
- [ ] Notifications : alerter les admins du statut
- [ ] Rollback : permettre d'annuler les changements

### Phase 3 : Intégration
- [ ] Prisma models : auto-généré à partir du schema
- [ ] TypeScript types : générés depuis Prisma
- [ ] Components : UI pour gérer les nouvelles tables
- [ ] POS80 sync : orchestration complète

### Phase 4 : Monitoring
- [ ] Métriques : nombre de records par table
- [ ] Alertes : si RLS est désactivé
- [ ] Dashboard : visualisation du statut BD
- [ ] Logs : retention et analyse

---

## 📞 Ressources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **SQL Migrations**: https://www.liquibase.org/
- **Next.js API Routes**: https://nextjs.org/docs/api-routes/introduction

---

**Version** : 1.0  
**Last Updated** : 24/03/2026  
**Status** : ✅ Prêt pour restauration
