// ==============================================================================
// ATLAS - MOTOR DE REPLANEJAMENTO IMEDIATO (RF10)
// Redistribui sessões pendentes e não cumpridas nos dias subsequentes em < 1s
// ==============================================================================

import {
  SessaoEstudo,
  TopicoComMateria,
  HorasDisponiveisSemana,
} from './types';
import {
  parseDateLocal,
  formatDateISO,
  gerarCalendarioEstudo,
  ordenarTopicosPorPrioridade,
} from './scheduler';

export interface ParametrosReplanejamento {
  sessaoFalhadaId: string;
  dataAtual: string; // YYYY-MM-DD
  dataProva: string; // YYYY-MM-DD
  horasPorDia: HorasDisponiveisSemana;
  todasSessoes: SessaoEstudo[];
  topicosMap: Map<string, TopicoComMateria>;
}

export interface ResultadoReplanejamento {
  sessoesAtualizadas: SessaoEstudo[];
  sessaoFalhada: SessaoEstudo;
  sessoesRemanejadasCount: number;
}

/**
 * Executa o replanejamento instantâneo:
 * 1. Marca a sessão falhada como 'nao_feita'.
 * 2. Identifica todos os tópicos que ainda não foram concluídos ('feita') a partir de amanhã.
 * 3. Inclui o tópico da sessão falhada na fila de pendências prioritárias.
 * 4. Redistribui apenas as sessões do dia seguinte em diante até a data da prova.
 * 5. Garante que nada anterior a amanhã seja alterado (histórico intacto).
 * 6. Sem duplicar e sem perder tópicos.
 */
export function executarReplanejamento(params: ParametrosReplanejamento): ResultadoReplanejamento {
  const {
    sessaoFalhadaId,
    dataAtual,
    dataProva,
    horasPorDia,
    todasSessoes,
    topicosMap,
  } = params;

  // Localiza a sessão que o usuário indicou que não fez hoje
  const sessaoIndex = todasSessoes.findIndex((s) => s.id === sessaoFalhadaId);
  if (sessaoIndex === -1) {
    throw new Error(`Sessão com ID ${sessaoFalhadaId} não encontrada.`);
  }

  const sessaoOriginal = todasSessoes[sessaoIndex];
  const sessaoMarcadaNaoFeita: SessaoEstudo = {
    ...sessaoOriginal,
    status: 'nao_feita',
    dataRealizada: null,
  };

  // Separa o histórico passado/concluído e as sessões futuras
  const dataHojeObj = parseDateLocal(dataAtual);
  const dataAmanhaObj = new Date(dataHojeObj);
  dataAmanhaObj.setDate(dataAmanhaObj.getDate() + 1);
  const dataAmanhaStr = formatDateISO(dataAmanhaObj);

  // Mantemos intocadas as sessões anteriores ou de hoje que já foram feitas ou já marcadas
  const sessoesPreservadas: SessaoEstudo[] = todasSessoes.filter((s) => {
    if (s.id === sessaoFalhadaId) return false;
    // Se for anterior a amanhã, preserva como está
    return s.dataPlanejada < dataAmanhaStr;
  });

  // Tópicos que precisam ser redistribuídos:
  // 1) O tópico da sessão não realizada hoje
  // 2) Tópicos de sessões futuras pendentes (que ainda não foram feitas)
  const topicosParaRedistribuir: TopicoComMateria[] = [];

  const topicoFalhado = topicosMap.get(sessaoOriginal.topicoId);
  if (topicoFalhado) {
    topicosParaRedistribuir.push(topicoFalhado);
  }

  const sessoesFuturasPendentes = todasSessoes.filter(
    (s) => s.id !== sessaoFalhadaId && s.dataPlanejada >= dataAmanhaStr && s.status === 'pendente'
  );

  for (const s of sessoesFuturasPendentes) {
    const topico = topicosMap.get(s.topicoId);
    if (topico && !topicosParaRedistribuir.some((t) => t.id === topico.id)) {
      topicosParaRedistribuir.push(topico);
    }
  }

  // Ordena os tópicos pendentes por prioridade de dificuldade
  const topicosOrdenados = ordenarTopicosPorPrioridade(topicosParaRedistribuir);

  // Gera novo calendário de distribuição de amanhã até a data da prova
  const calendario = gerarCalendarioEstudo(dataAmanhaStr, dataProva, horasPorDia);
  const diasDisponiveis = calendario.filter((d) => d.horas > 0);
  const diasParaAlocar = diasDisponiveis.length > 0 ? diasDisponiveis : calendario.map((d) => ({ ...d, slots: 1 }));

  const novasSessoesFuturas: SessaoEstudo[] = [];
  let diaIdx = 0;
  let slotsOcupados = 0;

  for (let i = 0; i < topicosOrdenados.length; i++) {
    const topico = topicosOrdenados[i];
    const diaAlvo = diasParaAlocar[Math.min(diaIdx, diasParaAlocar.length - 1)];

    // Reutiliza o ID de uma sessão futura pendente se existir, ou gera um novo consistente
    const sessaoExistente = sessoesFuturasPendentes[i];
    const idSessao = sessaoExistente ? sessaoExistente.id : `sessao-replan-${Date.now()}-${i}`;

    novasSessoesFuturas.push({
      id: idSessao,
      usuarioId: sessaoOriginal.usuarioId,
      topicoId: topico.id,
      dataPlanejada: diaAlvo.data,
      status: 'pendente',
    });

    slotsOcupados++;
    if (slotsOcupados >= diaAlvo.slots && diaIdx < diasParaAlocar.length - 1) {
      diaIdx++;
      slotsOcupados = 0;
    }
  }

  // Monta a nova lista consolidada
  const sessoesAtualizadas = [
    ...sessoesPreservadas,
    sessaoMarcadaNaoFeita,
    ...novasSessoesFuturas,
  ];

  return {
    sessoesAtualizadas,
    sessaoFalhada: sessaoMarcadaNaoFeita,
    sessoesRemanejadasCount: novasSessoesFuturas.length,
  };
}
