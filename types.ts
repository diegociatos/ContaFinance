
export interface Entity {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  documento?: string;
  cor?: string;
}

export interface Institution {
  id: string;
  nome: string;
  tipo: 'Banco' | 'Corretora' | 'Caixa/Carteira';
  entidadeId: string;
  saldoInicial: number;
  cor?: string;
  diaVencimentoFatura?: number;
}

export const DRE_GROUPS = [
  'RECEITAS OPERACIONAIS',
  'CUSTO DE VIDA SOBREVIVÊNCIA',
  'CUSTO DE VIDA CONFORTO',
  'DESPESAS PROFISSIONAIS',
  'MOVIMENTAÇÕES NÃO OPERACIONAIS',
  'RECEITAS FINANCEIRAS / VARIAÇÃO',
  'INVESTIMENTOS REALIZADOS',
  'TRANSFERÊNCIAS INTERNAS'
] as const;

export interface Category {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'transferencia';
  grupo: (typeof DRE_GROUPS)[number];
  isOperating: boolean;
}

export interface AssetClass {
  id: string;
  nome: string;
}

export interface Indexer {
  id: string;
  nome: string;
}

export type AssetStrategicClass = 'Liquidez' | 'Renda Variável' | 'Longo Prazo';

export interface Asset {
  id: string;
  nome: string;
  instituicaoId: string;
  classId: string;
  indexerId: string;
  liquidez: string;
  entidadeId: string;
  strategicClass: AssetStrategicClass;
}

export interface AssetSnapshot {
  id: string;
  assetId: string;
  mes: number;
  ano: number;
  saldoFinal: number;
  aportes: number;
  resgates: number;
  rendimento: number;
}

export interface CreditCard {
  id: string;
  nome: string;
  bandeira: 'Visa' | 'Master' | 'Elo' | 'Amex';
  entidadeId: string;
  instituicaoDebitoId: string;
  diaFechamento: number;
  diaVencimento: number;
  limite?: number;
}

export type CardTransactionStatus = 'Pendente' | 'Pago' | 'Conciliado' | 'Importado - Não Classificado';

export interface CardTransaction {
  id: string;
  cardId: string;
  dataCompra: string;
  descricao: string;
  categoryId: string;
  valor: number;
  parcelasTotal: number;
  parcelaAtual: number;
  status: CardTransactionStatus;
  grupoId?: string;
}

export type ViewType = 
  | 'dashboard' 
  | 'conta-detalhe'
  | 'investimentos'
  | 'dre' | 'patrimonio' | 'configuracoes'
  | 'categorias'
  | 'instituicoes'
  | 'importar'
  | 'cartoes-lista'
  | 'cartoes-lancamentos'
  | 'cartoes-importar';

export type TransactionClass = 'OPERACIONAL' | 'PAGAMENTO_FATURA' | 'TRANSFERENCIA_INTERNA';

export interface Transaction {
  id: string;
  data: string;
  dataCompetencia: string;
  dataCaixa: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  referencia: string; 
  entidadeId: string;
  instituicaoId: string;
  detalhes: string;
  linkedAssetId?: string;
  meioPagamento: 'dinheiro_pix_debito' | 'cartao_credito';
  isParcelado?: boolean;
  parcelaAtual?: number;
  totalParcelas?: number;
  grupoId?: string;
  isCardPayment?: boolean;
  linkedCardId?: string;
  tipoLancamento: TransactionClass;
  impactaDRE: boolean;
}

export interface MappingTemplate {
  id: string;
  nome: string;
  tipoImportacao: 'categorias' | 'fluxo' | 'ativos' | 'fechamento' | 'fatura-cartao';
  mapping: Record<string, string>;
}

export type ValuationMethod = 'Múltiplo de EBITDA' | 'Fluxo de Caixa Descontado' | 'Valor de Mercado' | 'Patrimônio Líquido Ajustado';

export interface FixedAsset {
  id: string;
  nome: string;
  categoria: 'Imóvel' | 'Veículo' | 'Participação' | 'Equipamento' | 'Outro';
  valorAquisicao: number;
  valorMercado: number;
  entidadeId: string;
  dataAquisicao?: string;
  observacoes?: string;
  percentParticipation?: number;
  valuationMethod?: ValuationMethod;
}

export interface FixedAssetSnapshot {
  id: string;
  fixedAssetId: string;
  mes: number;
  ano: number;
  valorEquity: number;
}

export interface Liability {
  id: string;
  nome: string;
  tipo: 'Financiamento' | 'Empréstimo' | 'Parcelamento' | 'Cartão' | 'Outro';
  entidadeId: string;
  saldoDevedor: number;
  valorParcela?: number;
  taxa?: string;
  dataFim?: string;
}

export interface InsurancePolicy {
  id: string;
  tipo: 'Imóvel' | 'Vida' | 'Veículo' | 'Responsabilidade' | 'Outro';
  seguradora: string;
  assetId?: string;
  valorSegurado: number;
  premioAnual: number;
  vigenciaInicio: string;
  vigenciaFim: string;
}

export interface AppState {
  instituicoes: Institution[];
  entities: Entity[];
  categories: Category[];
  assets: Asset[];
  assetClasses: AssetClass[];
  indexers: Indexer[];
  assetSnapshots: AssetSnapshot[];
  transactions: Transaction[];
  fixedAssets: FixedAsset[];
  fixedAssetSnapshots: FixedAssetSnapshot[];
  liabilities: Liability[];
  insurancePolicies: InsurancePolicy[];
  mappingTemplates: MappingTemplate[];
  creditCards: CreditCard[];
  cardTransactions: CardTransaction[];
  patrimonioLiquido: number;
}
