
import React, { useState, useRef } from 'react';
import { 
  Entity, 
  Institution, 
  Category, 
  Transaction, 
  Asset, 
  AssetSnapshot, 
  AssetClass, 
  Indexer, 
  MappingTemplate, 
  CardTransaction,
  DRE_GROUPS,
  AppState
} from '../types';
import { 
  Upload, 
  Database, 
  TrendingUp,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Check,
  Plus,
  ArrowRight,
  ArrowRightLeft,
  ShieldCheck,
  Building2
} from 'lucide-react';

type ImportType = 'categorias_dre' | 'fluxo' | 'ativos' | 'fatura_cartao';

interface ImportViewProps {
  state: AppState;
  onImportTransactions: (txs: Transaction[]) => void;
  onImportCardTransactions: (txs: CardTransaction[]) => void;
  onImportCategories: (cats: Category[]) => void;
  onImportAssets: (assets: Asset[]) => void;
  onImportSnapshots: (snaps: AssetSnapshot[]) => void;
  onAddInstitution: (inst: Institution) => void;
  onAddEntity: (ent: Entity) => void;
  onUpdateAssetClasses: (classes: AssetClass[]) => void;
  onUpdateIndexers: (indexers: Indexer[]) => void;
  onSaveTemplate: (tmpl: MappingTemplate) => void;
}

const OFFICIAL_TEMPLATES: Record<string, string[]> = {
  fatura_cartao: ['cartao_nome', 'data_compra', 'descricao_original', 'valor', 'parcela_atual', 'parcelas_total', 'categoria_dre', 'entidade'],
  fluxo: ['dados_caixa', 'dados_competencia', 'categoria', 'detalhamento', 'grupo_dre', 'natureza', 'tipo', 'valor', 'conta_origem', 'entidade', 'conta_destino'],
  ativos: ['mes_referencia', 'nome_ativo', 'tipo_classe', 'indexador', 'instituicao', 'investidor_entidade', 'saldo_atual', 'data_aplicacao', 'valor_aplicado'],
  categorias_dre: ['grupo_dre', 'categoria', 'tipo', 'operacionalidade', 'ativo', 'ordem']
};

const ImportView: React.FC<ImportViewProps> = ({ 
  state, onImportTransactions, onImportCardTransactions, onImportCategories, onImportAssets, 
  onImportSnapshots, onAddInstitution, onAddEntity, onUpdateAssetClasses, onUpdateIndexers, onSaveTemplate 
}) => {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ label: string, count: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalize = (val: string) => (val || '').trim().toUpperCase();

  const parseFlexibleDate = (val: string) => {
    if (!val) return null;
    const clean = val.trim();
    if (clean.includes('/')) {
      const p = clean.split('/');
      if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    if (clean.includes('-')) {
      const p = clean.split('-');
      if (p.length === 3) return clean;
    }
    return null;
  };

  const mapUserGroupToDRE = (val: string): typeof DRE_GROUPS[number] => {
    const norm = normalize(val).replace(/ /g, '_');
    if (norm.includes('RECEITAS_OPERACIONAIS')) return 'RECEITAS OPERACIONAIS';
    if (norm.includes('CUSTO_DE_VIDA')) return 'CUSTO DE VIDA – SOBREVIVÊNCIA';
    if (norm.includes('DESPESAS_PROFISSIONAIS')) return 'DESPESAS PROFISSIONAIS';
    if (norm.includes('NAO_OPERACIONAIS')) return 'RECEITAS NÃO OPERACIONAIS';
    if (norm.includes('RECEITAS_FINANCEIRAS')) return 'RECEITAS FINANCEIRAS';
    if (norm.includes('INVESTIMENTOS')) return 'INVESTIMENTOS';
    if (norm.includes('TRANSFERENCIA')) return 'TRANSFERÊNCIAS INTERNAS';
    return 'RECEITAS NÃO OPERACIONAIS';
  };

  const findOrCreateEntity = (name: string, entities: Entity[]): Entity => {
    const normName = normalize(name);
    const existing = entities.find(e => normalize(e.nome) === normName);
    if (existing) return existing;
    
    const newEnt: Entity = { id: 'ent-' + Math.random().toString(36).substr(2, 9), nome: normName, tipo: 'PF' };
    onAddEntity(newEnt);
    return newEnt;
  };

  const findOrCreateInstitution = (name: string, institutions: Institution[], entityId: string): Institution => {
    const normName = normalize(name);
    const existing = institutions.find(i => normalize(i.nome) === normName);
    if (existing) return existing;

    const newInst: Institution = { 
      id: 'inst-' + Math.random().toString(36).substr(2, 9), 
      nome: normName, 
      tipo: 'Caixa/Carteira', 
      entidadeId: entityId, 
      saldoInicial: 0 
    };
    onAddInstitution(newInst);
    return newInst;
  };

  const handleDownloadModel = (type: ImportType) => {
    const delimiter = ";";
    const boms = "\uFEFF";
    const headers = OFFICIAL_TEMPLATES[type];
    
    let rowExample: string[] = [];
    if (type === 'fluxo') {
      rowExample = ['15/01/2026', '10/01/2026', 'Mercado', 'Compras Carrefour', 'CUSTO_DE_VIDA', 'OPERACIONAL', 'DESPESA', '-450,00', 'Nubank', 'Diego PF', ''];
    } else if (type === 'ativos') {
      rowExample = ['Dezembro/2025', 'CDB Pos', 'Liquidez', '110% CDI', 'BTG', 'Diego PF', '15000,00', '10/12/2025', '14500,00'];
    } else if (type === 'categorias_dre') {
      rowExample = ['RECEITAS_OPERACIONAIS', 'Consultoria', 'RECEITA', 'OPERACIONAL', 'SIM', '1'];
    } else if (type === 'fatura_cartao') {
      rowExample = ['Visa Infinite', '15/01/2026', 'Amazon Prime', '14,90', '1', '1', 'CUSTO_DE_VIDA', 'Diego PF'];
    }

    const csvContent = boms + headers.join(delimiter) + "\n" + rowExample.join(delimiter);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `modelo_${type}_ledger.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importType) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const separator = ';';
      const rows = text.split('\n').map(row => 
        row.split(new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
           .map(cell => cell.trim().replace(/^"|"$/g, ''))
      ).filter(r => r.length > 1);
      
      if (rows.length > 0) {
        setCsvHeaders(rows[0]);
        const data = rows.slice(1).map((row, idx) => {
          const obj: any = { id: `imp-${idx}` };
          OFFICIAL_TEMPLATES[importType!].forEach((key, i) => {
            obj[key] = row[i];
          });
          return obj;
        });
        setPreviewData(data);
        setStep(3);
      }
    };
    reader.readAsText(file);
  };

  const finalizeImport = () => {
    let importedTxs = 0;
    let createdCats = 0;
    let createdInsts = 0;

    let currentEntities = [...state.entities];
    let currentCategories = [...state.categories];
    let currentInstitutions = [...state.instituicoes];
    let newTransactions: Transaction[] = [];

    if (importType === 'fluxo') {
      previewData.forEach(p => {
        const tipoCSV = normalize(p.tipo);
        let val = parseFloat(String(p.valor).replace(/\./g, '').replace(',', '.')) || 0;
        
        if (tipoCSV === 'DESPESA' && val > 0) val = -val;
        if (tipoCSV === 'RECEITA' && val < 0) val = Math.abs(val);

        if (val === 0) return;

        const dataCaixa = parseFlexibleDate(p.dados_caixa);
        if (!dataCaixa) return;
        const dataCompetencia = parseFlexibleDate(p.dados_competencia) || dataCaixa;

        const ent = findOrCreateEntity(p.entidade, currentEntities);
        if (!currentEntities.find(e => e.id === ent.id)) currentEntities.push(ent);

        const catName = normalize(p.categoria);
        let cat = currentCategories.find(c => normalize(c.nome) === catName);
        if (!cat) {
          cat = {
            id: 'cat-' + Math.random().toString(36).substr(2, 9),
            nome: catName,
            tipo: val > 0 ? 'receita' : 'despesa',
            grupo: mapUserGroupToDRE(p.grupo_dre),
            isOperating: true
          };
          currentCategories.push(cat);
          createdCats++;
        }

        const instOrigem = findOrCreateInstitution(p.conta_origem, currentInstitutions, ent.id);
        if (!currentInstitutions.find(i => i.id === instOrigem.id)) {
           currentInstitutions.push(instOrigem);
           createdInsts++;
        }

        const natureza = normalize(p.natureza);

        if (natureza === 'TRANSFERENCIA' || natureza === 'TRANSFERÊNCIA') {
          const instDestino = findOrCreateInstitution(p.conta_destino, currentInstitutions, ent.id);
          if (!currentInstitutions.find(i => i.id === instDestino.id)) {
            currentInstitutions.push(instDestino);
            createdInsts++;
          }

          newTransactions.push({
            id: 'tx-transf-out-' + Math.random().toString(36).substr(2, 9),
            data: dataCaixa,
            dataCompetencia,
            dataCaixa,
            tipo: 'saida',
            valor: Math.abs(val),
            referencia: cat.id,
            entidadeId: ent.id,
            instituicaoId: instOrigem.id,
            detalhes: `[TRANSF] ${p.detalhamento}`,
            meioPagamento: 'dinheiro_pix_debito',
            tipoLancamento: 'TRANSFERENCIA_INTERNA',
            impactaDRE: false
          });

          newTransactions.push({
            id: 'tx-transf-in-' + Math.random().toString(36).substr(2, 9),
            data: dataCaixa,
            dataCompetencia,
            dataCaixa,
            tipo: 'entrada',
            valor: Math.abs(val),
            referencia: cat.id,
            entidadeId: ent.id,
            instituicaoId: instDestino.id,
            detalhes: `[TRANSF] ${p.detalhamento}`,
            meioPagamento: 'dinheiro_pix_debito',
            tipoLancamento: 'TRANSFERENCIA_INTERNA',
            impactaDRE: false
          });
          importedTxs += 2;
        } else {
          newTransactions.push({
            id: 'tx-imp-' + Math.random().toString(36).substr(2, 9),
            data: dataCaixa,
            dataCompetencia,
            dataCaixa,
            tipo: val > 0 ? 'entrada' : 'saida',
            valor: Math.abs(val),
            referencia: cat.id,
            entidadeId: ent.id,
            instituicaoId: instOrigem.id,
            detalhes: p.detalhamento || 'IMPORTADO',
            meioPagamento: 'dinheiro_pix_debito',
            tipoLancamento: 'OPERACIONAL',
            impactaDRE: true
          });
          importedTxs++;
        }
      });
      
      onImportCategories(currentCategories);
      onImportTransactions(newTransactions);
    } else if (importType === 'categorias_dre') {
       const newCats: Category[] = previewData.map(p => ({
          id: 'cat-' + Math.random().toString(36).substr(2, 9),
          nome: normalize(p.categoria),
          tipo: normalize(p.tipo) === 'RECEITA' ? 'receita' : 'despesa',
          grupo: mapUserGroupToDRE(p.grupo_dre),
          isOperating: normalize(p.operacionalidade) === 'OPERACIONAL'
       }));
       onImportCategories([...state.categories, ...newCats]);
       createdCats = newCats.length;
    }

    setSummary([
      { label: 'Registros Processados', count: previewData.length },
      { label: 'Impactos no Ledger', count: importedTxs + createdCats },
      { label: 'Auto-Provisionamento', count: createdInsts }
    ]);
    setStep(4);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      
      {step === 1 && (
        <div className="space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold uppercase tracking-[0.1em] text-[#D4AF37] font-serif-luxury leading-none">Inteligência de Dados Ledger</h2>
            <div className="flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/20 py-3 px-6 rounded-xl w-fit mx-auto">
              <Sparkles size={18} className="text-amber-500" />
              <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Motor de Normalização de Sinais Ativo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TemplateCard title="Extrato Unificado" icon={<Database size={28} />} onDownload={() => handleDownloadModel('fluxo')} onImport={() => { setImportType('fluxo'); setStep(2); }} highlight />
            <TemplateCard title="Carteira (Ativos)" icon={<TrendingUp size={28} />} onDownload={() => handleDownloadModel('ativos')} onImport={() => { setImportType('ativos'); setStep(2); }} />
            <TemplateCard title="Fatura de Cartão" icon={<Database size={28} />} onDownload={() => handleDownloadModel('fatura_cartao')} onImport={() => { setImportType('fatura_cartao'); setStep(2); }} />
            <TemplateCard title="Plano de Contas" icon={<Layers size={28} />} onDownload={() => handleDownloadModel('categorias_dre')} onImport={() => { setImportType('categorias_dre'); setStep(2); }} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-3xl mx-auto luxury-card p-16 text-center space-y-10 animate-in zoom-in-95">
          <Upload size={48} className="mx-auto text-[#D4AF37]" />
          <h3 className="text-2xl font-bold text-white uppercase font-serif-luxury tracking-widest leading-none">Ingestão de Arquivo</h3>
          <p className="label-text">O sistema aplicará validação contábil estrita sobre o sinal dos valores.</p>
          <div className="border-2 border-dashed border-[#262626] rounded-[2rem] p-20 hover:border-[#D4AF37]/50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheet size={64} className="mx-auto text-slate-700 group-hover:text-[#D4AF37] mb-6" />
            <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Carregar Template ( ; )</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
          </div>
          <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors">Cancelar Operação</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-[#111111] p-10 rounded-[2.5rem] border border-[#262626] flex justify-between items-center shadow-2xl">
            <div>
              <h3 className="text-2xl font-bold text-white uppercase font-serif-luxury leading-none">Auditoria de Pré-Carga</h3>
              <p className="label-text mt-3 text-[#D4AF37]">{previewData.length} registros mapeados com precisão</p>
            </div>
            <button onClick={finalizeImport} className="luxury-button px-16 py-4 flex items-center gap-3">CONFIRMAR E PROCESSAR <ArrowRight size={16} /></button>
          </div>

          <div className="luxury-card overflow-x-auto bg-black/40">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-[#0A0A0A] text-[10px] font-black uppercase text-slate-500 border-b border-[#262626]">
                    {OFFICIAL_TEMPLATES[importType!]?.map(h => <th key={h} className="px-8 py-6">{h.replace(/_/g, ' ')}</th>)}
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5 font-bold text-[11px]">
                  {previewData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                       {OFFICIAL_TEMPLATES[importType!]?.map(h => (
                         <td key={h} className="px-8 py-5 text-slate-300 uppercase">{row[