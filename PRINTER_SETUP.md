# Guide de Configuration - Imprimante Thermique + Tiroir Caisse

## 🎯 Objectif
Configurer une imprimante thermique 80mm avec tiroir-caisse intégré sur votre caisse KIFSHOP.

## ✅ Configuration Complète du Système

### 1. Système d'exploitation
La caisse enregistreuse doit être connectée avec :
- **Navigateur** : Google Chrome ou Microsoft Edge (FireFox et Safari ne supportent pas WebUSB)
- **URL** : `https://your-domain/tresorerie` (mode caisse enregistreuse)

### 2. Imprimante Thermique
**Modèles supportés :**
- Epson TM-88, TM-100, TM-200, TM-300
- Star Micronics mPOP, SM-L200, SM-L300
- Bixolon SRP-270, SRP-350
- Citizen CT-S100, CT-S300
- Tous les modèles USB avec protocole ESC/POS

**Caractéristiques recommandées :**
- Largeur : 80mm (standard caisse)
- Vitesse : 150mm/s minimum
- Connexion : USB
- Tiroir-caisse intégré

### 3. Connecter l'imprimante

#### Étape 1 : Préparation matérielle
1. Connectez l'imprimante thermique en USB à la caisse enregistreuse
2. Allumez l'imprimante
3. Ouvrez le navigateur Chrome/Edge

#### Étape 2 : Première connexion
1. Allez sur `https://your-domain/tresorerie`
2. Vous êtes en mode **Caisse Enregistreuse** (POS)
3. Dans l'en-tête, cliquez sur le bouton **"Imprimante"** (icône avec USB)
4. La fenêtre de sélection WebUSB s'ouvre
5. Sélectionnez votre imprimante thermique dans la liste
6. Cliquez **"Connecter"**

#### Étape 3 : Vérification
Un badge vert **"Connecte"** apparaît à côté du bouton Imprimante.

### 4. Test d'impression

1. Cliquez à nouveau sur le bouton **"Imprimante"**
2. Dans le dialogue, cliquez **"Tester l'impression"**
3. Un ticket de test s'imprime
4. Vérifiez que l'impression est correcte (clarté, alignement, hauteur)

### 5. Test du tiroir-caisse

1. Cliquez **"Tester le tiroir"** dans le dialogue Imprimante
2. Le tiroir-caisse doit s'ouvrir automatiquement
3. Vérifiez que le tiroir fonctionne correctement

## 🔄 Fonctionnement Automatique

Une fois l'imprimante configurée :

### À chaque vente
1. Client ajoute des articles au panier
2. Client sélectionne le mode de paiement (Espèces ou Carte)
3. **Paiement effectué** → Actions automatiques :
   - ✅ Ticket imprimé directement sur l'imprimante thermique
   - ✅ Tiroir-caisse s'ouvre automatiquement (si paiement espèces)
   - ✅ Reçu conservé en base de données

### Impression manuelle
- Bouton **"Imprimer"** (après paiement) : Réimprime le dernier ticket
- Bouton **"Tiroir"** (en-tête) : Ouvre le tiroir manuellement

## 🎨 Personnalisation du Ticket

Éditable dans `components/treasury/treasury-pos-view.tsx` :
- Logo/image magasin
- En-tête et pied de page
- Format des articles
- Texte de remerciement

## 🆘 Résolution de Problèmes

### L'imprimante n'apparaît pas dans la liste WebUSB
- Vérifiez que l'imprimante est bien allumée et connectée en USB
- Essayez un autre port USB
- Redémarrez l'imprimante

### L'impression n'est pas correct (texte déformé, alignement mauvais)
- Ajustez la largeur du ticket : 32 ou 42 caractères
- Vérifiez la police : ESC/POS supporte principalement les polices 5x7

### Le tiroir ne s'ouvre pas
- Vérifiez que le tiroir est connecté à l'imprimante (câble interne)
- Testez avec la commande "Tester le tiroir"
- Consultez le manuel de l'imprimante pour la position du connecteur

### WebUSB n'est pas disponible
- Utilisez Google Chrome ou Microsoft Edge
- Firefox et Safari ne supportent pas WebUSB
- Assurez-vous que le site est en HTTPS (WebUSB nécessite HTTPS)

## 📋 Checklist de Configuration

- [ ] Imprimante 80mm connectée en USB
- [ ] Chrome/Edge ouvert sur `https://your-domain/tresorerie`
- [ ] Imprimante connectée via WebUSB (badge vert "Connecté")
- [ ] Test d'impression réussi
- [ ] Test du tiroir réussi
- [ ] Première vente effectuée avec ticket imprimé
- [ ] Ticket correctement formaté et lisible

## 💾 Sauvegarde des paramètres

L'imprimante reste connectée tant que :
- Vous ne fermez pas l'onglet du navigateur
- L'imprimante reste connectée en USB
- Vous ne cliquez pas sur "Déconnecter"

Pour reconnecter après fermeture de l'onglet :
- Cliquez à nouveau sur "Imprimante" → "Connecter"

## 📞 Support

Pour les problèmes :
1. Vérifiez d'abord la liste de résolution des problèmes ci-dessus
2. Consultez le manuel de votre imprimante
3. Vérifiez la compatibilité ESC/POS de votre imprimante
