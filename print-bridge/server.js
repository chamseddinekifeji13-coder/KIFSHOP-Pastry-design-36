/**
 * KIFSHOP Print Bridge - Serveur local pour impression POS80 + tiroir-caisse
 * 
 * Ce serveur tourne en arrière-plan sur la caisse Windows.
 * Il reçoit les commandes de l'application KIFSHOP via HTTP
 * et envoie les données ESC/POS directement à l'imprimante POS80.
 * 
 * Usage: node server.js
 * Port: 7731
 */

const express = require('express')
const cors = require('cors')
const { exec, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const app = express()
const PORT = 7731

// ESC/POS commands
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

const ESCPOS = {
  INIT: Buffer.from([ESC, 0x40]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: Buffer.from([GS, 0x21, 0x01]),
  DOUBLE_SIZE: Buffer.from([GS, 0x21, 0x11]),
  NORMAL_SIZE: Buffer.from([GS, 0x21, 0x00]),
  LINE_FEED: Buffer.from([LF]),
  FEED_3: Buffer.from([ESC, 0x64, 3]),
  CUT_PARTIAL: Buffer.from([GS, 0x56, 0x01]),
  OPEN_DRAWER_PIN2: Buffer.from([ESC, 0x70, 0x00, 0x19, 0x78]),
  OPEN_DRAWER_PIN5: Buffer.from([ESC, 0x70, 0x01, 0x19, 0x78]),
}

// Enable CORS for the app (only localhost origins)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost, vercel app, and no origin (direct)
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') ||
        origin.includes('vercel.app') ||
        origin.includes('kifshop') ||
        origin.includes('kifgedexpert')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))
app.use(express.json({ limit: '10mb' }))

// ==============================
// Helper functions
// ==============================

function text(str) {
  // Convert to Windows-1252 for thermal printers (better French char support)
  return Buffer.from(str + '\n', 'latin1')
}

function sep(char = '-', width = 42) {
  return text(char.repeat(width))
}

function twoCol(left, right, width = 42) {
  const r = String(right)
  const l = String(left).substring(0, width - r.length - 1)
  const spaces = ' '.repeat(Math.max(1, width - l.length - r.length))
  return text(l + spaces + r)
}

// Send ESC/POS data to printer via Windows raw printing
function sendToPrinter(printerName, data, callback) {
  const tmpFile = path.join(os.tmpdir(), `kifshop_print_${Date.now()}.bin`)
  
  try {
    fs.writeFileSync(tmpFile, data)
    
    // Use Windows PRINT command to send raw data to printer
    // This works with any Windows printer driver
    const cmd = printerName 
      ? `copy /b "${tmpFile}" "\\\\%COMPUTERNAME%\\${printerName}"`
      : `type "${tmpFile}" > PRN`
    
    // Alternative: use PowerShell for more reliable raw printing
    const psCmd = printerName
      ? `$printerName = "${printerName}"; $bytes = [System.IO.File]::ReadAllBytes("${tmpFile.replace(/\\/g, '\\\\')}"); $printer = new-object System.Drawing.Printing.PrintDocument; Add-Type -AssemblyName System.Drawing; $port = (Get-Printer -Name $printerName).PortName; $stream = [System.IO.File]::OpenRead("${tmpFile.replace(/\\/g, '\\\\')}"); try { $rawData = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length); [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $rawData, $bytes.Length); } finally { $stream.Close() }`
      : null

    // Use the simplest reliable method: copy command to printer port
    exec(`copy /b "${tmpFile}" PRN 2>nul || copy /b "${tmpFile}" LPT1 2>nul`, 
      { shell: 'cmd.exe', timeout: 5000 },
      (err, stdout, stderr) => {
        fs.unlink(tmpFile, () => {})
        if (err) {
          // Try PowerShell method as fallback
          if (printerName) {
            const psScript = `
              [System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null
              $bytes = [System.IO.File]::ReadAllBytes('${tmpFile.replace(/\\/g, '\\\\')}')
              $printerSettings = New-Object System.Drawing.Printing.PrinterSettings
              $printerSettings.PrinterName = '${printerName}'
              $port = $printerSettings.PrinterName
              $handle = [System.Runtime.InteropServices.SafeHandle]::Zero
              $hPrinter = [IntPtr]::Zero
              Add-Type -TypeDefinition @"
              using System;using System.Runtime.InteropServices;
              public class RawPrint {
                [DllImport("winspool.drv",EntryPoint="OpenPrinterA",SetLastError=true,CharSet=CharSet.Ansi)]
                public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
                [DllImport("winspool.drv",EntryPoint="StartDocPrinterA",SetLastError=true,CharSet=CharSet.Ansi)]
                public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 Level, [In,MarshalAs(UnmanagedType.LPStruct)] DOCINFO pDocInfo);
                [DllImport("winspool.drv",EntryPoint="EndDocPrinter",SetLastError=true)]
                public static extern bool EndDocPrinter(IntPtr hPrinter);
                [DllImport("winspool.drv",EntryPoint="StartPagePrinter",SetLastError=true)]
                public static extern bool StartPagePrinter(IntPtr hPrinter);
                [DllImport("winspool.drv",EntryPoint="EndPagePrinter",SetLastError=true)]
                public static extern bool EndPagePrinter(IntPtr hPrinter);
                [DllImport("winspool.drv",EntryPoint="WritePrinter",SetLastError=true)]
                public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
                [DllImport("winspool.drv",EntryPoint="ClosePrinter",SetLastError=true)]
                public static extern bool ClosePrinter(IntPtr hPrinter);
                [StructLayout(LayoutKind.Sequential)] public class DOCINFO { [MarshalAs(UnmanagedType.LPStr)] public string pDocName; [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPStr)] public string pDataType; }
              }
"@
              $hPrinter = [IntPtr]::Zero
              [RawPrint]::OpenPrinter('${printerName}', [ref]$hPrinter, [IntPtr]::Zero) | Out-Null
              $di = New-Object RawPrint+DOCINFO; $di.pDocName = "KIFSHOP"; $di.pOutputFile = $null; $di.pDataType = "RAW"
              [RawPrint]::StartDocPrinter($hPrinter, 1, $di) | Out-Null
              [RawPrint]::StartPagePrinter($hPrinter) | Out-Null
              $ptr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
              [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
              $written = 0
              [RawPrint]::WritePrinter($hPrinter, $ptr, $bytes.Length, [ref]$written) | Out-Null
              [System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
              [RawPrint]::EndPagePrinter($hPrinter) | Out-Null
              [RawPrint]::EndDocPrinter($hPrinter) | Out-Null
              [RawPrint]::ClosePrinter($hPrinter) | Out-Null
            `.trim()
            
            const tmpPs = path.join(os.tmpdir(), `kifshop_print_${Date.now()}.ps1`)
            fs.writeFileSync(tmpFile, data)
            fs.writeFileSync(tmpPs, psScript)
            
            exec(`powershell.exe -ExecutionPolicy Bypass -NonInteractive -File "${tmpPs}"`,
              { timeout: 10000 },
              (err2, stdout2, stderr2) => {
                fs.unlink(tmpPs, () => {})
                fs.unlink(tmpFile, () => {})
                callback(err2 ? new Error('Print failed: ' + (stderr2 || err2.message)) : null)
              }
            )
          } else {
            callback(new Error('Print failed: ' + (stderr || err.message)))
          }
        } else {
          callback(null)
        }
      }
    )
  } catch (err) {
    fs.unlink(tmpFile, () => {})
    callback(err)
  }
}

// Send ESC/POS via PowerShell WinAPI (most reliable method)
function sendRawToPrinter(printerName, dataBuffer, callback) {
  const tmpFile = path.join(os.tmpdir(), `kfp_${Date.now()}.bin`)
  
  try {
    fs.writeFileSync(tmpFile, dataBuffer)
    
    const psScript = `
$printerName = "${printerName.replace(/'/g, "''")}"
$filePath = "${tmpFile.replace(/\\/g, '\\\\')}"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public class RawPrint {
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Ansi)]
  public class DOCINFO { public int cbSize=sizeof(int)*3+IntPtr.Size*3; public IntPtr pDocName; public IntPtr pOutputFile; public IntPtr pDataType; }
  [DllImport("winspool.drv",CharSet=CharSet.Ansi)] public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);
  [DllImport("winspool.drv")] public static extern int StartDocPrinterA(IntPtr h,int l,IntPtr d);
  [DllImport("winspool.drv")] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv")] public static extern bool WritePrinter(IntPtr h,IntPtr b,int n,out int w);
  [DllImport("winspool.drv")] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv")] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv")] public static extern bool ClosePrinter(IntPtr h);
}
"@ -ErrorAction SilentlyContinue
$h = [IntPtr]::Zero
[RawPrint]::OpenPrinter($printerName, [ref]$h, [IntPtr]::Zero) | Out-Null
$docNamePtr = [System.Runtime.InteropServices.Marshal]::StringToHGlobalAnsi("KIFSHOP")
$dataTypePtr = [System.Runtime.InteropServices.Marshal]::StringToHGlobalAnsi("RAW")
$di = [System.Runtime.InteropServices.Marshal]::AllocHGlobal(24)
[System.Runtime.InteropServices.Marshal]::WriteInt32($di, 0, 24)
[System.Runtime.InteropServices.Marshal]::WriteIntPtr($di, 4, $docNamePtr)
[System.Runtime.InteropServices.Marshal]::WriteIntPtr($di, 8+[IntPtr]::Size, $dataTypePtr)
[RawPrint]::StartDocPrinterA($h, 1, $di) | Out-Null
[RawPrint]::StartPagePrinter($h) | Out-Null
$ptr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
$w = 0
[RawPrint]::WritePrinter($h, $ptr, $bytes.Length, [ref]$w) | Out-Null
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($docNamePtr)
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($dataTypePtr)
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($di)
[RawPrint]::EndPagePrinter($h) | Out-Null
[RawPrint]::EndDocPrinter($h) | Out-Null
[RawPrint]::ClosePrinter($h) | Out-Null
Write-Output "OK:$w"
`.trim()

    const tmpPs = path.join(os.tmpdir(), `kfp_${Date.now()}.ps1`)
    fs.writeFileSync(tmpPs, psScript, 'utf8')

    exec(`powershell.exe -ExecutionPolicy Bypass -NonInteractive -File "${tmpPs}"`,
      { timeout: 10000, shell: false },
      (err, stdout, stderr) => {
        fs.unlink(tmpPs, () => {})
        fs.unlink(tmpFile, () => {})
        if (err) {
          callback(new Error('Impression echouee: ' + (stderr || err.message)))
        } else if (stdout.includes('OK:')) {
          callback(null)
        } else {
          callback(new Error('Impression: reponse inattendue - ' + stdout))
        }
      }
    )
  } catch (err) {
    fs.unlink(tmpFile, () => {})
    callback(err)
  }
}

// Get list of printers from Windows
function getWindowsPrinters() {
  try {
    const result = execSync(
      'powershell.exe -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json"',
      { timeout: 5000, encoding: 'utf8' }
    )
    const parsed = JSON.parse(result.trim())
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (e) {
    return []
  }
}

// Generate ESC/POS receipt buffer
function buildReceiptBuffer(data) {
  const parts = []
  
  parts.push(ESCPOS.INIT)
  parts.push(ESCPOS.ALIGN_CENTER)
  parts.push(ESCPOS.DOUBLE_SIZE)
  parts.push(ESCPOS.BOLD_ON)
  parts.push(text(data.storeName || 'KIFSHOP PASTRY'))
  parts.push(ESCPOS.NORMAL_SIZE)
  parts.push(ESCPOS.BOLD_OFF)
  
  if (data.storeAddress) parts.push(text(data.storeAddress))
  if (data.storePhone) parts.push(text('Tel: ' + data.storePhone))
  
  parts.push(sep('='))
  parts.push(ESCPOS.ALIGN_LEFT)
  parts.push(text(`Date: ${new Date().toLocaleString('fr-TN')}`))
  parts.push(text(`Caissier: ${data.cashierName || 'Caissier'}`))
  parts.push(text(`N Ticket: ${data.transactionId || ''}`))
  parts.push(sep('-'))
  
  // Items
  for (const item of (data.items || [])) {
    const itemTotal = ((item.qty || item.quantity || 1) * (item.price || 0)).toFixed(3)
    parts.push(twoCol(`${item.qty || item.quantity}x ${item.name}`, itemTotal + ' TND'))
  }
  
  parts.push(sep('-'))
  
  // Sous-total
  if (data.subtotal !== undefined && data.subtotal !== data.total) {
    parts.push(twoCol('Sous-total:', data.subtotal.toFixed(3) + ' TND'))
  }
  
  // Discount
  if (data.discount && data.discount > 0) {
    parts.push(twoCol('Remise:', '-' + data.discount.toFixed(3) + ' TND'))
  }
  
  // Total - big and bold
  parts.push(ESCPOS.BOLD_ON)
  parts.push(ESCPOS.DOUBLE_HEIGHT)
  parts.push(twoCol('TOTAL:', (data.total || 0).toFixed(3) + ' TND'))
  parts.push(ESCPOS.NORMAL_SIZE)
  parts.push(ESCPOS.BOLD_OFF)
  
  parts.push(sep('-'))
  
  // Payment
  parts.push(text(`Paiement: ${data.paymentMethod || ''}`))
  if (data.amountPaid) {
    parts.push(twoCol('Recu:', data.amountPaid.toFixed(3) + ' TND'))
  }
  if (data.change && data.change > 0) {
    parts.push(twoCol('Monnaie:', data.change.toFixed(3) + ' TND'))
  }
  
  parts.push(sep('='))
  parts.push(ESCPOS.ALIGN_CENTER)
  parts.push(text('Merci de votre visite!'))
  parts.push(text('A bientot!'))
  
  // Feed and cut
  parts.push(ESCPOS.FEED_3)
  parts.push(ESCPOS.CUT_PARTIAL)
  
  return Buffer.concat(parts)
}

// ==============================
// API Routes
// ==============================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    bridge: 'KIFSHOP Print Bridge',
    platform: process.platform 
  })
})

// List available printers
app.get('/printers', (req, res) => {
  const printers = getWindowsPrinters()
  res.json({ printers })
})

// Main print endpoint
app.post('/print', (req, res) => {
  const { action, printerName, data } = req.body

  console.log(`[Bridge] Action: ${action}, Printer: ${printerName || 'default'}`)

  if (!action) {
    return res.status(400).json({ success: false, error: 'Action requise' })
  }

  let buffer

  switch (action) {
    case 'open_drawer':
      buffer = Buffer.concat([ESCPOS.INIT, ESCPOS.OPEN_DRAWER_PIN2])
      break

    case 'open_drawer_pin5':
      buffer = Buffer.concat([ESCPOS.INIT, ESCPOS.OPEN_DRAWER_PIN5])
      break

    case 'print_receipt':
      try {
        buffer = buildReceiptBuffer(data || {})
      } catch (err) {
        return res.status(500).json({ success: false, error: 'Erreur construction ticket: ' + err.message })
      }
      break

    case 'print_and_open_drawer':
      try {
        const receipt = buildReceiptBuffer(data || {})
        // Open drawer after receipt (drawer opens as part of receipt print)
        buffer = Buffer.concat([receipt, ESCPOS.OPEN_DRAWER_PIN2])
      } catch (err) {
        return res.status(500).json({ success: false, error: 'Erreur: ' + err.message })
      }
      break

    case 'test_print':
      buffer = Buffer.concat([
        ESCPOS.INIT,
        ESCPOS.ALIGN_CENTER,
        ESCPOS.DOUBLE_SIZE,
        ESCPOS.BOLD_ON,
        text('KIFSHOP PASTRY'),
        ESCPOS.NORMAL_SIZE,
        ESCPOS.BOLD_OFF,
        text('Test Imprimante Bridge'),
        sep('='),
        ESCPOS.ALIGN_LEFT,
        text('Date: ' + new Date().toLocaleString('fr-TN')),
        text('Bridge: localhost:' + PORT),
        text('Imprimante: ' + (printerName || 'defaut')),
        sep('='),
        ESCPOS.ALIGN_CENTER,
        text('Impression Bridge OK!'),
        ESCPOS.FEED_3,
        ESCPOS.CUT_PARTIAL,
      ])
      break

    default:
      return res.status(400).json({ success: false, error: 'Action inconnue: ' + action })
  }

  if (!printerName) {
    return res.status(400).json({ success: false, error: 'Nom imprimante requis (printerName)' })
  }

  sendRawToPrinter(printerName, buffer, (err) => {
    if (err) {
      console.error('[Bridge] Error:', err.message)
      return res.status(500).json({ success: false, error: err.message })
    }
    console.log(`[Bridge] Success: ${action}`)
    res.json({ success: true, action, printer: printerName })
  })
})

// ==============================
// Start server
// ==============================
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n========================================`)
  console.log(`  KIFSHOP Print Bridge`)
  console.log(`  Port: ${PORT}`)
  console.log(`  URL: http://localhost:${PORT}`)
  console.log(`========================================`)
  console.log(`  Pret pour recevoir les commandes...`)
  console.log(`  Appuyez CTRL+C pour arreter\n`)
})
