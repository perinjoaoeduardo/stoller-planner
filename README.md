# Stoller Planner

Protótipo de planejamento e execução comercial para os canais de
distribuição da Stoller. Substitui o uso do Microsoft Planner com um
fluxo próprio: **Problema → Atividades → Resultado**, por safra e por
canal — do plano feito em conjunto com o canal até o Relatório de Safra
com evidências fotográficas.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS v4 + shadcn/ui (preset customizado, base-ui)
- Supabase (Postgres, Auth, Storage) — sem RLS nesta fase de protótipo;
  a segurança é a camada de escopo em `lib/auth/scope.ts`
- TanStack Table, Recharts, react-hook-form + zod, date-fns (ptBR)

## Rodando local

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Crie um `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # scripts de seed
```

Banco: migrations em `supabase/migrations` (aplicar com
`supabase db push`). Usuários de auth: `pnpm tsx scripts/create-auth-users.ts`.
Fotos de demonstração do Storage: `pnpm tsx scripts/seed-demo-photos.ts`.

## Usuários de demonstração

Senha padrão de todos: `stoller123` (botões de acesso rápido no /login).

| Perfil | Usuário | Email |
| --- | --- | --- |
| DSM (gestor de canais) | Carlos Menezes | carlos.menezes@stoller.dev |
| RTV (consultor técnico) | Bruno Cardoso | bruno.cardoso@stoller.dev |
| CX (excelência comercial) | Camila Duarte | camila.duarte@stoller.dev |

## Canal vitrine da demo

**AgroVale Distribuidora** (Regional Centro-Oeste, DSM Carlos Menezes):
5 problemas mapeados, 14 atividades ao longo da Safra 2025/26, maioria
concluída com registros de execução e galeria de fotos. É o canal a
abrir no **Relatório de Safra** (`/canais/<id>/relatorio` ou menu
Relatórios). Os canais Terra Boa e Plantar ficam propositalmente
"no escuro" para demonstrar o painel de acompanhamento do CX.
