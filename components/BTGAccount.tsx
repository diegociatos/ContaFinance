
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Entity, Category, Institution, Asset, CreditCard, CardTransaction } from '../types';
import TransactionTable from './TransactionTable';
import { 
  Plus, 
  Landmark, 
  Wallet, 
  ArrowRight, 
  Calendar, 
  Tag, 
  FileText, 
  Landmark as BankIcon, 
  Edit2, 
  Check, 
  X, 
  CreditCard as CardIcon, 
  RefreshCw,
  ArrowRightLeft,
  // Added Info import to fix the missing name error
  Info
} from 'lucide-react';

interface BTGAccountProps {
  institution: Institution;
  transactions: Transaction[];
  cardTransactions: CardTransaction[];
  onAddTransaction: (tx: Transaction | Transaction[]) => void;
  onUpdateInstitution: (updates: Partial<Institution>) => void;
  onUpdateCardTransactions: (txs: CardTransaction[]) => void;
  initialBalance: number;
  isConfidential: boolean;
  entities: Entity[];
  categories: Category[];
  assets: Asset[];
  creditCards: CreditCard[];
  instituicoes: Institution[];
}

const BTGAccount: React.FC<BTGAccountProps> = ({ 
  institution, transactions, cardTransactions, onAddTransaction, onUpdateInstitution, onUpdateCardTransactions,
  initialBalance, isConfidential, entities, categories, creditCards, instituicoes 
}) => {
  const [isEditingInitial, setIsEditingInitial] = useState(false);
  const [tempInitialBalance, setTempInitialBalance] = useState(initialBalance.toString());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Form Mode
  const [formMode, setFormMode] = useState<'OPERACIONAL' | 'PAGAMENTO_FATURA' | 'TRANSFERENCIA_INTERNA'>('OPERACIONAL');

  const [formData, setFormData] = useState({
    dataCompetencia: new Date().toISOString().split('T')[0],
    dataCaixa: new Date().toISOString().split('T')[0],
    tipo: 'saida' as 'entrada' | 'saida',
    valor: '',
    referencia: '',
    detalhes: '',
    linkedCardId: '',
    targetInstitutionId: ''
  });

  useEffect(() => {
    setTempInitialBalance(initialBalance.toString());
  }, [initialBalance, institution.id]);

  const handleUpdateInitial = () => {
    const newVal = parseFloat(tempInitialBalance) || 0;
    onUpdateInstitution({ saldoInicial: newVal });
    setIsEditingInitial(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Cálculo de valor em aberto para fatura
  const openInvoiceAmount = useMemo(() => {
    if (formMode !== 'PAGAMENTO_FATURA' || !formData.linkedCardId) return 0;
    return cardTransactions
      .filter(t => t.cardId === formData.linkedCardId && t.status !== 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
  }, [formMode, formData.linkedCardId, cardTransactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(formData.valor) || 0;
    if (valorNum <= 0) return;

    if (formMode === 'OPERACIONAL') {
      if (!formData.referencia) return alert("Selecione uma categoria");
      const tx: Transaction = {
        id: 'tx-' + Date.now(),
        data: formData.dataCaixa,
        dataCompetencia: formData.dataCompetencia,
        dataCaixa: formData.dataCaixa,
        tipo: formData.tipo,
        valor: valorNum,
        referencia: formData.referencia,
        entidadeId: institution.entidadeId,
        instituicaoId: institution.id,
        detalhes: formData.detalhes,
        meioPagamento: 'dinheiro_pix_debito',
        tipoLancamento: 'OPERACIONAL',
        impactaDRE: true
      };
      onAddTransaction(tx);
    } 
    else if (formMode === 'PAGAMENTO_FATURA') {
      if (!formData.linkedCardId) return alert("Selecione o cartão");
      
      const tx: Transaction = {
        id: 'tx-' + Date.now(),
        data: formData.dataCaixa,
        dataCompetencia: formData.dataCaixa,
        dataCaixa: formData.dataCaixa,
        tipo: 'saida',
        valor: valorNum,
        referencia: categories.find(c => c.nome.toLowerCase().includes('fatura'))?.id || categories[0].id,
        entidadeId: institution.entidadeId,
        instituicaoId: institution.id,
        detalhes: `PAGAMENTO FATURA CARTÃO: ${creditCards.find(c => c.id === formData.linkedCardId)?.nome}`,
        meioPagamento: 'dinheiro_pix_debito',
        isCardPayment: true,
        linkedCardId: formData.linkedCardId,
        tipoLancamento: 'PAGAMENTO_FATURA',
        impactaDRE: false // Crucial: Já impactou a DRE na compra
      };

      // Atualiza status das transações do cartão para 'Pago'
      const updatedCardTxs = cardTransactions.map(t => 
        t.cardId === formData.linkedCardId && t.status !== 'Pago' ? { ...t, status: 'Pago' as const } : t
      );
      
      onUpdateCardTransactions(updatedCardTxs);
      onAddTransaction(tx);
    }
    else if (formMode === 'TRANSFERENCIA_INTERNA') {
      if (!formData.targetInstitutionId) return alert("Selecione o banco de destino");
      
      const txSaida: Transaction = {
        id: 'tx-out-' + Date.now(),
        data: formData.dataCaixa,
        dataCompetencia: formData.dataCaixa,
        dataCaixa: formData.dataCaixa,
        tipo: 'saida',
        valor: valorNum,
        referencia: categories.find(c => c.grupo === 'TRANSFERÊNCIAS INTERNAS')?.id || categories[0].id,
        entidadeId: institution.entidadeId,
        instituicaoId: institution.id,
        detalhes: `TRANSF PARA: ${instituicoes.find(i => i.id === formData.targetInstitutionId)?.nome} ${formData.detalhes ? ' - ' + formData.detalhes : ''}`,
        meioPagamento: 'dinheiro_pix_debito',
        tipoLancamento: 'TRANSFERENCIA_INTERNA',
        impactaDRE: false
      };

      const txEntrada: Transaction = {
        id: 'tx-in-' + Date.now(),
        data: formData.dataCaixa,
        dataCompetencia: formData.dataCaixa,
        dataCaixa: formData.dataCaixa,
        tipo: 'entrada',
        valor: valorNum,
        referencia: categories.find(c => c.grupo === 'TRANSFERÊNCIAS INTERNAS')?.id || categories[0].id,
        entidadeId: instituicoes.find(i => i.id === formData.targetInstitutionId)?.entidadeId || institution.entidadeId,
        instituicaoId: formData.targetInstitutionId,
        detalhes: `TRANSF DE: ${institution.nome} ${formData.detalhes ? ' - ' + formData.detalhes : ''}`,
        meioPagamento: 'dinheiro_pix_debito',
        tipoLancamento: 'TRANSFERENCIA_INTERNA',
        impactaDRE: false
      };

      onAddTransaction([txSaida, txEntrada]);
    }

    // Reset Form
    setFormData({ 
      ...formData, 
      valor: '', 
      detalhes: '', 
      linkedCardId: '', 
      targetInstitutionId: '',
      dataCompetencia: new Date().toISOString().split('T')[0],
      dataCaixa: new Date().toISOString().split('T')[0]
    });
  };

  const calculateBalances = () => {
    const today = new Date().toISOString().split('T')[0];
    const real = transactions
      .filter(t => t.dataCaixa <= today)
      .reduce((acc, tx) => (tx.tipo === 'entrada' ? acc + tx.valor : acc - tx.valor), initialBalance);
    
    const projetado = transactions
      .reduce((acc, tx) => (tx.tipo === 'entrada' ? acc + tx.valor : acc - tx.valor), initialBalance);
      
    return { real, projetado };
  };

  const { real, projetado } = calculateBalances();
  const formatValue = (val: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 font-sans-inter">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="luxury-card p-10 border-l-4 border-[#D4AF37] flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="label-text mb-2 text-[#D4AF37]">Conta Bancária Ativa</p>
            <h3 className="text-2xl font-bold text-[#F5F5F5] uppercase tracking-wider font-serif-luxury">{institution.nome}</h3>
          </div>
          
          <div className="mt-8 relative z-10">
            {isEditingInitial ? (
              <div className="flex flex-col gap-2">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">Definir Saldo de Abertura</label>
                <div className="flex gap-2 items-center bg-[#0A0A0A] p-3 rounded-xl border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                  <span className="text-[#D4AF37] font-bold text-xs">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="bg-transparent border-none text-[14px] font-black text-white w-full outline-none focus:ring-0" 
                    value={tempInitialBalance} 
                    onChange={e => setTempInitialBalance(e.target.value)}
                    onBlur={handleUpdateInitial}
                    autoFocus
                  />
                  <button onClick={handleUpdateInitial} className="text-emerald-500 hover:scale-110 transition-transform"><Check size={18} /></button>
                </div>
              </div>
            ) : (
              <div 
                className="group/initial flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-transparent hover:border-[#D4AF37]/20 hover:bg-white/[0.04] cursor-pointer transition-all"
                onClick={() => setIsEditingInitial(true)}
              >
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Inicial</p>
                  <p className={`text-sm font-bold ${isConfidential ? 'sigilo-blur' : 'text-[#D4AF37]'} font-serif-luxury`}>
                    {formatValue(initialBalance)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {saveStatus === 'saved' && <Check size={14} className="text-emerald-500 animate-bounce" />}
                  <Edit2 size={12} className="text-slate-600 group-hover/initial:text-[#D4AF37] transition-colors" />
                </div>
              </div>
            )}
          </div>
          <BankIcon size={80} className="absolute -right-4 -bottom-4 text-[#D4AF37] opacity-[0.03] rotate-12" />
        </div>
        
        <div className="luxury-card p-10 bg-[#111111]/50 group border border-white/5 hover:border-emerald-900/30 transition-all">
          <p className="label-text mb-2">Saldo Real (Disponível)</p>
          <h3 className={`text-3xl font-bold transition-all font-serif-luxury ${isConfidential ? 'sigilo-blur' : 'text-white group-hover:text-emerald-400'}`}>
            {formatValue(real)}
          </h3>
          <p className="text-[8px] font-bold text-slate-500 uppercase mt-4 tracking-[0.2em]">Considera apenas liquidados</p>
        </div>

        <div className="luxury-card p-10 bg-[#111111]/50 group border border-white/5 hover:border-[#D4AF37]/30 transition-all">
          <p className="label-text mb-2 text-[#D4AF37]">Previsão Acumulada</p>
          <h3 className={`text-3xl font-bold transition-all font-serif-luxury ${isConfidential ? 'sigilo-blur' : 'text-[#D4AF37]'}`}>
            {formatValue(projetado)}
          </h3>
          <p className="text-[8px] font-bold text-slate-500 uppercase mt-4 tracking-[0.2em]">Inclui agendamentos futuros</p>
        </div>
      </div>

      <div className="luxury-card p-10 border border-[#D4AF37]/20 relative overflow-hidden bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-[#262626] pb-6">
           <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.4em] flex items-center gap-3">
            <FileText size={14} className="opacity-50" /> Inteligência Bancária
          </h4>

          <div className="flex flex-wrap gap-2 p-1 bg-black rounded-xl border border-[#262626]">
            <button 
              type="button" 
              onClick={() => setFormMode('OPERACIONAL')} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formMode === 'OPERACIONAL' ? 'bg-[#D4AF37] text-black' : 'text-slate-500'}`}
            >
              <RefreshCw size={12} /> Operacional
            </button>
            <button 
              type="button" 
              onClick={() => setFormMode('PAGAMENTO_FATURA')} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formMode === 'PAGAMENTO_FATURA' ? 'bg-[#D4AF37] text-black' : 'text-slate-500'}`}
            >
              <CardIcon size={12} /> Fatura Cartão
            </button>
            <button 
              type="button" 
              onClick={() => setFormMode('TRANSFERENCIA_INTERNA')} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formMode === 'TRANSFERENCIA_INTERNA' ? 'bg-[#D4AF37] text-black' : 'text-slate-500'}`}
            >
              <ArrowRightLeft size={12} /> Transferência
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
          <div className="space-y-3">
            <label className="label-text">Data do Lançamento</label>
            <input required type="date" className="w-full p-4 text-xs font-bold" value={formData.dataCaixa} onChange={e => setFormData({...formData, dataCaixa: e.target.value, dataCompetencia: e.target.value})} />
          </div>

          <div className="space-y-3">
            <label className="label-text">Tipo / Natureza</label>
            <div className="flex gap-1 bg-black p-1 rounded-xl border border-[#262626]">
              <button 
                type="button" 
                disabled={formMode !== 'OPERACIONAL'}
                onClick={() => setFormData({...formData, tipo: 'entrada'})} 
                className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.tipo === 'entrada' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600'} ${formMode !== 'OPERACIONAL' ? 'opacity-30' : ''}`}
              >
                Entrada
              </button>
              <button 
                type="button" 
                disabled={formMode !== 'OPERACIONAL' && formMode !== 'PAGAMENTO_FATURA'}
                onClick={() => setFormData({...formData, tipo: 'saida'})} 
                className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.tipo === 'saida' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600'} ${formMode !== 'OPERACIONAL' && formMode !== 'PAGAMENTO_FATURA' ? 'opacity-30' : ''}`}
              >
                Saída
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="label-text">Valor (R$)</label>
            <div className="relative">
              <input required type="number" step="0.01" className="w-full p-4 text-sm font-black text-white" placeholder="0,00" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} />
              {formMode === 'PAGAMENTO_FATURA' && openInvoiceAmount > 0 && (
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, valor: openInvoiceAmount.toString()})}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20"
                >
                  USAR ABERTO
                </button>
              )}
            </div>
          </div>

          {formMode === 'OPERACIONAL' && (
            <div className="space-y-3">
              <label className="label-text">Categoria Contábil</label>
              <select required className="w-full p-4 text-xs font-bold" value={formData.referencia} onChange={e => setFormData({...formData, referencia: e.target.value})}>
                <option value="">Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          {formMode === 'PAGAMENTO_FATURA' && (
            <div className="space-y-3">
              <label className="label-text">Vincular Cartão</label>
              <select required className="w-full p-4 text-xs font-bold text-[#D4AF37]" value={formData.linkedCardId} onChange={e => setFormData({...formData, linkedCardId: e.target.value})}>
                <option value="">Selecione o Cartão...</option>
                {creditCards.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          {formMode === 'TRANSFERENCIA_INTERNA' && (
            <div className="space-y-3">
              <label className="label-text">Banco Destino</label>
              <select required className="w-full p-4 text-xs font-bold text-blue-400" value={formData.targetInstitutionId} onChange={e => setFormData({...formData, targetInstitutionId: e.target.value})}>
                <option value="">Selecione...</option>
                {instituicoes.filter(i => i.id !== institution.id).map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
          )}

          <div className="md:col-span-2 flex flex-col justify-end">
            <div className="flex gap-2">
              <input type="text" placeholder="MEMORANDO / DETALHES..." className="flex-1 p-4 text-xs font-bold uppercase" value={formData.detalhes} onChange={e => setFormData({...formData, detalhes: e.target.value})} />
              <button type="submit" className="luxury-button px-10 py-4 flex items-center gap-2 whitespace-nowrap">
                EFETIVAR <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </form>

        {formMode === 'PAGAMENTO_FATURA' && formData.linkedCardId && (
          <div className="mt-6 flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-[#262626] animate-in slide-in-from-top-2">
            <Info size={16} className="text-[#D4AF37]" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Total em aberto para este cartão: <span className="text-white ml-2">{formatValue(openInvoiceAmount)}</span>
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <TransactionTable 
          transactions={transactions} 
          entities={entities} 
          categories={categories} 
          initialBalance={initialBalance} 
          isConfidential={isConfidential} 
        />
      </div>
    </div>
  );
};

export default BTGAccount;
