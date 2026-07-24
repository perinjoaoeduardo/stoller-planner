"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_SIZE, compressImage, photoStoragePath } from "@/lib/photos";

/**
 * Peças compartilhadas do fluxo Registrar (Situações A e B): fotos com
 * compressão e upload resiliente, nudge de foto e tela de sucesso.
 */

export { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_SIZE, compressImage } from "@/lib/photos";

export type PhotoDraft = {
  id: string;
  file: File;
  url: string;
};

/** Caminho único no bucket para a foto comprimida. */
export function buildStoragePath(extension: string): string {
  return photoStoragePath("execucoes", extension);
}

/**
 * Estado das fotos do registro com upload resiliente: fotos já enviadas
 * não sobem de novo no "Tentar de novo".
 */
export function usePhotoDrafts() {
  const uploadedRef = React.useRef(new Map<string, string>());
  const [photos, setPhotos] = React.useState<PhotoDraft[]>([]);
  const [rejected, setRejected] = React.useState(false);

  function addFiles(files: File[]) {
    const accepted = files.filter(
      (file) =>
        ACCEPTED_PHOTO_TYPES.includes(file.type) && file.size <= MAX_PHOTO_SIZE
    );
    setRejected(accepted.length < files.length);
    setPhotos((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter((item) => item.id !== id);
    });
    uploadedRef.current.delete(id);
  }

  function reset() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    uploadedRef.current.clear();
    setPhotos([]);
    setRejected(false);
  }

  /** Envia as fotos pendentes ao bucket e retorna todos os caminhos. */
  async function uploadAll(): Promise<string[]> {
    const supabase = createClient();
    const paths: string[] = [];
    for (const photo of photos) {
      const already = uploadedRef.current.get(photo.id);
      if (already) {
        paths.push(already);
        continue;
      }
      const blob = await compressImage(photo.file);
      const extension =
        blob.type === "image/jpeg"
          ? "jpg"
          : (photo.file.name.split(".").pop() ?? "jpg");
      const path = buildStoragePath(extension);
      const { error } = await supabase.storage
        .from("activity-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw new Error("upload");
      uploadedRef.current.set(photo.id, path);
      paths.push(path);
    }
    return paths;
  }

  return { photos, rejected, addFiles, removePhoto, reset, uploadAll };
}

/**
 * Nudge leve quando o registro vai sem foto — incentiva, nunca bloqueia.
 * Mobile: Drawer de baixo. Desktop: Dialog centralizado, sem X de fechar.
 */
export function PhotoNudgeDrawer({
  open,
  onOpenChange,
  onAddPhoto,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPhoto: () => void;
  onConfirm: () => void;
}) {
  const isMobile = useIsMobile();

  const actions = (
    <>
      <Button
        size="lg"
        className="h-12 w-full text-base"
        onClick={() => {
          onOpenChange(false);
          onAddPhoto();
        }}
      >
        <Camera className="size-5" />
        Adicionar foto
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="h-12 w-full text-base"
        onClick={() => {
          onOpenChange(false);
          onConfirm();
        }}
      >
        Concluir sem foto
      </Button>
    </>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sem foto?</DialogTitle>
            <DialogDescription>
              A evidência fortalece o registro nas reuniões com o canal.
              Concluir mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Sem foto?</DrawerTitle>
          <DrawerDescription>
            A evidência fortalece o registro nas reuniões com o canal.
            Concluir mesmo assim?
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-4">{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Variante do nudge para DENTRO do wizard (Drawer): em vez de abrir um
 * Dialog fora do painel, escurece e desfoca o próprio drawer e o card
 * de confirmação nasce ali dentro — o contexto do fluxo não se perde.
 * (O overlay é `absolute inset-0` e ancora no DrawerContent, que é o
 * ancestral posicionado mais próximo.)
 */
export function PhotoNudgeOverlay({
  open,
  onOpenChange,
  onAddPhoto,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPhoto: () => void;
  onConfirm: () => void;
}) {
  // Escape fecha SÓ o nudge, nunca o drawer atrás — captura antes do
  // listener do Drawer e corta a propagação.
  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      onOpenChange(false);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      // rounded-4xl acompanha o raio do drawer-popup — sem isso o véu
      // de blur fica com canto reto vazando por cima da curva do painel.
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-4xl bg-black/45 p-6 backdrop-blur-sm duration-base animate-in fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="photo-nudge-title"
        className="w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-elevated duration-base ease-emphasized animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="photo-nudge-title" className="text-base font-semibold">
          Sem foto?
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A evidência fortalece o registro nas reuniões com o canal. Concluir
          mesmo assim?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            className="h-11 w-full"
            autoFocus
            onClick={() => {
              onOpenChange(false);
              onAddPhoto();
            }}
          >
            <Camera className="size-4" />
            Adicionar foto
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Concluir sem foto
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Tela de sucesso — a recompensa do registro. */
export function SuccessScreen({
  title,
  photoCount,
  completed,
  onRegisterAnother,
}: {
  title: string;
  photoCount: number;
  completed: boolean;
  onRegisterAnother: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-success-bg duration-500 animate-in zoom-in-50 fade-in">
        <div className="flex size-16 items-center justify-center rounded-full bg-success delay-150 duration-500 animate-in zoom-in-50 fill-mode-backwards">
          <Check className="size-9 text-background" strokeWidth={3} />
        </div>
      </div>
      <div className="space-y-2 delay-200 duration-500 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards">
        <h1 className="text-2xl font-semibold tracking-tight">
          Registro feito!
        </h1>
        <p className="text-sm text-muted-foreground">
          {title}
          {photoCount > 0
            ? ` · ${photoCount} ${photoCount === 1 ? "foto" : "fotos"}`
            : " · sem fotos"}
        </p>
        {completed ? (
          <p className="text-sm font-medium text-success-fg">
            Atividade marcada como concluída
          </p>
        ) : null}
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2 delay-300 duration-500 animate-in fade-in fill-mode-backwards">
        <Button
          size="lg"
          className="h-12 text-base"
          onClick={onRegisterAnother}
        >
          <Camera className="size-5" />
          Registrar outra
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-base"
          nativeButton={false}
          render={<Link href="/minhas-atividades">Ver minhas atividades</Link>}
        />
      </div>
    </div>
  );
}
