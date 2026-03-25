# Système de Workflow d'Approvisionnement - Guide d'Utilisation

## Vue d'ensemble

Le système de workflow d'approvisionnement a été complètement intégré dans l'application KIFSHOP. Il gère automatiquement le flux complet: alertes stock → bons d'approvisionnement → commandes fournisseurs, avec traçabilité complète.

## Composants créés

### 1. Pages Workflow
- **`/workflow/stock-alerts`** - Tableau de bord des alertes stock
- **`/workflow/procurement-orders`** - Gestion des bons d'approvisionnement
- **`/workflow/traceability`** - Traçabilité et historique complet

### 2. Composants UI
- `StockAlertsPanel` - Affiche les alertes avec compteurs par sévérité
- `ProcurementOrdersManagement` - Interface de gestion des bons par statut
- `AuditTimeline` - Timeline visuelle de tous les changements (existant)
- `NotificationBell` - Cloche de notification dans la topbar (existante)

### 3. Actions Workflow
Toutes les actions du workflow sont dans `lib/workflow/actions.ts`:
- `convertAlertToApprovisionnement()` - Convertir une alerte en bon
- `validateBonApprovisionnement()` - Valider un bon
- `createPurchaseOrdersFromBonApprov()` - Créer commandes fournisseur
- `fetchBonsApprovisionnement()` - Récupérer les bons
- `fetchWorkflowAudit()` - Récupérer l'historique
- `cancelBonApprovisionnement()` - Annuler un bon

### 4. Notifications
Dans `lib/workflow/notifications.ts`:
- `notifyStockCritical()` - Alerter sur stock critique
- `notifyBonApprovCreated()` - Notifier création bon
- `notifyBonApprovValidated()` - Notifier validation
- `notifyPurchaseOrdersCreated()` - Notifier commandes créées
- `fetchUnreadNotifications()` - Récupérer les notifications
- `markNotificationAsRead()` - Marquer comme lu
- `archiveNotification()` - Archiver une notification

## Flux de travail complet

```
1. Stock Critique
   └─ Alerte stock créée (table: stock_alerts)
   
2. Responsable Magasin
   └─ Convertir alerte en bon d'appro (clic sur "Créer Bon")
   └─ Bon créé en statut DRAFT
   
3. Responsable Approvisionnement
   └─ Valide le bon (DRAFT → VALIDATED)
   └─ Envoie aux fournisseurs (VALIDATED → SENT_TO_SUPPLIERS)
   
4. Commandes Fournisseur
   └─ Groupées par fournisseur
   └─ Statuts: PENDING → ORDERED → RECEIVED
   
5. Traçabilité
   └─ Tous les changements enregistrés dans workflow_audit_log
   └─ Timeline complète disponible
   └─ Détails JSON pour chaque action
```

## Architecture des bases de données

### Tables principales
- `stock_alerts` - Alertes de stock
- `bon_approvisionnement` - Bons d'approvisionnement
- `bon_approvisionnement_items` - Articles dans chaque bon
- `workflow_audit_log` - Historique de toutes les actions
- `workflow_notifications` - Notifications utilisateurs

### Workflow Audit Log
```sql
{
  id: UUID,
  tenant_id: UUID,
  entity_type: 'stock_alert' | 'bon_approvisionnement' | 'purchase_order',
  entity_id: UUID,
  action: 'created' | 'updated' | 'validated' | 'cancelled' | 'converted' | 'sent_to_supplier' | 'ordered' | 'received',
  old_status: string,
  new_status: string,
  details: JSON (détails supplémentaires),
  performed_at: TIMESTAMP,
  performed_by: string (user_id)
}
```

## Intégration avec la UI

### Topbar
- La cloche de notification est intégrée et affiche les notifications workflow
- Badge rouge affiche le nombre de notifications non lues
- Clic pour voir, marquer comme lu, ou archiver

### Menu latéral
- Accès aux 3 pages workflow depuis le menu principal
- Visible pour les rôles: magasinier, achat, gerant, owner

### API Routes
Endpoints API pour les workflows:
- `POST /api/workflow/convert-alerts` - Convertir alertes en bons
- `GET /api/workflow/audit-log` - Récupérer l'audit
- `POST /api/workflow/generate-orders` - Générer commandes

## Test du système

### Scénario 1: Créer une alerte stock
1. Aller à `/stocks`
2. Réduire le stock d'un article sous le minimum
3. Une alerte devrait apparaître dans `/workflow/stock-alerts`

### Scénario 2: Convertir alerte en bon
1. Aller à `/workflow/stock-alerts`
2. Cliquer sur "Créer Bon" pour une alerte
3. Un bon d'approvisionnement est créé
4. Vérifier les notifications

### Scénario 3: Valider et envoyer un bon
1. Aller à `/workflow/procurement-orders`
2. Onglet "Brouillons" - cliquer sur "Valider"
3. Onglet "Validés" - cliquer sur "Envoyer"
4. Voir les commandes créées par fournisseur

### Scénario 4: Tracer une action
1. Aller à `/workflow/traceability`
2. Sélectionner le type d'entité
3. Saisir l'ID d'un bon ou alerte
4. Voir la timeline complète des changements

## Notes importantes

- Tous les changements de statut sont enregistrés dans `workflow_audit_log`
- Les notifications sont créées automatiquement à chaque transition importante
- Le système supporte le multi-tenant (isolation par tenant_id)
- Les permissions d'accès sont contrôlées par rôle
- Les timestamps utilisent le fuseau horaire UTC

## Dépannage

### Alerte ne s'affiche pas
- Vérifier que le stock est bien en dessous du minimum
- Vérifier que l'alerte n'a pas été marquée comme "ignored"
- Vérifier les logs dans la base de données

### Bon ne peut pas être validé
- Vérifier que le bon est en statut "draft"
- Vérifier que le bon contient au moins un article
- Vérifier les permissions de l'utilisateur (rôle achat ou gerant)

### Notification n'apparaît pas
- Vérifier que la table `workflow_notifications` a des données
- Vérifier que l'utilisateur ID correspond dans les notifications
- Checker la cloche en haut à droite

## Personnalisation future

Le système peut être étendu avec:
- Notifications email/SMS
- Intégration API fournisseurs
- Prévisions de stock basées sur IA
- Optimisation des commandes
- Suivi des livraisons en temps réel
- Intégrations ERP
