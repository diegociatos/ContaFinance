
import React from 'react';
import { Calendar, Bell, Eye, EyeOff, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewType, Entity } from '../types';

interface HeaderProps {
  activeView: ViewType;
  isConfidential: boolean;
  setIsConfidential: (val: boolean) => void;
  entities: Entity[];
  selectedEntity: string;
  onEntityChange: (id: string) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  activeView, 
  isConfidential, 
  setIsConfidential,
  entities,
  selectedEntity,
  onEntityChange,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}) => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Painel Estratégico';
      case 'conta-detalhe': return 'Extrato Bancário';
      case 'investimentos': return 'Carteira de Ativos';
      case 'dre': return 'DRE Consolidada';
      case 'patrimonio': return 'Balanço Patrimonial';
      default: return 'CONTAFINANCE';
    }
  };

  return (
    <header className="sticky top-0 z-40 luxury-header px-12 py-8 flex items-center justify-between">
      <div className="flex items-center gap-12">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-[0.05em] leading-none text-[#D4AF37] font-serif-luxury">
            {getTitle()}
          </h2>
          <p className="label-text mt-3 text-[#94A3B8]">Resumo Executivo &bull; Portfólio Privado</p>
        </div>

        <div className="hidden lg:flex items-center gap-4 bg-[#111111] px-4 py-2.5 rounded-lg border border-[#262626] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
          <Filter size={14} className="text-[#D4AF37]" />
          <select 
            value={selectedEntity}
            onChange={(e) => onEntityChange(e.target.value)}
            className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-[#F5F5F5] outline-none cursor-pointer pr-4 border-none"
          >
            <option value="all">CONSOLIDADO GLOBAL</option>
            {entities.map(e => (
              <option key={e.id} value={e.id} className="bg-[#111111]">{e.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-10 font-sans-inter">
        <div className="flex items-center gap-5 bg-[#111111] px-5 py-2.5 rounded-lg border border-[#262626] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
           <button onClick={() => setSelectedMonth(selectedMonth - 1)} className="hover:text-[#D4AF37] text-slate-500 transition-colors"><ChevronLeft size={18} /></button>
           <div className="flex items-center gap-4 min-w-[170px] justify-center border-x border-[#262626]">
             <span className="text-[12px] font-black uppercase tracking-[0.1em] text-[#F5F5F5]">{months[selectedMonth]} {selectedYear}</span>
           </div>
           <button onClick={() => setSelectedMonth(selectedMonth + 1)} className="hover:text-[#D4AF37] text-slate-500 transition-colors"><ChevronRight size={18} /></button>
        </div>

        <button 
          onClick={() => setIsConfidential(!isConfidential)}
          className={`px-6 py-2.5 rounded-lg transition-all duration-500 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] border ${isConfidential ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-[#111111] border-[#262626] text-slate-400 hover:border-[#D4AF37]/50'}`}
        >
          {isConfidential ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{isConfidential ? 'SIGILO' : 'ABERTO'}</span>
        </button>

        <button className="relative p-2 text-slate-400 hover:text-[#D4AF37] transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 gold-gradient rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
