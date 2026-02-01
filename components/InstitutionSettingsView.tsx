
import React, { useState } from 'react';
import { Entity, Institution, Transaction } from '../types';
import { Plus, Trash2, Building, User, Building2, TrendingUp, AlertTriangle, Edit2, CheckCircle } from 'lucide-react';

interface InstitutionSettingsViewProps {
  state: {
    entities: Entity[];
    instituicoes: Institution[];
    transactions: Transaction[];
  };
  setInstituicoes: React.Dispatch<React.SetStateAction<Institution[]>>;
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const InstitutionSettingsView: React.FC<InstitutionSettingsViewProps> = ({ 
  state, setInstituicoes, setEntities, setTransactions 
}) => {
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [showInstForm, setShowInstForm] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);

  const [newEntity, setNewEntity] = useState({ nome: '', tipo: 'PJ' as 'PF' | 'PJ', documento: '', cor: '#2563eb' });
  // Explicitly allow all institution types in the state to avoid assignment errors
  const [newInst, setNewInst] = useState({ 
    nome: '', 
    tipo: 'Banco' as 'Banco' | 'Corretora' | 'Caixa/Carteira', 
    entidadeId: '', 
    saldoInicial: 0, 
    cor: '#334155' 
  });

  const addEntity = () => {
    if (!newEntity.nome) return;
    setEntities(prev => [...prev, { id: 'ent-' + Math.random().toString(36).substr(2, 5), ...newEntity }]);
    setNewEntity({ nome: '', tipo: 'PJ', documento: '', cor: '#2563eb' });
    setShowEntityForm(false);
  };

  const addInstitution = () => {
    if (!newInst.nome || !newInst.entidadeId) return;
    if (editingInst) {
      setInstituicoes(prev => prev.map(i => i.id === editingInst.id ? { ...i, ...newInst } : i));
      setEditingInst(null);
    } else {
      setInstituicoes(prev => [...prev, { id: 'inst-' + Math.random().toString(36).substr(2, 5), ...newInst }]);
    }
    setNewInst({ nome: '', tipo: 'Banco', entidadeId: '', saldoInicial: 0, cor: '#334155' });
    setShowInstForm(false);
  };

  const deleteInstitution = (id: string) => {
    const hasTransactions = state.transactions.some(t => t.instituicaoId === id);
    if (hasTransactions) {
      if (window.confirm("Esta instituição possui lançamentos vinculados. Excluir a instituição removerá TODOS os seus lançamentos. Deseja prosseguir?")) {
        setTransactions(prev => prev.filter(t => t.instituicaoId !== id));
        setInstituicoes(prev => prev.filter(i => i.id !== id));
      }
    } else {
      setInstituicoes(prev => prev.filter(i => i.id !== id));
    }
  };

  // Selectively map fields to state to avoid passing 'id' into newInst state
  const startEdit = (inst: Institution) => {
    setEditingInst(inst);
    setNewInst({
      nome: inst.nome,
      tipo: inst.tipo,
      entidadeId: inst.entidadeId,
      saldoInicial: inst.saldoInicial,
      cor: inst.cor || '#334155'
    });
    setShowInstForm(true);
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20">
      {/* Header Seção Entidades */}
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 italic uppercase">Governança de Entidades</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Configuração de Pessoas Físicas e Jurídicas (Holdings)</p>
        </div>
        <button 
          onClick={() => setShowEntityForm(!showEntityForm)}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl"
        >
          <Plus size={16} /> Nova Entidade
        </button>
      </div>

      {showEntityForm && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Nome / Razão Social</label>
              <input type="text" className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" value={newEntity.nome} onChange={e => setNewEntity({...newEntity, nome: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Tipo</label>
              <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" value={newEntity.tipo} onChange={e => setNewEntity({...newEntity, tipo: e.target.value as any})}>
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">CPF / CNPJ</label>
              <input type="text" className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" value={newEntity.documento} onChange={e => setNewEntity({...newEntity, documento: e.target.value})} />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Cor</label>
                <input type="color" className="w-full h-[46px] rounded-xl border-none cursor-pointer" value={newEntity.cor} onChange={e => setNewEntity({...newEntity, cor: e.target.value})} />
              </div>
              <button onClick={addEntity} className="bg-blue-600 text-white h-[46px] px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {state.entities.map(e => (
          <div key={e.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: e.cor }}>
                {e.tipo === 'PF' ? <User size={20} /> : <Building size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 italic leading-none">{e.nome}</h4>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">{e.documento || 'Sem Documento'}</p>
              </div>
            </div>
            <button onClick={() => setEntities(prev => prev.filter(ent => ent.id !== e.id))} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="h-px bg-slate-200 w-full my-12"></div>

      {/* Seção Instituições */}
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 italic uppercase">Bancos & Corretoras</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Gestão Dinâmica de Contas e Custodiantes</p>
        </div>
        <button 
          onClick={() => { setShowInstForm(!showInstForm); setEditingInst(null); }}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl"
        >
          <Plus size={16} /> Nova Instituição
        </button>
      </div>

      {showInstForm && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-900/5 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Nome do Banco/Corretora</label>
              <input type="text" className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none" value={newInst.nome} onChange={e => setNewInst({...newInst, nome: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Titularidade (Entidade)</label>
              <select className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none" value={newInst.entidadeId} onChange={e => setNewInst({...newInst, entidadeId: e.target.value})}>
                <option value="">Selecione...</option>
                {state.entities.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Tipo de Instituição</label>
              <div className="flex gap-4">
                <button onClick={() => setNewInst({...newInst, tipo: 'Banco'})} className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${newInst.tipo === 'Banco' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Banco</button>
                <button onClick={() => setNewInst({...newInst, tipo: 'Corretora'})} className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${newInst.tipo === 'Corretora' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Corretora</button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Saldo Inicial (R$)</label>
              <input type="number" disabled={!!editingInst} className={`bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none ${editingInst ? 'opacity-50 cursor-not-allowed' : ''}`} value={newInst.saldoInicial} onChange={e => setNewInst({...newInst, saldoInicial: parseFloat(e.target.value)})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Cor de Identificação</label>
              <input type="color" className="w-full h-[54px] rounded-xl cursor-pointer" value={newInst.cor} onChange={e => setNewInst({...newInst, cor: e.target.value})} />
            </div>
            <div className="flex items-end gap-3">
              <button onClick={() => setShowInstForm(false)} className="flex-1 bg-slate-100 text-slate-400 h-[54px] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={addInstitution} className="flex-[2] bg-blue-600 text-white h-[54px] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl">{editingInst ? 'Atualizar Dados' : 'Cadastrar Instituição'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black italic">
              <th className="px-10 py-6">Instituição</th>
              <th className="px-10 py-6">Tipo</th>
              <th className="px-10 py-6">Titular</th>
              <th className="px-10 py-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.instituicoes.map(inst => (
              <tr key={inst.id} className="hover:bg-slate-50 transition-all group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: inst.cor }}></div>
                    <span className="text-sm font-bold text-slate-900 italic">{inst.nome}</span>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <div className="flex items-center gap-2">
                    {inst.tipo === 'Banco' ? <Building2 size={14} className="text-blue-500" /> : <TrendingUp size={14} className="text-emerald-500" />}
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{inst.tipo}</span>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <span 
                    className="text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest text-white italic"
                    style={{ backgroundColor: state.entities.find(e => e.id === inst.entidadeId)?.cor || '#334155' }}
                  >
                    {state.entities.find(e => e.id === inst.entidadeId)?.nome || 'N/A'}
                  </span>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(inst)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => deleteInstitution(inst.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {state.instituicoes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-10 py-20 text-center italic text-slate-400 font-sans-inter">Nenhuma instituição cadastrada para gestão Ledger.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstitutionSettingsView;
