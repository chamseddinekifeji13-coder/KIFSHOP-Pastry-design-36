# Quick Start - Expérience Hybride des Commandes

## 🚀 Démarrage rapide

### Qu'est-ce qui a changé ?

Vous aviez **2 composants séparés** :
- `NewOrderDrawer` - formulaire complet avec tous les détails
- `NewOrderForm` - formulaire simple/rapide

Maintenant vous avez **1 composant unifié** avec 2 modes :
- `UnifiedOrderDialog` - une interface adaptable

### Comment ça marche ?

#### Mode Rapide (défaut)
- Recherche client
- Ajouter articles
- Valider

#### Mode Complet (optionnel)
- Tout du mode rapide
- PLUS livraison, notes, offres

## 📍 Où c'est utilisé ?

### 1️⃣ Page des Commandes
```
Page: app/(dashboard)/orders/page.tsx
Composant: components/orders/orders-view.tsx
Bouton: "Nouvelle Commande" en haut à gauche
```

### 2️⃣ Page de la Caisse
```
Page: app/(dashboard)/cash-register/page.tsx
Composant: components/cash-register/quick-order-button.tsx
Bouton: "Nouvelle Commande" en haut à droite
```

## 🔧 Utilisation Développeur

### Import du Dialog

```typescript
import { UnifiedOrderDialog } from '@/components/orders/unified-order-dialog'

export function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Nouvelle Commande
      </Button>

      <UnifiedOrderDialog
        open={open}
        onOpenChange={setOpen}
        onOrderCreated={() => {
          // Callback quand commande créée
          console.log('Commande créée!')
          // Refresh votre liste, etc.
        }}
      />
    </>
  )
}
```

### Props du Dialog

```typescript
interface UnifiedOrderDialogProps {
  open: boolean                    // Dialog visible ou pas
  onOpenChange: (open: boolean) => void  // Callback pour fermer
  onOrderCreated?: () => void      // Callback après succès
}
```

## 🎨 Les modes internes

### Mode Fast (défaut)

**Sections affichées:**
```
✅ Recherche Client
✅ Panier d'articles
```

**Sections cachées:**
```
❌ Livraison
❌ Autres Détails
❌ Offres
```

### Mode Full (optionnel)

**Sections affichées:**
```
✅ Recherche Client
✅ Panier d'articles
✅ Livraison
✅ Autres Détails
✅ Offres
```

## 🔌 État et API

### État du Dialog
```typescript
// Interne au composant
const [orderMode, setOrderMode] = useState<"fast" | "full">("fast")
```

### API Endpoint
```
POST /api/quick-order
```

**Payload:**
```json
{
  "clientId": "uuid",
  "phone": "22123456",
  "clientName": "Ahmed",
  "amount": 125.5,
  "itemsDescription": "2x Gâteau, 3x Croissants",
  "notes": "Sans sucre",
  "source": "phone",
  "deliveryType": "pickup|delivery",
  "courier": "aramex",
  "gouvernorat": "Tunis",
  "shippingCost": 8.5,
  "deliveryDate": "2026-03-25",
  "address": "123 Rue X",
  "truecallerVerified": true,
  "orderType": "normal|offre_client|offre_personnel",
  "offerBeneficiary": "Fidèle client",
  "offerReason": "Fidélité",
  "discountPercent": 50
}
```

## 🧪 Testing

### Mode Rapide
1. Ouvrir dialog
2. Chercher client (ex: 22123456)
3. Ajouter 2-3 articles
4. Vérifier total
5. Clic Enregistrer

**Résultat attendu**: Commande créée, dialog ferme

### Mode Complet
1. Ouvrir dialog
2. Chercher client
3. Ajouter articles
4. Clic [⚙️ Mode Complet]
5. Vérifier que sections Livraison/Offres apparaissent
6. Remplir livraison
7. Enregistrer

**Résultat attendu**: Commande avec détails de livraison

### Basculement
1. Mode Rapide → ajouter 3 articles
2. Clic [⚙️ Mode Complet]
3. Vérifier articles toujours présents
4. Clic [⚡ Mode Rapide]
5. Vérifier articles toujours présents

**Résultat attendu**: État conservé lors du basculement

## 📚 Docs utiles

Voir aussi:
- `HYBRID_ORDER_EXPERIENCE.md` - Vue d'ensemble
- `ARCHITECTURE_ORDERS_FINAL.md` - Architecture détaillée
- `CHANGELOG_HYBRID_ORDERS.md` - Log des changements

## ❓ FAQ

**Q: Où est NewOrderDrawer ?**
A: Supprimé - remplacé par Mode Complet du dialog unifié

**Q: Où est NewOrderForm ?**
A: Supprimé - remplacé par Mode Rapide du dialog unifié

**Q: Comment forcer Mode Complet au démarrage ?**
A: Changez la ligne 134 du dialog:
```typescript
const [orderMode, setOrderMode] = useState<"fast" | "full">("full")
```

**Q: Les utilisateurs voient les deux modes ?**
A: Oui, les boutons apparaissent une fois qu'un client est trouvé

**Q: Le mode Fast est trop rapide pour mon besoin ?**
A: Utilisez Mode Full directement en forçant `orderMode = "full"`

**Q: Comment ajouter une nouvelle section ?**
A: Ajoutez-la dans le body du dialog avec condition:
```typescript
{client && orderMode === "full" && (
  <div>Votre nouvelle section</div>
)}
```

## 🚨 Erreurs communes

**Dialog n'ouvre pas**
- Vérifiez que `open={true}` est passé
- Vérifier console pour erreurs React

**Boutons Mode désactivés**
- Ils sont disabled tant qu'aucun client n'est trouvé
- Cherchez un client d'abord

**Articles perdus au basculement**
- C'est normal ! Le dialog a été réinitialisé
- WAIT - pas normal ! Ils doivent rester
- Vérifier console pour erreurs

## 💡 Tips & Tricks

### Accélérer recherche client
```
Tapez directement le numéro et appuyez ENTER
(pas besoin de cliquer "Chercher")
```

### Commande personnalisée sans courier
```
1. Mode Complet
2. Sélectionner "Pickup"
3. Courier field disparaît
```

### Offres avec réduction 100%
```
1. Mode Complet
2. "Offre Personnel"
3. Réduction: 100%
→ Article totalement offert
```

## 🐛 Debugging

### Activer logs du dialog
Dans `unified-order-dialog.tsx`, cherchez `console.log("[v0]")`

### Vérifier le mode actuel
```typescript
// Dans le composant:
console.log("[v0] Current mode:", orderMode)
```

### Vérifier API call
Dans Network tab de DevTools:
```
POST /api/quick-order
Status: 200 OK = succès
```

---

**Besoin d'aide ?** Voir `ARCHITECTURE_ORDERS_FINAL.md` pour les détails techniques complets.
