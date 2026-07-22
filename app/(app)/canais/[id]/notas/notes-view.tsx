"use client";

import * as React from "react";
import { Pin, StickyNote } from "lucide-react";

import { NoteCard } from "@/components/shared/note-card";
import { NoteComposer } from "@/components/shared/note-composer";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ChannelNote } from "@/lib/db/notes";

/**
 * Feed de Notas do Canal: composer no topo, seção Fixadas (quando há) e
 * o cronológico reverso abaixo. Fixadas não se repetem no feed.
 */
export function NotesView({
  channelId,
  notes,
  currentUserId,
  currentUser,
}: {
  channelId: string;
  notes: ChannelNote[];
  currentUserId: string;
  currentUser: { name: string; avatarUrl: string | null };
}) {
  // O CTA do empty state abre o composer — daí o sinal incremental.
  const [openSignal, setOpenSignal] = React.useState(0);

  const pinned = notes.filter((note) => note.pinned);
  const rest = notes.filter((note) => !note.pinned);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <NoteComposer
        channelId={channelId}
        user={currentUser}
        expandedSignal={openSignal}
      />

      {notes.length === 0 ? (
        <Empty className="mt-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StickyNote />
            </EmptyMedia>
            <EmptyTitle>Nenhuma nota ainda</EmptyTitle>
            <EmptyDescription>
              Registre observações, aprendizados e contexto sobre esse canal.
              Todo mundo do time consegue ver.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="brand"
              onClick={() => setOpenSignal((value) => value + 1)}
            >
              Escrever primeira nota
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {pinned.length > 0 ? (
            <>
              <div className="mt-6 mb-2 flex items-center gap-2">
                <Pin className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Fixadas ({pinned.length})
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {pinned.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </>
          ) : null}

          {rest.length > 0 ? (
            <>
              <div
                className={
                  pinned.length > 0
                    ? "mt-6 border-t border-border pt-6"
                    : "mt-6"
                }
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {pinned.length > 0 ? "Todas as notas" : "Notas"}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {rest.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
