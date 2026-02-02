
import React, { useMemo } from 'react';
import SummaryCard from './SummaryCard';
import { AppState, DRE_GROUPS } from '../types';
import { 
  Building2, 
  TrendingUp, 
  Clock,
  ShieldCheck,
  Landmark,
  Wallet,
  Activity,
  BarChart3
} from 'lucide-react';
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface DashboardProps {
  state: AppState;
  totals: {
    contas: number;
    investimentos: number;
    imobilizado: number;
    passivos: number;
    patrimonioLiquido: number;
  };
  isConfidential: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ state, totals, isConfidential }) => {
  const METALLIC_PALETTE = ['#D4AF37', '#CD7F32', '#C0C0C0', '#404040', '#F1D592', '#B8860B'];

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  // --- CÁLCULOS DE WEALTH MANAGEMENT ---

  // 1. Patrimônio Bruto (Gross Wealth)
  const patrimonioBruto = useMemo(() => {
    return totals.contas + totals.investimentos + totals.imobilizado;
  }, [totals]);

  // 2. Liquidez Total (D+0 + Investimentos com classe Liquidez)
  const liquidezTotal = useMemo(() => {
    const investLiquidez = state.assets
      .filter(a => a.strategicClass === 'Liquidez')
      .reduce((acc, asset) => {
        const lastSnap = [...state.assetSnapshots]
          .filter(s => s.assetId === asset.id)
          .sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))[0];
        return acc + (lastSnap?.saldoFinal || 0);
      }, 0);
    return totals.contas + investLiquidez;
  }, [state.assets, state.assetSnapshots, totals.contas]);

  // 3. Runway (Autonomia em Meses)
  const runwayMonths = useMemo(() => {
    // Fixed en-dash character in category group comparisons
    const livingCostCategories = state.categories.filter(c => 
      c.grupo === 'CUSTO DE VIDA – SOBREVIVÊNCIA' || c.grupo === 'CUSTO DE VIDA – CONFORTO'
    ).map(c => c.id);

    // Média de saídas nos últimos 6 meses (ou disponíveis)
    const livingCosts = state.transactions.filter(t => 
      t.tipo === 'saida' && livingCostCategories.includes(t.referencia)
    );

    if (livingCosts.length === 0) return 0;

    const totalCost = livingCosts.reduce((acc, t) => acc + t.valor, 0);
    const monthsWithTxs = new Set(livingCosts.map(t => t.data.substring(0, 7))).size || 1;
    const avgMonthlyCost = totalCost / monthsWithTxs;

    return avgMonthlyCost > 0 ? (liquidezTotal / avgMonthlyCost) : 0;
  }, [state.transactions, state.categories, liquidezTotal]);

  // 4. Concentração de Custódia
  const institutionBreakdown = useMemo(() => {
    const data: Record<string, number> = {};
    
    // Bancos
    state.instituicoes.filter(i => i.tipo === 'Banco' || i.tipo === 'Caixa/Carteira').forEach(inst => {
      const txs = state.transactions.filter(t => t.instituicaoId === inst.id);
      const balance = txs.reduce((a, t) => t.tipo === 'entrada' ? a + t.valor : a - t.valor, inst.saldoInicial);
      if (balance > 0) data[inst.nome] = (data[inst.nome] || 0) + balance;
    });

    // Investimentos
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

  // 5. Evolução do PL (Últimos 12 meses)
  const plEvolutionData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const snaps = state.assetSnapshots.filter(s => s.mes === m && s.ano === y);
      const invTotal = snaps.reduce((acc, s) => acc + s.saldoFinal, 0);
      
      // Simplificação: usando o patrimônio líquido atual como base e variando conforme snapshots
      // Em uma implementação real, calcularíamos o PL histórico exato
      months.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        pl: invTotal + totals.contas + totals.imobilizado - totals.passivos
      });
    }
    return months;
  }, [state.assetSnapshots, totals]);

  return (
    <div className="space-y-16 animate-in fade-in duration-1000 font-sans">
      
      {/* 1. CARTÕES DE RESUMO ESTRATÉGICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <SummaryCard 
          title="Patrimônio Bruto" 
          value={formatCurrency(patrimonioBruto)} 
          variation={2.4} 
          icon={<Landmark size={22} />}
          description="Total de Ativos Auditados"
        />
        <SummaryCard 
          title="Liquidez Total" 
          value={formatCurrency(liquidezTotal)} 
          variation={1.8} 
          icon={<Wallet size={22} />}
          description="D+0 e Reserva de Emergência"
        />
        <SummaryCard 
          title="Patrimônio Líquido" 
          value={formatCurrency(totals.patrimonioLiquido)} 
          variation={5.2} 
          icon={<ShieldCheck size={22} />}
          description="Wealth Real (Ativos - Dívidas)"
          highlight
        />
        <SummaryCard 
          title="Runway (Autonomia)" 
          value={runwayMonths > 0 ? `${runwayMonths.toFixed(1)} Meses` : "N/A"} 
          variation={-0.5} 
          icon={<Clock size={22} />}
          description="Cobertura de Custo de Vida"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* 2. MATRIZ DE LIQUIDEZ (BARRAS HORIZONTAIS) */}
        <div className="luxury-card p-10 lg:col-span-1">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury">Matriz de Resiliência</h3>
              <p className="label-text mt-2 text-slate-500">Distribuição por Disponibilidade</p>
            </div>
            <Activity size={24} className="text-[#D4AF37] opacity-30" />
          </div>

          <div className="space-y-10">
            <LiquidityBar 
              label="Disponível (Imediato)" 
              value={totals.contas} 
              total={patrimonioBruto} 
              color="#D4AF37" 
              isConfidential={isConfidential}
            />
            <LiquidityBar 
              label="Alocado (Investimentos)" 
              value={totals.investimentos} 
              total={patrimonioBruto} 
              color="#CD7F32" 
              isConfidential={isConfidential}
            />
            <LiquidityBar 
              label="Imobilizado (Equity/Imóveis)" 
              value={totals.imobilizado} 
              total={patrimonioBruto} 
              color="#404040" 
              isConfidential={isConfidential}
            />
          </div>
        </div>

        {/* 3. EVOLUÇÃO PATRIMONIAL (GRÁFICO DE LINHA) */}
        <div className="luxury-card p-10 lg:col-span-2">
           <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury">Evolução de Wealth</h3>
              <p className="label-text mt-2 text-slate-500">Patrimônio Líquido - Últimos 12 Meses</p>
            </div>
            <TrendingUp size={24} className="text-[#D4AF37] opacity-30" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={plEvolutionData}>
                <defs>
                  <linearGradient id="colorPl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#404040" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #D4AF37', borderRadius: '12px' }}
                  itemStyle={{ color: '#D4AF37', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                  formatter={(value: number) => isConfidential ? '••••' : formatCurrency(value)}
                />
                <Area 
                  type="monotone" 
                  dataKey="pl" 
                  stroke="#D4AF37" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPl)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. CONCENTRAÇÃO DE CUSTÓDIA (DONUT) */}
        <div className="luxury-card p-10 lg:col-span-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="max-w-md">
              <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury">Risco de Contraparte</h3>
              <p className="label-text mt-2 text-slate-500">Distribuição de Capital por Instituição Custodiante</p>
              
              <div className="mt-10 space-y-4">
                {institutionBreakdown.slice(0, 5).map((inst, idx) => (
                  <div key={inst.name} className="flex justify-between items-center text-[11px] font-bold">
                    <div className="flex items-center gap-3 uppercase tracking-widest text-slate-400">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METALLIC_PALETTE[idx % METALLIC_PALETTE.length] }}></div>
                       {inst.name}
                    </div>
                    <span className="text-white">
                      {((inst.value / (totals.contas + totals.investimentos)) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 h-[300px] min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={institutionBreakdown} 
                    cx="50%" cy="50%" 
                    innerRadius={80} 
                    outerRadius={110} 
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
    </div>
  );
};

interface LiquidityBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  isConfidential: boolean;
}

const LiquidityBar: React.FC<LiquidityBarProps> = ({ label, value, total, color, isConfidential }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className={`text-[11px] font-bold text-white font-serif-luxury ${isConfidential ? 'sigilo-blur' : ''}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full transition-all duration-[1.5s] ease-out shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: color 
          }}
        ></div>
      </div>
    </div>
  );
};

export default Dashboard;
