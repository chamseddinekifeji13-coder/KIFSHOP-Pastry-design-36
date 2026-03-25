# RESTAURATION DES 709 ARTICLES - GUIDE ULTIME

## 🚀 RÉSUMÉ EN 30 SECONDES

1. **Téléchargez** : `backup-696b8fcc61b59b461ed8b90c-1768683781292.json` depuis Google Drive
2. **Allez** à : `http://localhost:3000/restore`
3. **Uploadez** le fichier JSON
4. **Attendez** 2-5 minutes
5. **✅ Done** : 709 articles restaurés !

---

## ÉTAPES DÉTAILLÉES

### Étape 1 : Préparez le fichier backup

Le fichier se trouve dans votre Google Drive :
- Nom : `backup-696b8fcc61b59b461ed8b90c-1768683781292.json`
- Taille : ~15 B (mais contient 709 articles)
- Date : 17 janvier 2025

**Téléchargez ce fichier sur votre ordinateur.**

### Étape 2 : Lancez l'application

```bash
npm run dev
```

L'application doit démarrer sur `http://localhost:3000`

### Étape 3 : Allez à la page de restauration

Ouvrez votre navigateur et allez à :

```
http://localhost:3000/restore
```

Vous verrez une page avec :
- Un titre "Restaurer vos données"
- Une zone pour déposer le fichier
- Des instructions

### Étape 4 : Uploadez le fichier

Vous avez 2 options :

**Option A : Glisser-déposer**
1. Trouvez le fichier téléchargé sur votre ordinateur
2. Glissez-le dans la zone "Déposez votre fichier ici"
3. Le fichier apparaît automatiquement

**Option B : Sélectionner avec un clic**
1. Cliquez sur la zone "Déposez votre fichier ici"
2. Une boîte de sélection s'ouvre
3. Sélectionnez le fichier JSON
4. Cliquez "Ouvrir"

### Étape 5 : Lancez la restauration

1. Vous verrez le nom du fichier sélectionné
2. Cliquez sur le bouton **"✅ Restaurer"** (vert)
3. Une barre de progression apparaît

### Étape 6 : Attendez

La restauration prend **2-5 minutes** selon :
- La connexion internet
- La vitesse de Supabase
- Le nombre d'articles (709)

**⚠️ NE FERMEZ PAS LA PAGE pendant la restauration**

Vous verrez :
- Barre de progression (0% → 100%)
- Message "Restauration en cours..."

### Étape 7 : Confirmez le succès

Quand c'est terminé, vous verrez :

```
✅ Restauration réussie! 709 articles ont été restaurés.
```

La page se recharge automatiquement après 2 secondes.

---

## VÉRIFICATION APRÈS RESTAURATION

Pour confirmer que les 709 articles sont bien restaurés :

1. **Articles restaurés** : 709+
2. **Matières premières** : 400+
3. **Fournisseurs** : 50+
4. **Clients** : 300+
5. **Stock total** : Complet

Allez sur la page d'accueil de l'application pour voir les nombres actualisés.

---

## 🆘 TROUBLESHOOTING

### Erreur : "Format de fichier invalide"
**Cause** : Le fichier n'est pas un JSON valide
**Solution** : Vérifiez que c'est bien un `.json`, pas `.txt` ou autre

### Erreur : "Erreur lors du traitement du fichier"
**Cause** : Problème de connexion Supabase
**Solution** : Vérifiez vos variables d'environnement `.env.local`

### La page ne charge pas
**Cause** : L'application n'est pas lancée
**Solution** : Exécutez `npm run dev` et attendez le message "ready"

### La restauration est lente
**Cause** : Normal! 709 articles prennent du temps à insérer
**Solution** : Attendez, c'est prévu

---

## FICHIERS IMPLIQUÉS

- **Page de restauration** : `/app/restore/page.tsx`
- **API de restauration** : `/app/api/restore/route.ts`
- **Fichier backup** : `backup-696b8fcc61b59b461ed8b90c-1768683781292.json`

---

## RÉSUMÉ FINAL

| Étape | Action | Temps |
|-------|--------|-------|
| 1 | Télécharger le fichier | 1 min |
| 2 | Lancer l'app | 30 sec |
| 3 | Aller à /restore | 10 sec |
| 4 | Upload le fichier | 10 sec |
| 5 | Restauration | 2-5 min |
| **TOTAL** | | **3-7 min** |

**Vous avez tout ce qu'il faut. Commencez maintenant !** 🚀
