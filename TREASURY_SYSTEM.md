# Système de Caisse Professionnel - Documentation

## Vue d'ensemble

Le système de trésorerie KIFSHOP est un système de caisse complet destiné aux petits commerces et pâtisseries. Il offre une gestion complète des espèces, un suivi des caissiers, des rapports intelligents et une intégration avec les imprimantes thermiques.

## Fonctionnalités principales

### 1. Gestion des Sessions de Caisse
- **Ouverture de caisse** : Définissez le solde initial au début de la journée
- **Suivi en temps réel** : Votre solde est mis à jour automatiquement avec chaque transaction
- **Fermeture de caisse** : Clôturez la journée avec le solde final et les différences éventuelles
- **Identification** : Chaque session est liée au caissier responsable

**Accès** : Trésorerie → Onglet "Caisse"

### 2. Encaissement Rapide des Commandes
- **Bouton Encaisser** : Disponible sur chaque commande livrée
- **Multi-modes de paiement** : Espèces, Carte bancaire, Chèque, Virement, Autre
- **Traçabilité** : Chaque encaissement enregistre :
  - Montant exacte
  - Mode de paiement
  - Caissier responsable
  - Date et heure
  - Notes optionnelles

**Accès** : Trésorerie → Onglet "Encaissement" ou bouton "Encaisser" sur les commandes

### 3. Rapports Intelligents
Trois niveaux de rapports pour suivre vos recettes :

#### Quotidien (30 derniers jours)
- Graphique en ligne montrant les tendances quotidiennes
- Totaux des ventes, encaissements, dépenses
- Comparaison jour par jour

#### Mensuel (par mois)
- Graphique en barres par mois
- Totaux mensuels consolidés
- Moyennes mensuelles

#### Annuel (par année)
- Graphique en barres par année
- Tendances long terme
- Comparaisons année sur année

**KPIs affichés** :
- Recettes totales
- Total des dépenses
- Bénéfice net
- Moyenne par transaction
- Nombre de transactions

**Accès** : Trésorerie → Onglet "Rapports"

### 4. Suivi des Performances des Caissiers
- **Statistiques individuelles** : Pour chaque caissier
- **Filtrage par période** : Définir une plage de dates
- **Métriques** :
  - Nombre de transactions
  - Nombre d'encaissements
  - Montant total collecté
  - Moyenne par transaction
  - Statut (Actif/Inactif)

**Accès** : Trésorerie → Onglet "Caissiers"

### 5. Intégration ESC/POS (Imprimantes Thermiques)
Pour les utilisateurs avec imprimante thermique connectée :

**Commandes supportées** :
- Ouverture du tiroir caisse (Kick command)
- Impression de reçus
- Impression de Z-reports (rapports de clôture)

**Configuration** :
```
IP : [adresse IP de l'imprimante]
Port : 9100 (port standard ESC/POS)
```

**Accès API** : POST `/api/treasury/esc-pos`

## Architecture Base de Données

### Tables principales

**cash_sessions**
- id (UUID)
- tenant_id (UUID)
- opened_by (UUID) - Caissier qui ouvre
- opened_at (TIMESTAMP)
- opening_balance (DECIMAL)
- closed_by (UUID) - Caissier qui ferme
- closed_at (TIMESTAMP)
- closing_balance (DECIMAL)
- difference (DECIMAL)
- status (VARCHAR) - 'open', 'closed', 'suspended'

**order_collections**
- id (UUID)
- order_id (UUID)
- transaction_id (UUID)
- cash_session_id (UUID)
- amount (DECIMAL)
- payment_method (VARCHAR)
- collected_by (UUID)
- collected_at (TIMESTAMP)

**cash_closures**
- id (UUID)
- closure_date (DATE)
- total_sales (DECIMAL)
- total_collections (DECIMAL)
- total_cash_income (DECIMAL)
- total_card_income (DECIMAL)
- total_expenses (DECIMAL)
- orders_count (INTEGER)
- collections_count (INTEGER)

### Modifications à la table `transactions`
Champs ajoutés :
- created_by (UUID) - Utilisateur qui a créé la transaction
- created_by_name (VARCHAR)
- cash_session_id (UUID) - Session de caisse associée
- order_id (UUID) - Commande associée
- is_collection (BOOLEAN) - Marquer les encaissements

## Utilisation quotidienne

### Matin : Ouverture de caisse
1. Allez à Trésorerie → Caisse
2. Cliquez sur "Ouvrir la caisse"
3. Entrez le solde initial (argent en caisse)
4. Confirmez

### Pendant la journée
- Les encaissements se font automatiquement via le bouton "Encaisser" sur les commandes
- Ou enregistrez manuellement via "Nouvelle transaction"

### Soir : Fermeture de caisse
1. Allez à Trésorerie → Caisse
2. Cliquez sur "Fermer la caisse"
3. Entrez le solde final (compté à la main)
4. Si différence : expliquez la raison
5. Confirmez

### Consulter les rapports
- Trésorerie → Rapports
- Choisissez la période (Quotidien/Mensuel/Annuel)
- Consultez les graphiques et KPIs

### Voir la performance des caissiers
- Trésorerie → Caissiers
- Définissez la plage de dates
- Consultez les statistiques individuelles

## Sécurité et Contrôle

### Permissions
- **Caissier** : Peut encaisser et voir ses propres transactions
- **Gérant** : Peut gérer les sessions et voir tous les rapports
- **Propriétaire** : Accès complet + reset des stats

### Audit Trail
- Chaque transaction enregistre :
  - L'utilisateur qui l'a créée
  - La date et l'heure exacte
  - Le mode de paiement
  - La session de caisse

### Validation des soldes
- Comparaison automatique entre solde attendu et réel
- Alertes en cas de différence > 10% 
- Raison enregistrée pour chaque différence

## APIs

### Récupérer les rapports
```
GET /api/treasury/revenue?type=daily|monthly|annual
```

### Récupérer les stats des caissiers
```
GET /api/treasury/cashier-stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### Ouvrir le tiroir caisse (ESC/POS)
```
POST /api/treasury/esc-pos
{
  "command": "kick",
  "printerIp": "192.168.1.100",
  "printerPort": 9100
}
```

## Troubleshooting

### Le solde ne se met pas à jour
- Vérifiez que la session de caisse est bien ouverte
- Vérifiez que l'encaissement a bien été enregistré

### Différence de solde
- Comparez le solde attendu (initial + transactions) au solde réel
- Expliquez la raison (perte, erreur, etc.)

### Les rapports sont vides
- Assurez-vous qu'il y a des transactions enregistrées pour la période
- Vérifiez les dates de la période sélectionnée

## Support

Pour toute question ou problème, contactez votre administrateur système.
