# 🔍 DIAGNOSTIC QZ TRAY - GUIDE DE DÉPANNAGE COMPLET

## ⚠️ PROBLÈME IDENTIFIÉ

QZ Tray ne fonctionne pas car l'application n'est PAS lancée sur votre PC, ou elle n'écoute pas sur le port 8181.

---

## 🔧 ÉTAPES DE DIAGNOSTIC

### Étape 1: Vérifier si QZ Tray est Installé
```
1. Allez à: https://qz.io/download
2. Téléchargez "QZ Tray" (pas QZ Print)
3. Installez l'application
4. Cherchez QZ Tray dans le menu Démarrer
```

**✅ Vérification:** Vous devriez voir "QZ Tray" dans Démarrer → Applications

---

### Étape 2: Lancer QZ Tray
```
1. Ouvrez le menu Démarrer
2. Tapez "QZ Tray"
3. Cliquez sur "QZ Tray" (application)
4. L'application devrait s'ouvrir (parfois minimisée dans systray)
```

**✅ Vérification:** 
- Une fenêtre QZ Tray s'ouvre
- Vous voyez une icône dans la barre des tâches (bottom-right)
- L'icône est VERTE (active) ou ORANGE (prêt)

---

### Étape 3: Vérifier que QZ Tray Écoute sur le Port 8181

**Option A: Tester dans le Navigateur (PLUS FACILE)**
```
1. Ouvrez votre navigateur
2. Allez à: http://localhost:8181
3. Attendez 5 secondes
```

**✅ Résultat Attendu:**
```
Vous verrez une réponse JSON:
{
  "version": "2.2.4",
  "status": "ok"
}
```

**❌ Si Vous Voyez:**
```
"Unable to connect" ou "Connection refused"
→ QZ Tray n'est PAS lancé
→ Relancez QZ Tray et réessayez
```

---

**Option B: Vérifier avec Command Prompt (Avancé)**
```cmd
1. Ouvrez Command Prompt (cmd.exe)
2. Tapez: netstat -an | findstr 8181
3. Cherchez: LISTENING ou ESTABLISHED
```

**✅ Résultat Attendu:**
```
Proto  Local Address       State
TCP    127.0.0.1:8181     LISTENING
```

**❌ Si Vide:**
```
→ QZ Tray n'écoute pas sur le port 8181
→ Relancez QZ Tray
```

---

### Étape 4: Configurer l'Imprimante Thermique

Avant de tester KIFSHOP, configurez l'imprimante dans QZ Tray:

```
1. QZ Tray est lancé
2. Cliquez sur l'icône QZ Tray (barre des tâches)
3. Allez à: Settings → Printers
4. Sélectionnez votre imprimante thermique
5. Cliquez: Save
```

**✅ Vérification:**
- L'imprimante apparaît dans la liste
- Elle est cochée (selected)
- Pas de message d'erreur

---

### Étape 5: Tester KIFSHOP

Maintenant que QZ Tray fonctionne:

```
1. Allez à KIFSHOP
2. Trésorerie → Paramètres d'Imprimante
3. Cherchez le bouton "Vérifier QZ Tray"
4. Cliquez sur "Vérifier QZ Tray"
5. Attendez 3 secondes
```

**✅ Résultat Attendu:**
```
Toast en haut à droite:
"QZ Tray connecté! 1 imprimante(s) trouvée(s)"
```

**❌ Si Erreur:**
```
"QZ Tray non disponible"
→ Retournez à l'Étape 1-4
```

---

## 🚨 PROBLÈMES COURANTS ET SOLUTIONS

### Problème 1: "QZ Tray non disponible"

**Causes Possibles:**
1. ❌ QZ Tray n'est pas lancé
2. ❌ QZ Tray n'écoute pas sur le port 8181
3. ❌ Port 8181 bloqué par le firewall
4. ❌ QZ Tray crash silencieusement

**Solutions:**

**A. Relancer QZ Tray**
```
1. Fermez complètement QZ Tray
   - Clic-droit l'icône systray → Quit
   - Ou Task Manager → Killer QZ Tray process
2. Attendez 2 secondes
3. Lancez QZ Tray à nouveau
4. Attendez 5 secondes pour que le WebSocket démarre
5. Testez à nouveau
```

**B. Vérifier le Firewall Windows**
```
1. Paramètres → Sécurité → Pare-feu Windows
2. Cliquez: "Autoriser une application"
3. Cherchez "QZ Tray" dans la liste
4. Cochez: "Privé" ET "Public"
5. Cliquez OK
6. Relancez QZ Tray
```

**C. Désinstaller et Réinstaller (Nucléaire)**
```
1. Paramètres → Applications → Applications installées
2. Cherchez "QZ Tray"
3. Cliquez: Désinstaller
4. Attendez que tout soit supprimé
5. Redémarrez votre PC
6. Téléchargez QZ Tray depuis: https://qz.io/download
7. Installez à nouveau
8. Lancez
```

---

### Problème 2: "Script load error" ou "Library not loaded"

**Cause:** Le CDN ne peut pas télécharger la bibliothèque QZ

**Solutions:**

**A. Vérifier la Connexion Internet**
```
1. Ouvrez navigateur
2. Allez à: https://cdn.jsdelivr.net
3. Attendez que la page charge
```

**B. Vider le Cache du Navigateur**
```
1. Appuyez sur: Ctrl + Shift + Delete
2. Sélectionnez: Tous les temps
3. Cochez: Cookies, Cache, Stock local
4. Cliquez: Supprimer
5. Rechargez KIFSHOP
```

**C. Essayer un Autre Navigateur**
```
- Google Chrome → Essayez Firefox ou Edge
- Firefox → Essayez Chrome ou Edge
```

---

### Problème 3: "WebSocket is closed"

**Cause:** La connexion WebSocket s'est fermée

**Solutions:**

1. Vérifiez que QZ Tray est toujours lancé
2. Vérifiez http://localhost:8181 en navigateur
3. Rechargez KIFSHOP (F5)
4. Cliquez "Vérifier QZ Tray" à nouveau

---

### Problème 4: Imprimante ne s'Affiche Pas

**Cause:** L'imprimante n'est pas configurée dans QZ Tray

**Solutions:**

```
1. QZ Tray est lancé
2. Clic-droit sur l'icône QZ Tray
3. Settings
4. Printers tab
5. Sélectionnez votre imprimante THERMIQUE
   (Pas "Generic", pas "Microsoft Print")
6. Cliquez: Save
7. Fermez les paramètres
8. Allez à KIFSHOP et testez
```

**Pour Trouver l'Imprimante Thermique:**
- Cherchez: "Star", "Epson", "Bixolon", "Zebra"
- Pas: "Generic", "Microsoft", "Adobe PDF"

---

## 📋 CHECKLIST DE DIAGNOSTIC

Avant de demander de l'aide, vérifiez tous les points:

- [ ] QZ Tray est téléchargé
- [ ] QZ Tray est installé
- [ ] QZ Tray est LANCÉ (pas juste installé)
- [ ] L'icône QZ Tray est VISIBLE dans systray (bottom-right)
- [ ] http://localhost:8181 répond en navigateur
- [ ] L'imprimante thermique est configurée dans QZ Tray
- [ ] KIFSHOP peut se connecter à QZ Tray (bouton "Vérifier")
- [ ] Toast "QZ Tray connecté" s'affiche

---

## 🔍 DÉBOGUER AVEC LA CONSOLE

Si rien ne fonctionne, ouvrez la console du navigateur:

```
1. KIFSHOP ouvert
2. Appuyez sur: F12 (ou Ctrl + Shift + I)
3. Allez à l'onglet: Console
4. Cherchez les messages: [QZ Tray]
```

**✅ Bon Messages:**
```
[QZ Tray] Library already loaded
[QZ Tray] Starting connection...
[QZ Tray] Connection attempt 1/3...
[QZ Tray] Connected successfully on attempt 1
[QZ Tray] found printers: Printer Name
```

**❌ Mauvais Messages:**
```
[QZ Tray] Failed to load library  → Problème CDN
[QZ Tray] Connection attempt 3 failed → QZ Tray pas lancé
[QZ Tray] Library not available → App not running
```

**Copiez-collez ces messages quand vous demandez de l'aide!**

---

## 🆘 AIDE SUPPLÉMENTAIRE

Si vous avez suivi tous ces étapes et ça ne fonctionne TOUJOURS pas:

### Collectez Ces Informations:

```
1. Messages console (F12 → Console tab)
2. Résultat de http://localhost:8181
3. Résultat de netstat -an | findstr 8181
4. Version de QZ Tray (Settings → About)
5. Système d'exploitation (Windows 10/11? Edition?)
6. Antivirus/Firewall (Windows Defender? Norton?)
7. Architecture PC (32-bit ou 64-bit?)
```

### Envoyez Cette Information Avec:
- "QZ Tray ne fonctionne pas"
- Description du problème exact
- Tous les messages d'erreur
- Les étapes que vous avez essayées

---

## ✅ SUCCÈS!

Si vous voyez ce message:

```
Toast: "QZ Tray connecté! 1 imprimante(s) trouvée(s)"
```

**Alors QZ Tray fonctionne correctement! 🎉**

Vous pouvez maintenant:
- ✅ Enregistrer des ventes POS
- ✅ Imprimer des reçus
- ✅ Ouvrir le tiroir-caisse
- ✅ Faire des collections

---

## 📞 RESSOURCES

- QZ Tray Site: https://qz.io
- QZ Tray Docs: https://qz.io/docs
- QZ Tray Download: https://qz.io/download
- Support: https://qz.io/support

---

**Diagnostic créé:** 15/03/2026  
**Dernière mise à jour:** Aujourd'hui
