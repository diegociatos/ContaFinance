
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Briefcase,
  Coins,
  Scale,
  UploadCloud,
  CreditCard
} from 'lucide-react';
import { ViewType, Institution, Entity } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  instituicoes: Institution[];
  entities: Entity[];
  onNavInstitution: (id: string) => void;
  activeInstitutionId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  instituicoes, 
  entities,
  onNavInstitution,
  activeInstitutionId
}) => {
  const [isAccountsOpen, setIsAccountsOpen] = useState(true);

  const navItemClass = (isSelected: boolean) => `
    flex items-center justify-between px-6 py-4 transition-all duration-400 cursor-pointer mb-1 text-[15px] tracking-[0.05em]
    ${isSelected 
      ? 'active-nav-glow' 
      : 'nav-text-idle hover:text-white hover:bg-white/[0.03]'}
  `;

  return (
    <aside className="w-[280px] bg-[#050505] h-screen fixed left-0 top-0 text-slate-100 flex flex-col z-50 border-r border-[#262626] shadow-2xl">
      <div className="p-10 flex items-center gap-4 mb-8 logo-shadow">
        <div className="gold-gradient p-2.5 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.4)]">
          <Scale className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-none font-serif-luxury">
            <span className="text-[#F5F5F5]">CONTA</span>
            <span className="text-[#D4AF37]">FINANCE</span>
          </h1>
          <p className="text-[7px] font-black text-[#94A3B8] uppercase tracking-[0.6em] mt-2">Wealth Management</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar font-sans-inter">
        <div className="mb-6">
          <div onClick={() => setActiveView('dashboard')} className={navItemClass(activeView === 'dashboard')}>
            <div className="flex items-center gap-4">
              <LayoutDashboard size={20} className={activeView === 'dashboard' ? 'text-[#F59E0B]' : 'text-[#FBBF24]'} />
              <span className="font-semibold uppercase text-[11px] tracking-widest">Painel Geral</span>
            </div>
          </div>

          <div onClick={() => setActiveView('investimentos')} className={navItemClass(activeView === 'investimentos')}>
            <div className="flex items-center gap-4">
              <Coins size={20} className={activeView === 'investimentos' ? 'text-[#F59E0B]' : 'text-[#FBBF24]'} />
              <span className="font-semibold uppercase text-[11px] tracking-widest">Investimentos</span>
            </div>
          </div>

          <div>
            <div 
              onClick={() => setIsAccountsOpen(!isAccountsOpen)} 
              className="flex items-center justify-between px-6 py-4 nav-text-idle hover:text-white cursor-pointer transition-all mb-1 text-[15px] tracking-[0.05em]"
            >
              <div className="flex items-center gap-4">
                <Building2 size={20} className="text-[#FBBF24]" />
                <span className="font-semibold uppercase text-[11px] tracking-widest">Bancos e Contas</span>
              </div>
              {isAccountsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            
            {isAccountsOpen && (
              <div className="flex flex-col mb-4 space-y-0.5">
                {instituicoes.filter(i => i.tipo !== 'Corretora').map(inst => (
                  <div 
                    key={inst.id}
                    onClick={() => onNavInstitution(inst.id)}
                    className={`
                      flex items-center px-12 py-3 text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-all font-bold
                      ${activeInstitutionId === inst.id && activeView === 'conta-detalhe' 
                        ? 'text-[#F59E0B] bg-white/[0.03]' 
                        : 'text-[#F5F5F5]/60 hover:text-white'}
                    `}
                  >
                    <span className="truncate max-w-[130px]">{inst.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div onClick={() => setActiveView('cartoes-lista')} className={navItemClass(activeView.startsWith('cartoes'))}>
            <div className="flex items-center gap-4">
              <CreditCard size={20} className={activeView.startsWith('cartoes') ? 'text-[#F59E0B]' : 'text-[#FBBF24]'} />
              <span className="font-semibold uppercase text-[11px] tracking-widest">Cartões de Crédito</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div onClick={() => setActiveView('dre')} className={navItemClass(activeView === 'dre')}>
            <div className="flex items-center gap-4">
              <FileText size={20} className={activeView === 'dre' ? 'text-[#F59E0B]' : 'text-[#FBBF24]'} />
              <span className="font-semibold uppercase text-[11px] tracking-widest">DRE Gerencial</span>
            </div>
          </div>
          <div onClick={() => setActiveView('patrimonio')} className={navItemClass(activeView === 'patrimonio')}>
            <div className="flex items-center gap-4">
              <Briefcase size={20} className={activeView === 'patrimonio' ? 'text-[#F59E0B]' : 'text-[#FBBF24]'} />
              <span className="font-semibold uppercase text-[11px] tracking-widest">Balanço Patrimonial</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div onClick={() => setActiveView('importar')} className={navItemClass(activeView === 'importar')}>
            <div className="flex items-center gap-4">
              <UploadCloud size={20} className={activeView === 'importar' ? 'text-[#F59E0B]' : 'text-[#FBBF24]'} />
              <span className="font-semibold uppercase text-[11px] tracking-widest">Importar Dados</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-10 border-t border-[#262626]">
          <div onClick={() => setActiveView('configuracoes')} className={navItemClass(activeView === 'configuracoes')}>
            <div className="flex items-center gap-4">
              <Settings size={20} className="text-[#FBBF24]" />
              <span className="font-semibold uppercase text-[11px] tracking-widest">Configurações</span>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
