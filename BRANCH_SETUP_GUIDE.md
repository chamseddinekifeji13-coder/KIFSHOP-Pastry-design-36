# Guide: Créer une nouvelle branche propre sans conflits

## Situation actuelle
- PR actuelle (#482) a 8 commits avec conflits complexes
- Code local est **100% correct**
- Les conflits sont uniquement entre GitHub et la branche

## Solution : Nouvelle branche depuis main

### Étapes à suivre dans votre terminal local :

```bash
# 1. Accédez à votre repository local
cd votre-repo

# 2. Mettez à jour main avec les derniers changements de GitHub
git fetch origin main
git checkout main
git pull origin main

# 3. Créez une nouvelle branche depuis main
git checkout -b v0/packer-production-fixes-final

# 4. (v0 va faire cela) Appliquer les 3 corrections essentielles uniquement
```

## Les 3 fichiers à modifier

### Fichier 1: `components/production/recipe-drawer.tsx`
- Ligne ~20 : Supprimer `import { useSWRConfig } from "swr"`
- Ligne ~47 : Supprimer `const { mutate } = useSWRConfig()`

### Fichier 2: `components/production/production-batch-drawer.tsx`
- Ligne ~15 : Supprimer `import { useSWRConfig } from "swr"`
- Ligne ~28 : Supprimer `const { mutate } = useSWRConfig()`
- Ligne ~79 : Supprimer `mutate((key: string) => typeof key === "string" && key.includes("batches"))`
- Interface `ProductionBatchDrawerProps` : Ajouter `onSuccess?: () => void`
- Après toast.success : Ajouter `onSuccess?.()`

### Fichier 3: `components/production/production-view.tsx`
- Ligne ~362 : Ajouter `onSuccess={() => mutateBatches()}` au ProductionBatchDrawer

## Après les modifications

```bash
# 5. Vérifiez les changements
git status
git diff

# 6. Créez un commit propre avec le message exact
git add components/production/

git commit -m "fix: resolve SWR cache invalidation and remove unused code

- Remove useSWRConfig import from recipe-drawer and production-batch-drawer
- Fix invalid SWR cache invalidation syntax in production-batch-drawer
- Add onSuccess callback to ProductionBatchDrawer for proper cache revalidation
- Ensure recipe and batch caches are invalidated after creation

This fixes the issue where newly created recipes and batches were not
appearing in their respective tabs without manual page refresh."

# 7. Poussez la branche
git push origin v0/packer-production-fixes-final

# 8. Créez une nouvelle PR depuis GitHub
# - Base: main
# - Compare: v0/packer-production-fixes-final
# - Aucun conflit ne devrait apparaître
```

## Fermer l'ancienne PR

Une fois la nouvelle PR créée et en attente d'approbation :
1. Allez sur PR #482
2. Cliquez sur "Close pull request"
3. Sélectionnez "Delete branch" pour supprimer la branche avec conflits

## Fichiers créés pour référence
- `FIXES_SUMMARY_CLEAN.md` - Résumé complet des changements
- Ce guide dans `BRANCH_SETUP_GUIDE.md`
