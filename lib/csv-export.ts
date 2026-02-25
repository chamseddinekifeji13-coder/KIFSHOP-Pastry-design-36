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

/**
 * Imprime des données en rapport formaté
 */
export function printReport({
  title,
  subtitle,
  headers,
  data,
  totals,
}: {
  title: string
  subtitle?: string
  headers: string[]
  data: any[][]
  totals?: Record<string, string | number>
}) {
  const printWindow = window.open("", "", "width=1200,height=800")
  if (!printWindow) {
    console.error("Impossible d'ouvrir la fenêtre d'impression")
    return
  }

  // Créer le contenu HTML
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          color: #1f2937;
          line-height: 1.5;
          background: white;
          padding: 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }

        .header h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #111827;
        }

        .header p {
          font-size: 14px;
          color: #6b7280;
        }

        .timestamp {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #374151;
        }

        td {
          border: 1px solid #e5e7eb;
          padding: 11px 12px;
          font-size: 13px;
        }

        tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }

        tbody tr:hover {
          background-color: #f3f4f6;
        }

        .summary {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 20px;
          margin-top: 30px;
          border-radius: 6px;
        }

        .summary h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 12px;
        }

        .summary-value {
          font-weight: 700;
          color: #111827;
          font-size: 14px;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }

        @media print {
          body {
            padding: 0;
          }

          .container {
            max-width: 100%;
          }

          table {
            page-break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }

          tbody tr {
            page-break-inside: avoid;
          }
        }

        @page {
          size: A4;
          margin: 10mm;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ""}
          <div class="timestamp">
            Généré le ${new Date().toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) =>
                  `<tr>${row
                    .map((cell) => {
                      const cellStr = String(cell || "")
                      // Vérifier si c'est un nombre (montant, quantité, etc.)
                      const isNumber = !isNaN(parseFloat(cellStr)) && cellStr !== ""
                      return `<td style="${isNumber ? "text-align: right;" : ""}">${cellStr}</td>`
                    })
                    .join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>

        ${
          totals
            ? `
          <div class="summary">
            <h3>Résumé</h3>
            <div class="summary-grid">
              ${Object.entries(totals)
                .map(
                  ([key, value]) =>
                    `<div class="summary-item">
                  <span class="summary-label">${key}</span>
                  <span class="summary-value">${value}</span>
                </div>`,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <div class="footer">
          <p>Ce document a été généré automatiquement.</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => window.close(), 500);
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
