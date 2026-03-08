# Architecture de Synchronisation Base Clients ↔ Base Commandes

## Vue d'Ensemble

**OUI, les deux bases sont synchronisées**, mais de manière **semi-automatique et basée sur les relations**.

---

## Structure des Tables

### 1. Table `clients` (Base Clients)
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  phone TEXT UNIQUE,         -- ← Clé de recherche principale
  name TEXT,                 -- ← Le NOM du client
  status TEXT,               -- ← normal, vip, warning, blacklisted
  return_count INT,          -- ← Nombre de retours
  total_orders INT,          -- ← Total commandes
  total_spent NUMERIC,       -- ← Montant dépensé
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 2. Table `orders` (Base Commandes)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  client_id UUID,                    -- ← FOREIGN KEY → clients(id)
  customer_name TEXT,                -- ← Copie du nom au moment de la commande
  customer_phone TEXT,               -- ← Copie du téléphone
  customer_address TEXT,
  items JSONB,                       -- ← Produits commandés
  total_amount NUMERIC,
  deposit NUMERIC,
  shipping_cost NUMERIC,
  delivery_type TEXT,                -- ← pickup ou delivery
  status TEXT,                       -- ← nouveau, en-preparation, livre, etc
  payment_status TEXT,               -- ← paid, unpaid, partial
  source TEXT,                       -- ← whatsapp, phone, comptoir, web, etc
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 3. Table `best_delivery_shipments` (Base Expéditions)
```sql
CREATE TABLE best_delivery_shipments (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  order_id TEXT,                     -- ← Référence à une commande
  order_number TEXT,
  customer_name TEXT,                -- ← Info client au moment expédition
  customer_phone TEXT,
  customer_address TEXT,
  delivery_type TEXT,
  tracking_number TEXT,
  status TEXT,                       -- ← pending, sent, in_transit, delivered
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## Flux de Synchronisation

### **Scénario 1: Créer une Commande avec Nouveau Client**

```
1. Utilisateur rentre: téléphone "21670123456"
   ↓
2. Système cherche dans `clients` → PAS TROUVÉ
   ↓
3. Système crée automatiquement:
   - Un enregistrement `clients` avec:
     * phone: "21670123456"
     * name: null (ou "Client sans nom")
     * status: "normal"
     * total_orders: 0
   
   - Récupère le client_id (ex: UUID-1234)
   ↓
4. Utilisateur remplit le nom: "Ahmed"
   ↓
5. Lors de la création commande:
   - Système CRÉE enregistrement `orders`:
     * client_id: UUID-1234 (← LIEN vers clients.id)
     * customer_name: "Ahmed"
     * customer_phone: "21670123456"
     * items: [...]
     * status: "nouveau"
   
   - Système MISES À JOUR `clients`:
     * name: "Ahmed"  ← ✅ FIX QUE NOUS AVONS APPLIQUÉ
     * total_orders: +1
     * total_spent: +montant
```

---

### **Scénario 2: Créer une Commande avec Client Existant**

```
1. Utilisateur rentre: téléphone "21670123456"
   ↓
2. Système cherche dans `clients` → TROUVÉ ✓
   - Récupère: name="Ahmed", status="normal", total_orders=1
   ↓
3. Auto-remplissage du formulaire (Mode Rapide)
   ↓
4. Création commande:
   - Système CRÉE enregistrement `orders`:
     * client_id: UUID-1234 (← LIEN vers clients.id)
     * customer_name: "Ahmed" (auto-rempli)
     * items: [...]
   
   - Système MISES À JOUR `clients`:
     * total_orders: 2 (1 + 1)
     * total_spent: +nouveau_montant
```

---

### **Scénario 3: Envoyer une Livraison (Best Delivery)**

```
1. Commande existe dans `orders` avec client_id=UUID-1234
   ↓
2. Utilisateur envoie livraison → Créé dans `best_delivery_shipments`:
   - order_id: "CMD-12345" (référence)
   - customer_name: "Ahmed"
   - customer_phone: "21670123456"
   - tracking_number: "BD-999888777"
   - status: "sent"
   ↓
3. Système met à jour `clients`:
   - Aucune maj automatique (les expéditions ne touchent pas clients)
   - SAUF si livraison échoue → return_count += 1
```

---

## Type de Synchronisation

### ✅ **Synchronisation UNI-DIRECTIONNELLE**

```
clients → orders  (ON CREATE ORDER)
   ↑         ↓
   └─ client_id (FOREIGN KEY)
```

**Les données circulent ainsi:**
- **Clients → Orders**: Oui (client_id = clé étrangère)
- **Orders → Clients**: Partial (met à jour total_orders, total_spent)
- **Shipments → Clients**: Minimal (seulement return_count si échec)

---

## Points CRITIQUES

### 1. **Le nom du client est dupliqué** (par design)
```
❌ clients.name ≠ orders.customer_name  (avant notre fix)
✅ clients.name = orders.customer_name  (après notre fix)
```

Pourquoi? Parce que:
- `orders.customer_name` = snapshot au moment de la commande (peut changer)
- `clients.name` = record permanent du client

### 2. **Les téléphones doivent correspondre exactement**
```sql
-- Index pour recherche rapide par téléphone
CREATE INDEX idx_clients_tenant_phone ON clients(tenant_id, phone)
```

Donc si téléphone a des espaces différents, le client NE SERA PAS trouvé.

### 3. **Les données n'ont PAS de synchronisation temps-réel**
```
❌ Pas de trigger automatique
✅ Synchronisation manuelle via code applicatif
```

Exemple dans `lib/delivery/actions.ts`:
```typescript
// Si commande n'a pas client_id, cherche client par phone
if (!clientId && customerPhone) {
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("phone", cleanPhone)
    .maybeSingle()
  clientId = client?.id
}
```

---

## Logique Intelligente (Après notre fusion)

### Quand vous cherchez par téléphone dans `unified-order-dialog`:

```typescript
// 1. Recherche le client
const lookupResult = await lookupClient(phone)

// 2. Logique intelligente
if (lookupResult.found) {
  // Client existe → Mode Rapide (auto-remplissage)
  setClient(lookupResult.client)
  setIsNewClient(false)
  // Auto-remplit: name, phone, status, etc
} else {
  // Client n'existe pas → Créer nouveau
  const newClient = await createNewClient(phone)
  setClient(newClient)
  setIsNewClient(true)
  // Formulaire vide prêt pour remplissage
}

// 3. À la création commande:
if (isNewClient && clientName) {
  // MÀJ le nom du client ← FIX QUE NOUS AVONS FAIT
  await updateClientName(client.id, clientName)
}
```

---

## Résumé: OUI, c'est Synchronisé ✅

| Action | Sync Client | Sync Order | Sync Shipment |
|--------|-------------|-----------|---------------|
| Créer client | ✅ Créé en BD | - | - |
| Créer commande | ✅ Maj (total_orders, name) | ✅ Créée | - |
| Livrer commande | ❓ Maj (return_count si échec) | ✅ Maj status | ✅ Créée |
| Chercher par phone | ✅ Lookup rapide | - | - |

**MAIS**: La synchronisation dépend du **code applicatif**, pas d'une base de données magique.

---

## Notre FIX aujourd'hui

### Avant (❌ BUG):
```
Créer commande → client.name = NULL → "Client sans nom"
```

### Après (✅ CORRECT):
```
Créer commande → Update clients.name = userInput → "Ahmed"
```

Maintenant le cycle de synchronisation est complet! 🎯
