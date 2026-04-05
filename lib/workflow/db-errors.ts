/** Message affiché quand les tables workflow ne sont pas créées dans Supabase */
export const WORKFLOW_TABLES_MISSING_FR =
  "Tables workflow absentes : ouvrez Supabase → SQL Editor, exécutez le script « scripts/workflow-tables-text-tenant.sql » du projet, puis rechargez la page."

export function formatWorkflowDbError(raw: string | undefined | null): string {
  const m = (raw || "").trim()
  if (
    /Could not find the table|schema cache|does not exist|relation .* does not exist/i.test(
      m
    )
  ) {
    return WORKFLOW_TABLES_MISSING_FR
  }
  return m || WORKFLOW_TABLES_MISSING_FR
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object" && "message" in err) {
    const v = (err as { message: unknown }).message
    return typeof v === "string" ? v : String(v)
  }
  return String(err)
}
