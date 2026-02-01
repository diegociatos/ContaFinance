
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import BTGAccount from './components/BTGAccount';
import DREView from './components/DREView';
import InvestmentsView from './components/InvestmentsView';
import PatrimonioView from './components/PatrimonioView';
import SettingsView from './components/SettingsView';
import ImportView from './components/ImportView';
import CreditCardView from './components/CreditCardView';
import { 
  AppState, ViewType, Asset, Transaction, FixedAsset, 
  FixedAssetSnapshot, Entity, Category, Institution, 
  AssetSnapshot, AssetClass, Indexer, MappingTemplate, 
  CreditCard, CardTransaction, Liability, InsurancePolicy 
} from './types';

const STORAGE_KEY = 'contafinance_enterprise_v1';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(null);
  const [globalEntityFilter, setGlobalEntityFilter] = useState<string>('all');
  const [isConfidential, setIsConfidential] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // State Global
  const [entities, setEntities] = useState<Entity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instituicoes, setInstituicoes] = useState<Institution[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [assetSnapshots, setAssetSnapshots] = useState<AssetSnapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [fixedAssetSnapshots, setFixedAssetSnapshots] = useState<FixedAssetSnapshot[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydration & Persistence
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setEntities(p.entities || []);
        setCategories(p.categories || []);
        setInstituicoes(p.instituicoes || []);
        setAssets(p.assets || []);
        setAssetClasses(p.assetClasses || []);
        setIndexers(p.indexers || []);
        setAssetSnapshots(p.assetSnapshots || []);
        setTransactions(p.transactions || []);
        setFixedAssets(p.fixedAssets || []);
        setFixedAssetSnapshots(p.fixedAssetSnapshots || []);
        setLiabilities(p.liabilities || []);
        setInsurancePolicies(p.insurancePolicies || []);
        setMappingTemplates(p.mappingTemplates || []);
        setCreditCards(p.creditCards || []);
        setCardTransactions(p.cardTransactions || []);
      } catch (e) { console.error("Data Restore Failed", e); }
    } else {
      // Default Initial Data
      setEntities([{ id: 'ent-1', nome: 'Holding Principal', tipo: 'PJ', cor: '#D4AF37' }]);
      setCategories([
        { id: 'cat-1', nome: 'Dividendos', tipo: 'receita', grupo: 'RECEITAS OPERACIONAIS', isOperating: true },
        { id: 'cat-3', nome: 'Mercado', tipo: 'despesa', grupo: 'CUSTO DE VIDA SOBREVIVÊNCIA', isOperating: true },
        { id: 'cat-fatura', nome: 'Pagamento Fatura Cartão', tipo: 'transferencia', grupo: 'TRANSFERÊNCIAS INTERNAS', isOperating: false },
        { id: 'cat-transf', nome: 'Transferência Interna', tipo: 'transferencia', grupo: 'TRANSFERÊNCIAS INTERNAS', isOperating: false }
      ]);
      setInstituicoes([{ id: 'bank-1', nome: 'Banco Principal', tipo: 'Banco', entidadeId: 'ent-1', saldoInicial: 0, cor: '#D4AF37' }]);
      setAssetClasses([{ id: 'cls-1', nome: 'Renda Fixa' }, { id: 'cls-2', nome: 'Ações' }]);
      setIndexers([{ id: 'idx-1', nome: 'CDI' }]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const data = { 
        entities, categories, instituicoes, assets, assetClasses, indexers, 
        assetSnapshots, transactions, fixedAssets, fixedAssetSnapshots, 
        liabilities, insurancePolicies, mappingTemplates, creditCards, cardTransactions 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [
    entities, categories, instituicoes, assets, assetClasses, indexers,
    assetSnapshots, transactions, fixedAssets, fixedAssetSnapshots, 
    liabilities, insurancePolicies, mappingTemplates, creditCards, cardTransactions, isLoaded
  ]);

  const totals = useMemo(() => {
    const filter = (item: { entidadeId: string }) => globalEntityFilter === 'all' || item.entidadeId === globalEntityFilter;

    const saldoBancos = instituicoes.filter(i => i.tipo === 'Banco' && filter(i)).reduce((acc, inst) => {
      const txs = transactions.filter(t => t.instituicaoId === inst.id);
      return acc + txs.reduce((a, t) => t.tipo === 'entrada' ? a + t.valor : a - t.valor, inst.saldoInicial);
    }, 0);

    const saldoInvest = assets.filter(filter).reduce((acc, asset) => {
      const snap = [...assetSnapshots]
        .filter(s => s.assetId === asset.id && (s.ano < selectedYear || (s.ano === selectedYear && s.mes <= selectedMonth)))
        .sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))[0];
      return acc + (snap?.saldoFinal || 0);
    }, 0);

    const saldoImobilizado = fixedAssets.filter(filter).reduce((acc, f) => acc + f.valorMercado, 0);
    const saldoPassivos = liabilities.filter(filter).reduce((acc, l) => acc + l.saldoDevedor, 0);
    const faturaCartao = cardTransactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.valor, 0);

    const totalAtivos = saldoBancos + saldoInvest + saldoImobilizado;
    const totalPassivos = saldoPassivos + faturaCartao;

    return {
      contas: saldoBancos,
      investimentos: saldoInvest,
      imobilizado: saldoImobilizado,
      passivos: totalPassivos,
      patrimonioLiquido: totalAtivos - totalPassivos
    };
  }, [instituicoes, transactions, assets, assetSnapshots, fixedAssets, liabilities, cardTransactions, globalEntityFilter, selectedMonth, selectedYear]);

  if (!isLoaded) return null;

  const appState: AppState = {
    entities, categories, instituicoes, transactions, fixedAssets, 
    fixedAssetSnapshots, liabilities, insurancePolicies, assets, 
    assetClasses, indexers, assetSnapshots, mappingTemplates, 
    creditCards, cardTransactions, patrimonioLiquido: totals.patrimonioLiquido
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-[#F5F5F5] font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        instituicoes={instituicoes} 
        entities={entities}
        onNavInstitution={(id) => { setActiveInstitutionId(id); setActiveView('conta-detalhe'); }}
        activeInstitutionId={activeInstitutionId}
      />
      
      <main className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <Header 
          activeView={activeView} 
          isConfidential={isConfidential} 
          setIsConfidential={setIsConfidential}
          entities={entities}
          selectedEntity={globalEntityFilter}
          onEntityChange={setGlobalEntityFilter}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />

        <div className="w-full max-w-[1400px] mx-auto p-10 flex-1">
          <div key={activeView + (activeInstitutionId || '')} className="animate-in fade-in slide-in-from-right-4 duration-500">
            {(() => {
              switch (activeView) {
                case 'dashboard': return <Dashboard state={appState} totals={totals} isConfidential={isConfidential} />;
                case 'conta-detalhe': 
                  const inst = instituicoes.find(i => i.id === activeInstitutionId);
                  return inst ? (
                    <BTGAccount 
                      institution={inst} 
                      instituicoes={instituicoes}
                      transactions={transactions.filter(t => t.instituicaoId === inst.id)} 
                      cardTransactions={cardTransactions}
                      categories={categories} 
                      entities={entities} 
                      assets={assets} 
                      creditCards={creditCards}
                      onAddTransaction={txs => setTransactions(prev => [...(Array.isArray(txs) ? txs : [txs]), ...prev])} 
                      onUpdateCardTransactions={setCardTransactions}
                      onUpdateInstitution={(updates) => setInstituicoes(prev => prev.map(i => i.id === inst.id ? {...i, ...updates} : i))}
                      initialBalance={inst.saldoInicial} 
                      isConfidential={isConfidential} 
                    />
                  ) : null;
                case 'investimentos': return <InvestmentsView assets={assets} snapshots={assetSnapshots} assetClasses={assetClasses} indexers={indexers} instituicoes={instituicoes} entities={entities} transactions={transactions} onAddAsset={a => setAssets(p => [...p, a])} onUpdateAssetClasses={setAssetClasses} onUpdateIndexers={setIndexers} onUpdateInstitutions={setInstituicoes} onSaveSnapshots={snaps => setAssetSnapshots(p => [...p.filter(s => !snaps.some(n => n.assetId === s.assetId && n.mes === s.mes && n.ano === s.ano)), ...snaps])} selectedMonth={selectedMonth} selectedYear={selectedYear} isConfidential={isConfidential} />;
                case 'dre': return <DREView state={appState} transactions={transactions.filter(t => globalEntityFilter === 'all' || t.entidadeId === globalEntityFilter)} categories={categories} snapshots={assetSnapshots} selectedMonth={selectedMonth} selectedYear={selectedYear} isConfidential={isConfidential} />;
                case 'patrimonio': return <PatrimonioView state={appState} onUpdateFixedAssets={setFixedAssets} onUpdateLiabilities={setLiabilities} onUpdateInsurance={setInsurancePolicies} onSaveValuation={snaps => setFixedAssetSnapshots(p => [...p.filter(s => !snaps.some(n => n.fixedAssetId === s.fixedAssetId && n.mes === s.mes && n.ano === s.ano)), ...snaps])} selectedMonth={selectedMonth} selectedYear={selectedYear} isConfidential={isConfidential} globalEntityFilter={globalEntityFilter} />;
                case 'cartoes-lista': return <CreditCardView state={appState} onUpdateCards={setCreditCards} onUpdateCardTransactions={setCardTransactions} onAddBankTransaction={tx => setTransactions(p => [tx, ...p])} activeSubTab="cards" isConfidential={isConfidential} />;
                case 'importar': return <ImportView state={appState} onImportTransactions={txs => setTransactions(p => [...txs, ...p])} onImportCategories={setCategories} onImportAssets={setAssets} onImportSnapshots={setAssetSnapshots} onAddInstitution={i => setInstituicoes(p => [...p, i])} onSaveTemplate={t => setMappingTemplates(p => [...p, t])} />;
                case 'configuracoes': 
                  return (
                    <SettingsView 
                      state={appState} 
                      setEntities={setEntities} 
                      setCategories={setCategories} 
                      setInstituicoes={setInstituicoes} 
                      setAssetClasses={setAssetClasses}
                      setIndexers={setIndexers}
                      onImportData={data => {
                        if(data.entities) setEntities(data.entities);
                        if(data.categories) setCategories(data.categories);
                        if(data.instituicoes) setInstituicoes(data.instituicoes);
                        if(data.assetClasses) setAssetClasses(data.assetClasses);
                        if(data.indexers) setIndexers(data.indexers);
                      }}
                    />
                  );
                default: return <Dashboard state={appState} totals={totals} isConfidential={isConfidential} />;
              }
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
