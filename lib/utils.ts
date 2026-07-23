import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Iniciais de um nome (1ª letra do primeiro + do último nome) — ÚNICA
 * implementação do app. Antes havia 16 cópias com DOIS algoritmos:
 * "João da Silva" mostrava "JS" numa tela e "JD" noutra.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
