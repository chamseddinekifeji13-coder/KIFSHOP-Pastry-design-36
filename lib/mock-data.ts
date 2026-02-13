// Mock data for KIFSHOP - Multi-tenant Pastry Management SaaS

export interface RawMaterial {
  id: string
  tenantId: string
  name: string
  quantity: number
  unit: string
  location: "reserve" | "labo"
  safetyThreshold: number
  expiryDate?: string
  status: "in-stock" | "critical" | "expiring"
}

export interface FinishedProduct {
  id: string
  tenantId: string
  name: string
  quantity: number
  unit: string
  price: number
  category: string
}

export interface Order {
  id: string
  tenantId: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  items: { productId: string; name: string; quantity: number; price: number }[]
  total: number
  deposit: number
  shippingCost?: number
  status: "nouveau" | "en-preparation" | "pret" | "en-livraison" | "livre"
  deliveryType: "pickup" | "delivery"
  courier?: string
  trackingNumber?: string
  source: "whatsapp" | "messenger" | "phone" | "web" | "instagram" | "comptoir"
  paymentStatus: "paid" | "unpaid" | "partial"
  createdAt: string
  deliveryDate?: string
}

export interface Transaction {
  id: string
  tenantId: string
  type: "inflow" | "outflow"
  category: string
  amount: number
  description: string
  date: string
}

export interface Recipe {
  id: string
  tenantId: string
  name: string
  category: string
  yieldQuantity: number
  yieldUnit: string
  ingredients: { materialId: string; name: string; quantity: number; unit: string }[]
}

// Categories per tenant
export interface ProductCategory {
  id: string
  tenantId: string
  name: string
  color: string
}

export const masmoudiCategories: ProductCategory[] = [
  { id: "mc1", tenantId: "masmoudi", name: "Baklawa", color: "#D4A574" },
  { id: "mc2", tenantId: "masmoudi", name: "Makroudh", color: "#C68E5B" },
  { id: "mc3", tenantId: "masmoudi", name: "Kaak", color: "#B8860B" },
  { id: "mc4", tenantId: "masmoudi", name: "Biscuits", color: "#A0522D" },
  { id: "mc5", tenantId: "masmoudi", name: "Gateaux", color: "#8B4513" },
  { id: "mc6", tenantId: "masmoudi", name: "Confiserie", color: "#CD853F" },
]

export const delicesCategories: ProductCategory[] = [
  { id: "dc1", tenantId: "delices", name: "Miel", color: "#DAA520" },
  { id: "dc2", tenantId: "delices", name: "Coffrets", color: "#8B4513" },
  { id: "dc3", tenantId: "delices", name: "Dattes", color: "#A0522D" },
  { id: "dc4", tenantId: "delices", name: "Fruits Secs", color: "#CD853F" },
]

export function getCategories(tenantId: string): ProductCategory[] {
  return tenantId === "masmoudi" ? masmoudiCategories : delicesCategories
}

// Tenant A: Patisserie Masmoudi - High volume, focus on Baklawa
export const masmoudiRawMaterials: RawMaterial[] = [
  { id: "rm1", tenantId: "masmoudi", name: "Amandes", quantity: 4.5, unit: "kg", location: "labo", safetyThreshold: 5, status: "critical" },
  { id: "rm2", tenantId: "masmoudi", name: "Miel", quantity: 12, unit: "kg", location: "reserve", safetyThreshold: 8, status: "in-stock" },
  { id: "rm3", tenantId: "masmoudi", name: "Semoule fine", quantity: 25, unit: "kg", location: "reserve", safetyThreshold: 10, status: "in-stock" },
  { id: "rm4", tenantId: "masmoudi", name: "Dattes Deglet", quantity: 8, unit: "kg", location: "labo", safetyThreshold: 10, status: "critical" },
  { id: "rm5", tenantId: "masmoudi", name: "Pistaches", quantity: 2, unit: "kg", location: "labo", safetyThreshold: 3, status: "critical" },
  { id: "rm6", tenantId: "masmoudi", name: "Beurre", quantity: 15, unit: "kg", location: "reserve", safetyThreshold: 5, status: "in-stock" },
  { id: "rm7", tenantId: "masmoudi", name: "Feuilles Filo", quantity: 50, unit: "pcs", location: "reserve", safetyThreshold: 20, expiryDate: "2026-02-05", status: "expiring" },
  { id: "rm8", tenantId: "masmoudi", name: "Eau de fleur d'oranger", quantity: 3, unit: "L", location: "labo", safetyThreshold: 2, status: "in-stock" },
]

export const masmoudiFinishedProducts: FinishedProduct[] = [
  { id: "fp1", tenantId: "masmoudi", name: "Baklawa Traditionnelle", quantity: 45, unit: "plateaux", price: 35, category: "Baklawa" },
  { id: "fp2", tenantId: "masmoudi", name: "Makroudh", quantity: 120, unit: "pcs", price: 2.5, category: "Makroudh" },
  { id: "fp3", tenantId: "masmoudi", name: "Kaak Warka", quantity: 80, unit: "pcs", price: 3, category: "Kaak" },
  { id: "fp4", tenantId: "masmoudi", name: "Ghribia", quantity: 60, unit: "pcs", price: 2, category: "Biscuits" },
]

export const masmoudiOrders: Order[] = [
  { id: "o1", tenantId: "masmoudi", customerName: "Fatma Ben Ali", customerPhone: "+216 98 123 456", customerAddress: "25 Rue Ibn Khaldoun, Tunis", items: [{ productId: "fp1", name: "Baklawa Traditionnelle", quantity: 2, price: 35 }], total: 78, deposit: 30, shippingCost: 8, status: "nouveau", deliveryType: "delivery", courier: "aramex", source: "whatsapp", paymentStatus: "partial", createdAt: "2026-02-02T08:30:00", deliveryDate: "2026-02-03" },
  { id: "o2", tenantId: "masmoudi", customerName: "Mohamed Trabelsi", customerPhone: "+216 55 789 012", items: [{ productId: "fp2", name: "Makroudh", quantity: 50, price: 2.5 }], total: 125, deposit: 0, status: "en-preparation", deliveryType: "pickup", source: "comptoir", paymentStatus: "unpaid", createdAt: "2026-02-02T09:15:00" },
  { id: "o3", tenantId: "masmoudi", customerName: "Société ABC", customerPhone: "+216 71 234 567", customerAddress: "Zone Industrielle Ben Arous", items: [{ productId: "fp1", name: "Baklawa Traditionnelle", quantity: 10, price: 35 }, { productId: "fp3", name: "Kaak Warka", quantity: 100, price: 3 }], total: 660, deposit: 300, shippingCost: 10, status: "pret", deliveryType: "delivery", courier: "express", source: "web", paymentStatus: "partial", createdAt: "2026-02-01T14:00:00", deliveryDate: "2026-02-02" },
  { id: "o4", tenantId: "masmoudi", customerName: "Leila Souissi", customerPhone: "+216 22 456 789", items: [{ productId: "fp4", name: "Ghribia", quantity: 30, price: 2 }], total: 60, deposit: 60, status: "pret", deliveryType: "pickup", source: "whatsapp", paymentStatus: "paid", createdAt: "2026-02-02T07:00:00" },
  { id: "o5", tenantId: "masmoudi", customerName: "Hôtel Carthage", customerPhone: "+216 71 999 888", customerAddress: "Avenue Habib Bourguiba, Tunis", items: [{ productId: "fp1", name: "Baklawa Traditionnelle", quantity: 20, price: 35 }], total: 710, deposit: 350, shippingCost: 10, status: "en-livraison", deliveryType: "delivery", courier: "express", trackingNumber: "TN2026020001", source: "web", paymentStatus: "partial", createdAt: "2026-02-02T10:00:00", deliveryDate: "2026-02-05" },
  { id: "o6", tenantId: "masmoudi", customerName: "Café Central", customerPhone: "+216 98 111 222", items: [{ productId: "fp2", name: "Makroudh", quantity: 100, price: 2.5 }], total: 250, deposit: 100, status: "nouveau", deliveryType: "pickup", source: "comptoir", paymentStatus: "partial", createdAt: "2026-02-02T11:30:00" },
  { id: "o7", tenantId: "masmoudi", customerName: "Sami Gharbi", customerPhone: "+216 55 333 444", items: [{ productId: "fp3", name: "Kaak Warka", quantity: 20, price: 3 }], total: 60, deposit: 0, status: "pret", deliveryType: "pickup", source: "comptoir", paymentStatus: "unpaid", createdAt: "2026-02-02T12:00:00" },
  { id: "o8", tenantId: "masmoudi", customerName: "Nadia Ferchichi", customerPhone: "+216 97 444 555", customerAddress: "Cite Ennasr 2, Ariana", items: [{ productId: "fp1", name: "Baklawa Traditionnelle", quantity: 3, price: 35 }], total: 113, deposit: 50, shippingCost: 8, status: "nouveau", deliveryType: "delivery", courier: "aramex", source: "messenger", paymentStatus: "partial", createdAt: "2026-02-02T14:00:00", deliveryDate: "2026-02-04" },
  { id: "o9", tenantId: "masmoudi", customerName: "Ahmed Mejri", customerPhone: "+216 22 666 777", items: [{ productId: "fp2", name: "Makroudh", quantity: 40, price: 2.5 }, { productId: "fp4", name: "Ghribia", quantity: 20, price: 2 }], total: 140, deposit: 140, status: "en-preparation", deliveryType: "pickup", source: "phone", paymentStatus: "paid", createdAt: "2026-02-02T13:30:00" },
  { id: "o10", tenantId: "masmoudi", customerName: "Ines Bouzid", customerPhone: "+216 55 888 999", customerAddress: "Lac 2, Tunis", items: [{ productId: "fp1", name: "Baklawa Traditionnelle", quantity: 5, price: 35 }], total: 185, deposit: 0, shippingCost: 10, status: "nouveau", deliveryType: "delivery", courier: "express", source: "instagram", paymentStatus: "unpaid", createdAt: "2026-02-02T15:00:00", deliveryDate: "2026-02-06" },
]

export const masmoudiTransactions: Transaction[] = [
  { id: "t1", tenantId: "masmoudi", type: "inflow", category: "Ventes", amount: 890, description: "Ventes du jour", date: "2026-02-02" },
  { id: "t2", tenantId: "masmoudi", type: "outflow", category: "Matières premières", amount: 450, description: "Achat amandes et miel", date: "2026-02-02" },
  { id: "t3", tenantId: "masmoudi", type: "outflow", category: "Emballages", amount: 120, description: "Boîtes et plateaux", date: "2026-02-01" },
  { id: "t4", tenantId: "masmoudi", type: "inflow", category: "Ventes", amount: 1250, description: "Ventes du jour", date: "2026-02-01" },
  { id: "t5", tenantId: "masmoudi", type: "outflow", category: "Loyer", amount: 800, description: "Loyer mensuel", date: "2026-02-01" },
]

export const masmoudiRecipes: Recipe[] = [
  { id: "r1", tenantId: "masmoudi", name: "Baklawa Traditionnelle", category: "Baklawa", yieldQuantity: 1, yieldUnit: "plateau", ingredients: [{ materialId: "rm1", name: "Amandes", quantity: 0.3, unit: "kg" }, { materialId: "rm2", name: "Miel", quantity: 0.2, unit: "kg" }, { materialId: "rm7", name: "Feuilles Filo", quantity: 10, unit: "pcs" }, { materialId: "rm6", name: "Beurre", quantity: 0.15, unit: "kg" }] },
  { id: "r2", tenantId: "masmoudi", name: "Makroudh", category: "Makroudh", yieldQuantity: 20, yieldUnit: "pcs", ingredients: [{ materialId: "rm3", name: "Semoule fine", quantity: 0.5, unit: "kg" }, { materialId: "rm4", name: "Dattes Deglet", quantity: 0.3, unit: "kg" }, { materialId: "rm2", name: "Miel", quantity: 0.1, unit: "kg" }] },
]

// Tenant B: Délices du Sud - Focus on Honey Jars and Dried Fruits
export const delicesRawMaterials: RawMaterial[] = [
  { id: "drm1", tenantId: "delices", name: "Miel de montagne", quantity: 30, unit: "kg", location: "reserve", safetyThreshold: 15, status: "in-stock" },
  { id: "drm2", tenantId: "delices", name: "Figues séchées", quantity: 8, unit: "kg", location: "labo", safetyThreshold: 10, status: "critical" },
  { id: "drm3", tenantId: "delices", name: "Dattes Allig", quantity: 25, unit: "kg", location: "reserve", safetyThreshold: 15, status: "in-stock" },
  { id: "drm4", tenantId: "delices", name: "Noix", quantity: 5, unit: "kg", location: "labo", safetyThreshold: 5, status: "in-stock" },
  { id: "drm5", tenantId: "delices", name: "Pots en verre 250ml", quantity: 45, unit: "pcs", location: "reserve", safetyThreshold: 50, status: "critical" },
]

export const delicesFinishedProducts: FinishedProduct[] = [
  { id: "dfp1", tenantId: "delices", name: "Miel Pur 500g", quantity: 35, unit: "pots", price: 25, category: "Miel" },
  { id: "dfp2", tenantId: "delices", name: "Coffret Fruits Secs", quantity: 20, unit: "coffrets", price: 45, category: "Coffrets" },
  { id: "dfp3", tenantId: "delices", name: "Dattes Premium 1kg", quantity: 40, unit: "boîtes", price: 18, category: "Dattes" },
]

export const delicesOrders: Order[] = [
  { id: "do1", tenantId: "delices", customerName: "Épicerie Fine Tunis", customerPhone: "+216 71 555 666", customerAddress: "Rue de Marseille, Tunis", items: [{ productId: "dfp1", name: "Miel Pur 500g", quantity: 10, price: 25 }], total: 257, deposit: 125, shippingCost: 7, status: "nouveau", deliveryType: "delivery", courier: "rapidpost", source: "web", paymentStatus: "partial", createdAt: "2026-02-02T09:00:00" },
  { id: "do2", tenantId: "delices", customerName: "Amir Bouazizi", customerPhone: "+216 98 777 888", items: [{ productId: "dfp2", name: "Coffret Fruits Secs", quantity: 3, price: 45 }], total: 135, deposit: 135, status: "pret", deliveryType: "pickup", source: "comptoir", paymentStatus: "paid", createdAt: "2026-02-02T08:00:00" },
  { id: "do3", tenantId: "delices", customerName: "Restaurant Dar El Jeld", customerPhone: "+216 71 888 999", customerAddress: "5 Rue Dar El Jeld, Medina", items: [{ productId: "dfp3", name: "Dattes Premium 1kg", quantity: 15, price: 18 }], total: 279, deposit: 100, shippingCost: 9, status: "en-preparation", deliveryType: "delivery", courier: "stafim", source: "whatsapp", paymentStatus: "partial", createdAt: "2026-02-01T16:00:00" },
]

export const delicesTransactions: Transaction[] = [
  { id: "dt1", tenantId: "delices", type: "inflow", category: "Ventes", amount: 520, description: "Ventes du jour", date: "2026-02-02" },
  { id: "dt2", tenantId: "delices", type: "outflow", category: "Matières premières", amount: 280, description: "Achat miel", date: "2026-02-02" },
  { id: "dt3", tenantId: "delices", type: "inflow", category: "Ventes", amount: 680, description: "Ventes du jour", date: "2026-02-01" },
]

export const delicesRecipes: Recipe[] = [
  { id: "dr1", tenantId: "delices", name: "Coffret Prestige", category: "Coffrets", yieldQuantity: 1, yieldUnit: "coffret", ingredients: [{ materialId: "drm2", name: "Figues séchées", quantity: 0.2, unit: "kg" }, { materialId: "drm3", name: "Dattes Allig", quantity: 0.3, unit: "kg" }, { materialId: "drm4", name: "Noix", quantity: 0.1, unit: "kg" }] },
]

// Inventory history
export interface InventorySession {
  id: string
  tenantId: string
  date: string
  status: "en-cours" | "termine" | "valide"
  createdBy: string
  itemsCount: number
  discrepancies: number
}

export interface InventoryCount {
  id: string
  sessionId: string
  materialId: string
  materialName: string
  theoreticalQty: number
  physicalQty: number | null
  unit: string
  discrepancy: number | null
  note?: string
}

export const masmoudiInventorySessions: InventorySession[] = [
  { id: "inv1", tenantId: "masmoudi", date: "2026-02-01", status: "valide", createdBy: "Admin", itemsCount: 8, discrepancies: 2 },
  { id: "inv2", tenantId: "masmoudi", date: "2026-01-15", status: "valide", createdBy: "Admin", itemsCount: 8, discrepancies: 1 },
  { id: "inv3", tenantId: "masmoudi", date: "2026-01-01", status: "valide", createdBy: "Admin", itemsCount: 8, discrepancies: 3 },
]

export const delicesInventorySessions: InventorySession[] = [
  { id: "dinv1", tenantId: "delices", date: "2026-02-01", status: "valide", createdBy: "Admin", itemsCount: 5, discrepancies: 1 },
  { id: "dinv2", tenantId: "delices", date: "2026-01-15", status: "valide", createdBy: "Admin", itemsCount: 5, discrepancies: 0 },
]

export function getInventorySessions(tenantId: string): InventorySession[] {
  return tenantId === "masmoudi" ? masmoudiInventorySessions : delicesInventorySessions
}

// E-Boutique catalog
export interface CatalogProduct {
  id: string
  tenantId: string
  productId: string
  name: string
  description: string
  price: number
  image: string
  category: string
  isPublished: boolean
  minOrder: number
  unit: string
  weight?: string
  tags: string[]
}

export const masmoudiCatalog: CatalogProduct[] = [
  { id: "cat1", tenantId: "masmoudi", productId: "fp1", name: "Baklawa Traditionnelle", description: "Plateau de baklawa aux amandes et miel, recette ancestrale tunisienne", price: 35, image: "/images/baklawa.jpg", category: "Baklawa", isPublished: true, minOrder: 1, unit: "plateau", weight: "500g", tags: ["populaire", "amandes"] },
  { id: "cat2", tenantId: "masmoudi", productId: "fp2", name: "Makroudh aux Dattes", description: "Makroudh frit au miel, fourre aux dattes Deglet Nour", price: 2.5, image: "/images/makroudh.jpg", category: "Makroudh", isPublished: true, minOrder: 10, unit: "piece", weight: "40g", tags: ["dattes", "frit"] },
  { id: "cat3", tenantId: "masmoudi", productId: "fp3", name: "Kaak Warka", description: "Kaak croustillant en feuille warka, garni de fruits secs", price: 3, image: "/images/kaak.jpg", category: "Kaak", isPublished: true, minOrder: 5, unit: "piece", weight: "50g", tags: ["croustillant"] },
  { id: "cat4", tenantId: "masmoudi", productId: "fp4", name: "Ghribia aux Pois Chiches", description: "Biscuit fondant a base de farine de pois chiches et beurre", price: 2, image: "/images/ghribia.jpg", category: "Biscuits", isPublished: false, minOrder: 10, unit: "piece", weight: "35g", tags: ["biscuit", "fondant"] },
]

export const delicesCatalog: CatalogProduct[] = [
  { id: "dcat1", tenantId: "delices", productId: "dfp1", name: "Miel Pur de Montagne 500g", description: "Miel 100% naturel recolte dans les montagnes du Nord-Ouest", price: 25, image: "/images/miel.jpg", category: "Miel", isPublished: true, minOrder: 1, unit: "pot", weight: "500g", tags: ["bio", "naturel"] },
  { id: "dcat2", tenantId: "delices", productId: "dfp2", name: "Coffret Fruits Secs Premium", description: "Assortiment de figues sechees, dattes et noix dans un coffret cadeau", price: 45, image: "/images/coffret.jpg", category: "Coffrets", isPublished: true, minOrder: 1, unit: "coffret", weight: "750g", tags: ["cadeau", "premium"] },
  { id: "dcat3", tenantId: "delices", productId: "dfp3", name: "Dattes Premium Allig 1kg", description: "Dattes premieres choix de la region de Tozeur", price: 18, image: "/images/dattes.jpg", category: "Dattes", isPublished: true, minOrder: 1, unit: "boite", weight: "1kg", tags: ["tozeur", "premium"] },
]

export function getCatalog(tenantId: string): CatalogProduct[] {
  return tenantId === "masmoudi" ? masmoudiCatalog : delicesCatalog
}

// Sales channels configuration
export interface SalesChannel {
  id: string
  tenantId: string
  type: "whatsapp" | "messenger" | "phone" | "web" | "instagram"
  name: string
  enabled: boolean
  contact: string
  autoReply?: string
  ordersCount: number
  revenue: number
}

export const masmoudiChannels: SalesChannel[] = [
  { id: "ch1", tenantId: "masmoudi", type: "whatsapp", name: "WhatsApp Business", enabled: true, contact: "+216 98 123 456", autoReply: "Merci pour votre message! Notre equipe vous repondra dans les plus brefs delais. Consultez notre catalogue: kifshop.tn/masmoudi", ordersCount: 45, revenue: 3200 },
  { id: "ch2", tenantId: "masmoudi", type: "messenger", name: "Messenger", enabled: true, contact: "fb.com/patisserie.masmoudi", autoReply: "Bienvenue chez Patisserie Masmoudi! Envoyez-nous votre commande ou consultez notre catalogue en ligne.", ordersCount: 28, revenue: 1850 },
  { id: "ch3", tenantId: "masmoudi", type: "phone", name: "Telephone", enabled: true, contact: "+216 71 234 567", ordersCount: 62, revenue: 5400 },
  { id: "ch4", tenantId: "masmoudi", type: "web", name: "Site Web", enabled: false, contact: "kifshop.tn/masmoudi", ordersCount: 12, revenue: 980 },
  { id: "ch5", tenantId: "masmoudi", type: "instagram", name: "Instagram", enabled: true, contact: "@patisserie_masmoudi", autoReply: "Merci pour votre DM! Pour commander, envoyez-nous un message WhatsApp au +216 98 123 456", ordersCount: 15, revenue: 720 },
]

export const delicesChannels: SalesChannel[] = [
  { id: "dch1", tenantId: "delices", type: "whatsapp", name: "WhatsApp Business", enabled: true, contact: "+216 55 987 654", autoReply: "Bienvenue chez Delices du Sud! Decouvrez nos produits naturels.", ordersCount: 30, revenue: 2100 },
  { id: "dch2", tenantId: "delices", type: "phone", name: "Telephone", enabled: true, contact: "+216 71 555 666", ordersCount: 25, revenue: 1800 },
  { id: "dch3", tenantId: "delices", type: "messenger", name: "Messenger", enabled: false, contact: "fb.com/delicesdusud", ordersCount: 5, revenue: 350 },
]

export function getSalesChannels(tenantId: string): SalesChannel[] {
  return tenantId === "masmoudi" ? masmoudiChannels : delicesChannels
}

// Revenue data for charts (7 days)
export const masmoudiRevenue = [
  { day: "Lun", date: "27/01", revenue: 1450 },
  { day: "Mar", date: "28/01", revenue: 1280 },
  { day: "Mer", date: "29/01", revenue: 980 },
  { day: "Jeu", date: "30/01", revenue: 1650 },
  { day: "Ven", date: "31/01", revenue: 2100 },
  { day: "Sam", date: "01/02", revenue: 1250 },
  { day: "Dim", date: "02/02", revenue: 890 },
]

export const delicesRevenue = [
  { day: "Lun", date: "27/01", revenue: 480 },
  { day: "Mar", date: "28/01", revenue: 620 },
  { day: "Mer", date: "29/01", revenue: 350 },
  { day: "Jeu", date: "30/01", revenue: 720 },
  { day: "Ven", date: "31/01", revenue: 890 },
  { day: "Sam", date: "01/02", revenue: 680 },
  { day: "Dim", date: "02/02", revenue: 520 },
]

// Helper functions to get data by tenant
export function getRawMaterials(tenantId: string): RawMaterial[] {
  return tenantId === "masmoudi" ? masmoudiRawMaterials : delicesRawMaterials
}

export function getFinishedProducts(tenantId: string): FinishedProduct[] {
  return tenantId === "masmoudi" ? masmoudiFinishedProducts : delicesFinishedProducts
}

export function getOrders(tenantId: string): Order[] {
  return tenantId === "masmoudi" ? masmoudiOrders : delicesOrders
}

export function getTransactions(tenantId: string): Transaction[] {
  return tenantId === "masmoudi" ? masmoudiTransactions : delicesTransactions
}

export function getRecipes(tenantId: string): Recipe[] {
  return tenantId === "masmoudi" ? masmoudiRecipes : delicesRecipes
}

export function getRevenueData(tenantId: string) {
  return tenantId === "masmoudi" ? masmoudiRevenue : delicesRevenue
}

export function getKPIs(tenantId: string) {
  const transactions = getTransactions(tenantId)
  const orders = getOrders(tenantId)
  const rawMaterials = getRawMaterials(tenantId)
  
  const todayTransactions = transactions.filter(t => t.date === "2026-02-02")
  const todayRevenue = todayTransactions.filter(t => t.type === "inflow").reduce((sum, t) => sum + t.amount, 0)
  const todayExpenses = todayTransactions.filter(t => t.type === "outflow").reduce((sum, t) => sum + t.amount, 0)
  
  const totalInflow = transactions.filter(t => t.type === "inflow").reduce((sum, t) => sum + t.amount, 0)
  const totalOutflow = transactions.filter(t => t.type === "outflow").reduce((sum, t) => sum + t.amount, 0)
  
  const criticalStock = rawMaterials.filter(m => m.status === "critical" || m.status === "expiring")
  const pendingOrders = orders.filter(o => o.status !== "livre")
  const readyOrders = orders.filter(o => o.status === "pret")
  
  return {
    cashFlow: totalInflow - totalOutflow + (tenantId === "masmoudi" ? 3580 : 1200),
    todayRevenue,
    todayExpenses,
    todayTransactions: todayTransactions.filter(t => t.type === "inflow").length,
    criticalStockCount: criticalStock.length,
    criticalStockItems: criticalStock,
    pendingOrdersCount: pendingOrders.length,
    readyOrdersCount: readyOrders.length,
    grossMargin: todayRevenue - todayExpenses,
  }
}
