# 🗂️ Archivage des Commandes - Documentation

## Vue d'ensemble

Le système d'archivage automatique des commandes permet de gérer proprement les commandes terminées (livrées/vendues ou annulées) en les marquant comme archivées sans les supprimer de la base de données.

## Fonctionnalités

### ✅ Interface Utilisateur
- **Section dédiée** dans les paramètres (`/parametres`)
- **Configuration** de la période d'archivage (1-365 jours)
- **Archivage manuel** avec bouton "Archiver maintenant"
- **Statistiques** en temps réel
- **Sauvegarde automatique** des préférences

### ✅ API Disponibles

#### GET `/api/archive/stats`
Retourne les statistiques d'archivage actuelles.

**Réponse :**
```json
{
  "totalArchived": 150,
  "lastRun": "2026-04-06T10:30:00Z",
  "nextRun": null,
  "success": true
}
```

#### GET `/api/cron/archive-orders?days={n}`
Déclenche un archivage manuel.

**Paramètres :**
- `days` (optionnel): Nombre de jours (défaut: 14)

**Headers requis :**
```
Authorization: Bearer {CRON_SECRET}
```

**Réponse :**
```json
{
  "success": true,
  "olderThanDays": 14,
  "archived": 25,
  "details": [
    {"tenantId": "tenant-1", "archived": 15},
    {"tenantId": "tenant-2", "archived": 10}
  ],
  "timestamp": "2026-04-06T10:30:00Z"
}
```

## Conditions d'archivage

Une commande est archivée si elle remplit **TOUTES** ces conditions :

1. **Statut** : `livre` (livré/vendu) OU `annule` (annulé)
2. **Âge** : Plus ancienne que la période configurée (défaut: 14 jours)
3. **Non archivée** : `is_archived` = `false` ou `null`

## Processus d'archivage

```sql
UPDATE orders
SET
  is_archived = true,
  archived_at = NOW(),
  updated_at = NOW()
WHERE
  tenant_id = ?
  AND status IN ('livre', 'annule')
  AND updated_at < ?
  AND (is_archived IS NULL OR is_archived = false)
```

## Sécurité

- **Authentification** : Requis `CRON_SECRET` pour l'API cron
- **Permissions** : Accessible uniquement aux rôles `owner` et `gerant`
- **Validation** : Période limitée entre 1 et 365 jours

## Configuration Cron Job

Pour l'archivage automatique quotidien :

```bash
# Tous les jours à 2h du matin
0 2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
             "https://your-domain.com/api/cron/archive-orders?days=30"
```

## Interface Utilisateur

### Accès
1. Se connecter avec un compte `owner` ou `gerant`
2. Aller dans **Paramètres** (`/parametres`)
3. Faire défiler jusqu'à **"Archivage des Commandes"**

### Fonctionnalités
- **Configuration** : Champ numérique pour la période
- **Archivage manuel** : Bouton avec indicateur de chargement
- **Statistiques** : Compteur et dates des dernières exécutions
- **Feedback** : Toasts de confirmation/erreur

## Avantages

✅ **Performance** : Réduction de la charge sur les requêtes actives
✅ **Organisation** : Séparation claire entre commandes actives et historiques
✅ **Conformité** : Préservation des données pour audit/fiscalité
✅ **Flexibilité** : Configuration personnalisable selon les besoins
✅ **Transparence** : Interface utilisateur intuitive

## Dépannage

### Erreur 401 (Non autorisé)
- Vérifier que `CRON_SECRET` est correctement configuré
- S'assurer que l'header `Authorization` est présent

### Aucune commande archivée
- Vérifier que des commandes correspondent aux critères
- Contrôler la période configurée
- S'assurer que les commandes ne sont pas déjà archivées

### Interface non visible
- Vérifier le rôle utilisateur (`owner` ou `gerant`)
- Rafraîchir la page après connexion

## Scripts de démonstration

Voir `scripts/demo-archive.js` pour un exemple d'utilisation programmatique.