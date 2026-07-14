"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Texto com truncate + Tooltip do conteúdo completo — o tooltip só
 * ativa quando o texto realmente trunca (scrollWidth > clientWidth),
 * re-medindo no resize.
 */
export function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text]);

  const label = (
    <p ref={ref} className={cn("truncate", className)}>
      {text}
    </p>
  );

  if (!truncated) return label;

  return (
    <Tooltip>
      <TooltipTrigger render={label} />
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
