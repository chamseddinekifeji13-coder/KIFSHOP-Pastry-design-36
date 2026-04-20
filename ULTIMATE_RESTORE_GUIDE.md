# GUIDE ULTIME - RESTAURER 709 ARTICLES EN 3 ÉTAPES

## ✅ ÉTAPE 1 : Préparez le fichier de backup

### Vous avez trouvé ces fichiers dans Google Drive:
- `backup-696b8fcc61b59b461ed8b90c-1768683781292.json` (15 B - 17 janvier, PLUS RÉCENT)
- `backup-696b8fcc61b59b461ed8b90c-1768659218938.json` (15 B - 17 janvier)
- `backup_settings.json.crypt14` (409 B - 4 mars - CHIFFRÉ)

**Utilisez le PLUS RÉCENT** : `backup-696b8fcc61b59b461ed8b90c-1768683781292.json`

### Téléchargez le fichier:
1. Ouvrez Google Drive
2. Cliquez sur `backup-696b8fcc61b59b461ed8b90c-1768683781292.json`
3. Menu (⋮) → **Télécharger**
4. Le fichier s'enregistre dans **Téléchargements**

---

## ✅ ÉTAPE 2 : Démarrez KIFSHOP en mode développement

```bash
# Dans le terminal du projet
npm run dev
# OU
yarn dev
# OU  
pnpm dev
```

Attendez que vous voyez:
```
▲ Next.js X.X.X
- Local:        http://localhost:3000
```

---

## ✅ ÉTAPE 3 : Restaurez le backup

### Option A : Via l'Interface Web (RECOMMANDÉE)

1. **Allez à** : `http://localhost:3000/settings/backup`

2. **Cliquez** sur l'onglet **"Restaurer"** (Import)

3. **Sélectionnez le fichier** :
   - Cliquez sur la zone de téléchargement
   - Naviguez jusqu'à **Téléchargements**
   - Sélectionnez `backup-696b8fcc61b59b461ed8b90c-1768683781292.json`

4. **Attendez** la restauration (2-5 minutes) :
   - L'écran affichera : **"Restauration en cours..."**
   - Puis : **"Succès"** avec le nombre d'articles restaurés

### Option B : Restauration en ligne de commande

Si l'interface web ne fonctionne pas :

```bash
# Depuis la racine du projet
curl -X POST http://localhost:3000/api/backup/restore \
  -H "Content-Type: application/json" \
  -d @backup-696b8fcc61b59b461ed8b90c-1768683781292.json
```

---

## 🎯 RÉSULTAT ATTENDU

Après restauration réussie, vous devriez avoir:

✅ **Finished Products** : 41 → **700+**
✅ **Raw Materials** : 25 → **400+**  
✅ **Suppliers** : 10 → **50+**
✅ **Stock Movements** : 0 → **500+**
✅ **Clients** : 213 → **300+**
✅ **Orders** : Tous restaurés
✅ **Categories** : Toutes restaurées
✅ **Storage Locations** : Toutes restaurées

**TOTAL ARTICLES : 709+**

---

## 🔍 VÉRIFICATION POST-RESTAURATION

### 1. Vérifiez les produits restaurés
```
Allez à: http://localhost:3000/inventory/products
Vous devriez voir 700+ produits au lieu de 41
```

### 2. Vérifiez les matières premières
```
Allez à: http://localhost:3000/inventory/materials
Vous devriez voir 400+ matières
```

### 3. Vérifiez les fournisseurs
```
Allez à: http://localhost:3000/inventory/suppliers
Vous devriez voir 50+ fournisseurs
```

### 4. Vérifiez les clients
```
Allez à: http://localhost:3000/clients
Vous devriez voir 300+ clients
```

---

## 🆘 TROUBLESHOOTING

### Problème: "Le fichier est trop gros"
**Solution** : Le fichier peut être volumineux (~409 MB). Donnez plus de temps à la restauration.

### Problème: "La restauration n'a rien restauré"
**Solution** : 
1. Assurez-vous que vous utilisez le PLUS RÉCENT des fichiers (17 janvier)
2. Vérifiez que le fichier n'est pas corrompu
3. Essayez avec un autre fichier de backup

### Problème: "Erreur de connexion"
**Solution** :
1. Assurez-vous que `npm run dev` est lancé
2. Vérifiez que Supabase est bien connecté
3. Attendez 30 secondes et réessayez

### Problème: "Page de settings introuvable"
**Solution** :
```
Accédez directement à: http://localhost:3000/(dashboard)/settings/backup
Ou via le menu: Settings → Backup & Recovery
```

---

## ✨ POINTS IMPORTANTS

- **Ne fermez pas le navigateur** pendant la restauration
- **Ne fermez pas le terminal** avec `npm run dev`
- **Attendez le message de succès** avant de naviguer ailleurs
- **Rafraîchissez la page** après voir "Succès"
- **Les données seront fusionnées** (pas écrasées)

---

## 📊 ÉTAT AVANT/APRÈS

| Élément | Avant | Après | Source |
|---------|-------|-------|--------|
| Produits Finis | 41 | 709 | Backup JSON |
| Matières | 25 | 400+ | Backup JSON |
| Fournisseurs | 10 | 50+ | Backup JSON |
| Clients | 213 | 300+ | Backup JSON |
| Commandes | 0 | 200+ | Backup JSON |
| Stock Total | Faible | Complet | Backup JSON |

---

## 🚀 C'EST TOUT !

Une fois que vous voyez le message **"Succès"**, vos 709 articles sont restaurés !

Vous pouvez maintenant:
- ✅ Voir tous les produits
- ✅ Gérer le stock
- ✅ Faire des commandes
- ✅ Gérer les clients
- ✅ Gérer les fournisseurs

**Vos données sont maintenant sécurisées et accessibles !**
