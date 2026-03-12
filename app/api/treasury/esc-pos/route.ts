import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import * as net from 'net'

// ESC/POS Commands for cash drawer
const ESC_COMMANDS = {
  // Open drawer: ESC p m t1 t2
  OPEN_DRAWER: Buffer.from([0x1b, 0x70, 0x00, 0x32, 0x00]),
  
  // Print mode
  RESET: Buffer.from([0x1b, 0x40]),
  
  // Line feed
  LF: Buffer.from([0x0a]),
  
  // Center align
  CENTER: Buffer.from([0x1b, 0x61, 0x01]),
  
  // Left align
  LEFT: Buffer.from([0x1b, 0x61, 0x00]),
  
  // Bold on/off
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),
  
  // Paper cut
  CUT: Buffer.from([0x1d, 0x56, 0x01]),
}

function generateTestPrint(): Buffer {
  const parts: Buffer[] = []
  parts.push(ESC_COMMANDS.RESET)
  parts.push(ESC_COMMANDS.CENTER)
  parts.push(Buffer.from('================================\n'))
  parts.push(ESC_COMMANDS.BOLD_ON)
  parts.push(Buffer.from('KIFSHOP PASTRY\n'))
  parts.push(ESC_COMMANDS.BOLD_OFF)
  parts.push(Buffer.from('Test Imprimante\n'))
  parts.push(Buffer.from('================================\n'))
  parts.push(ESC_COMMANDS.LEFT)
  parts.push(Buffer.from('Date: ' + new Date().toLocaleString('fr-TN') + '\n'))
  parts.push(Buffer.from('--------------------------------\n'))
  parts.push(Buffer.from('\n'))
  parts.push(ESC_COMMANDS.CENTER)
  parts.push(Buffer.from('Imprimante configuree avec succes!\n'))
  parts.push(Buffer.from('\n\n\n'))
  parts.push(ESC_COMMANDS.CUT)
  
  return Buffer.concat(parts)
}

function generateReceipt(data: {
  items: Array<{ name: string; qty: number; price: number }>
  total: number
  cashierName: string
  paymentMethod?: string
  amountPaid?: number
  change?: number
}): Buffer {
  const parts: Buffer[] = []
  parts.push(ESC_COMMANDS.RESET)
  
  // Header
  parts.push(ESC_COMMANDS.CENTER)
  parts.push(Buffer.from('================================\n'))
  parts.push(ESC_COMMANDS.BOLD_ON)
  parts.push(Buffer.from('KIFSHOP PASTRY\n'))
  parts.push(ESC_COMMANDS.BOLD_OFF)
  parts.push(Buffer.from('================================\n'))
  
  // Info
  parts.push(ESC_COMMANDS.LEFT)
  parts.push(Buffer.from('Date: ' + new Date().toLocaleString('fr-TN') + '\n'))
  parts.push(Buffer.from('Caissier: ' + data.cashierName + '\n'))
  parts.push(Buffer.from('--------------------------------\n'))
  
  // Items
  for (const item of data.items) {
    const itemTotal = (item.qty * item.price).toFixed(3)
    const line = `${item.qty}x ${item.name.substring(0, 20).padEnd(20)} ${itemTotal}\n`
    parts.push(Buffer.from(line))
  }
  
  parts.push(Buffer.from('--------------------------------\n'))
  
  // Total
  parts.push(ESC_COMMANDS.BOLD_ON)
  parts.push(Buffer.from('TOTAL: ' + data.total.toFixed(3) + ' TND\n'))
  parts.push(ESC_COMMANDS.BOLD_OFF)
  
  // Payment info
  if (data.paymentMethod) {
    parts.push(Buffer.from('Paiement: ' + data.paymentMethod + '\n'))
  }
  if (data.amountPaid) {
    parts.push(Buffer.from('Recu: ' + data.amountPaid.toFixed(3) + ' TND\n'))
  }
  if (data.change && data.change > 0) {
    parts.push(Buffer.from('Monnaie: ' + data.change.toFixed(3) + ' TND\n'))
  }
  
  parts.push(Buffer.from('================================\n'))
  parts.push(ESC_COMMANDS.CENTER)
  parts.push(Buffer.from('Merci de votre visite!\n'))
  parts.push(Buffer.from('\n\n\n'))
  parts.push(ESC_COMMANDS.CUT)
  
  return Buffer.concat(parts)
}

function generateZReport(closure: {
  closure_date: string
  transactions_count: number
  collections_count: number
  opening_balance: number
  total_sales: number
  total_collections: number
  total_cash_income: number
  total_card_income: number
  total_expenses: number
  expected_closing: number
  actual_closing: number
  difference_reason?: string
}, managerName: string): Buffer {
  const parts: Buffer[] = []
  parts.push(ESC_COMMANDS.RESET)
  
  // Header
  parts.push(ESC_COMMANDS.CENTER)
  parts.push(Buffer.from('================================\n'))
  parts.push(ESC_COMMANDS.BOLD_ON)
  parts.push(Buffer.from('RAPPORT DE CAISSE (Z)\n'))
  parts.push(ESC_COMMANDS.BOLD_OFF)
  parts.push(Buffer.from('================================\n'))
  
  // Info
  parts.push(ESC_COMMANDS.LEFT)
  parts.push(Buffer.from('Date: ' + closure.closure_date + '\n'))
  parts.push(Buffer.from('Responsable: ' + managerName + '\n'))
  parts.push(Buffer.from('Transactions: ' + closure.transactions_count + '\n'))
  parts.push(Buffer.from('Encaissements: ' + closure.collections_count + '\n'))
  parts.push(Buffer.from('--------------------------------\n'))
  
  // Financial summary
  parts.push(ESC_COMMANDS.BOLD_ON)
  parts.push(Buffer.from('RESUME FINANCIER\n'))
  parts.push(ESC_COMMANDS.BOLD_OFF)
  parts.push(Buffer.from('Ouverture:  ' + closure.opening_balance.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('Ventes:     ' + closure.total_sales.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('Encaiss.:   ' + closure.total_collections.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('Especes:    ' + closure.total_cash_income.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('Carte:      ' + closure.total_card_income.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('Depenses:   ' + closure.total_expenses.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('--------------------------------\n'))
  
  // Balance
  parts.push(ESC_COMMANDS.BOLD_ON)
  parts.push(Buffer.from('Attendu: ' + closure.expected_closing.toFixed(3) + ' TND\n'))
  parts.push(Buffer.from('Reel:    ' + closure.actual_closing.toFixed(3) + ' TND\n'))
  parts.push(ESC_COMMANDS.BOLD_OFF)
  
  const diff = closure.actual_closing - closure.expected_closing
  const status = Math.abs(diff) < 0.01 ? 'EQUILIBRE' : 'DIFFERENCE: ' + diff.toFixed(3)
  parts.push(Buffer.from('Statut: ' + status + '\n'))
  
  if (closure.difference_reason) {
    parts.push(Buffer.from('Motif: ' + closure.difference_reason + '\n'))
  }
  
  parts.push(Buffer.from('================================\n'))
  parts.push(Buffer.from('\n\n\n'))
  parts.push(ESC_COMMANDS.CUT)
  
  return Buffer.concat(parts)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, printerIp, printerPort = 9100, items, total, cashierName, paymentMethod, amountPaid, change, closure, managerName } = body

    // Demo mode - no real printer
    if (!printerIp || printerIp === 'demo') {
      return NextResponse.json({
        success: true,
        action,
        mode: 'demo',
        message: action === 'open_drawer' 
          ? 'Mode demo: Configurez l\'adresse IP de votre imprimante reseau pour ouvrir le tiroir.'
          : 'Mode demo: Configurez l\'adresse IP de votre imprimante reseau pour imprimer.'
      })
    }

    // Network printer via TCP socket
    return new Promise((resolve) => {
      const socket = net.createConnection(
        {
          host: printerIp,
          port: parseInt(printerPort.toString()),
          timeout: 5000
        },
        () => {
          try {
            let dataToSend: Buffer
            
            switch (action) {
              case 'test_print':
                dataToSend = generateTestPrint()
                break
              case 'open_drawer':
                dataToSend = ESC_COMMANDS.OPEN_DRAWER
                break
              case 'print_receipt':
                dataToSend = generateReceipt({ items, total, cashierName, paymentMethod, amountPaid, change })
                break
              case 'print_z_report':
                dataToSend = generateZReport(closure, managerName)
                break
              default:
                socket.destroy()
                resolve(NextResponse.json({ error: 'Action inconnue' }, { status: 400 }))
                return
            }
            
            socket.write(dataToSend)
            
            setTimeout(() => {
              socket.destroy()
              resolve(NextResponse.json({
                success: true,
                action,
                mode: 'network',
                printerIp,
                printerPort
              }))
            }, 500)
          } catch (error) {
            socket.destroy()
            resolve(NextResponse.json(
              { success: false, error: 'Erreur envoi donnees' },
              { status: 500 }
            ))
          }
        }
      )

      socket.on('error', (err) => {
        console.error('[Treasury] Socket error:', err.message)
        resolve(NextResponse.json(
          { success: false, error: `Impossible de connecter a ${printerIp}:${printerPort}. Verifiez l'adresse IP et le port.` },
          { status: 500 }
        ))
      })

      socket.on('timeout', () => {
        socket.destroy()
        resolve(NextResponse.json(
          { success: false, error: `Timeout connexion a ${printerIp}:${printerPort}` },
          { status: 500 }
        ))
      })
    })
  } catch (error) {
    console.error('[Treasury] ESC/POS Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
