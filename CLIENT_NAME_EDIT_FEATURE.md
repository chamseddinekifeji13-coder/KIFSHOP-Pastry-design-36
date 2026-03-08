# Fonctionnalité : Édition du Nom du Client pendant la Commande

## Problème Résolu
Auparavant, si vous trouviez un client existant par numéro de téléphone et que le nom était incorrect, vous ne pouviez pas le corriger pendant la création de la commande.

## Solution Implémentée
Ajout d'un **bouton Éditer (Pencil)** à côté du nom du client qui permet de modifier le nom directement dans le dialog de commande.

## Fonctionnement

### 1. Affichage du Bouton Éditer
- Quand un client est trouvé/sélectionné, un bouton avec une icône **Pencil** apparaît
- Le bouton est situé à droite du nom du client

### 2. Mode Édition
Cliquer sur le bouton Éditer active :
- Un champ Input avec le nom actuel du client
- Un bouton **Check** (✓) pour confirmer
- Un bouton **X** pour annuler

### 3. Validation et Sauvegarde
- Appuyez sur **Entrée** pour sauvegarder
- Cliquez sur **Check** pour sauvegarder
- Cliquez sur **X** ou **Échap** pour annuler

### 4. Synchronisation Base de Données
- Le nom est immédiatement mis à jour dans la table `clients`
- Un message "Nom du client mis à jour" s'affiche
- La modification est disponible pour les prochaines commandes

## Code Modifié

### Fichier : `components/orders/unified-order-dialog.tsx`

**Nouveaux States :**
```typescript
const [clientName, setClientName] = useState("")              // Nom actuel
const [clientNameEditMode, setClientNameEditMode] = useState(false)  // Mode édition ON/OFF
const [clientNameEdit, setClientNameEdit] = useState("")      // Valeur en édition
```

**Nouvelles Fonctions :**
```typescript
// Sauvegarde le nom édité en BD
const handleEditClientName = async () => { ... }

// Annule l'édition
const handleCancelEditClientName = () => { ... }
```

**UI Améliorée :**
- Affichage normal : Nom + Bouton Éditer
- Mode édition : Input + Check + X

## Flux UX Complet

```
1. Chercher client par téléphone
   ↓
2. Client trouvé → Nom s'affiche + Bouton Éditer visible
   ↓
3. Cliquer Éditer
   ↓
4. Input apparaît avec le nom actuel
   ↓
5. Modifier le nom et appuyer Entrée/Check
   ↓
6. Nom sauvegardé en BD immédiatement
   ↓
7. Continuer la commande ou modifier à nouveau
```

## Cas d'Usage

**Avant :**
- Chercher "21670123456"
- Voir "Client sans nom" ou "Nom Faux"
- **Impossible de corriger** → Créer commande avec mauvais nom

**Après :**
- Chercher "21670123456"
- Voir "Client sans nom" ou "Nom Faux"
- **Cliquer Éditer** → Entrer "Ahmed"
- **Sauvegarder** → BD mise à jour
- Continuer la commande avec le bon nom

## Améliorations Futures

- [ ] Édition du numéro de téléphone
- [ ] Édition du status client (VIP, Warning, etc.)
- [ ] Historique des modifications de nom
- [ ] Bulk edit des clients

## Testez-la !

1. Créer une commande
2. Chercher un client par téléphone
3. Cliquer sur le bouton Pencil
4. Modifier le nom
5. Appuyer Entrée ou cliquer Check
6. Vérifier la mise à jour en base
