
import React, { useMemo } from 'react';
import { Transaction, Entity, Category } from '../types';
import { Trash2, AlertCircle, Landmark } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  entities: Entity[];
  categories: Category[];
  initialBalance: number;
  isConfidential: boolean;
  onDeleteTransaction?: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, entities, categories, initialBalance, isConfidential, onDeleteTransaction 
}) => {
  
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    return isConfidential ? '••••' : formatted;
  };

  const dataWithRunningBalance = useMemo(() => {
    const sortedChronological = [...transactions].sort((a, b) => 
      new Date(a.dataCaixa || a.data).getTime() - new Date(b.dataCaixa || b.data).getTime()
    );

    let currentBalance = initialBalance;
    const mapped = sortedChronological.map(tx => {
      const valor = tx.valor;
      if (tx.tipo === 'entrada') {
        currentBalance += valor;
      } else {
        currentBalance -= valor;
      }
      return { ...tx, runningBalance: currentBalance };
    });

    return mapped.reverse();
  }, [transactions, initialBalance]);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.nome || 'Sem Categoria';

  return (
    <div className="luxury-card overflow-hidden shadow-2xl border-[#262626] font-sans-inter">
      {/* Starting Balance Indicator */}
      <div className="bg-[#111111] px-10 py-5 flex items-center justify-between border-b border-[#D4AF37]/20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg">
            <Landmark size={16} />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
            Ponto de Partida Financeira (Saldo Inicial)
          </p>
        </div>
        <p className={`text-lg font-bold ${isConfidential ? 'sigilo-blur' : 'text-[#D4AF37]'} font-serif-luxury`}>
          R$ {formatCurrency(initialBalance)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0A0A0A] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-[#262626]">
              <th className="px-8 py-6">Data</th>
              <th className="px-8 py-6 text-right text-emerald-500">Entrada (+)</th>
              <th className="px-8 py-6 text-right text-red-500">Saída (-)</th>
              <th className="px-8 py-6 text-right text-[#D4AF37] bg-[#D4AF37]/5">Saldo Acumulado</th>
              <th className="px-8 py-6">Categoria</th>
              <th className="px-8 py-6">Histórico / Detalhes</th>
              <th className="px-6 py-6 text-center w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626] text-[12px]">
            {dataWithRunningBalance.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/[0.02] transition-all group">
                <td className="px-8 py-5 font-bold text-slate-400 whitespace-nowrap uppercase text-[10px] tracking-widest">
                  {new Date(tx.dataCaixa || tx.data).toLocaleDateString('pt-BR')}
                </td>
                
                <td className={`px-8 py-5 text-right font-black text-sm ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-slate-800'}`}>
                  {tx.tipo === 'entrada' ? formatCurrency(tx.valor) : '--'}
                </td>

                <td className={`px-8 py-5 text-right font-black text-sm ${tx.tipo === 'saida' ? 'text-red-500' : 'text-slate-800'}`}>
                  {tx.tipo === 'saida' ? formatCurrency(tx.valor) : '--'}
                </td>

                <td className={`px-8 py-5 text-right font-bold text-sm text-[#F5F5F5] bg-[#D4AF37]/[0.02] border-x border-white/[0.03] ${isConfidential ? 'sigilo-blur' : ''} font-serif-luxury`}>
                  {formatCurrency(tx.runningBalance)}
                </td>

                <td className="px-8 py-5">
                  <span className="font-black text-[#D4AF37] uppercase tracking-widest text-[10px]">
                    {getCategoryName(tx.referencia)}
                  </span>
                </td>

                <td className="px-8 py-5 text-slate-400 font-sans-inter uppercase text-[10px] truncate max-w-[200px] font-semibold">
                  {tx.detalhes || '--'}
                </td>

                <td className="px-6 py-5 text-center">
                  <button 
                    onClick={() => onDeleteTransaction?.(tx.id)}
                    className="p-2 text-red-900/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {dataWithRunningBalance.length === 0 && (
              <tr>
                <td colSpan={7} className="px-10 py-20 text-center text-slate-600 font-sans-inter">
                  <div className="flex flex-col items-center gap-4">
                    <AlertCircle size={32} className="opacity-20" />
                    <p className="uppercase tracking-[0.2em] text-[10px] font-black">Nenhuma movimentação para o ponto de partida definido.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-[#111111] px-10 py-4 flex justify-between items-center border-t border-[#262626]">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
          Auditoria Ledger v1.0
        </p>
        <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest">
          {transactions.length} LANÇAMENTOS CONCILIADOS
        </p>
      </div>
    </div>
  );
};

export default TransactionTable;
