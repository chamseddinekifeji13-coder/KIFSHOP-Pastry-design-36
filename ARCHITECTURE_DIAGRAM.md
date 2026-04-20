# KIFSHOP QZ Tray - System Architecture Diagram

## Overall System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER TRANSACTION                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    KIFSHOP POS Interface                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Search & Select Products                               │ │
│  │ 2. Add Items to Cart                                      │ │
│  │ 3. Apply Discounts                                        │ │
│  │ 4. Enter Payment Amount                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Components: treasury-pos-view.tsx, payment-numpad.tsx          │
│  Framework: React 19 + TypeScript                              │
│  Styling: TailwindCSS (responsive)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             Payment Processing & Receipt Generation             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Validate payment amount                                │ │
│  │ 2. Calculate change (for cash)                            │ │
│  │ 3. Build receipt data structure                           │ │
│  │ 4. Save transaction to database                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  API Route: app/api/treasury/pos-sale (saves to Supabase)      │
│  Database: transactions, cashier_closures tables               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           Printer Mode Selection (Fallback Chain)               │
│                                                                  │
│  ┌─────────────────┐      ┌──────────────────┐                │
│  │ QZ Tray Enabled?│      │ Network Enabled? │                │
│  │ & Connected?    │ NO  │ & IP Configured? │ NO  ...        │
│  └────────┬────────┘    └─────────┬──────────┘                │
│           │ YES                    │ YES                       │
│           ▼                        ▼                           │
│       USE QZ TRAY            USE NETWORK TCP                   │
│       (Primary)              (First Fallback)                  │
│                                                                  │
│  Priority: QZ Tray > Network > USB > Windows > Bridge          │
└─────────────────────────────────────────────────────────────────┘
```

## QZ Tray Integration Path (Detailed)

```
┌──────────────────────────────────────────────────────────────┐
│          KIFSHOP Browser Application (Next.js)              │
│                                                              │
│  treasury-pos-view.tsx                                      │
│  ├─ Product Selection                                       │
│  ├─ Cart Management                                         │
│  ├─ Payment Processing                                      │
│  └─ Receipt Printing Logic                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                    PAYMENT CONFIRMED
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│        Build Receipt Data Structure                          │
│                                                              │
│  {                                                           │
│    storeName: "HE LES SAVEURS"                              │
│    cashierName: "NOURHENE"                                  │
│    items: [{ name, qty, price }, ...]                      │
│    total: 5000,                    // in millimes (3 decimals)│
│    paymentMethod: "Espèces"                                 │
│    amountPaid: 10000                                        │
│    change: 5000                                             │
│    transactionId: "TXN-2026-03-14-001"                     │
│  }                                                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│     getQZTrayService().printReceipt(receiptData)             │
│                                                              │
│     OR                                                       │
│                                                              │
│     getQZTrayService().printAndOpenDrawer(receiptData)      │
│     (for cash payments)                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│       lib/qz-tray-service.ts (Core Service)                  │
│                                                              │
│  QZTrayService                                              │
│  ├─ state { connected, printers, selectedPrinter }          │
│  ├─ connect()          → WebSocket to QZ Tray              │
│  ├─ isConnected()      → Check connection status           │
│  ├─ loadPrinters()     → Discover available printers       │
│  ├─ selectPrinter()    → Save to localStorage              │
│  ├─ buildReceiptData() → Format receipt as hex strings     │
│  ├─ printReceipt()     → Send to printer                    │
│  ├─ openDrawer()       → Send drawer command               │
│  └─ printAndOpenDrawer() → Both in one call                │
└────────────┬────────────────────────────────────────────────┘
             │
     Convert Receipt to ESC/POS Hex Commands:
     ├─ INIT (1B40)
     ├─ ALIGN_CENTER (1B6101)
     ├─ DOUBLE_SIZE (1B2111)
     ├─ Text data (UTF-8 → hex)
     ├─ LINE_FEED (0A)
     ├─ ...item data...
     ├─ ALIGN_LEFT (1B6100)
     ├─ ...totals...
     ├─ CUT_PARTIAL (1D5601)
     └─ OPEN_DRAWER_PIN2 (1B7000197A) [if cash payment]
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│        WebSocket Communication (Port 8181)                   │
│                                                              │
│  this.qz.websocket.connect()                               │
│  ↓                                                          │
│  this.qz.printers.find()                                   │
│  ↓                                                          │
│  this.qz.print(config, [{                                  │
│    type: "raw",                                            │
│    format: "hex",                                          │
│    data: "1B40..."  [all hex commands joined]             │
│  }])                                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             │ QZ Tray Desktop App
             │ (Free application on user's computer)
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│           QZ Tray Application                                │
│                                                              │
│  ├─ Receive WebSocket commands                              │
│  ├─ Translate hex → printer protocol                        │
│  └─ Send to appropriate printer                             │
└────────────┬────────────────────────────────────────────────┘
             │
      ┌──────┴──────────────────┐
      │                         │
      ▼ (USB or Network)        ▼ (Network only)
      │                         │
      ▼                         ▼
┌──────────────┐        ┌──────────────────┐
│ POS80 Printer│        │ POS80 Printer    │
│  (USB)       │        │ (Network IP)     │
│              │        │ (Port 9100)      │
└──────────────┘        └──────────────────┘
      │                         │
      ├─ Receipt Printing ─────►├─ Receipt Printing
      └─ Drawer Opening ───────►└─ Drawer Opening
```

## Fallback Chain (If QZ Tray Fails)

```
PAYMENT CONFIRMED
      │
      ▼
Is QZ Tray Connected?
      │
  ┌───┴───┐
  │ YES   │ NO
  ▼       ▼
USE     Is Network Printer
QZTRAY  Configured?
        │
    ┌───┴───┐
    │ YES   │ NO
    ▼       ▼
   USE    Is USB Device
  NETWORK Connected?
  DIRECT  │
  TCP     ├───┐
  9100    │ YES │ NO
          ▼     ▼
         USE   Show Windows
         USB   Print Dialog
         WEBUSB (Fallback)
```

## Component Hierarchy

```
app/(dashboard)/page.tsx
└─ TreasuryView
   │
   ├─ TreasuryPOSView (Main POS Interface)
   │  ├─ ProductSearchAdvanced
   │  │  └─ Product Grid (scrollable)
   │  │
   │  ├─ Cart Section
   │  │  └─ CartItems (add/remove/qty)
   │  │
   │  ├─ PaymentNumpad
   │  │  ├─ Number buttons (0-9)
   │  │  ├─ Quick amount buttons
   │  │  └─ Confirm payment
   │  │
   │  ├─ DiscountManager
   │  │  └─ Percentage/Fixed discount
   │  │
   │  ├─ SalesHistoryPanel
   │  │  └─ Recent receipts
   │  │
   │  └─ PrinterSettings (Dialog)
   │     ├─ QZ Tray Tab (Active)
   │     ├─ Windows Tab (Fallback)
   │     ├─ USB Tab (Fallback)
   │     └─ Network Tab (Fallback)
   │
   ├─ TreasuryDesktopView (Alternative layout)
   └─ Sidebar + Navigation
```

## Data Flow for Printing

```
RECEIPT DATA
    │
    ├─ Store Info
    │  ├─ Name
    │  ├─ Address (optional)
    │  └─ Phone (optional)
    │
    ├─ Transaction Info
    │  ├─ Date/Time
    │  ├─ Cashier Name
    │  └─ Transaction ID
    │
    ├─ Items Array
    │  ├─ Product Name
    │  ├─ Quantity
    │  └─ Price (in millimes)
    │
    ├─ Totals
    │  ├─ Subtotal
    │  ├─ Discount (optional)
    │  └─ Total
    │
    ├─ Payment Info
    │  ├─ Method (Espèces/Carte/Chèque)
    │  ├─ Amount Paid
    │  └─ Change
    │
    └─ Footer Message
       └─ "Merci de votre visite!"
            │
            ▼
      formatTwoColumns()  ← Format left + right aligned text
      textToHex()         ← Convert UTF-8 to hex for printer
      separator()         ← Create divider lines
            │
            ▼
      ESC/POS HEX STRING ARRAY
      ["1B40", "1B6101", "48656C6C6F", ...]
            │
            ▼
      qz.print(config, [{
        type: "raw",
        format: "hex",
        data: "1B40..."
      }])
            │
            ▼
      THERMAL PRINTER OUTPUT
```

## Storage & State Management

```
BROWSER SESSION
│
├─ React State (usestate)
│  ├─ cartItems: CartItem[]
│  ├─ paymentAmount: number
│  ├─ selectedPrinter: string
│  └─ isConnected: boolean
│
├─ localStorage (Persistent)
│  ├─ "qz-printer-name" → Selected printer
│  ├─ "printer-mode" → "qz-tray" | "network" | etc
│  ├─ "printer-ip" → Network printer IP
│  ├─ "printer-port" → Network printer port (9100)
│  └─ [other user preferences]
│
├─ QZTrayService (Singleton)
│  ├─ state: QZState
│  │  ├─ connected: boolean
│  │  ├─ printers: string[]
│  │  ├─ selectedPrinter: string | null
│  │  └─ version: string | null
│  │
│  └─ subscribers: Set<Listener>
│     └─ Push state updates to listeners
│
└─ SWR Cache (API Data)
   ├─ useFinishedProducts() → Product list
   ├─ useTransactions() → Sales history
   └─ Auto-revalidate on focus
```

## Error Handling Flow

```
Print Request
    │
    ▼
Try Block
    │
    ├─ Check: Is QZ Tray connected?
    ├─ Check: Is printer selected?
    ├─ Build receipt data
    ├─ Call qz.print()
    │
    └─ If any error:
            │
            ▼
        Catch Block
            │
            ├─ Log error to console
            ├─ Show toast notification
            │  "Erreur impression: [message]"
            │
            ├─ Check error type:
            │  ├─ "Not connected" → Try fallback mode
            │  ├─ "Timeout" → Retry after 1s
            │  ├─ "Printer offline" → Check network
            │  └─ Other → Show to user
            │
            └─ Fallback Options:
               ├─ 1. Network printer TCP
               ├─ 2. USB WebUSB
               ├─ 3. Windows print dialog
               └─ 4. Fail gracefully with error message
```

## Network Architecture

```
LOCAL NETWORK
│
├─ POS Computer (Windows)
│  │
│  ├─ Browser (KIFSHOP App)
│  │  └─ localhost:3000
│  │
│  ├─ QZ Tray App
│  │  └─ localhost:8181 (WebSocket)
│  │
│  └─ Print Bridge Server (Optional)
│     └─ localhost:7731 (Express HTTP)
│
├─ POS80 Printer (Network)
│  └─ 192.168.x.x:9100 (TCP raw ESC/POS)
│
└─ Internet (Optional)
   └─ Vercel (KIFSHOP Backend)
      └─ api.kifshop.com (Supabase)
         └─ Database transactions
```

## Printer Command Sequence

```
Receipt Print Sequence:

1. RESET           → Clear printer buffer
2. CENTER_ALIGN    → Center text
3. DOUBLE_SIZE     → Large header
4. BOLD_ON         → Bold text
5. [STORE_NAME]    → Print store name
6. BOLD_OFF        → Normal text
7. NORMAL_SIZE     → Regular size
8. [ADDRESS]       → Print address (if provided)
9. CENTER_ALIGN    → Center separator
10. [SEPARATOR]    → Print divider line
11. LEFT_ALIGN     → Align left
12. [TRANS_INFO]   → Date, cashier, ID
13. [SEPARATOR]    → Divider
14. [ITEMS]        → Product lines (qty x name = price)
15. [SEPARATOR]    → Divider
16. BOLD_ON        → Bold total
17. DOUBLE_HEIGHT  → Large total
18. [TOTAL]        → Print total amount
19. NORMAL_SIZE    → Reset formatting
20. [PAYMENT_INFO] → Method, amount paid, change
21. [SEPARATOR]    → Final divider
22. CENTER_ALIGN   → Center footer
23. [FOOTER_MSG]   → "Merci de votre visite!"
24. LEFT_ALIGN     → Reset
25. [BLANK_LINES]  → Feed paper
26. CUT_PARTIAL    → Tear line
27. [OPTIONAL]     → OPEN_DRAWER (for cash)

Total bytes: ~1-2KB
Transmission time: <100ms
```

## QZ Tray WebSocket Protocol

```
┌─────────────────────────────────────────┐
│      Browser Connection to QZ Tray      │
└─────────────────────────────────────────┘
             ws://localhost:8181

1. CERTIFICATE SETUP
   ├─ this.qz.security.setCertificatePromise()
   ├─ this.qz.security.setSignaturePromise()
   └─ (Empty for localhost - trusted)

2. WEBSOCKET CONNECT
   └─ this.qz.websocket.connect()
      ├─ Resolves when connected
      ├─ Rejects if timeout (5s)
      └─ Check: isActive() before use

3. DISCOVER PRINTERS
   └─ this.qz.printers.find()
      ├─ Returns: ["Printer 1", "Printer 2"]
      ├─ Filters: Only ESC/POS compatible
      └─ Caches for 30s

4. PRINT JOB
   ├─ Create config: this.qz.configs.create(printerName)
   ├─ Build data: [{ type, format, data }]
   ├─ Send: this.qz.print(config, data)
   ├─ Resolves when sent
   └─ Printer receives within <1s

5. KEEPALIVE
   └─ WebSocket auto-maintains connection
      ├─ Auto-reconnect on disconnect
      ├─ Heartbeat every 30s (automatic)
      └─ Transparent to application

6. DISCONNECT (Optional)
   └─ this.qz.websocket.disconnect()
      └─ Graceful cleanup
```

---

This diagram shows the complete flow from customer payment to thermal printer output through QZ Tray integration.
