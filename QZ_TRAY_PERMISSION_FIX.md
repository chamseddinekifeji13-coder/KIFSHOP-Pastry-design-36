# QZ Tray Permission Dialog - Guide de Dépannage

## Problème: Le Bouton "Allow" Devient Désactivé

Quand vous cochez "Remember this decision", le bouton "Allow" peut devenir temporairement désactivé. C'est normal, QZ Tray traite la demande.

### Solution Simple:

1. **Cochez "Remember this decision"** (case à cocher)
2. **Attendez 2-3 secondes** - Le bouton "Allow" va se réactiver
3. **Cliquez sur "Allow"** une fois que c'est réactivé
4. **Attendez 3-5 secondes** pour que QZ Tray finalise la permission

### Si le bouton reste désactivé:

1. **Fermez le dialogue** en cliquant le X
2. **Ouvrez QZ Tray Desktop** sur votre ordinateur (icône dans la barre des tâches)
3. Settings → Security → Trusted Websites
4. Ajoutez votre domaine KIFSHOP manuellement:
   - Exemple: `https://kifshop.vercel.app`
   - Ou `http://localhost:3000` si local

### Si toujours pas de printers trouvées:

1. Ouvrez QZ Tray Desktop
2. Settings → Printers
3. Vérifiez qu'une imprimante thermique est sélectionnée
4. Cliquez "Save"
5. Retournez à KIFSHOP et rechargez (F5)

## Architecture WebSocket QZ Tray

```
KIFSHOP (Browser)
    |
    v
wss://localhost:8181 (Secure - Demande Permission)
    |
    +---> Si échec →  ws://localhost:8182 (Insecure - Pas de Permission)
    |
    v
QZ Tray Desktop (Application)
    |
    v
Printer (Imprimante Thermique)
```

Le code essaie d'abord la connexion sécurisée (wss) qui demande la permission, puis utilise la connexion insécurisée (ws) qui fonctionne généralement sans permission.

## Vérification Rapide

Ouvrez la console du navigateur (F12) et vérifiez que vous voyez:

```
✅ [QZ Tray] Bibliothèque chargée avec succès depuis la source LOCALE
✅ [QZ Tray] SUCCESS ! Connexion établie via ws://localhost:8182
✅ [QZ Tray] Printers found: [...]
```

Si vous voyez ces messages, tout fonctionne!

## Pour Désactiver la Demande de Permission:

Dans QZ Tray Desktop:
1. Settings → Security
2. Décochez "Require user confirmation for new connections"
3. Cliquez "Save"
4. Rechargez KIFSHOP

Cela empêchera les demandes de permission à l'avenir.
