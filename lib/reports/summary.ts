import type { ActivityStatus } from "@/components/shared/status-badge";

/**
 * Resumo executivo do Relatório de Safra — texto determinístico, SEM IA.
 * Template com variações condicionais para não soar quebrado em nenhum
 * cenário (zero problemas, zero atividades, zero fotos etc).
 */

export type ReportMode = "interno" | "externo";

export type SummaryInput = {
  channelName: string;
  harvest: string | null;
  problemCount: number;
  activities: {
    status: ActivityStatus;
    dueDate: string | null;
    completedAt: string | null;
    problemId: string | null;
  }[];
  photoCount: number;
  /**
   * "interno" (padrão) fala de execução: % concluídas, o que segue em
   * aberto, o que atrasou. "externo" é o relatório que vai para o canal
   * — conta o trabalho ENTREGUE, sem expor pendência interna. Regra:
   * nada de "atrasada", "em aberto" ou % de conclusão no externo.
   */
  mode?: ReportMode;
};

function plural(n: number, singular: string, pluralForm: string) {
  return n === 1 ? singular : pluralForm;
}

/** Concluída dentro do prazo (ou sem prazo definido). */
function isOnTime(activity: SummaryInput["activities"][number]) {
  if (activity.status !== "concluida") return false;
  if (!activity.dueDate || !activity.completedAt) return true;
  return activity.completedAt.slice(0, 10) <= activity.dueDate;
}

/**
 * Versão para o canal: 2-3 frases sobre o que foi ENTREGUE. Conta ações
 * realizadas (não planejadas), metas endereçadas e evidências — nunca
 * percentual de conclusão nem pendências.
 */
function buildExternalSummary(
  input: SummaryInput,
  total: number,
  harvestLabel: string
): string {
  const done = input.activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const sentences: string[] = [];

  if (done > 0 && input.problemCount > 0) {
    sentences.push(
      `${done} ${plural(done, "ação realizada", "ações realizadas")} em ${
        input.channelName
      }${harvestLabel}, ${plural(
        done,
        "endereçando",
        "endereçando"
      )} ${input.problemCount} ${plural(
        input.problemCount,
        "meta trabalhada em conjunto",
        "metas trabalhadas em conjunto"
      )}.`
    );
  } else if (done > 0) {
    sentences.push(
      `${done} ${plural(done, "ação realizada", "ações realizadas")} em ${
        input.channelName
      }${harvestLabel}.`
    );
  } else {
    sentences.push(
      `O trabalho em ${input.channelName}${harvestLabel} está em andamento, com ${total} ${plural(
        total,
        "ação no plano conjunto",
        "ações no plano conjunto"
      )}.`
    );
  }

  if (input.photoCount > 0) {
    sentences.push(
      `O trabalho está documentado com ${input.photoCount} ${plural(
        input.photoCount,
        "registro fotográfico",
        "registros fotográficos"
      )} em campo.`
    );
  }

  return sentences.join(" ");
}

export function buildExecutiveSummary(input: SummaryInput): string {
  const total = input.activities.length;
  const harvestLabel = input.harvest ? ` na ${input.harvest}` : " nesta safra";

  if (total === 0 && input.problemCount === 0) {
    return `O plano de ${input.channelName}${harvestLabel} ainda não tem problemas mapeados nem atividades registradas. Este relatório será preenchido conforme o trabalho em conjunto avançar.`;
  }

  if (input.mode === "externo") {
    return buildExternalSummary(input, total, harvestLabel);
  }

  const completed = input.activities.filter(
    (activity) => activity.status === "concluida"
  );
  const completedPercent =
    total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const onTime = completed.filter(isOnTime).length;
  const open = input.activities.filter((activity) =>
    ["planejada", "atrasada"].includes(activity.status)
  ).length;
  const late = input.activities.filter(
    (activity) => activity.status === "atrasada"
  ).length;
  const unplanned = input.activities.filter(
    (activity) => activity.problemId === null
  ).length;

  const sentences: string[] = [];

  // Abertura: problemas + atividades planejadas.
  if (input.problemCount > 0 && total > 0) {
    sentences.push(
      `Nesta safra, ${input.channelName} trabalhou ${input.problemCount} ${plural(
        input.problemCount,
        "problema mapeado",
        "problemas mapeados"
      )} em conjunto, com ${total} ${plural(
        total,
        "atividade planejada",
        "atividades planejadas"
      )}.`
    );
  } else if (input.problemCount > 0) {
    sentences.push(
      `Nesta safra, ${input.channelName} mapeou ${input.problemCount} ${plural(
        input.problemCount,
        "problema em conjunto",
        "problemas em conjunto"
      )}, ainda sem atividades associadas ao plano.`
    );
  } else {
    sentences.push(
      `Nesta safra, ${input.channelName} registrou ${total} ${plural(
        total,
        "atividade",
        "atividades"
      )} no plano, ainda sem problemas formalmente mapeados.`
    );
  }

  // Execução: % concluídas e pontualidade.
  if (total > 0) {
    if (completed.length === 0) {
      sentences.push("Nenhuma atividade foi concluída até o momento.");
    } else {
      const onTimePart =
        onTime === completed.length
          ? completed.length === 1
            ? "no prazo"
            : "todas no prazo"
          : onTime === 0
            ? "nenhuma no prazo"
            : `${onTime} no prazo`;
      sentences.push(
        `${completedPercent}% ${plural(
          completed.length,
          "foi concluída",
          "foram concluídas"
        )} (${onTimePart}).`
      );
    }
  }

  // Pendências.
  if (open > 0) {
    const latePart =
      late > 0
        ? `, ${late} ${plural(late, "delas atrasada", "delas atrasadas")}`
        : "";
    sentences.push(
      `${open} ${plural(
        open,
        "atividade segue em aberto",
        "atividades seguem em aberto"
      )}${latePart}.`
    );
  }

  // Ações fora do plano inicial.
  if (unplanned > 0) {
    sentences.push(
      `${unplanned} ${plural(
        unplanned,
        "ação fora do plano inicial foi registrada",
        "ações fora do plano inicial foram registradas"
      )} durante a safra.`
    );
  }

  // Evidências.
  if (input.photoCount > 0) {
    sentences.push(
      `O trabalho está documentado com ${input.photoCount} ${plural(
        input.photoCount,
        "foto de execução",
        "fotos de execução"
      )} em campo.`
    );
  }

  return sentences.join(" ");
}
