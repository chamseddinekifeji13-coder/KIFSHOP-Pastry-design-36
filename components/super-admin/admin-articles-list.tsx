"use client"


import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Loader2,
  Search,
  Building2,
  Trash2,
  Pencil,
  MoreHorizontal,
  Package,
  FlaskConical,
  CakeSlice,
  BoxIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  getAllArticles,
  getAllTenants,
  adminDeleteArticle,
  adminUpdateArticleUnit,
  type AdminArticle,
  type TenantOverview,
} from "@/lib/super-admin/actions"


const TYPE_LABELS: Record<"raw_material" | "finished_product" | "packaging", string> = {
  raw_material: "Matiere premiere",
  finished_product: "Produit fini",
  packaging: "Emballage",
}


const TYPE_SHORT: Record<string, string> = {
  raw_material: "MP",
  finished_product: "PF",
  packaging: "Emballage",
}


const AVAILABLE_UNITS = [
  "kg", "g", "L", "mL", "unite", "piece", "boite", "sachet", "carton", "plateau", "douzaine",
]


function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    raw_material: "bg-emerald-50 text-emerald-700 border-emerald-200",
    finished_product: "bg-blue-50 text-blue-700 border-blue-200",
    packaging: "bg-orange-50 text-orange-700 border-orange-200",
  }
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${styles[type] || ""}`}>
      {TYPE_SHORT[type] || type}
    </Badge>
  )
}


function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "raw_material":
      return <FlaskConical className="h-4 w-4 text-emerald-600" />
    case "finished_product":
      return <CakeSlice className="h-4 w-4 text-blue-600" />
    case "packaging":
      return <BoxIcon className="h-4 w-4 text-orange-600" />
    default:
      return <Package className="h-4 w-4" />
  }
}


export function AdminArticlesList() {
  const [articles, setArticles] = useState<AdminArticle[]>([])
  const [tenants, setTenants] = useState<TenantOverview[]>([])
  const [loading, setLoading] = useState(true)


  // Filters
  const [tenantFilter, setTenantFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState(search)


  // Edit unit dialog
  const [editingArticle, setEditingArticle] = useState<AdminArticle | null>(null)
  const [newUnit, setNewUnit] = useState("")
  const [updatingUnit, setUpdatingUnit] = useState(false)


  // Delete dialog
  const [deletingArticle, setDeletingArticle] = useState<AdminArticle | null>(null)
  const [deleting, setDeleting] = useState(false)


  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [arts, tens] = await Promise.all([
        getAllArticles(tenantFilter !== "all" ? tenantFilter : undefined),
        getAllTenants(),
      ])
      setArticles(arts)
      setTenants(tens)
    } catch {
      toast.error("Erreur lors du chargement des articles")
    } finally {
      setLoading(false)
    }
  }, [tenantFilter])


  useEffect(() => {
    loadData()
  }, [loadData])


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])


  // Reset form when editing article changes
  useEffect(() => {
    if (editingArticle) {
      setNewUnit(editingArticle.unit)
    }
  }, [editingArticle])


  // Filtered articles with memoization
  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase()
        if (!a.name.toLowerCase().includes(s) && !a.tenant_name.toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [articles, typeFilter, debouncedSearch])


  // Stats
  const totalCount = articles.length
  const rmCount = articles.filter((a) => a.type === "raw_material").length
  const fpCount = articles.filter((a) => a.type === "finished_product").length
  const pkgCount = articles.filter((a) => a.type === "packaging").length


  // Handlers
  async function handleDeleteArticle() {
    if (!deletingArticle) return
    setDeleting(true)
    try {
      await adminDeleteArticle(deletingArticle.tenant_id, deletingArticle.type, deletingArticle.id)
      toast.success(`Article "${deletingArticle.name}" supprime`)
      setDeletingArticle(null)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }


  async function handleUpdateUnit() {
    if (!editingArticle || !newUnit) return
    setUpdatingUnit(true)
    try {
      await adminUpdateArticleUnit(editingArticle.tenant_id, editingArticle.type, editingArticle.id, newUnit)
      toast.success(`Unite de "${editingArticle.name}" modifiee: ${editingArticle.unit} → ${newUnit}`)
      setEditingArticle(null)
      setNewUnit("")
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification")
    } finally {
      setUpdatingUnit(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }


  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
              <Package className="h-4 w-4 text-foreground/70" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <FlaskConical className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rmCount}</p>
              <p className="text-xs text-muted-foreground">Matieres P.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <CakeSlice className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{fpCount}</p>
              <p className="text-xs text-muted-foreground">Produits finis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <BoxIcon className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pkgCount}</p>
              <p className="text-xs text-muted-foreground">Emballages</p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Filters + Table */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-base">Tous les articles</h3>
              <p className="text-xs text-muted-foreground">{filtered.length} article(s)</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-[150px] sm:w-[180px] pl-8 text-xs"
                />
              </div>
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Patisserie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="raw_material">Matieres P.</SelectItem>
                  <SelectItem value="finished_product">Produits finis</SelectItem>
                  <SelectItem value="packaging">Emballages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun article trouve
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Patisserie</TableHead>
                    <TableHead className="hidden md:table-cell">Unite</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Stock</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Prix</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((article) => (
                    <TableRow key={`${article.type}-${article.id}`}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <TypeIcon type={article.type} />
                          <div className="min-w-0">
                            <p className="truncate text-sm">{article.name}</p>
                            <p className="sm:hidden text-xs text-muted-foreground truncate">
                              {article.tenant_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={article.type} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">{article.tenant_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {article.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm tabular-nums">
                        {article.currentStock?.toLocaleString("fr-FR") ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-sm tabular-nums">
                        {article.price?.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) ?? "—"} DT
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingArticle(article)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Modifier l{"'"}unite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingArticle(article)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Edit Unit Dialog */}
      <Dialog open={!!editingArticle} onOpenChange={(open) => { if (!open) setEditingArticle(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l{"'"}unite</DialogTitle>
            <DialogDescription>
              Changer l{"'"}unite de mesure de {"\""}{editingArticle?.name}{"\""}
              {" "}({TYPE_LABELS[editingArticle?.type as "raw_material" | "finished_product" | "packaging"] || ""})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Unite actuelle</Label>
                <p className="text-sm font-medium mt-1">{editingArticle?.unit}</p>
              </div>
              <div className="text-muted-foreground">{"→"}</div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Nouvelle unite</Label>
                <Select value={newUnit} onValueChange={setNewUnit}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Cette modification affectera aussi les mouvements de stock associes a cet article.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArticle(null)} disabled={updatingUnit}>
              Annuler
            </Button>
            <Button
              onClick={handleUpdateUnit}
              disabled={updatingUnit || newUnit === editingArticle?.unit}
            >
              {updatingUnit && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingArticle} onOpenChange={(open) => { if (!open) setDeletingArticle(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer {"\""}{deletingArticle?.name}{"\""} ({TYPE_LABELS[deletingArticle?.type || ""]})
              de la patisserie {"\""}{deletingArticle?.tenant_name}{"\""}.
              Cette action supprimera aussi tous les mouvements de stock et les liens de recettes associes.
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticle}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
