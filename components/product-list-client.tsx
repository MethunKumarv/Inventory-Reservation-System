"use client"

import { useEffect, useMemo, useState } from "react"

import { Product, productsResponseSchema } from "@/schemas/product"
import { SkeletonGrid } from "./skeleton-grid"
import { ProductCard } from "./product-card"
import { Alert } from "./alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

type ProductsResponse = { products: Product[] }

type SortOption = "name-asc" | "name-desc" | "stock-desc" | "stock-asc"

type ProductListClientProps = {
  initialProducts?: Product[]
}

function getTotalAvailableStock(product: Product) {
  return product.warehouses.reduce((total, warehouse) => total + warehouse.availableStock, 0)
}

export function ProductListClient({ initialProducts }: ProductListClientProps) {
  const [products, setProducts] = useState<Product[] | null>(initialProducts ?? null)
  const [loading, setLoading] = useState(!initialProducts)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("name-asc")

  const sortedProducts = useMemo(() => {
    if (!products) {
      return null
    }

    const stockByProductId = new Map(products.map((product) => [product.id, getTotalAvailableStock(product)]))
    const nextProducts = [...products]

    nextProducts.sort((left, right) => {
      if (sortBy === "name-asc") {
        return left.name.localeCompare(right.name)
      }

      if (sortBy === "name-desc") {
        return right.name.localeCompare(left.name)
      }

      const leftStock = stockByProductId.get(left.id) ?? 0
      const rightStock = stockByProductId.get(right.id) ?? 0

      if (sortBy === "stock-desc") {
        return rightStock - leftStock || left.name.localeCompare(right.name)
      }

      return leftStock - rightStock || left.name.localeCompare(right.name)
    })

    return nextProducts
  }, [products, sortBy])

  useEffect(() => {
    // When server-rendered products are already available, skip the extra
    // client fetch so first paint is faster and we avoid duplicate work.
    if (initialProducts) {
      return
    }

    let mounted = true

    async function fetchProducts() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/products", { cache: "no-store" })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.error ?? `HTTP ${res.status}`)
        }

        const json = await res.json()

        const parsed = productsResponseSchema.parse(json) as ProductsResponse

        if (!mounted) return

        setProducts(parsed.products)
      } catch (error: unknown) {
        console.error(error)
        if (mounted) setError(error instanceof Error ? error.message : "Unable to load products")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProducts()

    return () => {
      mounted = false
    }
  }, [initialProducts])

  if (loading) return <SkeletonGrid />

  if (error) return <Alert variant="error">{error}</Alert>

  if (!products || products.length === 0)
    return <Alert variant="info">No products available.</Alert>

  return (
    <div className="space-y-5">
      <div className="relative z-20 flex items-center justify-end">
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="text-xs uppercase tracking-[0.24em] text-white/45">Sort products</div>
          <div className="w-full sm:w-56">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="bg-black/20">
                <SelectValue placeholder="Sort products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="stock-desc">Stock high to low</SelectItem>
                <SelectItem value="stock-asc">Stock low to high</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <section className="relative z-0 grid gap-6 lg:grid-cols-2">
        {sortedProducts?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </div>
  )
}
