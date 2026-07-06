# Stoller Planner — Diretrizes

## Sobre
Ferramenta de planejamento e execução comercial para distribuidores 
da Stoller. Substitui Microsoft Planner. Duas experiências:
- Cockpit desktop DENSO (DSM, CX) — ferramenta de trabalho
- Mobile LEVE (RTV) — registro rápido, poucos toques

## Stack
Next.js 15 App Router, TS, Tailwind v4, shadcn/ui, Supabase, pnpm.

## Padrões
- Server Components por padrão
- Data fetching no servidor
- Formulários: react-hook-form + zod
- Arquivos kebab-case, componentes PascalCase
- Tipos derivados do schema Supabase

## Diretrizes visuais — LEIA ANTES DE CRIAR TELAS

Implementações genéricas de shadcn ficam mornas. Evite isso.

### Densidade e hierarquia
- Desktop = ferramenta de trabalho, densidade ALTA
- Tipografia com hierarquia forte: text-3xl font-semibold em títulos, 
  text-sm text-muted-foreground em labels, tabular-nums em números
- Nunca deixe tela vazia sem empty state desenhado 
  (lucide icon grande + copy + CTA)

### Componentes ricos — use os elaborados
- Tabelas: DataTable com sort/filter/pagination/column visibility, 
  NUNCA <Table> pelado
- Navegação: Sidebar (referência: sidebar-07 ou sidebar-08 dos blocks)
- Ações rápidas: Command palette (cmd+k) desde o início
- Detalhes: Sheet lateral no desktop, Drawer no mobile
- Gráficos: Charts do shadcn (recharts) com config de tema
- Formulários: Form + FieldSet, agrupamento visual

### Estados
- Loading: Skeletons que espelham o layout, nunca spinner central
- Empty: ilustração + copy + CTA
- Erro: mensagem clara + retry
- Success: Sonner discreto

### Cor e status (Badges)
- Planejada: outline
- Em andamento: secondary
- Concluída no prazo: emerald (bg-emerald-500/15 text-emerald-700)
- Atrasada: âmbar
- Não feita: destructive
- Primary com moderação — UI é neutra, cor é sinal

### Mobile
- Bottom navigation com ≥3 seções
- Alvos de toque ≥44px
- inputMode e autocomplete corretos

### Referências obrigatórias antes de criar
- ui.shadcn.com/blocks
- ui.shadcn.com/charts
Copie estrutura dos blocks, não invente.

## Estrutura
/app — rotas
/components/ui — shadcn (não editar)
/components/app — componentes do produto
/lib/supabase — clients
/lib/db — queries reutilizáveis
/lib/types — tipos

## Fluxo
- Commits em português imperativo curto
- pnpm lint e pnpm build antes de commitar
- Não invente features fora do escopo pedido
