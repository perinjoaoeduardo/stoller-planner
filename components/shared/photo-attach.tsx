"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera, Download, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type PhotoAttachItem = {
  id: string;
  url: string;
  caption?: string | null;
  createdAt?: string | null;
};

/**
 * Componente GLOBAL de anexar foto (Constituição, item 7 — único).
 * Empty = área tracejada clicável; com fotos = grid de thumbs com X no
 * hover + slot tracejado de adicionar; clique abre lightbox com
 * download e (quando permitido) delete. Upload/persistência ficam com
 * quem consome via onAdd/onRemove.
 */
export function PhotoAttach({
  photos,
  onAdd,
  onRemove,
  size = "default",
  busy = false,
  readOnly = false,
  inputRef: externalRef,
}: {
  photos: PhotoAttachItem[];
  onAdd?: (files: File[]) => void;
  onRemove?: (id: string) => void;
  size?: "default" | "compact";
  busy?: boolean;
  readOnly?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const internalRef = React.useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const [preview, setPreview] = React.useState<PhotoAttachItem | null>(null);

  const compact = size === "compact";
  const canManage = !readOnly && !!onAdd;

  function pick() {
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-2">
      {canManage ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) onAdd?.(files);
          }}
        />
      ) : null}

      {photos.length === 0 ? (
        canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={pick}
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-hover bg-subtle transition-colors hover:border-border-active hover:bg-muted disabled:opacity-60",
              compact ? "p-4" : "p-6"
            )}
          >
            {busy ? (
              <Spinner className={compact ? "size-5" : "size-6"} />
            ) : (
              <Camera
                className={cn(
                  "text-foreground/70",
                  compact ? "size-5" : "size-6"
                )}
              />
            )}
            <span className="text-sm font-medium text-foreground">
              {busy ? "Enviando…" : "Anexar foto (opcional)"}
            </span>
            <span className="text-xs text-muted-foreground">
              Câmera ou galeria, pode escolher várias
            </span>
          </button>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma foto ainda
          </p>
        )
      ) : (
        <div
          className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-3")}
        >
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              <button
                type="button"
                onClick={() => setPreview(photo)}
                className="block aspect-square w-full overflow-hidden rounded-lg border bg-muted"
                aria-label={photo.caption ?? "Ampliar foto"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Foto da execução"}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              {canManage && onRemove ? (
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => onRemove(photo.id)}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          {canManage ? (
            <button
              type="button"
              disabled={busy}
              aria-label="Adicionar mais fotos"
              onClick={pick}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border-hover text-muted-foreground transition-colors hover:border-border-active hover:bg-muted disabled:opacity-60"
            >
              {busy ? <Spinner /> : <Plus className="size-5" />}
            </button>
          ) : null}
        </div>
      )}

      {/* Lightbox com download e delete */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto</DialogTitle>
            <DialogDescription>
              {preview?.caption ??
                (preview?.createdAt
                  ? `Adicionada em ${format(
                      parseISO(preview.createdAt),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}`
                  : "")}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview.url}
              alt={preview.caption ?? "Foto da execução"}
              className="max-h-[70dvh] w-full rounded-md object-contain"
            />
          ) : null}
          <DialogFooter>
            {preview ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={preview.url} download target="_blank" rel="noreferrer" />
                }
              >
                <Download />
                Baixar
              </Button>
            ) : null}
            {canManage && onRemove && preview ? (
              <Button
                variant="destructive"
                onClick={() => {
                  onRemove(preview.id);
                  setPreview(null);
                }}
              >
                <Trash2 />
                Excluir foto
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
