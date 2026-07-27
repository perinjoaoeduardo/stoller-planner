"use client";

import * as React from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteNote, toggleNotePin, updateNote } from "@/lib/actions/notes";
import type { ChannelNote } from "@/lib/db/notes";
import { publicPhotoUrl } from "@/lib/photos";
import { getInitials } from "@/lib/utils";

/**
 * Card de nota do canal — feed de aprendizados sobre o cliente.
 *
 * Fixar é ação de todo mundo do canal (curadoria coletiva); editar e
 * apagar são só do autor. O menu já filtra por autoria, e a action
 * revalida do lado do servidor.
 */

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Texto da nota preservando quebras de linha e transformando URLs em
 *  links (sem markdown na v1). */
function NoteBody({ body }: { body: string }) {
  const parts = body.split(URL_PATTERN);
  return (
    <p className="text-sm whitespace-pre-wrap text-foreground">
      {parts.map((part, index) =>
        URL_PATTERN.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="text-accent-brand underline-offset-4 hover:underline"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}

export function NoteCard({
  note,
  currentUserId,
}: {
  note: ChannelNote;
  currentUserId: string;
}) {
  const isAuthor = note.author.id === currentUserId;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(note.body);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateNote({ noteId: note.id, body: draft });
      if (result.ok) {
        setEditing(false);
        toast.success("Nota atualizada.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function togglePin() {
    startTransition(async () => {
      const result = await toggleNotePin({
        noteId: note.id,
        pinned: !note.pinned,
      });
      if (result.ok) {
        toast.success(note.pinned ? "Nota desafixada." : "Nota fixada.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteNote({ noteId: note.id });
      if (result.ok) {
        setConfirmDelete(false);
        toast.success("Nota apagada.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    /*
     * Linha de feed, não card. O drawer já é uma superfície: cada nota
     * numa moldura própria era caixa dentro de caixa, e o gap entre
     * elas cortava a leitura contínua do histórico. Divisória + respiro
     * separam o suficiente.
     *
     * Sem ícone de pin e sem borda azul na nota fixada: a seção
     * "Fixadas" já agrupa (e o menu diz "Desafixar") — eram três sinais
     * para o mesmo fato. Sem badge de papel: o nome identifica a pessoa,
     * e DSM/RTV em toda linha virava ruído repetido.
     */
    <article className="group/note py-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-8 shrink-0">
          {note.author.avatarUrl ? (
            <AvatarImage src={note.author.avatarUrl} alt={note.author.name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {getInitials(note.author.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {/* Autor e tempo numa linha só — eram duas, gastando altura
              para dizer o mesmo. */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground">
            <span className="text-sm font-medium text-foreground">
              {note.author.name}
            </span>
            <span aria-hidden>·</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span>
                    {formatDistanceToNow(parseISO(note.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                }
              />
              <TooltipContent>
                {format(
                  parseISO(note.createdAt),
                  "dd 'de' MMMM 'de' yyyy', às' HH:mm",
                  { locale: ptBR }
                )}
              </TooltipContent>
            </Tooltip>
            {note.edited ? (
              <>
                <span aria-hidden>·</span>
                <span>editada</span>
              </>
            ) : null}
          </div>
        </div>

        {/* No mobile o menu fica sempre visível (não há hover). */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground md:opacity-0 md:transition-opacity md:group-hover/note:opacity-100 md:data-popup-open:opacity-100"
                aria-label="Ações da nota"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={togglePin} disabled={pending}>
                {note.pinned ? <PinOff /> : <Pin />}
                {note.pinned ? "Desafixar" : "Fixar"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {isAuthor ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setDraft(note.body);
                      setEditing(true);
                    }}
                  >
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 />
                    Deletar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* Corpo alinhado ao texto do cabeçalho (avatar size-8 + gap-3). */}
      <div className="mt-1.5 pl-11">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-24"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="brand"
                onClick={save}
                disabled={pending || !draft.trim()}
              >
                {pending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(note.body);
                  setEditing(false);
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <NoteBody body={note.body} />
            {note.photoPath ? (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="mt-3 block cursor-pointer overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicPhotoUrl(note.photoPath)}
                  alt="Foto da nota"
                  className="max-h-64 w-auto object-cover"
                />
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* Lightbox da foto */}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Nota de {note.author.name}
            </DialogTitle>
            <DialogDescription>
              {format(parseISO(note.createdAt), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </DialogDescription>
          </DialogHeader>
          {note.photoPath ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={publicPhotoUrl(note.photoPath)}
              alt="Foto da nota"
              className="max-h-[70dvh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmação de deleção */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deletar essa nota?</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Cancelar</Button>}
            />
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "Apagando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
