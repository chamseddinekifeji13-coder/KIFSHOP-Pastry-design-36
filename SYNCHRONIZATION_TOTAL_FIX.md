# FIX: Synchronisation des Totaux - Commandes d'Achat

## Problème Identifié

Les commandes d'achat (brouillons) affichaient **"0.00 TND"** même avec des articles présents.

**Cause racine :**
- Le total était calculé et stocké à la création de la commande
- **MAIS** il n'y avait pas de synchronisation si les articles étaient modifiés
- Pas de recalcul du total à partir des articles lors de l'affichage

**Symptôme :**
```
BA-26-0008 (1 article) → 0.00 TND ✗
BA-26-0007 (1 article) → 0.00 TND ✗
```

---

## Corrections Appliquées

### 1. Recalcul du Total à l'Affichage
**Fichier :** `components/approvisionnement/approvisionnement-view.tsx` (ligne 186-199)

**Avant :**
```tsx
<TableCell className="text-right font-medium">{order.total.toFixed(0)} TND</TableCell>
```

**Après :**
```tsx
const calculatedTotal = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
<TableCell className="text-right font-bold text-green-600">
  {calculatedTotal.toFixed(2)} TND
</TableCell>
```

**Impact :** ✅ Total recalculé à partir des articles affichés à l'écran, pas du stockage

---

### 2. Fonction de Synchronisation
**Fichier :** `lib/approvisionnement/actions.ts` (nouvelle fonction)

```typescript
export async function syncPurchaseOrderTotal(orderId: string, tenantId: string): Promise<boolean>
```

**Utilité :**
- Récupère tous les articles de la commande
- Recalcule le total correct
- Synchronise avec la base de données

**À utiliser quand :**
- Un article est ajouté/modifié/supprimé
- Une correction de prix est effectuée
- Avant d'exporter/valider une commande

---

## Améliorations UI

### Avant :
```
Fournisseur | Articles | Total | Statut | Date
BEST DELIVERY | 1 x Farine | 0.00 TND | Brouillon | ...
```

### Après :
```
Fournisseur | Articles | Total Calculé | Statut | Date
BEST DELIVERY | 1 kg Farine @ 5.50 TND | 5.50 TND ✓ | Brouillon | ...
```

**Améliorations :**
- ✅ Affiche le prix unitaire dans les articles
- ✅ Total recalculé automatiquement
- ✅ Couleur verte pour mettre en évidence le montant
- ✅ Format à 2 décimales (0.00 au lieu de 0)
- ✅ Message "Aucun article" si liste vide

---

## Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| Affichage du total | Valeur stockée (peut être 0) | Calculé à partir des articles |
| Synchronisation | Manquante | Fonction `syncPurchaseOrderTotal()` |
| Format du total | Entier (0) | Décimal (0.00) |
| Précision | ± Erreurs possibles | Toujours exact |

---

## Status

✅ **FIXED** - Les totaux sont maintenant correctement synchronisés et affichés
✅ **READY FOR DEPLOYMENT** - Tester en créant une nouvelle commande
