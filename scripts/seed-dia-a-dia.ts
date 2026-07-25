/**
 * Faxina + povoamento "dia a dia" do protótipo.
 *
 * 1. Remove atividades-lixo de teste (títulos tipo "vfvfvfvfv", "k8k8k",
 *    "Teste ... — pode excluir") — o cascade limpa eventos/assignees/fotos.
 * 2. Completa cada canal com atividades realistas (títulos/descrições de
 *    rotina comercial agro), distribuídas em concluídas, planejadas,
 *    atrasadas e canceladas, com responsáveis reais dos vínculos.
 * 3. Escreve linha do tempo verossímil (criada + execução registrada +
 *    status alterado) nas concluídas.
 * 4. Semeia notas de canal (mural) e resultados de metas.
 *
 * Idempotente por título: não duplica atividade/nota que já existe.
 *
 * Uso: npx tsx scripts/seed-dia-a-dia.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const db = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Faxina ─────────────────────────────────────────────────────────────

const JUNK_PATTERNS: RegExp[] = [
  /^[^\p{L}\p{N}]+$/u, // só pontuação/símbolo, sem letra nem número (¿?¿?, ",,")
  /pode excluir/i,
  /^teste\b/i,
  /^v[fv]+v?$/i, // vfvfvfvfv
  /^[k8o]{3,}[,.]?$/i, // k8k8k, 8o8o8
  /^t?h[th]+$/i, // ththh, hththtththth
  /^h[th]+$/i,
  /^[,.\s]+$/, // ",,"
  /^,k[,k]*,?$/i, // ,K,K,K,
  /^(li)+l?$/i, // LILIL / LILILIL
  /^(mu)+m?u?$/i, // MUMUMU
  /^(ju)+j?$/i, // JUJUJ
  /^vd(vd)+v?$/i, // VDVDVDV
  /^çp+[çp]*$/i, // ÇPPÇPÇP
  /^k?ku[ku]+$/i, // KKUKUK
];

const isJunk = (title: string) =>
  JUNK_PATTERNS.some((rx) => rx.test(title.trim()));

// ── Catálogo realista ──────────────────────────────────────────────────

type Cat = "reuniao_gerente" | "treinamento" | "rodada_canal" | "geracao_demanda";

type Template = {
  category: Cat;
  title: string;
  description: string;
  relato: string;
};

const CATALOG: Template[] = [
  {
    category: "reuniao_gerente",
    title: "Reunião de resultados do trimestre com a gerência",
    description: "Revisar sell-out, cobertura de carteira e metas do próximo trimestre com o gerente comercial.",
    relato: "Fechamos plano de ação para recuperar o gap de fungicidas; gerente assumiu meta de +8% no trimestre.",
  },
  {
    category: "reuniao_gerente",
    title: "Alinhamento de metas de campanha com o gerente",
    description: "Definir volumes e mecânica da campanha de pré-plantio com a liderança do canal.",
    relato: "Campanha aprovada com 3 SKUs foco; canal vai premiar os 5 melhores vendedores.",
  },
  {
    category: "reuniao_gerente",
    title: "Revisão do funil de oportunidades com a liderança",
    description: "Passar conta a conta as oportunidades acima de 500 ha e destravar as paradas.",
    relato: "12 oportunidades revisadas; 4 destravadas com visita conjunta marcada.",
  },
  {
    category: "treinamento",
    title: "Treinamento técnico em biológicos para o balcão",
    description: "Capacitar a equipe de balcão no posicionamento da linha de biológicos e principais objeções.",
    relato: "9 vendedores treinados; simulação de venda ao final com nota média 8,5.",
  },
  {
    category: "treinamento",
    title: "Capacitação em nutrição foliar para vendedores",
    description: "Programa prático de recomendação de foliares por estádio fenológico da soja.",
    relato: "Equipe completa presente; material de bolso entregue e quiz final aplicado.",
  },
  {
    category: "treinamento",
    title: "Workshop de posicionamento do portfólio de inverno",
    description: "Preparar o time para a janela de trigo e milho safrinha com o portfólio atualizado.",
    relato: "Workshop de meio período; 3 dúvidas críticas de posicionamento resolvidas ao vivo.",
  },
  {
    category: "rodada_canal",
    title: "Rodada de visitas às lojas da filial",
    description: "Circuito pelas lojas para checar exposição, estoque e giro das linhas prioritárias.",
    relato: "4 lojas visitadas; ponto extra negociado em 2 e ruptura corrigida na loja central.",
  },
  {
    category: "rodada_canal",
    title: "Visita conjunta a clientes-chave com o vendedor",
    description: "Acompanhar o vendedor nos 3 maiores clientes da carteira para reforçar a proposta técnica.",
    relato: "3 visitas realizadas; pedido adicional fechado no segundo cliente.",
  },
  {
    category: "rodada_canal",
    title: "Acompanhamento de estoque e giro no balcão",
    description: "Conferir posição de estoque das linhas foco e alinhar reposição com o comprador.",
    relato: "Estoque de biológicos zerado — reposição emergencial combinada para a semana.",
  },
  {
    category: "geracao_demanda",
    title: "Dia de campo com produtores de soja",
    description: "Demonstração de resultado do protocolo em área parceira, com estações técnicas.",
    relato: "38 produtores presentes; 11 pediram orçamento na saída.",
  },
  {
    category: "geracao_demanda",
    title: "Ensaio demonstrativo na fazenda parceira",
    description: "Implantar faixa demonstrativa comparando protocolo atual vs. recomendado.",
    relato: "Faixa implantada e georreferenciada; avaliação marcada para 30 dias.",
  },
  {
    category: "geracao_demanda",
    title: "Palestra técnica para cooperados",
    description: "Apresentar dados regionais de resposta a bioestimulantes na cultura da soja.",
    relato: "Auditório cheio (60+ cooperados); cooperativa pediu repetição na filial oeste.",
  },
  {
    category: "reuniao_gerente",
    title: "Planejamento conjunto da safra com a diretoria",
    description: "Construir o plano de volumes por linha e por filial para a próxima safra.",
    relato: "Plano fechado por filial; diretoria pediu revisão mensal no primeiro trimestre.",
  },
  {
    category: "treinamento",
    title: "Onboarding técnico dos vendedores novos",
    description: "Trilha básica de portfólio e argumentação para os contratados do semestre.",
    relato: "5 novos vendedores formados; buddy definido para cada um.",
  },
  {
    category: "rodada_canal",
    title: "Checagem de execução da campanha no PDV",
    description: "Verificar materiais, preço sugerido e mecânica da campanha nas lojas participantes.",
    relato: "Campanha bem executada em 3 de 4 lojas; ajuste de material na quarta.",
  },
  {
    category: "geracao_demanda",
    title: "Circuito de visitas a fazendas com o agrônomo do canal",
    description: "Levar o protocolo recomendado a 5 fazendas-alvo mapeadas com o time técnico.",
    relato: "5 fazendas visitadas; 2 áreas de teste fechadas com plantio na próxima janela.",
  },
];

const NOTES: string[] = [
  "Comprador sinalizou abertura para ampliar a linha de biológicos na próxima negociação — levar dados do ensaio regional.",
  "Time de balcão trocou bastante nas últimas semanas; vale repetir o treinamento básico de portfólio no próximo mês.",
  "Canal tem forte relação com a cooperativa vizinha — oportunidade de evento conjunto de geração de demanda.",
  "Gerente prefere reuniões na segunda de manhã; agenda de sexta costuma ser cancelada.",
  "Concorrente intensificou ações de barter na região — monitorar impacto no mix das próximas semanas.",
  "Loja central é vitrine do canal: manter exposição impecável das linhas foco, o gerente mostra a loja para visitas.",
];

const RESULTADOS: string[] = [
  "Share da linha voltou a crescer: de 11% para 15% no fechamento da safra.",
  "Equipe treinada e argumentário unificado — objeção de preço caiu das top 3 do funil.",
  "Cliente-chave retomou volume histórico após plano de visitas conjunto.",
  "Meta parcialmente atingida: demanda gerada nas fazendas-alvo, conversão fica para a próxima janela.",
];

// ── Datas (relativas a hoje) ───────────────────────────────────────────

const DAY = 86_400_000;
const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * DAY);

// Pseudo-random determinístico (mesmo resultado a cada execução).
let seed = 42;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  // Inventário
  const results = await Promise.all([
    db.from("channels").select("id, name"),
    db.from("branches").select("id, name, channel_id"),
    db.from("plans").select("id, channel_id, harvest, status").eq("status", "ativo"),
    db.from("problems").select("id, plan_id, title, resultado"),
    db.from("profiles").select("id, full_name, role"),
    db.from("user_links").select("profile_id, channel_id, branch_id"),
    db.from("activities").select("id, title, plan_id, status"),
    db.from("channel_notes").select("id, body"),
  ]);
  for (const r of results) if (r.error) throw r.error;
  // Script utilitário sem tipos gerados do banco — linhas soltas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Row = Record<string, any>;
  const [channels, branches, plans, problems, profiles, links, activities, notes] =
    results.map((r) => r.data!) as unknown as [
      Row[], Row[], Row[], Row[], Row[], Row[], Row[], Row[],
    ];

  // 0) Regenera as atividades semeadas por este script (identificáveis
  //    pelo título do catálogo): garante que re-rodar aplica a regra
  //    atual de responsáveis sem duplicar.
  const catalogTitles = new Set(CATALOG.map((t) => t.title));
  const seeded = activities.filter((a) => catalogTitles.has(a.title));
  if (seeded.length > 0) {
    const { error } = await db.from("activities").delete().in("id", seeded.map((s) => s.id));
    if (error) throw error;
    console.log(`\n— Regeneração: ${seeded.length} atividades do catálogo removidas para recriar`);
    for (const s of seeded) {
      const i = activities.indexOf(s);
      if (i >= 0) activities.splice(i, 1);
    }
  }

  // 1) Faxina
  const junk = activities.filter((a) => isJunk(a.title));
  console.log(`\n— Faxina: ${junk.length} atividades-lixo`);
  for (const j of junk) console.log(`   ✗ ${JSON.stringify(j.title)}`);
  if (junk.length > 0) {
    const { error } = await db.from("activities").delete().in("id", junk.map((j) => j.id));
    if (error) throw error;
  }
  const junkNotes = notes.filter((n) => isJunk(n.body));
  if (junkNotes.length > 0) {
    await db.from("channel_notes").delete().in("id", junkNotes.map((n) => n.id));
    console.log(`   ✗ ${junkNotes.length} notas-lixo`);
  }

  const keptTitles = new Set(
    activities.filter((a) => !isJunk(a.title)).map((a) => `${a.plan_id}|${a.title}`)
  );

  // Pessoas por canal (via user_links; branch_id resolve para o canal da filial)
  const branchChannel = new Map(branches.map((b) => [b.id, b.channel_id]));
  const peopleByChannel = new Map<string, string[]>();
  for (const l of links) {
    const ch = l.channel_id ?? (l.branch_id ? branchChannel.get(l.branch_id) : null);
    if (!ch) continue;
    const list = peopleByChannel.get(ch) ?? [];
    if (!list.includes(l.profile_id)) list.push(l.profile_id);
    peopleByChannel.set(ch, list);
  }
  const profileName = new Map(profiles.map((p) => [p.id, p.full_name]));
  const fallbackPeople = profiles.filter((p) => p.role === "RTV").map((p) => p.id);

  // 2) População por canal
  let createdCount = 0;
  let eventCount = 0;
  for (const plan of plans) {
    const channel = channels.find((c) => c.id === plan.channel_id)!;
    const chBranches = branches.filter((b) => b.channel_id === channel.id);
    const chProblems = problems.filter((p) => p.plan_id === plan.id);
    const people = peopleByChannel.get(channel.id) ?? fallbackPeople;

    // O dia a dia é do RTV: 70% das atividades caem com os RTVs
    // vinculados ao canal (senão home/calendário deles ficam vazios).
    const rtvSet = new Set(profiles.filter((p) => p.role === "RTV").map((p) => p.id));
    const channelRtvs = people.filter((p) => rtvSet.has(p));
    const pickResponsible = () =>
      channelRtvs.length > 0 && rnd() < 0.7 ? pick(channelRtvs) : pick(people);

    const existing = activities.filter(
      (a) => a.plan_id === plan.id && !isJunk(a.title)
    ).length;
    const target = 14;
    const toCreate = Math.max(0, target - existing);
    if (toCreate === 0) {
      console.log(`\n— ${channel.name}: já tem ${existing} atividades, nada a criar`);
      continue;
    }
    console.log(`\n— ${channel.name}: ${existing} existentes → criando ${toCreate}`);

    // Mistura de status: ~metade concluída, ~40% planejada futura,
    // 1 atrasada, às vezes 1 cancelada.
    const mix: ("done" | "future" | "late" | "cancel")[] = [];
    for (let i = 0; i < toCreate; i++) {
      if (i === 0) mix.push("late");
      else if (i === 1 && toCreate >= 6) mix.push("cancel");
      else mix.push(rnd() < 0.55 ? "done" : "future");
    }

    const templates = [...CATALOG];
    for (const kind of mix) {
      const t = templates.length > 0
        ? templates.splice(Math.floor(rnd() * templates.length), 1)[0]
        : pick(CATALOG);
      const key = `${plan.id}|${t.title}`;
      if (keptTitles.has(key)) continue;
      keptTitles.add(key);

      const due =
        kind === "done" ? addDays(today, -Math.floor(rnd() * 80) - 3)
        : kind === "late" ? addDays(today, -Math.floor(rnd() * 15) - 4)
        : kind === "cancel" ? addDays(today, -Math.floor(rnd() * 40) - 10)
        : addDays(today, Math.floor(rnd() * 40) + 2);
      const createdAt = addDays(due, -14 - Math.floor(rnd() * 10));
      const responsible = pickResponsible();
      const secondAssignee = rnd() < 0.3 ? pick(people) : null;

      const { data: created, error } = await db
        .from("activities")
        .insert({
          plan_id: plan.id,
          problem_id: rnd() < 0.75 && chProblems.length > 0 ? pick(chProblems).id : null,
          branch_id: rnd() < 0.6 && chBranches.length > 0 ? pick(chBranches).id : null,
          title: t.title,
          description: t.description,
          category: t.category,
          responsible_id: responsible,
          due_date: iso(due),
          status: kind === "done" ? "concluida" : kind === "cancel" ? "nao_feita" : "planejada",
          completed_at: kind === "done" ? addDays(due, rnd() < 0.7 ? 0 : 2).toISOString() : null,
          created_at: createdAt.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      createdCount++;

      const assignees = [responsible, ...(secondAssignee && secondAssignee !== responsible ? [secondAssignee] : [])];
      await db.from("activity_assignees").insert(
        assignees.map((p) => ({ activity_id: created.id, profile_id: p }))
      );

      const name = profileName.get(responsible) ?? "Equipe";
      const events: { type: string; description: string; created_at: string }[] = [
        {
          type: "criada",
          description: `Atividade agendada por ${name}`,
          created_at: createdAt.toISOString(),
        },
      ];
      if (kind === "done") {
        const when = addDays(due, rnd() < 0.7 ? 0 : 2);
        events.push({
          type: "execucao_registrada",
          description: `Execução registrada por ${name}: ${t.relato}`,
          created_at: when.toISOString(),
        });
        events.push({
          type: "status_alterado",
          description: `Status alterado de "Planejada" para "Concluída" por ${name}`,
          created_at: when.toISOString(),
        });
      }
      if (kind === "cancel") {
        events.push({
          type: "status_alterado",
          description: `Status alterado de "Planejada" para "Cancelada" por ${name}`,
          created_at: addDays(due, 1).toISOString(),
        });
      }
      const { error: evErr } = await db.from("activity_events").insert(
        events.map((e) => ({ ...e, activity_id: created.id, profile_id: responsible }))
      );
      if (evErr) throw evErr;
      eventCount += events.length;
    }

    // 3) Notas do canal (2 por canal, 1 fixada no primeiro insert)
    const { data: chNotes } = await db
      .from("channel_notes")
      .select("id, body")
      .eq("channel_id", channel.id);
    const existingBodies = new Set((chNotes ?? []).map((n) => n.body));
    let pinnedGiven = (chNotes ?? []).length > 0;
    let added = 0;
    for (const body of [pick(NOTES), pick(NOTES)]) {
      if (existingBodies.has(body) || added >= 2) continue;
      existingBodies.add(body);
      const author = pick(people);
      const at = addDays(today, -Math.floor(rnd() * 30) - 1);
      await db.from("channel_notes").insert({
        channel_id: channel.id,
        author_id: author,
        body,
        pinned: !pinnedGiven,
        pinned_at: !pinnedGiven ? at.toISOString() : null,
        created_at: at.toISOString(),
        updated_at: at.toISOString(),
      });
      pinnedGiven = true;
      added++;
    }
    if (added > 0) console.log(`   + ${added} notas no mural`);

    // 4) Resultado nas metas (até 2 por canal, só onde está vazio)
    let resultAdded = 0;
    for (const prob of chProblems) {
      if (prob.resultado || resultAdded >= 2 || rnd() < 0.4) continue;
      await db.from("problems").update({ resultado: pick(RESULTADOS) }).eq("id", prob.id);
      resultAdded++;
    }
    if (resultAdded > 0) console.log(`   + resultado em ${resultAdded} metas`);
  }

  console.log(`\n✔ Faxina: ${junk.length} atividades removidas`);
  console.log(`✔ População: ${createdCount} atividades novas, ${eventCount} eventos de linha do tempo`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
