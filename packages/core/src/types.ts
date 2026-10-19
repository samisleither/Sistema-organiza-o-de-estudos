// ==============================================================================
// ATLAS - MODELOS E TIPOS DO DOMÍNIO
// Compatível com Web (Next.js) e Mobile (React Native / Expo)
// ==============================================================================

export type DificuldadeMateria = 'facil' | 'medio' | 'dificil';
export type StatusTopico = 'pendente' | 'em_progresso' | 'concluido';
export type StatusSessao = 'pendente' | 'feita' | 'nao_feita';
export type StatusRevisao = 'pendente' | 'concluida';
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface HorasDisponiveisSemana {
  seg: number;
  ter: number;
  qua: number;
  qui: number;
  sex: number;
  sab: number;
  dom: number;
}

export interface UsuarioConfig {
  id: string;
  nome: string;
  email: string;
  dataProva: string; // Formato YYYY-MM-DD
  horasPorDia: HorasDisponiveisSemana;
}

export interface Materia {
  id: string;
  usuarioId: string;
  nome: string;
  dificuldade: DificuldadeMateria;
  corIdentificadora?: string;
}

export interface Topico {
  id: string;
  materiaId: string;
  usuarioId: string;
  nome: string;
  ordem: number;
  status: StatusTopico;
}

export interface TopicoComMateria extends Topico {
  materia: Materia;
}

export interface SessaoEstudo {
  id: string;
  usuarioId: string;
  topicoId: string;
  dataPlanejada: string; // Formato YYYY-MM-DD
  dataRealizada?: string | null;
  status: StatusSessao;
}

export interface SessaoDetalhada extends SessaoEstudo {
  topico: TopicoComMateria;
}

export interface Revisao {
  id: string;
  usuarioId: string;
  topicoId: string;
  intervaloDias: 1 | 3 | 7 | 15;
  dataAgendada: string; // Formato YYYY-MM-DD
  dataConclusao?: string | null;
  status: StatusRevisao;
}

export interface RevisaoDetalhada extends Revisao {
  topico: TopicoComMateria;
}

export type RitmoStatus = 'no_prazo' | 'atrasado';

export interface IndicadorRitmo {
  status: RitmoStatus;
  totalPlanejadoAteHoje: number;
  totalConcluidoAteHoje: number;
  diferenca: number; // >= 0 se no prazo, negativo se atrasado
  percentualConcluido: number;
  diasAteProva: number;
}
