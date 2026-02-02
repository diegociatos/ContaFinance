
import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  variation: number;
  icon: ReactNode;
  description: string;
  highlight?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  variation, 
  icon, 
  description,
  highlight = false 
}) => {
  const isPositive = variation >= 0;

  return (
    <div className={`
      relative overflow-hidden p-8 luxury-card group transition-all duration-700
      ${highlight ? 'border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.15)] bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]' : 'border-[#262626]'}
    `}>
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className={`p-3.5 bg-black rounded-xl border border-[#262626] transition-transform duration-700 shadow-xl ${highlight ? 'text-[#D4AF37] border-[#D4AF37]/30' : 'text-[#D4AF37]'}`}>
          {icon}
        </div>
        <div className={`
          flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-[#050505] border
          ${isPositive ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'}
        `}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? '+' : ''}{variation}%
        </div>
      </div>

      <div className="relative z-10">
        <p className="label-text mb-3 text-slate-500 font-bold">
          {title}
        </p>
        <h4 className="financial-value text-3xl mb-5 leading-none font-serif-luxury text-white">
          {value}
        </h4>
        <div className={`h-[1px] w-12 mb-5 group-hover:w-full transition-all duration-1000 ${highlight ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/30'}`}></div>
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
          {description}
        </p>
      </div>
      
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[90px] group-hover:bg-[#D4AF37]/10 transition-all duration-1000"></div>
    </div>
  );
};

export default SummaryCard;
