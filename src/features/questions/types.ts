export type QuestionStatus =
  'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'BLOQUEADA';
export type QuestionDifficulty = 'FACIL' | 'MEDIA' | 'DIFICIL';
export type QuestionDecision = 'APROVAR' | 'REJEITAR' | 'BLOQUEAR';

/** Somente a API administrativa retorna respostaCorretaIndice (gabarito). */
export type ManagedQuestion = {
  id: string;
  temaId: string;
  enunciado: string;
  alternativas: string[];
  respostaCorretaIndice: number;
  status: QuestionStatus;
  origem: 'IA' | 'MANUAL';
  dificuldadeInicial: QuestionDifficulty;
  fonteReferencia: string | null;
  modeloIa: string | null;
  revisorId: string | null;
  motivoRevisao: string | null;
  revisadoEm: string | null;
  criadoEm: string;
};

export type ManagedQuestionPage = {
  content: ManagedQuestion[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

export type QuestionReview = {
  enunciado: string;
  alternativas: string[];
  respostaCorretaIndice: number;
  dificuldadeInicial: QuestionDifficulty;
  fonteReferencia: string | null;
  motivo: string;
};

export type QuestionHistory = {
  id: string;
  revisorId: string;
  acao: 'REVISAR' | QuestionDecision;
  statusAnterior: QuestionStatus;
  statusNovo: QuestionStatus;
  motivo: string | null;
  antes: string | null;
  depois: string | null;
  criadoEm: string;
};

/** Payload enviado apenas à API ADMIN; a questão começa como MANUAL/PENDENTE. */
export type ManualQuestionInput = {
  temaId: string;
  enunciado: string;
  alternativas: string[];
  respostaCorretaIndice: number;
  dificuldadeInicial: QuestionDifficulty;
  fonteReferencia: string | null;
};
