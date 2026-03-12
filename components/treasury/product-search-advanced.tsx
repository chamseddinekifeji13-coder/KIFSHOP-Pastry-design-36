"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Heart, Clock, Zap } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  category?: string
  imageUrl?: string
}

interface ProductSearchAdvancedProps {
  products: Product[]
  onSelect: (product: Product) => void
  onFavorite?: (productId: string) => void
  favorites?: string[]
  recentlyViewed?: string[]
}

export function ProductSearchAdvanced({
  products,
  onSelect,
  onFavorite,
  favorites = [],
  recentlyViewed = [],
}: ProductSearchAdvancedProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "recent">("search")

  const filteredProducts = useMemo(() => {
    if (activeTab === "favorites") {
      return products.filter(p => favorites.includes(p.id))
    }
    if (activeTab === "recent") {
      return products.filter(p => recentlyViewed.includes(p.id))
    }
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, activeTab, products, favorites, recentlyViewed])

  return (
    <div className="space-y-3">
      {/* Search tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeTab === "search" ? "default" : "outline"}
          onClick={() => setActiveTab("search")}
          className="h-8"
        >
          <Search className="h-3 w-3 mr-1" />
          Recherche
        </Button>
        <Button
          size="sm"
          variant={activeTab === "favorites" ? "default" : "outline"}
          onClick={() => setActiveTab("favorites")}
          className="h-8"
        >
          <Heart className="h-3 w-3 mr-1" />
          Favoris
        </Button>
        <Button
          size="sm"
          variant={activeTab === "recent" ? "default" : "outline"}
          onClick={() => setActiveTab("recent")}
          className="h-8"
        >
          <Clock className="h-3 w-3 mr-1" />
          Recents
        </Button>
      </div>

      {/* Search input */}
      {activeTab === "search" && (
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nom ou categorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Results */}
      <ScrollArea className="h-64 border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun produit trouve
            </div>
          ) : (
            filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => onSelect(product)}
                className="w-full text-left p-2 rounded-lg hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-amber-900">{product.name}</p>
                    {product.category && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-bold text-amber-600 text-sm">
                      {formatCurrency(product.price)}
                    </p>
                    {onFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onFavorite(product.id)
                        }}
                        className="mt-1"
                      >
                        <Heart
                          className={`h-3 w-3 ${
                            favorites.includes(product.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
