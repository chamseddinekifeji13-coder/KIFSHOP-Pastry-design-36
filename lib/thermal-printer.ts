"use client"

// ESC/POS Commands for thermal printers
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

export const ESCPOS = {
  // Initialize printer
  INIT: new Uint8Array([ESC, 0x40]),
  
  // Text formatting
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  
  // Text size
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x01]),
  DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x10]),
  DOUBLE_SIZE: new Uint8Array([GS, 0x21, 0x11]),
  
  // Text style
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2D, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2D, 0x00]),
  
  // Line feed
  LINE_FEED: new Uint8Array([LF]),
  FEED_LINES: (n: number) => new Uint8Array([ESC, 0x64, n]),
  
  // Paper cut
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),
  CUT_FULL: new Uint8Array([GS, 0x56, 0x00]),
  
  // Cash drawer - Pin 2 (most common)
  OPEN_DRAWER_PIN2: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0x78]),
  // Cash drawer - Pin 5
  OPEN_DRAWER_PIN5: new Uint8Array([ESC, 0x70, 0x01, 0x19, 0x78]),
  
  // Beep
  BEEP: new Uint8Array([ESC, 0x42, 0x03, 0x02]),
}

// Text encoder for UTF-8
const textEncoder = new TextEncoder()

export function textToBytes(text: string): Uint8Array {
  return textEncoder.encode(text)
}

export function formatLine(text: string, width: number = 48): string {
  if (text.length > width) {
    return text.substring(0, width)
  }
  return text
}

export function formatTwoColumns(left: string, right: string, width: number = 48): string {
  const rightLen = right.length
  const leftLen = width - rightLen - 1
  const truncatedLeft = left.substring(0, leftLen)
  const spaces = " ".repeat(width - truncatedLeft.length - rightLen)
  return truncatedLeft + spaces + right
}

export function separator(char: string = "-", width: number = 48): string {
  return char.repeat(width)
}

// WebUSB Thermal Printer Class
export class ThermalPrinter {
  private device: USBDevice | null = null
  private endpoint: number = 1
  
  constructor() {
    this.device = null
  }
  
  // Check if WebUSB is supported
  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "usb" in navigator
  }
  
  // Request printer access (showAll = true to show all USB devices without filter)
  async connect(showAll: boolean = false): Promise<boolean> {
    if (!ThermalPrinter.isSupported()) {
      throw new Error("WebUSB n'est pas supporté par ce navigateur. Utilisez Chrome ou Edge.")
    }
    
    try {
      // If showAll is true, show all USB devices (useful when printer is not in the filter list)
      if (showAll) {
        this.device = await navigator.usb.requestDevice({
          filters: []  // Empty filter shows all USB devices
        })
      } else {
        // Request USB device - filter for common thermal printer vendors
        // Including POS80 and other generic Chinese thermal printers
        this.device = await navigator.usb.requestDevice({
          filters: [
            // Epson
            { vendorId: 0x04B8 },
            // Star Micronics
            { vendorId: 0x0519 },
            // Citizen
            { vendorId: 0x1D90 },
            // Bixolon
            { vendorId: 0x1504 },
            // Custom/generic thermal printers
            { vendorId: 0x0483 },  // STMicroelectronics
            { vendorId: 0x0416 },  // Winbond
            { vendorId: 0x0DD4 },  // Custom
            { vendorId: 0x154F },  // SNBC
            // POS80 / Generic Chinese printers
            { vendorId: 0x0FE6 },  // ICS Advent (POS80)
            { vendorId: 0x1FC9 },  // NXP (common in POS80)
            { vendorId: 0x0525 },  // Netchip (USB-Serial)
            { vendorId: 0x067B },  // Prolific (USB-Serial)
            { vendorId: 0x10C4 },  // Silicon Labs
            { vendorId: 0x1A86 },  // QinHeng (CH340 - very common in POS80)
            { vendorId: 0x6868 },  // Generic POS printer
            { vendorId: 0x0471 },  // Philips
            { vendorId: 0x04F9 },  // Brother
            { vendorId: 0x20D1 },  // Generic thermal
            { vendorId: 0x28E9 },  // GD Microelectronics
            { vendorId: 0x0B00 },  // SEWOO
            { vendorId: 0x2730 },  // Rongta
            { vendorId: 0x0456 },  // Analog Devices
            { vendorId: 0x0493 },  // MAG Technology
            { vendorId: 0x1659 },  // ShenZhen BSST
            { vendorId: 0x4B43 },  // XPrinter
            { vendorId: 0x0FDE },  // GOOJPRT
          ]
        })
      }
      
      await this.device.open()
      
      // Select configuration and claim interface
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1)
      }
      
      // Find the first interface with a bulk OUT endpoint
      for (const iface of this.device.configuration!.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === "out" && ep.type === "bulk") {
              this.endpoint = ep.endpointNumber
              await this.device.claimInterface(iface.interfaceNumber)
              console.log("[v0] Printer connected:", this.device.productName)
              return true
            }
          }
        }
      }
      
      throw new Error("Aucun endpoint d'impression trouvé")
    } catch (error: any) {
      console.error("[v0] Printer connection error:", error)
      if (error.name === "NotFoundError") {
        throw new Error("Aucune imprimante sélectionnée")
      }
      throw error
    }
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.device !== null && this.device.opened
  }
  
  // Get device info
  getDeviceInfo(): { name: string; vendorId: number; productId: number } | null {
    if (!this.device) return null
    return {
      name: this.device.productName || "Imprimante USB",
      vendorId: this.device.vendorId,
      productId: this.device.productId,
    }
  }
  
  // Disconnect
  async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      await this.device.close()
    }
    this.device = null
  }
  
  // Send raw data to printer
  async sendData(data: Uint8Array): Promise<void> {
    if (!this.device || !this.device.opened) {
      throw new Error("Imprimante non connectée")
    }
    
    try {
      await this.device.transferOut(this.endpoint, data)
    } catch (error) {
      console.error("[v0] Print error:", error)
      throw new Error("Erreur d'envoi à l'imprimante")
    }
  }
  
  // Send multiple commands
  async sendCommands(...commands: Uint8Array[]): Promise<void> {
    const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const cmd of commands) {
      combined.set(cmd, offset)
      offset += cmd.length
    }
    await this.sendData(combined)
  }
  
  // Print text
  async printText(text: string): Promise<void> {
    await this.sendCommands(textToBytes(text), ESCPOS.LINE_FEED)
  }
  
  // Print centered text
  async printCentered(text: string): Promise<void> {
    await this.sendCommands(ESCPOS.ALIGN_CENTER, textToBytes(text), ESCPOS.LINE_FEED, ESCPOS.ALIGN_LEFT)
  }
  
  // Print bold text
  async printBold(text: string): Promise<void> {
    await this.sendCommands(ESCPOS.BOLD_ON, textToBytes(text), ESCPOS.LINE_FEED, ESCPOS.BOLD_OFF)
  }
  
  // Print double size text (for headers)
  async printLarge(text: string): Promise<void> {
    await this.sendCommands(ESCPOS.DOUBLE_SIZE, ESCPOS.ALIGN_CENTER, textToBytes(text), ESCPOS.LINE_FEED, ESCPOS.NORMAL_SIZE, ESCPOS.ALIGN_LEFT)
  }
  
  // Feed paper
  async feedPaper(lines: number = 3): Promise<void> {
    await this.sendData(ESCPOS.FEED_LINES(lines))
  }
  
  // Cut paper
  async cutPaper(full: boolean = false): Promise<void> {
    await this.feedPaper(3)
    await this.sendData(full ? ESCPOS.CUT_FULL : ESCPOS.CUT_PARTIAL)
  }
  
  // Open cash drawer
  async openDrawer(pin: 2 | 5 = 2): Promise<void> {
    if (!this.isConnected()) {
      throw new Error("Imprimante non connectée - impossible d'ouvrir le tiroir")
    }
    await this.sendData(pin === 2 ? ESCPOS.OPEN_DRAWER_PIN2 : ESCPOS.OPEN_DRAWER_PIN5)
  }
  
  // Beep
  async beep(): Promise<void> {
    await this.sendData(ESCPOS.BEEP)
  }
  
  // Initialize printer
  async initialize(): Promise<void> {
    await this.sendData(ESCPOS.INIT)
  }
  
  // Test print
  async testPrint(): Promise<void> {
    await this.initialize()
    
    await this.printLarge("KIFSHOP PASTRY")
    await this.printCentered("Test Imprimante")
    await this.printText(separator("="))
    await this.printText(`Date: ${new Date().toLocaleString("fr-TN")}`)
    await this.printText(separator("-"))
    await this.printCentered("")
    await this.printCentered("Imprimante configuree avec succes!")
    await this.printCentered("")
    await this.cutPaper()
  }
  
  // Print a complete receipt
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
    date: Date
  }): Promise<void> {
    await this.initialize()
    
    // Header
    await this.printLarge(receipt.storeName)
    if (receipt.storeAddress) {
      await this.printCentered(receipt.storeAddress)
    }
    if (receipt.storePhone) {
      await this.printCentered(`Tel: ${receipt.storePhone}`)
    }
    
    await this.printText(separator("="))
    
    // Transaction info
    await this.printText(`Date: ${receipt.date.toLocaleDateString("fr-TN")} ${receipt.date.toLocaleTimeString("fr-TN")}`)
    await this.printText(`Caissier: ${receipt.cashierName}`)
    await this.printText(`N°: ${receipt.transactionId}`)
    
    await this.printText(separator("-"))
    
    // Items
    for (const item of receipt.items) {
      const itemTotal = (item.qty * item.price).toFixed(3)
      await this.printText(formatTwoColumns(`${item.qty}x ${item.name}`, `${itemTotal} TND`))
    }
    
    await this.printText(separator("-"))
    
    // Totals
    await this.printText(formatTwoColumns("Sous-total:", `${receipt.subtotal.toFixed(3)} TND`))
    
    if (receipt.discount && receipt.discount > 0) {
      await this.printText(formatTwoColumns("Remise:", `-${receipt.discount.toFixed(3)} TND`))
    }
    
    await this.sendCommands(ESCPOS.DOUBLE_HEIGHT, ESCPOS.BOLD_ON)
    await this.printText(formatTwoColumns("TOTAL:", `${receipt.total.toFixed(3)} TND`))
    await this.sendCommands(ESCPOS.NORMAL_SIZE, ESCPOS.BOLD_OFF)
    
    await this.printText(separator("-"))
    
    // Payment info
    await this.printText(`Paiement: ${receipt.paymentMethod}`)
    if (receipt.amountPaid) {
      await this.printText(formatTwoColumns("Recu:", `${receipt.amountPaid.toFixed(3)} TND`))
    }
    if (receipt.change && receipt.change > 0) {
      await this.printText(formatTwoColumns("Monnaie:", `${receipt.change.toFixed(3)} TND`))
    }
    
    await this.printText(separator("="))
    
    // Footer
    await this.printCentered("Merci de votre visite!")
    await this.printCentered("A bientot!")
    
    // Cut paper
    await this.cutPaper()
  }
}

// Singleton instance
let printerInstance: ThermalPrinter | null = null

export function getPrinter(): ThermalPrinter {
  if (!printerInstance) {
    printerInstance = new ThermalPrinter()
  }
  return printerInstance
}
