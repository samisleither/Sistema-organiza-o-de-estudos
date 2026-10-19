// ==============================================================================
// ATLAS - MOTOR DE GERAÇÃO DE CRONOGRAMA AUTOMÁTICO (RF07)
// Distribui os tópicos até a data da prova priorizando matérias de maior dificuldade
// ==============================================================================

import {
  TopicoComMateria,
  HorasDisponiveisSemana,
  SessaoEstudo,
  DiaSemana,
  DificuldadeMateria,
} from './types';

export interface ParametrosCronograma {
  usuarioId: string;
  topicos: TopicoComMateria[];
  dataInicio: string; // YYYY-MM-DD (geralmente a data de hoje)
  dataProva: string;  // YYYY-MM-DD
  horasPorDia: HorasDisponiveisSemana;
}

const PESO_DIFICULDADE: Record<DificuldadeMateria, number> = {
  dificil: 3,
  medio: 2,
  facil: 1,
};

const MAPA_DIAS_SEMANA: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

/**
 * Converte string 'YYYY-MM-DD' em Date local sem distorção de timezone
 */
export function parseDateLocal(dateStr: string): Date {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Converte Date para string 'YYYY-MM-DD'
 */
export function formatDateISO(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Retorna os dias disponíveis entre dataInicio e a véspera da prova (inclusive)
 */
export function gerarCalendarioEstudo(
  dataInicioStr: string,
  dataProvaStr: string,
  horasPorDia: HorasDisponiveisSemana
): { data: string; horas: number; slots: number }[] {
  const dataAtual = parseDateLocal(dataInicioStr);
  const dataProva = parseDateLocal(dataProvaStr);

  const dias: { data: string; horas: number; slots: number }[] = [];

  // Estudamos até a véspera da prova ou dia da prova se houver tempo
  while (dataAtual < dataProva) {
    const diaSemanaIndex = dataAtual.getDay();
    const diaSemanaNome = MAPA_DIAS_SEMANA[diaSemanaIndex];
    const horas = horasPorDia[diaSemanaNome] || 0;

    // Regra: cada hora permite em média 1 tópico com margem de absorção
    const slots = Math.max(0, Math.floor(horas));

    dias.push({
      data: formatDateISO(dataAtual),
      horas,
      slots,
    });

    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  return dias;
}

/**
 * Ordena os tópicos para maximizar retenção:
 * 1. Prioriza matérias difíceis primeiro (para dar mais tempo até a prova e abrir espaço para revisões 1-3-7-15)
 * 2. Em seguida matérias médias e fáceis
 * 3. Mantém a sequência lógica de tópicos dentro da mesma matéria (pela propriedade ordem)
 */
export function ordenarTopicosPorPrioridade(topicos: TopicoComMateria[]): TopicoComMateria[] {
  return [...topicos].sort((a, b) => {
    const pesoDiff = PESO_DIFICULDADE[b.materia.dificuldade] - PESO_DIFICULDADE[a.materia.dificuldade];
    if (pesoDiff !== 0) return pesoDiff;

    // Se mesma matéria, respeita ordem dos tópicos
    if (a.materiaId === b.materiaId) {
      return a.ordem - b.ordem;
    }

    return a.materia.nome.localeCompare(b.materia.nome);
  });
}

/**
 * Gera o cronograma completo alocando todos os tópicos
 * Critério de aceite: "sem deixar tópico sem data"
 */
export function gerarCronogramaAutomatico(params: ParametrosCronograma): SessaoEstudo[] {
  const { usuarioId, topicos, dataInicio, dataProva, horasPorDia } = params;

  if (topicos.length === 0) return [];

  const calendario = gerarCalendarioEstudo(dataInicio, dataProva, horasPorDia);
  const diasDisponiveis = calendario.filter((d) => d.horas > 0);

  // Fallback de segurança: se o usuário configurou 0 horas em todos os dias, usamos todos os dias com slot mínimo de 1
  const diasParaAlocar = diasDisponiveis.length > 0
    ? diasDisponiveis
    : calendario.map((d) => ({ ...d, slots: 1 }));

  if (diasParaAlocar.length === 0) {
    // Data da prova hoje ou já passou; aloca para a data de início
    return topicos.map((topico, index) => ({
      id: `sessao-${index + 1}`,
      usuarioId,
      topicoId: topico.id,
      dataPlanejada: dataInicio,
      status: 'pendente',
    }));
  }

  const topicosOrdenados = ordenarTopicosPorPrioridade(topicos);
  const sessoes: SessaoEstudo[] = [];

  let diaIndex = 0;
  let slotsOcupadosNoDiaAtual = 0;

  for (let i = 0; i < topicosOrdenados.length; i++) {
    const topico = topicosOrdenados[i];
    const diaAtual = diasParaAlocar[diaIndex];

    sessoes.push({
      id: `sessao-auto-${i + 1}`,
      usuarioId,
      topicoId: topico.id,
      dataPlanejada: diaAtual.data,
      status: 'pendente',
    });

    slotsOcupadosNoDiaAtual++;

    // Se estourou os slots planejados para o dia e ainda temos dias futuros antes da prova
    if (slotsOcupadosNoDiaAtual >= diaAtual.slots && diaIndex < diasParaAlocar.length - 1) {
      diaIndex++;
      slotsOcupadosNoDiaAtual = 0;
    }
  }

  return sessoes;
}
