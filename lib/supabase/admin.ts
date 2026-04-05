/**
 * Point d’entrée pour le client service_role (même implémentation que server.ts).
 * Certains fichiers importent `@/lib/supabase/admin` — ce module évite l’erreur « module not found ».
 */
export { createAdminClient } from "./server"
