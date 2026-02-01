
import React, { useMemo, useState, useEffect } from 'react';
import { Asset, AssetSnapshot, Institution, Entity, Transaction, AssetClass, Indexer, AssetStrategicClass } from '../types';
import { 
  ShieldCheck, 
  Plus, 
  Calculator, 
  Save, 
  CalendarDays,
  TrendingUp,
  Settings2,
  Trash2,
  Landmark,
  Layers,
  BarChart3,
  LineChart as LineChartIcon,
  Percent,
  Wallet,
  ArrowRight,
  Info,
  PieChart as PieChartIcon,
  Activity,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface InvestmentsViewProps {
  assets: Asset[];
  snapshots: AssetSnapshot[];
  assetClasses: AssetClass[];
  indexers: Indexer[];
  instituicoes: Institution[];
  entities: Entity[];
  transactions: Transaction[];
  onAddAsset: (asset: Asset) => void;
  onUpdateAssetClasses: (classes: AssetClass[]) => void;
  onUpdateIndexers: (indexers: Indexer[]) => void;
  onUpdateInstitutions: (instituicoes: Institution[]) => void;
  onSaveSnapshots: (snapshots: AssetSnapshot[]) => void;
  selectedMonth: number;
  selectedYear: number;
  isConfidential: boolean;
}

interface ClosingFormState {
  saldoFinal: string;
  aportes: string;
  resgates: string;
}

const STRATEGIC_COLORS = {
  'Liquidez': '#D4AF37',
  'Renda Variável': '#C0C0C0',
  'Longo Prazo': '#B8860B'
};

const InvestmentsView: React.FC<InvestmentsViewProps> = ({ 
  assets, snapshots, assetClasses, indexers, instituicoes, entities, transactions, 
  onAddAsset, onUpdateAssetClasses, onUpdateIndexers, onUpdateInstitutions, onSaveSnapshots, 
  selectedMonth, selectedYear, isConfidential 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'closing' | 'assets' | 'settings'>('overview');
  const [closingForms, setClosingForms] = useState<Record<string, ClosingFormState>>({});
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ 
    classId: '', 
    indexerId: '', 
    strategicClass: 'Liquidez' 
  });
  
  const [newClassName, setNewClassName] = useState('');
  const [newIndexerName, setNewIndexerName] = useState('');
  const [newCustodian, setNewCustodian] = useState({ nome: '', entidadeId: '' });

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthsFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const getAportesResgatesFromTransactions = (assetId: string, month: number, year: number) => {
    return transactions.filter(t => {
      const d = new Date(t.data);
      return t.linkedAssetId === assetId && d.getMonth() === month && d.getFullYear() === year;
    }).reduce((acc, t) => {
      if (t.tipo === 'entrada') acc.resgates += t.valor;
      else acc.aportes += t.valor;
      return acc;
    }, { aportes: 0, resgates: 0 });
  };

  // Hydration de formulário de fechamento
  useEffect(() => {
    const initial: Record<string, ClosingFormState> = {};
    assets.forEach(asset => {
      const existing = snapshots.find(s => s.assetId === asset.id && s.mes === selectedMonth && s.ano === selectedYear);
      const { aportes: txAportes, resgates: txResgates } = getAportesResgatesFromTransactions(asset.id, selectedMonth, selectedYear);
      
      initial[asset.id] = {
        saldoFinal: existing ? existing.saldoFinal.toString() : '',
        aportes: existing ? existing.aportes.toString() : txAportes.toString(),
        resgates: existing ? existing.resgates.toString() : txResgates.toString()
      };
    });
    setClosingForms(initial);
  }, [assets, selectedMonth, selectedYear, snapshots]);

  // Performance Histórica
  const historicalPerformance = useMemo(() => {
    const allMonthsYears = Array.from(new Set(snapshots.map(s => `${s.ano}-${s.mes}`))).sort();
    let cumulativeInvested = 0;
    let prevTotalBalance = 0;

    return allMonthsYears.map(my => {
      const [y, m] = my.split('-').map(Number);
      const monthSnaps = snapshots.filter(s => s.mes === m && s.ano === y);
      const totalBalance = monthSnaps.reduce((acc, s) => acc + s.saldoFinal, 0);
      const monthLiquids = monthSnaps.reduce((acc, s) => acc + (s.aportes - s.resgates), 0);

      cumulativeInvested += monthLiquids;
      const monthlyYield = prevTotalBalance > 0 ? (totalBalance - monthLiquids - prevTotalBalance) : 0;
      const monthlyReturnPct = prevTotalBalance > 0 ? (monthlyYield / prevTotalBalance) * 100 : 0;
      prevTotalBalance = totalBalance;

      return {
        label: `${months[m]}/${String(y).slice(2)}`,
        marketValue: totalBalance,
        invested: cumulativeInvested,
        yield: monthlyYield,
        returnPct: monthlyReturnPct,
        fullLabel: `${monthsFull[m]} ${y}`,
        monthLiquids
      };
    });
  }, [snapshots]);

  const allocationData = useMemo(() => {
    const totals: Record<string, number> = {
      'Liquidez': 0,
      'Renda Variável': 0,
      'Longo Prazo': 0
    };

    assets.forEach(asset => {
      const snap = snapshots.find(s => s.assetId === asset.id && s.mes === selectedMonth && s.ano === selectedYear);
      if (snap) {
        totals[asset.strategicClass] = (totals[asset.strategicClass] || 0) + snap.saldoFinal;
      }
    });

    return Object.entries(totals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [assets, snapshots, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const totalPortfolio = allocationData.reduce((acc, d) => acc + d.value, 0);
    const lastSnapshots = snapshots.filter(s => s.mes === selectedMonth && s.ano === selectedYear);
    const totalYield = lastSnapshots.reduce((acc, s) => acc + s.rendimento, 0);
    const yieldPct = totalPortfolio > 0 ? (totalYield / totalPortfolio) * 100 : 0;

    const liquidityValue = allocationData.find(d => d.name === 'Liquidez')?.value || 0;
    const liquidityPct = totalPortfolio > 0 ? (liquidityValue / totalPortfolio) * 100 : 0;

    return { totalPortfolio, totalYield, yieldPct, liquidityValue, liquidityPct };
  }, [allocationData, snapshots, selectedMonth, selectedYear]);

  const handleSaveClosing = () => {
    const newSnaps: AssetSnapshot[] = assets.map(asset => {
      const form = closingForms[asset.id] || { saldoFinal: '0', aportes: '0', resgates: '0' };
      const saldoFinal = parseFloat(form.saldoFinal) || 0;
      const aportes = parseFloat(form.aportes) || 0;
      const resgates = parseFloat(form.resgates) || 0;
      
      const prevSnap = snapshots.find(s => s.assetId === asset.id && 
        (selectedMonth === 0 ? s.mes === 11 && s.ano === selectedYear - 1 : s.mes === selectedMonth - 1 && s.ano === selectedYear)
      );
      
      const rendimento = saldoFinal - (prevSnap?.saldoFinal || 0) - aportes + resgates;

      return {
        id: `snap-${asset.id}-${selectedMonth}-${selectedYear}`,
        assetId: asset.id,
        mes: selectedMonth,
        ano: selectedYear,
        saldoFinal,
        aportes,
        resgates,
        rendimento
      };
    });
    onSaveSnapshots(newSnaps);
    setActiveTab('overview');
  };

  const custodians = instituicoes.filter(i => i.tipo === 'Corretora');

  return (
    <div className="space-y-10 font-sans">
      {/* Tab Navigation */}
      <div className="flex justify-between items-center bg-[#111111] p-2 rounded-2xl border border-[#262626] shadow-2xl">
        <div className="flex gap-1">
          <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Visão Geral" icon={<TrendingUp size={14} />} />
          <TabBtn active={activeTab === 'closing'} onClick={() => setActiveTab('closing')} label="Fechamento Mensal" icon={<Calculator size={14} />} />
          <TabBtn active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} label="Gestão de Ativos" icon={<Layers size={14} />} />
          <TabBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Parâmetros" icon={<Settings2 size={14} />} />
        </div>
        <div className="flex items-center gap-3 px-6 text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.2em]">
          <CalendarDays size={14} /> {monthsFull[selectedMonth]} {selectedYear}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIBox title="Valor de Mercado" value={formatCurrency(stats.totalPortfolio)} desc="Equity Total" icon={<Landmark size={20} />} highlight="gold" />
            <KPIBox title="Resultado Período" value={formatCurrency(stats.totalYield)} desc="Ganho de Capital Real" icon={<Percent size={20} />} highlight={stats.totalYield >= 0 ? 'positive' : 'negative'} />
            <KPIBox title="Rentabilidade Mês" value={`${stats.yieldPct.toFixed(2)}%`} desc="Variação Percentual" icon={<BarChart3 size={20} />} />
            <KPIBox title="Liquidez (Caixa)" value={formatCurrency(stats.liquidityValue)} desc="Disponibilidade Imediata" icon={<Wallet size={20} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="luxury-card p-10 lg:col-span-2">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-[0.3em] font-serif-luxury">Alocação Estratégica</h3>
                  <p className="label-text mt-3 text-slate-500">Distribuição por Perfil de Capital</p>
                </div>
                <PieChartIcon size={24} className="text-[#D4AF37] opacity-40" />
              </div>
              <div className="h-[300px] w-full flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STRATEGIC_COLORS[entry.name as AssetStrategicClass]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #D4AF37', borderRadius: '12px', padding: '16px' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                      formatter={(value: number) => isConfidential ? '••••' : formatCurrency(value)}
                    />
                    <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="luxury-card p-10 flex flex-col justify-center bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-[#D4AF37]/30">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-black rounded-xl border border-[#D4AF37]/50 text-[#D4AF37]">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase font-serif-luxury tracking-widest">Índice de Liquidez</h4>
                  <p className="text-[8px] font-black text-[#D4AF37] uppercase mt-1">Cash Reserves</p>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className={`text-3xl font-bold font-serif-luxury ${isConfidential ? 'sigilo-blur' : 'text-[#D4AF37]'}`}>
                  {stats.liquidityPct.toFixed(1)}%
                </h3>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]" style={{ width: `${stats.liquidityPct}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Representa a porção do seu patrimônio com liquidez em até 30 dias.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'closing' && (
        <div className="luxury-card overflow-hidden animate-in slide-in-from-bottom-6">
          <div className="p-10 border-b border-[#262626] flex justify-between items-center bg-[#111111]/40">
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider font-serif-luxury">Fechamento Mensal de Carteira</h3>
              <p className="label-text mt-2">Período de Referência: {monthsFull[selectedMonth]} {selectedYear}</p>
            </div>
            <button onClick={handleSaveClosing} className="luxury-button px-10 py-3 flex items-center gap-2 text-[9px]">
              <Save size={16} /> SALVAR FECHAMENTO DO MÊS
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#050505] text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-[#262626]">
                  <th className="px-10 py-6">Ativo</th>
                  <th className="px-6 py-6 text-right">Saldo Anterior</th>
                  <th className="px-6 py-6 text-right">Aportes (R$)</th>
                  <th className="px-6 py-6 text-right">Resgates (R$)</th>
                  <th className="px-6 py-6 text-right">Saldo Atual (R$)</th>
                  <th className="px-6 py-6 text-right">Rendimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {assets.map(asset => {
                  const form = closingForms[asset.id] || { saldoFinal: '', aportes: '', resgates: '' };
                  const prevSnap = snapshots.find(s => s.assetId === asset.id && 
                    (selectedMonth === 0 ? s.mes === 11 && s.ano === selectedYear - 1 : s.mes === selectedMonth - 1 && s.ano === selectedYear)
                  );
                  
                  const sFinal = parseFloat(form.saldoFinal) || 0;
                  const sAnterior = prevSnap?.saldoFinal || 0;
                  const sAportes = parseFloat(form.aportes) || 0;
                  const sResgates = parseFloat(form.resgates) || 0;
                  const rend = sFinal - sAnterior - sAportes + sResgates;

                  return (
                    <tr key={asset.id} className="hover:bg-white/[0.02]">
                      <td className="px-10 py-6">
                        <p className="text-[11px] font-black text-white uppercase">{asset.nome}</p>
                        <span className="text-[8px] text-slate-500 uppercase">{asset.strategicClass}</span>
                      </td>
                      <td className="px-6 py-6 text-right text-xs font-bold text-slate-400">{formatCurrency(sAnterior)}</td>
                      <td className="px-6 py-6 text-right">
                        <input type="number" step="0.01" className="w-28 p-2 text-right bg-[#0A0A0A] border border-[#262626] rounded text-xs" value={form.aportes} onChange={e => setClosingForms({...closingForms, [asset.id]: {...form, aportes: e.target.value}})} />
                      </td>
                      <td className="px-6 py-6 text-right">
                        <input type="number" step="0.01" className="w-28 p-2 text-right bg-[#0A0A0A] border border-[#262626] rounded text-xs" value={form.resgates} onChange={e => setClosingForms({...closingForms, [asset.id]: {...form, resgates: e.target.value}})} />
                      </td>
                      <td className="px-6 py-6 text-right">
                        <input type="number" step="0.01" className="w-32 p-2 text-right bg-[#0A0A0A] border border-[#D4AF37]/40 rounded text-xs text-[#D4AF37] font-black" value={form.saldoFinal} onChange={e => setClosingForms({...closingForms, [asset.id]: {...form, saldoFinal: e.target.value}})} />
                      </td>
                      <td className={`px-6 py-6 text-right text-xs font-black ${rend >= 0 ? 'text-[#D4AF37]' : 'text-red-500'}`}>{formatCurrency(rend)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="luxury-card p-12 space-y-10">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider font-serif-luxury">Inventário de Ativos Financeiros</h3>
            <button onClick={() => setShowAddAsset(!showAddAsset)} className="luxury-button px-8 py-3 flex items-center gap-2"><Plus size={16} /> ADICIONAR NOVO TÍTULO</button>
          </div>

          {showAddAsset && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 bg-[#111111] rounded-[2rem] border border-[#D4AF37]/20">
              <div className="space-y-2">
                <label className="label-text">Nome do Ativo</label>
                <input type="text" className="w-full p-4" placeholder="Ex: LCI BTG Pactual IPCA+" value={newAsset.nome || ''} onChange={e => setNewAsset({...newAsset, nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="label-text">Classificação Estratégica</label>
                <select className="w-full p-4" value={newAsset.strategicClass} onChange={e => setNewAsset({...newAsset, strategicClass: e.target.value as AssetStrategicClass})}>
                  <option value="Liquidez">Liquidez (D+0 a D+30)</option>
                  <option value="Renda Variável">Renda Variável (Risco)</option>
                  <option value="Longo Prazo">Longo Prazo (> 30 dias)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-text">Corretora/Custodiante</label>
                <select className="w-full p-4" value={newAsset.instituicaoId} onChange={e => setNewAsset({...newAsset, instituicaoId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {custodians.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => {
                  if(!newAsset.nome || !newAsset.instituicaoId) return;
                  onAddAsset({ 
                    id: 'asset-'+Date.now(), 
                    nome: newAsset.nome!, 
                    instituicaoId: newAsset.instituicaoId!, 
                    classId: newAsset.classId || '', 
                    indexerId: newAsset.indexerId || '', 
                    entidadeId: custodians.find(c => c.id === newAsset.instituicaoId)?.entidadeId || '', 
                    liquidez: 'D+0',
                    strategicClass: newAsset.strategicClass as AssetStrategicClass
                  });
                  setShowAddAsset(false);
                }} className="luxury-button w-full py-4">CADASTRAR ATIVO</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map(asset => (
              <div key={asset.id} className="luxury-card p-8 group hover:border-[#D4AF37] transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-black/40 rounded-xl text-[#D4AF37] border border-[#262626]"><Layers size={20} /></div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-black rounded-lg border border-[#262626]">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STRATEGIC_COLORS[asset.strategicClass] }}></div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]">{asset.strategicClass}</span>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-white uppercase font-serif-luxury">{asset.nome}</h4>
                <div className="mt-6 border-t border-[#262626] pt-4 flex justify-between items-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase">{instituicoes.find(i => i.id === asset.instituicaoId)?.nome}</p>
                  <ChevronRight size={14} className="text-[#D4AF37]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ParamBox title="Classes de Ativos" items={assetClasses} newItemName={newClassName} setNewItemName={setNewClassName} onAdd={() => { onUpdateAssetClasses([...assetClasses, { id: 'cls-'+Date.now(), nome: newClassName }]); setNewClassName(''); }} onRemove={id => onUpdateAssetClasses(assetClasses.filter(x => x.id !== id))} icon={<Layers size={18} />} />
          <ParamBox title="Indexadores" items={indexers} newItemName={newIndexerName} setNewItemName={setNewIndexerName} onAdd={() => { onUpdateIndexers([...indexers, { id: 'idx-'+Date.now(), nome: newIndexerName }]); setNewIndexerName(''); }} onRemove={id => onUpdateIndexers(indexers.filter(x => x.id !== id))} icon={<BarChart3 size={18} />} />
          <div className="luxury-card p-8 space-y-6">
            <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest font-serif-luxury flex items-center gap-3"><Landmark size={18} /> Custodiantes</h4>
            <div className="space-y-4">
              <input type="text" placeholder="Nome" className="w-full p-4 text-xs bg-[#0A0A0A] border border-[#262626] rounded" value={newCustodian.nome} onChange={e => setNewCustodian({...newCustodian, nome: e.target.value})} />
              <select className="w-full p-4 text-xs bg-[#0A0A0A] border border-[#262626] rounded" value={newCustodian.entidadeId} onChange={e => setNewCustodian({...newCustodian, entidadeId: e.target.value})}>
                <option value="">Entidade</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <button onClick={() => { onUpdateInstitutions([...instituicoes, { id: 'inst-'+Date.now(), nome: newCustodian.nome, tipo: 'Corretora', entidadeId: newCustodian.entidadeId, saldoInicial: 0 }]); setNewCustodian({ nome: '', entidadeId: '' }); }} className="luxury-button w-full py-2 text-[9px]">CADASTRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ParamBox = ({ title, items, newItemName, setNewItemName, onAdd, onRemove, icon }: any) => (
  <div className="luxury-card p-8 space-y-6">
    <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest font-serif-luxury flex items-center gap-3">{icon} {title}</h4>
    <div className="flex gap-2">
      <input type="text" placeholder="Novo..." className="flex-1 p-3 text-xs bg-[#0A0A0A] border border-[#262626] rounded" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
      <button onClick={onAdd} className="luxury-button px-4 text-[10px]">+</button>
    </div>
    <div className="space-y-2 h-40 overflow-y-auto custom-scrollbar">
      {items.map((i: any) => (
        <div key={i.id} className="flex justify-between items-center p-3 bg-black/20 border border-[#262626] rounded">
          <span className="text-[10px] font-black text-white uppercase">{i.nome}</span>
          <button onClick={() => onRemove(i.id)} className="text-red-900/40 hover:text-red-500"><Trash2 size={12} /></button>
        </div>
      ))}
    </div>
  </div>
);

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[#D4AF37] text-black shadow-2xl' : 'text-slate-500 hover:text-slate-300'}`}>
    {icon} {label}
  </button>
);

const KPIBox = ({ title, value, desc, icon, highlight }: any) => (
  <div className={`p-8 luxury-card group hover:border-[#D4AF37]/40 transition-all ${highlight === 'gold' ? 'border-[#D4AF37]/50' : ''}`}>
    <div className={`p-3 rounded-xl bg-[#0F0F0F] w-fit mb-6 border border-[#262626] ${highlight === 'positive' ? 'text-emerald-500' : highlight === 'negative' ? 'text-red-500' : 'text-[#D4AF37]'}`}>
      {icon}
    </div>
    <p className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest mb-2">{title}</p>
    <h4 className={`text-2xl font-bold font-serif-luxury ${highlight === 'negative' ? 'text-red-500' : 'text-white'}`}>{value}</h4>
    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600 mt-4">{desc}</p>
  </div>
);

export default InvestmentsView;
