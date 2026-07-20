"use client";

import * as React from "react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { cn } from "@/lib/utils";

/**
 * Substitui um `<Link href="/atividades/[id]">` por um gatilho que abre
 * o Activity Panel (modal) — a experiência única de ver uma atividade em
 * todo o app. Drop-in em Server Components: renderiza um <button> com a
 * mesma className/children, sem navegar pra página cheia.
 */
export function ActivityLink({
  activityId,
  className,
  children,
}: {
  activityId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openActivity } = useActivityDrawer();
  return (
    <button
      type="button"
      onClick={() => openActivity(activityId)}
      className={cn("w-full cursor-pointer text-left", className)}
    >
      {children}
    </button>
  );
}
