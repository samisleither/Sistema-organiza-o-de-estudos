// ==============================================================================
// ATLAS - MOTOR DE REVISÃO ESPAÇADA (RF11)
// Agenda automaticamente revisões nos intervalos 1, 3, 7 e 15 dias após conclusão
// ==============================================================================

import { Revisao } from './types';
import { parseDateLocal, formatDateISO } from './scheduler';

export const INTERVALOS_REVISAO: Array<1 | 3 | 7 | 15> = [1, 3, 7, 15];

/**
 * Gera as 4 instâncias de revisão espaçada a partir de uma data de conclusão
 */
export function gerarRevisoesEspacadas(
  usuarioId: string,
  topicoId: string,
  dataConclusaoStr: string
): Revisao[] {
  const dataBase = parseDateLocal(dataConclusaoStr);

  return INTERVALOS_REVISAO.map((dias) => {
    const dataAlvo = new Date(dataBase);
    dataAlvo.setDate(dataAlvo.getDate() + dias);

    return {
      id: `rev-${topicoId}-${dias}d`,
      usuarioId,
      topicoId,
      intervaloDias: dias,
      dataAgendada: formatDateISO(dataAlvo),
      dataConclusao: null,
      status: 'pendente',
    };
  });
}
