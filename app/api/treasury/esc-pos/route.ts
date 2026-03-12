import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'

// ESC/POS Commands for cash drawer
const ESC_COMMANDS = {
  // Open drawer: ESC p [ [ m Tn
  OPEN_DRAWER: Buffer.from([0x1b, 0x70, 0x00, 0x32, 0x00]),
  
  // Print mode
  RESET: Buffer.from([0x1b, 0x40]),
  
  // Line feed
  LF: Buffer.from([0x0a]),
  
  // Center align
  CENTER: Buffer.from([0x1b, 0x61, 0x01]),
  
  // Left align
  LEFT: Buffer.from([0x1b, 0x61, 0x00]),
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, config } = body

    // Get printer configuration (optional - works in demo mode without printer)
    const printerIp = config?.printerIp || process.env.PRINTER_IP || 'demo'
    const printerPort = config?.printerPort || 9100

    let commands: Buffer[] = []

    switch (action) {
      case 'open_drawer':
        commands = [ESC_COMMANDS.OPEN_DRAWER]
        break

      case 'print_receipt':
        const { items, total } = body
        commands = buildReceipt(items, total, session.displayName)
        break

      case 'print_z_report':
        const { closure } = body
        commands = buildZReport(closure, session.displayName)
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Send to printer (simulated - en production, connecter via TCP socket)
    console.log('[Treasury] ESC/POS Commands:', commands.length)
    
    return NextResponse.json({
      success: true,
      action,
      commandsSent: commands.length,
      printerIp,
    })
  } catch (error) {
    console.error('[Treasury] ESC/POS Error:', error)
    return NextResponse.json(
      { error: 'Failed to send command to printer' },
      { status: 500 }
    )
  }
}

function buildReceipt(items: any[], total: number, cashierName: string): Buffer[] {
  const commands: Buffer[] = [ESC_COMMANDS.RESET]

  // Header
  commands.push(ESC_COMMANDS.CENTER)
  commands.push(Buffer.from('KIFSHOP PASTRY\n'))
  commands.push(Buffer.from('BON DE COMMANDE\n'))
  commands.push(Buffer.from(`Caissier: ${cashierName}\n`))
  commands.push(Buffer.from(`${new Date().toLocaleString('fr-FR')}\n`))

  // Separator
  commands.push(Buffer.from('─'.repeat(40) + '\n'))

  // Items
  commands.push(ESC_COMMANDS.LEFT)
  for (const item of items) {
    const line = `${item.name.padEnd(25)} ${item.qty}x ${item.price.toFixed(3)}\n`
    commands.push(Buffer.from(line))
  }

  // Separator
  commands.push(Buffer.from('─'.repeat(40) + '\n'))

  // Total
  commands.push(ESC_COMMANDS.CENTER)
  commands.push(Buffer.from(`TOTAL: ${total.toFixed(3)} TND\n`))

  // Line feed
  commands.push(ESC_COMMANDS.LF)
  commands.push(ESC_COMMANDS.LF)

  return commands
}

function buildZReport(closure: any, managerName: string): Buffer[] {
  const commands: Buffer[] = [ESC_COMMANDS.RESET]

  // Header
  commands.push(ESC_COMMANDS.CENTER)
  commands.push(Buffer.from('RAPPORT DE CAISSE (Z)\n'))
  commands.push(Buffer.from('─'.repeat(40) + '\n'))

  // Report data
  commands.push(ESC_COMMANDS.LEFT)
  commands.push(Buffer.from(`Date: ${closure.closure_date}\n`))
  commands.push(Buffer.from(`Responsable: ${managerName}\n`))
  commands.push(Buffer.from(`Transactions: ${closure.transactions_count}\n`))
  commands.push(Buffer.from(`Encaissements: ${closure.collections_count}\n\n`))

  // Financial summary
  commands.push(Buffer.from('RÉSUMÉ FINANCIER\n'))
  commands.push(Buffer.from(`Solde d'ouverture:  ${closure.opening_balance.toFixed(3)} TND\n`))
  commands.push(Buffer.from(`Ventes:            ${closure.total_sales.toFixed(3)} TND\n`))
  commands.push(Buffer.from(`Encaissements:     ${closure.total_collections.toFixed(3)} TND\n`))
  commands.push(Buffer.from(`Paiements Espèces: ${closure.total_cash_income.toFixed(3)} TND\n`))
  commands.push(Buffer.from(`Paiements Carte:   ${closure.total_card_income.toFixed(3)} TND\n`))
  commands.push(Buffer.from(`Dépenses:          ${closure.total_expenses.toFixed(3)} TND\n\n`))

  // Balance
  commands.push(Buffer.from('─'.repeat(40) + '\n'))
  commands.push(ESC_COMMANDS.CENTER)
  commands.push(Buffer.from(`Solde attendu: ${closure.expected_closing.toFixed(3)} TND\n`))
  commands.push(Buffer.from(`Solde réel:    ${closure.actual_closing.toFixed(3)} TND\n`))
  
  const diff = closure.actual_closing - closure.expected_closing
  const status = Math.abs(diff) < 0.01 ? 'ÉQUILIBRE' : 'DIFFÉRENCE'
  commands.push(Buffer.from(`Statut: ${status}\n`))
  
  if (closure.difference_reason) {
    commands.push(Buffer.from(`Motif: ${closure.difference_reason}\n`))
  }

  // Line feed
  commands.push(ESC_COMMANDS.LF)
  commands.push(ESC_COMMANDS.LF)

  return commands
}
