"use client"

/**
 * QZ Tray Service - Communication avec l'application QZ Tray pour l'impression thermique
 * Documentation: https://qz.io/docs
 * 
 * Ce service remplace le Bridge local et permet:
 * - Détection automatique de QZ Tray
 * - Liste des imprimantes disponibles
 * - Impression ESC/POS sur imprimantes thermiques
 * - Ouverture du tiroir-caisse
 */

// ESC/POS Commands in hex format for QZ Tray
const ESCPOS_HEX = {
  INIT: "1B40",
  ALIGN_LEFT: "1B6100",
  ALIGN_CENTER: "1B6101",
  ALIGN_RIGHT: "1B6102",
  BOLD_ON: "1B4501",
  BOLD_OFF: "1B4500",
  DOUBLE_HEIGHT: "1B2101",
  DOUBLE_WIDTH: "1B2110",
  DOUBLE_SIZE: "1B2111",
  NORMAL_SIZE: "1B2100",
  LINE_FEED: "0A",
  CUT_PARTIAL: "1D5601",
  CUT_FULL: "1D5600",
  OPEN_DRAWER_PIN2: "1B7000197A",
  OPEN_DRAWER_PIN5: "1B7001197A",
  BEEP: "1B42030A",
}

// Text to hex conversion
function textToHex(text: string): string {
  let hex = ""
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(2, "0")
  }
  return hex
}

// Format two columns for receipt
function formatTwoColumns(left: string, right: string, width: number = 48): string {
  const rightLen = right.length
  const leftLen = width - rightLen - 1
  const truncatedLeft = left.substring(0, leftLen)
  const spaces = " ".repeat(Math.max(1, width - truncatedLeft.length - rightLen))
  return truncatedLeft + spaces + right
}

// Separator line
function separator(char: string = "-", width: number = 48): string {
  return char.repeat(width)
}

// QZ Tray connection state
interface QZState {
  connected: boolean
  printers: string[]
  selectedPrinter: string | null
  version: string | null
}

class QZTrayService {
  private state: QZState = {
    connected: false,
    printers: [],
    selectedPrinter: null,
    version: null,
  }

  private qz: any = null
  private connectionPromise: Promise<boolean> | null = null
  private listeners: Set<(state: QZState) => void> = new Set()

  constructor() {
    // Load saved printer from localStorage
    if (typeof window !== "undefined") {
      this.state.selectedPrinter = localStorage.getItem("qz-printer-name") || null
    }
  }

  // Get current state
  getState(): QZState {
    return { ...this.state }
  }

  // Subscribe to state changes
  subscribe(listener: (state: QZState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()))
  }

  // Check if QZ Tray library is loaded
  private async loadQZLibrary(): Promise<boolean> {
    if (typeof window === "undefined") return false

    // Check if already loaded
    if ((window as any).qz) {
      this.qz = (window as any).qz
      return true
    }

    // Dynamically load QZ Tray script
    return new Promise((resolve) => {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.min.js"
      script.async = true
      script.onload = () => {
        this.qz = (window as any).qz
        resolve(true)
      }
      script.onerror = () => {
        console.error("[QZ Tray] Failed to load library")
        resolve(false)
      }
      document.head.appendChild(script)
    })
  }

  // Connect to QZ Tray
  async connect(): Promise<boolean> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this._connect()
    const result = await this.connectionPromise
    this.connectionPromise = null
    return result
  }

  private async _connect(): Promise<boolean> {
    try {
      console.log("[QZ Tray] Starting connection...")
      
      // Load library if needed
      const loaded = await this.loadQZLibrary()
      console.log("[QZ Tray] Library loaded:", loaded)
      if (!loaded || !this.qz) {
        console.error("[QZ Tray] Library not available - make sure QZ Tray app is running")
        return false
      }

      console.log("[QZ Tray] Checking existing connection...")
      
      // Check if already connected
      if (this.qz.websocket.isActive()) {
        console.log("[QZ Tray] Already connected")
        this.state.connected = true
        await this.loadPrinters()
        this.notifyListeners()
        return true
      }

      console.log("[QZ Tray] Configuring security...")
      
      // Configure security (QZ Tray will use its default certificate)
      // This is safe for localhost/development - no need for custom certificates
      this.qz.security.setCertificatePromise((resolve: any) => {
        // Return empty string to use QZ Tray's default certificate
        resolve("")
      })

      this.qz.security.setSignaturePromise((resolve: any, reject: any) => {
        // Return empty string - signatures optional for development
        resolve("")
      })

      console.log("[QZ Tray] Connecting WebSocket...")
      
      // Connect to QZ Tray with timeout
      await Promise.race([
        this.qz.websocket.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout - QZ Tray not running?")), 5000)
        )
      ])

      // Get version
      try {
        this.state.version = await this.qz.api.getVersion()
        console.log("[QZ Tray] Version:", this.state.version)
      } catch {
        this.state.version = "Unknown"
      }

      this.state.connected = true
      await this.loadPrinters()
      this.notifyListeners()

      console.log("[QZ Tray] Connected successfully, found printers:", this.state.printers)
      return true
    } catch (error: any) {
      console.error("[QZ Tray] Connection failed:", error.message)
      this.state.connected = false
      this.state.printers = []
      this.notifyListeners()
      return false
    }
  }

  // Disconnect from QZ Tray
  async disconnect(): Promise<void> {
    if (this.qz && this.qz.websocket.isActive()) {
      try {
        await this.qz.websocket.disconnect()
      } catch (error) {
        console.error("[QZ Tray] Disconnect error:", error)
      }
    }
    this.state.connected = false
    this.notifyListeners()
  }

  // Load available printers
  async loadPrinters(): Promise<string[]> {
    if (!this.qz || !this.state.connected) {
      return []
    }

    try {
      const printers = await this.qz.printers.find()
      this.state.printers = Array.isArray(printers) ? printers : [printers]
      this.notifyListeners()
      return this.state.printers
    } catch (error) {
      console.error("[QZ Tray] Error loading printers:", error)
      return []
    }
  }

  // Set selected printer
  selectPrinter(printerName: string): void {
    this.state.selectedPrinter = printerName
    if (typeof window !== "undefined") {
      localStorage.setItem("qz-printer-name", printerName)
      localStorage.setItem("printer-mode", "qz-tray")
    }
    this.notifyListeners()
  }

  // Check if connected
  isConnected(): boolean {
    return this.state.connected && this.qz?.websocket?.isActive()
  }

  // Get selected printer
  getSelectedPrinter(): string | null {
    return this.state.selectedPrinter
  }

  // Build ESC/POS data array for QZ Tray
  private buildReceiptData(receipt: {
    storeName: string
    storeAddress?: string
    storePhone?: string
    cashierName: string
    items: Array<{ name: string; qty: number; price: number }>
    subtotal: number
    discount?: number
    total: number
    paymentMethod: string
    amountPaid?: number
    change?: number
    transactionId: string
    date?: Date
  }): string[] {
    const date = receipt.date || new Date()
    const data: string[] = []

    // Initialize
    data.push(ESCPOS_HEX.INIT)

    // Header - centered, double size
    data.push(ESCPOS_HEX.ALIGN_CENTER)
    data.push(ESCPOS_HEX.DOUBLE_SIZE)
    data.push(textToHex(receipt.storeName))
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(ESCPOS_HEX.NORMAL_SIZE)

    if (receipt.storeAddress) {
      data.push(textToHex(receipt.storeAddress))
      data.push(ESCPOS_HEX.LINE_FEED)
    }
    if (receipt.storePhone) {
      data.push(textToHex(`Tel: ${receipt.storePhone}`))
      data.push(ESCPOS_HEX.LINE_FEED)
    }

    // Separator
    data.push(ESCPOS_HEX.ALIGN_LEFT)
    data.push(textToHex(separator("=")))
    data.push(ESCPOS_HEX.LINE_FEED)

    // Transaction info
    data.push(textToHex(`Date: ${date.toLocaleDateString("fr-TN")} ${date.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}`))
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(textToHex(`Caissier: ${receipt.cashierName}`))
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(textToHex(`N: ${receipt.transactionId}`))
    data.push(ESCPOS_HEX.LINE_FEED)

    data.push(textToHex(separator("-")))
    data.push(ESCPOS_HEX.LINE_FEED)

    // Items
    for (const item of receipt.items) {
      const itemTotal = (item.qty * item.price).toFixed(3)
      const line = formatTwoColumns(`${item.qty}x ${item.name}`, `${itemTotal} TND`)
      data.push(textToHex(line))
      data.push(ESCPOS_HEX.LINE_FEED)
    }

    data.push(textToHex(separator("-")))
    data.push(ESCPOS_HEX.LINE_FEED)

    // Subtotal
    data.push(textToHex(formatTwoColumns("Sous-total:", `${receipt.subtotal.toFixed(3)} TND`)))
    data.push(ESCPOS_HEX.LINE_FEED)

    // Discount
    if (receipt.discount && receipt.discount > 0) {
      data.push(textToHex(formatTwoColumns("Remise:", `-${receipt.discount.toFixed(3)} TND`)))
      data.push(ESCPOS_HEX.LINE_FEED)
    }

    // Total - bold, double height
    data.push(ESCPOS_HEX.BOLD_ON)
    data.push(ESCPOS_HEX.DOUBLE_HEIGHT)
    data.push(textToHex(formatTwoColumns("TOTAL:", `${receipt.total.toFixed(3)} TND`)))
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(ESCPOS_HEX.NORMAL_SIZE)
    data.push(ESCPOS_HEX.BOLD_OFF)

    data.push(textToHex(separator("-")))
    data.push(ESCPOS_HEX.LINE_FEED)

    // Payment info
    data.push(textToHex(`Paiement: ${receipt.paymentMethod}`))
    data.push(ESCPOS_HEX.LINE_FEED)

    if (receipt.amountPaid) {
      data.push(textToHex(formatTwoColumns("Recu:", `${receipt.amountPaid.toFixed(3)} TND`)))
      data.push(ESCPOS_HEX.LINE_FEED)
    }
    if (receipt.change && receipt.change > 0) {
      data.push(textToHex(formatTwoColumns("Monnaie:", `${receipt.change.toFixed(3)} TND`)))
      data.push(ESCPOS_HEX.LINE_FEED)
    }

    data.push(textToHex(separator("=")))
    data.push(ESCPOS_HEX.LINE_FEED)

    // Footer
    data.push(ESCPOS_HEX.ALIGN_CENTER)
    data.push(textToHex("Merci de votre visite!"))
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(textToHex("A bientot!"))
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(ESCPOS_HEX.LINE_FEED)
    data.push(ESCPOS_HEX.LINE_FEED)

    // Cut paper
    data.push(ESCPOS_HEX.CUT_PARTIAL)

    return data
  }

  // Print receipt
  async printReceipt(receipt: {
    storeName: string
    storeAddress?: string
    storePhone?: string
    cashierName: string
    items: Array<{ name: string; qty: number; price: number }>
    subtotal: number
    discount?: number
    total: number
    paymentMethod: string
    amountPaid?: number
    change?: number
    transactionId: string
    date?: Date
  }): Promise<boolean> {
    if (!this.isConnected() || !this.state.selectedPrinter) {
      throw new Error("QZ Tray non connecté ou imprimante non sélectionnée")
    }

    try {
      const config = this.qz.configs.create(this.state.selectedPrinter)
      const data = this.buildReceiptData(receipt)

      // Send raw hex data
      await this.qz.print(config, [{
        type: "raw",
        format: "hex",
        data: data.join("")
      }])

      console.log("[QZ Tray] Receipt printed successfully")
      return true
    } catch (error: any) {
      console.error("[QZ Tray] Print error:", error)
      throw new Error(`Erreur impression: ${error.message}`)
    }
  }

  // Open cash drawer
  async openDrawer(): Promise<boolean> {
    if (!this.isConnected() || !this.state.selectedPrinter) {
      throw new Error("QZ Tray non connecté ou imprimante non sélectionnée")
    }

    try {
      const config = this.qz.configs.create(this.state.selectedPrinter)
      
      await this.qz.print(config, [{
        type: "raw",
        format: "hex",
        data: ESCPOS_HEX.OPEN_DRAWER_PIN2
      }])

      console.log("[QZ Tray] Cash drawer opened")
      return true
    } catch (error: any) {
      console.error("[QZ Tray] Drawer error:", error)
      throw new Error(`Erreur tiroir-caisse: ${error.message}`)
    }
  }

  // Print and open drawer (for cash payments)
  async printAndOpenDrawer(receipt: Parameters<typeof this.printReceipt>[0]): Promise<boolean> {
    if (!this.isConnected() || !this.state.selectedPrinter) {
      throw new Error("QZ Tray non connecté ou imprimante non sélectionnée")
    }

    try {
      const config = this.qz.configs.create(this.state.selectedPrinter)
      const receiptData = this.buildReceiptData(receipt)

      // Add drawer command after receipt
      receiptData.push(ESCPOS_HEX.OPEN_DRAWER_PIN2)

      await this.qz.print(config, [{
        type: "raw",
        format: "hex",
        data: receiptData.join("")
      }])

      console.log("[QZ Tray] Receipt printed and drawer opened")
      return true
    } catch (error: any) {
      console.error("[QZ Tray] Print+Drawer error:", error)
      throw new Error(`Erreur impression: ${error.message}`)
    }
  }

  // Test print
  async testPrint(): Promise<boolean> {
    if (!this.isConnected() || !this.state.selectedPrinter) {
      throw new Error("QZ Tray non connecté ou imprimante non sélectionnée")
    }

    try {
      const config = this.qz.configs.create(this.state.selectedPrinter)
      
      const data: string[] = [
        ESCPOS_HEX.INIT,
        ESCPOS_HEX.ALIGN_CENTER,
        ESCPOS_HEX.DOUBLE_SIZE,
        textToHex("KIFSHOP PASTRY"),
        ESCPOS_HEX.LINE_FEED,
        ESCPOS_HEX.NORMAL_SIZE,
        textToHex("Test QZ Tray"),
        ESCPOS_HEX.LINE_FEED,
        ESCPOS_HEX.ALIGN_LEFT,
        textToHex(separator("=")),
        ESCPOS_HEX.LINE_FEED,
        textToHex(`Date: ${new Date().toLocaleString("fr-TN")}`),
        ESCPOS_HEX.LINE_FEED,
        textToHex(`Imprimante: ${this.state.selectedPrinter}`),
        ESCPOS_HEX.LINE_FEED,
        textToHex(separator("-")),
        ESCPOS_HEX.LINE_FEED,
        ESCPOS_HEX.ALIGN_CENTER,
        ESCPOS_HEX.BOLD_ON,
        textToHex("Configuration OK!"),
        ESCPOS_HEX.BOLD_OFF,
        ESCPOS_HEX.LINE_FEED,
        ESCPOS_HEX.LINE_FEED,
        ESCPOS_HEX.LINE_FEED,
        ESCPOS_HEX.CUT_PARTIAL,
      ]

      await this.qz.print(config, [{
        type: "raw",
        format: "hex",
        data: data.join("")
      }])

      return true
    } catch (error: any) {
      console.error("[QZ Tray] Test print error:", error)
      throw new Error(`Erreur test: ${error.message}`)
    }
  }
}

// Singleton instance
let qzServiceInstance: QZTrayService | null = null

export function getQZTrayService(): QZTrayService {
  if (!qzServiceInstance) {
    qzServiceInstance = new QZTrayService()
  }
  return qzServiceInstance
}

export type { QZState }
export { QZTrayService }
