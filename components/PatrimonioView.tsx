
import React, { useState, useMemo } from 'react';
import { 
  AppState, FixedAsset, Liability, InsurancePolicy, 
  FixedAssetSnapshot, ValuationMethod, Entity, FixedAssetCategory, LegalType 
} from '../types';
import { 
  TrendingUp, TrendingDown, ShieldCheck, Briefcase, 
  ArrowUpRight, Shield, FileSpreadsheet, Plus, 
  Trash2, Landmark, Heart, Building, Car, X,
  History, Target, Layers, FileCheck, Calendar,
  ArrowRight
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
  isConfidential, globalEntityFilter, selectedMonth, selectedYear
}) => {
  const [activeTab, setActiveTab] = useState<'balanco' | 'bens' | 'dividas' | 'seguros'>('balanco');
  const [showForm, setShowForm] = useState<'bem' | 'divida' | 'seguro' | null>(null);

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    return isConfidential ? 'R$ ••••••••' : formatted;
  };

  const totals = useMemo(() => {
    const filter = (item: { entidadeId: string }) => globalEntityFilter === 'all' || item.entidadeId === globalEntityFilter;
    
    // Ativos: Investimentos + Bens Imobilizados
    const financialAssets = state.assets.filter(filter).reduce((acc, asset) => {
      const snap = state.assetSnapshots
        .filter(s => s.assetId === asset.id && s.ano === selectedYear && s.mes === selectedMonth)[0]
        || state.assetSnapshots.filter(s => s.assetId === asset.id).sort((a,b) => (b.ano*12+b.mes) - (a.ano*12+a.mes))[0];
      return acc + (snap?.saldoFinal || 0);
    }, 0);

    const fixedAssetsVal = state.fixedAssets.filter(filter).reduce((acc, f) => acc + f.valorMercado, 0);
    
    // Passivos: Dívidas Estruturadas + Fatura Cartão
    const structuredDebts = state.liabilities.filter(filter).reduce((acc, l) => acc + l.saldoDevedor, 0);
    const cardDebts = state.cardTransactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.valor, 0);

    const totalAssets = financialAssets + fixedAssetsVal;
    const totalLiabilities = structuredDebts + cardDebts;

    return { 
      totalAssets, 
      totalLiabilities, 
      netWorth: totalAssets - totalLiabilities,
      financialAssets,
      fixedAssetsVal,
      structuredDebts,
      cardDebts
    };
  }, [state, globalEntityFilter, selectedMonth, selectedYear]);

  // Handlers
  const handleAddFixedAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const asset: FixedAsset = {
      id: 'fa-' + Date.now(),
      nome: String(formData.get('nome')).toUpperCase(),
      categoria: formData.get('categoria') as FixedAssetCategory,
      tipoJuridico: formData.get('tipoJuridico') as LegalType,
      matricula: String(formData.get('matricula')),
      valorAquisicao: Number(formData.get('valorAquisicao')),
      valorMercado: Number(formData.get('valorMercado')),
      entidadeId: String(formData.get('entidadeId')),
      valuationMethod: 'Valor de Mercado'
    };
    onUpdateFixedAssets([...state.fixedAssets, asset]);
    setShowForm(null);
  };

  const handleAddLiability = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const liability: Liability = {
      id: 'liab-' + Date.now(),
      nome: String(formData.get('nome')).toUpperCase(),
      tipo: formData.get('tipo') as any,
      credor: String(formData.get('credor')).toUpperCase(),
      taxa: String(formData.get('taxa')),
      prazo: String(formData.get('prazo')),
      saldoDevedor: Number(formData.get('saldoDevedor')),
      entidadeId: String(formData.get('entidadeId'))
    };
    onUpdateLiabilities([...state.liabilities, liability]);
    setShowForm(null);
  };

  const handleAddInsurance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const insurance: InsurancePolicy = {
      id: 'ins-' + Date.now(),
      seguradora: String(formData.get('seguradora')).toUpperCase(),
      tipo: String(formData.get('tipo')).toUpperCase(),
      bemProtegidoId: String(formData.get('bemProtegidoId')),
      valorSegurado: Number(formData.get('valorSegurado')),
      vigenciaFim: String(formData.get('vigenciaFim')),
      beneficiario: String(formData.get('beneficiario')).toUpperCase(),
      entidadeId: String(formData.get('entidadeId'))
    };
    onUpdateInsurance([...state.insurancePolicies, insurance]);
    setShowForm(null);
  };

  const removeFixedAsset = (id: string) => {
    if(confirm("Deseja remover este ativo do seu balanço patrimonial?")) {
      onUpdateFixedAssets(state.fixedAssets.filter(a => a.id !== id));
    }
  };

  const removeLiability = (id: string) => {
    if(confirm("Deseja remover esta dívida?")) {
      onUpdateLiabilities(state.liabilities.filter(l => l.id !== id));
    }
  };

  const removeInsurance = (id: string) => {
    if(confirm("Deseja remover esta apólice?")) {
      onUpdateInsurance(state.insurancePolicies.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      
      {/* Navegação de Sub-Módulos */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#111111] p-2 rounded-2xl border border-[#262626]">
        <div className="flex gap-1 overflow-x-auto custom-scrollbar w-full lg:w-auto">
          <TabBtn active={activeTab === 'balanco'} onClick={() => setActiveTab('balanco')} label="Balanço Consolidado" icon={<ShieldCheck size={14} />} />
          <TabBtn active={activeTab === 'bens'} onClick={() => setActiveTab('bens')} label="Bens & Equity" icon={<Building size={14} />} />
          <TabBtn active={activeTab === 'dividas'} onClick={() => setActiveTab('dividas')} label="Dívidas & Alavancagem" icon={<TrendingDown size={14} />} />
          <TabBtn active={activeTab === 'seguros'} onClick={() => setActiveTab('seguros')} label="Proteção de Ativos" icon={<Shield size={14} />} />
        </div>
        <div className="hidden lg:flex items-center gap-4 px-6 text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.3em]">
          <FileCheck size={14} /> Auditoria Patrimonial Ativa
        </div>
      </div>

      {activeTab === 'balanco' && (
        <div className="space-y-12 animate-in fade-in">
          {/* Dashboard de Wealth */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <KPIBox title="Ativos Totais" value={formatCurrency(totals.totalAssets)} desc="Investimentos + Imobilizado" icon={<TrendingUp size={20} />} highlight="gold" />
            <KPIBox title="Passivos Totais" value={formatCurrency(totals.totalLiabilities)} desc="Dívidas + Cartões" icon={<TrendingDown size={20} />} highlight="red" />
            <KPIBox title="Patrimônio Líquido (PL)" value={formatCurrency(totals.netWorth)} desc="Wealth Real Consolidado" icon={<Target size={20} />} highlight="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Gráfico de Composição */}
            <div className="luxury-card p-10">
               <h3 className="text-base font-bold text-white uppercase tracking-[0.2em] mb-10 font-serif-luxury border-b border-[#262626] pb-6">Distribuição de Wealth</h3>
               <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'Liquidez/Invest', value: totals.financialAssets },
                          { name: 'Imobilizado/Equity', value: totals.fixedAssetsVal }
                        ]} 
                        cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none"
                      >
                        <Cell fill="#D4AF37" />
                        <Cell fill="#C0C0C0" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #D4AF37', borderRadius: '12px' }}
                        itemStyle={{ color: '#F5F5F5', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex justify-center gap-8 text-[9px] font-black uppercase tracking-widest mt-6">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#D4AF37] rounded-sm"></div> Financeiro</div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#C0C0C0] rounded-sm"></div> Imobilizado</div>
               </div>
            </div>

            {/* Quadro de Auditoria */}
            <div className="luxury-card p-10 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-[#D4AF37]/20 flex flex-col justify-between">
               <div>
                  <h3 className="text-base font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-10 font-serif-luxury">Resumo Executivo do Balanço</h3>
                  <div className="space-y-8">
                    <BalanceLine label="Ativos Financeiros" value={totals.financialAssets} />
                    <BalanceLine label="Bens Imobilizados" value={totals.fixedAssetsVal} />
                    <div className="h-px bg-[#262626]"></div>
                    <BalanceLine label="Dívidas Estruturadas" value={-totals.structuredDebts} color="text-red-400" />
                    <BalanceLine label="Exposição de Cartões" value={-totals.cardDebts} color="text-red-400" />
                  </div>
               </div>
               <div className="mt-12 pt-8 border-t border-[#262626] flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Net Worth Atual</p>
                    <p className="text-3xl font-bold font-serif-luxury text-white">{formatCurrency(totals.netWorth)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl text-[10px] font-black">
                     <TrendingUp size={14} /> CRESCIMENTO AUDITADO
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bens' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6">
          <div className="flex justify-between items-center bg-[#111111] p-6 rounded-2xl border border-[#262626]">
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-widest font-serif-luxury">Bens Imobilizados & Equity</h3>
              <p className="label-text mt-2">Gestão de Propriedades e Participações Societárias</p>
            </div>
            <button onClick={() => setShowForm('bem')} className="luxury-button px-8 py-3 flex items-center gap-3">
              <Plus size={16} /> NOVO BEM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.fixedAssets.filter(f => globalEntityFilter === 'all' || f.entidadeId === globalEntityFilter).map(asset => (
              <div key={asset.id} className="luxury-card p-8 group border-l-4 border-[#D4AF37] hover:bg-white/[0.02] transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-3 bg-black rounded-xl border border-[#262626] text-[#D4AF37]">
                    {asset.categoria === 'Imóvel' ? <Building size={20} /> : asset.categoria === 'Participação / Equity' ? <Briefcase size={20} /> : <Layers size={20} />}
                  </div>
                  <button onClick={() => removeFixedAsset(asset.id)} className="p-2 text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
                <p className="text-[8px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-1">{asset.categoria} • {asset.tipoJuridico}</p>
                <h4 className="text-lg font-bold text-white uppercase font-serif-luxury mb-8">{asset.nome}</h4>
                <div className="grid grid-cols-2 gap-4 border-t border-[#262626] pt-6">
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Custo Aquisição</p>
                    <p className="text-xs font-bold text-slate-300">{formatCurrency(asset.valorAquisicao)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-[#D4AF37] uppercase mb-1">Valor Mercado</p>
                    <p className="text-sm font-black text-white">{formatCurrency(asset.valorMercado)}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <span>{state.entities.find(e => e.id === asset.entidadeId)?.nome}</span>
                  {asset.matricula && <span>DOC: {asset.matricula}</span>}
                </div>
              </div>
            ))}
            <button onClick={() => setShowForm('bem')} className="luxury-card p-10 border-dashed border-2 border-slate-800 flex flex-col items-center justify-center gap-4 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
               <Plus size={32} />
               <span className="text-[10px] font-black uppercase tracking-widest">Registrar Ativo Imobilizado</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'dividas' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6">
          <div className="flex justify-between items-center bg-[#111111] p-6 rounded-2xl border border-[#262626]">
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-widest font-serif-luxury">Dívidas & Alavancagem</h3>
              <p className="label-text mt-2">Passivos Estruturados e Compromissos Financeiros</p>
            </div>
            <button onClick={() => setShowForm('divida')} className="luxury-button px-8 py-3 flex items-center gap-3">
              <Plus size={16} /> NOVA DÍVIDA
            </button>
          </div>

          <div className="luxury-card overflow-hidden">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-[#050505] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-[#262626]">
                   <th className="px-10 py-6">Passivo / Credor</th>
                   <th className="px-10 py-6">Tipo</th>
                   <th className="px-10 py-6">Condições (Taxa/Prazo)</th>
                   <th className="px-10 py-6 text-right">Saldo Devedor</th>
                   <th className="px-10 py-6 text-center">Ação</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#262626]">
                 {state.liabilities.filter(l => globalEntityFilter === 'all' || l.entidadeId === globalEntityFilter).map(l => (
                   <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                     <td className="px-10 py-6">
                        <p className="text-[11px] font-bold text-white uppercase">{l.nome}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{l.credor}</p>
                     </td>
                     <td className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">{l.tipo}</td>
                     <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg">{l.taxa || 'S/ TAXA'}</span>
                           <span className="text-[10px] font-bold text-slate-400">{l.prazo || 'VITALÍCIO'}</span>
                        </div>
                     </td>
                     <td className="px-10 py-6 text-right font-black text-red-500 font-serif-luxury">{formatCurrency(l.saldoDevedor)}</td>
                     <td className="px-10 py-6 text-center">
                        <button onClick={() => removeLiability(l.id)} className="p-2 text-slate-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                     </td>
                   </tr>
                 ))}
                 {state.liabilities.length === 0 && (
                   <tr>
                     <td colSpan={5} className="px-10 py-20 text-center text-[10px] font-black uppercase text-slate-700 tracking-widest">Nenhum passivo estruturado identificado.</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'seguros' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6">
          <div className="flex justify-between items-center bg-[#111111] p-6 rounded-2xl border border-[#262626]">
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-widest font-serif-luxury">Proteção Patrimonial (Seguros)</h3>
              <p className="label-text mt-2">Gestão de Riscos e Apólices de Cobertura</p>
            </div>
            <button onClick={() => setShowForm('seguro')} className="luxury-button px-8 py-3 flex items-center gap-3">
              <Plus size={16} /> NOVA APÓLICE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.insurancePolicies.filter(p => globalEntityFilter === 'all' || p.entidadeId === globalEntityFilter).map(p => {
              const bem = state.fixedAssets.find(b => b.id === p.bemProtegidoId) || state.assets.find(a => a.id === p.bemProtegidoId);
              const isExpired = new Date(p.vigenciaFim) < new Date();

              return (
                <div key={p.id} className="luxury-card p-10 flex flex-col justify-between group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                  <div>
                    <div className="flex justify-between items-start mb-10">
                       <div className={`p-4 rounded-2xl border ${isExpired ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                          <Shield size={24} />
                       </div>
                       <button onClick={() => removeInsurance(p.id)} className="p-2 text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{p.tipo}</p>
                    <h4 className="text-lg font-bold text-white uppercase font-serif-luxury mb-8">{p.seguradora}</h4>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-slate-600 uppercase">Capital Segurado</span>
                          <span className="text-sm font-black text-[#D4AF37]">{formatCurrency(p.valorSegurado)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-slate-600 uppercase">Objeto Protegido</span>
                          <span className="text-[9px] font-black text-white uppercase tracking-tighter">{bem?.nome || 'PATRIMÔNIO GLOBAL'}</span>
                       </div>
                    </div>
                  </div>
                  <div className="mt-10 pt-6 border-t border-[#262626] flex justify-between items-center">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isExpired ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isExpired ? 'Apólice Vencida' : 'Vigência Ativa'}
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(p.vigenciaFim).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setShowForm('seguro')} className="luxury-card p-10 border-dashed border-2 border-slate-800 flex flex-col items-center justify-center gap-4 text-slate-600 hover:border-emerald-500 hover:text-emerald-500 transition-all">
               <Shield size={32} />
               <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Nova Cobertura</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FORMULÁRIOS DINÂMICOS */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
           {showForm === 'bem' && (
             <form onSubmit={handleAddFixedAsset} className="luxury-card w-full max-w-2xl p-12 relative animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-[#D4AF37] uppercase tracking-widest font-serif-luxury mb-10 border-b border-[#262626] pb-6">Lançamento Patrimonial (Ativo)</h3>
                <div className="grid grid-cols-2 gap-8">
                   <div className="col-span-2 space-y-2">
                      <label className="label-text">Descrição do Ativo</label>
                      <input name="nome" required className="w-full p-4 font-bold text-sm" placeholder="Ex: APARTAMENTO VILA NOVA" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Categoria</label>
                      <select name="categoria" className="w-full p-4 font-bold">
                        <option value="Imóvel">Imóvel</option>
                        <option value="Participação / Equity">Participação / Equity</option>
                        <option value="Bem Diverso">Bem Diverso (Veículo/Arte/etc)</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Entidade Titular</label>
                      <select name="entidadeId" className="w-full p-4 font-bold">
                        {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Documentação Jurídica</label>
                      <select name="tipoJuridico" className="w-full p-4 font-bold">
                        <option value="Matrícula">Matrícula</option>
                        <option value="Contrato de Compra e Venda">Contrato Compra/Venda</option>
                        <option value="Contrato Social">Contrato Social</option>
                        <option value="Outro">Outro</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Nº Registro/Matrícula</label>
                      <input name="matricula" className="w-full p-4 font-bold" placeholder="Opcional" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Custo Aquisição (R$)</label>
                      <input name="valorAquisicao" type="number" step="0.01" className="w-full p-4 font-bold" placeholder="0,00" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Valor de Mercado Atual (R$)</label>
                      <input name="valorMercado" required type="number" step="0.01" className="w-full p-4 font-bold" placeholder="0,00" />
                   </div>
                </div>
                <div className="mt-12 flex gap-4">
                  <button type="button" onClick={() => setShowForm(null)} className="flex-1 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descartar</button>
                  <button type="submit" className="flex-[2] luxury-button py-4">EFETIVAR LANÇAMENTO</button>
                </div>
             </form>
           )}

           {showForm === 'divida' && (
             <form onSubmit={handleAddLiability} className="luxury-card w-full max-w-2xl p-12 relative animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-red-500 uppercase tracking-widest font-serif-luxury mb-10 border-b border-[#262626] pb-6">Nova Dívida Estruturada</h3>
                <div className="grid grid-cols-2 gap-8">
                   <div className="col-span-2 space-y-2">
                      <label className="label-text">Identificação do Passivo</label>
                      <input name="nome" required className="w-full p-4 font-bold text-sm" placeholder="Ex: FINANCIAMENTO SEDE" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Tipo</label>
                      <select name="tipo" className="w-full p-4 font-bold">
                        <option value="Financiamento">Financiamento</option>
                        <option value="Empréstimo">Empréstimo</option>
                        <option value="Consórcio">Consórcio</option>
                        <option value="Outro">Outro</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Credor / Instituição</label>
                      <input name="credor" required className="w-full p-4 font-bold" placeholder="Ex: BANCO ITAÚ" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Taxa de Juros (% a.a.)</label>
                      <input name="taxa" className="w-full p-4 font-bold" placeholder="Ex: 9,5% + IPCA" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Prazo Remanescente</label>
                      <input name="prazo" className="w-full p-4 font-bold" placeholder="Ex: 120 meses" />
                   </div>
                   <div className="col-span-2 space-y-2">
                      <label className="label-text">Saldo Devedor Atual (R$)</label>
                      <input name="saldoDevedor" required type="number" step="0.01" className="w-full p-4 font-bold text-red-500" placeholder="0,00" />
                   </div>
                   <div className="col-span-2 space-y-2">
                      <label className="label-text">Entidade Titular</label>
                      <select name="entidadeId" className="w-full p-4 font-bold">
                        {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                   </div>
                </div>
                <div className="mt-12 flex gap-4">
                  <button type="button" onClick={() => setShowForm(null)} className="flex-1 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descartar</button>
                  <button type="submit" className="flex-[2] luxury-button py-4 border-red-500 text-red-500 hover:bg-red-500 hover:text-white">CONSOLIDAR PASSIVO</button>
                </div>
             </form>
           )}

           {showForm === 'seguro' && (
             <form onSubmit={handleAddInsurance} className="luxury-card w-full max-w-2xl p-12 relative animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-emerald-500 uppercase tracking-widest font-serif-luxury mb-10 border-b border-[#262626] pb-6">Proteção Ativa (Seguro)</h3>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="label-text">Seguradora</label>
                      <input name="seguradora" required className="w-full p-4 font-bold" placeholder="Ex: PORTO SEGURO" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Tipo de Seguro</label>
                      <input name="tipo" required className="w-full p-4 font-bold" placeholder="Ex: VIDA / RESIDENCIAL" />
                   </div>
                   <div className="col-span-2 space-y-2">
                      <label className="label-text">Objeto Protegido (Vínculo)</label>
                      <select name="bemProtegidoId" className="w-full p-4 font-bold">
                        <option value="">PATRIMÔNIO GLOBAL</option>
                        {state.fixedAssets.map(b => <option key={b.id} value={b.id}>BEM: {b.nome}</option>)}
                        {state.assets.map(a => <option key={a.id} value={a.id}>INVEST: {a.nome}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Capital Segurado (R$)</label>
                      <input name="valorSegurado" required type="number" step="0.01" className="w-full p-4 font-bold" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Fim de Vigência</label>
                      <input name="vigenciaFim" required type="date" className="w-full p-4 font-bold" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Principal Beneficiário</label>
                      <input name="beneficiario" required className="w-full p-4 font-bold" />
                   </div>
                   <div className="space-y-2">
                      <label className="label-text">Entidade Titular</label>
                      <select name="entidadeId" className="w-full p-4 font-bold">
                        {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                   </div>
                </div>
                <div className="mt-12 flex gap-4">
                  <button type="button" onClick={() => setShowForm(null)} className="flex-1 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descartar</button>
                  <button type="submit" className="flex-[2] luxury-button py-4 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white">REGISTRAR APÓLICE</button>
                </div>
             </form>
           )}
        </div>
      )}

    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon} {label}
  </button>
);

const KPIBox = ({ title, value, desc, icon, highlight }: any) => (
  <div className={`luxury-card p-10 border-l-4 transition-all hover:scale-[1.02] ${highlight === 'gold' ? 'border-[#D4AF37]' : highlight === 'red' ? 'border-red-500' : 'border-emerald-500'} bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]`}>
    <div className="flex justify-between items-start mb-10">
      <div className={`p-4 rounded-xl bg-black border border-[#262626] ${highlight === 'red' ? 'text-red-500' : highlight === 'emerald' ? 'text-emerald-500' : 'text-[#D4AF37]'}`}>
        {icon}
      </div>
      <ArrowRight size={14} className="text-slate-800" />
    </div>
    <p className="label-text mb-3">{title}</p>
    <h3 className={`text-2xl font-bold font-serif-luxury ${highlight === 'red' ? 'text-red-500' : 'text-white'}`}>{value}</h3>
    <p className="text-[8px] font-bold text-slate-500 uppercase mt-4 tracking-widest">{desc}</p>
  </div>
);

const BalanceLine = ({ label, value, color = "text-white" }: any) => (
  <div className="flex justify-between items-center group">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{label}</span>
    <span className={`text-sm font-bold font-serif-luxury ${color}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}</span>
  </div>
);

export default PatrimonioView;
