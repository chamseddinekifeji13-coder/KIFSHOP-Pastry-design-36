# KIFSHOP - CODE FIXES REQUIRED

## Actions Métier à Mettre à Jour

Après exécution des scripts audit, les fichiers suivants doivent être mis à jour pour utiliser les nouvelles tables.

---

## 1. `lib/approvisionnement/actions.ts`

### Actuel (Référence tables manquantes):
```typescript
import { db } from '@/lib/db'

export async function createPurchaseInvoice(data: {
  tenantId: string
  supplierId?: string
  items: Array<{
    rawMaterialId?: string
    consumableId?: string
    quantity: number
  }>
}) {
  // Référence suppliers table (n'existe pas avant audit)
}
```

### À Corriger:
✅ `suppliers` table maintenant créée
✅ `raw_materials` table maintenant créée
✅ `consumables` table existe
✅ `purchase_invoices` table existe

**Vérifications needed:**
```typescript
// 1. Importer le nouveau type de supplier
export interface Supplier {
  id: string
  tenant_id: string
  name: string
  contact_name?: string
  phone?: string
  email?: string
  products: string[]
  status: 'active' | 'inactive' | 'blocked'
}

// 2. Créer supplier - maintenant possible!
export async function createSupplier(data: {
  tenantId: string
  name: string
  contactName?: string
  phone?: string
  email?: string
}) {
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      tenant_id: data.tenantId,
      name: data.name,
      contact_name: data.contactName,
      phone: data.phone,
      email: data.email,
      status: 'active'
    })
    .select()
  
  if (error) throw error
  return supplier[0]
}

// 3. Les purchase_invoices peuvent maintenant créer
// avec la bonne référence à suppliers
```

---

## 2. `lib/production/actions.ts`

### Actuel (Bloqué):
```typescript
export async function createRecipe() {
  // recipes table n'existe pas
  // recipe_ingredients n'existe pas
}

export async function produceProduct() {
  // Impossible de tracker production
}
```

### À Corriger:
✅ `recipes` table maintenant créée
✅ `recipe_ingredients` table maintenant créée
✅ `finished_products` table maintenant créée
✅ `raw_materials` table maintenant créée

**Code à ajouter:**
```typescript
export interface Recipe {
  id: string
  tenant_id: string
  name: string
  category?: string
  finished_product_id?: string
  yield_quantity: number
  yield_unit: string
  instructions?: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  raw_material_id: string
  quantity: number
  unit: string
}

// Créer recette
export async function createRecipe(data: {
  tenantId: string
  name: string
  finishedProductId?: string
  yieldQuantity: number
  yieldUnit: string
  ingredients: Array<{
    rawMaterialId: string
    quantity: number
    unit: string
  }>
}) {
  // 1. Créer la recette
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      tenant_id: data.tenantId,
      name: data.name,
      finished_product_id: data.finishedProductId,
      yield_quantity: data.yieldQuantity,
      yield_unit: data.yieldUnit
    })
    .select()
  
  if (recipeError) throw recipeError
  
  // 2. Ajouter les ingrédients
  const ingredients = data.ingredients.map(ing => ({
    recipe_id: recipe[0].id,
    raw_material_id: ing.rawMaterialId,
    quantity: ing.quantity,
    unit: ing.unit
  }))
  
  const { error: ingError } = await supabase
    .from('recipe_ingredients')
    .insert(ingredients)
  
  if (ingError) throw ingError
  return recipe[0]
}

// Produire (utiliser recette pour consommer raw_materials)
export async function produceProduct(data: {
  tenantId: string
  recipeId: string
  quantity: number
}) {
  // 1. Récupérer la recette
  const { data: recipe } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('id', data.recipeId)
    .single()
  
  // 2. Consommer les raw materials
  for (const ing of recipe.recipe_ingredients) {
    const requiredQty = ing.quantity * data.quantity
    
    // Décrémenter stock
    await supabase
      .from('raw_materials')
      .update({
        current_stock: supabase.raw(`current_stock - ${requiredQty}`)
      })
      .eq('id', ing.raw_material_id)
    
    // Logger le mouvement
    await supabase
      .from('stock_movements')
      .insert({
        tenant_id: data.tenantId,
        item_type: 'raw_material',
        item_id: ing.raw_material_id,
        movement_type: 'out',
        quantity: requiredQty,
        unit: ing.unit,
        notes: `Production recette: ${recipe.name}`
      })
  }
  
  // 3. Incrémenter finished product
  if (recipe.finished_product_id) {
    await supabase
      .from('finished_products')
      .update({
        current_stock: supabase.raw(`current_stock + ${data.quantity}`)
      })
      .eq('id', recipe.finished_product_id)
  }
}
```

---

## 3. `lib/orders/actions.ts`

### Actuel (Bloqué):
```typescript
export async function createOrder() {
  // orders table n'existe pas!
}
```

### À Corriger:
✅ `orders` table maintenant créée
✅ `finished_products` table maintenant créée
✅ `stock_movements` table maintenant créée

**Code à ajouter:**
```typescript
export interface Order {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone: string
  customer_address?: string
  items: OrderItem[]
  total: number
  status: 'nouveau' | 'en-preparation' | 'pret' | 'en-livraison' | 'livre'
  payment_status: 'paid' | 'unpaid' | 'partial'
  delivery_type: 'pickup' | 'delivery'
}

export interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
  total: number
}

// Créer commande
export async function createOrder(data: {
  tenantId: string
  customerName: string
  customerPhone: string
  items: Array<{
    productId: string
    quantity: number
  }>
}) {
  // 1. Calculer le total
  let total = 0
  const orderItems = []
  
  for (const item of data.items) {
    const { data: product } = await supabase
      .from('finished_products')
      .select('selling_price')
      .eq('id', item.productId)
      .single()
    
    const itemTotal = product.selling_price * item.quantity
    total += itemTotal
    
    orderItems.push({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: product.selling_price,
      total: itemTotal
    })
  }
  
  // 2. Créer la commande
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      tenant_id: data.tenantId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      items: orderItems,
      total: total,
      status: 'nouveau',
      payment_status: 'unpaid',
      delivery_type: 'pickup'
    })
    .select()
  
  if (orderError) throw orderError
  
  // 3. Décrémenter le stock de chaque produit
  for (const item of data.items) {
    await supabase
      .from('finished_products')
      .update({
        current_stock: supabase.raw(`current_stock - ${item.quantity}`)
      })
      .eq('id', item.productId)
    
    // Logger le mouvement
    await supabase
      .from('stock_movements')
      .insert({
        tenant_id: data.tenantId,
        item_type: 'finished_product',
        item_id: item.productId,
        movement_type: 'out',
        quantity: item.quantity,
        unit: 'piece',
        notes: `Commande: ${order[0].id}`
      })
  }
  
  return order[0]
}

// Mise à jour statut
export async function updateOrderStatus(data: {
  orderId: string
  status: Order['status']
  paymentStatus?: Order['payment_status']
}) {
  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: data.status,
      payment_status: data.paymentStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.orderId)
    .select()
  
  if (error) throw error
  return order[0]
}
```

---

## 4. `lib/clients/actions.ts`

### Risque de Sécurité:
```typescript
// AVANT (Faille RLS):
export async function getClients(tenantId: string) {
  // La RLS était permissive (USING true)
  // Donc User A voyait clients de User B ❌
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
  // ^^ Récupère TOUS les clients, pas juste le tenant
}
```

### Corrigé:
```typescript
// APRÈS (RLS Sécurisée):
export async function getClients(tenantId: string) {
  // La RLS est maintenant correcte
  // Supabase filtre automatiquement par tenant ✅
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
  // ^^ Récupère SEULEMENT les clients du tenant courant
  // Grâce à la RLS policy: USING (tenant_id IN (SELECT ...))
}

// Filtrer explicitement (bonne pratique):
export async function getClientsByPhone(phone: string, tenantId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', tenantId)  // Explicit pour clarté
    .eq('phone', phone)
  
  if (error) throw error
  return data
}
```

---

## 5. `lib/stocks/actions.ts`

### Ajouts Requis:
```typescript
// Track stock movements
export async function recordStockMovement(data: {
  tenantId: string
  itemType: 'raw_material' | 'finished_product' | 'packaging'
  itemId: string
  movementType: 'in' | 'out' | 'transfer' | 'adjustment' | 'waste'
  quantity: number
  unit: string
  notes?: string
}) {
  const { error } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: data.tenantId,
      item_type: data.itemType,
      item_id: data.itemId,
      movement_type: data.movementType,
      quantity: data.quantity,
      unit: data.unit,
      notes: data.notes
    })
  
  if (error) throw error
}

// Get low stock items
export async function getLowStockItems(tenantId: string) {
  const { data, error } = await supabase
    .rpc('get_critical_stock', {
      p_tenant_id: tenantId
    })
  
  if (error) throw error
  return data
}

// Update stock quantities
export async function updateRawMaterialStock(data: {
  materialId: string
  quantity: number
  operation: 'add' | 'subtract' | 'set'
}) {
  let updateValue: any
  
  if (data.operation === 'add') {
    updateValue = { current_stock: supabase.raw(`current_stock + ${data.quantity}`) }
  } else if (data.operation === 'subtract') {
    updateValue = { current_stock: supabase.raw(`current_stock - ${data.quantity}`) }
  } else {
    updateValue = { current_stock: data.quantity }
  }
  
  const { data: result, error } = await supabase
    .from('raw_materials')
    .update(updateValue)
    .eq('id', data.materialId)
    .select()
  
  if (error) throw error
  return result[0]
}
```

---

## Checklist Post-Audit

### Database:
- [ ] Scripts audit exécutés sans erreur
- [ ] Toutes les tables créées (suppliers, recipes, etc.)
- [ ] RLS policies activées sur toutes les tables
- [ ] Indexes créés pour performance
- [ ] Aucune donnée perdue

### Code:
- [ ] `approvisionnement/actions.ts` mis à jour
- [ ] `production/actions.ts` mis à jour
- [ ] `orders/actions.ts` mis à jour
- [ ] `clients/actions.ts` testé (RLS)
- [ ] `stocks/actions.ts` mis à jour

### Tests:
- [ ] Test RLS: User A ne voit que ses données
- [ ] Test création supplier
- [ ] Test création recette
- [ ] Test création commande
- [ ] Test stock movements

### Sécurité:
- [ ] Vérifier aucune fuite multi-tenant
- [ ] Tester UPDATE/DELETE sur autre tenant (doit échouer)
- [ ] Vérifier logs pour activité suspecte
- [ ] Backup base de données avant exécution

---

## Support

Si besoin d'aide:
1. Consulter `AUDIT_REPORT.md` pour détails
2. Consulter `EXECUTION_GUIDE.md` pour exécution
3. Vérifier les logs Supabase
4. Contacter support technique

**Urgence:** 🔴 CRITIQUE - À faire ASAP
