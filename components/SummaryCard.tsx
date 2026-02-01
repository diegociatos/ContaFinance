
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
      relative overflow-hidden p-10 luxury-card group transition-all duration-700
      ${highlight ? 'border-[#D4AF37]/50 shadow-[0_0_40px_rgba(212,175,55,0.1)]' : 'border-[#262626]'}
    `}>
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div className="p-4 bg-[#050505] rounded-lg border border-[#262626] text-[#D4AF37] group-hover:scale-110 transition-transform duration-700 shadow-xl">
          {icon}
        </div>
        <div className={`
          flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-[#050505] border
          ${isPositive ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'}
        `}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? '+' : ''}{variation}%
        </div>
      </div>

      <div className="relative z-10">
        <p className="label-text mb-4">
          {title}
        </p>
        <h4 className="financial-value text-4xl mb-6 leading-none font-serif-luxury">
          {value}
        </h4>
        <div className="h-[1px] w-14 bg-[#D4AF37]/30 mb-6 group-hover:w-full transition-all duration-1000"></div>
        <p className="text-[10px] font-sans-inter uppercase tracking-[0.1em] font-black text-slate-500 group-hover:text-slate-300 transition-colors">
          {description}
        </p>
      </div>
      
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#D4AF37]/5 rounded-full blur-[90px] group-hover:bg-[#D4AF37]/10 transition-all duration-1000"></div>
    </div>
  );
};

export default SummaryCard;
