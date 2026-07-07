"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, Check, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

/** Botão grande de câmera + grid de miniaturas (foto sempre opcional). */
export function PhotoSection({
  photos,
  rejected,
  onAdd,
  onRemove,
  inputRef,
}: {
  photos: PhotoDraft[];
  rejected: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          onAdd(files);
        }}
      />
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-primary transition-colors hover:bg-primary/10 active:bg-primary/15"
        >
          <Camera className="size-7" />
          <span className="text-sm font-semibold">
            Anexar foto (opcional)
          </span>
          <span className="text-xs text-muted-foreground">
            Câmera ou galeria — pode escolher várias
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Foto da execução"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                aria-label="Remover foto"
                className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Adicionar mais fotos"
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground hover:bg-muted/60"
          >
            <ImagePlus className="size-6" />
          </button>
        </div>
      )}
      {rejected ? (
        <p className="text-xs text-destructive" role="alert">
          Alguma foto foi ignorada: use JPG, PNG ou WEBP até 10MB.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Nudge leve quando o registro vai sem foto — incentiva, nunca bloqueia.
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
        <DrawerFooter className="pt-4">
          <Button
            size="lg"
            className="h-12 text-base"
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
            className="h-12 text-base"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Concluir sem foto
          </Button>
        </DrawerFooter>
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
      <div className="flex size-24 items-center justify-center rounded-full bg-[#96CB40]/15 duration-500 animate-in zoom-in-50 fade-in">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#96CB40] delay-150 duration-500 animate-in zoom-in-50 fill-mode-backwards">
          <Check className="size-9 text-white" strokeWidth={3} />
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
          <p className="text-sm font-medium text-[#4A7A10] dark:text-[#B5DC73]">
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
