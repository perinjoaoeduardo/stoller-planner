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
    // Sem max-w/mx-auto: o drawer já define a largura de leitura, e a
    // margem dupla espremia o feed.
    <div className="flex w-full flex-col gap-4">
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
          {/* Fixadas: as notas ficam numa caixa própria — é o único
              destaque de que precisam (o pin por nota e a borda azul
              saíram). Sem separador solto entre as seções: o rótulo já
              marca a virada. */}
          {pinned.length > 0 ? (
            <section className="rounded-xl border border-border bg-subtle px-4">
              <div className="flex items-center gap-2 border-b border-border py-2.5">
                <Pin className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Fixadas
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {pinned.length}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border/60">
                {pinned.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {pinned.length > 0 ? "Todas as notas" : "Notas"}
              </p>
              <div className="mt-1 flex flex-col divide-y divide-border/60">
                {rest.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
