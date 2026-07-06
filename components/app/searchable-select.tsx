"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type SelectOption = { value: string; label: string };

/**
 * Combobox de seleção única com busca — padrão do app para escolher
 * filial, responsável, problema, região etc.
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  id,
  className,
  disabled = false,
  clearable = true,
}: {
  options: SelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option: SelectOption | null) =>
        onValueChange(option?.value ?? null)
      }
      isItemEqualToValue={(a, b) => a?.value === b?.value}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        showClear={clearable && !!selected}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum resultado encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(option: SelectOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
