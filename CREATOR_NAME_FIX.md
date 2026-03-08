# CORRECTION: Creator/Changer Name in Order History

## Problème Identifié 🔴

Toutes les commandes affichaient le même créateur : "EMNA DHIFAOUI" (super-admin/propriétaire), même si d'autres employés/agents les créaient réellement.

**Causé par** : Le système utilisait `user.user_metadata.display_name` depuis Supabase Auth (l'utilisateur de session) au lieu du profil actif (l'employé qui a réellement créé la commande).

---

## Architecture Multi-Profile 👥

Le système KIFSHOP a une architecture spéciale :

```
Utilisateur Supabase Auth (EMNA - propriétaire)
         ↓
    PIN Verification
         ↓
Profil Actif (KHALIL, FATIMA, etc. - employés)
         ↓
Active dans: active-profile.ts (cookie HTTP-only)
```

L'ancien code **ignorait** le profil actif et utilisait l'auth user (toujours EMNA).

---

## Solution Implémentée ✅

Modifié `lib/orders/actions.ts` pour utiliser le **profil actif** en priorité :

### Avant (❌ Bug)
```typescript
changed_by_name: user.user_metadata?.display_name || user.email || null
// Toujours retourne: "EMNA DHIFAOUI"
```

### Après (✅ Fix)
```typescript
const activeProfile = await getActiveProfileCookie()
const creatorName = activeProfile?.displayName || user.user_metadata?.display_name || user.email || null
// Retourne: "KHALIL" (l'employé réel) ou "EMNA" en fallback
```

---

## Fonctions Corrigées 🔧

1. **`createOrder()`** - Création de commande
2. **`changeOrderStatus()`** - Changement de statut
3. **`updatePaymentStatus()`** - Mise à jour paiement
4. **`recordPaymentCollection()`** - Enregistrement paiement

Toutes utilisent maintenant le profil actif pour enregistrer qui a effectué l'action.

---

## Résultat 🎯

| Avant | Après |
|-------|-------|
| Toutes les commandes → "EMNA DHIFAOUI" | ✅ Chaque commande → l'employé réel |
| Pas de traçabilité individuelle | ✅ Traçabilité complète |
| Historique incorrect | ✅ Historique précis |

Maintenant, chaque action (créer, modifier, payer) affichera correctement le nom de l'employé/agent qui l'a effectuée !
