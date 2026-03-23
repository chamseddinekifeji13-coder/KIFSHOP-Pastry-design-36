import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const ignored = new Set(["node_modules", ".next", ".git"])
const tsxFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignored.has(entry.name)) continue
      walk(path.join(dir, entry.name))
      continue
    }
    if (entry.name.endsWith(".tsx")) {
      tsxFiles.push(path.join(dir, entry.name))
    }
  }
}

function hasConditionalUseCallback(content) {
  const patterns = [
    /if\s*\([^)]*\)\s*\{[\s\r\n]*(?:\/\/[^\n]*[\r\n]*)*(?:const|let|var)[^=\n]*=\s*useCallback\s*\(/m,
    /(?:for|while|switch)\s*\([^)]*\)\s*\{[\s\r\n]*(?:\/\/[^\n]*[\r\n]*)*(?:const|let|var)[^=\n]*=\s*useCallback\s*\(/m,
    /\?\s*(?:const|let|var)?[^=\n]*=?\s*useCallback\s*\(/m,
  ]
  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match?.index != null) {
      return content.slice(0, match.index).split(/\r?\n/).length
    }
  }
  return 0
}

walk(root)

const violations = []
for (const file of tsxFiles) {
  const line = hasConditionalUseCallback(fs.readFileSync(file, "utf8"))
  if (line > 0) violations.push(`${path.relative(root, file)}:${line}`)
}

if (violations.length > 0) {
  console.error("[FAIL] useCallback conditionnel detecte:")
  for (const v of violations) console.error(` - ${v}`)
  process.exit(1)
}

console.log(`[OK] ${tsxFiles.length} fichiers .tsx analyses, aucun useCallback conditionnel.`)
