"use client";

import * as React from "react";

import { ActionWizard, type WizardMode } from "@/components/app/action-wizard";
import { getWizardChannels } from "@/lib/actions/wizard";
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
  const fetchedRef = React.useRef(false);

  const openWizard = React.useCallback((o?: OpenWizardOpts) => {
    setOpts(o ?? {});
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      getWizardChannels().then((chs) => {
        setChannels(chs);
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  }, []);

  const ctx = React.useMemo(() => ({ openWizard }), [openWizard]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {channels.length > 0 && (
        <ActionWizard
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
