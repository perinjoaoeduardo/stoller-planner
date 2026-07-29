"use client";

import * as React from "react";
import { Link2, Search } from "lucide-react";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/app/searchable-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  criarAtividadeDeRegistros,
  listarAtividadesDoCanal,
  listarMetasDoCanal,
  vincularRegistros,
} from "@/lib/actions/inbox";
import type {
  AtividadeParaVincular,
  InboxRegistro,
} from "@/lib/db/inbox";
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS } from "@/lib/config";
import { formatDeadline } from "@/lib/deadline";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Acima disso, procurar na lista é mais rápido do que rolar. */
const BUSCA_A_PARTIR_DE = 8;

/**
 * Drawer de VINCULAR: escolher uma atividade que já existe e anexar as
 * fotos do registro a ela, concluindo-a.
 *
 * É o caso mais comum do campo: a atividade já estava planejada, o RTV
 * foi lá e fez, e a foto é a prova. Ele não precisa criar nada — só
 * dizer a qual atividade aquilo pertence.
 */
export function VincularDrawer({
  registros,
  onClose,
  onResolvido,
}: {
  registros: InboxRegistro[];
  onClose: () => void;
  onResolvido: (activityId: string) => void;
}) {
  const isMobile = useIsMobile();
  const [atividades, setAtividades] = React.useState<
    AtividadeParaVincular[] | null
  >(null);
  const [busca, setBusca] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const canalId = registros[0]?.canalId;
  const canalNome = registros[0]?.canalNome;
  const totalFotos = registros.reduce((s, r) => s + r.fotos.length, 0);

  React.useEffect(() => {
    let ativo = true;
    listarAtividadesDoCanal(canalId)
      .then((lista) => ativo && setAtividades(lista))
      .catch(() => ativo && setAtividades([]));
    return () => {
      ativo = false;
    };
  }, [canalId]);

  const filtradas = (atividades ?? []).filter((atividade) =>
    busca.trim()
      ? atividade.title.toLowerCase().includes(busca.trim().toLowerCase())
      : true
  );

  function escolher(atividade: AtividadeParaVincular) {
    setPending(true);
    void vincularRegistros({
      registroIds: registros.map((registro) => registro.id),
      activityId: atividade.id,
    }).then((resultado) => {
      setPending(false);
      if (resultado.ok) {
        toast.success(`Evidência anexada a "${atividade.title}".`);
        onResolvido(atividade.id);
      } else {
        toast.error(resultado.error);
      }
    });
  }

  return (
    <Drawer
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      modal
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent
        className={cn(
          !isMobile && "data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]"
        )}
      >
        <DrawerTitle className="sr-only">Vincular a atividade</DrawerTitle>
        <div className="shrink-0 border-b border-border px-6 py-4">
          <p className="text-base font-semibold text-foreground">
            Vincular a uma atividade
          </p>
          <DrawerDescription className="mt-0.5">
            {totalFotos === 1 ? "1 foto" : `${totalFotos} fotos`} de{" "}
            {canalNome}. A atividade escolhida é concluída com essa
            evidência.
          </DrawerDescription>
        </div>

        {atividades && atividades.length >= BUSCA_A_PARTIR_DE ? (
          <div className="shrink-0 border-b border-border px-6 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar atividade..."
                className="h-9 pl-9"
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-4">
          {atividades === null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Carregando atividades...
            </p>
          ) : filtradas.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Link2 />
                </EmptyMedia>
                <EmptyTitle>Nenhuma atividade em aberto</EmptyTitle>
                <EmptyDescription>
                  Este canal não tem atividade aberta para receber a
                  evidência. Crie uma atividade a partir do registro.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {filtradas.map((atividade) => (
                <button
                  key={atividade.id}
                  type="button"
                  disabled={pending}
                  onClick={() => escolher(atividade)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border-hover hover:bg-hover-surface disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {atividade.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        atividade.branchName ?? "Canal geral",
                        formatDeadline(atividade.dueDate, "date") ??
                          "Sem prazo",
                      ].join(" · ")}
                    </p>
                  </div>
                  {/* Badge só quando atrasada: é a informação que muda a
                      escolha. Em dia, o prazo na linha já basta. */}
                  {atividade.status === "atrasada" ? (
                    <StatusBadge status="atrasada" className="shrink-0" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Diálogo de CRIAR: a ação não estava no plano, então vira atividade
 * nova já concluída, com as fotos como evidência.
 *
 * Vem pré-alimentado com o que o envio trouxe. O canal é fixo, não
 * campo: ele veio do registro e mudá-lo mudaria de qual plano a
 * atividade faz parte.
 */
export function CriarAtividadeDrawer({
  registros,
  onClose,
  onResolvido,
}: {
  registros: InboxRegistro[];
  onClose: () => void;
  onResolvido: (activityId: string) => void;
}) {
  const isMobile = useIsMobile();
  const primeiro = registros[0];
  const canalId = primeiro?.canalId;

  const [metas, setMetas] = React.useState<{ id: string; title: string }[]>([]);
  const [titulo, setTitulo] = React.useState(primeiro?.titulo ?? "");
  const [descricao, setDescricao] = React.useState(primeiro?.descricao ?? "");
  const [tipoAcao, setTipoAcao] = React.useState<string | null>(
    primeiro?.tipoAcao ?? null
  );
  const [metaId, setMetaId] = React.useState<string | null>(
    primeiro?.metaId ?? null
  );
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let ativo = true;
    listarMetasDoCanal(canalId)
      .then((lista) => ativo && setMetas(lista))
      .catch(() => ativo && setMetas([]));
    return () => {
      ativo = false;
    };
  }, [canalId]);

  const totalFotos = registros.reduce((s, r) => s + r.fotos.length, 0);
  const podeSalvar =
    !!tipoAcao && titulo.trim().length > 0 && descricao.trim().length > 0;

  function salvar() {
    if (!tipoAcao) return;
    setPending(true);
    void criarAtividadeDeRegistros({
      registroIds: registros.map((registro) => registro.id),
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipoAcao,
      metaId,
    }).then((resultado) => {
      setPending(false);
      if (resultado.ok && resultado.activityId) {
        toast.success("Atividade criada e concluída com a evidência.");
        onResolvido(resultado.activityId);
      } else if (!resultado.ok) {
        toast.error(resultado.error);
      }
    });
  }

  return (
    <Drawer
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      modal
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent
        className={cn(
          !isMobile && "data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]"
        )}
      >
        <DrawerTitle className="sr-only">Criar atividade</DrawerTitle>
        <div className="shrink-0 border-b border-border px-6 py-4">
          <p className="text-base font-semibold text-foreground">
            Criar atividade
          </p>
          <DrawerDescription className="mt-0.5">
            Nasce concluída, com {totalFotos === 1 ? "a foto" : "as fotos"} do
            registro como evidência.
          </DrawerDescription>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {/* Canal como VALOR, não campo: veio do registro e trocá-lo
              mudaria de qual plano a atividade faz parte. */}
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Canal</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {primeiro?.canalNome}
              {primeiro?.filialNome ? ` · ${primeiro.filialNome}` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo de ação</Label>
            <SearchableSelect
              options={ACTIVITY_CATEGORIES.map((categoria) => ({
                value: categoria,
                label: CATEGORY_LABELS[categoria],
              }))}
              value={tipoAcao}
              onValueChange={setTipoAcao}
              placeholder="Escolha o tipo"
              className="h-10 border-input bg-card"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex: Treinamento de fungicidas em Sorriso"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>O que aconteceu</Label>
            <Textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Resumo do que foi feito em campo"
              className="min-h-24"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Meta do plano</Label>
            <SearchableSelect
              options={metas.map((meta) => ({
                value: meta.id,
                label: meta.title,
              }))}
              value={metaId}
              onValueChange={setMetaId}
              placeholder="Vincular depois"
              className="h-10 border-input bg-card"
            />
            <p className="text-xs text-muted-foreground">
              Sem meta a atividade nasce como pendência de vínculo — some
              de lá quando alguém vincular.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="brand"
            size="lg"
            className="h-10"
            disabled={!podeSalvar || pending}
            onClick={salvar}
          >
            {pending ? <Spinner /> : null}
            Registrar atividade
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
