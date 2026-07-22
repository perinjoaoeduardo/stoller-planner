"use client";

import * as React from "react";

import { ActionWizard, type WizardMode } from "@/components/app/action-wizard";
import { getActivityChannel, getWizardChannels } from "@/lib/actions/wizard";
import type { ChannelOption } from "@/lib/db/execution";

type OpenWizardOpts = {
  mode?: WizardMode;
  channelId?: string;
  activityId?: string;
  date?: string;
};

type WizardProviderCtx = {
  openWizard: (opts?: OpenWizardOpts) => void;
};

const Ctx = React.createContext<WizardProviderCtx>({
  openWizard: () => {},
});

export function useWizardProvider() {
  return React.useContext(Ctx);
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [channels, setChannels] = React.useState<ChannelOption[]>([]);
  const [opts, setOpts] = React.useState<OpenWizardOpts>({});
  // Cada abertura remonta o ActionWizard (via key): o estado inicial é
  // recalculado com os defaults NOVOS — sem isso, reabrir com outro
  // activityId reaproveitava o estado resetado com os props antigos.
  const [instance, setInstance] = React.useState(0);
  const fetchedRef = React.useRef(false);

  const openWizard = React.useCallback((o?: OpenWizardOpts) => {
    const wanted = o ?? {};

    // Fluxos que abrem só com o activityId (tabelas/linhas não carregam
    // o canal): resolve o canal no servidor pra cair DIRETO no passo de
    // concluir, em vez de pedir canal + atividade de novo.
    const optsPromise =
      wanted.activityId && !wanted.channelId
        ? getActivityChannel(wanted.activityId)
            .then((res) =>
              res ? { ...wanted, channelId: res.channelId } : wanted
            )
            // Falhou a resolução? Abre mesmo assim — cai no picker.
            .catch(() => wanted)
        : Promise.resolve(wanted);

    const channelsPromise = fetchedRef.current
      ? Promise.resolve(null)
      : getWizardChannels();
    fetchedRef.current = true;

    void Promise.all([optsPromise, channelsPromise]).then(
      ([resolved, chs]) => {
        if (chs) setChannels(chs);
        setOpts(resolved);
        setInstance((i) => i + 1);
        setOpen(true);
      }
    );
  }, []);

  const ctx = React.useMemo(() => ({ openWizard }), [openWizard]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {channels.length > 0 && (
        <ActionWizard
          key={instance}
          open={open}
          onOpenChange={setOpen}
          channels={channels}
          defaultChannelId={opts.channelId}
          defaultActivityId={opts.activityId}
          defaultDate={opts.date}
          defaultMode={opts.mode}
        />
      )}
    </Ctx.Provider>
  );
}
