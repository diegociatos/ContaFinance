
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
  AppState, ViewType, Transaction, Entity, Category, Institution, 
  Asset, AssetSnapshot, AssetClass, Indexer, MappingTemplate, 
  CreditCard, CardTransaction, CategoryMapping, FixedAsset, FixedAssetSnapshot, Liability, InsurancePolicy
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
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [instituicoes, setInstituicoes] = useState<Institution[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [assetSnapshots, setAssetSnapshots] = useState<AssetSnapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [fixedAssetSnapshots, setFixedAssetSnapshots] = useState<FixedAssetSnapshot[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydration
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.entities) setEntities(p.entities);
        if (p.categories) setCategories(p.categories);
        if (p.categoryMappings) setCategoryMappings(p.categoryMappings);
        if (p.instituicoes) setInstituicoes(p.instituicoes);
        if (p.transactions) setTransactions(p.transactions);
        if (p.creditCards) setCreditCards(p.creditCards);
        if (p.cardTransactions) setCardTransactions(p.cardTransactions);
        if (p.assets) setAssets(p.assets);
        if (p.assetClasses) setAssetClasses(p.assetClasses);
        if (p.indexers) setIndexers(p.indexers);
        if (p.assetSnapshots) setAssetSnapshots(p.assetSnapshots);
        if (p.fixedAssets) setFixedAssets(p.fixedAssets);
        if (p.fixedAssetSnapshots) setFixedAssetSnapshots(p.fixedAssetSnapshots);
        if (p.liabilities) setLiabilities(p.liabilities);
        if (p.insurancePolicies) setInsurancePolicies(p.insurancePolicies);
        if (p.mappingTemplates) setMappingTemplates(p.mappingTemplates);
      } catch (e) { 
        console.error("Erro ao restaurar dados do Ledger:", e); 
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const data = { 
        entities, categories, categoryMappings, instituicoes, transactions, 
        creditCards, cardTransactions, assets, assetClasses, indexers, 
        assetSnapshots, fixedAssets, fixedAssetSnapshots, liabilities, 
        insurancePolicies, mappingTemplates 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [
    entities, categories, categoryMappings, instituicoes, transactions, 
    creditCards, cardTransactions, assets, assetClasses, indexers, 
    assetSnapshots, fixedAssets, fixedAssetSnapshots, liabilities, 
    insurancePolicies, mappingTemplates, isLoaded
  ]);

  const totals = useMemo(() => {
    const filter = (item: { entidadeId: string }) => globalEntityFilter === 'all' || item.entidadeId === globalEntityFilter;

    const saldoBancos = instituicoes.filter(i => (i.tipo === 'Banco' || i.tipo === 'Caixa/Carteira') && filter(i)).reduce((acc, inst) => {
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
    entities, categories, categoryMappings, instituicoes, transactions, 
    creditCards, cardTransactions, patrimonioLiquido: totals.patrimonioLiquido,
    assets, assetClasses, indexers, assetSnapshots,
    fixedAssets, fixedAssetSnapshots, liabilities, insurancePolicies, mappingTemplates
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-[#F5F5F5] font-sans">
      <Sidebar 
        activeView={activeView} setActiveView={setActiveView} 
        instituicoes={instituicoes} entities={entities}
        onNavInstitution={(id) => { setActiveInstitutionId(id); setActiveView('conta-detalhe'); }}
        activeInstitutionId={activeInstitutionId}
      />
      <main className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <Header 
          activeView={activeView} isConfidential={isConfidential} setIsConfidential={setIsConfidential}
          entities={entities} selectedEntity={globalEntityFilter} onEntityChange={setGlobalEntityFilter}
          selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} selectedYear={selectedYear} setSelectedYear={setSelectedYear}
        />
        <div className="w-full max-w-[1400px] mx-auto p-10 flex-1">
          <div key={activeView + (activeInstitutionId || '')} className="animate-in fade-in slide-in-from-right-4 duration-500">
            {(() => {
              switch (activeView) {
                case 'dashboard': 
                  return <Dashboard state={appState} totals={totals} isConfidential={isConfidential} />;
                case 'investimentos': 
                  return (
                    <InvestmentsView 
                      assets={assets} 
                      snapshots={assetSnapshots} 
                      assetClasses={assetClasses} 
                      indexers={indexers} 
                      instituicoes={instituicoes} 
                      entities={entities} 
                      transactions={transactions} 
                      onAddAsset={a => setAssets(p => [...p, a])} 
                      onUpdateAssetClasses={setAssetClasses} 
                      onUpdateIndexers={setIndexers} 
                      onUpdateInstitutions={setInstituicoes} 
                      onSaveSnapshots={snaps => setAssetSnapshots(p => [...p.filter(s => !snaps.some(n => n.assetId === s.assetId && n.mes === s.mes && n.ano === s.ano)), ...snaps])} 
                      selectedMonth={selectedMonth} 
                      selectedYear={selectedYear} 
                      isConfidential={isConfidential} 
                    />
                  );
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
                case 'cartoes-lista':
                  return (
                    <CreditCardView 
                      state={appState} 
                      onUpdateCards={setCreditCards} 
                      onUpdateCardTransactions={setCardTransactions} 
                      onUpdateCategoryMappings={setCategoryMappings}
                      isConfidential={isConfidential}
                    />
                  );
                case 'dre':
                  return <DREView state={appState} transactions={transactions.filter(t => globalEntityFilter === 'all' || t.entidadeId === globalEntityFilter)} categories={categories} snapshots={assetSnapshots} selectedMonth={selectedMonth} selectedYear={selectedYear} isConfidential={isConfidential} />;
                case 'patrimonio':
                  return <PatrimonioView state={appState} onUpdateFixedAssets={setFixedAssets} onUpdateLiabilities={setLiabilities} onUpdateInsurance={setInsurancePolicies} onSaveValuation={snaps => setFixedAssetSnapshots(p => [...p.filter(s => !snaps.some(n => n.fixedAssetId === s.fixedAssetId && n.mes === s.mes && n.ano === s.ano)), ...snaps])} selectedMonth={selectedMonth} selectedYear={selectedYear} isConfidential={isConfidential} globalEntityFilter={globalEntityFilter} />;
                case 'importar':
                  return <ImportView state={appState} onImportTransactions={txs => setTransactions(p => [...txs, ...p])} onImportCategories={setCategories} onImportAssets={setAssets} onImportSnapshots={setAssetSnapshots} onAddInstitution={i => setInstituicoes(p => [...p, i])} onSaveTemplate={t => setMappingTemplates(p => [...p, t])} />;
                case 'configuracoes':
                  return <SettingsView state={appState} setEntities={setEntities} setCategories={setCategories} setInstituicoes={setInstituicoes} setAssetClasses={setAssetClasses} setIndexers={setIndexers} onImportData={d => {}} />;
                default:
                  return <Dashboard state={appState} totals={totals} isConfidential={isConfidential} />;
              }
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
