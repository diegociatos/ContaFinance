
import React, { useState, useMemo } from 'react';
import { 
  AppState, FixedAsset, Liability, InsurancePolicy, 
  FixedAssetSnapshot, ValuationMethod, Entity 
} from '../types';
import { 
  TrendingUp, TrendingDown, ShieldCheck, Briefcase, 
  ArrowUpRight, Shield, FileSpreadsheet, Plus, 
  Trash2, Landmark, Heart, Building, Car, X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PatrimonioViewProps {
  state: AppState;
  onUpdateFixedAssets: (assets: FixedAsset[]) => void;
  onUpdateLiabilities: (liabilities: Liability[]) => void;
  onUpdateInsurance: (policies: InsurancePolicy[]) => void;
  onSaveValuation: (snaps: FixedAssetSnapshot[]) => void;
  selectedMonth: number;
  selectedYear: number;
  isConfidential: boolean;
  globalEntityFilter: string;
}

const PatrimonioView: React.FC<PatrimonioViewProps> = ({ 
  state, onUpdateFixedAssets, onUpdateLiabilities, onUpdateInsurance, 
  isConfidential, globalEntityFilter 
}) => {
  const [activeTab, setActiveTab] = useState<'balanco' | 'bens' | 'dividas' | 'seguros'>('balanco');
  const [showForm, setShowForm] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    categoria: 'Imóvel',
    valorAquisicao: 0,
    valorMercado: 0,
    valuationMethod: 'Valor de Mercado',
    entidadeId: ''
  });

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const totals = useMemo(() => {
    const filter = (item: { entidadeId: string }) => globalEntityFilter === 'all' || item.entidadeId === globalEntityFilter;
    const assets = state.fixedAssets.filter(filter).reduce((acc, f) => acc + f.valorMercado, 0);
    const debts = state.liabilities.filter(filter).reduce((acc, l) => acc + l.saldoDevedor, 0);
    return { assets, debts, net: assets - debts };
  }, [state.fixedAssets, state.liabilities, globalEntityFilter]);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.nome || !newAsset.entidadeId) return;
    
    const asset: FixedAsset = {
      id: 'fa-' + Math.random().toString(36).substr(2, 9),
      nome: newAsset.nome!,
      categoria: newAsset.categoria as any,
      valorAquisicao: Number(newAsset.valorAquisicao),
      valorMercado: Number(newAsset.valorMercado),
      entidadeId: newAsset.entidadeId!,
      valuationMethod: newAsset.valuationMethod as any
    };

    onUpdateFixedAssets([...state.fixedAssets, asset]);
    setShowForm(false);
    setNewAsset({ categoria: 'Imóvel', valorAquisicao: 0, valorMercado: 0, valuationMethod: 'Valor de Mercado', entidadeId: '' });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 relative z-10 font-sans">
      {/* Sub-Navegação de Wealth */}
      <div className="flex justify-between items-center bg-[#111111] p-2 rounded-2xl border border-[#262626] shadow-2xl">
        <div className="flex gap-1">
          <TabBtn active={activeTab === 'balanco'} onClick={() => setActiveTab('balanco')} label="Balanço Consolidado" />
          <TabBtn active={activeTab === 'bens'} onClick={() => setActiveTab('bens')} label="Bens & Equity" />
          <TabBtn active={activeTab === 'dividas'} onClick={() => setActiveTab('dividas')} label="Dívidas & Alavancagem" />
          <TabBtn active={activeTab === 'seguros'} onClick={() => setActiveTab('seguros')} label="Proteção de Ativos" />
        </div>
        <div className="px-8 flex items-center gap-4 text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.4em]">
          <Shield size={16} /> RISCO AUDITADO: BAIXO
        </div>
      </div>

      {activeTab === 'balanco' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <KPIBox title="Ativos Imobilizados" value={formatCurrency(totals.assets)} desc="Imóveis e Participações" icon={<TrendingUp size={20} />} />
            <KPIBox title="Passivos Estruturados" value={formatCurrency(totals.debts)} desc="Financiamentos e Crédito" icon={<TrendingDown size={20} />} highlight="negative" />
            <KPIBox title="Net Worth Imobiliário" value={formatCurrency(totals.net)} desc="Patrimônio Líquido Real" icon={<ShieldCheck size={20} />} highlight="positive" />
            <KPIBox title="LTV de Proteção" value="78%" desc="Cobertura de Seguros" icon={<Shield size={20} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="luxury-card p-12">
              <h4 className="text-sm font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-12 border-b border-[#262626] pb-6 font-serif-luxury">Composição de Riqueza Fixa</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={state.fixedAssets.filter(f => globalEntityFilter === 'all' || f.entidadeId === globalEntityFilter)} 
                      cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="valorMercado" nameKey="nome"
                    >
                      {state.fixedAssets.map((_, i) => <Cell key={i} fill={['#D4AF37', '#CD7F32', '#C0C0C0', '#404040'][i % 4]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #D4AF37', borderRadius: '12px' }} itemStyle={{ color: '#F5F5F5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#111111] p-12 rounded-[2rem] border border-[#D4AF37]/10 flex flex-col justify-center relative overflow-hidden">
               <div className="relative z-10 space-y-8">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.5em] mb-4">Relatório de Risco Patrimonial</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">Seu índice de alavancagem atual é de <b>{(totals.debts / (totals.assets || 1) * 100).toFixed(1)}%</b>. O patrimônio imobilizado representa a maior parte da sua riqueza não líquida.</p>
                  <button className="luxury-button px-10 py-4 text-[10px]">EXPORTAR LAUDO DE AUDITORIA</button>
               </div>
               <FileSpreadsheet size={200} className="absolute -right-16 -bottom-16 text-[#D4AF37] opacity-[0.03] rotate-12" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bens' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#F5F5F5] uppercase tracking-widest font-serif-luxury">Inventário de Ativos & Equity</h3>
            <button onClick={() => setShowForm(true)} className="luxury-button px-8 py-3 text-[10px] flex items-center gap-2"><Plus size={14} /> NOVO ATIVO</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.fixedAssets.filter(f => globalEntityFilter === 'all' || f.entidadeId === globalEntityFilter).map(asset => (
              <div key={asset.id} className="luxury-card p-8 group hover:border-[#D4AF37] transition-all">
                <div className="flex justify-between mb-6">
                  <div className="p-3 bg-[#0F0F0F] rounded-xl text-[#D4AF37] border border-[#262626]">
                    {asset.categoria === 'Imóvel' ? <Building size={20} /> : asset.categoria === 'Veículo' ? <Car size={20} /> : <Briefcase size={20} />}
                  </div>
                  <button onClick={() => onUpdateFixedAssets(state.fixedAssets.filter(f => f.id !== asset.id))} className="text-red-900/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
                <p className="text-[8px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-1">{asset.categoria} • {asset.valuationMethod}</p>
                <h4 className="text-lg font-bold text-[#F5F5F5] uppercase mb-6 leading-tight font-serif-luxury">{asset.nome}</h4>
                <div className="border-t border-[#262626] pt-6 flex justify-between items-end">
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Valor de Mercado</p>
                    <p className="text-xl font-black text-[#FFFFFF] font-serif-luxury">{formatCurrency(asset.valorMercado)}</p>
                  </div>
                  <ArrowUpRight size={18} className="text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Bem */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="luxury-card w-full max-w-2xl p-12 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
            <h3 className="text-2xl font-bold text-[#D4AF37] uppercase tracking-widest mb-10 font-serif-luxury">Lançamento Patrimonial</h3>
            
            <form onSubmit={handleAddAsset} className="grid grid-cols-2 gap-8">
              <div className="col-span-2 space-y-2">
                <label className="label-text">Nome do Ativo</label>
                <input required type="text" className="w-full p-4" placeholder="Ex: Apartamento Jardins" value={newAsset.nome || ''} onChange={e => setNewAsset({...newAsset, nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="label-text">Categoria</label>
                <select className="w-full p-4" value={newAsset.categoria} onChange={e => setNewAsset({...newAsset, categoria: e.target.value as any})}>
                  <option value="Imóvel">Imóvel</option>
                  <option value="Veículo">Veículo</option>
                  <option value="Participação">Equity (Participação)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-text">Entidade Titular</label>
                <select required className="w-full p-4" value={newAsset.entidadeId} onChange={e => setNewAsset({...newAsset, entidadeId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {state.entities.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-text">Valor de Aquisição</label>
                <input type="number" step="0.01" className="w-full p-4" placeholder="0,00" value={newAsset.valorAquisicao} onChange={e => setNewAsset({...newAsset, valorAquisicao: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="label-text">Valor de Mercado Atual</label>
                <input required type="number" step="0.01" className="w-full p-4" placeholder="0,00" value={newAsset.valorMercado} onChange={e => setNewAsset({...newAsset, valorMercado: Number(e.target.value)})} />
              </div>
              <div className="col-span-2 pt-6">
                <button type="submit" className="luxury-button w-full py-5">EFETIVAR LANÇAMENTO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'dividas' && (
        <div className="space-y-8">
           <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#F5F5F5] uppercase tracking-widest font-serif-luxury">Passivos & Alavancagem</h3>
            <button className="luxury-button px-8 py-3 text-[10px] flex items-center gap-2"><Plus size={14} /> NOVA DÍVIDA</button>
          </div>
          <div className="luxury-card overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-[#111111] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-[#262626]">
                   <th className="px-10 py-6">Passivo</th>
                   <th className="px-10 py-6">Tipo</th>
                   <th className="px-10 py-6">Encargos</th>
                   <th className="px-10 py-6 text-right">Saldo Devedor</th>
                 </tr>
               </thead>
               <tbody className="text-sm divide-y divide-[#262626]">
                 {state.liabilities.filter(l => globalEntityFilter === 'all' || l.entidadeId === globalEntityFilter).map(l => (
                   <tr key={l.id} className="hover:bg-white/[0.02]">
                     <td className="px-10 py-5 font-bold text-[#F5F5F5] uppercase">{l.nome}</td>
                     <td className="px-10 py-5 text-[10px] font-black uppercase text-slate-400">{l.tipo}</td>
                     <td className="px-10 py-5 text-xs text-blue-400 font-bold">{l.taxa || '--'}</td>
                     <td className="px-10 py-5 text-right font-black text-red-500 font-serif-luxury">{formatCurrency(l.saldoDevedor)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'seguros' && (
        <div className="space-y-8">
           <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#F5F5F5] uppercase tracking-widest font-serif-luxury">Proteção Patrimonial Ativa</h3>
            <button className="luxury-button px-8 py-3 text-[10px] flex items-center gap-2"><Plus size={14} /> NOVA APÓLICE</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.insurancePolicies.map(p => (
              <div key={p.id} className="luxury-card p-10 flex flex-col justify-between group hover:border-[#D4AF37] transition-all">
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20"><Shield size={24} /></div>
                    <p className="text-[10px] font-black uppercase text-slate-500">{p.tipo}</p>
                  </div>
                  <h4 className="text-lg font-bold text-[#F5F5F5] uppercase mb-4 font-serif-luxury">{p.seguradora}</h4>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">Valor Segurado: {formatCurrency(p.valorSegurado)}</p>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Expiração: {new Date(p.vigenciaFim).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick} 
    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}
  >
    {label}
  </button>
);

const KPIBox = ({ title, value, desc, icon, highlight }: any) => (
  <div className={`p-10 luxury-card transition-all duration-700 hover:scale-[1.03] ${highlight === 'positive' ? 'border-emerald-900/40' : highlight === 'negative' ? 'border-red-900/40' : ''}`}>
    <div className={`p-3 rounded-lg bg-[#0F0F0F] w-fit mb-8 border border-[#262626] ${highlight === 'positive' ? 'text-emerald-500' : highlight === 'negative' ? 'text-red-500' : 'text-[#D4AF37]'}`}>
      {icon}
    </div>
    <p className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest mb-3">{title}</p>
    <h4 className={`text-2xl font-black text-[#FFFFFF] font-serif-luxury ${highlight === 'negative' ? 'text-red-500' : ''}`}>{value}</h4>
    <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-600 mt-5">{desc}</p>
  </div>
);

export default PatrimonioView;
