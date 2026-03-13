/**
 * Installe le KIFSHOP Print Bridge comme tâche planifiée Windows
 * pour qu'il démarre automatiquement au démarrage de Windows.
 * 
 * Usage: node install-service.js
 * Requiert: droits administrateur
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const serverPath = path.join(__dirname, 'server.js')
const nodeExe = process.execPath

// Create VBS wrapper for silent launch (no console window)
const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c cd /d ""${__dirname}"" && node server.js > kifshop-bridge.log 2>&1", 0, False
`

const vbsPath = path.join(__dirname, 'start-silent.vbs')
fs.writeFileSync(vbsPath, vbsContent.trim())

const taskName = 'KIFSHOPPrintBridge'
const taskCmd = `schtasks /Create /TN "${taskName}" /TR "wscript.exe \\"${vbsPath}\\"" /SC ONLOGON /RL HIGHEST /F`

try {
  execSync(taskCmd, { stdio: 'inherit' })
  console.log(`\n✅ KIFSHOP Print Bridge installé comme tâche planifiée!`)
  console.log(`   Le bridge démarrera automatiquement à chaque connexion Windows.`)
  console.log(`\n   Pour démarrer maintenant: node server.js`)
  console.log(`   Pour supprimer: schtasks /Delete /TN "${taskName}" /F`)
} catch (err) {
  console.error('❌ Erreur:', err.message)
  console.error('   Relancez en tant qu\'administrateur.')
  process.exit(1)
}
