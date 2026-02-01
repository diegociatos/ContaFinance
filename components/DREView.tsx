
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, Category, DRE_GROUPS, AppState, AssetSnapshot, CardTransaction } from '../types';
import { 
  ChevronDown, 
  Zap, 
  DollarSign, 
  BarChart3, 
  Clock, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  TrendingUp,
  History,
  Search,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface DREViewProps {
  state: AppState;
  transactions: Transaction[];
  categories: Category[];
  snapshots: AssetSnapshot[];
  selectedMonth: number;
  selectedYear: number;
  isConfidential: boolean;
}

type TemporalView = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'comparativo';

interface AuditDetail {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  instituicao: string;
}

interface CategoryDetail {
  total: number;
  txs: AuditDetail[];
}

interface GroupDetail {
  total: number;
  categories: Record<string, CategoryDetail>;
}

const DREView: React.FC<DREViewProps> = ({ state, transactions, categories, snapshots, selectedMonth, selectedYear, isConfidential }) => {
  const [viewMode, setViewMode] = useState<'competencia' | 'caixa'>('competencia');
  const [temporalView, setTemporalView] = useState<TemporalView>(() => {
    return (localStorage.getItem('dre_temporal_view') as TemporalView) || 'mensal';
  });

  useEffect(() => {
    localStorage.setItem('dre_temporal_view', temporalView);
  }, [temporalView]);

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  // --- VALIDAÇÃO DE INTEGRIDADE (ÓRFÃOS) ---
  const unclassifiedCount = useMemo(() => {
    const bankOrphans = transactions.filter(tx => tx.impactaDRE && (!tx.referencia || !categories.some(c => c.id === tx.referencia))).length;
    const cardOrphans = state.cardTransactions.filter(ctx => !ctx.categoryId || !categories.some(c => c.id === ctx.categoryId)).length;
    return bankOrphans + cardOrphans;
  }, [transactions, state.cardTransactions, categories]);

  const getDREDataForPeriod = (year: number, month: number, view: TemporalView) => {
    const groups: Record<string, GroupDetail> = {};
    DRE_GROUPS.forEach(g => {
      groups[g] = { total: 0, categories: {} };
    });

    const isInPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const dYear = d.getFullYear();
      const dMonth = d.getMonth();

      if (view === 'mensal') return dYear === year && dMonth === month;
      if (view === 'anual' || view === 'comparativo') return dYear === year;
      if (view === 'trimestral') {
        const startMonth = Math.max(0, month - 2);
        return dYear === year && dMonth >= startMonth && dMonth <= month;
      }
      if (view === 'semestral') {
        const startMonth = Math.max(0, month - 5);
        return dYear === year && dMonth >= startMonth && dMonth <= month;
      }
      return false;
    };

    // Processamento de Transações Bancárias
    transactions.forEach(tx => {
      if (!tx.impactaDRE) return;
      if (tx.tipoLancamento === 'PAGAMENTO_FATURA') return;
      if (tx.tipoLancamento === 'TRANSFERENCIA_INTERNA') return;

      const dateToUse = viewMode === 'caixa' ? tx.dataCaixa : tx.dataCompetencia;
      if (isInPeriod(dateToUse)) {
        const cat = categories.find(c => c.id === tx.referencia);
        if (cat && groups[cat.grupo]) {
          const val = tx.tipo === 'entrada' ? tx.valor : -tx.valor;
          const instName = state.instituicoes.find(i => i.id === tx.instituicaoId)?.nome || 'Banco';
          
          groups[cat.grupo].total += val;
          if (!groups[cat.grupo].categories[cat.nome]) {
            groups[cat.grupo].categories[cat.nome] = { total: 0, txs: [] };
          }
          groups[cat.grupo].categories[cat.nome].total += val;
          groups[cat.grupo].categories[cat.nome].txs.push({
            id: tx.id,
            data: dateToUse,
            descricao: tx.detalhes || 'S/ DESCRIÇÃO',
            valor: val,
            instituicao: instName
          });
        }
      }
    });

    // Lançamentos de Cartão
    state.cardTransactions.forEach(ctx => {
      const dateToUse = viewMode === 'competencia' ? ctx.dataCompra : ctx.dataVencimentoFatura;
      if (isInPeriod(dateToUse)) {
        const cat = categories.find(c => c.id === ctx.categoryId);
        if (cat && groups[cat.grupo]) {
          const val = -ctx.valor;
          const cardName = state.creditCards.find(cc => cc.id === ctx.cardId)?.nome || 'Cartão';

          groups[cat.grupo].total += val;
          if (!groups[cat.grupo].categories[cat.nome]) {
            groups[cat.grupo].categories[cat.nome] = { total: 0, txs: [] };
          }
          groups[cat.grupo].categories[cat.nome].total += val;
          groups[cat.grupo].categories[cat.nome].txs.push({
            id: ctx.id,
            data: dateToUse,
            descricao: `[Fatura] ${ctx.descricao}`,
            valor: val,
            instituicao: cardName
          });
        }
      }
    });

    // Rendimentos de Investimento (Snapshots)
    snapshots
      .filter(s => {
        if (view === 'mensal') return s.ano === year && s.mes === month;
        if (view === 'anual' || view === 'comparativo') return s.ano === year;
        if (view === 'trimestral') {
          const startMonth = Math.max(0, month - 2);
          return s.ano === year && s.mes >= startMonth && s.mes <= month;
        }
        if (view === 'semestral') {
          const startMonth = Math.max(0, month - 5);
          return s.ano === year && s.mes >= startMonth && s.mes <= month;
        }
        return false;
      })
      .forEach(s => {
        const group = 'RECEITAS FINANCEIRAS / VARIAÇÃO';
        const catName = 'RENDIMENTO DE CARTEIRA';
        const assetName = state.assets.find(a => a.id === s.assetId)?.nome || 'Ativo';

        groups[group].total += s.rendimento;
        if (!groups[group].categories[catName]) {
          groups[group].categories[catName] = { total: 0, txs: [] };
        }
        groups[group].categories[catName].total += s.rendimento;
        groups[group].categories[catName].txs.push({
          id: s.id,
          data: `${s.ano}-${String(s.mes + 1).padStart(2, '0')}-01`,
          descricao: `VARIAÇÃO: ${assetName}`,
          valor: s.rendimento,
          instituicao: 'Carteira Gestão'
        });
      });

    const recOp = groups['RECEITAS OPERACIONAIS'].total;
    const resOp = recOp + 
                  groups['CUSTO DE VIDA SOBREVIVÊNCIA'].total + 
                  groups['CUSTO DE VIDA CONFORTO'].total + 
                  groups['DESPESAS PROFISSIONAIS'].total;

    const resWealth = groups['MOVIMENTAÇÕES NÃO OPERACIONAIS'].total + 
                      groups['RECEITAS FINANCEIRAS / VARIAÇÃO'].total + 
                      groups['INVESTIMENTOS REALIZADOS'].total;

    return { groups, recOp, resOp, resWealth, totalGlobal: resOp + resWealth };
  };

  const currentDRE = useMemo(() => getDREDataForPeriod(selectedYear, selectedMonth, temporalView), 
    [selectedYear, selectedMonth, temporalView, transactions, state.cardTransactions, snapshots, viewMode, state.instituicoes, state.assets, categories]);

  const prevDRE = useMemo(() => {
    if (temporalView === 'comparativo') return getDREDataForPeriod(selectedYear - 1, selectedMonth, 'anual');
    return null;
  }, [selectedYear, selectedMonth, temporalView, transactions, state.cardTransactions, snapshots, viewMode, state.instituicoes, state.assets, categories]);

  const OPERATIONAL_GROUPS = ['RECEITAS OPERACIONAIS', 'CUSTO DE VIDA SOBREVIVÊNCIA', 'CUSTO DE VIDA CONFORTO', 'DESPESAS PROFISSIONAIS'];
  const WEALTH_GROUPS = ['MOVIMENTAÇÕES NÃO OPERACIONAIS', 'RECEITAS FINANCEIRAS / VARIAÇÃO', 'INVESTIMENTOS REALIZADOS'];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      
      {unclassifiedCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-center gap-4 text-amber-500 shadow-xl animate-pulse">
          <AlertCircle size={24} />
          <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest">Atenção Gerencial: Dados Incompletos</h4>
            <p className="text-xs font-bold mt-1">Existem {unclassifiedCount} lançamentos órfãos (sem conta gerencial). O resultado abaixo pode estar subestimado.</p>
          </div>
          <button onClick={() => window.location.hash = '#importar'} className="text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black px-4 py-2 rounded-lg">Regularizar Agora</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#111111] p-6 rounded-3xl border border-[#262626]">
        <div className="flex gap-1.5 p-1 bg-black rounded-2xl border border-[#262626]">
          {(['mensal', 'trimestral', 'semestral', 'anual', 'comparativo'] as TemporalView[]).map(v => (
            <button key={v} onClick={() => setTemporalView(v)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${temporalView === v ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-slate-500 hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex bg-black p-1 rounded-xl border border-[#262626]">
          <button onClick={() => setViewMode('caixa')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'caixa' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>Caixa</button>
          <button onClick={() => setViewMode('competencia')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'competencia' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>Competência</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <KPIBox title="Lucro Operacional Líquido" value={formatCurrency(currentDRE.resOp)} icon={<Target size={20} />} highlight="gold" />
        <KPIBox title="Resultados Patrimoniais (Wealth)" value={formatCurrency(currentDRE.resWealth)} icon={<TrendingUp size={20} />} highlight="blue" />
        <KPIBox title="Lucro Global do Período" value={formatCurrency(currentDRE.totalGlobal)} icon={<History size={20} />} highlight="emerald" />
      </div>

      <div className="luxury-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#050505] text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-[#262626]">
              <th className="px-10 py-6">Demonstrativo de Resultado Gerencial</th>
              <th className="px-10 py-6 text-right">Valor Período</th>
              {temporalView === 'comparativo' && <th className="px-10 py-6 text-center">Auditoria ∆</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-bold">
            <tr className="bg-[#D4AF37]/5"><td colSpan={3} className="px-10 py-4 text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em]">I. OPERACIONAL</td></tr>
            {OPERATIONAL_GROUPS.map(group => (
              <AuditRow key={group} groupName={group} groupData={currentDRE.groups[group]} prevData={prevDRE?.groups[group]} isComparativo={temporalView === 'comparativo'} formatCurrency={formatCurrency} />
            ))}
            <tr className="bg-black/40 border-y border-[#D4AF37]/30">
              <td className="px-10 py-8 text-sm font-bold text-white uppercase tracking-[0.2em] font-serif-luxury">(=) MARGEM OPERACIONAL LÍQUIDA</td>
              <td className={`px-10 py-8 text-right text-xl font-bold font-serif-luxury ${currentDRE.resOp < 0 ? 'text-red-500' : 'text-[#D4AF37]'}`}>{formatCurrency(currentDRE.resOp)}</td>
              {temporalView === 'comparativo' && <td className="px-10 py-8 text-center"><VariationBadge current={currentDRE.resOp} prev={prevDRE?.resOp || 0} /></td>}
            </tr>

            <tr className="bg-blue-500/5"><td colSpan={3} className="px-10 py-4 text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">II. ESTRATÉGICO / WEALTH</td></tr>
            {WEALTH_GROUPS.map(group => (
              <AuditRow key={group} groupName={group} groupData={currentDRE.groups[group]} prevData={prevDRE?.groups[group]} isComparativo={temporalView === 'comparativo'} formatCurrency={formatCurrency} />
            ))}

            <tr className="bg-white/[0.03] border-t-2 border-white/10">
              <td className="px-10 py-10 text-base font-black text-white uppercase tracking-[0.4em] font-serif-luxury">(=) RESULTADO LÍQUIDO CONSOLIDADO</td>
              <td className={`px-10 py-10 text-right text-2xl font-black font-serif-luxury ${currentDRE.totalGlobal < 0 ? 'text-red-500' : 'text-white'}`}>{formatCurrency(currentDRE.totalGlobal)}</td>
              {temporalView === 'comparativo' && <td className="px-10 py-10 text-center"><VariationBadge current={currentDRE.totalGlobal} prev={prevDRE?.totalGlobal || 0} /></td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditRow = ({ groupName, groupData, prevData, isComparativo, formatCurrency }: any) => {
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (catName: string) => {
    const newSet = new Set(expandedCats);
    if (newSet.has(catName)) newSet.delete(catName);
    else newSet.add(catName);
    setExpandedCats(newSet);
  };

  return (
    <>
      <tr className="group hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => setIsGroupExpanded(!isGroupExpanded)}>
        <td className="px-10 py-5 flex items-center gap-3">
          <ChevronDown size={14} className={`text-slate-600 transition-transform ${isGroupExpanded ? '' : '-rotate-90'}`} />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{groupName}</span>
        </td>
        <td className={`px-10 py-5 text-right font-bold text-xs ${groupData.total < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(groupData.total)}</td>
        {isComparativo && <td className="px-10 py-5 text-center"><VariationBadge current={groupData.total} prev={prevData?.total || 0} /></td>}
      </tr>

      {isGroupExpanded && Object.entries(groupData.categories as Record<string, CategoryDetail>).map(([catName, catDetail]) => (
        <React.Fragment key={catName}>
          <tr className="bg-black/20 hover:bg-black/40 cursor-pointer" onClick={() => toggleCat(catName)}>
            <td className="px-20 py-4 flex items-center gap-2">
               <ChevronDown size={12} className={`text-[#D4AF37] transition-transform ${expandedCats.has(catName) ? '' : '-rotate-90'}`} />
               <span className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-widest">{catName}</span>
            </td>
            <td className="px-10 py-4 text-right text-[10px] text-slate-400 font-bold">{formatCurrency(catDetail.total)}</td>
            {isComparativo && <td></td>}
          </tr>
          {expandedCats.has(catName) && catDetail.txs.map((tx: AuditDetail) => (
            <tr key={tx.id} className="bg-black/40 animate-in slide-in-from-left-2">
              <td className="px-28 py-3 flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase">{new Date(tx.data).toLocaleDateString('pt-BR')}</span>
                <span className="text-[10px] text-slate-300 uppercase">{tx.descricao}</span>
              </td>
              <td className="px-10 py-3 text-right">
                <span className={`text-[10px] font-bold ${tx.valor < 0 ? 'text-red-500/70' : 'text-emerald-500/70'}`}>{formatCurrency(tx.valor)}</span>
              </td>
              {isComparativo && <td></td>}
            </tr>
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

const KPIBox = ({ title, value, icon, highlight }: any) => {
  const getColors = () => {
    if (highlight === 'gold') return 'border-[#D4AF37] text-[#D4AF37]';
    if (highlight === 'blue') return 'border-blue-500/50 text-blue-400';
    if (highlight === 'emerald') return 'border-emerald-500/50 text-emerald-400';
    return 'border-[#262626] text-slate-400';
  };
  return (
    <div className={`luxury-card p-10 border-l-4 ${getColors()} bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]`}>
      <div className="flex justify-between items-start">
        <p className="label-text mb-3">{title}</p>
        <div className="opacity-40">{icon}</div>
      </div>
      <h3 className="text-3xl font-bold font-serif-luxury text-white">{value}</h3>
    </div>
  );
};

const VariationBadge = ({ current, prev }: { current: number; prev: number }) => {
  if (prev === 0) return <span className="text-[9px] font-black text-slate-700">--</span>;
  const variation = ((current - prev) / Math.abs(prev)) * 100;
  const isPositive = variation >= 0;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black ${isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
      {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(variation).toFixed(1)}%
    </div>
  );
};

export default DREView;
