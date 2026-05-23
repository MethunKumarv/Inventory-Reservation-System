import { NextResponse } from "next/server"
import type { ZodTypeAny } from "zod"
import { z } from "zod"

import { ApiError } from "@/lib/errors"

export async function parseJsonBody<T extends ZodTypeAny>(request: Request, schema: T) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, "Invalid JSON body")
  }

  const result = schema.safeParse(body)

  if (!result.success) {
    throw new ApiError(400, result.error.issues[0]?.message ?? "Invalid request body")
  }

  return result.data as z.infer<T>
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status)
  }

  console.error(error)
  return jsonError("Internal server error", 500)
}
