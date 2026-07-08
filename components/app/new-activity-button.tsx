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
  date,
  size = "default",
  variant = "default",
  className,
  label = "+ Nova atividade",
  icon,
}: {
  mode?: WizardMode;
  channelId?: string;
  date?: string;
  size?: "default" | "sm" | "lg" | "icon-sm";
  variant?: "default" | "outline" | "ghost";
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
      onClick={() => openWizard({ mode, channelId, date })}
    >
      {icon ?? <Plus className="size-4" />}
      {label}
    </Button>
  );
}
