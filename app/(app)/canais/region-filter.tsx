"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";

/** Filtro por região da página Meus Canais (só para CX) — via querystring. */
export function RegionFilter({ regions }: { regions: SelectOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("regiao");

  function handleChange(value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("regiao", value);
    else params.delete("regiao");
    router.push(`/canais${params.size > 0 ? `?${params}` : ""}`);
  }

  return (
    <SearchableSelect
      options={regions}
      value={current}
      onValueChange={handleChange}
      placeholder="Todas as regiões"
      className="w-56"
    />
  );
}
