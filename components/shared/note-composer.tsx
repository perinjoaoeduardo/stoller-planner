"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createNote } from "@/lib/actions/notes";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_SIZE, compressImage, photoStoragePath } from "@/lib/photos";

/**
 * Composer das Notas do Canal.
 *
 * Colapsado por padrão (uma linha discreta no topo do feed); expande no
 * clique. A foto é opcional e sobe direto para o bucket pelo client —
 * mesmo caminho das fotos de execução — e só o path vai para a action.
 */

export function NoteComposer({
  channelId,
  user,
  expandedSignal = 0,
}: {
  channelId: string;
  user: { name: string; avatarUrl: string | null };
  /** Incrementar força a abertura (usado pelo CTA do empty state). */
  expandedSignal?: number;
}) {
  // Aberto = clique manual OU sinal externo ainda não dispensado.
  // Derivado no render (sem setState em effect): fechar registra qual
  // sinal foi visto, então o próximo incremento reabre.
  const [manualExpanded, setManualExpanded] = React.useState(false);
  const [dismissedSignal, setDismissedSignal] = React.useState(0);
  const expanded = manualExpanded || expandedSignal > dismissedSignal;
  const [body, setBody] = React.useState("");
  const [photoPath, setPhotoPath] = React.useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const dirty = body.trim() !== "" || !!photoPath;

  function collapse() {
    setManualExpanded(false);
    setDismissedSignal(expandedSignal);
  }

  function reset() {
    setBody("");
    setPhotoPath(null);
    setPhotoPreview(null);
    collapse();
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true);
    else collapse();
  }

  async function handleFile(file: File) {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("A foto pode ter no máximo 10MB.");
      return;
    }
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = photoStoragePath(`notes/${channelId}`, "jpg");
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("activity-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      setPhotoPath(path);
      setPhotoPreview(URL.createObjectURL(blob));
    } catch {
      toast.error("Falha ao enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function publish() {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await createNote({ channelId, body, photoPath });
      if (result.ok) {
        reset();
        toast.success("Nota publicada.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!expanded) {
    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setManualExpanded(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setManualExpanded(true);
          }
        }}
        className="flex cursor-pointer flex-row items-center gap-3 px-4 py-3 transition-colors hover:bg-hover-surface"
      >
        <Avatar className="size-7 shrink-0">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-[10px]">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">
          Registrar uma nota sobre esse canal...
        </span>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 p-4">
        <Textarea
          // Foca ao montar — o composer só expande por gesto do usuário
          // (clique aqui ou CTA do empty state), então o foco é esperado.
          autoFocus
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            // Enter quebra linha; Cmd/Ctrl+Enter publica.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              publish();
            }
          }}
          placeholder="O que você aprendeu ou quer registrar sobre esse canal?"
          className="max-h-[400px] min-h-[100px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />

        {photoPreview ? (
          <div className="relative mt-2 w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Prévia da foto"
              className="max-h-40 rounded-lg border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoPath(null);
                setPhotoPreview(null);
              }}
              aria-label="Remover foto"
              className="absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-card/85 backdrop-blur"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_PHOTO_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) handleFile(file);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || !!photoPath}
            className="text-muted-foreground hover:text-foreground"
          >
            {uploading ? <Spinner className="size-4" /> : <Camera />}
            {uploading ? "Enviando..." : "Foto"}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={requestClose}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={publish}
              disabled={!body.trim() || pending || uploading}
            >
              {pending ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar esta nota?</DialogTitle>
            <DialogDescription>
              O que você escreveu será perdido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Continuar escrevendo</Button>}
            />
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                reset();
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
