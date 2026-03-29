/**
 * Configuration SWR globale optimisee pour la synchronisation des donnees
 * 
 * Probleme precédent:
 * - revalidateOnFocus: false empechait la synchronisation quand on revenait sur l'onglet
 * - revalidateOnReconnect: false empechait la synchronisation apres une deconnexion reseau
 * - dedupingInterval: 10000 était trop long et creait un cache stagnant
 * 
 * Solution:
 * - Activer revalidateOnFocus et revalidateOnReconnect
 * - Reduire dedupingInterval pour permettre les mises a jour frequentes
 * - Augmenter les retries en cas d'erreur reseau
 */

export const SWR_CONFIG = {
  // === Synchronisation ===
  revalidateOnFocus: true,         // Rafraichir quand l'utilisateur revient sur l'onglet
  revalidateOnReconnect: true,     // Rafraichir apres une reconnexion internet
  
  // === Deduplication & Caching ===
  dedupingInterval: 1000,          // 1s entre les demandes identiques (vs 10s avant)
  keepPreviousData: true,          // Garde les donnees pendant la revalidation (meilleure UX)
  
  // === Gestion des erreurs ===
  errorRetryCount: 3,              // 3 tentatives en cas d'erreur (vs 2 avant)
  errorRetryInterval: 1000,        // 1s entre les tentatives
  errorRetryIntervalMultiplier: 1.5, // Multiplier les delais en cas d'erreur successive
  
  // === Timeouts ===
  dedupingInterval: 1000,
  focusThrottleInterval: 5000,     // Max 1 refresh par 5s au focus
  
  // === Logging (development only) ===
  onError: (error: Error, key: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[SWR] Error fetching", key, ":", error.message)
    }
  },
  
  // === Comparaison des donnees ===
  // Evite les re-renders inutiles si les donnees n'ont pas change
  compare: (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b)
  }
}

/**
 * Configuration specifique pour les donnees temps-reel (transactions, orders, etc.)
 */
export const SWR_REALTIME_CONFIG = {
  ...SWR_CONFIG,
  refreshInterval: 5000,          // Rafraichir toutes les 5 secondes
  dedupingInterval: 500,          // Deduplication rapide pour temps-reel
}

/**
 * Configuration pour les donnees non-critiques (peut-etre moins frequentes)
 */
export const SWR_STANDARD_CONFIG = {
  ...SWR_CONFIG,
  refreshInterval: 30000,         // Rafraichir toutes les 30 secondes
  dedupingInterval: 1000,
}

/**
 * Configuration pour les donnees statiques (rarements mises a jour)
 */
export const SWR_STATIC_CONFIG = {
  ...SWR_CONFIG,
  refreshInterval: 0,             // Pas de rafraichissement automatique
  revalidateOnFocus: false,        // Les donnees statiques n'ont pas besoin d'etre rafraichies au focus
  dedupingInterval: 60000,        // Deduplique peu souvent
}
