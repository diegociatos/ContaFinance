
import React, { useState, useMemo, useRef } from 'react';
import { 
  CreditCard as CreditCardType, 
  CardTransaction, 
  Category, 
  Entity, 
  Institution, 
  Transaction,
  MerchantRule,
  DRE_GROUPS
} from '../types';
import { 
  CreditCard as CardIcon, Plus, History, 
  Calculator, FileUp, X, Sparkles, Check,
  ChevronLeft, FileSpreadsheet, ChevronRight,
  ArrowRight, AlertCircle, CheckCircle2,
  LayoutTemplate, Search, Info, ShieldAlert
} from 'lucide-react';

interface CreditCardViewProps {
  state: {
    creditCards: CreditCardType[];
    cardTransactions: CardTransaction[];
    categories: Category[];
    entities: Entity[];
    instituicoes: Institution[];
    transactions: Transaction[];
    merchantRules: MerchantRule[];
  };
  onUpdateCards: (cards: CreditCardType[]) => void;
  onUpdateCardTransactions: (txs: CardTransaction[]) => void;
  onUpdateTransactions: (txs: Transaction[]) => void;
  onUpdateMerchantRules: (rules: MerchantRule[]) => void;
  isConfidential: boolean;
}

type StatementSection = 'PAGAMENTO' | 'CREDITO_ESTORNO' | 'COMPRA' | 'IGNORE';

interface StagingTx {
  tempId: string;
  section: StatementSection;
  data: string;
  rawDesc: string;
  cleanDesc: string;
  valor: number;
  categoryId: string;
  confirmed: boolean;
  parcelaAtual: number;
  parcelasTotal: number;
}

const CreditCardView: React.FC<CreditCardViewProps> = ({ 
  state, onUpdateCards, onUpdateCardTransactions, onUpdateTransactions, onUpdateMerchantRules, isConfidential 
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'txs' | 'recon'>('cards');
  const [selectedCardId, setSelectedCardId] = useState<string>(state.creditCards[0]?.id || '');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    data: '',
    merchant: '',
    valor: ''
  });
  const [stagingData, setStagingData] = useState<StagingTx[]>([]);
  const [importingMonth, setImportingMonth] = useState(new Date().toISOString().substring(0, 7));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  // --- MOTOR DE CATEGORIAS AGRUPADAS ---
  const groupedCategories = useMemo(() => {
    const groups: Record<string, Category[]> = {};
    DRE_GROUPS.forEach(g => {
      groups[g] = state.categories.filter(c => c.grupo === g);
    });
    return groups;
  }, [state.categories]);

  // --- MOTOR DE NORMALIZAÇÃO ---
  const normalizeValue = (val: string): number => {
    if (!val) return 0;
    let clean = val.replace(/[R$\s]/g, '');
    if (clean.startsWith('(') && clean.endsWith(')')) {
      clean = '-' + clean.substring(1, clean.length - 1);
    }
    clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const extractInstallments = (desc: string) => {
    const match = desc.match(/\((\d+)\/(\d+)\)/);
    if (match) {
      return { atual: parseInt(match[1]), total: parseInt(match[2]) };
    }
    return { atual: 1, total: 1 };
  };

  const detectSection = (row: string[]): StatementSection => {
    const fullRow = row.join(' ').toUpperCase();
    if (fullRow.includes('PAGAMENTO') || fullRow.includes('RECEBEMOS') || fullRow.includes('LIQUIDACAO')) return 'PAGAMENTO';
    if (fullRow.includes('CANCELAMENTO') || fullRow.includes('ESTORNO') || fullRow.includes('CREDITO')) return 'CREDITO_ESTORNO';
    if (fullRow.includes('COMPRA') || fullRow.includes('DESPESA') || /\d{2}\/\d{2}/.test(fullRow)) return 'COMPRA';
    return 'IGNORE';
  };

  // --- HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setImportStep(1);
      }
    };
    reader.readAsText(file);
  };

  const proceedToMapping = () => {
    if (csvRows.length === 0) return alert("Carregue um arquivo primeiro.");
    setImportStep(2);
  };

  const analyzeStatement = () => {
    if (!columnMapping.data || !columnMapping.merchant || !columnMapping.valor) {
      return alert("Mapeie Data, Estabelecimento e Valor.");
    }

    const dataIdx = csvHeaders.indexOf(columnMapping.data);
    const merchantIdx = csvHeaders.indexOf(columnMapping.merchant);
    const valorIdx = csvHeaders.indexOf(columnMapping.valor);

    const processed: StagingTx[] = csvRows.map((row, idx) => {
      const rawMerchant = row[merchantIdx] || '';
      const rawValue = normalizeValue(row[valorIdx] || '0');
      const section = detectSection(row);
      const inst = extractInstallments(rawMerchant);
      
      // Inteligência de Aprendizado (De-Para)
      const rule = state.merchantRules.find(r => rawMerchant.toUpperCase().includes(r.raw.toUpperCase()));

      return {
        tempId: `stg-${idx}`,
        section,
        data: row[dataIdx] || '',
        rawDesc: rawMerchant,
        cleanDesc: rule?.clean || rawMerchant.replace(/\(\d+\/\d+\)/, '').trim(),
        valor: rawValue,
        categoryId: rule?.categoryId || '',
        confirmed: !!rule,
        parcelaAtual: inst.atual,
        parcelasTotal: inst.total
      };
    }).filter(tx => tx.section !== 'IGNORE' && Math.abs(tx.valor) > 0);

    setStagingData(processed);
    setImportStep(3);
  };

  const confirmImport = () => {
    const cardTxs: CardTransaction[] = [];
    const bankTxs: Transaction[] = [];
    const newRules: MerchantRule[] = [...state.merchantRules];

    stagingData.forEach(stg => {
      if (stg.section === 'PAGAMENTO') {
        bankTxs.push({
          id: `tx-pay-${stg.tempId}-${Date.now()}`,
          data: stg.data,
          dataCompetencia: stg.data,
          dataCaixa: stg.data,
          tipo: 'saida',
          valor: Math.abs(stg.valor),
          referencia: state.categories.find(c => c.nome.toLowerCase().includes('fatura'))?.id || '',
          entidadeId: state.creditCards.find(c => c.id === selectedCardId)?.entidadeId || '',
          instituicaoId: state.creditCards.find(c => c.id === selectedCardId)?.instituicaoDebitoId || '',
          detalhes: `PAGAMENTO FATURA: ${stg.rawDesc}`,
          meioPagamento: 'dinheiro_pix_debito',
          tipoLancamento: 'PAGAMENTO_FATURA',
          impactaDRE: false,
          isCardPayment: true,
          linkedCardId: selectedCardId
        });
      } else {
        cardTxs.push({
          id: `ctx-${stg.tempId}-${Date.now()}`,
          cardId: selectedCardId,
          dataCompra: stg.data,
          dataVencimentoFatura: `${importingMonth}-01`,
          descricao: stg.cleanDesc.toUpperCase(),
          descricaoRaw: stg.rawDesc,
          categoryId: stg.categoryId,
          valor: stg.section === 'CREDITO_ESTORNO' ? -Math.abs(stg.valor) : Math.abs(stg.valor),
          valorTotalCompra: Math.abs(stg.valor),
          parcelasTotal: stg.parcelasTotal,
          parcelaAtual: stg.parcelaAtual,
          status: stg.categoryId ? 'Pendente' : 'Importado - Não Classificado'
        });

        // Evolução do Aprendizado: Registra nova regra se houver categoria
        if (stg.categoryId) {
          const normRaw = stg.rawDesc.replace(/\(\d+\/\d+\)/, '').trim().toUpperCase();
          const existingIdx = newRules.findIndex(r => r.raw === normRaw);
          if (existingIdx === -1) {
            newRules.push({ raw: normRaw, clean: stg.cleanDesc, categoryId: stg.categoryId });
          } else {
            newRules[existingIdx] = { ...newRules[existingIdx], categoryId: stg.categoryId, clean: stg.cleanDesc };
          }
        }
      }
    });

    onUpdateCardTransactions([...cardTxs, ...state.cardTransactions]);
    onUpdateTransactions([...bankTxs, ...state.transactions]);
    onUpdateMerchantRules(newRules);
    
    setShowImportModal(false);
    setImportStep(1);
    setStagingData([]);
    alert(`Importação Efetivada: ${cardTxs.length + bankTxs.length} lançamentos consolidados.`);
  };

  const conciliationData = useMemo(() => {
    const groups: Record<string, { totalCompras: number; totalPagos: number; status: string; txs: CardTransaction[] }> = {};
    state.cardTransactions.filter(t => t.cardId === selectedCardId).forEach(t => {
      const month = t.dataVencimentoFatura.substring(0, 7);
      if (!groups[month]) groups[month] = { totalCompras: 0, totalPagos: 0, status: 'Aberta', txs: [] };
      groups[month].totalCompras += t.valor;
      groups[month].txs.push(t);
    });
    state.transactions.filter(t => t.linkedCardId === selectedCardId && t.tipoLancamento === 'PAGAMENTO_FATURA').forEach(t => {
      const month = t.data.substring(0, 7);
      if (groups[month]) groups[month].totalPagos += t.valor;
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [state.cardTransactions, state.transactions, selectedCardId]);

  const pendingCount = useMemo(() => {
    return state.cardTransactions.filter(t => t.cardId === selectedCardId && (!t.categoryId || t.status === 'Importado - Não Classificado')).length;
  }, [state.cardTransactions, selectedCardId]);

  return (
    <div className="space-y-10 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#111111] p-6 rounded-3xl border border-[#262626] shadow-2xl">
        <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl border border-[#262626]">
          <TabBtn active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} label="Meus Plásticos" icon={<CardIcon size={14} />} />
          <TabBtn active={activeTab === 'txs'} onClick={() => setActiveTab('txs')} label="Timeline" icon={<History size={14} />} />
          <TabBtn active={activeTab === 'recon'} onClick={() => { setActiveTab('recon'); if(pendingCount > 0) alert(`Atenção: Existem ${pendingCount} lançamentos aguardando classificação gerencial.`); }} label="Conciliação" icon={<Calculator size={14} />} />
        </div>
        
        <div className="flex items-center gap-4">
           {pendingCount > 0 && (
             <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl border border-amber-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
               <AlertCircle size={14} /> {pendingCount} PENDÊNCIAS
             </div>
           )}
           <select 
              className="bg-black border border-[#D4AF37]/30 text-[11px] font-black text-[#D4AF37] uppercase tracking-widest p-3 rounded-xl outline-none min-w-[200px]" 
              value={selectedCardId} 
              onChange={e => setSelectedCardId(e.target.value)}
           >
             {state.creditCards.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
           </select>
           <button onClick={() => setShowImportModal(true)} className="luxury-button px-6 py-3 flex items-center gap-2"><FileUp size={16} /> IMPORTAR FATURA</button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.creditCards.map(card => (
              <div key={card.id} className={`luxury-card p-10 relative overflow-hidden group border-l-4 cursor-pointer transition-all ${selectedCardId === card.id ? 'border-[#D4AF37] bg-white/[0.02]' : 'border-transparent hover:border-white/10'}`} onClick={() => setSelectedCardId(card.id)}>
                <div className="flex justify-between items-start mb-12">
                  <div className="p-4 bg-black rounded-xl border border-[#262626] text-[#D4AF37]"><CardIcon size={24} /></div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">{card.bandeira}</p>
                    <p className="text-[8px] font-bold text-slate-500 mt-2 uppercase">Vence dia {card.diaVencimento}</p>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-white uppercase font-serif-luxury tracking-widest mb-10">{card.nome}</h4>
                <div className="grid grid-cols-2 gap-6 border-t border-[#262626] pt-8">
                  <div>
                    <p className="label-text mb-2 text-slate-500">Dívida Aberta</p>
                    <p className="text-lg font-bold text-white font-serif-luxury">{formatCurrency(state.cardTransactions.filter(t => t.cardId === card.id && t.status !== 'Pago').reduce((acc, t) => acc + t.valor, 0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="label-text mb-2 text-slate-500">Limite Atribuído</p>
                    <p className="text-lg font-bold text-[#D4AF37] font-serif-luxury">{formatCurrency(card.limite || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recon' && (
          <div className="space-y-8">
            <div className="luxury-card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0A0A0A] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-[#262626]">
                    <th className="px-10 py-6">Fatura (Mês/Ano)</th>
                    <th className="px-10 py-6 text-right">Compras & Despesas</th>
                    <th className="px-10 py-6 text-right">Pagamentos Localizados</th>
                    <th className="px-10 py-6 text-right">Saldo Devedor</th>
                    <th className="px-10 py-6 text-center">Status Auditoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-bold">
                  {conciliationData.map(([month, data]) => (
                    <tr key={month} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-10 py-6 uppercase text-white font-serif-luxury text-lg tracking-widest">{month}</td>
                      <td className="px-10 py-6 text-right text-sm">{formatCurrency(data.totalCompras)}</td>
                      <td className="px-10 py-6 text-right text-sm text-emerald-500">{formatCurrency(data.totalPagos)}</td>
                      <td className={`px-10 py-6 text-right text-sm ${data.totalCompras - data.totalPagos > 0.01 ? 'text-red-500' : 'text-slate-400'}`}>
                        {formatCurrency(Math.max(0, data.totalCompras - data.totalPagos))}
                      </td>
                      <td className="px-10 py-6 text-center">
                        {data.totalCompras - data.totalPagos <= 0.01 ? (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-1.5 rounded-lg text-[8px] font-black uppercase">Liquidada</span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-1.5 rounded-lg text-[8px] font-black uppercase">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ISE */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
           <div className="luxury-card w-full max-w-6xl h-[90vh] flex flex-col relative border-[#D4AF37]/40">
              <div className="p-10 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold text-[#D4AF37] uppercase tracking-widest font-serif-luxury">ISE - Auditoria Gerencial</h3>
                   <div className="flex gap-10 mt-6">
                      <ProgressStep active={importStep >= 1} current={importStep === 1} label="Ingestão" step="1/3" />
                      <ProgressStep active={importStep >= 2} current={importStep === 2} label="Mapeamento" step="2/3" />
                      <ProgressStep active={importStep >= 3} current={importStep === 3} label="Auditória" step="3/3" />
                   </div>
                 </div>
                 <button onClick={() => setShowImportModal(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X size={28} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {importStep === 1 && (
                  <div className="max-w-2xl mx-auto space-y-12 py-10">
                    <div className="space-y-2">
                       <label className="label-text">Competência Alvo</label>
                       <input type="month" className="w-full p-4 font-black" value={importingMonth} onChange={e => setImportingMonth(e.target.value)} />
                    </div>
                    <div 
                      className="p-20 border-2 border-dashed border-[#262626] rounded-[2rem] hover:border-[#D4AF37]/50 transition-all group cursor-pointer text-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileSpreadsheet size={64} className="mx-auto text-slate-700 group-hover:text-[#D4AF37] transition-all mb-6" />
                      <h4 className="text-xl font-bold text-white uppercase tracking-widest mb-2 font-serif-luxury">Selecionar Arquivo Digital</h4>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                    </div>
                    {csvRows.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-top-4 p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase text-white tracking-widest">{csvRows.length} registros extraídos</p>
                        <button onClick={proceedToMapping} className="luxury-button px-8 py-3 text-[10px]">Prosseguir <ArrowRight size={14} /></button>
                      </div>
                    )}
                  </div>
                )}

                {importStep === 2 && (
                  <div className="max-w-3xl mx-auto space-y-10">
                    <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.4em] font-serif-luxury border-b border-[#262626] pb-4">Ancoragem de Colunas</h4>
                    <div className="grid grid-cols-1 gap-8">
                       <MappingRow label="Coluna DATA" field="data" mapping={columnMapping} setMapping={setColumnMapping} headers={csvHeaders} />
                       <MappingRow label="Coluna ESTABELECIMENTO" field="merchant" mapping={columnMapping} setMapping={setColumnMapping} headers={csvHeaders} />
                       <MappingRow label="Coluna VALOR LÍQUIDO" field="valor" mapping={columnMapping} setMapping={setColumnMapping} headers={csvHeaders} />
                    </div>
                    <div className="pt-10 flex justify-end">
                      <button onClick={analyzeStatement} className="luxury-button px-16 py-4 flex items-center gap-3">INICIAR VARREDURA <Sparkles size={16} /></button>
                    </div>
                  </div>
                )}

                {importStep === 3 && (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-center bg-[#D4AF37]/5 p-8 rounded-[2rem] border border-[#D4AF37]/20">
                       <h4 className="text-lg font-bold text-white uppercase tracking-widest font-serif-luxury">Resultados da Extração</h4>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Total Mapeado</p>
                          <p className="text-3xl font-bold font-serif-luxury text-[#D4AF37]">{formatCurrency(stagingData.reduce((acc, d) => acc + (d.section === 'COMPRA' ? d.valor : -d.valor), 0))}</p>
                       </div>
                    </div>

                    <div className="luxury-card overflow-hidden bg-black/40">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#111111] text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-[#262626]">
                            <th className="px-8 py-6">Tipo</th>
                            <th className="px-8 py-6">Estabelecimento (Original)</th>
                            <th className="px-8 py-6">Identificação Gerencial</th>
                            <th className="px-8 py-6">Conta DRE (Estrutura)</th>
                            <th className="px-8 py-6 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-bold">
                          {stagingData.map(row => (
                            <tr key={row.tempId} className={`transition-all ${row.confirmed ? 'bg-white/[0.01]' : 'bg-[#D4AF37]/[0.02]'}`}>
                              <td className="px-8 py-5">
                                <span className={`text-[8px] font-black uppercase px-3 py-1 rounded border ${
                                  row.section === 'PAGAMENTO' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                                  row.section === 'CREDITO_ESTORNO' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
                                  'text-slate-500 border-white/10'
                                }`}>
                                  {row.section}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-slate-600 mb-1">{row.data}</span>
                                  <span className="text-[10px] text-slate-400 uppercase truncate max-w-[150px]">{row.rawDesc}</span>
                                  {row.parcelasTotal > 1 && <span className="text-[7px] text-[#D4AF37]">Parcela {row.parcelaAtual}/{row.parcelasTotal}</span>}
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <input 
                                  className="bg-black border border-[#262626] rounded-xl px-4 py-3 text-[10px] text-white w-full uppercase focus:border-[#D4AF37] outline-none" 
                                  value={row.cleanDesc} 
                                  onChange={e => setStagingData(prev => prev.map(s => s.tempId === row.tempId ? {...s, cleanDesc: e.target.value} : s))} 
                                />
                              </td>
                              <td className="px-8 py-5">
                                <select 
                                  className="bg-black border border-[#262626] rounded-xl px-4 py-3 text-[10px] text-white w-full focus:border-[#D4AF37] outline-none"
                                  value={row.categoryId}
                                  onChange={e => setStagingData(prev => prev.map(s => s.tempId === row.tempId ? {...s, categoryId: e.target.value, confirmed: !!e.target.value} : s))}
                                >
                                  <option value="">-- Vincular Conta --</option>
                                  {DRE_GROUPS.map(group => (
                                    groupedCategories[group].length > 0 && (
                                      <optgroup key={group} label={group} className="text-[#D4AF37] bg-black">
                                        {groupedCategories[group].map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                      </optgroup>
                                    )
                                  ))}
                                </select>
                              </td>
                              <td className={`px-8 py-5 text-right font-black text-sm font-serif-luxury ${row.section === 'COMPRA' ? 'text-white' : 'text-emerald-500'}`}>
                                {formatCurrency(row.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="pt-10 flex justify-end">
                       <button onClick={confirmImport} className="luxury-button px-20 py-5">EFETIVAR AUDITORIA</button>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon} {label}
  </button>
);

const ProgressStep = ({ active, current, label, step }: any) => (
  <div className="flex items-center gap-4">
     <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-black transition-all ${active ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-[#262626] text-slate-700'} ${current ? 'bg-[#D4AF37] text-black' : ''}`}>
       {step}
     </div>
     <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-700'}`}>{label}</span>
  </div>
);

const MappingRow = ({ label, field, mapping, setMapping, headers }: any) => (
  <div className="space-y-3">
     <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</label>
     <select 
       className={`w-full bg-black border rounded-2xl p-4 text-[11px] font-black uppercase tracking-widest outline-none transition-all ${mapping[field] ? 'border-[#D4AF37]/50 text-white shadow-[0_0_15px_rgba(212,175,55,0.05)]' : 'border-[#262626] text-slate-700'}`}
       value={mapping[field]}
       onChange={e => setMapping({...mapping, [field]: e.target.value})}
     >
       <option value="">-- SELECIONE A COLUNA --</option>
       {headers.map(h => <option key={h} value={h}>{h}</option>)}
     </select>
  </div>
);

export default CreditCardView;
