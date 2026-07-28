# Handoff — rodada de UX e arquitetura

Escopo: 28 commits, de `1667233` a `37c323e` (92 arquivos, +3.526 / −4.270).
O saldo negativo é intencional: boa parte do trabalho foi **remover**
caminho duplicado e componente concorrente.

Complementa (não substitui) o `AGENTS.md`, que segue sendo a diretriz de
identidade visual e stack.

---

## 1. O problema que guiou tudo

O app tinha **três jeitos de listar atividade**, **duas telas para o
mesmo canal** e **cor sem contrato** — verde às vezes era conclusão, às
vezes "positivo"; vermelho às vezes era erro, às vezes prazo vencido.
Cada tela resolvida isoladamente somava carga cognitiva.

A rodada atacou isso em três frentes: **uma cor = um significado**, **um
componente por trabalho** e **cada elemento precisa de um motivo**.

---

## 2. Sistema de cor — agora é contrato

Vale para badge, gráfico, KPI e texto. Está em
`components/shared/status-badge.tsx` (`STATUS_ORDER`, `STATUS_CHART_COLORS`).

| Cor | Significa | Onde nasce |
|---|---|---|
| **Azul** (`info-bg/fg`) | Planejada — vai acontecer | badge, pill do calendário, KPI |
| **Verde** (`success`) | Concluída — aconteceu | badge, KPI, gráfico |
| **Âmbar** (`warning`) | Atrasada — devia ter acontecido | badge, prazo, KPI, canal no escuro |
| **Neutro** | Cancelada, ou total sem status | badge, KPI "Total" |
| **Vermelho** (`destructive`) | Só ação destrutiva e erro de formulário | nunca em status |

Famílias fora do vocabulário de status:

- **Pendências** têm cor própria — violeta = sem foto, teal = sem meta.
  Reusar âmbar ali fazia o usuário ler alarme de prazo onde só falta um
  anexo. (`--pend-foto-*`, `--pend-meta-*`)
- **Lavada de marca** (`--brand-wash`): azul lavadíssimo, **decorativo**.
  Quadradinho de ícone, avatar, chip de categoria. É igual para todos os
  casos, então não codifica nada e não custa leitura — só tira o cinza
  morto. Foi a resposta ao "removeu todos os tons sutis de azul".

**Regra do alarme único:** badge **ou** texto, nunca os dois. Atividade
vencida mostra o badge âmbar; a data ao lado fica neutra.
Exceção: `venceu há X dias` **é** âmbar (o alarme está no texto, e ali
não há badge competindo). Lógica única em `lib/deadline.ts`.

**Zero não ganha cor.** "0 atrasadas" em âmbar acende um alarme que não
existe — o `StatCard` neutraliza sozinho.

---

## 3. Lares canônicos (onde mexer)

Antes de criar componente novo, procure aqui.

| O quê | Arquivo |
|---|---|
| Ordem e cor de status | `components/shared/status-badge.tsx` |
| Cor/formato de prazo | `lib/deadline.ts` |
| **Lista de atividades (única do app)** | `app/(app)/minhas-atividades/my-activities-list.tsx` |
| Tabela densa | `components/shared/activity-table.tsx` |
| KPI | `components/shared/stat-card.tsx` |
| Nome de pessoa clicável | `components/shared/person-link.tsx` |
| Ícone por categoria | `lib/category-icons.ts` |
| Saudação (3 perfis) | `lib/rtv/greeting.ts` |
| Navegação por papel | `lib/auth/nav.ts` |
| Permissão em action | `lib/auth/scope.ts` (`canEditPlan`, `requireChannelAccess`) |

`MyActivitiesList` serve **todas** as listas: RTV, DSM, dentro do canal,
atrasadas do CX e perfil de pessoa. Props que mudam o comportamento:

- `showKpis={false}` — dentro do canal, que já tem cockpit próprio
- `responsibles` — liga filtro de responsável + coluna de avatares
- `currentUserId` — liga o toggle "Só minhas"
- Filtro em cascata **Regional → Canal → Filial → Meta**; cada nível
  derruba os de baixo, e com um canal só ele entra como foco automático
  (senão Filial e Meta ficavam presas a uma seleção impossível)

Componentes **removidos** por duplicarem isso: `activities-table.tsx`
(~1.4k linhas), `person-activities.tsx`, rota `/regioes`, rota
`/canais/[id]/notas`, rota `/equipe`.

---

## 4. O que mudou por perfil

### RTV (consultor de campo)
- Home é **lançador**, não cópia: 4 KPIs + preview das 5 mais urgentes
- KPIs: Abertas (neutro) · Esta semana (azul) · Precisam de atenção
  (âmbar) · Concluídas (verde, com %)
- Canal abre com **"Só minhas" ligado** — o modelo mental dele é o
  próprio trabalho
- Pendências mostram **só as dele** (só consegue resolver essas)
- Registrar: **foto antes do texto** — no campo a evidência é o que importa
- Menu com 4 itens (Relatórios saiu: já abre por dentro do canal)

### DSM (gestor de canais)
- Home: 4 KPIs cobrindo a **carteira** (risco, execução %, atrasadas) e
  o que é dele
- Canal: aba "Visão geral" removida — os gráficos repetiam em barras o
  que os KPIs dizem em número; **a lista é a tela**
- Cockpit: "Vencem em 7 dias" → **"Último registro"**, o único dado que
  não dá para deduzir do resto da tela
- Metas e Notas viraram **drawer lateral**, não aba/rota

### CX (excelência comercial)
- **"Todas as Atividades"** no menu — vê tudo, com filtro por regional
- **Regiões** removida: já navega por Canais e Acompanhamento, e região
  é atributo do canal, não destino de trabalho (o gráfico por região na
  Visão geral fica — ali é análise)
- Atrasadas do Acompanhamento na lista canônica
- **Time do canal** (`/canais/[id]/pessoas`): tela nova, ver §5

---

## 5. Tela nova — Time do canal

`/canais/[id]/pessoas` · `lib/db/channel-people.ts` ·
`lib/actions/channel-people.ts`

Existe porque o vínculo pessoa↔canal **só nascia por migration**: dava
para ver o trabalho de alguém, nunca para dizer quem entra ou sai.

Decisões que valem manter:

- **O formato do vínculo vem do papel, não de um seletor.** DSM responde
  pelo canal (`channel_id`); RTV atua por filial (`branch_id`). Deixar
  isso como escolha abriria espaço para vínculo sem sentido.
- **Editar filiais mexe só nas filiais daquele canal** — a pessoa pode
  atuar em outros, e um replace global apagaria isso silenciosamente.
- **Tirar do time não reatribui atividade.** Quem sai não some do
  histórico; o diálogo diz isso.
- **CX não é candidato** — já vê tudo, então "vincular CX a um canal"
  não significa nada.
- Permissão: mesma régua de `canEditPlan` (CX e o DSM do próprio canal).

Fluxo verificado ponta a ponta no browser (adicionar, editar, remover).

---

## 6. Armadilhas conhecidas

Cada uma destas me custou tempo real nesta rodada.

1. **`"use client"` tem de ser a PRIMEIRA linha.** Comentário antes dela
   não vale — a diretiva é ignorada em silêncio. Foi o que quebrou a
   página de Pendências (`PersonLink` passava `onClick` ao `Link` a
   partir do servidor).
2. **Âncora dentro de âncora/botão é HTML inválido.** As linhas de
   Pendências já são `<button>` (o `ActivityLink` abre o painel), então
   nome de pessoa ali é texto, não link.
3. **Erro fantasma do dev server.** O Turbopack segura bundle antigo
   mesmo depois de `next build` limpo e `.next` apagado. Se o erro
   persiste, **abra uma aba nova** — foi o que resolveu todas as vezes.
4. **Comentário JSX `{/* */}` não pode ficar dentro de ternário**
   (`cond ? {/* ... */} <div/> : null`) — vira erro de parse. Use `//`
   acima do bloco.
5. **PowerShell corrompe acento** ao reescrever arquivo (`Set-Content`
   sem `-Encoding utf8`). Use as ferramentas de edição, não redirect de
   shell.
6. **Commit com acento/aspas**: escreva a mensagem num arquivo e use
   `git commit -F`.

---

## 7. Aberto — precisa de decisão sua

### 🔴 Nomes das 5 regionais (bloqueado)
A base tem **3**: Centro-Oeste, Sul, Matopiba
(`supabase/migrations/20260705000002_seed_inicial.sql`). Você disse que
são **5**. Não dá para inventar nome de regional — é dado de negócio que
aparece para o cliente.

Preciso de: os 5 nomes; se as 3 atuais mudam de nome; e se as 2 novas
nascem com canal ou vazias. Se nascerem vazias, elas somem do gráfico
"por região" (montado a partir dos canais com plano ativo) — nesse caso
vale mudar o gráfico para partir da tabela de regionais, porque
"regional sem nenhum plano" é exatamente o buraco que o CX precisa ver.

### 🟡 Colisão de âmbar em Pendências
"Sem foto" é âmbar e o badge "Atrasada" também — podem cair na mesma
linha e disputar a leitura. Não mexi porque não foi pedido, mas é o
mesmo tipo de colisão que limpamos nos prazos.

---

## 8. Como rodar

```bash
pnpm dev
```

Deploy: push na `master` dispara a Vercel.
Produção: https://stoller-planner-puce.vercel.app
