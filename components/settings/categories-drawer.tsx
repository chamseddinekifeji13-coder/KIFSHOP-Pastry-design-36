"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, X, Save, GripVertical, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useTenant } from "@/lib/tenant-context"
import { getCategories, type ProductCategory } from "@/lib/mock-data"
import { toast } from "sonner"

interface CategoriesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const colorPalette = [
  "#D4A574", "#C68E5B", "#B8860B", "#A0522D", "#8B4513",
  "#CD853F", "#DAA520", "#4A7C59", "#2E5A3C", "#6B8E5A",
  "#4682B4", "#5B7C9A", "#8A6BBE", "#BE6B8A", "#E67E5A",
]

interface EditableCategory {
  id: string
  name: string
  color: string
  isNew?: boolean
}

export function CategoriesDrawer({ open, onOpenChange }: CategoriesDrawerProps) {
  const { currentTenant } = useTenant()
  const existingCategories = getCategories(currentTenant.id)

  const [categories, setCategories] = useState<EditableCategory[]>([])
  const [newName, setNewName] = useState("")
  const [selectedColor, setSelectedColor] = useState(colorPalette[0])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCategories(existingCategories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
      })))
    }
  }, [open, existingCategories])

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error("Veuillez saisir un nom de categorie")
      return
    }

    if (categories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("Cette categorie existe deja")
      return
    }

    setCategories(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: newName.trim(),
      color: selectedColor,
      isNew: true,
    }])

    setNewName("")
    setSelectedColor(colorPalette[Math.floor(Math.random() * colorPalette.length)])
  }

  const handleRemove = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const handleRename = (id: string, newNameValue: string) => {
    setCategories(prev => prev.map(c =>
      c.id === id ? { ...c, name: newNameValue } : c
    ))
  }

  const handleColorChange = (id: string, color: string) => {
    setCategories(prev => prev.map(c =>
      c.id === id ? { ...c, color } : c
    ))
  }

  const handleSave = () => {
    const emptyNames = categories.some(c => !c.name.trim())
    if (emptyNames) {
      toast.error("Certaines categories n'ont pas de nom")
      return
    }

    const added = categories.filter(c => c.isNew).length
    const removed = existingCategories.length - categories.filter(c => !c.isNew).length

    toast.success("Categories mises a jour", {
      description: `${categories.length} categories${added > 0 ? `, ${added} ajoutee(s)` : ""}${removed > 0 ? `, ${removed} supprimee(s)` : ""}`,
    })

    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gestion des categories</SheetTitle>
          <SheetDescription>
            Ajoutez, modifiez ou supprimez les categories de produits finis pour {currentTenant.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Add new category */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Ajouter une categorie
            </Label>

            <div className="flex gap-2">
              <Input
                placeholder="Nom de la categorie"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                }}
                className="flex-1"
              />
              <Button size="icon" variant="outline" onClick={handleAdd} className="bg-transparent shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {colorPalette.map(color => (
                <button
                  key={color}
                  type="button"
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: selectedColor === color ? "var(--foreground)" : "transparent",
                  }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Couleur ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Categories list */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Categories existantes ({categories.length})
            </Label>

            {categories.length > 0 ? (
              <div className="rounded-lg border divide-y">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-3">
                    {/* Color picker */}
                    <div className="relative">
                      <div
                        className="h-8 w-8 rounded-lg cursor-pointer border"
                        style={{ backgroundColor: cat.color }}
                        onClick={() => setEditingId(editingId === cat.id ? null : cat.id)}
                      />
                    </div>

                    {/* Name */}
                    <Input
                      value={cat.name}
                      onChange={(e) => handleRename(cat.id, e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />

                    {/* New badge */}
                    {cat.isNew && (
                      <Badge variant="secondary" className="text-xs shrink-0">Nouveau</Badge>
                    )}

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemove(cat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucune categorie. Ajoutez-en une ci-dessus.
              </div>
            )}

            {/* Inline color picker for editing */}
            {editingId && (
              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Changer la couleur de "{categories.find(c => c.id === editingId)?.name}"
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {colorPalette.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: categories.find(c => c.id === editingId)?.color === color
                          ? "var(--foreground)"
                          : "transparent",
                      }}
                      onClick={() => {
                        handleColorChange(editingId, color)
                        setEditingId(null)
                      }}
                      aria-label={`Couleur ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
