"use client";

// ⚠️ FERRAMENTA DE DEMONSTRAÇÃO — SAI QUANDO A INTEGRAÇÃO REAL ENTRAR.
// A caixa de entrada nasce alimentada por WhatsApp. Enquanto esse canal
// não existe, este formulário é o único jeito de ver um registro chegar
// na fila. Apagar este arquivo e o botão que o abre não deve deixar
// nenhum rastro no resto da tela.

import * as React from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/app/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { criarRegistroInbox } from "@/lib/actions/inbox";
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS } from "@/lib/config";
import {
  ACCEPTED_PHOTO_TYPES,
  compressImage,
  INBOX_PHOTO_BUCKET,
  photoStoragePath,
} from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";

const MAX_FOTOS = 4;

type Draft = { id: string; file: Blob; previewUrl: string; ext: string };

export function SimularEnvio({
  canais,
}: {
  canais: { id: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        Simular envio
      </Button>
      {open ? (
        <SimularEnvioDialog canais={canais} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function SimularEnvioDialog({
  canais,
  onClose,
}: {
  canais: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [canalId, setCanalId] = React.useState<string | null>(
    canais.length === 1 ? canais[0].id : null
  );
  const [tipoAcao, setTipoAcao] = React.useState<string | null>(null);
  const [titulo, setTitulo] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [fotos, setFotos] = React.useState<Draft[]>([]);
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function addFiles(files: File[]) {
    const aceitas = files
      .filter((file) => ACCEPTED_PHOTO_TYPES.includes(file.type))
      .slice(0, MAX_FOTOS - fotos.length);

    Promise.all(
      aceitas.map(async (file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: await compressImage(file),
        previewUrl: URL.createObjectURL(file),
        ext: file.type === "image/png" ? "png" : "jpg",
      }))
    ).then((novas) => setFotos((atual) => [...atual, ...novas]));
  }

  async function submit() {
    if (!canalId || fotos.length === 0) return;
    setPending(true);
    try {
      const supabase = createClient();
      const paths: string[] = [];
      for (const foto of fotos) {
        const path = photoStoragePath(`inbox/${canalId}`, foto.ext);
        const { error } = await supabase.storage
          .from(INBOX_PHOTO_BUCKET)
          .upload(path, foto.file, { contentType: `image/${foto.ext}` });
        if (error) throw error;
        paths.push(path);
      }

      const result = await criarRegistroInbox({
        canalId,
        fotos: paths,
        tipoAcao,
        titulo,
        descricao,
      });

      if (result.ok) {
        toast.success("Registro recebido na caixa de entrada.");
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Falha ao enviar as fotos. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  const canSubmit = !!canalId && fotos.length > 0 && !pending;

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simular envio</DialogTitle>
          <DialogDescription>
            Insere um registro na fila como se tivesse chegado do campo.
            Ferramenta de demonstração enquanto a integração não existe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Canal</Label>
            <SearchableSelect
              options={canais.map((canal) => ({
                value: canal.id,
                label: canal.name,
              }))}
              value={canalId}
              onValueChange={setCanalId}
              placeholder="Escolha o canal"
              className="h-10 border-input bg-card"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Fotos</Label>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_PHOTO_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                addFiles(files);
              }}
            />
            <div className="flex flex-wrap gap-2">
              {fotos.map((foto) => (
                <div key={foto.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.previewUrl}
                    alt="Prévia"
                    className="size-16 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFotos((atual) =>
                        atual.filter((item) => item.id !== foto.id)
                      )
                    }
                    aria-label="Remover foto"
                    className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex size-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted/60"
                  aria-label="Adicionar foto"
                >
                  <Camera className="size-5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo de ação (opcional)</Label>
            <SearchableSelect
              options={ACTIVITY_CATEGORIES.map((categoria) => ({
                value: categoria,
                label: CATEGORY_LABELS[categoria],
              }))}
              value={tipoAcao}
              onValueChange={setTipoAcao}
              placeholder="Sem tipo de ação"
              className="h-10 border-input bg-card"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Título (opcional)</Label>
            <Input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex: Treinamento de fungicidas em Sorriso"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="O que aconteceu"
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="brand" disabled={!canSubmit} onClick={submit}>
            {pending ? <Spinner /> : null}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
