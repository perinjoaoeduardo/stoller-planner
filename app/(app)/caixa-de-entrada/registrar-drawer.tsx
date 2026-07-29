"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronRight,
  MapPin,
  PenLine,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryIconBox, IconBox } from "@/components/shared/icon-box";
import { MetaPicker } from "@/components/app/meta-picker";
import { PhotoAttach } from "@/components/shared/photo-attach";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { registerExecution } from "@/lib/actions/execution";
import {
  anexarRegistroAAtividade,
  listarAtividadesAbertas,
  listarMetas,
} from "@/lib/actions/inbox";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS } from "@/lib/config";
import type { ActivityCategory } from "@/lib/config";
import type { AtividadeAberta, InboxRegistro } from "@/lib/db/inbox";
import { formatDeadline } from "@/lib/deadline";
import { formatRelativeDue } from "@/lib/plan-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { usePhotoDrafts } from "@/app/(app)/registrar/register-shared";

/** Acima disso, procurar na lista é mais rápido do que rolar. */
const BUSCA_A_PARTIR_DE = 8;

/** Valor da opção "não estava no plano" no seletor de atividade. */
const FORA_DO_PLANO = "__fora__";

/**
 * Registrar a partir de um envio do campo — UMA página resolve tudo.
 *
 * É a MESMA tela de "Concluir atividade" do wizard, com uma diferença: a
 * evidência já chegou. Então a grade de fotos não abre vazia pedindo
 * anexo — ela abre com as fotos do envio já lá, e o tracejado vira só o
 * "+ mais uma", que é o que sobrou de opcional.
 *
 * A pergunta que abre a tela é a única que importa: a qual atividade
 * aquilo pertence. Respondida, a lista sai de cena e ficam só os campos
 * que ainda faltam.
 *
 * O que grava é o `registerExecution` de sempre. Esta tela só escolhe com
 * quais argumentos chamá-lo, e depois pendura o envio na atividade.
 */
export function RegistrarDrawer({
  registro,
  onClose,
}: {
  registro: InboxRegistro;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } =
    usePhotoDrafts();

  const [atividades, setAtividades] = React.useState<AtividadeAberta[] | null>(
    null
  );
  const [metas, setMetas] = React.useState<{ id: string; title: string }[]>([]);
  const [escolha, setEscolha] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  // Campos da atividade fora do plano, já com o que o envio trouxe. O que
  // veio em branco continua em branco — e é só isso que a tela cobra.
  const [titulo, setTitulo] = React.useState(registro.titulo ?? "");
  const [descricao, setDescricao] = React.useState(registro.descricao ?? "");
  const [tipoAcao, setTipoAcao] = React.useState<ActivityCategory | null>(
    registro.tipoAcao
  );
  const [metaId, setMetaId] = React.useState<string | null>(registro.metaId);

  const [pending, setPending] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ativo = true;
    void Promise.all([
      listarAtividadesAbertas(registro.canalId),
      listarMetas(registro.canalId),
    ]).then(([lista, metasDoCanal]) => {
      if (!ativo) return;
      setAtividades(lista);
      setMetas(metasDoCanal);
    });
    return () => {
      ativo = false;
    };
  }, [registro.canalId]);

  const foraDoPlano = escolha === FORA_DO_PLANO;
  const atividadeEscolhida =
    escolha && !foraDoPlano
      ? (atividades ?? []).find((a) => a.id === escolha)
      : undefined;

  const filtradas = (atividades ?? []).filter((atividade) =>
    busca.trim()
      ? atividade.title.toLowerCase().includes(busca.trim().toLowerCase())
      : true
  );

  const podeSalvar = foraDoPlano
    ? !!tipoAcao && titulo.trim().length > 0 && descricao.trim().length > 0
    : !!atividadeEscolhida;

  // As fotos do envio entram na grade como itens travados: elas são o
  // motivo de a tela estar aberta, e um X nelas seria uma promessa falsa.
  const fotosDoEnvio = registro.fotos.map((url, i) => ({
    id: `envio-${i}`,
    url,
  }));

  async function salvar() {
    setPending(true);
    setErro(null);
    try {
      const novas = await uploadAll();
      const resultado = foraDoPlano
        ? await registerExecution({
            // Filial quando o envio trouxe uma; senão a atividade é do canal.
            ...(registro.filialId
              ? { adhocBranchId: registro.filialId }
              : { adhocChannelId: registro.canalId }),
            title: titulo.trim(),
            description: descricao.trim(),
            category: tipoAcao as ActivityCategory,
            problemId: metaId,
            markCompleted: true,
            photoPaths: novas,
          })
        : await registerExecution({
            activityId: atividadeEscolhida!.id,
            description: descricao.trim(),
            markCompleted: true,
            photoPaths: novas,
          });

      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }

      // A foto do envio já estava no servidor: ela é pendurada agora, e o
      // registro para de pedir decisão.
      const anexo = await anexarRegistroAAtividade({
        registroId: registro.id,
        activityId: resultado.activityId!,
      });
      if (!anexo.ok) {
        setErro(anexo.error);
        return;
      }

      router.refresh();
      onClose();
      toast.success(
        foraDoPlano ? "Atividade registrada" : "Atividade concluída",
        {
          description: foraDoPlano ? titulo.trim() : atividadeEscolhida!.title,
          duration: 6000,
        }
      );
    } catch {
      setErro("Falha ao enviar as fotos — sinal fraco? Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  const TipoIcon = atividadeEscolhida?.category
    ? CATEGORY_ICONS[atividadeEscolhida.category]
    : null;

  // O título segue o que está acontecendo, como no wizard: escolher,
  // concluir o que estava planejado, ou registrar algo novo.
  const cabecalho = atividadeEscolhida
    ? "Concluir atividade"
    : foraDoPlano
      ? "Registrar atividade"
      : "Registrar o que foi feito";

  return (
    <Drawer
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      modal
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent
        className={cn(
          !isMobile && "data-[swipe-axis=x]:sm:[--drawer-content-width:34rem]"
        )}
      >
        <DrawerTitle className="sr-only">{cabecalho}</DrawerTitle>
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">
              {cabecalho}
            </p>
            <DrawerDescription className="mt-0.5">
              {registro.canalNome}
              {registro.filialNome ? ` · ${registro.filialNome}` : ""}
            </DrawerDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Fechar"
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-full bg-secondary"
          >
            <X />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          {/* ── Escolha ─────────────────────────────────────────────
              Mesma anatomia do "Selecione a atividade" do wizard.
              ESCOLHEU, a lista sai de cena: ela é o menu, não o assunto.
              Fica o resumo, e "Trocar" é o desfazer barato. */}
          {atividadeEscolhida ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-subtle p-4">
              <p className="font-medium leading-snug">
                {atividadeEscolhida.title}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={atividadeEscolhida.status} />
                {atividadeEscolhida.category && TipoIcon ? (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 rounded-md px-2 py-1 font-normal text-foreground"
                  >
                    <TipoIcon className="size-3.5 text-foreground/70" />
                    {CATEGORY_LABELS[atividadeEscolhida.category]}
                  </Badge>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>{atividadeEscolhida.branchName ?? "Canal geral"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {/* Alarme único: o selo de status já comunica o atraso. */}
                  <span className="text-muted-foreground">
                    {formatRelativeDue(atividadeEscolhida.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          ) : foraDoPlano ? null : atividades === null ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Carregando atividades do canal...
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEscolha(FORA_DO_PLANO)}
                className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-accent-brand/40 bg-accent-brand/5 p-4 text-left transition-all hover:border-accent-brand/60 hover:bg-accent-brand/10"
              >
                <IconBox
                  icon={PenLine}
                  size="lg"
                  className="bg-accent-brand/10"
                  iconClassName="size-4 text-accent-brand"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-accent-brand">
                    Registrar atividade fora do plano
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Realizou algo que não estava planejado? Registre aqui.
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="shrink-0 text-xs text-muted-foreground">
                  ou selecione uma atividade planejada
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {atividades.length >= BUSCA_A_PARTIR_DE ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar atividade..."
                    className="h-10 border-input bg-card pl-9"
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                {filtradas.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <SearchX className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {atividades.length === 0
                        ? "Nenhuma atividade planejada aberta."
                        : "Nenhum resultado para essa busca."}
                    </p>
                  </div>
                ) : (
                  filtradas.map((atividade) => (
                    <button
                      key={atividade.id}
                      type="button"
                      onClick={() => setEscolha(atividade.id)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border-hover hover:bg-hover-surface"
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
                      {/* Selo só quando atrasada: é a informação que muda
                          a escolha. Em dia, o prazo já basta. */}
                      {atividade.status === "atrasada" ? (
                        <StatusBadge status="atrasada" className="shrink-0" />
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── O que ainda falta preencher ───────────────────────── */}
          {escolha !== null ? (
            <>
              {foraDoPlano ? (
                <div className="flex flex-col gap-2">
                  <Label>Título</Label>
                  <Input
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex: Treinamento de fungicidas em Sorriso"
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label>
                  O que aconteceu{" "}
                  {foraDoPlano ? null : (
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  )}
                </Label>
                <Textarea
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder={
                    foraDoPlano
                      ? "Resumo do que foi feito em campo"
                      : "Adicione detalhes se a execução foi diferente do planejado."
                  }
                  className="min-h-24"
                />
              </div>

              {foraDoPlano ? (
                <div className="flex flex-col gap-2">
                  <Label>Tipo de atividade</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTIVITY_CATEGORIES.map((categoria) => (
                      <button
                        key={categoria}
                        type="button"
                        onClick={() => setTipoAcao(categoria)}
                        aria-pressed={tipoAcao === categoria}
                        className={cn(
                          "flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
                          tipoAcao === categoria
                            ? "border-primary/40 bg-primary/5 ring-2 ring-primary/15"
                            : "border-border bg-card hover:border-border-hover hover:bg-muted"
                        )}
                      >
                        <CategoryIconBox category={categoria} />
                        <span className="text-xs font-medium leading-tight">
                          {CATEGORY_LABELS[categoria]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* A evidência JÁ está aqui: a grade abre com as fotos do
                  envio e o tracejado vira só o "+ mais uma". Abrir vazia
                  pedindo anexo fazia a pessoa achar que a foto dela tinha
                  se perdido no caminho. */}
              <div className="flex flex-col gap-2">
                <Label>
                  Fotos{" "}
                  <span className="font-normal text-muted-foreground">
                    {registro.fotos.length === 1
                      ? "· 1 do envio"
                      : `· ${registro.fotos.length} do envio`}
                  </span>
                </Label>
                <PhotoAttach
                  photos={[
                    ...fotosDoEnvio,
                    ...photos.map((foto) => ({ id: foto.id, url: foto.url })),
                  ]}
                  lockedIds={fotosDoEnvio.map((foto) => foto.id)}
                  onAdd={addFiles}
                  onRemove={removePhoto}
                  inputRef={fileRef}
                />
                {rejected ? (
                  <p className="text-xs text-destructive" role="alert">
                    Alguma foto foi ignorada: use JPG, PNG ou WEBP até 10MB.
                  </p>
                ) : null}
              </div>

              {foraDoPlano ? (
                <div className="flex flex-col gap-2">
                  <Label>Meta do plano</Label>
                  <MetaPicker
                    metas={metas}
                    value={metaId}
                    onChange={setMetaId}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {erro ? (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {erro}
            </p>
          ) : null}
        </div>

        {/* Voltar à esquerda e primária à direita, como no wizard. O
            fechar mora no X do cabeçalho: um botão para sair e outro
            para recuar são coisas diferentes e não podem dividir o
            mesmo canto. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          <div>
            {escolha !== null ? (
              <Button
                variant="outline"
                onClick={() => setEscolha(null)}
                disabled={pending}
              >
                Voltar
              </Button>
            ) : null}
          </div>
          <Button
            variant="brand"
            size="lg"
            className="h-10"
            disabled={!podeSalvar || pending}
            onClick={() => void salvar()}
          >
            {pending ? <Spinner /> : <Check className="size-4" />}
            {atividadeEscolhida ? "Concluir atividade" : "Registrar"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
