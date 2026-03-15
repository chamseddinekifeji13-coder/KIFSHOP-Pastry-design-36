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
      console.log("[QZ Tray] Library already loaded")
      return true
    }

    // Remove any existing QZ script to avoid conflicts
    const existingScript = document.querySelector('script[src*="qz-tray"]')
    if (existingScript) {
      existingScript.remove()
    }

  // Try multiple CDN sources - using latest stable versions
  // Note: QZ Tray 2.2.x requires matching client library version
  const cdnSources = [
    "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.min.js",
    "https://cdn.jsdelivr.net/npm/qz-tray@2.2.3/qz-tray.min.js",
    "https://cdn.jsdelivr.net/npm/qz-tray@2.2.2/qz-tray.min.js",
    "https://cdn.jsdelivr.net/npm/qz-tray@2.2.1/qz-tray.min.js",
    "https://cdn.jsdelivr.net/npm/qz-tray@2.2.0/qz-tray.min.js",
    "https://cdn.jsdelivr.net/npm/qz-tray@2.1.7/qz-tray.min.js",
    "https://unpkg.com/qz-tray@2.2.4/qz-tray.min.js",
  ]
  
  console.log("[QZ Tray] Starting CDN library load, trying", cdnSources.length, "sources...")

    for (const src of cdnSources) {
      console.log("[QZ Tray] Trying to load from:", src)
      const loaded = await this.tryLoadScript(src)
      if (loaded) {
        console.log("[QZ Tray] Library loaded successfully from:", src)
        return true
      }
    }

    console.error("[QZ Tray] Failed to load library from all CDN sources")
    return false
  }

  private tryLoadScript(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const script = document.createElement("script")
      script.src = src
      script.async = true
      
      const timeout = setTimeout(() => {
        console.warn("[QZ Tray] Script load timeout for:", src)
        resolve(false)
      }, 10000)

      script.onload = () => {
        clearTimeout(timeout)
        if ((window as any).qz) {
          this.qz = (window as any).qz
          resolve(true)
        } else {
          console.warn("[QZ Tray] Script loaded but qz object not found")
          resolve(false)
        }
      }
      script.onerror = () => {
        clearTimeout(timeout)
        console.warn("[QZ Tray] Script load error for:", src)
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
      
      // Configure security for QZ Tray
      // QZ Tray 2.1+ allows unsigned requests from localhost by default
      this.qz.security.setCertificatePromise((resolve: any) => {
        console.log("[QZ Tray] Certificate promise called")
        resolve("")
      })

      this.qz.security.setSignaturePromise((toSign: string) => {
        console.log("[QZ Tray] Signature promise called")
        return Promise.resolve("")
      })

      console.log("[QZ Tray] Connecting WebSocket...")
      
      // QZ Tray connection approach:
      // 1. First try without any options (let qz-tray auto-detect)
      // 2. Then try secure (wss://localhost:8181)
      // 3. Then try insecure (ws://localhost:8182)
      // 4. Try with 127.0.0.1 as fallback
      
      const connectionStrategies = [
        { name: "auto-detect", options: {} },
        { name: "wss://localhost:8181", options: { host: "localhost", usingSecure: true } },
        { name: "ws://localhost:8182", options: { host: "localhost", usingSecure: false } },
        { name: "wss://127.0.0.1:8181", options: { host: "127.0.0.1", usingSecure: true } },
        { name: "ws://127.0.0.1:8182", options: { host: "127.0.0.1", usingSecure: false } },
      ]
      
      let lastError: any = null
      let connected = false
      
      for (const strategy of connectionStrategies) {
        if (connected) break
        
        console.log(`[QZ Tray] Trying: ${strategy.name}...`)
        
        try {
          // Disconnect first if there's a stale connection
          if (this.qz.websocket.isActive()) {
            console.log("[QZ Tray] Disconnecting stale connection...")
            try {
              await this.qz.websocket.disconnect()
            } catch (e) {
              // Ignore disconnect errors
            }
          }
          
          await Promise.race([
            this.qz.websocket.connect(strategy.options),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout for ${strategy.name}`)), 5000)
            )
          ])
          
          // Verify connection is active
          if (this.qz.websocket.isActive()) {
            console.log(`[QZ Tray] SUCCESS! Connected via ${strategy.name}`)
            connected = true
            lastError = null
            break
          } else {
            console.log(`[QZ Tray] ${strategy.name} connected but websocket not active`)
          }
        } catch (error: any) {
          lastError = error
          console.log(`[QZ Tray] ${strategy.name} failed:`, error.message || error)
        }
      }
      
      if (!connected && lastError) {
        throw new Error(`Toutes les strategies ont echoue. Dernier: ${lastError.message || lastError}`)
      }
      
      if (!connected) {
        throw new Error("Connexion echouee sans erreur specifique")
      }

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

// Diagnostic function to check QZ Tray connectivity
export async function diagnoseQZTray(): Promise<{
  libraryLoaded: boolean
  websocketAvailable: boolean
  connected: boolean
  printers: string[]
  version: string | null
  error: string | null
}> {
  const result = {
    libraryLoaded: false,
    websocketAvailable: false,
    connected: false,
    printers: [] as string[],
    version: null as string | null,
    error: null as string | null,
  }
  
  try {
    // Check if running in browser
    if (typeof window === "undefined") {
      result.error = "Not running in browser"
      return result
    }
    
    // Check if qz library is available
    const qz = (window as any).qz
    if (qz) {
      result.libraryLoaded = true
      console.log("[QZ Diag] Library is loaded")
      
      // Check websocket availability
      if (qz.websocket) {
        result.websocketAvailable = true
        console.log("[QZ Diag] WebSocket module available")
        
        // Check if connected
        if (qz.websocket.isActive()) {
          result.connected = true
          console.log("[QZ Diag] Already connected")
          
          // Get printers
          try {
            const printers = await qz.printers.find()
            result.printers = Array.isArray(printers) ? printers : [printers]
          } catch (e) {
            console.log("[QZ Diag] Could not get printers:", e)
          }
          
          // Get version
          try {
            result.version = await qz.api.getVersion()
          } catch (e) {
            console.log("[QZ Diag] Could not get version:", e)
          }
        } else {
          console.log("[QZ Diag] WebSocket not active, QZ Tray may not be running")
          result.error = "WebSocket not active - QZ Tray may not be running on localhost:8181"
        }
      } else {
        result.error = "WebSocket module not available in qz library"
      }
    } else {
      result.error = "QZ library not loaded - CDN may be blocked or slow"
    }
  } catch (e: any) {
    result.error = e.message || String(e)
  }
  
  console.log("[QZ Diag] Result:", result)
  return result
}

export type { QZState }
export { QZTrayService }
