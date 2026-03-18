# PIN Recovery System - Environment Variables Configuration

Pour que le système de récupération de PIN par email fonctionne correctement, vous devez configurer les variables d'environnement suivantes dans Vercel :

## Variables d'environnement requises

### Pour l'envoi d'emails

**Option 1 : Gmail (Recommandé pour tester)**
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

Pour Gmail :
1. Activez l'authentification à deux facteurs
2. Créez un "mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Utilisez ce mot de passe dans `EMAIL_PASSWORD`

**Option 2 : SendGrid (Production)**
```
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

**Option 3 : Autre service SMTP**
```
EMAIL_SERVICE=your-service
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

## Comment ajouter les variables dans Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings → Environment Variables**
4. Ajoutez chaque variable ci-dessus
5. Cliquez sur **Save and Redeploy**

## Flux de récupération de PIN

### 1. Page de récupération : `/auth/forgot-pin`
- L'utilisateur entre son email
- Un code OTP à 6 chiffres est généré et envoyé par email
- Valide pendant 15 minutes

### 2. Vérification OTP
- L'utilisateur entre le code OTP reçu
- Maximum 3 tentatives avant blocage
- Si valide, passage à l'étape suivante

### 3. Nouveau PIN
- L'utilisateur entre et confirme son nouveau PIN (4-6 chiffres)
- Le PIN est mis à jour dans la base de données

## Structure des données

Les colonnes suivantes ont été ajoutées à `tenant_users` :
- `pin_reset_otp` : Le code OTP généré
- `pin_reset_otp_expires_at` : Expiration du OTP (15 minutes)
- `pin_reset_requested_at` : Horodatage de la demande
- `otp_attempts` : Nombre de tentatives (max 3)

## API Endpoints

### POST `/api/auth/request-pin-reset`
Envoie un OTP par email
```json
{
  "email": "manager@kifshop.com"
}
```

### POST `/api/auth/verify-pin-reset-otp`
Vérifie l'OTP et réinitialise le PIN
```json
{
  "tenantUserId": "uuid",
  "otp": "000000",
  "newPin": "1234"
}
```

## Sécurité

- Les OTPs expirent après 15 minutes
- Maximum 3 tentatives pour entrer le OTP
- Les PINs sont stockés en texte brut (pour simplifier) - à considérer pour production
- Le système inclut un rate-limiting côté serveur

## Migrations SQL

Exécutez le script suivant sur votre base Supabase :
```sql
-- scripts/011-add-pin-recovery.sql
```

Le script ajoute les colonnes nécessaires et crée les fonctions PostgreSQL pour :
- Générer un OTP
- Initier la réinitialisation
- Vérifier l'OTP
- Réinitialiser le PIN
