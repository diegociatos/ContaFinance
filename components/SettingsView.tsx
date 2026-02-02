
import React, { useState } from 'react';
import { 
  AppState, Entity, Category, Institution, DRE_GROUPS, 
  AssetClass, Indexer 
} from '../types';
import { 
  Building2, 
  Tag, 
  Landmark, 
  Settings2, 
  Plus, 
  Trash2, 
  Layers, 
  BarChart3, 
  ShieldCheck, 
  User, 
  Briefcase,
  X,
  Target,
  ArrowRight
} from 'lucide-react';

interface SettingsViewProps {
  state: AppState;
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setInstituicoes: React.Dispatch<React.SetStateAction<Institution[]>>;
  setAssetClasses: React.Dispatch<React.SetStateAction<AssetClass[]>>;
  setIndexers: React.Dispatch<React.SetStateAction<Indexer[]>>;
  onImportData: (data: Partial<AppState>) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  state, setEntities, setCategories, setInstituicoes, 
  setAssetClasses, setIndexers 
}) => {
  const [activeTab, setActiveTab] = useState<'entities' | 'banks' | 'categories' | 'params'>('entities');

  // Form States
  const [newEntity, setNewEntity] = useState({ nome: '', tipo: 'PJ' as 'PF' | 'PJ' });
  const [newBank, setNewBank] = useState({ nome: '', tipo: 'Banco' as any, entidadeId: '', saldoInicial: 0 });
  const [newCat, setNewCat] = useState({ 
    nome: '', 
    grupo: DRE_GROUPS[0] 
  });
  const [newParam, setNewParam] = useState({ type: 'class' as 'class' | 'indexer' | 'custodian', nome: '', entidadeId: '' });

  const removeItem = (type: string, id: string) => {
    if (!window.confirm("Deseja excluir este item? Isso pode impactar dados vinculados.")) return;
    if (type === 'entity') setEntities(prev => prev.filter(e => e.id !== id));
    if (type === 'bank') setInstituicoes(prev => prev.filter(b => b.id !== id));
    if (type === 'category') setCategories(prev => prev.filter(c => c.id !== id));
    if (type === 'class') setAssetClasses(prev => prev.filter(c => c.id !== id));
    if (type === 'indexer') setIndexers(prev => prev.filter(i => i.id !== id));
  };

  const handleAddCategory = () => {
    const nomeLimpo = newCat.nome.trim();
    if (!nomeLimpo) return;

    let tipo: 'receita' | 'despesa' | 'transferencia' = 'despesa';
    if (newCat.grupo === 'RECEITAS OPERACIONAIS' || newCat.grupo === 'RECEITAS FINANCEIRAS') {
      tipo = 'receita';
    } else if (newCat.grupo === 'TRANSFERÊNCIAS INTERNAS') {
      tipo = 'transferencia';
    }

    const novaCategoria: Category = {
      id: 'cat-' + Date.now(),
      nome: nomeLimpo.toUpperCase(),
      tipo,
      grupo: newCat.grupo,
      isOperating: true
    };

    setCategories(prev => [...prev, novaCategoria]);
    setNewCat({ ...newCat, nome: '' });
  };

  const categoriesColumns = [
    { 
      title: 'Receitas Operacionais', 
      groups: ['RECEITAS OPERACIONAIS'] 
    },
    { 
      title: 'Custos de Vida', 
      groups: ['CUSTO DE VIDA – SOBREVIVÊNCIA', 'CUSTO DE VIDA – CONFORTO'] 
    },
    { 
      title: 'Despesas Profissionais', 
      groups: ['DESPESAS PROFISSIONAIS', 'BENS MATERIAIS', 'LASER', 'CARROS'] 
    },
    { 
      title: 'Não Operacionais / Wealth', 
      groups: ['RECEITAS NÃO OPERACIONAIS', 'RECEITAS FINANCEIRAS', 'INVESTIMENTOS', 'TRANSFERÊNCIAS INTERNAS'] 
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      <div className="flex flex-wrap gap-2 bg-[#111111] p-1.5 rounded-2xl border border-[#262626] w-fit shadow-2xl">
        <TabBtn active={activeTab === 'entities'} onClick={() => setActiveTab('entities')} label="Entidades & Holdings" icon={<Building2 size={16} />} />
        <TabBtn active={activeTab === 'banks'} onClick={() => setActiveTab('banks')} label="Bancos & Contas" icon={<Landmark size={16} />} />
        <TabBtn active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} label="Dicionário P&L" icon={<Tag size={16} />} />
        <TabBtn active={activeTab === 'params'} onClick={() => setActiveTab('params')} label="Parâmetros de Investimento" icon={<Settings2 size={16} />} />
      </div>

      <div className="luxury-card p-12 min-h-[600px] border-[#D4AF37]/20 bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A]">
        
        {activeTab === 'categories' && (
          <div className="space-y-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-[#262626] pb-10">
              <div>
                <h3 className="text-2xl font-bold text-white uppercase tracking-wider font-serif-luxury">Estrutura de Contas Gerenciais</h3>
                <p className="label-text mt-3">Mapeamento dinâmico do plano de contas da DRE</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-black/40 p-2 rounded-xl border border-[#262626]">
                <input 
                  type="text" 
                  className="bg-transparent border-none text-[11px] font-bold text-white placeholder-slate-600 outline-none w-48 px-3" 
                  placeholder="NOME DA CATEGORIA..." 
                  value={newCat.nome}
                  onChange={e => setNewCat({...newCat, nome: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                />
                <div className="w-px h-6 bg-[#262626]"></div>
                <select 
                  className="bg-transparent border-none text-[11px] font-black text-[#D4AF37] uppercase tracking-widest outline-none cursor-pointer pr-6"
                  value={newCat.grupo}
                  onChange={e => setNewCat({...newCat, grupo: e.target.value as any})}
                >
                  {DRE_GROUPS.map(g => (
                    <option key={g} value={g} className="bg-[#111111]">{g}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={handleAddCategory}
                  className="luxury-button flex items-center justify-center w-10 h-10 rounded-lg p-0"
                  title="Adicionar Categoria"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {categoriesColumns.map((col, idx) => (
                <div key={idx} className="space-y-8">
                  <div className="pb-4 border-b border-[#D4AF37]/20">
                    <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-[0.2em] font-serif-luxury leading-tight">{col.title}</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {state.categories
                      .filter(c => col.groups.includes(c.grupo))
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map(cat => (
                        <div 
                          key={cat.id} 
                          className="group flex items-center justify-between px-5 py-4 bg-[#1A1A1A] border border-[#262626] rounded-xl hover:border-[#D4AF37]/30 transition-all duration-300 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-3 rounded-full ${cat.tipo === 'receita' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : cat.tipo === 'transferencia' ? 'bg-blue-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{cat.nome}</span>
                          </div>
                          <button 
                            onClick={() => removeItem('category', cat.id)}
                            className="text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    {state.categories.filter(c => col.groups.includes(c.grupo)).length === 0 && (
                      <div className="py-8 px-5 border border-dashed border-[#262626] rounded-xl text-center bg-black/10">
                        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Aguardando dados</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'entities' && (
          <div className="space-y-12">
            <div className="border-b border-[#262626] pb-8">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider font-serif-luxury">Gestão de Titularidade</h3>
              <p className="label-text mt-3">Controle de Entidades PF e PJ sob gestão</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/40 p-8 rounded-[2rem] border border-[#262626]">
              <div className="space-y-2">
                <label className="label-text">Nome da Entidade</label>
                <input type="text" className="w-full p-4 text-xs font-bold" placeholder="Ex: Holding Garcia ou Diego PF" value={newEntity.nome} onChange={e => setNewEntity({...newEntity, nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="label-text">Tipo Jurídico</label>
                <select className="w-full p-4 text-xs font-bold" value={newEntity.tipo} onChange={e => setNewEntity({...newEntity, tipo: e.target.value as any})}>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                  <option value="PF">Pessoa Física (PF)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    if(!newEntity.nome) return;
                    setEntities(prev => [...prev, { id: 'ent-'+Date.now(), ...newEntity }]);
                    setNewEntity({ nome: '', tipo: 'PJ' });
                  }}
                  className="luxury-button w-full py-4 text-[10px]"
                >
                  ADICIONAR TITULAR
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.entities.map(e => (
                <div key={e.id} className="flex items-center justify-between p-6 bg-[#111111] border border-[#262626] rounded-2xl group hover:border-[#D4AF37]/40 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#262626]">
                      {e.tipo === 'PF' ? <User size={20} /> : <Briefcase size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">{e.nome}</h4>
                      <p className="text-[9px] font-black text-slate-500 uppercase mt-1 tracking-widest">{e.tipo}</p>
                    </div>
                  </div>
                  <button onClick={() => removeItem('entity', e.id)} className="text-red-900/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'banks' && (
          <div className="space-y-12">
            <div className="border-b border-[#262626] pb-8">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider font-serif-luxury">Bancos, Contas e Caixa</h3>
              <p className="label-text mt-3">Gestão de disponibilidades e fluxos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-black/40 p-8 rounded-[2rem] border border-[#262626]">
              <div className="space-y-2">
                <label className="label-text">Nome da Instituição</label>
                <input type="text" className="w-full p-4 text-xs font-bold" placeholder="Ex: BTG Pactual" value={newBank.nome} onChange={e => setNewBank({...newBank, nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="label-text">Entidade Titular</label>
                <select className="w-full p-4 text-xs font-bold" value={newBank.entidadeId} onChange={e => setNewBank({...newBank, entidadeId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-text">Saldo Inicial</label>
                <input type="number" className="w-full p-4 text-xs font-bold" placeholder="0,00" value={newBank.saldoInicial} onChange={e => setNewBank({...newBank, saldoInicial: Number(e.target.value)})} />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    if(!newBank.nome || !newBank.entidadeId) return;
                    setInstituicoes(prev => [...prev, { id: 'bank-'+Date.now(), ...newBank, tipo: 'Banco', cor: '#D4AF37' }]);
                    setNewBank({ nome: '', tipo: 'Banco' as any, entidadeId: '', saldoInicial: 0 });
                  }}
                  className="luxury-button w-full py-4 text-[10px]"
                >
                  CADASTRAR CONTA
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.instituicoes.filter(i => i.tipo !== 'Corretora').map(inst => (
                <div key={inst.id} className="luxury-card p-8 group hover:border-[#D4AF37] transition-all bg-[#0A0A0A]">
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-4 bg-black rounded-xl text-[#D4AF37] border border-[#262626]"><Landmark size={24} /></div>
                    <button onClick={() => removeItem('bank', inst.id)} className="text-red-900/40 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                  <h4 className="text-lg font-bold text-white uppercase font-serif-luxury">{inst.nome}</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase mt-2 tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} className="text-[#D4AF37]" /> {state.entities.find(e => e.id === inst.entidadeId)?.nome || 'Indefinido'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'params' && (
          <div className="space-y-12">
            <div className="border-b border-[#262626] pb-8">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider font-serif-luxury">Parâmetros de Portfólio</h3>
              <p className="label-text mt-3">Configurações globais de ativos e mercado</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-black/40 p-8 rounded-[2rem] border border-[#262626]">
              <div className="space-y-2">
                <label className="label-text">Tipo de Parâmetro</label>
                <select className="w-full p-4 text-xs font-bold" value={newParam.type} onChange={e => setNewParam({...newParam, type: e.target.value as any})}>
                  <option value="class">Classe de Ativo</option>
                  <option value="indexer">Indexador</option>
                  <option value="custodian">Custodiante (Corretora)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-text">Nome do Parâmetro</label>
                <input type="text" className="w-full p-4 text-xs font-bold" placeholder="Ex: Renda Fixa ou IPCA" value={newParam.nome} onChange={e => setNewParam({...newParam, nome: e.target.value})} />
              </div>
              {newParam.type === 'custodian' && (
                <div className="space-y-2">
                  <label className="label-text">Entidade Titular</label>
                  <select className="w-full p-4 text-xs font-bold" value={newParam.entidadeId} onChange={e => setNewParam({...newParam, entidadeId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    if(!newParam.nome) return;
                    if(newParam.type === 'class') setAssetClasses(prev => [...prev, { id: 'cls-'+Date.now(), nome: newParam.nome }]);
                    if(newParam.type === 'indexer') setIndexers(prev => [...prev, { id: 'idx-'+Date.now(), nome: newParam.nome }]);
                    if(newParam.type === 'custodian') {
                      if(!newParam.entidadeId) return alert("Selecione um titular");
                      setInstituicoes(prev => [...prev, { id: 'inst-'+Date.now(), nome: newParam.nome, tipo: 'Corretora', entidadeId: newParam.entidadeId, saldoInicial: 0, cor: '#D4AF37' }]);
                    }
                    setNewParam({ type: 'class', nome: '', entidadeId: '' });
                  }}
                  className="luxury-button w-full py-4 text-[10px]"
                >
                  ADICIONAR
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <ParamColumn title="Classes de Ativos" icon={<Layers size={18} />} items={state.assetClasses} onRemove={id => removeItem('class', id)} />
              <ParamColumn title="Indexadores" icon={<BarChart3 size={18} />} items={state.indexers} onRemove={id => removeItem('indexer', id)} />
              <ParamColumn title="Custodiantes" icon={<Landmark size={18} />} items={state.instituicoes.filter(i => i.tipo === 'Corretora')} onRemove={id => removeItem('bank', id)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[#D4AF37] text-black shadow-2xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
  >
    {icon} {label}
  </button>
);

const ParamColumn = ({ title, icon, items, onRemove }: any) => (
  <div className="space-y-6">
    <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest font-serif-luxury flex items-center gap-3 border-b border-[#262626] pb-4">{icon} {title}</h4>
    <div className="space-y-3">
      {items.map((item: any) => (
        <div key={item.id} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-[#262626] group hover:border-[#D4AF37]/20 transition-all">
          <span className="text-[10px] font-black text-white uppercase">{item.nome}</span>
          <button onClick={() => onRemove(item.id)} className="text-slate-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  </div>
);

export default SettingsView;
