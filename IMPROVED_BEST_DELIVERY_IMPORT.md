# Système d'Import Best Delivery Amélioré

## Modifications Effectuées

### 1. Nouvelle Colonne `cod_amount`
- Ajout de la colonne `cod_amount` (numeric) à `best_delivery_shipments`
- Stocke le montant du Cash On Delivery depuis les rapports Best Delivery
- Valeur par défaut : 0

### 2. Amélioration du Parser CSV
La fonction `importDeliveryReport()` capture maintenant le montant du CSV et le sauvegarde :

**Format CSV attendu :**
```
Code;Nom;Telephone;Adresse;Prix;Frais;Statut;Date de livraison;Notes
TR001;Ahmed;21612345;Tunis;50.000;3.500;delivered;2025-03-11;Délai
```

**Colonnes importantes:**
- `Code` ou `Tracking` : Numéro de suivi
- `Nom` : Nom du client
- `Telephone` : Numéro de téléphone
- `Adresse` : Adresse de livraison
- **`Prix`** : Montant COD (NEW - maintenant capturé et sauvegardé)
- `Frais` : Frais de port (optionnel)
- `Statut` : delivered | pending | returned
- `Date de livraison` : Format YYYY-MM-DD (optionnel)
- `Notes` : Commentaires (optionnel)

### 3. Logique d'Import Améliorée

**Flux d'import :**
1. **Vérification doublon** : Cherche si le shipment existe déjà (même client + même semaine)
2. **Mise à jour** : Si trouvé, met à jour le shipment avec les nuevos données (y compris `cod_amount`)
3. **Création** : Sinon :
   - Crée une vraie commande dans `orders` avec le montant (`total = price`)
   - Crée le shipment dans `best_delivery_shipments` avec `cod_amount`
   - Lie le shipment à la commande via `order_id`

### 4. Affichage des Données
La table `orders` affiche :
- Commandes créées manuellement : montant depuis `orders.total`
- Commandes importées de Best Delivery : montant depuis `best_delivery_shipments.cod_amount`

### 5. Format XML (À Implémenter)

Format XML alternatif pour plus de flexibilité :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<deliveries>
  <delivery>
    <code>TR001</code>
    <customerName>Ahmed</customerName>
    <customerPhone>21612345</customerPhone>
    <customerAddress>Tunis, Rue 123</customerAddress>
    <codAmount>50.000</codAmount>
    <fees>3.500</fees>
    <status>delivered</status>
    <deliveryDate>2025-03-11</deliveryDate>
    <notes>Délai accepté</notes>
  </delivery>
</deliveries>
```

**Avantages du XML :**
- Supporte les montants décimaux avec précision
- Structure hiérarchique pour données complexes
- Pas de problème avec séparateurs ou caractères spéciaux
- Encodage UTF-8 explicite pour caractères accentués

## Fichiers Modifiés

1. **lib/delivery/actions.ts**
   - Ajout de `cod_amount` aux requêtes insert et update
   - Support des deux formats (CSV et XML à venir)

2. **components/dashboard/delivery-import-dialog.tsx**
   - Template CSV mis à jour
   - Support XML en préparation

3. **Database**
   - Colonne `cod_amount` ajoutée à `best_delivery_shipments`

## Validation des Données

L'import valide :
- ✓ Nom client obligatoire
- ✓ Téléphone ou adresse obligatoire (au moins l'un)
- ✓ Prix : Doit être > 0 si spécifié
- ✓ Statut : delivered | pending | returned
- ✓ Doublon : Vérifie les imports de la même semaine

## Prochaines Étapes

1. Ajouter support XML dans le composant d'import
2. Ajouter validation côté client pour les montants
3. Ajouter un rapport pour comparer prix CSV vs prix réels
4. Support de l'import par batch (plusieurs fichiers)
