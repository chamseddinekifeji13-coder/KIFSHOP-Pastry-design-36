# Fix: Synchronisation des Données en Temps Réel

## Problème Identifié

Le problème de synchronisation des données persistait en raison d'une **configuration SWR contradictoire** qui neutralisait les rafraîchissements automatiques :

### Configuration Précédente (Problématique)
```javascript
// app-shell.tsx
const swrConfig = {
  revalidateOnFocus: false,           // ❌ Pas de rafraîchissement au focus
  revalidateOnReconnect: false,       // ❌ Pas de rafraîchissement après reconnexion
  dedupingInterval: 10000,            // ❌ Trop long = cache stagnant
  keepPreviousData: true,
  errorRetryCount: 2,
}
```

**Impact :** 
- Les données restaient en cache même après changement
- Les onglets/vues ne se synchronisaient pas
- Les rafraîchissements automatiques de `use-tenant-data.ts` (5-30s) étaient ignorés
- Le Service Worker cacheait les données API indéfiniment

## Solution Implémentée

### 1. Configuration SWR Globale Optimisée (`/lib/swr-config.ts`)

Création d'une configuration centralisée :

```javascript
export const SWR_CONFIG = {
  // === Synchronisation ===
  revalidateOnFocus: true,         // ✅ Rafraîchir au retour sur l'onglet
  revalidateOnReconnect: true,     // ✅ Rafraîchir après reconnexion
  
  // === Deduplication & Caching ===
  dedupingInterval: 1000,          // ✅ 1s (vs 10s avant) = plus réactif
  keepPreviousData: true,          // Garde les données pendant la revalidation
  
  // === Gestion des erreurs ===
  errorRetryCount: 3,              // ✅ Plus de tentatives (vs 2 avant)
  errorRetryInterval: 1000,
  errorRetryIntervalMultiplier: 1.5,
}
```

### 2. Hooks de Données Améliorés (`/hooks/use-tenant-data.ts`)

```javascript
export function useTransactions() {
  return useTenantQuery("transactions", fetchTransactions, { 
    refreshInterval: 5000,          // ✅ 5s pour synchronisation rapide
    dedupingInterval: 500,          // ✅ Deduplication agile
  })
}
```

### 3. Composants Treasury Améliorés

#### CashierPerformanceView
```javascript
const { data: cashierStats, mutate } = useSWR(
  `/api/treasury/cashier-stats?startDate=${startDate}&endDate=${endDate}`,
  fetcher,
  {
    refreshInterval: 5000,        // ✅ Sync en temps réel
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 500,
    keepPreviousData: true,
  }
)
```

#### RevenueReportsView
Configuration similaire pour garantir la synchronisation des rapports.

### 4. Service Worker Amélioré (`/public/sw.js`)

- **Version mise à jour :** v11 (force l'invalidation du cache)
- **Stratégie API Treasury :** Network-first (pas de cache pour `/api/treasury/` et `/api/pos80/sync`)
- **Stratégie statique :** Cache-first (JS/CSS network-first)

```javascript
// API routes that should NOT be cached (always fetch fresh for sync)
const DYNAMIC_API_ROUTES = [
  '/api/treasury/',
  '/api/pos80/sync',
];
```

## Mécanismes de Synchronisation

### 1. Au Changement de Dates
```javascript
const handleDateChange = (newStartDate, newEndDate) => {
  setStartDate(newStartDate)
  setEndDate(newEndDate)
  setTimeout(() => mutate(), 0)  // Rafraîchissement immédiat
}
```

### 2. Au Retour Sur L'Onglet
```javascript
revalidateOnFocus: true  // Automatic en SWR
```

### 3. Après Reconnexion Internet
```javascript
revalidateOnReconnect: true  // Automatic en SWR
```

### 4. Rafraîchissement Automatique
```javascript
refreshInterval: 5000  // Toutes les 5 secondes
```

### 5. Au Changement de Données (POS)
```javascript
// treasury-pos-view.tsx ligne 620-627
await refreshTransactions()
globalMutate((key) => 
  key.includes("transactions") || 
  key.includes("orders") || 
  key.includes(tenantId), 
  undefined, 
  { revalidate: true }
)
```

## Résultats Attendus

✅ **Synchronisation immédiate** entre les onglets/vues  
✅ **Données à jour** après changement de dates  
✅ **Récupération automatique** après perte de connexion  
✅ **Pas de staleness** des données  
✅ **UX fluide** avec `keepPreviousData`  

## Fichiers Modifiés

1. `/lib/swr-config.ts` - ✨ NOUVEAU - Configuration centralisée SWR
2. `/components/layout/app-shell.tsx` - Import et utilisation de SWR_CONFIG
3. `/hooks/use-tenant-data.ts` - Configuration des hooks améliorée
4. `/components/treasury/cashier-performance-view.tsx` - SWR config inline
5. `/components/treasury/revenue-reports-view.tsx` - SWR config inline
6. `/public/sw.js` - Service Worker amélioré (v11)

## Tests Recommandés

1. **Test de synchronisation au focus :**
   - Ouvrir 2 onglets
   - Modifier les dates dans l'un
   - Vérifier que l'autre se met à jour automatiquement

2. **Test de déconnexion/reconnexion :**
   - Ouvrir DevTools Network
   - Throttle la connexion
   - Restaurer la connexion
   - Vérifier le rafraîchissement immédiat

3. **Test POS :**
   - Créer une transaction
   - Vérifier la mise à jour immédiate du dashboard
   - Vérifier la mise à jour du tableau Caissiers

4. **Test des rapports :**
   - Changer les dates
   - Vérifier le rafraîchissement des données
   - Vérifier que les graphiques se mettent à jour
