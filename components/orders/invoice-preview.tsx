"use client"

import { forwardRef } from "react"
import type { Invoice } from "@/lib/orders/invoice-actions"

interface InvoicePreviewProps {
  invoice: Invoice
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoice }, ref) => {
    const isDeliveryNote = invoice.type === "delivery_note"
    const title = isDeliveryNote ? "Bon de Livraison" : "Facture"
    const hasTax = invoice.taxRate > 0 && !isDeliveryNote

    return (
      <div
        ref={ref}
        className="bg-white text-[#1a1a1a] font-sans"
        style={{ width: "210mm", minHeight: "297mm", padding: "15mm 20mm", fontSize: "11pt", lineHeight: "1.5" }}
      >
        {/* Header - Business info + Doc info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "25px" }}>
          {/* Left - Business */}
          <div style={{ flex: "1" }}>
            {invoice.tenantLogoUrl && (
              <img
                src={invoice.tenantLogoUrl}
                alt={invoice.tenantName}
                crossOrigin="anonymous"
                style={{ height: "50px", marginBottom: "10px", objectFit: "contain" }}
              />
            )}
            <div style={{ fontSize: "16pt", fontWeight: "700", color: "#1a1a1a" }}>
              {invoice.tenantName}
            </div>
            {invoice.tenantAddress && (
              <div style={{ color: "#555", fontSize: "9pt", marginTop: "3px" }}>{invoice.tenantAddress}</div>
            )}
            {invoice.tenantPhone && (
              <div style={{ color: "#555", fontSize: "9pt" }}>Tel: {invoice.tenantPhone}</div>
            )}
            {invoice.tenantEmail && (
              <div style={{ color: "#555", fontSize: "9pt" }}>{invoice.tenantEmail}</div>
            )}
            {invoice.tenantFiscalId && (
              <div style={{ color: "#555", fontSize: "9pt", marginTop: "2px" }}>
                MF: {invoice.tenantFiscalId}
              </div>
            )}
          </div>

          {/* Right - Document info */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: "14pt",
              fontWeight: "700",
              color: isDeliveryNote ? "#2563eb" : "#16a34a",
              marginBottom: "8px",
            }}>
              {title}
            </div>
            <div style={{
              backgroundColor: isDeliveryNote ? "#eff6ff" : "#f0fdf4",
              border: `1px solid ${isDeliveryNote ? "#bfdbfe" : "#bbf7d0"}`,
              borderRadius: "6px",
              padding: "8px 14px",
              display: "inline-block",
            }}>
              <div style={{ fontSize: "8pt", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {"N\u00B0 Document"}
              </div>
              <div style={{ fontSize: "13pt", fontWeight: "700" }}>
                {invoice.documentNumber}
              </div>
            </div>
            <div style={{ fontSize: "9pt", color: "#666", marginTop: "8px" }}>
              Date: {new Date(invoice.issuedAt).toLocaleDateString("fr-TN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "2px", backgroundColor: isDeliveryNote ? "#2563eb" : "#16a34a", marginBottom: "20px", opacity: 0.3 }} />

        {/* Customer info */}
        <div style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "14px 16px",
          marginBottom: "20px",
        }}>
          <div style={{ fontSize: "8pt", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            {isDeliveryNote ? "Livrer a" : "Client"}
          </div>
          <div style={{ fontWeight: "600", fontSize: "11pt" }}>{invoice.customerName}</div>
          {invoice.customerPhone && (
            <div style={{ color: "#555", fontSize: "9pt" }}>Tel: {invoice.customerPhone}</div>
          )}
          {isDeliveryNote && invoice.deliveryAddress && (
            <div style={{ color: "#555", fontSize: "9pt", marginTop: "2px" }}>
              Adresse: {invoice.deliveryAddress}
            </div>
          )}
          {!isDeliveryNote && invoice.customerAddress && (
            <div style={{ color: "#555", fontSize: "9pt", marginTop: "2px" }}>
              {invoice.customerAddress}
            </div>
          )}
          {isDeliveryNote && invoice.carrier && (
            <div style={{ color: "#555", fontSize: "9pt", marginTop: "2px" }}>
              Transporteur: {invoice.carrier}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{
              backgroundColor: isDeliveryNote ? "#2563eb" : "#16a34a",
              color: "white",
            }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "9pt", fontWeight: "600" }}>#</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "9pt", fontWeight: "600" }}>Designation</th>
              <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "9pt", fontWeight: "600" }}>Qte</th>
              {(isDeliveryNote ? true : true) && (
                <>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "9pt", fontWeight: "600" }}>P.U.</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "9pt", fontWeight: "600" }}>Montant</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? "white" : "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <td style={{ padding: "8px 12px", fontSize: "9pt", color: "#888" }}>{idx + 1}</td>
                <td style={{ padding: "8px 12px", fontSize: "10pt", fontWeight: "500" }}>{item.name}</td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: "10pt" }}>{item.quantity}</td>
                <>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontSize: "10pt" }}>
                    {item.unitPrice.toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontSize: "10pt", fontWeight: "500" }}>
                    {item.subtotal.toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
                  </td>
                </>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
          <div style={{ width: "250px" }}>
            {hasTax ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10pt" }}>
                  <span style={{ color: "#555" }}>Sous-total HT</span>
                  <span>{invoice.subtotal.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                </div>
                {invoice.shippingCost > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10pt" }}>
                    <span style={{ color: "#555" }}>Frais de livraison</span>
                    <span>{invoice.shippingCost.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10pt" }}>
                  <span style={{ color: "#555" }}>TVA ({invoice.taxRate}%)</span>
                  <span>{invoice.taxAmount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontSize: "12pt",
                  fontWeight: "700",
                  borderTop: "2px solid #1a1a1a",
                  marginTop: "4px",
                }}>
                  <span>Total TTC</span>
                  <span>{invoice.total.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                </div>
              </>
            ) : (
              <>
                {invoice.shippingCost > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10pt" }}>
                      <span style={{ color: "#555" }}>Sous-total</span>
                      <span>{(invoice.total - invoice.shippingCost).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10pt" }}>
                      <span style={{ color: "#555" }}>Frais de livraison</span>
                      <span>{invoice.shippingCost.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                    </div>
                  </>
                )}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontSize: "12pt",
                  fontWeight: "700",
                  borderTop: "2px solid #1a1a1a",
                  marginTop: "4px",
                }}>
                  <span>Total</span>
                  <span>{invoice.total.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{
            backgroundColor: "#fefce8",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            padding: "10px 14px",
            marginBottom: "20px",
            fontSize: "9pt",
          }}>
            <div style={{ fontWeight: "600", marginBottom: "3px" }}>Notes:</div>
            <div style={{ color: "#555" }}>{invoice.notes}</div>
          </div>
        )}

        {/* Delivery Note - Signature area */}
        {isDeliveryNote && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "40px",
            marginBottom: "20px",
          }}>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div style={{ fontSize: "9pt", fontWeight: "600", marginBottom: "50px" }}>Expediteur</div>
              <div style={{ borderTop: "1px dashed #999", paddingTop: "5px", fontSize: "8pt", color: "#888" }}>
                Signature et cachet
              </div>
            </div>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div style={{ fontSize: "9pt", fontWeight: "600", marginBottom: "50px" }}>Destinataire</div>
              <div style={{ borderTop: "1px dashed #999", paddingTop: "5px", fontSize: "8pt", color: "#888" }}>
                Signature et cachet
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {invoice.footerText && (
          <div style={{
            textAlign: "center",
            fontSize: "9pt",
            color: "#888",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "12px",
            marginTop: "auto",
          }}>
            {invoice.footerText}
          </div>
        )}
      </div>
    )
  }
)

InvoicePreview.displayName = "InvoicePreview"
