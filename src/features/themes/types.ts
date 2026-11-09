export type ThemeStatus = 'PENDENTE' | 'APROVADO' | 'SUSPENSO' | 'REMOVIDO';

export type Theme = {
  id: string;
  categoriaId: string;
  autorId: string;
  titulo: string;
  descricao: string | null;
  status: ThemeStatus;
  criadoEm: string;
  atualizadoEm: string;
};

export type VotingCycle = {
  id: string;
  nome: string;
  inicioEm: string;
  fimEm: string;
  status: 'ABERTO' | 'ENCERRADO';
  vencedorTemaId: string | null;
  encerradoEm: string | null;
};

export type ThemeVote = {
  id: string;
  temaId: string;
  cicloId: string;
  criadoEm: string;
};

export type ThemeRank = {
  posicao: number;
  temaId: string;
  titulo: string;
  votos: number;
  votantesDistintos: number;
};

export type VotingHistoryCycle = {
  id: string;
  nome: string;
  inicioEm: string;
  fimEm: string;
  encerradoEm: string;
  vencedorTemaId: string | null;
  vencedorTitulo: string | null;
  totalVotos: number;
  rankingReconstruido: boolean;
};

export type VotingHistoryPage = {
  ciclos: VotingHistoryCycle[];
  pagina: number;
  tamanho: number;
  total: number;
  temProxima: boolean;
};
