"use client"

import { useEffect } from "react"

interface KeyboardShortcutsProps {
  onShortcut: (key: string) => void
}

export function useKeyboardShortcuts({ onShortcut }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only on numbers and specific keys
      if (e.key >= "0" && e.key <= "9") {
        onShortcut(`QUANTITY_${e.key}`)
        return
      }

      switch (e.key) {
        case "Enter":
          onShortcut("SUBMIT_ORDER")
          break
        case "Escape":
          onShortcut("CANCEL_ORDER")
          break
        case "c":
        case "C":
          if (e.ctrlKey) {
            e.preventDefault()
            onShortcut("CLEAR_CART")
          }
          break
        case "p":
        case "P":
          if (e.ctrlKey) {
            e.preventDefault()
            onShortcut("PRINT_RECEIPT")
          }
          break
        case "s":
        case "S":
          if (e.ctrlKey) {
            e.preventDefault()
            onShortcut("OPEN_SEARCH")
          }
          break
        case "Backspace":
          onShortcut("DELETE_ITEM")
          break
        case " ":
          e.preventDefault()
          onShortcut("TOGGLE_DRAWER")
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [onShortcut])
}

// Keyboard shortcuts reference
export const KEYBOARD_SHORTCUTS = {
  "0-9": "Définir la quantité (1-9)",
  "Ctrl+Enter": "Soumettre la commande",
  Escape: "Annuler/Effacer",
  "Ctrl+C": "Vider le panier",
  "Ctrl+P": "Imprimer le ticket",
  "Ctrl+S": "Ouvrir la recherche",
  Backspace: "Supprimer le dernier article",
  Space: "Ouvrir/fermer le tiroir",
}
