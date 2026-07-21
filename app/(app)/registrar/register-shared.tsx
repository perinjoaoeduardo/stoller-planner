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
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { createClient } from "@/lib/supabase/client";

/**
 * Peças compartilhadas do fluxo Registrar (Situações A e B): fotos com
 * compressão e upload resiliente, nudge de foto e tela de sucesso.
 */

export const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB antes da compressão
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_DESCRIPTION = 500;

export type PhotoDraft = {
  id: string;
  file: File;
  url: string;
};

/** Reduz a imagem no client (máx. 1600px, JPEG q0.8) antes do upload. */
export async function compressImage(file: File): Promise<Blob> {
  if (file.size < 400 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.8);
  });
}

/** Caminho único no bucket para a foto comprimida. */
export function buildStoragePath(extension: string): string {
  return `execucoes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
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
