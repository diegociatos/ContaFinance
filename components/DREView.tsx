
import React, { useMemo, useState } from 'react';
import { Transaction, Category, DRE_GROUPS, AppState, AssetSnapshot, CardTransaction } from '../types';
import { ChevronDown, ChevronRight, Zap, DollarSign, BarChart3, Clock } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'competencia' | 'caixa'>('competencia');

  const dreData = useMemo(() => {
    // Inicialização da estrutura fixa de grupos
    const groups: Record<string, { total: number; items: Record<string, number> }> = {};
    DRE_GROUPS.forEach(g => {
      groups[g] = { total: 0, items: {} };
    });

    const isSamePeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    };

    // 1. PROCESSAMENTO DE TRANSAÇÕES BANCÁRIAS E GERAIS
    transactions.forEach(tx => {
      // Regras de Exclusão Contábil
      if (!tx.impactaDRE) return;
      if (tx.tipoLancamento === 'PAGAMENTO_FATURA') return;
      if (tx.tipoLancamento === 'TRANSFERENCIA_INTERNA') return;

      // Seleção da data base conforme a visão selecionada
      const dateToUse = viewMode === 'caixa' ? tx.dataCaixa : tx.dataCompetencia;
      
      if (isSamePeriod(dateToUse)) {
        const cat = categories.find(c => c.id === tx.referencia);
        if (cat && groups[cat.grupo]) {
          const val = tx.tipo === 'entrada' ? tx.valor : -tx.valor;
          groups[cat.grupo].total += val;
          groups[cat.grupo].items[cat.nome] = (groups[cat.grupo].items[cat.nome] || 0) + val;
        }
      }
    });

    // 2. PROCESSAMENTO DE LANÇAMENTOS DE CARTÃO (COMPETÊNCIA)
    // Nota: O impacto em DRE de cartão ocorre no mês da COMPRA pelo valor TOTAL
    if (viewMode === 'competencia') {
      state.cardTransactions.forEach(ctx => {
        // Apenas a primeira parcela (ou compra à vista) registra o impacto total na competência
        if (ctx.parcelaAtual === 1 && isSamePeriod(ctx.dataCompra)) {
          const cat = categories.find(c => c.id === ctx.categoryId);
          if (cat && groups[cat.grupo]) {
            const val = -ctx.valorTotalCompra;
            groups[cat.grupo].total += val;
            groups[cat.grupo].items[cat.nome] = (groups[cat.grupo].items[cat.nome] || 0) + val;
          }
        }
      });
    }

    // 3. RENDIMENTOS DE ATIVOS (VARIAÇÃO PATRIMONIAL FINANCEIRA)
    snapshots
      .filter(s => s.mes === selectedMonth && s.ano === selectedYear)
      .forEach(s => {
        const group = 'RECEITAS FINANCEIRAS / VARIAÇÃO';
        const name = 'RENDIMENTO DE INVESTIMENTOS';
        groups[group].total += s.rendimento;
        groups[group].items[name] = (groups[group].items[name] || 0) + s.rendimento;
      });

    // CÁLCULO DE RESULTADOS
    const recOp = groups['RECEITAS OPERACIONAIS'].total;
    const custosSub = groups['CUSTO DE VIDA SOBREVIVÊNCIA'].total;
    const custosConf = groups['CUSTO DE VIDA CONFORTO'].total;
    const despProf = groups['DESPESAS PROFISSIONAIS'].total;
    
    // Resultado Operacional Líquido
    const resOp = recOp + custosSub + custosConf + despProf;

    return { groups, recOp, resOp };
  }, [transactions, state.cardTransactions, categories, snapshots, viewMode, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Cards de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="luxury-card p-10 border-l-4 border-[#D4AF37]">
          <p className="label-text mb-2">Resultado Operacional</p>
          <h3 className={`text-3xl font-bold font-serif-luxury ${dreData.resOp < 0 ? 'text-red-500' : 'text-white'}`}>
            {formatCurrency(dreData.resOp)}
          </h3>
          <p className="text-[8px] font-black text-slate-500 uppercase mt-4 tracking-widest">Sobra de caixa recorrente</p>
        </div>
        <div className="luxury-card p-10">
          <p className="label-text mb-2">Faturamento Operacional</p>
          <h3 className="text-3xl font-bold font-serif-luxury text-white">
            {formatCurrency(dreData.recOp)}
          </h3>
          <p className="text-[8px] font-black text-slate-500 uppercase mt-4 tracking-widest">Total de entradas operacionais</p>
        </div>
        <div className="luxury-card p-10 flex flex-col justify-center">
          <p className="label-text mb-3">Seletor de Visão Contábil</p>
          <div className="flex bg-black p-1 rounded-xl border border-[#262626]">
            <button 
              onClick={() => setViewMode('caixa')} 
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'caixa' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Caixa
            </button>
            <button 
              onClick={() => setViewMode('competencia')} 
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'competencia' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Competência
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de DRE */}
      <div className="luxury-card overflow-hidden border-[#262626]">
        <div className="p-8 bg-[#111111]/50 border-b border-[#262626] flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.3em] font-serif-luxury">Demonstrativo de Resultados do Exercício</h3>
          <div className="flex items-center gap-3 text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">
            <Clock size={14} /> Auditoria Ativa
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-[#262626] bg-[#0A0A0A]">
              <th className="px-10 py-6">Estrutura de Contas Gerenciais</th>
              <th className="px-10 py-6 text-right">Saldo do Período</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {DRE_GROUPS.map(group => (
              <React.Fragment key={group}>
                <tr className="bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                  <td className="px-10 py-5">
                    <span className="text-xs font-bold text-white uppercase tracking-tight">{group}</span>
                  </td>
                  <td className={`px-10 py-5 text-right font-black font-serif-luxury ${dreData.groups[group].total < 0 ? 'text-red-500' : 'text-white'}`}>
                    {formatCurrency(dreData.groups[group].total)}
                  </td>
                </tr>
                {/* Sub-itens para detalhamento rápido */}
                {Object.entries(dreData.groups[group].items).map(([name, value]) => (
                  <tr key={name} className="bg-black/20">
                    <td className="px-16 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{name}</td>
                    <td className="px-10 py-3 text-right text-xs font-medium text-slate-400">{formatCurrency(value)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            
            {/* Linha de Resultado Final Operacional */}
            <tr className="bg-[#D4AF37]/10 border-t-2 border-[#D4AF37]/30">
              <td className="px-10 py-8">
                <span className="text-sm font-black text-[#D4AF37] uppercase tracking-[0.3em]">LUCRO OPERACIONAL LÍQUIDO</span>
              </td>
              <td className={`px-10 py-8 text-right text-2xl font-black font-serif-luxury ${dreData.resOp < 0 ? 'text-red-500' : 'text-[#D4AF37]'}`}>
                {formatCurrency(dreData.resOp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Alerta de Integridade */}
      <div className="flex items-center gap-4 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/20">
        <Zap size={20} className="text-blue-500" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          Este relatório é uma <span className="text-blue-400">View de Auditoria</span>. Movimentações internas e pagamentos de fatura de cartão são excluídos automaticamente para evitar duplicidade econômica, focando apenas no consumo real de recursos.
        </p>
      </div>
    </div>
  );
};

export default DREView;
