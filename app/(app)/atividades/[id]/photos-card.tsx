"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageOff, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  deleteActivityPhoto,
  registerActivityPhoto,
} from "@/lib/actions/plan";
import type { ActivityPhotoRow } from "@/lib/db/channels";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** Reduz a imagem no client (máx. 1600px, JPEG q0.8) antes do upload. */
async function compressImage(file: File): Promise<Blob> {
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
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      "image/jpeg",
      0.8
    );
  });
}

function photoUrl(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-photos/${storagePath}`;
}

function PhotoThumb({
  photo,
  onClick,
}: {
  photo: ActivityPhotoRow;
  onClick: () => void;
}) {
  const [broken, setBroken] = React.useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-2xl border bg-muted"
    >
      {broken ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" />
          <span className="px-2 text-center text-[10px] leading-tight">
            Arquivo indisponível
          </span>
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl(photo.storagePath)}
          alt={photo.caption ?? "Evidência da atividade"}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={() => setBroken(true)}
        />
      )}
      {photo.caption ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] text-white">
          {photo.caption}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Card "Evidências": grid de fotos com upload para o bucket
 * activity-photos, caption opcional, preview em Dialog e exclusão.
 */
export function PhotosCard({
  activityId,
  photos,
  canManage,
}: {
  activityId: string;
  photos: ActivityPhotoRow[];
  canManage: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [caption, setCaption] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<ActivityPhotoRow | null>(null);
  const [deleting, setDeleting] = React.useState<ActivityPhotoRow | null>(
    null
  );

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato não suportado. Envie JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("A foto pode ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await compressImage(file);
      const extension = blob.type === "image/jpeg" ? "jpg" : file.name.split(".").pop() ?? "jpg";
      const path = `${activityId}/${Date.now()}.${extension}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("activity-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (uploadError) {
        toast.error("Falha ao enviar a foto. Tente novamente.");
        return;
      }

      const result = await registerActivityPhoto({
        activityId,
        storagePath: path,
        caption: caption.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setCaption("");
      toast.success("Foto adicionada às evidências.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteActivityPhoto({ photoId: deleting.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Foto removida.");
    setDeleting(null);
    setPreview(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidências</CardTitle>
        <CardDescription>
          Fotos da execução em campo — a prova do resultado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canManage ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Legenda da foto (opcional)"
              className="flex-1"
              disabled={uploading}
            />
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Spinner />
                  Enviando...
                </>
              ) : (
                <>
                  <ImagePlus />
                  Adicionar foto
                </>
              )}
            </Button>
          </div>
        ) : null}

        {photos.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageOff />
              </EmptyMedia>
              <EmptyTitle>Sem evidências ainda</EmptyTitle>
              <EmptyDescription>
                {canManage
                  ? "Adicione fotos da execução para fortalecer o relatório de safra."
                  : "Nenhuma foto de execução foi registrada nesta atividade."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <PhotoThumb
                key={photo.id}
                photo={photo}
                onClick={() => setPreview(photo)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evidência</DialogTitle>
            <DialogDescription>
              {preview?.caption ??
                (preview
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
              src={photoUrl(preview.storagePath)}
              alt={preview.caption ?? "Evidência da atividade"}
              className="max-h-[70dvh] w-full rounded-2xl object-contain"
            />
          ) : null}
          {canManage && preview ? (
            <Button
              variant="destructive"
              className="self-end"
              onClick={() => setDeleting(preview)}
            >
              <Trash2 />
              Excluir foto
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              A foto será removida das evidências da atividade. Essa ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Excluir foto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
