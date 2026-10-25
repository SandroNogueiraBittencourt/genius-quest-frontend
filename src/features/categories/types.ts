export type CategoryStatus = 'PENDENTE' | 'APROVADA' | 'REMOVIDA';

export type Category = {
  id: string;
  nome: string;
  descricao: string | null;
  status: CategoryStatus;
  criadoEm: string;
  atualizadoEm: string;
};

export type CategorySuggestion = {
  nome: string;
  descricao: string;
};
