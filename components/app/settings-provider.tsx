"use client";

import * as React from "react";

import {
  SettingsDialog,
  type SettingsUser,
} from "@/components/app/settings-dialog";

/**
 * Hospeda o modal de Configurações uma única vez e expõe openSettings()
 * para os dois pontos de entrada: o menu do usuário (rodapé da sidebar)
 * e a ação "Abrir configurações" da busca (Ctrl+K), que vivem em ramos
 * diferentes da árvore.
 */
const SettingsContext = React.createContext<(() => void) | null>(null);

export function useOpenSettings() {
  return React.useContext(SettingsContext);
}

export function SettingsProvider({
  user,
  children,
}: {
  user: SettingsUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const openSettings = React.useCallback(() => setOpen(true), []);

  return (
    <SettingsContext.Provider value={openSettings}>
      {children}
      <SettingsDialog open={open} onOpenChange={setOpen} user={user} />
    </SettingsContext.Provider>
  );
}
