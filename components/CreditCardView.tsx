
import React, { useState, useMemo } from 'react';
import { 
  CreditCard as CreditCardType, 
  CardTransaction, 
  Category, 
  Entity, 
  Institution, 
  Transaction,
  CategoryMapping
} from '../types';
import { 
  CreditCard as CardIcon, Plus, Trash2, Calendar, Tag, FileText, 
  ArrowRight, Landmark, ShieldCheck, Layers, Info, CheckCircle2, 
  Search, RefreshCw, TrendingDown, Clock, ChevronRight, AlertCircle,
  ArrowDownLeft, History, Calculator
} from 'lucide-react';

interface CreditCardViewProps {
  state: {
    creditCards: CreditCardType[];
    cardTransactions: CardTransaction[];
    categories: Category[];
    entities: Entity[];
    instituicoes: Institution[];
    transactions: Transaction[];
    categoryMappings: CategoryMapping[];
  };
  onUpdateCards: (cards: CreditCardType[]) => void;
  onUpdateCardTransactions: (txs: CardTransaction[]) => void;
  onUpdateCategoryMappings: (mappings: CategoryMapping[]) => void;
  onAddBankTransaction?: (tx: Transaction) => void;
  isConfidential: boolean;
}

const CreditCardView: React.FC<CreditCardViewProps> = ({ 
  state, onUpdateCards, onUpdateCardTransactions, onUpdateCategoryMappings, isConfidential 
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'txs' | 'future' | 'recon'>('cards');
  const [selectedCardId, setSelectedCardId] = useState<string>(state.creditCards[0]?.id || '');
  const [showAddCard, setShowAddCard] = useState(false);
  
  const [txForm, setTxForm] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    valorTotal: '',
    categoryId: '',
    parcelas: '1'
  });

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const currentCard = state.creditCards.find(c => c.id === selectedCardId);

  // 1. Lógica de Faturas (Grouping)
  const invoices = useMemo(() => {
    if (!selectedCardId) return [];
    const months: Record<string, { total: number; items: CardTransaction[]; status: 'Aberta' | 'Paga' }> = {};
    
    state.cardTransactions
      .filter(t => t.cardId === selectedCardId)
      .forEach(t => {
        const monthKey = t.dataVencimentoFatura.substring(0, 7); // YYYY-MM
        if (!months[monthKey]) months[monthKey] = { total: 0, items: [], status: 'Aberta' };
        months[monthKey].total += t.valor;
        months[monthKey].items.push(t);
        if (t.status === 'Pago') months[monthKey].status = 'Paga';
      });

    return Object.entries(months)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [selectedCardId, state.cardTransactions]);

  // 2. Lógica de Conciliação
  const bankPayments = useMemo(() => {
    return state.transactions.filter(t => 
      t.tipoLancamento === 'PAGAMENTO_FATURA' || 
      t.detalhes.toLowerCase().includes('fatura') ||
      t.detalhes.toLowerCase().includes('cartao')
    );
  }, [state.transactions]);

  const handleConciliate = (monthKey: string, bankTxId: string) => {
    const updatedTxs = state.cardTransactions.map(t => {
      if (t.cardId === selectedCardId && t.dataVencimentoFatura.startsWith(monthKey)) {
        return { ...t, status: 'Pago' as const };
      }
      return t;
    });
    onUpdateCardTransactions(updatedTxs);
    alert(`Fatura de ${monthKey} conciliada com sucesso!`);
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.valorTotal || !txForm.descricao || !txForm.categoryId || !selectedCardId) return;
    
    const numParcelas = Number(txForm.parcelas);
    const valorTotal = parseFloat(txForm.valorTotal);
    const valorParcela = valorTotal / numParcelas;
    const grupoId = 'grp-' + Date.now();
    const baseDate = new Date(txForm.data);

    const newTxs: CardTransaction[] = [];
    for (let i = 0; i < numParcelas; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      newTxs.push({
        id: `ctx-${grupoId}-${i}`,
        cardId: selectedCardId,
        dataCompra: txForm.data,
        dataVencimentoFatura: dueDate.toISOString().split('T')[0],
        descricao: txForm.descricao.toUpperCase(),
        categoryId: txForm.categoryId,
        valor: valorParcela,
        valorTotalCompra: i === 0 ? valorTotal : 0,
        parcelasTotal: numParcelas,
        parcelaAtual: i + 1,
        status: 'Pendente',
        grupoId: grupoId
      });
    }

    onUpdateCardTransactions([...newTxs, ...state.cardTransactions]);
    setTxForm({ ...txForm, valorTotal: '', descricao: '', parcelas: '1' });
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newCard: CreditCardType = {
      id: 'card-' + Date.now(),
      nome: String(formData.get('nome')).toUpperCase(),
      bandeira: formData.get('bandeira') as any,
      entidadeId: String(formData.get('entidadeId')),
      instituicaoDebitoId: String(formData.get('bancoId')),
      diaFechamento: Number(formData.get('fechamento')),
      diaVencimento: Number(formData.get('vencimento')),
      limite: Number(formData.get('limite')) || 0
    };

    onUpdateCards([...state.creditCards, newCard]);
    setSelectedCardId(newCard.id);
    setShowAddCard(false);
  };

  return (
    <div className="space-y-10 font-sans">
      {/* Header e Seleção de Cartão */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#111111] p-6 rounded-3xl border border-[#262626] shadow-2xl">
        <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl border border-[#262626]">
          <TabBtn active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} label="Meus Plásticos" icon={<CardIcon size={14} />} />
          <TabBtn active={activeTab === 'txs'} onClick={() => setActiveTab('txs')} label="Timeline" icon={<History size={14} />} />
          <TabBtn active={activeTab === 'future'} onClick={() => setActiveTab('future')} label="Compromissos" icon={<TrendingDown size={14} />} />
          <TabBtn active={activeTab === 'recon'} onClick={() => setActiveTab('recon')} label="Conciliação" icon={<Calculator size={14} />} />
        </div>
        
        <div className="flex items-center gap-4">
           <select 
              className="bg-black border border-[#D4AF37]/30 text-[11px] font-black text-[#D4AF37] uppercase tracking-widest p-3 rounded-xl outline-none min-w-[200px]" 
              value={selectedCardId} 
              onChange={e => setSelectedCardId(e.target.value)}
           >
             {state.creditCards.length === 0 && <option>Nenhum Cartão</option>}
             {state.creditCards.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
           </select>
           <button onClick={() => setShowAddCard(true)} className="p-3 bg-[#D4AF37] text-black rounded-xl hover:scale-105 transition-all"><Plus size={18} /></button>
        </div>
      </div>

      {/* RENDERIZAÇÃO DAS ABAS */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {(() => {
          switch (activeTab) {
            case 'cards':
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {state.creditCards.map(card => (
                    <div key={card.id} className={`luxury-card p-10 relative overflow-hidden group border-l-4 ${selectedCardId === card.id ? 'border-[#D4AF37]' : 'border-transparent'}`} onClick={() => setSelectedCardId(card.id)}>
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
                          <p className="label-text mb-2">Utilizado</p>
                          <p className="text-lg font-bold text-white font-serif-luxury">{formatCurrency(state.cardTransactions.filter(t => t.cardId === card.id && t.status !== 'Pago').reduce((acc, t) => acc + t.valor, 0))}</p>
                        </div>
                        <div className="text-right">
                          <p className="label-text mb-2">Limite Total</p>
                          <p className="text-lg font-bold text-[#D4AF37] font-serif-luxury">{formatCurrency(card.limite || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowAddCard(true)} className="luxury-card p-10 border-dashed border-2 border-slate-800 flex flex-col items-center justify-center gap-4 group hover:border-[#D4AF37] transition-all">
                    <Plus className="text-slate-700 group-hover:text-[#D4AF37]" size={32} />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Habilitar Novo Plástico</span>
                  </button>
                </div>
              );

            case 'txs':
              return (
                <div className="space-y-10">
                  <div className="luxury-card p-10 bg-[#0F0F0F] border-[#D4AF37]/20">
                    <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-10 flex items-center gap-3"><Plus size={16} /> Novo Lançamento de Compra</h4>
                    <form onSubmit={handleAddTx} className="grid grid-cols-1 md:grid-cols-5 gap-8">
                      <div className="space-y-2">
                        <label className="label-text">Data</label>
                        <input required type="date" className="w-full p-4 font-bold" value={txForm.data} onChange={e => setTxForm({...txForm, data: e.target.value})} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="label-text">Estabelecimento</label>
                        <input required type="text" className="w-full p-4 font-bold uppercase" placeholder="EX: AMAZON BRASIL" value={txForm.descricao} onChange={e => setTxForm({...txForm, descricao: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="label-text">Valor Total</label>
                        <input required type="number" step="0.01" className="w-full p-4 font-bold" placeholder="0,00" value={txForm.valorTotal} onChange={e => setTxForm({...txForm, valorTotal: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="label-text">Parcelas</label>
                        <select className="w-full p-4 font-bold" value={txForm.parcelas} onChange={e => setTxForm({...txForm, parcelas: e.target.value})}>
                          {[1,2,3,4,5,6,10,12,18,24].map(n => <option key={n} value={n}>{n === 1 ? 'À Vista' : `${n}x Parcelas`}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-4 space-y-2">
                        <label className="label-text">Categoria DRE</label>
                        <select required className="w-full p-4 font-bold" value={txForm.categoryId} onChange={e => setTxForm({...txForm, categoryId: e.target.value})}>
                          <option value="">Selecione...</option>
                          {state.categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button type="submit" className="luxury-button w-full py-4 text-[10px] flex items-center justify-center gap-3">REGISTRAR COMPRA <ArrowRight size={14} /></button>
                      </div>
                    </form>
                  </div>

                  <div className="luxury-card overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#111111] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-[#262626]">
                          <th className="px-10 py-6">Data</th>
                          <th className="px-10 py-6">Estabelecimento</th>
                          <th className="px-10 py-6">Categoria</th>
                          <th className="px-10 py-6 text-center">Parcela</th>
                          <th className="px-10 py-6 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {state.cardTransactions
                          .filter(t => t.cardId === selectedCardId)
                          .sort((a,b) => b.dataCompra.localeCompare(a.dataCompra))
                          .map(tx => (
                            <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-10 py-5 text-slate-500 font-bold text-xs">{new Date(tx.dataCompra).toLocaleDateString('pt-BR')}</td>
                              <td className="px-10 py-5 font-bold text-white uppercase">{tx.descricao}</td>
                              <td className="px-10 py-5"><span className="text-[10px] font-black text-[#D4AF37] uppercase">{state.categories.find(c => c.id === tx.categoryId)?.nome}</span></td>
                              <td className="px-10 py-5 text-center"><span className="text-[10px] bg-black border border-white/10 px-3 py-1 rounded-full">{tx.parcelasTotal > 1 ? `${tx.parcelaAtual}/${tx.parcelasTotal}` : 'À Vista'}</span></td>
                              <td className="px-10 py-5 text-right font-black font-serif-luxury">{formatCurrency(tx.valor)}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              );

            case 'future':
              return (
                <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="luxury-card p-8 border-l-4 border-[#D4AF37]">
                        <p className="label-text mb-3">Saldo Devedor Projetado</p>
                        <h3 className="text-2xl font-bold font-serif-luxury">{formatCurrency(state.cardTransactions.filter(t => t.cardId === selectedCardId && t.status !== 'Pago').reduce((acc, t) => acc + t.valor, 0))}</h3>
                      </div>
                   </div>
                   <div className="luxury-card overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#111111] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-[#262626]">
                            <th className="px-10 py-6">Mês de Referência</th>
                            <th className="px-10 py-6 text-center">Qtd. Itens</th>
                            <th className="px-10 py-6">Status Provisório</th>
                            <th className="px-10 py-6 text-right">Total Fatura</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {invoices.map(inv => (
                            <tr key={inv.month} className="hover:bg-white/[0.02]">
                              <td className="px-10 py-6 text-sm font-bold text-white uppercase">{inv.month}</td>
                              <td className="px-10 py-6 text-center text-slate-500 font-bold">{inv.items.length} Parcelas</td>
                              <td className="px-10 py-6">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${inv.status === 'Paga' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-10 py-6 text-right font-black text-lg font-serif-luxury">{formatCurrency(inv.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              );

            case 'recon':
              return (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="luxury-card p-10">
                      <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-10">1. Selecione a Fatura em Aberto</h4>
                      <div className="space-y-4">
                        {invoices.filter(i => i.status === 'Aberta').map(inv => (
                          <div key={inv.month} className="flex justify-between items-center p-6 bg-black/40 border border-[#262626] rounded-2xl">
                             <div>
                               <p className="text-[10px] font-black text-slate-500 uppercase">Mês {inv.month}</p>
                               <p className="text-lg font-bold font-serif-luxury">{formatCurrency(inv.total)}</p>
                             </div>
                             <div className="flex gap-2">
                               {bankPayments.length > 0 ? (
                                 <button onClick={() => handleConciliate(inv.month, 'manual')} className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-[9px] font-black uppercase tracking-widest">Vincular Pagamento</button>
                               ) : (
                                 <p className="text-[9px] font-bold text-red-500 uppercase">Pagamento não localizado no banco</p>
                               )}
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="luxury-card p-10">
                      <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-10">2. Pagamentos Localizados no Extrato</h4>
                      <div className="space-y-4">
                        {bankPayments.length === 0 && <p className="text-slate-600 italic">Nenhum lançamento 'Pagamento de Fatura' encontrado no extrato bancário.</p>}
                        {bankPayments.map(p => (
                          <div key={p.id} className="p-6 bg-black/40 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                            <div>
                               <p className="text-[10px] font-black text-blue-400 uppercase">{p.data}</p>
                               <p className="text-sm font-bold text-white uppercase">{p.detalhes}</p>
                            </div>
                            <p className="font-black text-red-500">{formatCurrency(p.valor)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
          }
        })()}
      </div>

      {/* Modal de Cadastro de Cartão */}
      {showAddCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
           <form onSubmit={handleAddCard} className="luxury-card w-full max-w-2xl p-12 relative animate-in zoom-in-95 duration-300">
              <h3 className="text-2xl font-bold text-[#D4AF37] uppercase tracking-widest font-serif-luxury mb-12 border-b border-[#262626] pb-6">Novo Meio de Pagamento (Crédito)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2 col-span-2">
                    <label className="label-text">Nome do Cartão</label>
                    <input name="nome" required className="w-full p-4 font-bold text-sm" placeholder="Ex: VISA INFINITE - BTG" />
                 </div>
                 <div className="space-y-2">
                    <label className="label-text">Bandeira</label>
                    <select name="bandeira" className="w-full p-4 font-bold">
                       <option value="Visa">Visa</option>
                       <option value="Master">Mastercard</option>
                       <option value="Amex">Amex</option>
                       <option value="Elo">Elo</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="label-text">Titularidade</label>
                    <select name="entidadeId" className="w-full p-4 font-bold">
                       {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="label-text">Banco de Débito</label>
                    <select name="bancoId" className="w-full p-4 font-bold">
                       {state.instituicoes.filter(i => i.tipo === 'Banco').map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="label-text">Limite de Crédito</label>
                    <input name="limite" type="number" className="w-full p-4 font-bold" placeholder="0,00" />
                 </div>
                 <div className="space-y-2">
                    <label className="label-text">Dia Fechamento</label>
                    <input name="fechamento" type="number" className="w-full p-4 font-bold" placeholder="Dia" min="1" max="31" />
                 </div>
                 <div className="space-y-2">
                    <label className="label-text">Dia Vencimento</label>
                    <input name="vencimento" type="number" className="w-full p-4 font-bold" placeholder="Dia" min="1" max="31" />
                 </div>
              </div>
              <div className="mt-12 flex gap-4">
                 <button type="button" onClick={() => setShowAddCard(false)} className="flex-1 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descartar</button>
                 <button type="submit" className="flex-[2] luxury-button py-4">EFETIVAR CADASTRO</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon} {label}
  </button>
);

export default CreditCardView;
