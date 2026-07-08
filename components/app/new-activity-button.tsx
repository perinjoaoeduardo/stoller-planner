"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWizardProvider } from "@/components/app/wizard-provider";
import type { WizardMode } from "@/components/app/action-wizard";
import { cn } from "@/lib/utils";

export function NewActivityButton({
  mode,
  channelId,
  size = "default",
  variant = "default",
  className,
  label = "+ Nova atividade",
}: {
  mode?: WizardMode;
  channelId?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  label?: string;
}) {
  const { openWizard } = useWizardProvider();

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={() => openWizard({ mode, channelId })}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  );
}
