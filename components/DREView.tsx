
import React, { useMemo, useState } from 'react';
import { Transaction, Category, DRE_GROUPS, AppState, AssetSnapshot } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  Zap,
  DollarSign,
  BarChart3,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

type TimeMode = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | 'Comparativo';

interface DREViewProps {
  state: AppState;
  transactions: Transaction[];
  categories: Category[];
  snapshots: AssetSnapshot[];
  selectedMonth: number;
  selectedYear: number;
  isConfidential: boolean;
}

const DREView: React.FC<DREViewProps> = ({ state, transactions, categories, snapshots, selectedMonth, selectedYear, isConfidential }) => {
  const [viewMode, setViewMode] = useState<'competencia' | 'caixa'>('caixa');
  const [timeMode, setTimeMode] = useState<TimeMode>('Mensal');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'RECEITAS OPERACIONAIS': true,
    'CUSTO DE VIDA SOBREVIVÊNCIA': true,
    'RECEITAS FINANCEIRAS / VARIAÇÃO': true
  });

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const periodLabel = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    if (timeMode === 'Mensal') return `${months[selectedMonth]} ${selectedYear}`;
    if (timeMode === 'Trimestral') return `Q${Math.floor(selectedMonth / 3) + 1} ${selectedYear}`;
    if (timeMode === 'Semestral') return `${selectedMonth < 6 ? '1º' : '2º'} Semestre ${selectedYear}`;
    if (timeMode === 'Anual') return `Ano Fiscal ${selectedYear}`;
    return `Comparativo ${selectedYear} vs ${selectedYear - 1}`;
  }, [timeMode, selectedMonth, selectedYear]);

  const dreData = useMemo(() => {
    const getPeriodTotals = (year: number, month: number, mode: TimeMode) => {
      const groups: Record<string, { total: number; items: Record<string, number> }> = {};
      DRE_GROUPS.forEach(g => groups[g] = { total: 0, items: {} });

      const isInPeriod = (dateStr: string) => {
        const d = new Date(dateStr);
        const dMonth = d.getMonth();
        const dYear = d.getFullYear();

        if (mode === 'Mensal') return dMonth === month && dYear === year;
        if (mode === 'Trimestral') {
          const quarter = Math.floor(month / 3);
          return Math.floor(dMonth / 3) === quarter && dYear === year;
        }
        if (mode === 'Semestral') {
          const semester = month < 6 ? 0 : 1;
          const dSemester = dMonth < 6 ? 0 : 1;
          return semester === dSemester && dYear === year;
        }
        if (mode === 'Anual' || mode === 'Comparativo') return dYear === year;
        return false;
      };

      // 1. Lançamentos Bancários (Filtrando por impacto contábil)
      transactions
        .filter(tx => tx.impactaDRE !== false) // Regra de Arquiteto: Apenas impactaDRE
        .filter(tx => isInPeriod(viewMode === 'caixa' ? (tx.dataCaixa || tx.data) : (tx.dataCompetencia || tx.data)))
        .forEach(tx => {
          const cat = categories.find(c => c.id === tx.referencia);
          if (cat && groups[cat.grupo]) {
            const val = tx.tipo === 'entrada' ? tx.valor : -tx.valor;
            groups[cat.grupo].total += val;
            groups[cat.grupo].items[cat.nome] = (groups[cat.grupo].items[cat.nome] || 0) + val;
          }
        });

      // 2. Lançamentos de Cartão (Sempre impactam DRE, pela data de compra)
      state.cardTransactions
        .filter(ctx => isInPeriod(ctx.dataCompra))
        .forEach(ctx => {
          const cat = categories.find(c => c.id === ctx.categoryId);
          if (cat && groups[cat.grupo]) {
            const val = -ctx.valor;
            groups[cat.grupo].total += val;
            groups[cat.grupo].items[cat.nome] = (groups[cat.grupo].items[cat.nome] || 0) + val;
          }
        });

      // 3. Rendimentos de Ativos
      snapshots.forEach(snap => {
        if (snap.ano === year) {
          let snapInPeriod = false;
          if (mode === 'Mensal') snapInPeriod = snap.mes === month;
          else if (mode === 'Trimestral') snapInPeriod = Math.floor(snap.mes / 3) === Math.floor(month / 3);
          else if (mode === 'Semestral') snapInPeriod = (snap.mes < 6) === (month < 6);
          else if (mode === 'Anual' || mode === 'Comparativo') snapInPeriod = true;

          if (snapInPeriod) {
            const groupName = 'RECEITAS FINANCEIRAS / VARIAÇÃO';
            const itemName = 'RENDIMENTO DE INVESTIMENTOS (MERCADO)';
            groups[groupName].total += snap.rendimento;
            groups[groupName].items[itemName] = (groups[groupName].items[itemName] || 0) + snap.rendimento;
          }
        }
      });

      const recOp = groups['RECEITAS OPERACIONAIS'].total;
      const resOp = recOp + groups['CUSTO DE VIDA SOBREVIVÊNCIA'].total + groups['CUSTO DE VIDA CONFORTO'].total + groups['DESPESAS PROFISSIONAIS'].total;
      
      return { groups, recOp, resOp };
    };

    const current = getPeriodTotals(selectedYear, selectedMonth, timeMode);
    const previous = timeMode === 'Comparativo' ? getPeriodTotals(selectedYear - 1, selectedMonth, 'Anual') : null;

    return { current, previous };
  }, [transactions, state.cardTransactions, categories, snapshots, viewMode, timeMode, selectedMonth, selectedYear]);

  const trendData = useMemo(() => {
    const history = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthTxs = transactions.filter(tx => tx.impactaDRE !== false).filter(tx => {
        const txD = new Date(viewMode === 'caixa' ? (tx.dataCaixa || tx.data) : (tx.dataCompetencia || tx.data));
        return txD.getMonth() === m && txD.getFullYear() === y;
      });

      const monthCardTxs = state.cardTransactions.filter(ctx => {
        const txD = new Date(ctx.dataCompra);
        return txD.getMonth() === m && txD.getFullYear() === y;
      });

      let resOp = 0;
      [...monthTxs, ...monthCardTxs].forEach((tx: any) => {
        const cat = categories.find(c => c.id === (tx.referencia || tx.categoryId));
        if (cat && ['RECEITAS OPERACIONAIS', 'CUSTO DE VIDA SOBREVIVÊNCIA', 'CUSTO DE VIDA CONFORTO', 'DESPESAS PROFISSIONAIS'].includes(cat.grupo)) {
          const val = tx.tipo === 'entrada' ? tx.valor : -tx.valor;
          resOp += val;
        }
      });

      history.push({
        name: `${months[m]}`,
        valor: resOp
      });
    }
    return history;
  }, [transactions, state.cardTransactions, categories, viewMode, selectedMonth, selectedYear]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-[#111111] p-8 rounded-[2rem] border border-[#262626]">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-black rounded-2xl border border-[#D4AF37]/30 text-[#D4AF37]">
            <BarChart3 size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-wider font-serif-luxury">Controladoria de Performance</h3>
            <p className="label-text mt-2 text-[#D4AF37] flex items-center gap-2">
              <Clock size={14} /> {periodLabel} &bull; {viewMode.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-black/40 p-1.5 rounded-xl border border-[#262626]">
          {(['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Comparativo'] as TimeMode[]).map(mode => (
            <button 
              key={mode}
              onClick={() => setTimeMode(mode)}
              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeMode === mode ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox title="Resultado Operacional" value={formatCurrency(dreData.current.resOp)} desc="Sobra de Caixa Recorrente" icon={<Zap size={20} />} highlight={dreData.current.resOp >= 0 ? 'positive' : 'negative'} />
        <KPIBox title="Volume de Receita" value={formatCurrency(dreData.current.recOp)} desc="Total de Entradas Operacionais" icon={<DollarSign size={20} />} />
        <div className="luxury-card p-8 border-l-4 border-[#D4AF37] flex flex-col justify-center">
          <p className="label-text mb-3">Visão Contábil</p>
          <div className="flex bg-black/40 p-1 rounded-lg border border-[#262626]">
            <button onClick={() => setViewMode('caixa')} className={`flex-1 py-2 rounded text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'caixa' ? 'bg-[#D4AF37] text-black' : 'text-slate-600'}`}>Caixa</button>
            <button onClick={() => setViewMode('competencia')} className={`flex-1 py-2 rounded text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'competencia' ? 'bg-[#D4AF37] text-black' : 'text-slate-600'}`}>Comp.</button>
          </div>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="gold-gradient text-black text-[10px] font-black uppercase tracking-[0.3em] font-serif-luxury">
              <th className="px-10 py-5">Estrutura de Contas Gerenciais</th>
              {timeMode === 'Comparativo' ? (
                <>
                  <th className="px-10 py-5 text-right">Ano Atual</th>
                  <th className="px-10 py-5 text-right">Ano Anterior</th>
                  <th className="px-10 py-5 text-right">Var %</th>
                </>
              ) : (
                <>
                  <th className="px-10 py-5 text-right">Valor Período</th>
                  <th className="px-10 py-5 text-right">AV %</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <DRERows groups={['RECEITAS OPERACIONAIS', 'CUSTO DE VIDA SOBREVIVÊNCIA', 'CUSTO DE VIDA CONFORTO', 'DESPESAS PROFISSIONAIS']} data={dreData} expanded={expandedGroups} setExpanded={setExpandedGroups} format={formatCurrency} mode={timeMode} />
            <tr className="bg-white/[0.03] border-y border-white/10">
              <td className="px-10 py-6 text-sm font-bold text-white uppercase font-serif-luxury tracking-widest">LUCRO OPERACIONAL LÍQUIDO</td>
              <td className={`px-10 py-6 text-right font-black font-serif-luxury text-lg ${dreData.current.resOp >= 0 ? 'text-[#D4AF37]' : 'text-red-500'}`}>{formatCurrency(dreData.current.resOp)}</td>
              <td className="px-10 py-6 text-right text-[10px] font-black text-slate-500">100%</td>
            </tr>
            <DRERows groups={['MOVIMENTAÇÕES NÃO OPERACIONAIS', 'RECEITAS FINANCEIRAS / VARIAÇÃO', 'INVESTIMENTOS REALIZADOS', 'TRANSFERÊNCIAS INTERNAS']} data={dreData} expanded={expandedGroups} setExpanded={setExpandedGroups} format={formatCurrency} mode={timeMode} />
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DRERows = ({ groups, data, expanded, setExpanded, format, mode }: any) => {
  return (
    <>
      {groups.map((group: string) => {
        const currentGroup = data.current.groups[group];
        const av = data.current.recOp !== 0 ? Math.abs((currentGroup.total / data.current.recOp) * 100) : 0;
        return (
          <React.Fragment key={group}>
            <tr className="hover:bg-white/[0.02] transition-colors">
              <td className="px-10 py-5">
                <button onClick={() => setExpanded({ ...expanded, [group]: !expanded[group] })} className="flex items-center gap-4 text-[#D4AF37]">
                  {expanded[group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{group}</span>
                </button>
              </td>
              <td className={`px-10 py-5 text-right font-bold text-sm ${currentGroup.total < 0 ? 'text-red-400' : 'text-white'}`}>{format(currentGroup.total)}</td>
              <td className="px-10 py-5 text-right text-[10px] font-black text-slate-500 opacity-60">{av.toFixed(1)}%</td>
            </tr>
            {expanded[group] && Object.entries(currentGroup.items).map(([name, value]: any) => (
              <tr key={name} className="bg-black/20">
                <td className="px-20 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{name}</td>
                <td className="px-10 py-3 text-right text-xs font-bold text-slate-300">{format(value)}</td>
                <td className="px-10 py-3 text-right text-[9px] font-black text-slate-700">---</td>
              </tr>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
};

const KPIBox = ({ title, value, desc, icon, highlight }: any) => (
  <div className={`p-8 luxury-card group hover:border-[#D4AF37]/40 transition-all ${highlight === 'positive' ? 'border-emerald-900/40' : highlight === 'negative' ? 'border-red-900/40' : ''}`}>
    <div className={`p-3 rounded-xl bg-[#0F0F0F] w-fit mb-6 border border-[#262626] ${highlight === 'positive' ? 'text-emerald-500' : highlight === 'negative' ? 'text-red-500' : 'text-[#D4AF37]'}`}>
      {icon}
    </div>
    <p className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest mb-2">{title}</p>
    <h4 className={`text-2xl font-bold font-serif-luxury ${highlight === 'negative' ? 'text-red-500' : 'text-white'}`}>{value}</h4>
    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600 mt-4">{desc}</p>
  </div>
);

export default DREView;
