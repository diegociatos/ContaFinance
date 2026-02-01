
import React, { useMemo } from 'react';
import SummaryCard from './SummaryCard';
import { AppState } from '../types';
import { 
  Building2, 
  TrendingUp, 
  Clock,
  ShieldCheck,
  Scale,
  Landmark
} from 'lucide-react';
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface DashboardProps {
  state: AppState;
  totals: {
    contas: number;
    investimentos: number;
    imobilizado: number;
    patrimonioLiquido: number;
  };
  isConfidential: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ state, totals, isConfidential }) => {
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const METALLIC_PALETTE = ['#D4AF37', '#CD7F32', '#C0C0C0', '#404040', '#F1D592', '#B8860B'];

  const liquidityData = [
    { name: 'DISPONÍVEL (D+0)', value: totals.contas, color: METALLIC_PALETTE[0] },
    { name: 'INVESTIMENTOS', value: totals.investimentos, color: METALLIC_PALETTE[1] },
    { name: 'ATIVOS FIXOS / EQUITY', value: totals.imobilizado, color: METALLIC_PALETTE[2] },
  ];

  const institutionBreakdown = useMemo(() => {
    const data: Record<string, number> = {};
    
    // 1. Bancos (Saldos de Conta)
    state.instituicoes.filter(i => i.tipo === 'Banco').forEach(inst => {
      const txs = state.transactions.filter(t => t.instituicaoId === inst.id);
      const balance = txs.reduce((a, t) => t.tipo === 'entrada' ? a + t.valor : a - t.valor, inst.saldoInicial);
      if (balance > 0) data[inst.nome] = (data[inst.nome] || 0) + balance;
    });

    // 2. Corretoras (Ativos de Investimento)
    state.assets.forEach(asset => {
      const inst = state.instituicoes.find(i => i.id === asset.instituicaoId);
      if (!inst) return;
      const lastSnap = [...state.assetSnapshots]
        .filter(s => s.assetId === asset.id)
        .sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))[0];
      const balance = lastSnap?.saldoFinal || 0;
      if (balance > 0) data[inst.nome] = (data[inst.nome] || 0) + balance;
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.instituicoes, state.assets, state.assetSnapshots, state.transactions]);

  return (
    <div className="space-y-16 animate-in fade-in duration-1000 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <SummaryCard 
          title="Liquidez Imediata" 
          value={formatCurrency(totals.contas)} 
          variation={2.1} 
          icon={<Building2 size={24} />}
          description="Saldos Bancários Reais"
        />
        <SummaryCard 
          title="Capital sob Gestão" 
          variation={6.4} 
          value={formatCurrency(totals.investimentos + totals.imobilizado)} 
          icon={<TrendingUp size={24} />}
          description="Investimentos + Equity"
        />
        <SummaryCard 
          title="Patrimônio Líquido" 
          value={formatCurrency(totals.patrimonioLiquido)} 
          variation={4.8} 
          icon={<ShieldCheck size={24} />}
          description="Wealth Consolidado"
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Matriz de Liquidez */}
        <div className="luxury-card p-12 relative overflow-hidden">
          <div className="flex justify-between items-center mb-16">
            <div>
              <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury">Matriz de Liquidez</h3>
              <p className="label-text mt-3 text-slate-500">Resgatabilidade Patrimonial</p>
            </div>
            <Clock size={28} className="text-[#D4AF37] opacity-30" />
          </div>
          
          <div className="space-y-12 relative z-10">
            {liquidityData.map((item) => (
              <div key={item.name} className="group">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</span>
                  <span className={`text-sm font-bold text-[#F5F5F5] font-serif-luxury ${isConfidential ? 'sigilo-blur' : ''}`}>
                    {totals.patrimonioLiquido > 0 ? ((item.value / (totals.investimentos + totals.contas + totals.imobilizado)) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full transition-all duration-[1.5s] ease-out shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                    style={{ 
                      width: `${totals.patrimonioLiquido > 0 ? (item.value / (totals.investimentos + totals.contas + totals.imobilizado)) * 100 : 0}%`, 
                      backgroundColor: item.color 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exposição por Instituição */}
        <div className="luxury-card p-12 relative overflow-hidden">
          <div className="flex justify-between items-center mb-16">
            <div>
              <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury">Concentração de Custódia</h3>
              <p className="label-text mt-3 text-slate-500">Exposição por Instituição Financeira</p>
            </div>
            <Landmark size={28} className="text-[#D4AF37] opacity-30" />
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={institutionBreakdown} 
                  cx="50%" cy="50%" 
                  innerRadius={110} 
                  outerRadius={140} 
                  paddingAngle={8} 
                  dataKey="value" 
                  stroke="none"
                >
                  {institutionBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={METALLIC_PALETTE[index % METALLIC_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #D4AF37', borderRadius: '12px', padding: '12px' }}
                  itemStyle={{ color: '#F5F5F5', fontSize: '10px', textTransform: 'uppercase', fontWeight: '900' }}
                  formatter={(value: number) => isConfidential ? '••••' : formatCurrency(value)} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
