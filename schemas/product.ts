import { z } from "zod"

export const warehouseEntrySchema = z.object({
  warehouseId: z.string(),
  warehouseName: z.string(),
  totalQuantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative(),
  availableStock: z.number().int().nonnegative(),
})

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  warehouses: z.array(warehouseEntrySchema),
})

export const productsResponseSchema = z.object({
  products: z.array(productSchema),
})

export type Product = z.infer<typeof productSchema>
