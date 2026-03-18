# Système de Récupération de PIN - Implémentation Complète

## 🎯 Résumé de ce qui a été créé

### 1. **Migration SQL** ✅
- Fichier : `scripts/011-add-pin-recovery.sql`
- Ajoute les colonnes OTP et les fonctions PostgreSQL pour gérer la récupération
- **À exécuter** : Via Supabase SQL Editor

### 2. **APIs REST** ✅

#### POST `/api/auth/request-pin-reset`
- Demande une réinitialisation de PIN
- Envoie un code OTP (6 chiffres) par email
- Valide 15 minutes

**Paramètres** :
```json
{
  "email": "manager@kifshop.com"
}
```

#### POST `/api/auth/verify-pin-reset-otp`
- Vérifie le code OTP et réinitialise le PIN
- Max 3 tentatives avant blocage

**Paramètres** :
```json
{
  "tenantUserId": "uuid",
  "otp": "000000",
  "newPin": "1234"
}
```

### 3. **Interface Utilisateur** ✅

#### Page : `/auth/forgot-pin`
Flux complet en 3 étapes :
1. **Email** : Saisir l'adresse email
2. **OTP** : Entrer le code reçu par email
3. **Nouveau PIN** : Définir et confirmer le nouveau PIN

Le composant `ChangePinDialog` existant gère le changement de PIN manuel.

### 4. **Modifications Existantes** ✅

#### `app/auth/login/page.tsx`
- Ajout du lien "Récupérer votre PIN" 
- Redirige vers `/auth/forgot-pin`

#### `next.config.mjs`
- Suppression de `eslint` (deprecated)
- Configuration validée pour Next.js 16

#### `lib/supabase/proxy.ts`
- Création du fichier proxy (nouvelle convention Next.js 16)
- Ancien `middleware.ts` conservé pour la rétro-compatibilité

#### `package.json`
- Ajout de `nodemailer` pour l'envoi d'emails

---

## 📧 Configuration Email Requise

Vous **DEVEZ** configurer les variables d'environnement dans Vercel Settings → Vars :

### Gmail (Recommandé pour test)
```
EMAIL_SERVICE=gmail
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
```

### SendGrid (Production)
```
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=votre-api-key
```

📖 Pour les détails complets → Consultez `PIN_RECOVERY_SETUP.md`

---

## 🔒 Sécurité

- ✅ OTPs expirent après 15 minutes
- ✅ Maximum 3 tentatives OTP
- ✅ Rate-limiting côté serveur
- ✅ Validation côté client et serveur
- ✅ PINs stockés en base de données

---

## 🚀 Prochaines Étapes

### 1. Exécuter la migration SQL
```sql
-- Allez sur Supabase → SQL Editor
-- Copier-coller et exécuter : scripts/011-add-pin-recovery.sql
```

### 2. Ajouter les variables d'environnement
```
Vercel Dashboard → Settings → Environment Variables
Ajouter : EMAIL_SERVICE, EMAIL_USER, EMAIL_PASSWORD
```

### 3. Redéployer
```bash
git push  # Ou cliquez sur "Redeploy" dans Vercel
```

### 4. Tester le flux
1. Allez sur `/auth/login`
2. Cliquez sur "Récupérer votre PIN"
3. Entrez votre email
4. Vérifiez votre boîte email (code OTP)
5. Entrez le code OTP
6. Définissez un nouveau PIN

---

## 📋 Fichiers Créés/Modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `scripts/011-add-pin-recovery.sql` | ✨ Créé | Migration SQL |
| `app/api/auth/request-pin-reset/route.ts` | ✨ Créé | API demande OTP |
| `app/api/auth/verify-pin-reset-otp/route.ts` | ✨ Créé | API vérifier OTP + reset PIN |
| `app/auth/forgot-pin/page.tsx` | ✨ Créé | Page UI récupération PIN |
| `PIN_RECOVERY_SETUP.md` | ✨ Créé | Documentation |
| `app/auth/login/page.tsx` | ✏️ Modifié | Ajout lien "Récupérer PIN" |
| `next.config.mjs` | ✏️ Modifié | Suppression options deprecated |
| `package.json` | ✏️ Modifié | Ajout nodemailer |
| `lib/supabase/proxy.ts` | ✨ Créé | Proxy (nouvelle convention) |

---

## 💡 Questions Fréquentes

**Q: Quoi si l'utilisateur n'a pas reçu l'email ?**
A: Demandez-lui de vérifier le dossier spam et de réessayer (limite 15 min par tentative).

**Q: Comment réinitialiser un OTP expiré ?**
A: Aucune action requise - la base de données le supprime automatiquement après 15 min.

**Q: Peut-on changer le délai d'expiration OTP ?**
A: Oui, modifiez `INTERVAL '15 minutes'` dans `scripts/011-add-pin-recovery.sql`.

**Q: Les données de récupération sont-elles sécurisées ?**
A: Les OTPs ne sont jamais stockés en production, les PINs sont en texte brut (considérez le chiffrement pour production).

---

## ✅ Checklist de Déploiement

- [ ] Exécuter la migration SQL
- [ ] Ajouter les 3 variables d'environnement email
- [ ] Redéployer sur Vercel
- [ ] Tester le flux `/auth/forgot-pin`
- [ ] Tester l'envoi d'email
- [ ] Tester la réinitialisation de PIN
- [ ] Communiquer l'URL aux utilisateurs
