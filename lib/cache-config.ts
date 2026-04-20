// Cache configuration for KIFSHOP
// Implements Next.js 16 cache directives and revalidation strategies

export const CACHE_DURATIONS = {
  // Short-term cache (1 minute) - For frequently changing data
  SHORT: 60,
  
  // Medium-term cache (5 minutes) - For moderately changing data
  MEDIUM: 5 * 60,
  
  // Long-term cache (1 hour) - For stable data
  LONG: 60 * 60,
  
  // Static cache (1 day) - For config and rarely changing data
  STATIC: 24 * 60 * 60,
  
  // Production data cache (30 minutes) - For production planning
  PRODUCTION: 30 * 60,
  
  // Inventory cache (10 minutes) - For stock levels
  INVENTORY: 10 * 60,
  
  // Customer data cache (15 minutes) - For client/prospect info
  CUSTOMER: 15 * 60,
} as const

export const CACHE_TAGS = {
  // Dashboard data
  DASHBOARD_STATS: 'dashboard-stats',
  DASHBOARD_SALES: 'dashboard-sales',
  
  // Inventory related
  STOCKS: 'stocks',
  INVENTORY: 'inventory',
  RAW_MATERIALS: 'raw-materials',
  
  // Orders and customers
  ORDERS: 'orders',
  CLIENTS: 'clients',
  PROSPECTS: 'prospects',
  
  // Production
  PRODUCTION: 'production',
  RECIPES: 'recipes',
  
  // Treasury and POS
  TREASURY: 'treasury',
  POS_SALES: 'pos-sales',
  CASH_REGISTER: 'cash-register',
  
  // Configuration
  SETTINGS: 'settings',
  CHANNELS: 'channels',
  CATEGORIES: 'categories',
  
  // Approvisionnement
  SUPPLIERS: 'suppliers',
  DELIVERY_NOTES: 'delivery-notes',
  PURCHASE_ORDERS: 'purchase-orders',
  
  // CRM
  CRM_INTERACTIONS: 'crm-interactions',
  CRM_REMINDERS: 'crm-reminders',
  CRM_QUOTES: 'crm-quotes',
} as const

export const REVALIDATION_PROFILES = {
  // Use for user-specific data - no caching
  USER_SPECIFIC: { revalidate: 0 },
  
  // Use for real-time critical data
  REAL_TIME: { revalidate: 10 },
  
  // Use for frequently accessed data
  FREQUENT: { revalidate: 60 },
  
  // Use for moderately changing data
  MODERATE: { revalidate: 300 },
  
  // Use for stable configuration data
  STABLE: { revalidate: 3600 },
  
  // Use for static content
  STATIC: { revalidate: 86400 },
} as const

// Helper function to build cache key with tenant isolation
export function buildCacheKey(
  scope: string,
  identifier: string,
  tenantId?: string
): string {
  if (tenantId) {
    return `${scope}:${tenantId}:${identifier}`
  }
  return `${scope}:${identifier}`
}

// Helper function for SWR-style cache revalidation
export function getCacheLifeProfile(
  dataType: 'real-time' | 'frequent' | 'moderate' | 'stable' | 'static'
): { revalidate: number } {
  return REVALIDATION_PROFILES[dataType.toUpperCase() as keyof typeof REVALIDATION_PROFILES]
}
