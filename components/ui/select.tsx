"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type SelectContextValue = {
  value: string
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectValue: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)

  if (!context) {
    throw new Error("Select components must be used within <Select />")
  }

  return context
}

type SelectProps = {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (!target?.closest("[data-select-root='true']")) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const contextValue = React.useMemo(
    () => ({
      value,
      open,
      setOpen,
      selectValue: onValueChange,
    }),
    [onValueChange, open, value],
  )

  return (
    <SelectContext.Provider value={contextValue}>
      <div data-select-root="true" className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSelectContext()

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 text-left text-sm text-[hsl(var(--foreground))] outline-none transition hover:border-white/20 hover:bg-white/10 focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20",
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-white/65 transition-transform duration-200 group-hover:text-white",
          open ? "rotate-180" : "rotate-0",
        )}
      >
        ▾
      </span>
    </button>
  )
}

export function SelectValue({
  placeholder,
  children,
}: {
  placeholder?: string
  children?: React.ReactNode
}) {
  const { value } = useSelectContext()
  return (
    <span className={cn("truncate", !value && !children && "text-white/45")}>
      {value ? children || value : placeholder || "Select..."}
    </span>
  )
}

export function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSelectContext()

  if (!open) {
    return null
  }

  return (
    <div
      role="listbox"
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-[hsl(var(--card))] p-1 shadow-[0_25px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/5",
        className,
      )}
    >
      {children}
    </div>
  )
}

type SelectItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
  disabled?: boolean
}

export function SelectItem({ className, children, value, disabled, ...props }: SelectItemProps) {
  const { value: selectedValue, selectValue, setOpen } = useSelectContext()
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        selectValue(value)
        setOpen(false)
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[hsl(var(--foreground))] transition hover:bg-white/15 hover:text-white focus:bg-white/15 focus:text-white disabled:cursor-not-allowed disabled:opacity-45",
        isSelected && "bg-white/15 text-white",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected ? <span className="ml-3 text-xs text-white/70">Selected</span> : null}
    </button>
  )
}
