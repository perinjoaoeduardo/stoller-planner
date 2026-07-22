"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWizardProvider } from "@/components/app/wizard-provider";
import type { WizardMode } from "@/components/app/action-wizard";
import { cn } from "@/lib/utils";

export function NewActivityButton({
  mode,
  channelId,
  activityId,
  date,
  size = "default",
  variant = "brand",
  className,
  label = "Nova atividade",
  icon,
}: {
  mode?: WizardMode;
  channelId?: string;
  /** Pula direto pro passo de concluir esta atividade (mode registrar). */
  activityId?: string;
  date?: string;
  size?: "default" | "sm" | "lg" | "icon-sm";
  variant?: "default" | "brand" | "outline" | "ghost";
  className?: string;
  label?: string;
  icon?: ReactNode;
}) {
  const { openWizard } = useWizardProvider();

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={() => openWizard({ mode, channelId, activityId, date })}
    >
      {icon ?? <Plus className="size-4" />}
      {label}
    </Button>
  );
}
