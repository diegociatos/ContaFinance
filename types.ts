
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

export interface CategoryMapping {
  establishmentRaw: string;
  categoryId: string;
}

export interface MerchantRule {
  raw: string;
  clean: string;
  categoryId: string;
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
  dataVencimentoFatura: string; 
  descricao: string;
  descricaoRaw?: string; 
  categoryId: string;
  valor: number; 
  valorTotalCompra: number; 
  parcelasTotal: number;
  parcelaAtual: number;
  status: CardTransactionStatus;
  grupoId?: string; 
}

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

export type ViewType = 'dashboard' | 'investimentos' | 'conta-detalhe' | 'cartoes-lista' | 'dre' | 'patrimonio' | 'importar' | 'configuracoes';

export type AssetStrategicClass = 'Liquidez' | 'Renda Variável' | 'Longo Prazo';

export interface Asset {
  id: string;
  nome: string;
  instituicaoId: string;
  classId: string;
  indexerId: string;
  entidadeId: string;
  liquidez: string;
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

export interface AssetClass {
  id: string;
  nome: string;
}

export interface Indexer {
  id: string;
  nome: string;
}

export interface MappingTemplate {
  id: string;
  nome: string;
  tipo: string;
  mapping: Record<string, string>;
}

export type ValuationMethod = 'Valor de Mercado' | 'Custo de Aquisição';
export type FixedAssetCategory = 'Imóvel' | 'Participação / Equity' | 'Bem Diverso';
export type LegalType = 'Matrícula' | 'Contrato de Compra e Venda' | 'Contrato Social' | 'Outro';

export interface FixedAsset {
  id: string;
  nome: string;
  categoria: FixedAssetCategory;
  tipoJuridico: LegalType;
  matricula?: string;
  valorAquisicao: number;
  valorMercado: number;
  entidadeId: string;
  valuationMethod: ValuationMethod;
}

export interface FixedAssetSnapshot {
  id: string;
  fixedAssetId: string;
  mes: number;
  ano: number;
  valorMercado: number;
}

export interface Liability {
  id: string;
  nome: string;
  tipo: 'Financiamento' | 'Empréstimo' | 'Consórcio' | 'Outro';
  credor: string;
  taxa?: string;
  prazo?: string;
  saldoDevedor: number;
  entidadeId: string;
}

export interface InsurancePolicy {
  id: string;
  tipo: string;
  seguradora: string;
  bemProtegidoId?: string; 
  valorSegurado: number;
  vigenciaFim: string;
  beneficiario: string;
  entidadeId: string;
}

export interface AppState {
  instituicoes: Institution[];
  entities: Entity[];
  categories: Category[];
  categoryMappings: CategoryMapping[];
  merchantRules: MerchantRule[];
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
