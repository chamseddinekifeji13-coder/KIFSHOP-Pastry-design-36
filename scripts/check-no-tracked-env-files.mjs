#!/usr/bin/env node

import { execSync } from "node:child_process"

function getTrackedEnvFiles() {
  const output = execSync('git ls-files ".env*"', { encoding: "utf8" }).trim()
  if (!output) return []
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function isAllowedTemplate(path) {
  return path.endsWith(".example")
}

function main() {
  const trackedEnvFiles = getTrackedEnvFiles()
  const forbidden = trackedEnvFiles.filter((path) => !isAllowedTemplate(path))

  if (forbidden.length === 0) {
    console.log("OK: aucun fichier .env sensible suivi par git.")
    process.exit(0)
  }

  console.error("ERREUR: des fichiers .env sensibles sont suivis par git :")
  for (const file of forbidden) {
    console.error(` - ${file}`)
  }
  console.error("\nConservez uniquement des templates comme .env.example.")
  process.exit(1)
}

main()
