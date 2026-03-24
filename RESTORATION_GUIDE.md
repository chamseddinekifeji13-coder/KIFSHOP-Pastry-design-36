# 🔧 Guide de Restauration Complète - KIFSHOP

## État Actuel
✅ Tous les 7 scripts SQL de restauration ont été créés dans `/scripts/`  
✅ Une API sécurisée a été créée pour exécuter les migrations  
✅ Une page d'administration a été créée pour déclencher la restauration  

## 📋 Scripts Créés

### Phase 1 - Scripts d'Audit (Correctif)
1. **audit-001-fix-tenants-schema.sql** - Corrige le schéma de la table `tenants`
2. **audit-002-fix-clients-security.sql** - Corrige les vulnérabilités de sécurité RLS dans `clients`
3. **audit-003-create-core-business-tables.sql** - Crée les tables métier manquantes (suppliers, raw_materials, etc.)
4. **audit-004-fix-best-delivery-rls.sql** - Sécurise l'intégration Best Delivery

### Phase 2 - Scripts POS80 (Intégration)
5. **pos80-001-create-pos80-config-table.sql** - Table de configuration POS80
6. **pos80-002-create-pos80-sync-logs-table.sql** - Logs de synchronisation POS80
7. **pos80-003-add-source-column-to-pos-sales.sql** - Tracking source + réconciliation des ventes

## 🚀 Comment Procéder

### Option 1 : Via l'API de Restauration (Recommandé)

1. **Accédez à la page d'admin :**
   ```
   http://localhost:3000/admin/restore-db
   ```

2. **Cliquez sur "Start Restoration"**

3. **Entrez votre MIGRATION_API_KEY** (voir `.env`)

4. **Vérifiez les résultats**

### Option 2 : Exécution Manuelle via psql

```bash
# Connectez-vous à Supabase PostgreSQL
psql $POSTGRES_URL

# Exécutez chaque script
\i scripts/audit-001-fix-tenants-schema.sql
\i scripts/audit-002-fix-clients-security.sql
\i scripts/audit-003-create-core-business-tables.sql
\i scripts/audit-004-fix-best-delivery-rls.sql
\i scripts/pos80-001-create-pos80-config-table.sql
\i scripts/pos80-002-create-pos80-sync-logs-table.sql
\i scripts/pos80-003-add-source-column-to-pos-sales.sql
```

## ✅ Vérification Post-Restauration

Après l'exécution, vérifiez que ces éléments existent :

### Tables Créées/Corrigées
- ✓ `tenants` (avec slug, subscription_plan, is_active)
- ✓ `clients` (avec RLS corrigé)
- ✓ `suppliers` (nouvelle table)
- ✓ `raw_materials` (nouvelle table)
- ✓ `best_delivery_trackings` (RLS corrigée)
- ✓ `pos80_config` (nouvelle table)
- ✓ `pos80_sync_logs` (nouvelle table)
- ✓ `sales_reconciliation` (nouvelle table)
- ✓ `orders` (avec colonne source)

### Politiques RLS
- ✓ Toutes les tables ont RLS activé
- ✓ Les politiques utilisent `tenant_users` (pas `tenant_members`)
- ✓ Les colonnes `tenant_id` sont TEXT (pas UUID)

## 🔑 Configuration Nécessaire

Assurez-vous que ces variables d'environnement sont définies dans `.env.local` :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Migration (créer une clé sécurisée)
MIGRATION_API_KEY=super_secret_migration_key_12345
```

## 📊 Résumé des Corrections

### Avant Restauration ❌
- Tables manquantes pour les fournisseurs, matières premières, etc.
- RLS utilisant `USING (true)` = faille de sécurité majeure
- Mismatch de types `tenant_id` (UUID vs TEXT)
- Pas d'intégration POS80
- Pas de tracking source pour les commandes

### Après Restauration ✅
- Toutes les tables métier présentes
- RLS correct avec isolation par tenant
- Types de données cohérents
- Intégration POS80 complète
- Tracking et réconciliation des ventes
- Audit complet de l'intégrité des données

## 🆘 Troubleshooting

### Erreur : "Unauthorized"
→ Vérifiez que `MIGRATION_API_KEY` est correct

### Erreur : "Missing Supabase credentials"
→ Vérifiez `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

### Erreur : "Relation X already exists"
→ Les migrations utilisent `IF NOT EXISTS`, c'est normal. Les scripts sont idempotents.

### Erreur : "RLS is not enabled on relation"
→ Les scripts habilitent RLS automatiquement. Vérifiez les logs d'erreur détaillés.

## 📞 Prochaines Étapes

1. ✅ Exécuter la restauration
2. ✅ Vérifier les logs pour les erreurs
3. Tester l'accès aux données par tenant
4. Vérifier que les utilisateurs ont les permissions correctes
5. Tester l'intégration POS80
6. Mettre à jour la code application pour utiliser les nouvelles tables
