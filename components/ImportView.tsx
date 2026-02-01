
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
  DRE_GROUPS 
} from '../types';
import { 
  Upload, 
  ChevronRight, 
  Database, 
  CheckCircle2, 
  Tag,
  Building2,
  Coins,
  Calculator,
  Save,
  Layers,
  FileDown,
  Info,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

type ImportType = 'categorias' | 'fluxo' | 'ativos' | 'fechamento';

interface ImportViewProps {
  state: {
    entities: Entity[];
    instituicoes: Institution[];
    categories: Category[];
    transactions: Transaction[];
    assets: Asset[];
    assetClasses: AssetClass[];
    indexers: Indexer[];
    mappingTemplates: MappingTemplate[];
  };
  onImportTransactions: (txs: Transaction[]) => void;
  onImportCategories: (cats: Category[]) => void;
  onImportAssets: (assets: Asset[]) => void;
  onImportSnapshots: (snaps: AssetSnapshot[]) => void;
  onAddInstitution: (inst: Institution) => void;
  onSaveTemplate: (tmpl: MappingTemplate) => void;
}

const FIELD_DEFINITIONS: Record<ImportType, { label: string; fields: { key: string; label: string; required: boolean }[] }> = {
  categorias: {
    label: 'Categorias de Controladoria',
    fields: [
      { key: 'nome', label: 'Nome da Categoria', required: true },
      { key: 'tipo', label: 'Tipo (receita/despesa)', required: true },
      { key: 'grupo', label: 'Grupo DRE', required: true },
      { key: 'isOperating', label: 'Operacional (Sim/Não)', required: false },
    ]
  },
  fluxo: {
    label: 'Fluxo de Caixa (Extrato)',
    fields: [
      { key: 'data', label: 'Data', required: true },
      { key: 'valor', label: 'Valor', required: true },
      { key: 'referencia', label: 'Referência / Categoria', required: true },
      { key: 'detalhes', label: 'Detalhes / Histórico', required: false },
    ]
  },
  ativos: {
    label: 'Carteira de Ativos Financeiros',
    fields: [
      { key: 'nome', label: 'Nome do Título', required: true },
      { key: 'instituicao', label: 'Instituição Custodiante', required: true },
      { key: 'classe', label: 'Classe de Ativo', required: true },
      { key: 'indexador', label: 'Indexador (Benchmark)', required: true },
    ]
  },
  fechamento: {
    label: 'Saldos Mensais (Patrimonial)',
    fields: [
      { key: 'ativoNome', label: 'Nome do Ativo', required: true },
      { key: 'saldoFinal', label: 'Saldo Final (R$)', required: true },
      { key: 'mes', label: 'Mês de Referência', required: true },
      { key: 'ano', label: 'Ano de Referência', required: true },
    ]
  }
};

const ImportView: React.FC<ImportViewProps> = ({ 
  state, onImportTransactions, onImportCategories, onImportAssets, onImportSnapshots, onAddInstitution, onSaveTemplate 
}) => {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState('');
  const [destinationInstId, setDestinationInstId] = useState('');
  const [statementFinalBalance, setStatementFinalBalance] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedInstitution = useMemo(() => 
    state.instituicoes.find(i => i.id === destinationInstId), 
    [destinationInstId, state.instituicoes]
  );

  const handleSelectType = (type: ImportType) => {
    setImportType(type);
    setStep(2);
  };

  const downloadModel = () => {
    if (!importType) return;
    const delimiter = ";";
    const bom = "\uFEFF";
    let content = "";
    let filename = "";

    switch (importType) {
      case 'fluxo':
        filename = "modelo_importacao_fluxo.csv";
        content = ["Data", "Valor", "Referencia", "Detalhes"].join(delimiter) + "\n" +
                  ["01/01/2026", "5000,00", "Honorários", "Projeto Alpha"].join(delimiter);
        break;
      case 'categorias':
        filename = "modelo_importacao_categorias.csv";
        content = ["Nome", "Tipo", "Grupo DRE", "Operacional"].join(delimiter) + "\n" +
                  ["Aluguel", "Despesa", "CUSTO DE VIDA SOBREVIVÊNCIA", "Sim"].join(delimiter);
        break;
      default:
        filename = `modelo_${importType}.csv`;
        content = FIELD_DEFINITIONS[importType].fields.map(f => f.label).join(delimiter);
    }

    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const separator = text.includes(';') ? ';' : ',';
      const rows = text.split('\n').map(row => 
        row.split(new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(cell => cell.replace(/^"|"$/g, '').trim())
      );
      if (rows.length > 0) {
        setCsvHeaders(rows[0]);
        setCsvData(rows.slice(1).filter(r => r.length > 1));
        setStep(3);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessMapping = () => {
    if (!importType) return;
    const fields = FIELD_DEFINITIONS[importType].fields;
    const processed = csvData.map((row, idx) => {
      const obj: any = { id: idx };
      fields.forEach(f => {
        const headerIdx = csvHeaders.indexOf(mapping[f.key]);
        obj[f.key] = headerIdx !== -1 ? row[headerIdx] : '';
      });
      return obj;
    });
    setPreviewData(processed);
    setStep(4);
  };

  const sanitizeVal = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const handleFinalImport = () => {
    if (!importType) return;
    
    switch (importType) {
      case 'fluxo':
        if (!destinationInstId) return alert('Selecione uma conta de destino.');
        // Fixed the mapping to include missing required properties from Transaction interface
        const txs: Transaction[] = previewData.map(p => {
          const valor = sanitizeVal(p.valor);
          const cat = state.categories.find(c => c.nome.toLowerCase() === String(p.referencia).toLowerCase());
          return {
            id: 'tx-' + Math.random().toString(36).substr(2, 9),
            data: p.data,
            dataCompetencia: p.data,
            dataCaixa: p.data,
            tipo: valor > 0 ? 'entrada' : 'saida',
            valor: Math.abs(valor),
            referencia: cat?.id || state.categories[0]?.id || '',
            entidadeId: selectedInstitution?.entidadeId || '',
            instituicaoId: destinationInstId,
            detalhes: p.detalhes || '',
            meioPagamento: 'dinheiro_pix_debito',
            tipoLancamento: 'OPERACIONAL',
            impactaDRE: true
          };
        });
        onImportTransactions(txs);
        break;

      case 'categorias':
        const cats: Category[] = previewData.map(p => ({
          id: 'cat-' + Math.random().toString(36).substr(2, 5),
          nome: p.nome,
          tipo: String(p.tipo).toLowerCase().includes('receita') ? 'receita' : 'despesa',
          grupo: p.grupo as any,
          isOperating: String(p.isOperating).toLowerCase() === 'sim'
        }));
        onImportCategories(cats);
        break;

      case 'ativos':
        // FIX: Adding the required 'strategicClass' property to satisfy Asset interface.
        const assets: Asset[] = previewData.map(p => {
          const inst = state.instituicoes.find(i => i.nome.toLowerCase().includes(String(p.instituicao).toLowerCase()));
          const cls = state.assetClasses.find(c => c.nome.toLowerCase() === String(p.classe).toLowerCase());
          const idx = state.indexers.find(i => i.nome.toLowerCase() === String(p.indexador).toLowerCase());
          return {
            id: 'asset-' + Math.random().toString(36).substr(2, 5),
            nome: p.nome,
            instituicaoId: inst?.id || state.instituicoes[0].id,
            classId: cls?.id || state.assetClasses[0].id,
            indexerId: idx?.id || state.indexers[0].id,
            entidadeId: inst?.entidadeId || state.entities[0].id,
            liquidez: 'D+0',
            strategicClass: 'Liquidez'
          };
        });
        onImportAssets(assets);
        break;
    }
    setStep(5);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-center gap-8 mb-10 bg-[#111111] p-6 rounded-[2rem] border border-[#262626]">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black ${step >= s ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#262626] text-slate-600'}`}>{s}</div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s ? 'text-[#F5F5F5]' : 'text-slate-600'}`}>{s === 1 ? 'Tipo' : s === 2 ? 'Upload' : s === 3 ? 'Mapear' : 'Revisar'}</span>
            {s < 4 && <ArrowRight size={14} className="text-[#262626] ml-4" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ImportCard icon={<Database className="text-blue-500" />} title="Fluxo Bancário" desc="Extratos CSV de bancos tradicionais" onClick={() => handleSelectType('fluxo')} />
          <ImportCard icon={<Layers className="text-emerald-500" />} title="Categorias" desc="Dicionário de contas DRE" onClick={() => handleSelectType('categorias')} />
          <ImportCard icon={<Coins className="text-amber-500" />} title="Carteira" desc="Lista de Ativos e Títulos" onClick={() => handleSelectType('ativos')} />
          <ImportCard icon={<Calculator className="text-slate-400" />} title="Fechamento" desc="Saldos mensais históricos" onClick={() => handleSelectType('fechamento')} />
        </div>
      )}

      {step === 2 && importType && (
        <div className="bg-[#1A1A1A] p-20 rounded-[3rem] border border-[#262626] text-center space-y-10">
          <Upload size={48} className="text-[#D4AF37] mx-auto" />
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-2xl font-black italic uppercase text-[#F5F5F5]">Carregamento de Dados</h3>
            <p className="text-sm text-[#94A3B8]">Você está importando: <b>{FIELD_DEFINITIONS[importType].label}</b></p>
          </div>

          {importType === 'fluxo' && (
            <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-2">
                <label className="label-text">Conta de Destino</label>
                <select className="w-full p-4" value={destinationInstId} onChange={e => setDestinationInstId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {state.instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-text">Saldo Final do Extrato</label>
                <input type="text" className="w-full p-4" placeholder="R$ 0,00" value={statementFinalBalance} onChange={e => setStatementFinalBalance(e.target.value)} />
              </div>
            </div>
          )}

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#262626] rounded-[2rem] p-16 cursor-pointer hover:border-[#D4AF37] transition-all group"
          >
            <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-[#D4AF37] transition-colors">Clique para selecionar o arquivo CSV</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
          </div>

          <button onClick={downloadModel} className="flex items-center gap-2 mx-auto text-[#D4AF37] text-[10px] font-black uppercase tracking-widest hover:underline">
            <FileDown size={14} /> Baixar Modelo Exemplo
          </button>
        </div>
      )}

      {step === 3 && importType && (
        <div className="bg-[#1A1A1A] p-12 rounded-[3rem] border border-[#262626] space-y-10">
          <h3 className="text-xl font-black text-[#F5F5F5] uppercase italic tracking-widest">Mapeamento de Colunas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FIELD_DEFINITIONS[importType].fields.map(field => (
              <div key={field.key} className="p-6 bg-[#111111] rounded-2xl border border-[#262626] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#F5F5F5] uppercase">{field.label} {field.required && '*'}</p>
                </div>
                <select className="w-48" value={mapping[field.key] || ''} onChange={e => setMapping({...mapping, [field.key]: e.target.value})}>
                  <option value="">Não mapeado</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-6 pt-10">
            <button onClick={() => setStep(2)} className="text-[#94A3B8] font-black text-[10px] uppercase">Voltar</button>
            <button onClick={handleProcessMapping} className="luxury-button px-10 py-4">Processar Dados</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-8 animate-in slide-in-from-right-10">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black italic uppercase text-[#F5F5F5]">Conferência Final</h3>
              <p className="text-[10px] text-[#D4AF37] font-bold uppercase mt-1">Verifique as inconsistências antes de gravar no banco</p>
            </div>
            <button onClick={handleFinalImport} className="luxury-button px-12 py-4">Efetivar Importação</button>
          </div>
          <div className="luxury-card overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#111111] text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-[#262626]">
                  {importType && FIELD_DEFINITIONS[importType].fields.map(f => <th key={f.key} className="px-8 py-5">{f.label}</th>)}
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {previewData.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {importType && FIELD_DEFINITIONS[importType].fields.map(f => (
                      <td key={f.key} className="px-8 py-4 font-bold text-[#F5F5F5] italic">{row[f.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="bg-[#1A1A1A] p-20 rounded-[3rem] border border-[#262626] text-center space-y-10">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto" />
          <h3 className="text-3xl font-black italic uppercase text-[#F5F5F5]">Sucesso na Importação</h3>
          <p className="text-[#94A3B8]">Os dados foram persistidos e consolidados no seu Ledger Privado.</p>
          <button onClick={() => window.location.reload()} className="luxury-button px-16 py-5">Ir para Dashboard</button>
        </div>
      )}
    </div>
  );
};

const ImportCard = ({ icon, title, desc, onClick }: any) => (
  <div onClick={onClick} className="bg-[#1A1A1A] p-10 rounded-[2.5rem] border border-[#262626] hover:border-[#D4AF37] transition-all cursor-pointer group flex flex-col items-center text-center">
    <div className="p-5 bg-[#111111] rounded-2xl mb-6 group-hover:bg-[#D4AF37]/10 transition-all">{icon}</div>
    <h4 className="text-sm font-black text-[#F5F5F5] uppercase italic">{title}</h4>
    <p className="text-[10px] text-[#94A3B8] mt-2 leading-relaxed">{desc}</p>
  </div>
);

export default ImportView;
