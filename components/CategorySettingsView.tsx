
import React, { useState } from 'react';
import { Entity, Category, DRE_GROUPS } from '../types';
import { Plus, Trash2, Building, User, Tag, Layers, CheckCircle2, XCircle, Search } from 'lucide-react';

interface CategorySettingsViewProps {
  entities: Entity[];
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const CategorySettingsView: React.FC<CategorySettingsViewProps> = ({ 
  entities, setEntities, categories, setCategories 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newEntity, setNewEntity] = useState({ nome: '', tipo: 'PJ' as 'PF' | 'PJ' });
  const [newCat, setNewCat] = useState({ 
    nome: '', 
    tipo: 'despesa' as 'receita' | 'despesa', 
    grupo: DRE_GROUPS[1], // Inicia em Custo de Sobrevivência
    isOperating: true 
  });

  const addEntity = () => {
    if (!newEntity.nome) return;
    setEntities([...entities, { id: Math.random().toString(36).substr(2, 9), ...newEntity }]);
    setNewEntity({ nome: '', tipo: 'PJ' });
  };

  const addCategory = () => {
    if (!newCat.nome) return;
    setCategories([...categories, { id: 'cat-' + Math.random().toString(36).substr(2, 9), ...newCat }]);
    setNewCat({ nome: '', tipo: 'despesa', grupo: DRE_GROUPS[1], isOperating: true });
  };

  const removeEntity = (id: string) => setEntities(entities.filter(e => e.id !== id));
  const removeCategory = (id: string) => setCategories(categories.filter(c => c.id !== id));

  const filteredCategories = categories.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.grupo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20">
      {/* Entities Section */}
      <section className="luxury-card p-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20"><Building size={24} /></div>
          <div>
            <h3 className="text-xl font-bold uppercase italic tracking-tight text-[#F5F5F5]" style={{ fontFamily: 'Book Antiqua' }}>Gestão de Titulares (PF/PJ)</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Configuração de Holdings, Empresas e Membros da Família</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 p-8 bg-[#111111] rounded-[2rem] border border-[#262626]">
          <input 
            type="text" 
            placeholder="NOME DA ENTIDADE" 
            className="w-full p-4"
            value={newEntity.nome}
            onChange={e => setNewEntity({...newEntity, nome: e.target.value})}
          />
          <select 
            className="w-full p-4"
            value={newEntity.tipo}
            onChange={e => setNewEntity({...newEntity, tipo: e.target.value as any})}
          >
            <option value="PJ">HOLDING / EMPRESA (PJ)</option>
            <option value="PF">INDIVÍDUO (PF)</option>
          </select>
          <button 
            onClick={addEntity}
            className="luxury-button w-full py-4 shadow-xl"
          >
            ADICIONAR TITULAR
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map(e => (
            <div key={e.id} className="flex items-center justify-between p-5 bg-[#1A1A1A] border border-[#262626] rounded-2xl hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black/40 rounded-lg">
                   {e.tipo === 'PF' ? <User size={18} className="text-[#D4AF37]" /> : <Building size={18} className="text-blue-400" />}
                </div>
                <span className="text-sm font-bold text-[#F5F5F5] italic uppercase">{e.nome}</span>
              </div>
              <button onClick={() => removeEntity(e.id)} className="text-red-900/40 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="luxury-card p-10">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37] border border-[#D4AF37]/20"><Tag size={24} /></div>
            <div>
              <h3 className="text-xl font-bold uppercase italic tracking-tight text-[#F5F5F5]" style={{ fontFamily: 'Book Antiqua' }}>Dicionário de Contas P&L</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Classificação de Lançamentos para a DRE Gerencial</p>
            </div>
          </div>
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
              type="text" 
              placeholder="PESQUISAR CONTA..." 
              className="pl-12 pr-6 py-3 text-[10px] w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10 p-8 bg-[#111111] rounded-[2rem] border border-[#262626] items-center">
          <div className="col-span-2 space-y-2">
            <label className="label-text">Nome da Categoria</label>
            <input 
              type="text" 
              placeholder="Ex: Aluguel Sede" 
              className="w-full p-4"
              value={newCat.nome}
              onChange={e => setNewCat({...newCat, nome: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="label-text">Fluxo DRE</label>
            <select 
              className="w-full p-4"
              value={newCat.tipo}
              onChange={e => setNewCat({...newCat, tipo: e.target.value as any})}
            >
              <option value="receita">RECEITA (+)</option>
              <option value="despesa">DESPESA (-)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="label-text">Grupo de Resultado</label>
            <select 
              className="w-full p-4"
              value={newCat.grupo}
              onChange={e => setNewCat({...newCat, grupo: e.target.value as any})}
            >
              {DRE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="pt-6">
            <button 
              onClick={addCategory}
              className="luxury-button w-full py-4 h-[58px]"
            >
              VINCULAR CONTA
            </button>
          </div>
        </div>

        <div className="space-y-10">
          {DRE_GROUPS.map(group => {
            const groupCats = filteredCategories.filter(c => c.grupo === group);
            if (groupCats.length === 0 && searchTerm) return null;
            
            return (
              <div key={group} className="border-b border-[#262626] pb-10 last:border-0">
                 <h4 className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.4em] mb-6 flex items-center gap-3 italic">
                   <Layers size={14} className="opacity-50" /> {group}
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {groupCats.map(c => (
                     <div key={c.id} className="group flex items-center justify-between px-6 py-4 bg-[#0F0F0F] border border-[#262626] rounded-xl hover:border-[#D4AF37]/40 transition-all">
                       <div className="flex items-center gap-4">
                          <div className={`w-1.5 h-6 rounded-full ${c.tipo === 'receita' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <div>
                             <p className="text-xs font-bold text-[#F5F5F5] italic uppercase">{c.nome}</p>
                             <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">CONTA RAZÃO</p>
                          </div>
                       </div>
                       <button onClick={() => removeCategory(c.id)} className="text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                     </div>
                   ))}
                   {groupCats.length === 0 && (
                     <div className="col-span-full py-4 text-[10px] text-slate-600 uppercase font-black italic">Nenhuma conta vinculada a este grupo.</div>
                   )}
                 </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default CategorySettingsView;
