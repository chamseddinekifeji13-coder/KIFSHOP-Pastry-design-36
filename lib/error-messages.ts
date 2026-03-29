/**
 * Utilitaire pour transformer les erreurs techniques en messages utilisateur professionnels
 */

import { toast } from "sonner"

// Mapping des erreurs techniques vers des messages utilisateur
const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  // Erreurs de connexion
  "Failed to fetch": {
    title: "Probleme de connexion",
    description: "Impossible de contacter le serveur. Verifiez votre connexion internet.",
  },
  "Network Error": {
    title: "Erreur reseau",
    description: "La connexion au serveur a echoue. Reessayez dans quelques instants.",
  },
  "TypeError: Failed to fetch": {
    title: "Connexion interrompue",
    description: "Le serveur ne repond pas. Verifiez votre connexion.",
  },

  // Erreurs d'authentification
  "Session expiree": {
    title: "Session expiree",
    description: "Votre session a expire. Veuillez vous reconnecter.",
  },
  "Invalid login credentials": {
    title: "Identifiants incorrects",
    description: "L'email ou le mot de passe est incorrect.",
  },
  "User not found": {
    title: "Compte introuvable",
    description: "Aucun compte n'est associe a cet email.",
  },

  // Erreurs de base de données
  "duplicate key value violates unique constraint": {
    title: "Donnee existante",
    description: "Cet element existe deja dans le systeme.",
  },
  "foreign key violation": {
    title: "Donnees liees",
    description: "Impossible de supprimer car des donnees sont liees a cet element.",
  },
  "null value in column": {
    title: "Champ requis manquant",
    description: "Veuillez remplir tous les champs obligatoires.",
  },

  // Erreurs de schéma Supabase
  "Could not find the": {
    title: "Mise a jour requise",
    description: "Une mise a jour de la base de donnees est necessaire. Contactez le support.",
  },
  "schema cache": {
    title: "Synchronisation en cours",
    description: "Le systeme se synchronise. Reessayez dans quelques secondes.",
  },

  // Erreurs de stock
  "Stock insuffisant": {
    title: "Stock insuffisant",
    description: "La quantite demandee depasse le stock disponible.",
  },
  "Rupture de stock": {
    title: "Rupture de stock",
    description: "Ce produit n'est plus disponible en stock.",
  },

  // Erreurs de commande
  "Commande non trouvee": {
    title: "Commande introuvable",
    description: "Cette commande n'existe pas ou a ete supprimee.",
  },
  "Statut invalide": {
    title: "Action impossible",
    description: "Cette action n'est pas possible dans l'etat actuel de la commande.",
  },

  // Erreurs de validation
  "Le nom est requis": {
    title: "Nom requis",
    description: "Veuillez saisir un nom pour continuer.",
  },
  "Format invalide": {
    title: "Format invalide",
    description: "Le format des donnees saisies n'est pas correct.",
  },

  // Erreurs génériques
  "Erreur serveur": {
    title: "Erreur serveur",
    description: "Une erreur inattendue s'est produite. Reessayez plus tard.",
  },
  "Permission denied": {
    title: "Acces refuse",
    description: "Vous n'avez pas les droits pour effectuer cette action.",
  },
  "Rate limit": {
    title: "Trop de requetes",
    description: "Veuillez patienter quelques instants avant de reessayer.",
  },
}

// Erreurs à ignorer (ne pas afficher)
const IGNORED_ERRORS = [
  "AbortError",
  "The user aborted a request",
  "signal is aborted",
]

/**
 * Trouve le message d'erreur approprié basé sur le message technique
 */
function findErrorMessage(error: string): { title: string; description: string } | null {
  // Vérifier les erreurs à ignorer
  for (const ignored of IGNORED_ERRORS) {
    if (error.includes(ignored)) {
      return null
    }
  }

  // Chercher une correspondance dans les messages connus
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return null
}

/**
 * Affiche une erreur de manière professionnelle
 */
export function showError(error: unknown, context?: string) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Trouver le message approprié
  const knownError = findErrorMessage(errorMessage)
  
  if (knownError === null) {
    // Erreur ignorée
    return
  }

  if (knownError) {
    toast.error(knownError.title, {
      description: knownError.description,
      duration: 5000,
    })
  } else {
    // Message générique pour les erreurs inconnues
    const title = context ? `Erreur: ${context}` : "Une erreur s'est produite"
    toast.error(title, {
      description: errorMessage.length > 100 
        ? "Une erreur technique s'est produite. Veuillez reessayer."
        : errorMessage,
      duration: 5000,
    })
  }

  // Log pour le debugging (en dev uniquement)
  if (process.env.NODE_ENV === "development") {
    console.error("[KIFSHOP Error]", { context, error: errorMessage })
  }
}

/**
 * Affiche un message de succès
 */
export function showSuccess(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3000,
  })
}

/**
 * Affiche un avertissement
 */
export function showWarning(title: string, description?: string) {
  toast.warning(title, {
    description,
    duration: 4000,
  })
}

/**
 * Affiche une information
 */
export function showInfo(title: string, description?: string) {
  toast.info(title, {
    description,
    duration: 3000,
  })
}

/**
 * Wrapper pour les appels async avec gestion d'erreur automatique
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    showError(error, context)
    return null
  }
}
