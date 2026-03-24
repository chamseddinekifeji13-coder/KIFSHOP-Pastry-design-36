# 🚀 KIFSHOP - Quick Start à la Restauration

## ⚡ Accès Rapide

### 1. Vérifier l'État de la Base de Données
```
http://localhost:3000/admin/verify-db
```
Cette page affiche l'état actuel de la BD et les problèmes détectés.

### 2. Déclencher la Restauration
```
http://localhost:3000/admin/restore-db
```
Interface pour exécuter les 7 scripts de restauration.

---

## 🔑 Configuration Préalable

Avant toute chose, ajoutez cette clé dans `.env.local` :

```env
MIGRATION_API_KEY=your_secret_key_12345
```

⚠️ Cette clé est REQUISE pour déclencher la restauration (sécurité)

---

## 📖 Documentation Complète

| Document | Contenu |
|----------|---------|
| **RESTORATION_GUIDE.md** | Guide complet de restauration |
| **RESTORATION_STATUS.md** | État actuel et prochaines étapes |
| **AUDIT_ISSUES_AND_FIXES.md** | Détail des 21 problèmes et corrections |
| **NEXT_STEPS_ACTION_NOW.md** | Actions à entreprendre maintenant |

---

## ✅ Checklist Avant Restauration

- [ ] `.env.local` contient `MIGRATION_API_KEY`
- [ ] Supabase est accessible (`NEXT_PUBLIC_SUPABASE_URL` défini)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` est défini
- [ ] Vous êtes sur la branche `continue-restoration`
- [ ] Vous avez lu `RESTORATION_GUIDE.md`

---

## 🎯 Plan d'Action

### Étape 1 : Vérification (5 min)
```bash
# Accédez à
http://localhost:3000/admin/verify-db
```
→ Vérifiez les résultats (green/yellow/red)

### Étape 2 : Restauration (2 min)
```bash
# Accédez à
http://localhost:3000/admin/restore-db
```
→ Entrez votre `MIGRATION_API_KEY`  
→ Cliquez "Start Restoration"  
→ Attendez les résultats

### Étape 3 : Validation (10 min)
```bash
# Re-accédez à
http://localhost:3000/admin/verify-db
```
→ Vérifiez que les problèmes ont disparu

### Étape 4 : Tests (30 min)
- [ ] Connectez-vous en tant qu'admin
- [ ] Testez l'accès aux données par tenant
- [ ] Testez la synchronisation POS80 (si applicable)
- [ ] Vérifiez les logs pour les erreurs

---

## 🛠️ Scripts Exécutés

Les 7 scripts suivants seront exécutés dans cet ordre :

1. **audit-001-fix-tenants-schema.sql**
   - Ajoute `slug`, `subscription_plan`, `is_active` aux tenants

2. **audit-002-fix-clients-security.sql**
   - Corrige les vulnérabilités RLS
   - Convertit `tenant_id` UUID → TEXT

3. **audit-003-create-core-business-tables.sql**
   - Crée suppliers, raw_materials, packaging, finished_products, recipes, stock_movements

4. **audit-004-fix-best-delivery-rls.sql**
   - Sécurise l'intégration Best Delivery

5. **pos80-001-create-pos80-config-table.sql**
   - Table de configuration POS80

6. **pos80-002-create-pos80-sync-logs-table.sql**
   - Table de logs de synchronisation

7. **pos80-003-add-source-column-to-pos-sales.sql**
   - Ajoute source tracking + table de réconciliation

---

## 📊 Résultats Attendus

Après restauration :

✅ **20 problèmes corrigés sur 21**
✅ **8 tables créées/corrigées**
✅ **RLS sécurisé sur toutes les tables**
✅ **Types de données cohérents**
✅ **Index créés pour performance**

---

## 🆘 En Cas d'Erreur

### Erreur : "Unauthorized"
→ Vérifiez que `MIGRATION_API_KEY` dans `.env.local` correspond à celui entré dans le formulaire

### Erreur : "Missing Supabase credentials"
→ Vérifiez que les env vars Supabase sont définies

### Erreur : "Relation X already exists"
→ C'est normal ! Les scripts sont idempotents (utilisent `IF NOT EXISTS`)

### Erreur spécifique d'un script
→ Consultez `AUDIT_ISSUES_AND_FIXES.md` pour les détails sur cette correction

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Consultez les logs** : Dashboard Supabase → SQL Editor → Recent queries
2. **Lisez la documentation** : Les 4 fichiers .md contiennent toutes les réponses
3. **Vérifiez les permissions** : `SUPABASE_SERVICE_ROLE_KEY` doit avoir les droits admin
4. **Testez manuellement** :
   ```bash
   psql $POSTGRES_URL
   \dt public.*
   ```

---

## ✨ Après la Restauration

Une fois la restauration terminée :

1. Tester l'accès par tenant (RLS)
2. Créer les composants UI pour les nouvelles tables
3. Implémenter la synchronisation POS80
4. Documenter les bonnes pratiques pour les développeurs
5. Tester l'application complète

---

**Status** : ✅ Prêt à restaurer  
**Estimated Time** : 5-10 minutes  
**Risk Level** : 🟢 Bas (scripts sûrs et idempotents)

Allez à → `http://localhost:3000/admin/verify-db` pour commencer!
