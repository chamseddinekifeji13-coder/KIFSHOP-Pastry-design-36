"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ScanBarcode, Printer, Package, FlaskConical, Box, Settings2, Save, Trash2, Wifi, Loader2, Download, QrCode, WandSparkles, BadgePercent, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { BarcodeInput } from "@/components/ui/barcode-input"
import { useFinishedProducts, usePackaging, useRawMaterials } from "@/hooks/use-tenant-data"
import type { FinishedProduct, Packaging, RawMaterial } from "@/lib/stocks/actions"
import { getQZTrayService, type QZState } from "@/lib/qz-tray-service"

type LabelSource = "finished" | "raw" | "packaging"
type LabelSize = "compact" | "standard" | "detailed" | "roll40x30" | "roll50x30" | "roll58x40" | "roll80x50"
type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39"
type PrintMode = "browser" | "thermal"
type ProTemplateId = "price-focus" | "promo" | "batch" | "dlc"

interface LabelTemplate {
  id: string
  name: string
  source: LabelSource
  size: LabelSize
  barcodeFormat: BarcodeFormat
  labelName: string
  barcodeValue: string
  subtitle: string
  labelPrice: string
  showPrice: boolean
  showQr: boolean
  promoText: string
  showLot: boolean
  lotNumber: string
  productionDate: string
  expiryDate: string
  quantity: string
}

const SOURCE_LABELS: Record<LabelSource, string> = {
  finished: "Produits finis",
  raw: "Matieres premieres",
  packaging: "Emballages",
}

const TEMPLATE_STORAGE_KEY = "kifshop-label-templates-v1"

const BARCODE_FORMAT_OPTIONS: Array<{ value: BarcodeFormat; label: string }> = [
  { value: "CODE128", label: "CODE128 (alphanumerique)" },
  { value: "EAN13", label: "EAN13 (13 chiffres)" },
  { value: "EAN8", label: "EAN8 (8 chiffres)" },
  { value: "UPC", label: "UPC (12 chiffres)" },
  { value: "CODE39", label: "CODE39 (A-Z / 0-9)" },
]

const PRO_TEMPLATE_OPTIONS: Array<{ id: ProTemplateId; label: string; description: string }> = [
  { id: "price-focus", label: "Prix grand format", description: "Met en avant le prix" },
  { id: "promo", label: "Promo", description: "Ajoute un bandeau promotionnel" },
  { id: "batch", label: "Lot", description: "Affiche numero de lot + QR" },
  { id: "dlc", label: "DLC / Date prod", description: "Ajoute production et expiration" },
]

const LABEL_SIZE_OPTIONS: Array<{ value: LabelSize; label: string; widthMm: number; heightMm: number }> = [
  { value: "compact", label: "Compact (50x30 mm)", widthMm: 50, heightMm: 30 },
  { value: "standard", label: "Standard (70x40 mm)", widthMm: 70, heightMm: 40 },
  { value: "detailed", label: "Detaillee (90x55 mm)", widthMm: 90, heightMm: 55 },
  { value: "roll40x30", label: "Rouleau 40x30 mm", widthMm: 40, heightMm: 30 },
  { value: "roll50x30", label: "Rouleau 50x30 mm", widthMm: 50, heightMm: 30 },
  { value: "roll58x40", label: "Rouleau 58x40 mm", widthMm: 58, heightMm: 40 },
  { value: "roll80x50", label: "Rouleau 80x50 mm", widthMm: 80, heightMm: 50 },
]

function mmToPx(mm: number) {
  return Math.round(mm * 3.5)
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildDefaultBarcode(source: LabelSource, id: string) {
  return `KIF-${source.toUpperCase()}-${id.slice(0, 8).toUpperCase()}`
}

function validateBarcodeByFormat(format: BarcodeFormat, value: string): string | null {
  const cleaned = value.trim()
  if (!cleaned) return "Le code-barres est obligatoire"

  if (format === "EAN13" && !/^\d{12,13}$/.test(cleaned)) {
    return "EAN13 doit contenir 12 ou 13 chiffres"
  }
  if (format === "EAN8" && !/^\d{7,8}$/.test(cleaned)) {
    return "EAN8 doit contenir 7 ou 8 chiffres"
  }
  if (format === "UPC" && !/^\d{11,12}$/.test(cleaned)) {
    return "UPC doit contenir 11 ou 12 chiffres"
  }

  return null
}

function BarcodeSvg({ value, format }: { value: string; format: BarcodeFormat }) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current || !value.trim()) return

    let isCancelled = false
    import("jsbarcode")
      .then((mod) => {
        if (isCancelled || !svgRef.current) return
        const JsBarcode = (mod as unknown as {
          default: (
            element: SVGSVGElement,
            value: string,
            options?: Record<string, string | number | boolean>,
          ) => void
        }).default
        JsBarcode(svgRef.current, value.trim(), {
          format,
          displayValue: true,
          fontSize: 12,
          height: 44,
          margin: 0,
          background: "#ffffff",
          lineColor: "#111827",
        })
      })
      .catch(() => {
        if (!isCancelled) {
          toast.error("Code-barres invalide pour le format selectionne")
        }
      })

    return () => {
      isCancelled = true
    }
  }, [value, format])

  return <svg ref={svgRef} className="w-full h-[58px]" />
}

function QrCodeImage({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState("")

  useEffect(() => {
    const cleaned = value.trim()
    if (!cleaned) {
      setDataUrl("")
      return
    }

    let isCancelled = false
    import("qrcode")
      .then((mod) => {
        const toDataURL = (mod as unknown as {
          toDataURL?: (text: string, options?: Record<string, unknown>) => Promise<string>
          default?: { toDataURL?: (text: string, options?: Record<string, unknown>) => Promise<string> }
        }).toDataURL || (mod as unknown as { default?: { toDataURL?: (text: string, options?: Record<string, unknown>) => Promise<string> } }).default?.toDataURL

        if (!toDataURL) {
          throw new Error("QRCode loader unavailable")
        }
        return toDataURL(cleaned, {
          width: 84,
          margin: 0,
          errorCorrectionLevel: "M",
        })
      })
      .then((url) => {
        if (!isCancelled) {
          setDataUrl(url)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDataUrl("")
        }
      })

    return () => {
      isCancelled = true
    }
  }, [value])

  if (!dataUrl) return null
  return <img src={dataUrl} alt="QR code" className="mx-auto mt-1 h-[78px] w-[78px]" />
}

export function LabelGeneratorView() {
  const { data: finishedProducts = [] } = useFinishedProducts()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: packaging = [] } = usePackaging()

  const [source, setSource] = useState<LabelSource>("finished")
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [labelName, setLabelName] = useState("")
  const [barcodeValue, setBarcodeValue] = useState("")
  const [labelPrice, setLabelPrice] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [showPrice, setShowPrice] = useState(true)
  const [showQr, setShowQr] = useState(false)
  const [promoText, setPromoText] = useState("")
  const [showLot, setShowLot] = useState(false)
  const [lotNumber, setLotNumber] = useState("")
  const [productionDate, setProductionDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [size, setSize] = useState<LabelSize>("standard")
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("CODE128")
  const [templateName, setTemplateName] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [printMode, setPrintMode] = useState<PrintMode>("browser")
  const [qzState, setQzState] = useState<QZState>({
    connected: false,
    printers: [],
    selectedPrinter: null,
    version: null,
  })
  const [selectedQZPrinter, setSelectedQZPrinter] = useState("")
  const [qzLoading, setQzLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const isApplyingTemplateRef = useRef(false)

  const items = useMemo(() => {
    if (source === "finished") {
      return finishedProducts.map((p: FinishedProduct) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        price: p.sellingPrice,
      }))
    }
    if (source === "raw") {
      return rawMaterials.map((m: RawMaterial) => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        price: m.pricePerUnit,
      }))
    }
    return packaging.map((p: Packaging) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      price: p.price,
    }))
  }, [source, finishedProducts, rawMaterials, packaging])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, search])

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId])

  useEffect(() => {
    if (isApplyingTemplateRef.current) {
      isApplyingTemplateRef.current = false
      return
    }
    setSelectedId("")
    setLabelName("")
    setBarcodeValue("")
    setLabelPrice("")
    setSubtitle("")
    setPromoText("")
    setShowLot(false)
    setLotNumber("")
    setProductionDate("")
    setExpiryDate("")
  }, [source])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (stored) {
        setTemplates(JSON.parse(stored) as LabelTemplate[])
      }
    } catch {
      setTemplates([])
    }

    const mode = localStorage.getItem("labels-print-mode")
    if (mode === "thermal" || mode === "browser") {
      setPrintMode(mode)
    }

    const qzService = getQZTrayService()
    setQzState(qzService.getState())
    const unsubscribe = qzService.subscribe((state) => {
      setQzState(state)
      if (state.selectedPrinter) {
        setSelectedQZPrinter(state.selectedPrinter)
      }
    })
    const savedPrinter = localStorage.getItem("qz-printer-name")
    if (savedPrinter) setSelectedQZPrinter(savedPrinter)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("labels-print-mode", printMode)
    }
  }, [printMode])

  useEffect(() => {
    if (!selectedItem) return
    setLabelName(selectedItem.name)
    setBarcodeValue(buildDefaultBarcode(source, selectedItem.id))
    setLabelPrice(selectedItem.price > 0 ? selectedItem.price.toFixed(3) : "")
    setSubtitle(selectedItem.unit ? `Unite: ${selectedItem.unit}` : "")
  }, [selectedItem, source])

  const numericQuantity = Math.min(100, Math.max(1, Number(quantity) || 1))
  const labels = useMemo(() => Array.from({ length: numericQuantity }), [numericQuantity])
  const sizeMeta = LABEL_SIZE_OPTIONS.find((s) => s.value === size) || LABEL_SIZE_OPTIONS[1]

  const canPrint = !!labelName.trim() && !!barcodeValue.trim()

  const persistTemplates = (nextTemplates: LabelTemplate[]) => {
    setTemplates(nextTemplates)
    if (typeof window !== "undefined") {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates))
    }
  }

  const saveTemplate = () => {
    const name = templateName.trim()
    if (!name) {
      toast.error("Donnez un nom au modele")
      return
    }
    const next: LabelTemplate = {
      id: `${Date.now()}`,
      name,
      source,
      size,
      barcodeFormat,
      labelName,
      barcodeValue,
      subtitle,
      labelPrice,
      showPrice,
      showQr,
      promoText,
      showLot,
      lotNumber,
      productionDate,
      expiryDate,
      quantity,
    }
    const updated = [next, ...templates].slice(0, 20)
    persistTemplates(updated)
    setTemplateName("")
    setSelectedTemplateId(next.id)
    toast.success("Modele enregistre")
  }

  const applyTemplate = (id: string) => {
    setSelectedTemplateId(id)
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    isApplyingTemplateRef.current = true
    setSource(tpl.source)
    setSize(tpl.size)
    setBarcodeFormat(tpl.barcodeFormat)
    setLabelName(tpl.labelName)
    setBarcodeValue(tpl.barcodeValue)
    setSubtitle(tpl.subtitle)
    setLabelPrice(tpl.labelPrice)
    setShowPrice(tpl.showPrice)
    setShowQr(Boolean(tpl.showQr))
    setPromoText(tpl.promoText || "")
    setShowLot(Boolean(tpl.showLot))
    setLotNumber(tpl.lotNumber || "")
    setProductionDate(tpl.productionDate || "")
    setExpiryDate(tpl.expiryDate || "")
    setQuantity(tpl.quantity)
    toast.success(`Modele "${tpl.name}" charge`)
  }

  const deleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id)
    persistTemplates(updated)
    if (selectedTemplateId === id) {
      setSelectedTemplateId("")
    }
    toast.success("Modele supprime")
  }

  const buildPrintHtml = () => {
    if (!previewRef.current) return ""
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Etiquettes - ${labelName}</title>
        <style>
          body { margin: 12px; font-family: Arial, sans-serif; color: #111827; }
          .label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(${sizeMeta.widthMm}mm, 1fr)); gap: 8mm; }
          .label-item { width: ${sizeMeta.widthMm}mm; min-height: ${sizeMeta.heightMm}mm; border: 1px solid #d1d5db; border-radius: 6px; padding: 3mm; box-sizing: border-box; }
          .label-name { font-size: 12px; font-weight: 700; margin-bottom: 2mm; }
          .label-sub { font-size: 10px; color: #4b5563; margin-bottom: 2mm; }
          .label-price { font-size: 12px; font-weight: 700; margin-bottom: 2mm; }
          .label-code { font-size: 10px; margin-top: 2mm; text-align: center; }
          svg { width: 100%; height: 16mm; }
          @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${previewRef.current.innerHTML}</body>
      </html>
    `
  }

  const handleExportPdf = async () => {
    if (!previewRef.current) return

    const barcodeError = validateBarcodeByFormat(barcodeFormat, barcodeValue)
    if (barcodeError) {
      toast.error(barcodeError)
      return
    }

    setPdfLoading(true)
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([import("html2canvas"), import("jspdf")])
      const jsPDFCtor = (jsPdfModule as unknown as { jsPDF: new (...args: any[]) => any }).jsPDF
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDFCtor("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 6
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = margin
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST")
      heightLeft -= pageHeight - margin * 2

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft)
        pdf.addPage()
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST")
        heightLeft -= pageHeight - margin * 2
      }

      pdf.save(`etiquettes-${Date.now()}.pdf`)
      toast.success("PDF exporte avec succes")
    } catch (error: any) {
      toast.error(error?.message || "Export PDF impossible")
    } finally {
      setPdfLoading(false)
    }
  }

  const applyProTemplate = (templateId: ProTemplateId) => {
    if (templateId === "price-focus") {
      setSize("detailed")
      setShowPrice(true)
      setShowQr(false)
      setPromoText("")
      toast.success("Gabarit prix applique")
      return
    }

    if (templateId === "promo") {
      setSize("standard")
      setShowPrice(true)
      setShowQr(false)
      setPromoText("PROMO")
      toast.success("Gabarit promo applique")
      return
    }

    if (templateId === "batch") {
      setSize("roll58x40")
      setShowPrice(false)
      setShowQr(true)
      setShowLot(true)
      setLotNumber(`LOT-${Date.now().toString().slice(-6)}`)
      toast.success("Gabarit lot applique")
      return
    }

    const prodDate = new Date()
    const expDate = new Date()
    expDate.setDate(expDate.getDate() + 3)
    setSize("roll80x50")
    setShowPrice(false)
    setShowQr(true)
    setProductionDate(formatDateForInput(prodDate))
    setExpiryDate(formatDateForInput(expDate))
    toast.success("Gabarit DLC/date prod applique")
  }

  const handlePrint = () => {
    if (!canPrint || !previewRef.current) {
      toast.error("Completez d'abord les informations de l'etiquette")
      return
    }

    const barcodeError = validateBarcodeByFormat(barcodeFormat, barcodeValue)
    if (barcodeError) {
      toast.error(barcodeError)
      return
    }

    if (printMode === "thermal") {
      void handleThermalPrint()
      return
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Popup bloquee. Autorisez les popups pour imprimer.")
      return
    }

    printWindow.document.write(buildPrintHtml())
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const connectQZ = async () => {
    setQzLoading(true)
    try {
      const qzService = getQZTrayService()
      const connected = await qzService.connect()
      if (!connected) {
        toast.error("QZ Tray non disponible")
        return
      }
      const state = qzService.getState()
      setQzState(state)
      if (state.selectedPrinter) {
        setSelectedQZPrinter(state.selectedPrinter)
      }
      toast.success(`QZ Tray connecte (${state.printers.length} imprimante(s))`)
    } catch (error: any) {
      toast.error(error?.message || "Connexion QZ Tray impossible")
    } finally {
      setQzLoading(false)
    }
  }

  const handleThermalPrint = async () => {
    setQzLoading(true)
    try {
      const qzService = getQZTrayService()
      if (!qzService.isConnected()) {
        const connected = await qzService.connect()
        if (!connected) {
          toast.error("QZ Tray non connecte")
          return
        }
      }

      if (selectedQZPrinter) {
        qzService.selectPrinter(selectedQZPrinter)
      }

      const printerName = qzService.getSelectedPrinter()
      if (!printerName) {
        toast.error("Selectionnez une imprimante thermique")
        return
      }

      await qzService.printHtml(buildPrintHtml(), {
        copies: 1,
        jobName: `Etiquettes ${labelName || "KIFSHOP"}`,
      })
      toast.success(`Etiquettes envoyees a ${printerName}`)
    } catch (error: any) {
      toast.error(error?.message || "Impression thermique echouee")
    } finally {
      setQzLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ScanBarcode className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Generateur d'etiquettes</h1>
          <p className="text-sm text-muted-foreground">Creez et imprimez des etiquettes avec code-barres</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Source</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["finished", "raw", "packaging"] as LabelSource[]).map((opt) => (
                  <Button
                    key={opt}
                    variant={source === opt ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSource(opt)}
                  >
                    {opt === "finished" ? <Package className="h-3.5 w-3.5 mr-1" /> : opt === "raw" ? <FlaskConical className="h-3.5 w-3.5 mr-1" /> : <Box className="h-3.5 w-3.5 mr-1" />}
                    {SOURCE_LABELS[opt]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-search" className="text-xs">Recherche article</Label>
              <Input id="item-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tapez un nom..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-select" className="text-xs">Article</Label>
              <select
                id="item-select"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Selectionner un article</option>
                {filteredItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label-name" className="text-xs">Nom affiche</Label>
              <Input id="label-name" value={labelName} onChange={(e) => setLabelName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Code-barres</Label>
              <BarcodeInput value={barcodeValue} onChange={setBarcodeValue} placeholder="Ex: KIF-FINISHED-AB12CD34" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode-format" className="text-xs">Format code-barres</Label>
              <select
                id="barcode-format"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
              >
                {BARCODE_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle" className="text-xs">Sous-ligne (optionnel)</Label>
              <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex: Unite: kg" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="label-price" className="text-xs">Prix (TND)</Label>
                <Input id="label-price" type="number" step="0.001" min="0" value={labelPrice} onChange={(e) => setLabelPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label-qty" className="text-xs">Quantite</Label>
                <Input id="label-qty" type="number" min="1" max="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label-size" className="text-xs">Format etiquette</Label>
              <select
                id="label-size"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={size}
                onChange={(e) => setSize(e.target.value as LabelSize)}
              >
                {LABEL_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-price" className="text-xs">Afficher le prix</Label>
                <Switch id="show-price" checked={showPrice} onCheckedChange={setShowPrice} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-qr" className="text-xs flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  Afficher QR code
                </Label>
                <Switch id="show-qr" checked={showQr} onCheckedChange={setShowQr} />
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <Label className="text-xs">Modeles d'etiquettes</Label>
              <div className="flex gap-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nom du modele"
                />
                <Button type="button" variant="outline" onClick={saveTemplate}>
                  <Save className="h-4 w-4 mr-1" />
                  Sauver
                </Button>
              </div>
              <div className="flex gap-2">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                >
                  <option value="">Charger un modele</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!selectedTemplateId}
                  onClick={() => deleteTemplate(selectedTemplateId)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <Label className="text-xs flex items-center gap-1.5">
                <WandSparkles className="h-3.5 w-3.5" />
                Bibliotheque gabarits pro
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {PRO_TEMPLATE_OPTIONS.map((tpl) => (
                  <Button
                    key={tpl.id}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start py-2.5"
                    onClick={() => applyProTemplate(tpl.id)}
                  >
                    <div className="text-left">
                      <div className="text-xs font-semibold">{tpl.label}</div>
                      <div className="text-[11px] text-muted-foreground">{tpl.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <Label className="text-xs">Infos produit avances</Label>
              <div className="space-y-2">
                <Label htmlFor="promo-text" className="text-xs">Texte promo (optionnel)</Label>
                <Input id="promo-text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Ex: PROMO -20%" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-lot" className="text-xs">Afficher numero de lot</Label>
                <Switch id="show-lot" checked={showLot} onCheckedChange={setShowLot} />
              </div>
              {showLot && (
                <div className="space-y-2">
                  <Label htmlFor="lot-number" className="text-xs">Numero de lot</Label>
                  <Input id="lot-number" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Ex: LOT-240722" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="production-date" className="text-xs">Date prod</Label>
                  <Input id="production-date" type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry-date" className="text-xs">DLC</Label>
                  <Input id="expiry-date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <Label htmlFor="print-mode" className="text-xs">Mode impression</Label>
              <select
                id="print-mode"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={printMode}
                onChange={(e) => setPrintMode(e.target.value as PrintMode)}
              >
                <option value="browser">Impression navigateur (A4 / etiquettes)</option>
                <option value="thermal">Impression thermique (QZ Tray)</option>
              </select>

              {printMode === "thermal" && (
                <div className="space-y-2 rounded-md border border-dashed p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Statut: {qzState.connected ? "Connecte" : "Non connecte"}
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={connectQZ} disabled={qzLoading}>
                      {qzLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wifi className="h-3.5 w-3.5 mr-1" />}
                      Verifier
                    </Button>
                  </div>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedQZPrinter}
                    onChange={(e) => setSelectedQZPrinter(e.target.value)}
                  >
                    <option value="">Selectionner imprimante thermique</option>
                    {qzState.printers.map((printerName) => (
                      <option key={printerName} value={printerName}>{printerName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button className="w-full" onClick={handlePrint} disabled={!canPrint}>
                <Printer className="h-4 w-4 mr-2" />
                {printMode === "thermal" ? "Imprimer thermique" : "Imprimer les etiquettes"}
              </Button>
              <Button className="w-full" variant="outline" onClick={handleExportPdf} disabled={!canPrint || pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Exporter PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Apercu</span>
              <Badge variant="secondary">{numericQuantity} etiquette(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={previewRef} className="label-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {labels.map((_, idx) => (
                <div
                  key={idx}
                  className="label-item rounded-lg border bg-white p-3 shadow-sm"
                  style={{
                    width: `${mmToPx(sizeMeta.widthMm)}px`,
                    minHeight: `${mmToPx(sizeMeta.heightMm)}px`,
                  }}
                >
                  <div className="label-name text-sm font-semibold leading-tight">{labelName || "Nom article"}</div>
                  {promoText.trim() && (
                    <div className="mb-1 inline-flex items-center rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <BadgePercent className="mr-1 h-3 w-3" />
                      {promoText}
                    </div>
                  )}
                  {subtitle && <div className="label-sub text-xs text-muted-foreground mb-1">{subtitle}</div>}
                  {showPrice && labelPrice && <div className="label-price text-sm font-bold mb-1">{Number(labelPrice).toFixed(3)} TND</div>}
                  {showLot && lotNumber.trim() && (
                    <div className="mb-1 text-[11px] font-medium text-slate-700">Lot: {lotNumber}</div>
                  )}
                  {(productionDate || expiryDate) && (
                    <div className="mb-1 text-[10px] text-slate-600 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      <span>
                        {productionDate ? `Prod ${productionDate}` : ""}
                        {productionDate && expiryDate ? " | " : ""}
                        {expiryDate ? `DLC ${expiryDate}` : ""}
                      </span>
                    </div>
                  )}
                  <BarcodeSvg value={barcodeValue || "KIFSHOP"} format={barcodeFormat} />
                  {showQr && <QrCodeImage value={barcodeValue || "KIFSHOP"} />}
                  <div className="label-code mt-1 text-[11px] text-center text-muted-foreground">{barcodeValue || "Code-barres"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
