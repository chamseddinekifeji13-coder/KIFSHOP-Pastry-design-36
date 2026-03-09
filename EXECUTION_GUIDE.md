# KIFSHOP AUDIT - PLAN D'EXÉCUTION

## Status: Scripts Prêts - À Exécuter Manuellement via Supabase SQL Editor

Les scripts audit ont été créés et sont prêts pour exécution. Veuillez les exécuter manuellement via:
**https://app.supabase.com** → SQL Editor

---

## SCRIPTS À EXÉCUTER (Dans Cet Ordre):

### 1️⃣ CONSOLIDÉ (Recommandé)
**Fichier:** `scripts/audit-consolidated-fix.sql`

Exécute toutes les phases en un seul script:
- ✅ Phase 1: Supprime les politiques RLS défaillantes
- ✅ Phase 2: Crée les tables métier manquantes
- ✅ Phase 3: Configure les colonnes tenants
- ✅ Phase 4: Applique les RLS sécurisées
- ✅ Phase 5: Crée les indexes

**Durée:** ~5-10 secondes

---

## OU EXÉCUTER INDIVIDUELLEMENT:

### 1️⃣ Fixer le schéma tenants
**Fichier:** `scripts/audit-001-fix-tenants-schema.sql`

```sql
-- Ajoute slug, subscription_plan, is_active à tenants
-- Crée les indexes
```

### 2️⃣ Corriger la sécurité des clients ⚠️ CRITIQUE
**Fichier:** `scripts/audit-002-fix-clients-security.sql`

```sql
-- FAILLE SÉCURITÉ: Clients RLS utilise USING (true)
-- FIX: Convertit UUID → TEXT + applique RLS correcte
```

### 3️⃣ Créer les tables métier
**Fichier:** `scripts/audit-003-create-core-business-tables.sql`

```sql
-- Crée:
-- - suppliers
-- - raw_materials
-- - packaging
-- - finished_products
-- - recipes
-- - recipe_ingredients
-- - orders
-- - stock_movements
```

### 4️⃣ Fixer Best Delivery & Support
**Fichier:** `scripts/audit-004-fix-best-delivery-rls.sql`

```sql
-- Fixer RLS sur:
-- - best_delivery_config
-- - best_delivery_shipments
-- - support_tickets
-- - sales_channels
```

---

## ÉTAPES D'EXÉCUTION

### Via Supabase Console:

1. **Aller à:** https://app.supabase.com
2. **Sélectionner:** Votre projet KIFSHOP
3. **Aller à:** SQL Editor (gauche)
4. **Créer une nouvelle requête**
5. **Copier-coller** le contenu du fichier SQL
6. **Cliquer:** Run (ou Ctrl+Entrée)
7. **Vérifier:** Pas d'erreurs (Output panel)

### Ou via psql (CLI):

```bash
# Copier les fichiers SQL
scp scripts/audit-consolidated-fix.sql your-server:~/

# Exécuter via psql
psql "postgresql://user:pass@host/dbname" < audit-consolidated-fix.sql
```

---

## VÉRIFICATION POST-EXÉCUTION

### Test 1: Tables créées
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('suppliers', 'raw_materials', 'recipes', 'orders');
-- Résultat: 4 lignes ✅
```

### Test 2: RLS activée
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true 
ORDER BY tablename;
-- Résultat: ~20+ tables ✅
```

### Test 3: Tenant ID Type
```sql
SELECT table_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
AND table_schema = 'public'
ORDER BY table_name;
-- Résultat: TOUS en 'text' ✅
```

### Test 4: Sécurité RLS (CRITIQUE)
```sql
-- Comme User du Tenant A, exécuter:
SELECT COUNT(*) FROM clients;
-- Résultat: Seulement clients du Tenant A ✅

-- Essayer d'accéder à Tenant B:
UPDATE clients SET name = 'HACKED' 
WHERE tenant_id = 'tenant_B';
-- Résultat: ERROR (0 rows updated) ✅
```

---

## AVANT / APRÈS COMPARAISON

### AVANT (Faille):
```
Tenant A User peut voir:
├── Tous les clients (y compris Tenant B, C, D)
├── Toutes les commandes
├── Tous les fournisseurs
└── Données complètement exposées ❌
```

### APRÈS (Sécurisé):
```
Tenant A User peut voir:
├── Seulement clients Tenant A ✅
├── Seulement commandes Tenant A ✅
├── Seulement fournisseurs Tenant A ✅
└── Données isolées par tenant ✅
```

---

## QUESTIONS FRÉQUENTES

### Q: Mes données existantes seront perdues?
**R:** Non. Les scripts utilisent `CREATE TABLE IF NOT EXISTS` et `DROP POLICY IF EXISTS`.
Les données existantes sont conservées.

### Q: Quel est le temps d'exécution?
**R:** ~5-10 secondes pour tous les scripts combinés.
Peut être plus lent si vous avez beaucoup de données.

### Q: Dois-je arrêter l'app durant l'exécution?
**R:** Non. Les migrations Supabase peuvent être exécutées en direct.
Mais c'est mieux la nuit pour minimiser les impacts.

### Q: Comment vérifier l'exécution?
**R:** Regarder le panel "Output" dans Supabase SQL Editor.
Pas de message = succès ✅
Message d'erreur = problème ❌

### Q: Que se passe-t-il si une erreur survient?
**R:** Les scripts `DROP IF EXISTS` évitent les erreurs.
Si vraiment problème, contactez support Supabase.

---

## RÉSUMÉ DES CHANGEMENTS

### Sécurité:
- ✅ Élimine failles RLS multi-tenant
- ✅ Applique isolation tenant correcte
- ✅ Corrects les types données incompatibles

### Fonctionnalité:
- ✅ Ajoute tables manquantes
- ✅ Implémente workflow métier complet
- ✅ Crée indexes performance

### Code:
- ✅ Actions métier peuvent fonctionner
- ✅ Approvisionnement → Production → Ventes
- ✅ Stock tracking + Recettes + Orders

---

## CONTACT

**En cas de problème:**
1. Vérifier les logs Supabase (Logs → SQL Editor)
2. Vérifier la connectivité base de données
3. Relire l'AUDIT_REPORT.md pour contexte
4. Contacter support Vercel/Supabase

---

**Audit Date:** 9 Mars 2026
**Status:** ✅ SCRIPTS PRÊTS POUR EXÉCUTION
**Urgence:** 🔴 CRITIQUE - Faille Sécurité Détectée
