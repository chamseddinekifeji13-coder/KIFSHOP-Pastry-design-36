import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import * as net from 'net'

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

function generateTestPrint(): Buffer {
  let receipt = ESC_COMMANDS.RESET
  receipt = Buffer.concat([receipt, ESC_COMMANDS.CENTER])
  receipt = Buffer.concat([receipt, Buffer.from('KIFSHOP Pastry\n')])
  receipt = Buffer.concat([receipt, Buffer.from('Test Imprimante\n')])
  receipt = Buffer.concat([receipt, Buffer.from('================================\n')])
  receipt = Buffer.concat([receipt, Buffer.from(new Date().toLocaleString('fr-TN') + '\n')])
  receipt = Buffer.concat([receipt, Buffer.from('================================\n')])
  receipt = Buffer.concat([receipt, Buffer.from('\nImprimante OK!\n')])
  return receipt
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, printerIp, printerPort = 9100 } = body

    // Network printer via TCP socket
    if (printerIp && printerIp !== 'demo') {
      return new Promise((resolve) => {
        const socket = net.createConnection(
          {
            host: printerIp,
            port: parseInt(printerPort.toString()),
            timeout: 5000
          },
          () => {
            try {
              if (action === 'test_print') {
                socket.write(generateTestPrint())
              } else if (action === 'open_drawer') {
                socket.write(ESC_COMMANDS.OPEN_DRAWER)
              }
              
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
                { success: false, error: 'Erreur envoi données' },
                { status: 500 }
              ))
            }
          }
        )

        socket.on('error', () => {
          resolve(NextResponse.json(
            { success: false, error: `Impossible de connecter a ${printerIp}:${printerPort}. Vérifiez l'adresse IP et le port.` },
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
    }

    // Demo/WebUSB fallback
    if (action === 'open_drawer') {
      return NextResponse.json({
        success: true,
        action,
        mode: 'demo',
        message: 'Mode démo: Configurez l\'adresse IP de votre imprimante réseau pour ouvrir le tiroir.'
      })
    }

    return NextResponse.json({
      success: true,
      action,
      mode: 'demo',
      message: 'WebUSB mode - Utilisez le navigateur pour connecter l\'imprimante USB'
    })
  } catch (error) {
    console.error('[Treasury] ESC/POS Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // In demo mode, return success with instructions
    // For production: Use WebUSB API on client-side or network printer connection
    if (printerIp === 'demo') {
      console.log('[Treasury] Demo mode - ESC/POS Commands:', commands.length)
      return NextResponse.json({
        success: true,
        action,
        commandsSent: commands.length,
        mode: 'demo',
        message: action === 'open_drawer' 
          ? 'Mode demo: Tiroir caisse non connecte. Pour connecter une imprimante thermique avec tiroir, configurez PRINTER_IP dans les variables d\'environnement.'
          : 'Mode demo: Imprimante non connectee. Utilisez window.print() pour imprimer ou configurez une imprimante thermique.',
      })
    }

    // For real printer connection via TCP (requires server-side TCP socket)
    // This would need a separate microservice or native app to handle raw TCP
    console.log('[Treasury] Sending to printer:', printerIp, ':', printerPort)
    console.log('[Treasury] ESC/POS Commands:', commands.length)
    
    return NextResponse.json({
      success: true,
      action,
      commandsSent: commands.length,
      printerIp,
      mode: 'network',
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
