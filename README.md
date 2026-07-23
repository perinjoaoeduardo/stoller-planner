# Stoller Planner

Protótipo de planejamento e execução comercial para os canais de
distribuição da Stoller. Substitui o uso do Microsoft Planner com um
fluxo próprio: **Problema (meta) → Atividades → Resultado**, por safra e
por canal — do plano feito em conjunto com o canal até o Relatório de
Safra com evidências fotográficas.

Três experiências sobre o mesmo dado, decididas pelo perfil no login:

| Perfil | Experiência | Home |
| --- | --- | --- |
| **RTV** (consultor de campo) | Leve, mobile-first, registro rápido | `/` (saudação + minhas atividades) |
| **DSM** (gestor de canais) | Cockpit denso de gestão | `/` (painel de exceções) |
| **CX** (excelência comercial) | Acompanhamento nacional | `/visao-geral` |

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript — `proxy.ts` é o
  middleware (refresh de sessão Supabase)
- Tailwind CSS v4 + shadcn/ui (preset `base-luma` — ver `components.json`)
- Supabase (Postgres, Auth, Storage) — **sem RLS** nesta fase; a
  segurança é a camada de escopo em `lib/auth/scope.ts`
- TanStack Table, Recharts, react-hook-form + zod, date-fns (ptBR)

## Rodando local

```bash
pnpm install
cp .env.local.example .env.local   # preencha com as chaves do dashboard Supabase
pnpm dev                           # http://localhost:3000
```

`.env.local` (3 variáveis, todas no `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=...       # também alimenta o next/image (next.config.ts)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # SÓ para os scripts de seed (nunca no client)
```

## Banco do zero (ordem importa)

```bash
npx supabase db push                        # 1. migrations (supabase/migrations)
pnpm tsx scripts/create-auth-users.ts       # 2. usuários de auth ↔ profiles
pnpm tsx scripts/create-avatars-bucket.ts   # 3. bucket de avatars (não é criado por migration)
pnpm tsx scripts/seed-demo-photos.ts        # 4. fotos de demonstração no Storage
pnpm tsx scripts/seed-dia-a-dia.ts          # 5. povoa atividades/notas realistas (re-rodável)
```

O `seed-dia-a-dia` é idempotente: remove atividades-lixo de teste,
regenera as do catálogo e completa cada canal com rotina realista
(timeline, notas de mural, resultados de meta). Rode de novo sempre que
a base de demo ficar bagunçada.

## Onde configurar o quê

| Quero mudar… | Onde |
| --- | --- |
| Parâmetros de negócio (dias de "canal no escuro", atraso crítico, paginação, limites de notas) | `lib/config.ts` |
| Categorias de atividade e labels | `lib/config.ts` (+ CHECK no banco) |
| Regra de status derivado (atrasada) | `lib/db/status.ts` |
| Pipeline de fotos (limite, compressão, URLs do bucket) | `lib/photos.ts` |
| Tokens de cor/tema (light/dark, sidebar, gráficos) | `app/globals.css` (ver Constituição Visual em `/design-system`) |
| Quem vê o quê (escopo por perfil) | `lib/auth/scope.ts` |
| Textos/ícones da linha do tempo | `lib/activity-events.ts` |

## Estrutura

```
app/(app)/            rotas autenticadas (uma pasta por tela; loading.tsx = skeleton)
app/(auth)/           login, registro, recuperação de senha
components/ui/        shadcn — NÃO editar na mão (use o MCP/CLI do shadcn)
components/shared/    peças canônicas do produto (StatusBadge, StatCard, CanalCard, HealthMark…)
components/app/       componentes de feature (wizard, drawer, tabelas, gráficos)
lib/config.ts         parâmetros de negócio num só lugar
lib/photos.ts         pipeline único de fotos (bucket activity-photos)
lib/auth/             sessão + escopo por perfil
lib/db/               queries (server); lib/actions/ = server actions
hooks/                use-mobile, use-media-query
scripts/              seeds e utilitários (rodar com pnpm tsx)
supabase/migrations/  schema versionado
proxy.ts              middleware Next (refresh de sessão)
```

## Usuários de demonstração

Senha padrão de todos: `stoller123` (botões de acesso rápido no /login).

| Perfil | Usuário | Email |
| --- | --- | --- |
| DSM | Carlos Menezes | carlos.menezes@stoller.dev |
| RTV | Bruno Cardoso | bruno.cardoso@stoller.dev |
| CX | Fernanda Oliveira | fernanda.oliveira@stoller.dev |

## Deploy

Produção na Vercel (projeto `stoller-planner`): push na `master`
dispara o build via integração Git, ou `npx vercel --prod` manual.
As mesmas 2 variáveis `NEXT_PUBLIC_*` precisam existir nas settings do
projeto Vercel (a service role NÃO vai para lá).

## Convenções

- Commits em português imperativo curto; `pnpm lint` e `pnpm build`
  antes de commitar
- Identidade visual: regras permanentes na página `/design-system`
  (Constituição Visual) — ler antes de criar tela nova
- Todo texto de UI em pt-BR; datas com date-fns/ptBR
