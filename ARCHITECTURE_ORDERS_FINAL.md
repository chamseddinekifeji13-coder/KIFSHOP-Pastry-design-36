# Architecture Finale des Commandes

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                   COMMANDES UNIFIÉES                        │
│          (UnifiedOrderDialog - Source Unique)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HEADER                                              │  │
│  │  - Titre + icône                                     │  │
│  │  - Description (Mode Rapide / Mode Complet)         │  │
│  │  - [⚡ Mode Rapide] [⚙️ Mode Complet] Boutons       │  │
│  │  - Utilisateur courant                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BODY - Section CLIENT (Toujours visible)           │  │
│  │  - Recherche par téléphone                           │  │
│  │  - Truecaller checkbox                               │  │
│  │  - Fiche client avec statut (VIP/Warning/Normal)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BODY - Section PANIER (Toujours visible)           │  │
│  │  - Recherche + ajout d'articles                      │  │
│  │  - Liste des articles sélectionnés                   │  │
│  │  - Quantité/Prix                                     │  │
│  │  - Subtotal + Shipping = Total                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BODY - Section LIVRAISON (Mode FULL uniquement)     │  │
│  │  - Pickup vs Delivery                                │  │
│  │  - Choix du coursier (Aramex, Stafim, etc.)         │  │
│  │  - Gouvernorat (24 gouvernorats Tunisiens)           │  │
│  │  - Coût de livraison                                 │  │
│  │  - Date de livraison                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BODY - Section AUTRES DÉTAILS (Mode FULL uniquement) │  │
│  │  - Source (Téléphone, Comptoir, Web, Facebook)      │  │
│  │  - Notes spécifiques (textarea)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BODY - Section OFFRES (Mode FULL uniquement)        │  │
│  │  - Type (Normal, Offre Client, Offre Personnel)     │  │
│  │  - Bénéficiaire de l'offre                           │  │
│  │  - Motif (Fidélité, Anniversaire, Promo...)         │  │
│  │  - Réduction (%)                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FOOTER                                              │  │
│  │  - [Annuler] [Enregistrer] Boutons                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Points d'entrée

### 1. Page des Commandes
```
app/(dashboard)/orders/page.tsx
    ↓
components/orders/orders-view.tsx
    ├─ État : const [newOrderOpen, setNewOrderOpen] = useState(false)
    ├─ Bouton : "Nouvelle Commande" → setNewOrderOpen(true)
    └─ Dialog : <UnifiedOrderDialog open={newOrderOpen} onOpenChange={setNewOrderOpen} />
```

### 2. Page de la Caisse
```
app/(dashboard)/cash-register/page.tsx
    ↓
components/cash-register/quick-order-button.tsx
    ├─ État : const [dialogOpen, setDialogOpen] = useState(false)
    ├─ Bouton : "Nouvelle Commande" → setDialogOpen(true)
    └─ Dialog : <UnifiedOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
```

## States et Logique

### Mode du Dialog
```typescript
const [orderMode, setOrderMode] = useState<"fast" | "full">("fast")

// Comportement
- Au démarrage: "fast"
- Après reset/fermeture: "fast"
- Utilisateur peut basculer si client existe
```

### Logique de Masquage
```typescript
{client && orderMode === "full" && (
  // Section Livraison
)}

{client && orderMode === "full" && (
  // Section Autres Détails
)}

{client && orderMode === "full" && (
  // Section Offres
)}
```

## Flux utilisateur

### Scénario 1 : Vente Rapide (Mode Fast)
```
1. User clic "Nouvelle Commande"
   → Dialog ouvre en Mode Rapide

2. Cherche client par téléphone
   → Boutons de mode deviennent actifs

3. Ajoute articles (Gâteau au chocolat × 2, Croissants × 3)
   → Total calculé automatiquement

4. Clic "Enregistrer"
   → Commande créée
   → Dialog ferme
   → Mode revient à "fast"
```

### Scénario 2 : Commande avec Livraison (Mode Full)
```
1. User clic "Nouvelle Commande"
   → Dialog ouvre en Mode Rapide

2. Cherche client par téléphone
   → Boutons de mode deviennent actifs

3. Ajoute articles

4. Clic [⚙️ Mode Complet]
   → Sections Livraison + Autres Détails + Offres apparaissent
   → Articles restent sélectionnés

5. Configure livraison
   - Delivery sélectionné
   - Aramex choisi
   - Tunis sélectionné
   - Coût 8.5 TND

6. Ajoute notes si besoin

7. Clic "Enregistrer"
   → Commande créée avec tous les détails
   → Dialog ferme
   → Mode revient à "fast"
```

### Scénario 3 : Offre Personnel
```
1. User lance commande → Mode Rapide

2. Cherche client → Mode Complet

3. Ajoute articles

4. Bascule à Mode Complet

5. Scroll jusqu'à "Type de Commande"

6. Sélectionne "Offre Personnel"
   → Champs bénéficiaire, motif, réduction apparaissent

7. Entre les détails de l'offre

8. Enregistre

9. Commande créée avec offre appliquée
```

## Points de sécurité et validation

✅ **Client requis** : Buttons de mode disabled jusqu'à trouvaille client
✅ **Articles requis** : Validation avant submission
✅ **Adresse requise** : En delivery mode obligatoire
✅ **Client non bloqué** : Vérification du statut
✅ **Pas de returns excessifs** : Vérification

## Performance

### Optimisations
- Sections cachées ne sont pas rendues (pas de DOM inutile)
- Lazy loading des produits et couriers
- Memoization des filtres de produits
- useCallback pour les handlers

### Bundle Impact
- Suppression de 971 lignes de code dupliqué
- Gain net d'environ 40% moins de code inutile

## Maintenance

### Fichiers clés
- `components/orders/unified-order-dialog.tsx` - Source unique (1164 lignes)
- `components/cash-register/quick-order-button.tsx` - Bouton caisse (35 lignes)
- `components/orders/orders-view.tsx` - Page commandes (utilise dialog)

### Fichiers supprimés
- `components/orders/new-order-drawer.tsx` ❌ (848 lignes)
- `components/cash-register/new-order-form.tsx` ❌ (123 lignes)

### Actions API
- `/api/quick-order` - Crée les commandes

## Tests et QA

### À tester
1. ✅ Mode Rapide end-to-end
2. ✅ Mode Complet end-to-end
3. ✅ Basculement Mode Rapide ↔ Complet
4. ✅ État conservé lors du basculement
5. ✅ Reset après fermeture
6. ✅ Validation des champs requis
7. ✅ Intégration API
8. ✅ Responsive design (mobile/tablet/desktop)

## Considérations futures

### Améliorations UI/UX
- [ ] Animation de slide/expand des sections
- [ ] Drag-and-drop pour les articles
- [ ] Favoris rapides pour les articles
- [ ] Historique des clients récents

### Features
- [ ] Templates de commandes
- [ ] Multi-devise
- [ ] Factures générées automatiquement
- [ ] Intégration SMS pour confirmations

### Performance
- [ ] Pagination des produits
- [ ] Searchbox avec autocomplete
- [ ] Caching des produits
