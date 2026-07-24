# Stoller Planner — Diretrizes

## Sobre
Ferramenta de planejamento e execução comercial para distribuidores da
Stoller. Substitui Microsoft Planner. Duas experiências:
- Cockpit desktop DENSO (DSM, CX) — ferramenta de trabalho
- Mobile LEVE (RTV) — registro rápido, poucos toques

Conceito central: Problema → Atividades → Resultado, por safra, por
canal.

## Stack
Next.js 16 App Router, TS, Tailwind v4, shadcn/ui (preset customizado),
Supabase, pnpm.

## Padrões
- Server Components por padrão; client só quando necessário
- Data fetching no servidor
- Formulários: react-hook-form + zod
- Arquivos kebab-case, componentes PascalCase
- Todo texto de UI em português brasileiro
- Datas com date-fns e locale ptBR

## Identidade visual — LEIA ANTES DE CRIAR QUALQUER TELA
Implementações genéricas de shadcn ficam mornas. Evite.

### Princípios
- Simplicidade shadcn, mas nunca pobre: use os componentes ricos
- TODO agrupamento de informação vive dentro de Card/bloco. Nada solto
  no fundo da página
- Top bar em cor contrastante com o fundo (identidade do app); sidebar
  com fundo levemente destacado do conteúdo
- Dark e light mode sempre — teste os dois em toda tela nova
- Densidade ALTA no desktop; alvos ≥44px e simplicidade no mobile

### Componentes obrigatórios por situação
- Tabelas: DataTable com sort/filter/pagination, NUNCA <Table> pelado
- Navegação: Sidebar oficial (referência blocks sidebar-07/08)
- Busca/ações rápidas: Command palette (cmd+k)
- Edição em contexto: Sheet no desktop, Drawer no mobile
- Gráficos: Chart do shadcn com config de tema
- Seleção com busca (filiais, responsáveis): Combobox
- Listas ricas: Item/ItemGroup
- Status: sempre via <StatusBadge /> central
  (/components/shared/status-badge.tsx)

### Estados obrigatórios em toda tela
- Loading: Skeleton espelhando o layout final, nunca spinner central
- Empty: componente Empty com ícone lucide + copy orientativa + CTA
- Erro: mensagem clara + retry
- Sucesso: Sonner discreto

### Tipografia e números
- Títulos de página: text-3xl font-semibold via <PageShell />
- Labels e meta: text-sm text-muted-foreground
- Números e métricas: tabular-nums

### Referências antes de criar qualquer dashboard/tabela/sidebar
- ui.shadcn.com/blocks (copie estrutura, não invente)
- ui.shadcn.com/charts
Use o MCP do shadcn para buscar e instalar em vez de recriar.

## Estrutura
/app — rotas ((app) autenticado, (auth) público)
/components/ui — shadcn (não editar manualmente)
/components/shared — peças canônicas (StatusBadge, StatCard, CanalCard,
HealthMark, ActivityTable...)
/components/app — componentes de feature (wizard, drawer, tabelas)
/lib/config.ts — parâmetros de negócio num só lugar
/lib/photos.ts — pipeline único de fotos
/lib/auth — sessão + escopo por perfil
/lib/supabase — clients
/lib/db — queries (server); /lib/actions — server actions
/hooks — use-mobile, use-media-query
/scripts — seeds (pnpm tsx); proxy.ts — middleware

## Dados
Hierarquia: regions → channels → branches. Perfis: DSM, RTV, CX (RDC foi removido).
Vínculos em user_links definem o que cada um vê. Plano por canal por
safra; problems e activities pertencem ao plano; activity pode ter
problem_id nulo.

## Fluxo
- Commits em português imperativo curto
- pnpm lint e pnpm build antes de commitar
- Não invente features fora do escopo pedido
