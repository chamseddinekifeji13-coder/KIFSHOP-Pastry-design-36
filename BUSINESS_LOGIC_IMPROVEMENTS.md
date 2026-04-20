# AMÉLIORATIONS DE LA LOGIQUE MÉTIER - GESTION DES COMMANDES

## 📋 Résumé Exécutif

Deux améliorations critiques de la logique métier ont été implémentées dans `lib/orders/actions.ts` :

1. **Détection automatique des commandes en doublon**
2. **Suppression conditionnelle des commandes** (seulement si statut = "nouveau")

---

## 1️⃣ DÉTECTION DES COMMANDES EN DOUBLON

### Problème Résolu
Auparavant, rien n'empêchait de créer deux commandes identiques par erreur (même client, même montant, même produits).

### Solution Implémentée

#### Nouvelle fonction : `checkDuplicateOrder()`
- Detecte les doublons potentiels en comparant :
  - **Client** : même nom de client
  - **Montant** : même total TND
  - **Délai** : créée il y a moins de 5 minutes
  - **Statut** : seulement commandes en "nouveau"

#### Comportement
```typescript
// À la création d'une commande, avant de l'insérer en base :
const duplicate = await checkDuplicateOrder(supabase, tenantId, customerName, total)

if (duplicate?.isDuplicate) {
  // Retourner une erreur spéciale que l'UI peut détecter
  throw {
    code: "DUPLICATE_ORDER_WARNING",
    duplicate: {
      isDuplicate: true,
      existingOrderId: "abc123",
      existingOrderNumber: "BA-26-0008",
      customerName: "Ahmed Ben Ali",
      total: 320,
      createdAt: "2026-04-07T10:30:00Z"
    }
  }
}
```

#### Types Ajoutés
```typescript
export interface DuplicateOrderWarning {
  isDuplicate: boolean
  existingOrderId?: string
  existingOrderNumber?: string
  customerName: string
  total: number
  createdAt: string
}
```

### UI : Ce Qui Doit Être Affiché
L'interface utilisateur devrait afficher un dialogue comme :

```
⚠️ ATTENTION: COMMANDE EN DOUBLON DÉTECTÉE

Client: Ahmed Ben Ali
Montant: 320 TND
Commande existante: BA-26-0008 (créée il y a 2 minutes)

[REJETER LE DOUBLON]  [ACCEPTER QUAND MÊME]
```

---

## 2️⃣ SUPPRESSION CONDITIONNELLE DES COMMANDES

### Problème Résolu
Avant, n'importe qui pouvait supprimer une commande, même si elle était en préparation, livraison, etc.
Cela causait des incohérences dans le système.

### Solution Implémentée

#### Nouvelle signature
```typescript
export async function deleteOrder(orderId: string, tenantId?: string): Promise<{
  success: boolean
  message: string
}>
```

#### Logique
1. **Vérifier le statut** de la commande
2. **Si statut ≠ "nouveau"** → Rejeter avec message explicite
3. **Si statut = "nouveau"** → Supprimer en cascade :
   - Supprimer les articles (`order_items`)
   - Supprimer l'historique (`order_status_history`)
   - Supprimer la commande

#### Exemple de Réponse
```typescript
// ✅ Succès
{ 
  success: true, 
  message: "Commande supprimée avec succès" 
}

// ❌ Erreur - Statut invalide
{ 
  success: false, 
  message: "Impossible de supprimer. Statut actuel: en-preparation. Seules les commandes en statut \"nouveau\" peuvent être supprimées." 
}

// ❌ Erreur - Commande non trouvée
{ 
  success: false, 
  message: "Commande non trouvée" 
}
```

### Statuts Interdits pour Suppression
- ❌ `en-preparation` - En train d'être préparée
- ❌ `pret` - Prête à être livrée
- ❌ `en-livraison` - En cours de livraison
- ❌ `livre` - Déjà livrée
- ❌ `annule` - Déjà annulée

### Statuts Autorisés pour Suppression
- ✅ `nouveau` - Juste créée

---

## 🔧 Modification de l'UI Requise

Les composants suivants doivent gérer les nouveaux erreurs/comportements :

### Pour la Détection de Doublon
Fichiers concernés :
- `components/orders/unified-order-dialog.tsx` (ou formulaire de création)
- `components/orders/quick-order.tsx`

Code exemple :
```typescript
try {
  const newOrder = await createOrder(orderData)
  // Succès
} catch (error: any) {
  if (error.code === "DUPLICATE_ORDER_WARNING") {
    // Afficher dialogue d'avertissement
    setDuplicateWarning(error.duplicate)
    setShowDuplicateDialog(true)
  } else {
    // Autre erreur
    showErrorToast(error.message)
  }
}
```

### Pour la Suppression Conditionnelle
Fichiers concernés :
- `components/orders/orders-view.tsx` (table avec bouton supprimer)

Code exemple :
```typescript
const handleDelete = async (orderId: string) => {
  const result = await deleteOrder(orderId)
  
  if (!result.success) {
    // Afficher raison du refus
    showErrorToast(result.message)
  } else {
    // Supprimer de la liste
    showSuccessToast(result.message)
  }
}
```

---

## 📊 Comparaison Avant/Après

| Aspect | Avant ❌ | Après ✅ |
|--------|---------|---------|
| **Doublon** | Aucune protection | Détection automatique avec avertissement |
| **Suppression** | N'importe quel statut | Seulement statut "nouveau" |
| **Message d'erreur** | Générique | Spécifique et actionnable |
| **Sécurité données** | Risquée | Sécurisée |

---

## ✅ État d'Implémentation

- ✅ Backend : Logique métier implémentée
- ⏳ Frontend : À implémenter (dialogues d'avertissement)
- ✅ Tests : À faire manuellement

---

## 🎯 Prochaines Étapes

1. Ajouter dialogues d'avertissement dans l'UI pour les doublons
2. Ajouter messages de confirmation pour la suppression
3. Tester les deux scénarios complètement
4. Documenter pour les utilisateurs finaux

