/**
 * CSV Export Utility
 * Fonctions pour exporter des données en format CSV
 */

interface CSVExportOptions {
  filename: string
  headers: string[]
  data: any[][]
}

/**
 * Exporte des données en CSV
 */
export function exportToCSV({ filename, headers, data }: CSVExportOptions) {
  // Préparer le contenu CSV avec BOM pour l'encodage UTF-8
  const csvContent = [
    headers.map(h => escapeCSVField(h)).join(","),
    ...data.map(row => row.map(cell => escapeCSVField(cell)).join(",")),
  ].join("\n")

  // Ajouter le BOM UTF-8 pour une meilleure compatibilité Excel
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

  // Créer et télécharger le fichier
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Échappe les champs CSV contenant des caractères spéciaux
 */
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return ""
  const stringField = String(field)
  if (stringField.includes(",") || stringField.includes('"') || stringField.includes("\n")) {
    return `"${stringField.replace(/"/g, '""')}"` // Doubler les guillemets
  }
  return stringField
}

/**
 * Formate une date pour l'export
 */
export function formatDateForCSV(date: string | Date | null): string {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("fr-FR")
}

/**
 * Formate un montant pour l'export
 */
export function formatAmountForCSV(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}
