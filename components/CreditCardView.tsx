
import React, { useState, useMemo, useRef } from 'react';
import { 
  CreditCard as CreditCardType, 
  CardTransaction, 
  Category, 
  Entity, 
  Institution, 
  Transaction,
  CardTransactionStatus
} from '../types';
import { 
  CreditCard as CardIcon, Plus, Trash2, Calendar, Tag, FileText, 
  ArrowRight, Landmark, ShieldCheck, Layers, Info, CheckCircle2, Upload, FileDown, Database, AlertCircle, RefreshCw
} from 'lucide-react';

interface CreditCardViewProps {
  state: {
    creditCards: CreditCardType[];
    cardTransactions: CardTransaction[];
    categories: Category[];
    entities: Entity[];
    instituicoes: Institution[];
    transactions: Transaction[];
  };
  onUpdateCards: (cards: CreditCardType[]) => void;
  onUpdateCardTransactions: (txs: CardTransaction[]) => void;
  onAddBankTransaction: (tx: Transaction) => void;
  activeSubTab: 'cards' | 'txs' | 'import';
  isConfidential: boolean;
}

const CreditCardView: React.FC<CreditCardViewProps> = ({ 
  state, onUpdateCards, onUpdateCardTransactions, activeSubTab, isConfidential 
}) => {
  const [subTab, setSubTab] = useState<'cards' | 'txs' | 'import'>(activeSubTab);
  const [selectedCardId, setSelectedCardId] = useState<string>(state.creditCards[0]?.id || '');
  const [showAddCard, setShowAddCard] = useState(false);
  
  // States para Importação
  const [importStep, setImportStep] = useState(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importPreview, setImportPreview] = useState<{ new: CardTransaction[], reconciled: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [txForm, setTxForm] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    valor: '',
    categoryId: '',
    parcelas: '1'
  });

  const [cardForm, setCardForm] = useState({
    nome: '',
    bandeira: 'Visa' as any,
    entidadeId: '',
    instituicaoDebitoId: '',
    diaFechamento: 10,
    diaVencimento: 17,
    limite: ''
  });

  const currentCard = state.creditCards.find(c => c.id === selectedCardId);

  // Lógica de Importação de CSV
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
        setImportStep(2);
      }
    };
    reader.readAsText(file);
  };

  const processImport = () => {
    if (!selectedCardId) return;
    const newItems: CardTransaction[] = [];
    let reconciledCount = 0;

    csvData.forEach(row => {
      const dataStr = row[csvHeaders.indexOf(mapping.data)];
      const valorStr = row[csvHeaders.indexOf(mapping.valor)] || '0';
      const descricao = row[csvHeaders.indexOf(mapping.descricao)] || 'IMPORTADO';
      
      const valor = Math.abs(parseFloat(valorStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')));
      const dataIso = dataStr?.split('/').reverse().join('-') || new Date().toISOString().split('T')[0];

      // Inteligência de Conciliação
      const isDuplicate = state.cardTransactions.some(t => 
        t.cardId === selectedCardId && 
        t.dataCompra === dataIso && 
        Math.abs(t.valor - valor) < 0.01 &&
        t.descricao.toLowerCase().includes(descricao.toLowerCase().substring(0, 5))
      );

      if (isDuplicate) {
        reconciledCount++;
      } else {
        newItems.push({
          id: 'ctx-' + Math.random().toString(36).substr(2, 9),
          cardId: selectedCardId,
          dataCompra: dataIso,
          descricao: descricao.toUpperCase(),
          categoryId: state.categories[0]?.id || '',
          valor: valor,
          parcelasTotal: 1,
          parcelaAtual: 1,
          status: 'Conciliado'
        });
      }
    });

    setImportPreview({ new: newItems, reconciled: reconciledCount });
    setImportStep(3);
  };

  const finalizeImport = () => {
    if (importPreview) {
      onUpdateCardTransactions([...importPreview.new, ...state.cardTransactions]);
      setImportStep(4);
    }
  };

  const invoiceSummary = useMemo(() => {
    if (!selectedCardId) return { total: 0, status: 'Pendente' };
    const total = state.cardTransactions
      .filter(t => t.cardId === selectedCardId && t.status !== 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
    
    const isPaid = state.transactions.some(t => t.isCardPayment && t.linkedCardId === selectedCardId);
    return { total, status: isPaid ? 'Paga' : 'Pendente' };
  }, [selectedCardId, state.cardTransactions, state.transactions]);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.nome || !cardForm.entidadeId) return;
    const newCard: CreditCardType = {
      id: 'card-' + Math.random().toString(36).substr(2, 9),
      nome: cardForm.nome,
      bandeira: cardForm.bandeira,
      entidadeId: cardForm.entidadeId,
      instituicaoDebitoId: cardForm.instituicaoDebitoId,
      diaFechamento: Number(cardForm.diaFechamento),
      diaVencimento: Number(cardForm.diaVencimento),
      limite: Number(cardForm.limite)
    };
    onUpdateCards([...state.creditCards, newCard]);
    setShowAddCard(false);
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.valor || !txForm.descricao || !txForm.categoryId || !selectedCardId) return;
    const numParcelas = Number(txForm.parcelas);
    const valorTotal = parseFloat(txForm.valor);
    const valorParcela = valorTotal / numParcelas;
    const grupoId = 'grp-' + Math.random().toString(36).substr(2, 9);
    const newTxs: CardTransaction[] = [];
    const baseDate = new Date(txForm.data);
    for (let i = 0; i < numParcelas; i++) {
      const pDate = new Date(baseDate);
      pDate.setMonth(pDate.getMonth() + i);
      newTxs.push({
        id: 'ctx-' + Math.random().toString(36).substr(2, 9),
        cardId: selectedCardId,
        dataCompra: txForm.data,
        descricao: txForm.descricao + (numParcelas > 1 ? ` (${i + 1}/${numParcelas})` : ''),
        categoryId: txForm.categoryId,
        valor: valorParcela,
        parcelasTotal: numParcelas,
        parcelaAtual: i + 1,
        status: 'Pendente',
        grupoId: numParcelas > 1 ? grupoId : undefined
      });
    }
    onUpdateCardTransactions([...newTxs, ...state.cardTransactions]);
    setTxForm({ ...txForm, valor: '', descricao: '', parcelas: '1' });
  };

  const renderContent = () => {
    switch (subTab) {
      case 'cards':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest italic" style={{ fontFamily: 'Book Antiqua' }}>Portfólio de Crédito</h3>
              <button onClick={() => setShowAddCard(true)} className="luxury-button px-6 py-3 text-[10px] flex items-center gap-2"><Plus size={14} /> NOVO CARTÃO</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {state.creditCards.map(card => (
                <div key={card.id} className="luxury-card p-8 group hover:border-[#D4AF37] transition-all cursor-pointer" onClick={() => { setSelectedCardId(card.id); setSubTab('txs'); }}>
                   <div className="flex justify-between items-start mb-10">
                      <div className="w-16 h-12 bg-slate-900 rounded-xl border border-[#262626] flex items-center justify-center text-[#D4AF37] shadow-xl"><CardIcon size={24} /></div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">{card.bandeira}</p>
                        <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">FECHAMENTO DIA {card.diaFechamento}</p>
                      </div>
                   </div>
                   <h4 className="text-lg font-bold text-white uppercase italic mb-6">{card.nome}</h4>
                   <div className="border-t border-[#262626] pt-6 flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Status Fatura</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${invoiceSummary.status === 'Paga' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>{invoiceSummary.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Total Aberto</p>
                        <p className="text-sm font-black text-[#D4AF37] italic">
                          {isConfidential ? 'R$ ••••••' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceSummary.total)}
                        </p>
                      </div>
                   </div>
                </div>
              ))}
            </div>

            {showAddCard && (
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="luxury-card w-full max-w-2xl p-12 relative animate-in zoom-in-95">
                  <h3 className="text-2xl font-bold text-[#D4AF37] uppercase italic tracking-widest mb-10">Habilitar Novo Plástico</h3>
                  <form onSubmit={handleAddCard} className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 space-y-2">
                      <label className="label-text">Nome do Cartão</label>
                      <input required type="text" className="w-full p-4" placeholder="Ex: Master Black Unlimited" value={cardForm.nome} onChange={e => setCardForm({...cardForm, nome: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="label-text">Titularidade</label>
                      <select required className="w-full p-4" value={cardForm.entidadeId} onChange={e => setCardForm({...cardForm, entidadeId: e.target.value})}>
                        <option value="">Selecione...</option>
                        {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-text">Banco de Débito</label>
                      <select required className="w-full p-4" value={cardForm.instituicaoDebitoId} onChange={e => setCardForm({...cardForm, instituicaoDebitoId: e.target.value})}>
                        <option value="">Selecione...</option>
                        {state.instituicoes.filter(i => i.tipo === 'Banco').map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 pt-6 flex gap-4">
                      <button type="button" onClick={() => setShowAddCard(false)} className="flex-1 p-4 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
                      <button type="submit" className="flex-[2] luxury-button py-5">ADICIONAR CARTÃO</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

      case 'txs':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="luxury-card p-10 bg-[#0A0A0A]">
              <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-10 border-b border-[#262626] pb-4">Lançamento Manual em Cartão</h4>
              <form onSubmit={handleAddTx} className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <label className="label-text">Data da Compra</label>
                  <input required type="date" className="w-full p-4 text-xs font-bold" value={txForm.data} onChange={e => setTxForm({...txForm, data: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="label-text">Descrição</label>
                  <input required type="text" className="w-full p-4 text-xs font-bold uppercase" placeholder="EX: AMAZON BRASIL" value={txForm.descricao} onChange={e => setTxForm({...txForm, descricao: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label-text">Valor</label>
                  <input required type="number" step="0.01" className="w-full p-4 text-sm font-black" placeholder="0,00" value={txForm.valor} onChange={e => setTxForm({...txForm, valor: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label-text">Parcelamento</label>
                  <select className="w-full p-4 text-xs" value={txForm.parcelas} onChange={e => setTxForm({...txForm, parcelas: e.target.value})}>
                    {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n === 1 ? 'À Vista' : `${n}x`}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label-text">Categoria</label>
                  <select required className="w-full p-4 text-xs font-bold" value={txForm.categoryId} onChange={e => setTxForm({...txForm, categoryId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="md:col-span-6 flex justify-end pt-4">
                   <button type="submit" className="luxury-button px-16 py-4 flex items-center gap-3">CONFIRMAR COMPRA <ArrowRight size={14} /></button>
                </div>
              </form>
            </div>

            <div className="luxury-card overflow-hidden">
               <div className="p-8 border-b border-[#262626] flex justify-between items-center bg-[#111111]/50">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extrato de Crédito - {currentCard?.nome}</h4>
               </div>
               <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-500 bg-[#0F0F0F] border-b border-[#262626]">
                      <th className="px-8 py-5">Data</th>
                      <th className="px-8 py-5">Estabelecimento</th>
                      <th className="px-8 py-5">Categoria</th>
                      <th className="px-8 py-5 text-center">Parcela</th>
                      <th className="px-8 py-5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] text-xs">
                    {state.cardTransactions
                      .filter(t => t.cardId === selectedCardId)
                      .sort((a,b) => b.dataCompra.localeCompare(a.dataCompra))
                      .map(tx => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                           <td className="px-8 py-4 text-slate-500 font-bold">{new Date(tx.dataCompra).toLocaleDateString('pt-BR')}</td>
                           <td className="px-8 py-4 font-bold text-white uppercase italic tracking-tight">{tx.descricao}</td>
                           <td className="px-8 py-4">
                             <span className="text-[10px] font-black text-[#D4AF37] uppercase italic">{state.categories.find(c => c.id === tx.categoryId)?.nome}</span>
                           </td>
                           <td className="px-8 py-4 text-center">
                             <span className="bg-white/[0.03] border border-white/5 px-3 py-1 rounded text-[9px] font-black text-slate-400">
                               {tx.parcelasTotal > 1 ? `${tx.parcelaAtual}/${tx.parcelasTotal}` : 'À VISTA'}
                             </span>
                           </td>
                           <td className={`px-8 py-4 text-right font-black ${isConfidential ? 'sigilo-blur' : 'text-red-500'}`}>
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.valor)}
                           </td>
                        </tr>
                      ))
                    }
                  </tbody>
               </table>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {importStep === 1 && (
              <div className="bg-[#0A0A0A] p-20 rounded-[3rem] border border-[#262626] text-center space-y-10">
                <div className="w-24 h-24 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto border border-[#D4AF37]/20 shadow-2xl">
                  <Upload size={40} />
                </div>
                <div className="max-w-xl mx-auto space-y-4">
                  <h3 className="text-3xl font-black italic uppercase text-white" style={{ fontFamily: 'Book Antiqua' }}>Conciliador de Faturas</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Carregue o arquivo CSV do seu banco para processar os débitos do cartão <b>{currentCard?.nome}</b>. O sistema identificará compras duplicadas automaticamente.</p>
                </div>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#262626] rounded-[2rem] p-20 hover:border-[#D4AF37] transition-all cursor-pointer group"
                >
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-[#D4AF37]">Clique aqui para selecionar o CSV de Fatura</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                </div>
              </div>
            )}

            {importStep === 2 && (
              <div className="luxury-card p-12 space-y-10">
                <div className="flex items-center gap-4">
                  <Database className="text-[#D4AF37]" />
                  <h3 className="text-xl font-bold text-white uppercase italic tracking-widest">Mapear Colunas da Fatura</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="label-text">Coluna da Data</label>
                    <select className="w-full p-4" value={mapping.data} onChange={e => setMapping({...mapping, data: e.target.value})}>
                      <option value="">Selecione...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text">Coluna do Valor</label>
                    <select className="w-full p-4" value={mapping.valor} onChange={e => setMapping({...mapping, valor: e.target.value})}>
                      <option value="">Selecione...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text">Coluna da Descrição</label>
                    <select className="w-full p-4" value={mapping.descricao} onChange={e => setMapping({...mapping, descricao: e.target.value})}>
                      <option value="">Selecione...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-10">
                  <button onClick={() => setImportStep(1)} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Voltar</button>
                  <button onClick={processImport} className="luxury-button px-10 py-4">Conciliar Fatura</button>
                </div>
              </div>
            )}

            {importStep === 3 && importPreview && (
              <div className="space-y-8 animate-in slide-in-from-bottom-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="luxury-card p-8 bg-emerald-500/5 border-emerald-500/20">
                    <div className="flex justify-between items-start">
                      <CheckCircle2 className="text-emerald-500" />
                      <span className="text-2xl font-black text-white">{importPreview.new.length}</span>
                    </div>
                    <p className="label-text mt-4">Novos Lançamentos Identificados</p>
                  </div>
                  <div className="luxury-card p-8 bg-blue-500/5 border-blue-500/20">
                    <div className="flex justify-between items-start">
                      <RefreshCw className="text-blue-500" />
                      <span className="text-2xl font-black text-white">{importPreview.reconciled}</span>
                    </div>
                    <p className="label-text mt-4">Itens já Conciliados (Duplicados)</p>
                  </div>
                </div>

                <div className="luxury-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#111111]">
                      <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-[#262626]">
                        <th className="px-8 py-5">Data</th>
                        <th className="px-8 py-5">Descrição Importada</th>
                        <th className="px-8 py-5 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {importPreview.new.map((tx, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="px-8 py-4 text-slate-500">{tx.dataCompra}</td>
                          <td className="px-8 py-4 text-white font-bold">{tx.descricao}</td>
                          <td className="px-8 py-4 text-right text-emerald-500 font-black">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-6">
                  <button onClick={() => setImportStep(2)} className="text-[10px] font-black uppercase text-slate-500">Cancelar</button>
                  <button onClick={finalizeImport} className="luxury-button px-16 py-5 shadow-2xl">Confirmar Importação no Ledger</button>
                </div>
              </div>
            )}

            {importStep === 4 && (
              <div className="bg-[#0A0A0A] p-20 rounded-[3rem] border border-[#262626] text-center space-y-10 animate-in zoom-in-95">
                <CheckCircle2 size={64} className="text-emerald-500 mx-auto" />
                <h3 className="text-3xl font-black italic uppercase text-white" style={{ fontFamily: 'Book Antiqua' }}>Importação Finalizada</h3>
                <p className="text-sm text-slate-500">A fatura foi processada e os novos itens foram integrados ao seu controle patrimonial.</p>
                <button onClick={() => { setImportStep(1); setSubTab('txs'); }} className="luxury-button px-16 py-5">Ver Lançamentos</button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center bg-[#111111] p-2 rounded-2xl border border-[#262626] shadow-2xl">
        <div className="flex gap-2">
          <button onClick={() => setSubTab('cards')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'cards' ? 'bg-[#D4AF37] text-black' : 'text-slate-600 hover:text-slate-300'}`}>Plásticos</button>
          <button onClick={() => setSubTab('txs')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'txs' ? 'bg-[#D4AF37] text-black' : 'text-slate-600 hover:text-slate-300'}`}>Timeline</button>
          <button onClick={() => setSubTab('import')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'import' ? 'bg-[#D4AF37] text-black' : 'text-slate-600 hover:text-slate-300'}`}>Conciliar CSV</button>
        </div>
        <div className="px-8 flex items-center gap-4">
           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cartão em Foco:</p>
           <select className="bg-transparent border-none text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] outline-none cursor-pointer" value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}>
             {state.creditCards.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
           </select>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default CreditCardView;
