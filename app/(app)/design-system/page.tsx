import {
  ArrowUpRight,
  CalendarClock,
  Sprout,
  Store,
} from "lucide-react";

import { CategoryBadge } from "@/components/app/category-badge";
import { PageShell } from "@/components/app/page-shell";
import { CanalCard } from "@/components/shared/canal-card";
import { ClickableCard, NeutralChip } from "@/components/shared/clickable-card";
import { CategoryIconBox, IconBox } from "@/components/shared/icon-box";
import { StatCard } from "@/components/shared/stat-card";
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS } from "@/lib/config";
import {
  ACTIVITY_STATUSES,
  StatusBadge,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

/**
 * Design System interno — snapshot vivo da Constituição Visual. Rota
 * escondida do menu (só quem sabe a URL /design-system chega). Serve de
 * guarda-corpo contra regressões e onboarding pra novos componentes.
 */
export default function DesignSystemPage() {
  return (
    <PageShell
      title="Design System"
      description="Snapshot vivo da Constituição Visual — tokens, camadas, componentes canônicos e regras de aplicação. Rota interna, não aparece no menu."
    >
      <div className="flex flex-col gap-10">
        <PaletteSection />
        <LayersSection />
        <SemanticsSection />
        <PillarsSection />
        <TypographySection />
        <ShadowMotionSection />
        <ComponentsSection />
      </div>
    </PageShell>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint ? (
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Swatch de token — chip colorido em cima, legenda abaixo (em card, não
 * sobreposta). Evita brigar com contraste do próprio swatch.
 */
function TokenSwatch({
  name,
  token,
}: {
  name: string;
  token: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-card">
      <div
        className="h-14 rounded-md border border-border/60"
        style={{ background: `var(${token})` }}
      />
      <div className="px-1 pb-1">
        <p className="text-xs font-medium leading-tight">{name}</p>
        <code className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
          {token}
        </code>
      </div>
    </div>
  );
}

function PaletteSection() {
  const bluePalette = [
    { name: "Blue Black", token: "--blue-black" },
    { name: "Blue 950", token: "--blue-950" },
    { name: "Blue 900", token: "--blue-900" },
    { name: "Blue 800", token: "--blue-800" },
    { name: "Blue 700", token: "--blue-700" },
    { name: "Blue 600", token: "--blue-600" },
    { name: "Blue 500 · Corteva", token: "--blue-500" },
    { name: "Blue 400", token: "--blue-400" },
    { name: "Blue 300", token: "--blue-300" },
    { name: "Blue 200", token: "--blue-200" },
    { name: "Blue 100", token: "--blue-100" },
  ];
  return (
    <Section
      title="Paleta Corteva"
      hint="Blue 500 é o acento oficial (accent-brand). Blue Black é o 'preto' do app — foreground e primária escura."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
        {bluePalette.map((c) => (
          <TokenSwatch key={c.name} name={c.name} token={c.token} />
        ))}
      </div>
    </Section>
  );
}

function LayersSection() {
  const layers = [
    {
      name: "Camada 0 · Canvas",
      token: "--background",
      role: "Fundo da página",
    },
    { name: "Camada 1 · Card", token: "--card", role: "Container principal" },
    {
      name: "Camada 2 · Subtle",
      token: "--subtle",
      role: "Sub-container dentro do card",
    },
    {
      name: "Camada 3 · Muted",
      token: "--muted",
      role: "Input, chip, quadradinho de ícone",
    },
  ];
  return (
    <Section
      title="4 Camadas de cinza"
      hint="Profundidade sem linhas. Nunca duas camadas iguais encostadas. Linhas só em header de tabela, rodapé de painel e borda de card."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {layers.map((l) => (
          <div
            key={l.token}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div
              className="h-16 rounded-lg border border-border"
              style={{ background: `var(${l.token})` }}
            />
            <div>
              <p className="text-sm font-semibold">{l.name}</p>
              <code className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
                {l.token}
              </code>
              <p className="mt-1 text-xs text-muted-foreground">{l.role}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SemanticsSection() {
  const tokens = [
    {
      name: "Accent Brand",
      token: "--accent-brand",
      role: "1x por card: CTA primário, dado destaque, selecionado",
    },
    {
      name: "Warning",
      token: "--warning",
      role: "Âmbar — atraso, alerta que não é bloqueante",
    },
    {
      name: "Success",
      token: "--success",
      role: "Verde — conclusão, sucesso",
    },
    {
      name: "Destructive",
      token: "--destructive",
      role: "Vermelho — só em prazo vencido aberto (texto)",
    },
  ];
  return (
    <Section
      title="Tokens semânticos"
      hint="Alarme único: badge OU texto, nunca os dois."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tokens.map((t) => (
          <div
            key={t.token}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div
              className="h-12 rounded-lg"
              style={{ background: `var(${t.token})` }}
            />
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <code className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
                {t.token}
              </code>
              <p className="mt-1 text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PillarsSection() {
  return (
    <Section
      title="Pilares — ícone por tipo de atividade"
      hint="Categoria é distinguida pelo ÍCONE + rótulo, nunca por cor: as 4 cores pastel eram idênticas (não separavam nada) e competiam com o azul. Agora neutras. Propaga via CategoryIconBox e CategoryBadge — não pintar categoria manualmente."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIVITY_CATEGORIES.map((category) => (
          <div
            key={category}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2.5">
              <CategoryIconBox category={category} size="lg" />
              <p className="text-sm font-semibold leading-tight">
                {CATEGORY_LABELS[category]}
              </p>
            </div>
            <CategoryBadge category={category} className="self-start" />
          </div>
        ))}
      </div>
    </Section>
  );
}

function TypographySection() {
  const scale = [
    { cls: "text-xs", label: "text-xs", note: "Meta, timestamp, sublabel" },
    { cls: "text-sm", label: "text-sm", note: "Corpo padrão, label, chip" },
    { cls: "text-base", label: "text-base", note: "Corpo maior, textarea" },
    { cls: "text-lg", label: "text-lg", note: "Título de seção" },
    { cls: "text-2xl", label: "text-2xl", note: "Header de card grande" },
    { cls: "text-3xl", label: "text-3xl", note: "Título de página" },
  ];
  return (
    <Section
      title="Tipografia"
      hint="4 tamanhos operacionais (xs/sm/base-lg/2xl-3xl). Hierarquia por peso e cor, não por diferença de tamanho. Uppercase só em header de tabela."
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableBody>
            {scale.map((row) => (
              <TableRow key={row.cls} className="last:border-b-0">
                <TableCell
                  className={`${row.cls} px-4 py-3 font-medium tracking-tight`}
                >
                  Aa
                </TableCell>
                <TableCell className="w-32 px-4 py-3">
                  <code className="text-xs tabular-nums text-muted-foreground">
                    {row.label}
                  </code>
                </TableCell>
                <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                  {row.note}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

function ShadowMotionSection() {
  return (
    <Section
      title="Sombras e motion"
      hint="Light usa sombra sutil; dark usa profundidade só por camadas (shadow-card = none). Motion tem 2 easings — standard pra bg/color e emphasized pra decorativo."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
          <p className="text-sm font-semibold">shadow-card</p>
          <p className="text-xs text-muted-foreground">
            Sombra padrão de card. Dark = none.
          </p>
          <div className="mt-2 h-16 rounded-lg border border-border bg-card shadow-card" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
          <p className="text-sm font-semibold">shadow-elevated</p>
          <p className="text-xs text-muted-foreground">
            Card em hover, popover, dropdown. Sai do plano.
          </p>
          <div className="mt-2 h-16 rounded-lg border border-border bg-card shadow-elevated" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
          <p className="text-sm font-semibold">Motion tokens</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">duration-fast</dt>
            <dd className="text-right font-mono tabular-nums">120ms</dd>
            <dt className="text-muted-foreground">duration-base</dt>
            <dd className="text-right font-mono tabular-nums">200ms</dd>
            <dt className="text-muted-foreground">duration-slow</dt>
            <dd className="text-right font-mono tabular-nums">320ms</dd>
            <dt className="text-muted-foreground">ease-standard</dt>
            <dd className="text-right font-mono tabular-nums">cubic-bezier(.4, 0, .2, 1)</dd>
            <dt className="text-muted-foreground">ease-emphasized</dt>
            <dd className="text-right font-mono tabular-nums">cubic-bezier(.16, 1, .3, 1)</dd>
          </dl>
        </div>
      </div>
    </Section>
  );
}

function ComponentsSection() {
  const mockCanal = {
    id: "demo",
    name: "AgroVale Distribuidora",
    region: "Centro-Oeste",
    problemCount: 4,
    activityCount: 21,
    branchCount: 6,
    completedPercent: 62,
    health: "atencao" as const,
    lateCount: 3,
  };
  return (
    <Section
      title="Componentes canônicos"
      hint="Um componente por situação — importar do design system em vez de recriar. Toda regressão aqui vira drift em tela."
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">StatCard</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            tone: neutral · warning. Sem ícone por padrão (título + número já dizem tudo). O único acento colorido é o alerta âmbar; dado-âncora fica no foreground (o azul da marca vive nos CTAs, não nos KPIs).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Métrica" value={128} sublabel="tone=neutral" />
            <StatCard title="Outra métrica" value={64} sublabel="tone=neutral" />
            <StatCard
              title="Alerta"
              value={3}
              sublabel="tone=warning"
              tone="warning"
            />
            <StatCard
              title="Filtro ativo"
              value={12}
              sublabel="interactive + active"
              interactive
              active
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">StatusBadge</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-card">
            {ACTIVITY_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">CanalCard</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            variant=&quot;compact&quot; (home) e &quot;full&quot; (Meus Canais).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <CanalCard canal={mockCanal} variant="compact" href="#" />
            <CanalCard canal={mockCanal} variant="full" href="#" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            ClickableCard + NeutralChip + CardArrow
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Passe o mouse pra ver a seta deslizar (duration-slow ease-emphasized).
          </p>
          <div className="mt-3">
            <ClickableCard href="#" showArrow className="flex flex-col gap-2 p-4">
              <p className="text-sm font-semibold">Card clicável canônico</p>
              <div className="flex flex-wrap gap-1.5">
                <NeutralChip>4 metas</NeutralChip>
                <NeutralChip emphasis>21 atividades</NeutralChip>
                <NeutralChip>6 filiais</NeutralChip>
              </div>
            </ClickableCard>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">IconBox</p>
          <div className="mt-3 flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
            <IconBox icon={Sprout} size="sm" />
            <IconBox icon={CalendarClock} size="md" />
            <IconBox icon={Store} size="lg" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Button — todas as variants
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <Button>Default</Button>
            <Button variant="brand">
              <ArrowUpRight />
              Brand (CTA)
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Card base (shadcn/ui)
          </p>
          <div className="mt-3">
            <Card className="p-6">
              <p className="text-sm">
                O container de mais alto nível. Toda tela deve começar aqui —
                nada solto no fundo da página.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Section>
  );
}
