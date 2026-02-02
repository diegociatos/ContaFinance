
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, Transaction, Category, DRE_GROUPS } from '../types';
import { Eye, EyeOff, Target, TrendingUp, History, Calendar, BarChart3 } from 'lucide-react';

interface DREViewProps {
  state: AppState;
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: number;
  selectedYear: number;
  isConfidential: boolean;
}

type TemporalView = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'comparativo';

const DREView: React.FC<DREViewProps> = ({ state, transactions, categories, selectedMonth, selectedYear, isConfidential }) => {
  const [showEmptyAccounts, setShowEmptyAccounts] = useState(false);
  const [viewMode, setViewMode] = useState<'competencia' | 'caixa'>('competencia');
  const [temporalView, setTemporalView] = useState<TemporalView>(() => {
    return (localStorage.getItem('dre_temporal_view') as TemporalView) || 'mensal';
  });

  useEffect(() => {
    localStorage.setItem('dre_temporal_view', temporalView);
  }, [temporalView]);

  const monthsLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const periods = useMemo(() => {
    if (temporalView === 'mensal') return [selectedMonth];
    if (temporalView === 'trimestral') {
      const q = Math.floor(selectedMonth / 3);
      return [q * 3, q * 3 + 1, q * 3 + 2];
    }
    if (temporalView === 'semestral') {
      const s = Math.floor(selectedMonth / 6);
      return Array.from({ length: 6 }, (_, i) => s * 6 + i);
    }
    if (temporalView === 'anual' || temporalView === 'comparativo') {
      return Array.from({ length: 12 }, (_, i) => i);
    }
    return [selectedMonth];
  }, [temporalView, selectedMonth]);

  const dreData = useMemo(() => {
    const balances: Record<string, Record<number, number>> = {};
    
    categories.forEach(c => {
      balances[c.id] = {};
      for (let i = 0; i < 12; i++) balances[c.id][i] = 0;
    });

    const processTx = (tx: Transaction | any, isCard: boolean = false) => {
      const date = viewMode === 'caixa' ? new Date(tx.dataCaixa || tx.data) : new Date(tx.dataCompetencia || tx.data);
      if (date.getFullYear() === selectedYear) {
        const m = date.getMonth();
        const catId = isCard ? tx.categoryId : tx.referencia;
        if (balances[catId]) {
          if (isCard) {
            balances[catId][m] -= tx.valor;
          } else {
            balances[catId][m] += (tx.tipo === 'entrada' ? tx.valor : -tx.valor);
          }
        }
      }
    };

    transactions.forEach(tx => tx.impactaDRE && processTx(tx));
    state.cardTransactions.forEach(ctx => processTx(ctx, true));

    return balances;
  }, [transactions, state.cardTransactions, categories, selectedYear, viewMode]);

  const getCategoryTotal = (catId: string) => {
    return periods.reduce((acc, m) => acc + (dreData[catId]?.[m] || 0), 0);
  };

  const getGroupTotal = (groupName: string) => {
    return categories
      .filter(c => c.grupo === groupName)
      .reduce((acc, c) => acc + getCategoryTotal(c.id), 0);
  };

  // --- CÁLCULOS DE BI POR NÍVEL ---
  const vReceitasOp = getGroupTotal('RECEITAS OPERACIONAIS');
  const vSobrevivencia = getGroupTotal('CUSTO DE VIDA – SOBREVIVÊNCIA');
  const vConforto = getGroupTotal('CUSTO DE VIDA – CONFORTO');
  const lucroBrutoVida = vReceitasOp + vSobrevivencia + vConforto;

  const vProfissionais = getGroupTotal('DESPESAS PROFISSIONAIS');
  const vBensMateriais = getGroupTotal('BENS MATERIAIS');
  const vLaser = getGroupTotal('LASER');
  const vCarros = getGroupTotal('CARROS');
  const lucroLiquidoOp = lucroBrutoVida + vProfissionais + vBensMateriais + vLaser + vCarros;

  const vInvestimentos = getGroupTotal('INVESTIMENTOS');
  const resultadoPeriodo = lucroLiquidoOp + vInvestimentos;

  const vNaoOp = getGroupTotal('RECEITAS NÃO OPERACIONAIS');
  const vFinanceiras = getGroupTotal('RECEITAS FINANCEIRAS');
  const resultadoGlobal = resultadoPeriodo + vNaoOp + vFinanceiras;

  const RenderAnalyticalRow = ({ category }: { category: Category }) => {
    const totalValue = getCategoryTotal(category.id);
    const hasValue = Math.abs(totalValue) > 0.01;

    if (!showEmptyAccounts && !hasValue) return null;

    return (
      <tr className="group hover:bg-white/[0.04] transition-colors border-b border-white/5">
        <td className="pl-16 pr-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-widest font-serif-luxury ${totalValue === 0 ? 'text-slate-700' : 'text-[#F5F5F5]'}`}>
              {category.nome}
            </span>
            <div className="flex-grow border-b border-dotted border-white/10 h-3 opacity-30"></div>
          </div>
        </td>
        
        {temporalView === 'comparativo' ? (
          periods.map(m => {
            const val = dreData[category.id]?.[m] || 0;
            return (
              <td key={m} className={`px-4 py-3 text-right text-[11px] font-bold font-serif-luxury ${val < 0 ? 'text-red-400' : val > 0 ? 'text-[#F5F5F5]' : 'text-slate-800'}`}>
                {isConfidential ? '••••' : val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            );
          })
        ) : (
          <td className={`px-10 py-3 text-right text-[11px] font-bold font-serif-luxury ${totalValue < 0 ? 'text-red-400' : totalValue > 0 ? 'text-[#F5F5F5]' : 'text-slate-700'}`}>
            {formatCurrency(totalValue)}
          </td>
        )}
      </tr>
    );
  };

  const RenderSubGroup = ({ label, groupName, signal }: { label: string, groupName: string, signal: string }) => {
    const total = getGroupTotal(groupName);
    const relevantCats = categories.filter(c => c.grupo === groupName);
    const hasMovement = relevantCats.some(c => Math.abs(getCategoryTotal(c.id)) > 0.01);

    if (!showEmptyAccounts && !hasMovement) return null;

    return (
      <>
        <tr className="bg-white/[0.01]">
          <td className="px-10 py-5">
            <span className="text-[12px] font-black text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury">{signal} {label}</span>
          </td>
          {temporalView === 'comparativo' ? (
            periods.map(m => {
              const mTotal = relevantCats.reduce((acc, c) => acc + (dreData[c.id]?.[m] || 0), 0);
              return <td key={m} className="px-4 py-5 text-right text-[11px] font-black text-white font-serif-luxury">{isConfidential ? '••••' : mTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            })
          ) : (
            <td className="px-10 py-5 text-right text-xs font-black text-white font-serif-luxury">{formatCurrency(total)}</td>
          )}
        </tr>
        {relevantCats.map(cat => <RenderAnalyticalRow key={cat.id} category={cat} />)}
      </>
    );
  };

  const RenderTotalLine = ({ label, value, colorClass = "text-[#D4AF37]" }: { label: string, value: number, colorClass?: string }) => (
    <tr className="bg-[#121212] border-y-2 border-[#262626]">
      <td className="px-10 py-6 text-[12px] font-black text-white uppercase tracking-[0.2em] font-serif-luxury">{label}</td>
      {temporalView === 'comparativo' ? (
        periods.map(m => {
          return <td key={m} className="px-4 py-6 text-right text-[11px] font-black">--</td>
        })
      ) : (
        <td className={`px-10 py-6 text-right text-lg font-bold font-serif-luxury ${value < 0 ? 'text-red-500' : colorClass}`}>{formatCurrency(value)}</td>
      )}
    </tr>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans">
      
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5 p-1 bg-[#111111] rounded-2xl border border-[#262626] shadow-xl">
            {(['mensal', 'trimestral', 'semestral', 'anual', 'comparativo'] as TemporalView[]).map(v => (
              <button 
                key={v} 
                onClick={() => setTemporalView(v)} 
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${temporalView === v ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'text-slate-500 hover:text-white'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-black p-1 rounded-xl border border-[#262626]">
              <button onClick={() => setViewMode('caixa')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'caixa' ? 'bg-white text-black' : 'text-slate-500'}`}>Caixa</button>
              <button onClick={() => setViewMode('competencia')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'competencia' ? 'bg-white text-black' : 'text-slate-500'}`}>Competência</button>
            </div>
            <button 
              onClick={() => setShowEmptyAccounts(!showEmptyAccounts)}
              className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${showEmptyAccounts ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]' : 'border-[#262626] text-slate-500'}`}
            >
              {showEmptyAccounts ? <Eye size={14} /> : <EyeOff size={14} />}
              {showEmptyAccounts ? 'OCULTAR VAZIAS' : 'EXIBIR TODOS'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPIBox title={`Lucro Operacional`} value={formatCurrency(lucroLiquidoOp)} icon={<Target size={20} />} highlight="gold" />
        <KPIBox title={`Resultado Patrimonial`} value={formatCurrency(resultadoPeriodo)} icon={<TrendingUp size={20} />} highlight="blue" />
        <KPIBox title={`Resultado Global`} value={formatCurrency(resultadoGlobal)} icon={<History size={20} />} highlight="emerald" />
      </div>

      <div className="luxury-card overflow-hidden shadow-2xl border border-[#262626]">
        <div className="bg-[#0A0A0A] px-10 py-6 border-b border-[#262626] flex justify-between items-center">
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#D4AF37] font-serif-luxury flex items-center gap-3">
            <BarChart3 size={16} /> DRE GERENCIAL PATRIMONIAL • {selectedYear}
          </h2>
          <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
            <Calendar size={12} /> Ref: {temporalView.toUpperCase()}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#050505] text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-[#262626]">
                <th className="px-10 py-5 min-w-[300px]">Hierarquia do Plano de Contas</th>
                {temporalView === 'comparativo' ? (
                  periods.map(m => <th key={m} className="px-4 py-5 text-right w-24">{monthsLabels[m]}</th>)
                ) : (
                  <th className="px-10 py-5 text-right w-[250px]">Valor (R$)</th>
                )}
              </tr>
            </thead>
            <tbody>
              
              {/* --- NÍVEL I: RESULTADO OPERACIONAL --- */}
              <tr className="bg-[#D4AF37]/5 border-y border-[#D4AF37]/10">
                <td colSpan={temporalView === 'comparativo' ? 13 : 2} className="px-10 py-4 text-[12px] font-black text-[#D4AF37] uppercase tracking-[0.5em] font-serif-luxury">I. RESULTADO OPERACIONAL</td>
              </tr>

              <RenderSubGroup label="RECEITAS OPERACIONAIS" groupName="RECEITAS OPERACIONAIS" signal="(+)" />
              <RenderSubGroup label="CUSTO DE VIDA – SOBREVIVÊNCIA" groupName="CUSTO DE VIDA – SOBREVIVÊNCIA" signal="(-)" />
              <RenderSubGroup label="CUSTO DE VIDA – CONFORTO" groupName="CUSTO DE VIDA – CONFORTO" signal="(-)" />

              <RenderTotalLine label="(=) LUCRO BRUTO DE VIDA" value={lucroBrutoVida} />

              <RenderSubGroup label="DESPESAS PROFISSIONAIS" groupName="DESPESAS PROFISSIONAIS" signal="(-)" />
              <RenderSubGroup label="BENS MATERIAIS" groupName="BENS MATERIAIS" signal="(-)" />
              <RenderSubGroup label="LASER" groupName="LASER" signal="(-)" />
              <RenderSubGroup label="CARROS" groupName="CARROS" signal="(-)" />

              <RenderTotalLine label="(=) LUCRO LÍQUIDO OPERACIONAL" value={lucroLiquidoOp} />

              {/* --- NÍVEL II: MOVIMENTAÇÕES DE PATRIMÔNIO --- */}
              <tr className="bg-blue-500/5 border-y border-blue-500/10">
                <td colSpan={temporalView === 'comparativo' ? 13 : 2} className="px-10 py-4 text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] font-serif-luxury">II. MOVIMENTAÇÕES DE PATRIMÔNIO</td>
              </tr>

              <RenderSubGroup label="INVESTIMENTOS" groupName="INVESTIMENTOS" signal="(-)" />

              <RenderTotalLine label="(=) RESULTADO DO PERÍODO" value={resultadoPeriodo} colorClass="text-blue-400" />

              {/* --- NÍVEL III: RESULTADOS NÃO OPERACIONAIS / FINANCEIROS --- */}
              <tr className="bg-emerald-500/5 border-y border-emerald-500/10">
                <td colSpan={temporalView === 'comparativo' ? 13 : 2} className="px-10 py-4 text-[12px] font-black text-emerald-400 uppercase tracking-[0.5em] font-serif-luxury">III. RESULTADOS NÃO OPERACIONAIS / FINANCEIROS</td>
              </tr>

              <RenderSubGroup label="RECEITAS NÃO OPERACIONAIS" groupName="RECEITAS NÃO OPERACIONAIS" signal="(+)" />
              <RenderSubGroup label="RECEITAS FINANCEIRAS" groupName="RECEITAS FINANCEIRAS" signal="(+)" />

              <tr className="bg-[#181818] border-t-4 border-white/10">
                <td className="px-10 py-10 text-[13px] font-black text-white uppercase tracking-[0.4em] font-serif-luxury">(=) RESULTADO GLOBAL DO PERÍODO</td>
                <td className={`px-10 py-10 text-right text-3xl font-black font-serif-luxury ${resultadoGlobal < 0 ? 'text-red-500' : 'text-white'}`}>{formatCurrency(resultadoGlobal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
    <div className={`luxury-card p-8 border-l-4 ${getColors()} bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] hover:bg-white/[0.02] transition-all`}>
      <div className="flex justify-between items-start mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
        <div className="opacity-40">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold font-serif-luxury text-white">{value}</h3>
    </div>
  );
};

export default DREView;
