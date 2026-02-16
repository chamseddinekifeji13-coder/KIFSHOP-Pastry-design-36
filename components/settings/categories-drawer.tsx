"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, X, Save, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
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
      setCategories(existingCategories.map(c => ({ id: c.id, name: c.name, color: c.color })))
    }
  }, [open, existingCategories])

  const handleAdd = () => {
    if (!newName.trim()) { toast.error("Veuillez saisir un nom de categorie"); return }
    if (categories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("Cette categorie existe deja"); return
    }
    setCategories(prev => [...prev, {
      id: `new-${Date.now()}`, name: newName.trim(), color: selectedColor, isNew: true,
    }])
    setNewName("")
    setSelectedColor(colorPalette[Math.floor(Math.random() * colorPalette.length)])
  }

  const handleRemove = (id: string) => setCategories(prev => prev.filter(c => c.id !== id))
  const handleRename = (id: string, newNameValue: string) => setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newNameValue } : c))
  const handleColorChange = (id: string, color: string) => setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c))

  const handleSave = () => {
    if (categories.some(c => !c.name.trim())) { toast.error("Certaines categories n'ont pas de nom"); return }
    const added = categories.filter(c => c.isNew).length
    const removed = existingCategories.length - categories.filter(c => !c.isNew).length
    toast.success("Categories mises a jour", {
      description: `${categories.length} categories${added > 0 ? `, ${added} ajoutee(s)` : ""}${removed > 0 ? `, ${removed} supprimee(s)` : ""}`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-secondary to-secondary/80 px-6 py-8 text-secondary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Gestion des categories</h2>
              <p className="text-sm opacity-70">Ajoutez, modifiez ou supprimez les categories</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Add new category */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Plus className="h-3.5 w-3.5" />
              Ajouter une categorie
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de la categorie"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                  className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
                <Button size="icon" variant="outline" onClick={handleAdd} className="shrink-0 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? "var(--foreground)" : "transparent",
                      boxShadow: selectedColor === color ? "0 0 0 2px var(--background)" : "none",
                    }}
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Couleur ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Categories list */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Palette className="h-3.5 w-3.5" />
              Categories existantes ({categories.length})
            </div>

            {categories.length > 0 ? (
              <div className="rounded-xl border bg-card shadow-sm divide-y">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-3 group">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg cursor-pointer border shrink-0 transition-transform hover:scale-110"
                      style={{ backgroundColor: cat.color }}
                      onClick={() => setEditingId(editingId === cat.id ? null : cat.id)}
                    />
                    <Input
                      value={cat.name}
                      onChange={(e) => handleRename(cat.id, e.target.value)}
                      className="flex-1 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                    {cat.isNew && (
                      <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full bg-primary/10 text-primary border-0">Nouveau</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemove(cat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucune categorie. Ajoutez-en une ci-dessus.
              </div>
            )}

            {editingId && (
              <div className="rounded-xl border bg-card p-3 space-y-2 shadow-sm">
                <Label className="text-xs text-muted-foreground">
                  Couleur de "{categories.find(c => c.id === editingId)?.name}"
                </Label>
                <div className="flex flex-wrap gap-2">
                  {colorPalette.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: categories.find(c => c.id === editingId)?.color === color ? "var(--foreground)" : "transparent",
                      }}
                      onClick={() => { handleColorChange(editingId, color); setEditingId(null) }}
                      aria-label={`Couleur ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
