# Fusion Hybride des Commandes - Mode Rapide ↔ Mode Complet

## Résumé des changements

Nous avons créé une **expérience hybride unifiée** pour les commandes avec deux modes complémentaires :

### 🚀 Mode Rapide (Défaut au démarrage)
- Recherche client par téléphone
- Ajout rapide d'articles
- Calcul automatique du total
- Interface minimaliste et rapide
- Idéal pour les ventes comptoir

### ⚙️ Mode Complet (Extensible depuis le mode rapide)
- Tous les champs du mode rapide
- PLUS : Livraison (pickup/delivery avec couriers)
- PLUS : Notes et source de commande
- PLUS : Type de commande (offres client/personnel)
- PLUS : Gestion des réductions
- Parfait pour les commandes complexes

## Flux d'utilisation

```
┌─────────────────────────────────────────────────────────┐
│  Nouvelle Commande - Mode Rapide (Défaut)              │
├─────────────────────────────────────────────────────────┤
│  1. Rechercher client par téléphone                     │
│  2. Ajouter articles                                     │
│  3. Valider commande                                     │
│                                                          │
│  [⚡ Mode Rapide] [⚙️ Mode Complet] (boutons au header) │
└─────────────────────────────────────────────────────────┘

BASCULER VERS MODE COMPLET
         ↓
┌─────────────────────────────────────────────────────────┐
│  Nouvelle Commande - Mode Complet                      │
├─────────────────────────────────────────────────────────┤
│  - Recherche client (conservée)                         │
│  - Articles (conservés)                                 │
│  - LIVRAISON (affichée)                                 │
│  - AUTRES DÉTAILS (Source, Notes)                       │
│  - TYPE DE COMMANDE (Offres)                            │
│                                                          │
│  [⚡ Mode Rapide] [⚙️ Mode Complet] (boutons au header) │
└─────────────────────────────────────────────────────────┘
```

## Fichiers modifiés

### ✅ Améliorés
- **`components/orders/unified-order-dialog.tsx`**
  - Ajout du state `orderMode` (fast|full)
  - Boutons Mode Rapide / Mode Complet au header
  - Masquage des sections selon le mode :
    - Mode FAST : masque Livraison, Autres Détails, Type de Commande
    - Mode FULL : affiche toutes les sections

### ✅ Créés
- **`components/cash-register/quick-order-button.tsx`**
  - Nouveau bouton pour lancer les commandes depuis la caisse
  - Intègre `UnifiedOrderDialog`

### ✅ Modifiés
- **`app/(dashboard)/cash-register/page.tsx`**
  - Remplace le formulaire simplifié par le bouton `QuickOrderButton`
  - Améliore la disposition (bouton en haut à droite)

### ❌ Supprimés
- **`components/orders/new-order-drawer.tsx`** (drawer complet - remplacé par Mode Complet)
- **`components/cash-register/new-order-form.tsx`** (formulaire simple - remplacé par Mode Rapide)

## Avantages de cette approche

✨ **Une seule interface pour tout** : Plus besoin de basculer entre 2 composants
⚡ **Expérience rapide par défaut** : Les utilisateurs commencent en Mode Rapide
🎯 **Extensible** : Basculer à Mode Complet sans quitter le dialog
🧹 **Code propre** : Suppression de 2 fichiers dupliqués et confus
💾 **État conservé** : Tous les articles/client restent quand on bascule de mode

## Tests recommandés

1. Lancer une commande en Mode Rapide (recherche + articles + valider)
2. Basculer en Mode Complet et vérifier que tout est conservé
3. Ajouter des livraisons/offres en Mode Complet
4. Vérifier que le bouton "Nouvelle Commande" de la caisse fonctionne
5. Vérifier que le bouton "Nouvelle Commande" des commandes fonctionne (orders-view)

## Notes techniques

- Les boutons Mode sont désactivés jusqu'à ce qu'un client soit trouvé
- Le mode par défaut est toujours "fast" au démarrage
- Les sections masquées ne sont pas rendues (pas de surcharge DOM)
- Le reset de la dialog remet toujours le mode à "fast"
