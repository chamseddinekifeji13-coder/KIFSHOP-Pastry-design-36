# Configuration des APIs de Livraison - KIFSHOP

## Où trouver la configuration des APIs ?

### Dans l'interface KIFSHOP:

**Menu → Paramètres → "Delivery Provider API Configuration"**

ou directement: `/settings`

Vous verrez une nouvelle carte avec le titre **"Delivery Provider API Configuration"** qui vous permet de configurer Aramex, First Delivery et Best Delivery.

---

## Étapes de configuration

### 1. Initialiser la base de données (UNE SEULE FOIS)

Allez dans **Supabase Dashboard** > **SQL Editor** et exécutez le script complet:

```
https://supabase.com → Your Project → SQL Editor
```

Collez le contenu de `scripts/create-delivery-providers-table.sql` et cliquez **RUN**.

---

### 2. Accéder à la configuration dans KIFSHOP

1. Allez dans **Menu → Paramètres**
2. Trouvez la carte **"Delivery Provider API Configuration"**
3. Cliquez sur **"Add Provider"** (bouton bleu en haut à droite)

---

### 3. Configurer chaque fournisseur

Pour chaque fournisseur (Aramex, First Delivery, Best Delivery):

**Informations à fournir:**
- API Key - Clé d'accès API du fournisseur (obligatoire)
- API Secret - Secret API (si applicable)
- Account Number - Numéro de compte (ex: Numéro de compte Aramex)
- Account PIN - Code PIN du compte
- Base URL - URL personnalisée API (optionnel)
- Enable this provider - Cocher pour activer

---

### 4. Tester la connexion

Après avoir sauvegardé les credentials:
1. Cliquez sur le bouton **"Test"** dans la ligne du fournisseur
2. Un message s'affichera pour confirmer que la connexion fonctionne

---

### 5. Définir le fournisseur par défaut

Si vous avez plusieurs fournisseurs configurés:
- Cliquez sur **"Set as default"** dans la ligne du fournisseur
- Ce fournisseur sera utilisé automatiquement lors de l'envoi des commandes

---

## Utiliser les APIs pour envoyer des commandes

Une fois les APIs configurées, vous pouvez envoyer les commandes directement via l'interface ou via API.

---

## Fournisseurs supportés

| Fournisseur | Code API | Auth Type | Status |
|------------|----------|-----------|--------|
| Aramex | aramex | Account + PIN | Supporté |
| First Delivery | first_delivery | API Key | Supporté |
| Best Delivery | best_delivery | API Key | Intégré |

---

## Dépannage

**Je ne vois pas "Delivery Provider API Configuration"?**
- Vérifiez que vous êtes owner ou gérant
- Exécutez le script SQL dans Supabase d'abord
- Rechargez la page (F5)

**"Table does not exist" error?**
- Le script SQL n'a pas été exécuté. Allez dans Supabase SQL Editor et exécutez `scripts/create-delivery-providers-table.sql`

**La connexion au fournisseur échoue?**
- Vérifiez vos credentials (API Key, Account Number, PIN)
- Assurez-vous que le compte est actif chez le fournisseur
- Essayez de tester via les outils du fournisseur en premier
