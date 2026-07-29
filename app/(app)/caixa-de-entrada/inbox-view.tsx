"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, SearchX, SlidersHorizontal } from "lucide-react";

import { SearchableSelect } from "@/components/app/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { InboxGrupo, InboxRegistro } from "@/lib/db/inbox";
import { useIsMobile } from "@/hooks/use-mobile";

import { InboxCard } from "./inbox-card";
import { PhotoLightbox } from "./photo-lightbox";
import { SimularEnvio } from "./simular-envio";

/** Teto antes de cortar a lista. Sem paginação na v1. */
const MAX_VISIVEL = 40;

/**
 * Caixa de entrada — a fila de triagem.
 *
 * O modelo mental é caixa de entrada, não pasta: o objetivo é chegar a
 * zero. Por isso não há StatCard aqui. Painel serve para acompanhar um
 * número ao longo do tempo; esta tela existe para esvaziar.
 *
 * Os recortes vivem na URL (?canal=, ?origem=, ?todos=) para o servidor
 * refazer a consulta — a lista pode ser grande e filtrar no cliente
 * significaria trazer tudo sempre.
 */
export function InboxView({
  grupos,
  canais,
  totalRegistros,
  podeVerDeTodos,
  verDeTodos,
  canalFiltro,
}: {
  grupos: InboxGrupo[];
  canais: { id: string; name: string }[];
  totalRegistros: number;
  /** RTV só tem os próprios envios; DSM e CX alternam. */
  podeVerDeTodos: boolean;
  verDeTodos: boolean;
  canalFiltro: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [lightbox, setLightbox] = React.useState<InboxRegistro | null>(null);
  const [verMais, setVerMais] = React.useState(false);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  const temFiltro = !!canalFiltro;
  const mostrarFiltroCanal = canais.length > 1;

  // Corte simples: a fila raramente passa de 40, e paginar uma tela que
  // existe para esvaziar seria dar conforto ao acúmulo.
  const grupoVisivel: InboxGrupo[] = [];
  let acumulado = 0;
  for (const grupo of grupos) {
    if (!verMais && acumulado >= MAX_VISIVEL) break;
    const restante = verMais ? grupo.registros.length : MAX_VISIVEL - acumulado;
    grupoVisivel.push({
      ...grupo,
      registros: grupo.registros.slice(0, restante),
    });
    acumulado += Math.min(grupo.registros.length, restante);
  }
  const cortou = !verMais && totalRegistros > MAX_VISIVEL;

  const controles = (
    <>
      {mostrarFiltroCanal ? (
        <SearchableSelect
          options={canais.map((canal) => ({
            value: canal.id,
            label: canal.name,
          }))}
          value={canalFiltro}
          onValueChange={(value) => setParam("canal", value)}
          placeholder="Todos os canais"
          className="h-9 min-w-44 border-input bg-card"
        />
      ) : null}
      {podeVerDeTodos ? (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch
            checked={verDeTodos}
            onCheckedChange={(checked) =>
              setParam("todos", checked ? "1" : null)
            }
          />
          Ver de todos
        </label>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* No celular os filtros vão para Sheet, como no resto do app. */}
        {isMobile ? (
          mostrarFiltroCanal || podeVerDeTodos ? (
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9">
                    <SlidersHorizontal />
                    Filtros
                  </Button>
                }
              />
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 p-4">{controles}</div>
              </SheetContent>
            </Sheet>
          ) : null
        ) : (
          controles
        )}
        <SimularEnvio canais={canais} />
      </div>

      {grupos.length === 0 ? (
        temFiltro ? (
          <Empty className="rounded-2xl border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>Nada com esse filtro</EmptyTitle>
              <EmptyDescription>
                Não há registro esperando no canal selecionado.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => setParam("canal", null)}>
                Limpar filtro
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          /* Vazio é o estado de SUCESSO desta tela, não de falta. A copy
             não pode soar como erro nem comemorar demais — chegar a zero
             é o trabalho normal. */
          <Empty className="rounded-2xl border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Caixa limpa</EmptyTitle>
              <EmptyDescription>
                Tudo que chegou do campo já virou atividade. Novos envios
                aparecem aqui.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : (
        <div className="flex flex-col gap-6">
          {grupoVisivel.map((grupo) => (
            <section key={grupo.canalId} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {grupo.canalNome}
                </h2>
                {grupo.registros.length > 1 ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {grupo.registros.length}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {grupo.registros.map((registro) => (
                  <InboxCard
                    key={registro.id}
                    registro={registro}
                    mostrarAutor={verDeTodos}
                    onOpenFotos={() => setLightbox(registro)}
                  />
                ))}
              </div>
            </section>
          ))}

          {cortou ? (
            <Button
              variant="outline"
              onClick={() => setVerMais(true)}
              className="self-center"
            >
              Ver mais ({totalRegistros - MAX_VISIVEL} restantes)
            </Button>
          ) : null}
        </div>
      )}

      <PhotoLightbox
        open={lightbox !== null}
        onOpenChange={(next) => (next ? undefined : setLightbox(null))}
        fotos={lightbox?.fotos ?? []}
        titulo={lightbox?.titulo ?? lightbox?.canalNome ?? "Registro"}
      />
    </div>
  );
}
