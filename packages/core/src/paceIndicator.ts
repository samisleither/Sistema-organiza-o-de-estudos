// ==============================================================================
// ATLAS - INDICADOR DE RITMO DE ESTUDOS (RF12)
// Compara o conteúdo planejado até a data atual com o conteúdo concluído
// ==============================================================================

import { SessaoEstudo, IndicadorRitmo } from './types';
import { parseDateLocal } from './scheduler';

export interface ParametrosRitmo {
  sessoes: SessaoEstudo[];
  dataAtual: string; // YYYY-MM-DD
  dataProva: string; // YYYY-MM-DD
}

/**
 * Calcula o ritmo do estudante de acordo com o RF12
 * - "no_prazo": concluído >= planejado até hoje
 * - "atrasado": concluído < planejado até hoje
 */
export function calcularIndicadorRitmo(params: ParametrosRitmo): IndicadorRitmo {
  const { sessoes, dataAtual, dataProva } = params;

  // Sessões cuja data planejada era até a data atual (inclusive)
  const sessoesPlanejadasAteHoje = sessoes.filter((s) => s.dataPlanejada <= dataAtual);
  const totalPlanejadoAteHoje = sessoesPlanejadasAteHoje.length;

  // Sessões efetivamente concluídas (feitas) até o momento
  const sessoesConcluidas = sessoes.filter((s) => s.status === 'feita');
  const totalConcluidoAteHoje = sessoesConcluidas.length;

  const diferenca = totalConcluidoAteHoje - totalPlanejadoAteHoje;
  const status = diferenca >= 0 ? 'no_prazo' : 'atrasado';

  // Percentual global concluído do plano
  const totalGeralSessoes = sessoes.length;
  const percentualConcluido = totalGeralSessoes > 0
    ? Math.round((totalConcluidoAteHoje / totalGeralSessoes) * 100)
    : 0;

  // Dias até a prova
  const hojeObj = parseDateLocal(dataAtual);
  const provaObj = parseDateLocal(dataProva);
  const diffTempoMs = provaObj.getTime() - hojeObj.getTime();
  const diasAteProva = Math.max(0, Math.ceil(diffTempoMs / (1000 * 60 * 60 * 24)));

  return {
    status,
    totalPlanejadoAteHoje,
    totalConcluidoAteHoje,
    diferenca,
    percentualConcluido,
    diasAteProva,
  };
}
