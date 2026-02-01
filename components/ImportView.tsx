
import React, { useState, useRef, useMemo } from 'react';
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
  CheckCircle2, 
  Tag,
  Calculator,
  FileUp,
  ArrowRight,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Download,
  FileSpreadsheet,
  X,
  History,
  Sparkles,
  Layers
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
  onSaveTemplate: (tmpl: MappingTemplate) => void;
}

const OFFICIAL_TEMPLATES: Record<string, string[]> = {
  fatura_cartao: ['cartao_nome', 'data_compra', 'descricao_original', 'valor', 'parcela_atual', 'parcelas_total', 'categoria_dre', 'entidade'],
  fluxo: ['conta_nome', 'data', 'descricao', 'valor', 'tipo_movimentacao', 'categoria_dre', 'entidade'],
  ativos: ['ativo_nome', 'tipo_ativo', 'classe_estratégica', 'indexador', 'taxa_indexador', 'valor_aplicado', 'saldo_atual', 'liquidez', 'entidade'],
  categorias_dre: ['grupo_dre', 'categoria', 'tipo', 'operacionalidade', 'ativo', 'ordem']
};

const ImportView: React.FC<ImportViewProps> = ({ 
  state, onImportTransactions, onImportCardTransactions, onImportCategories, onImportAssets, onImportSnapshots, onAddInstitution, onSaveTemplate 
}) => {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DOWNLOAD DE MODELOS OFICIAIS ---
  const handleDownloadModel = (type: ImportType) => {
    const delimiter = ";";
    const bom = "\uFEFF";
    let headers: string[] = OFFICIAL_TEMPLATES[type];
    let rows: string[][] = [];

    if (type === 'categorias_dre') {
      rows = [
        ['RECEITAS OPERACIONAIS', 'Ciatos Consultoria', 'RECEITA', 'OPERACIONAL', 'SIM', '1'],
        ['CUSTO DE VIDA SOBREVIVÊNCIA', 'Mercado', 'DESPESA', 'OPERACIONAL', 'SIM', '2'],
        ['DESPESAS PROFISSIONAIS', 'Marketing Digital', 'DESPESA', 'OPERACIONAL', 'SIM', '3'],
        ['MOVIMENTAÇÕES NÃO OPERACIONAIS', 'Dividendos Recebidos', 'RECEITA', 'NAO_OPERACIONAL', 'SIM', '4']
      ];
    } else if (type === 'fatura_cartao') {
      rows = [['VISA INFINITE', '20/01/2026', 'APPLE STORE', '4500,00', '1', '10', 'INVESTIMENTOS', 'DIEGO GARCIA']];
    } else if (type === 'fluxo') {
      rows = [['BANCO ITAU', '20/01/2026', 'RECEBIMENTO CLIENTE A', '15000,00', 'ENTRADA', 'RECEITAS OPERACIONAIS', 'HOLDING GARCIA']];
    } else if (type === 'ativos') {
      rows = [['TESOURO IPCA+ 2035', 'RENDA FIXA', 'LONGO PRAZO', 'IPCA', '5,5', '50000,00', '52500,00', 'D+1', 'DIEGO PF']];
    }

    const csvContent = bom + headers.join(delimiter) + "\n" + rows.map(r => r.join(delimiter)).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_ledger_${type}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- MOTOR DE INGESTÃO ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importType) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const separator = text.includes(';') ? ';' : ',';
      const rows = text.split('\n').map(row => 
        row.split(new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
           .map(cell => cell.trim().replace(/^"|"$/g, ''))
      ).filter(r => r.length > 1 && !r.every(c => c === ''));
      
      if (rows.length > 0) {
        setCsvHeaders(rows[0]);
        setCsvRows(rows.slice(1));
        
        // Mapeamento automático por nome de coluna
        const headers = rows[0];
        const data = rows.slice(1).map((row, idx) => {
          const obj: any = { id: `imp-${idx}` };
          headers.forEach((h, i) => {
            const officialKey = OFFICIAL_TEMPLATES[importType].find(k => k === h.toLowerCase());
            if (officialKey) obj[officialKey] = row[i];
            else obj[h] = row[i];
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
    if (importType === 'categorias_dre') {
      const newCats: Category[] = previewData.map(p => ({
        id: 'cat-' + Math.random().toString(36).substr(2, 9),
        nome: String(p.categoria || p.Nome || '').toUpperCase(),
        tipo: (p.tipo || '').toLowerCase().includes('receita') ? 'receita' : 'despesa',
        grupo: (p.grupo_dre || p.Grupo || 'DESPESAS PROFISSIONAIS') as any,
        isOperating: !(p.operacionalidade || '').toLowerCase().includes('nao')
      }));

      // Persistência em dreCategories como solicitado + Estado Global
      const existing = JSON.parse(localStorage.getItem('dreCategories') || '[]');
      const combined = [...existing, ...newCats];
      localStorage.setItem('dreCategories', JSON.stringify(combined));
      
      onImportCategories([...state.categories, ...newCats]);
      alert(`${newCats.length} categorias integradas ao Plano de Contas.`);
    }

    if (importType === 'fatura_cartao') {
      const txs: CardTransaction[] = previewData.map(p => ({
        id: 'ctx-' + Math.random().toString(36).substr(2, 9),
        cardId: state.creditCards.find(c => c.nome.toUpperCase().includes(String(p.cartao_nome).toUpperCase()))?.id || 'unknown',
        dataCompra: p.data_compra,
        dataVencimentoFatura: '',
        descricao: String(p.descricao_original).toUpperCase(),
        descricaoRaw: p.descricao_original,
        categoryId: state.categories.find(c => c.nome.toUpperCase() === String(p.categoria_dre).toUpperCase())?.id || '',
        valor: parseFloat(p.valor.replace(',', '.')) || 0,
        valorTotalCompra: parseFloat(p.valor.replace(',', '.')) || 0,
        parcelasTotal: parseInt(p.parcelas_total) || 1,
        parcelaAtual: parseInt(p.parcela_atual) || 1,
        status: 'Pendente'
      }));
      onImportCardTransactions(txs);
      alert(`${txs.length} lançamentos de cartão importados.`);
    }

    setStep(1);
    setImportType(null);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      
      {/* 1. CENTRAL DE MODELOS (TEMPLATES) */}
      {step === 1 && (
        <div className="space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold uppercase tracking-[0.1em] text-[#D4AF37] font-serif-luxury leading-none">Central de Modelos de Importação</h2>
            <div className="flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/20 py-3 px-6 rounded-xl w-fit mx-auto">
              <AlertTriangle size={18} className="text-amber-500" />
              <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Aviso: O sistema mapeia colunas oficiais automaticamente. Outros formatos requerem ancoragem manual.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TemplateCard 
              title="Fatura de Cartão" 
              desc="Mapeamento para faturas bancárias (.csv)" 
              icon={<CreditCard size={28} />}
              onDownload={() => handleDownloadModel('fatura_cartao')}
              onImport={() => { setImportType('fatura_cartao'); setStep(2); }}
            />
            <TemplateCard 
              title="Extrato Bancário" 
              desc="Fluxo diário de contas PF ou PJ." 
              icon={<Database size={28} />}
              onDownload={() => handleDownloadModel('fluxo')}
              onImport={() => { setImportType('fluxo'); setStep(2); }}
            />
            <TemplateCard 
              title="Carteira (Ativos)" 
              desc="Gestão de saldos e ativos estratégicos." 
              icon={<TrendingUp size={28} />}
              onDownload={() => handleDownloadModel('ativos')}
              onImport={() => { setImportType('ativos'); setStep(2); }}
            />
            <TemplateCard 
              title="Categorias (DRE)" 
              desc="Plano de Contas Gerenciais e Alocação." 
              icon={<Layers size={28} />}
              onDownload={() => handleDownloadModel('categorias_dre')}
              onImport={() => { setImportType('categorias_dre'); setStep(2); }}
              highlight
            />
          </div>
        </div>
      )}

      {/* 2. UPLOAD STEP */}
      {step === 2 && (
        <div className="max-w-3xl mx-auto luxury-card p-16 text-center space-y-10 animate-in zoom-in-95">
          <div className="p-6 bg-black rounded-3xl border border-[#D4AF37]/30 text-[#D4AF37] w-fit mx-auto shadow-2xl">
            <Upload size={48} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white uppercase font-serif-luxury tracking-widest">Ingestão de Dados Digitais</h3>
            <p className="label-text mt-3">Preparando motor para: {importType?.replace('_', ' ').toUpperCase()}</p>
          </div>
          <div 
            className="border-2 border-dashed border-[#262626] rounded-[2rem] p-20 hover:border-[#D4AF37]/50 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet size={64} className="mx-auto text-slate-700 group-hover:text-[#D4AF37] mb-6 transition-colors" />
            <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Selecione o arquivo CSV exportado</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
          </div>
          <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors tracking-[0.2em]">Cancelar Operação</button>
        </div>
      )}

      {/* 3. REVIEW STEP */}
      {step === 3 && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-[#111111] p-10 rounded-[2.5rem] border border-[#262626] flex justify-between items-center shadow-2xl">
            <div>
              <h3 className="text-2xl font-bold text-white uppercase font-serif-luxury">Auditoria de Pré-Importação</h3>
              <p className="label-text mt-2 text-[#D4AF37]">{previewData.length} registros identificados para processamento</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white">Trocar Arquivo</button>
              <button onClick={finalizeImport} className="luxury-button px-16 py-4 flex items-center gap-3">EFETIVAR IMPORTAÇÃO <CheckCircle2 size={16} /></button>
            </div>
          </div>

          <div className="luxury-card overflow-hidden bg-black/40">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-[#0A0A0A] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-[#262626]">
                    {OFFICIAL_TEMPLATES[importType!]?.map(h => <th key={h} className="px-8 py-6">{h.replace('_', ' ')}</th>)}
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5 font-bold text-[11px]">
                  {previewData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                       {OFFICIAL_TEMPLATES[importType!]?.map(h => (
                         <td key={h} className="px-8 py-5 text-slate-300 uppercase">{row[h] || '--'}</td>
                       ))}
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateCard = ({ title, desc, icon, onDownload, onImport, highlight }: any) => (
  <div className={`luxury-card p-10 flex flex-col justify-between group transition-all duration-500 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] ${highlight ? 'border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.1)]' : 'hover:border-[#D4AF37]/50'}`}>
    <div className="space-y-6">
      <div className="p-4 bg-black rounded-2xl border border-[#262626] text-[#D4AF37] w-fit shadow-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className="text-xl font-bold text-white uppercase font-serif-luxury tracking-wider mb-2 leading-none">{title}</h4>
        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed font-sans">{desc}</p>
      </div>
    </div>
    
    <div className="mt-10 space-y-3">
      <button 
        onClick={onImport}
        className="flex items-center justify-center gap-3 w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-[#D4AF37] text-black rounded-xl hover:brightness-110 transition-all shadow-lg"
      >
        <Upload size={14} /> IMPORTAR AGORA
      </button>
      <button 
        onClick={onDownload} 
        className="flex items-center justify-center gap-3 w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] border border-[#262626] text-slate-400 rounded-xl hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all"
      >
        <Download size={14} /> BAIXAR MODELO
      </button>
    </div>
  </div>
);

export default ImportView;
