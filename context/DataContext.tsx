

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import * as T from '../types';
import { Page, PeriodAssetDetail, Category, Niche } from '../types';
import { isDateInPeriod } from '../lib/utils';

type EnrichedAsset = T.Asset & {
  balance: number;
  totalReceived: number;
  totalWithdrawn: number;
  owners: { id: string; name: string; received: number; withdrawn: number; }[];
  isExpandable: boolean;
};

type EnrichedDailyAdCost = T.DailyAdCost & {
    vndCost: number;
    effectiveRate: number;
};

type MasterProject = {
    name: string;
    categoryId?: string;
    nicheId?: string;
};


interface DataContextType {
  projects: T.Project[];
  addProject: (project: Omit<T.Project, 'id' | 'period'>) => void;
  updateProject: (project: T.Project) => void;
  deleteProject: (id: string) => void;

  dailyAdCosts: T.DailyAdCost[];
  addDailyAdCost: (cost: Omit<T.DailyAdCost, 'id'>) => void;
  updateDailyAdCost: (cost: T.DailyAdCost) => void;
  deleteDailyAdCost: (id: string) => void;

  adDeposits: T.AdDeposit[];
  addAdDeposit: (deposit: Omit<T.AdDeposit, 'id'>) => void;
  updateAdDeposit: (deposit: T.AdDeposit) => void;
  deleteAdDeposit: (id: string) => void;

  adFundTransfers: T.AdFundTransfer[];
  addAdFundTransfer: (transfer: Omit<T.AdFundTransfer, 'id'>) => void;
  updateAdFundTransfer: (transfer: T.AdFundTransfer) => void;
  deleteAdFundTransfer: (id: string) => void;

  commissions: T.Commission[];
  addCommission: (commission: Omit<T.Commission, 'id'>) => void;
  updateCommission: (commission: T.Commission) => void;
  deleteCommission: (id: string) => void;
  
  assetTypes: T.AssetType[];
  addAssetType: (assetType: Omit<T.AssetType, 'id'>) => void;
  updateAssetType: (assetType: T.AssetType) => void;
  deleteAssetType: (id: string) => void;

  assets: T.Asset[];
  addAsset: (asset: Omit<T.Asset, 'id'>) => void;
  updateAsset: (asset: T.Asset) => void;
  deleteAsset: (id: string) => void;

  liabilities: T.Liability[];
  addLiability: (liability: Omit<T.Liability, 'id'>) => void;
  updateLiability: (liability: T.Liability) => void;
  deleteLiability: (id: string) => void;

  receivables: T.Receivable[];
  addReceivable: (receivable: Omit<T.Receivable, 'id'>) => void;
  updateReceivable: (receivable: T.Receivable) => void;
  deleteReceivable: (id: string) => void;

  receivablePayments: T.ReceivablePayment[];
  addReceivablePayment: (payment: Omit<T.ReceivablePayment, 'id'>) => void;
  updateReceivablePayment: (payment: T.ReceivablePayment) => void;
  deleteReceivablePayment: (id: string) => void;

  exchangeLogs: T.ExchangeLog[];
  addExchangeLog: (log: Omit<T.ExchangeLog, 'id'>) => void;
  updateExchangeLog: (log: T.ExchangeLog) => void;
  deleteExchangeLog: (id: string) => void;

  miscellaneousExpenses: T.MiscellaneousExpense[];
  addMiscellaneousExpense: (expense: Omit<T.MiscellaneousExpense, 'id'>) => void;
  updateMiscellaneousExpense: (expense: T.MiscellaneousExpense) => void;
  deleteMiscellaneousExpense: (id: string) => void;
  
  partners: T.Partner[];
  addPartner: (partner: Omit<T.Partner, 'id'>) => void;
  updatePartner: (partner: T.Partner) => void;
  deletePartner: (id: string) => void;

  withdrawals: T.Withdrawal[];
  addWithdrawal: (withdrawal: Omit<T.Withdrawal, 'id'>) => void;
  updateWithdrawal: (withdrawal: T.Withdrawal) => void;
  deleteWithdrawal: (id: string) => void;

  debtPayments: T.DebtPayment[];
  addDebtPayment: (payment: Omit<T.DebtPayment, 'id'>) => void;
  updateDebtPayment: (payment: T.DebtPayment) => void;
  deleteDebtPayment: (id: string) => void;

  taxPayments: T.TaxPayment[];
  addTaxPayment: (payment: Omit<T.TaxPayment, 'id'>) => void;

  capitalInflows: T.CapitalInflow[];
  addCapitalInflow: (inflow: Omit<T.CapitalInflow, 'id'>) => void;
  updateCapitalInflow: (inflow: T.CapitalInflow) => void;
  deleteCapitalInflow: (id: string) => void;

  taxSettings: T.TaxSettings;
  updateTaxSettings: (settings: T.TaxSettings) => void;

  activePeriod: string | null;
  viewingPeriod: string | null;
  openPeriod: (period: string) => void;
  closePeriod: (period: string) => void;
  closedPeriods: T.ClosedPeriod[];
  setViewingPeriod: (period: string) => void;
  clearViewingPeriod: () => void;

  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  
  currentPeriod: string | null;
  isReadOnly: boolean;

  enrichedAssets: EnrichedAsset[];
  enrichedDailyAdCosts: EnrichedDailyAdCost[];
  periodFinancials: T.PeriodFinancials | null;
  periodAssetDetails: PeriodAssetDetail[];
  
  categories: T.Category[];
  addCategory: (category: Omit<T.Category, 'id'>) => void;
  updateCategory: (category: T.Category) => void;
  deleteCategory: (id: string) => boolean;

  niches: T.Niche[];
  addNiche: (niche: Omit<T.Niche, 'id'>) => void;
  updateNiche: (niche: T.Niche) => void;
  deleteNiche: (id: string) => boolean;

  masterProjects: MasterProject[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useLocalStorage<T.Project[]>('projects', []);
  const [dailyAdCosts, setDailyAdCosts] = useLocalStorage<T.DailyAdCost[]>('dailyAdCosts', []);
  const [adDeposits, setAdDeposits] = useLocalStorage<T.AdDeposit[]>('adDeposits', []);
  const [adFundTransfers, setAdFundTransfers] = useLocalStorage<T.AdFundTransfer[]>('adFundTransfers', []);
  const [commissions, setCommissions] = useLocalStorage<T.Commission[]>('commissions', []);
  const [exchangeLogs, setExchangeLogs] = useLocalStorage<T.ExchangeLog[]>('exchangeLogs', []);
  const [miscellaneousExpenses, setMiscellaneousExpenses] = useLocalStorage<T.MiscellaneousExpense[]>('miscellaneousExpenses', []);
  const [liabilities, setLiabilities] = useLocalStorage<T.Liability[]>('liabilities', []);
  const [receivables, setReceivables] = useLocalStorage<T.Receivable[]>('receivables', []);
  const [receivablePayments, setReceivablePayments] = useLocalStorage<T.ReceivablePayment[]>('receivablePayments', []);
  const [partners, setPartners] = useLocalStorage<T.Partner[]>('partners', [{ id: 'default-me', name: 'Tôi' }]);
  const [assetTypes, setAssetTypes] = useLocalStorage<T.AssetType[]>('assetTypes', [
    { id: 'platform', name: 'Platform' },
    { id: 'bank', name: 'Bank' },
    { id: 'cash', name: 'Cash' },
    { id: 'agency', name: 'Agency' },
  ]);
  const [assets, setAssets] = useLocalStorage<T.Asset[]>('assets', []);
  const [withdrawals, setWithdrawals] = useLocalStorage<T.Withdrawal[]>('withdrawals', []);
  const [debtPayments, setDebtPayments] = useLocalStorage<T.DebtPayment[]>('debtPayments', []);
  const [taxPayments, setTaxPayments] = useLocalStorage<T.TaxPayment[]>('taxPayments', []);
  const [capitalInflows, setCapitalInflows] = useLocalStorage<T.CapitalInflow[]>('capitalInflows', []);
  const [taxSettings, setTaxSettings] = useLocalStorage<T.TaxSettings>('taxSettings', {
    method: 'revenue',
    revenueRate: 1.5,
    vatRate: 10,
    incomeRate: 20,
    vatInputMethod: 'auto_sum',
    manualInputVat: 0,
    incomeTaxBase: 'personal',
    vatOutputBase: 'personal',
    vatInputBase: 'total',
    taxSeparationAmount: 0,
    periodClosingDay: 1,
  });

  const [categories, setCategories] = useLocalStorage<T.Category[]>('categories', []);
  const [niches, setNiches] = useLocalStorage<T.Niche[]>('niches', []);

  const [activePeriod, setActivePeriod] = useLocalStorage<string | null>('activePeriod', null);
  const [viewingPeriod, setViewingPeriodInternal] = useLocalStorage<string | null>('viewingPeriod', null);
  const [closedPeriods, setClosedPeriods] = useLocalStorage<T.ClosedPeriod[]>('closedPeriods', []);
  const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'Dashboard');

  // Project CRUD
  const addProject = (project: Omit<T.Project, 'id' | 'period'>) => {
    if (!activePeriod) return;
    if (projects.some(p => p.name.trim().toLowerCase() === project.name.trim().toLowerCase() && p.period === activePeriod)) {
      alert('Tên dự án đã tồn tại trong kỳ này. Vui lòng chọn tên khác.');
      return;
    }
    setProjects(prev => [...prev, { ...project, id: crypto.randomUUID(), period: activePeriod }]);
  };
  const updateProject = (updatedProject: T.Project) => {
    if (projects.some(p => p.id !== updatedProject.id && p.name.trim().toLowerCase() === updatedProject.name.trim().toLowerCase() && p.period === updatedProject.period)) {
      alert('Tên dự án đã tồn tại trong kỳ này. Vui lòng chọn tên khác.');
      return;
    }
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };
  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    // Cascading delete for associated data
    setDailyAdCosts(prev => prev.filter(c => c.projectId !== id));
    setCommissions(prev => prev.filter(c => c.projectId !== id));
    setMiscellaneousExpenses(prev => prev.filter(e => e.projectId !== id));
    setAdDeposits(prev => prev.filter(d => d.projectId !== id));
  };

  // DailyAdCost CRUD
  const addDailyAdCost = (cost: Omit<T.DailyAdCost, 'id'>) => {
    setDailyAdCosts(prev => [...prev, { ...cost, id: crypto.randomUUID() }]);
  };
  const updateDailyAdCost = (updatedCost: T.DailyAdCost) => {
    setDailyAdCosts(prev => prev.map(c => c.id === updatedCost.id ? updatedCost : c));
  };
  const deleteDailyAdCost = (id: string) => {
    setDailyAdCosts(prev => prev.filter(c => c.id !== id));
  };

  // AdDeposit CRUD
  const addAdDeposit = (deposit: Omit<T.AdDeposit, 'id'>) => {
    setAdDeposits(prev => [...prev, { ...deposit, id: crypto.randomUUID() }]);
  };
  const updateAdDeposit = (updatedDeposit: T.AdDeposit) => {
    setAdDeposits(prev => prev.map(d => d.id === updatedDeposit.id ? updatedDeposit : d));
  };
  const deleteAdDeposit = (id: string) => {
    setAdDeposits(prev => prev.filter(d => d.id !== id));
  };

  // AdFundTransfer CRUD
  const addAdFundTransfer = (transfer: Omit<T.AdFundTransfer, 'id'>) => {
    setAdFundTransfers(prev => [...prev, { ...transfer, id: crypto.randomUUID() }]);
  };
  const updateAdFundTransfer = (updatedTransfer: T.AdFundTransfer) => {
    setAdFundTransfers(prev => prev.map(t => t.id === updatedTransfer.id ? updatedTransfer : t));
  };
  const deleteAdFundTransfer = (id: string) => {
    setAdFundTransfers(prev => prev.filter(t => t.id !== id));
  };

  // Commission CRUD
  const addCommission = (commission: Omit<T.Commission, 'id'>) => {
    setCommissions(prev => [...prev, { ...commission, id: crypto.randomUUID() }]);
  };
  const updateCommission = (updatedCommission: T.Commission) => {
    setCommissions(prev => prev.map(c => c.id === updatedCommission.id ? updatedCommission : c));
  };
  const deleteCommission = (id: string) => {
    setCommissions(prev => prev.filter(c => c.id !== id));
  };

  // AssetType CRUD
  const addAssetType = (assetType: Omit<T.AssetType, 'id'>) => {
    setAssetTypes(prev => [...prev, { ...assetType, id: crypto.randomUUID() }]);
  };
  const updateAssetType = (updatedAssetType: T.AssetType) => {
    setAssetTypes(prev => prev.map(at => at.id === updatedAssetType.id ? updatedAssetType : at));
  };
  const deleteAssetType = (id: string) => {
    setAssetTypes(prev => prev.filter(at => at.id !== id));
  };

  // Asset CRUD
  const addAsset = (asset: Omit<T.Asset, 'id'>) => {
    setAssets(prev => [...prev, { ...asset, id: crypto.randomUUID() }]);
  };
  const updateAsset = (updatedAsset: T.Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
  };
  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  // Liability CRUD
  const addLiability = (liability: Omit<T.Liability, 'id'>) => {
    setLiabilities(prev => [...prev, { ...liability, id: crypto.randomUUID() }]);
  };
  const updateLiability = (updatedLiability: T.Liability) => {
    setLiabilities(prev => prev.map(l => l.id === updatedLiability.id ? updatedLiability : l));
  };
  const deleteLiability = (id: string) => {
    setLiabilities(prev => prev.filter(l => l.id !== id));
  };
  
  // Receivable CRUD
  const addReceivable = (receivable: Omit<T.Receivable, 'id'>) => {
      setReceivables(prev => [...prev, { ...receivable, id: crypto.randomUUID() }]);
  };
  const updateReceivable = (updatedReceivable: T.Receivable) => {
      setReceivables(prev => prev.map(r => r.id === updatedReceivable.id ? updatedReceivable : r));
  };
  const deleteReceivable = (id: string) => {
      setReceivables(prev => prev.filter(r => r.id !== id));
  };

  // ReceivablePayment CRUD
  const addReceivablePayment = (payment: Omit<T.ReceivablePayment, 'id'>) => {
      setReceivablePayments(prev => [...prev, { ...payment, id: crypto.randomUUID() }]);
  };
  const updateReceivablePayment = (updatedPayment: T.ReceivablePayment) => {
      setReceivablePayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
  };
  const deleteReceivablePayment = (id: string) => {
      setReceivablePayments(prev => prev.filter(p => p.id !== id));
  };

  // ExchangeLog CRUD
  const addExchangeLog = (log: Omit<T.ExchangeLog, 'id'>) => {
    setExchangeLogs(prev => [...prev, { ...log, id: crypto.randomUUID() }]);
  };
  const updateExchangeLog = (updatedLog: T.ExchangeLog) => {
    setExchangeLogs(prev => prev.map(l => (l.id === updatedLog.id ? updatedLog : l)));
  };
  const deleteExchangeLog = (id: string) => {
    setExchangeLogs(prev => prev.filter(l => l.id !== id));
  };
  
  // MiscellaneousExpense CRUD
  const addMiscellaneousExpense = (expense: Omit<T.MiscellaneousExpense, 'id'>) => {
    setMiscellaneousExpenses(prev => [...prev, { ...expense, id: crypto.randomUUID() }]);
  };
  const updateMiscellaneousExpense = (updatedExpense: T.MiscellaneousExpense) => {
    setMiscellaneousExpenses(prev => prev.map(e => (e.id === updatedExpense.id ? updatedExpense : e)));
  };
  const deleteMiscellaneousExpense = (id: string) => {
    setMiscellaneousExpenses(prev => prev.filter(e => e.id !== id));
  };
  
  // Partner CRUD
  const addPartner = (partner: Omit<T.Partner, 'id'>) => {
    setPartners(prev => [...prev, { ...partner, id: crypto.randomUUID() }]);
  };
  const updatePartner = (updatedPartner: T.Partner) => {
    setPartners(prev => prev.map(p => p.id === updatedPartner.id ? updatedPartner : p));
  };
  const deletePartner = (id: string) => {
    const isPartnerInProject = projects.some(p => p.isPartnership && p.partnerShares?.some(s => s.partnerId === id));
    if (isPartnerInProject) {
        alert('Không thể xóa đối tác này vì họ đang được liên kết với một hoặc nhiều dự án hợp tác. Vui lòng gỡ bỏ đối tác khỏi tất cả các dự án trước khi xóa.');
        return;
    }
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  // Withdrawal CRUD
  const addWithdrawal = (withdrawal: Omit<T.Withdrawal, 'id'>) => {
      setWithdrawals(prev => [...prev, { ...withdrawal, id: crypto.randomUUID() }]);
  };
  const updateWithdrawal = (updatedWithdrawal: T.Withdrawal) => {
      setWithdrawals(prev => prev.map(w => (w.id === updatedWithdrawal.id ? updatedWithdrawal : w)));
  };
  const deleteWithdrawal = (id: string) => {
      setWithdrawals(prev => prev.filter(w => w.id !== id));
  };

  // DebtPayment CRUD
  const addDebtPayment = (payment: Omit<T.DebtPayment, 'id'>) => {
    setDebtPayments(prev => [...prev, { ...payment, id: crypto.randomUUID() }]);
  };
  const updateDebtPayment = (updatedPayment: T.DebtPayment) => {
      setDebtPayments(prev => prev.map(p => (p.id === updatedPayment.id ? updatedPayment : p)));
  };
  const deleteDebtPayment = (id: string) => {
      setDebtPayments(prev => prev.filter(p => p.id !== id));
  };
  
  // TaxPayment CRUD
  const addTaxPayment = (payment: Omit<T.TaxPayment, 'id'>) => {
    setTaxPayments(prev => [...prev, { ...payment, id: crypto.randomUUID() }]);
  };

  // CapitalInflow CRUD
  const addCapitalInflow = (inflow: Omit<T.CapitalInflow, 'id'>) => {
    setCapitalInflows(prev => [...prev, { ...inflow, id: crypto.randomUUID() }]);
  };
  const updateCapitalInflow = (updatedInflow: T.CapitalInflow) => {
    setCapitalInflows(prev => prev.map(i => (i.id === updatedInflow.id ? updatedInflow : i)));
  };
  const deleteCapitalInflow = (id: string) => {
    setCapitalInflows(prev => prev.filter(i => i.id !== id));
  };
  
  // Tax Settings
  const updateTaxSettings = (settings: T.TaxSettings) => {
    setTaxSettings(settings);
  };
  
  // Category CRUD
  const addCategory = (category: Omit<T.Category, 'id'>) => {
    if (categories.some(c => c.name.trim().toLowerCase() === category.name.trim().toLowerCase())) {
        alert('Tên hạng mục đã tồn tại. Vui lòng chọn tên khác.');
        return;
    }
    setCategories(prev => [...prev, { ...category, id: crypto.randomUUID() }]);
  };
  const updateCategory = (updatedCategory: T.Category) => {
    if (categories.some(c => c.id !== updatedCategory.id && c.name.trim().toLowerCase() === updatedCategory.name.trim().toLowerCase())) {
        alert('Tên hạng mục đã tồn tại. Vui lòng chọn tên khác.');
        return;
    }
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  };
  const deleteCategory = (id: string): boolean => {
    if (niches.some(n => n.categoryId === id)) {
      alert('Không thể xóa hạng mục này vì vẫn còn các ngách con. Vui lòng xóa các ngách trước.');
      return false;
    }
    if (projects.some(p => p.categoryId === id)) {
      alert('Không thể xóa hạng mục này vì nó đang được sử dụng bởi một hoặc nhiều dự án.');
      return false;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
    return true;
  };

  // Niche CRUD
  const addNiche = (niche: Omit<T.Niche, 'id'>) => {
    if (niches.some(n => n.name.trim().toLowerCase() === niche.name.trim().toLowerCase() && n.categoryId === niche.categoryId)) {
        alert('Tên ngách đã tồn tại trong hạng mục này. Vui lòng chọn tên khác.');
        return;
    }
    setNiches(prev => [...prev, { ...niche, id: crypto.randomUUID() }]);
  };
  const updateNiche = (updatedNiche: T.Niche) => {
    if (niches.some(n => n.id !== updatedNiche.id && n.name.trim().toLowerCase() === updatedNiche.name.trim().toLowerCase() && n.categoryId === updatedNiche.categoryId)) {
        alert('Tên ngách đã tồn tại trong hạng mục này. Vui lòng chọn tên khác.');
        return;
    }
    setNiches(prev => prev.map(n => n.id === updatedNiche.id ? updatedNiche : n));
  };
  const deleteNiche = (id: string): boolean => {
    if (projects.some(p => p.nicheId === id)) {
      alert('Không thể xóa ngách này vì nó đang được sử dụng bởi một hoặc nhiều dự án.');
      return false;
    }
    setNiches(prev => prev.filter(n => n.id !== id));
    return true;
  };


  // Period Management
  const openPeriod = (period: string) => {
    setActivePeriod(period);
    setViewingPeriodInternal(null);
  };

  const closePeriod = (period: string) => {
    setClosedPeriods(prev => [...prev, { period, closedAt: new Date().toISOString() }]);
    setActivePeriod(null);
    setViewingPeriodInternal(null);
  };
  
  const setViewingPeriod = (period: string) => {
    setViewingPeriodInternal(period);
  };
  
  const clearViewingPeriod = () => {
    setViewingPeriodInternal(null);
  };
  
  const currentPeriod = viewingPeriod || activePeriod;
  const isReadOnly = !!viewingPeriod;
  
  const enrichedDailyAdCosts = useMemo<EnrichedDailyAdCost[]>(() => {
    const projectMap = new Map(projects.map(p => [p.id, p]));
    type LedgerItem = { amount: number, rate: number };
    const ledgersByAccount = new Map<string, LedgerItem[]>();

    const getAccountKey = (platform: T.AdsPlatform, accountNumber: string) => `${platform}__${accountNumber}`;

    const fundEvents = [
        ...adDeposits.map(d => ({ ...d, type: 'deposit' as const })),
        ...adFundTransfers.map(t => ({ ...t, type: 'transfer' as const }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const event of fundEvents) {
        if (event.type === 'deposit') {
            const key = getAccountKey(event.adsPlatform, event.adAccountNumber);
            if (!ledgersByAccount.has(key)) ledgersByAccount.set(key, []);
            ledgersByAccount.get(key)!.push({ amount: event.usdAmount, rate: event.rate });
        } else { // transfer
            const fromKey = getAccountKey(event.adsPlatform, event.fromAdAccountNumber);
            const toKey = getAccountKey(event.adsPlatform, event.toAdAccountNumber);
            
            if (!ledgersByAccount.has(fromKey)) continue; // Cannot transfer from empty account
            if (!ledgersByAccount.has(toKey)) ledgersByAccount.set(toKey, []);

            const fromLedger = ledgersByAccount.get(fromKey)!;
            const toLedger = ledgersByAccount.get(toKey)!;
            
            let amountToTransfer = event.amount;
            const transferredChunks: LedgerItem[] = [];
            
            for (const item of fromLedger) {
                if (amountToTransfer <= 0) break;
                const amountToTake = Math.min(amountToTransfer, item.amount);
                item.amount -= amountToTake;
                amountToTransfer -= amountToTake;
                transferredChunks.push({ amount: amountToTake, rate: item.rate });
            }
            
            // Add new synthetic deposits to the 'to' account
            toLedger.push(...transferredChunks);
            // Clean up empty items from 'from' account
            ledgersByAccount.set(fromKey, fromLedger.filter(item => item.amount > 0.001));
        }
    }

    const consumableLedgers = new Map(Array.from(ledgersByAccount.entries()).map(([key, items]) => 
        [key, items.map(item => ({...item}))] // Deep copy to make it consumable
    ));

    const sortedCosts = [...dailyAdCosts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedCosts.map(cost => {
        const project = projectMap.get(cost.projectId);
        if (!project || !cost.adAccountNumber) {
            return { ...cost, vndCost: 0, effectiveRate: 0 };
        }
        
        // Find the platform from any deposit made to this account
        const depositForAccount = adDeposits.find(d => d.adAccountNumber === cost.adAccountNumber);
        const platformForCosting = depositForAccount?.adsPlatform;
        
        if (!platformForCosting) {
            return { ...cost, vndCost: 0, effectiveRate: 0 }; // Cannot attribute cost without a platform
        }

        const accountKey = getAccountKey(platformForCosting, cost.adAccountNumber);
        const ledger = consumableLedgers.get(accountKey);

        let costRemaining = cost.amount;
        let totalVndCost = 0;

        if (ledger) {
             for (const deposit of ledger) {
                if (deposit.amount > 0 && costRemaining > 0) {
                    const amountToUse = Math.min(costRemaining, deposit.amount);
                    totalVndCost += amountToUse * deposit.rate;
                    deposit.amount -= amountToUse;
                    costRemaining -= amountToUse;
                }
                if (costRemaining <= 0.001) break;
            }
        }
        
        if (costRemaining > 0.001 && adDeposits.length > 0) {
            const relevantDeposits = adDeposits
                .filter(d => d.adAccountNumber === cost.adAccountNumber)
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const lastRate = relevantDeposits.length > 0 ? relevantDeposits[relevantDeposits.length - 1].rate : 25000;
            totalVndCost += costRemaining * lastRate;
        }

        return {
            ...cost,
            vndCost: totalVndCost,
            effectiveRate: cost.amount > 0 ? totalVndCost / cost.amount : 0
        };
    });

  }, [dailyAdCosts, adDeposits, adFundTransfers, projects]);

  const enrichedAssets = useMemo<EnrichedAsset[]>(() => {
        const assetOwnerStats = new Map<string, Map<string, { received: number, withdrawn: number }>>();
        const projectMap = new Map<string, T.Project>(projects.map(p => [p.id, p]));
        const mePartnerId = 'default-me';
        const assetMap = new Map(assets.map(a => [a.id, a]));

        const addValue = (assetId: string, partnerId: string, value: number, type: 'received' | 'withdrawn') => {
            if (!assetId || !partnerId || value === 0) return;
            if (typeof assetId !== 'string' || typeof partnerId !== 'string') return;
            
            if (!assetOwnerStats.has(assetId)) {
                assetOwnerStats.set(assetId, new Map<string, { received: number, withdrawn: number }>());
            }
            const ownerStats = assetOwnerStats.get(assetId)!;
            
            if (!ownerStats.has(partnerId)) {
                ownerStats.set(partnerId, { received: 0, withdrawn: 0 });
            }
            const stats = ownerStats.get(partnerId)!;
            stats[type] += value;
        };

        commissions.forEach(comm => {
            const project = projectMap.get(comm.projectId);
            const value = comm.usdAmount; 
            if (project?.isPartnership && project.partnerShares) {
                project.partnerShares.forEach(share => {
                    addValue(comm.assetId, share.partnerId, value * (share.sharePercentage / 100), 'received');
                });
            } else {
                addValue(comm.assetId, mePartnerId, value, 'received');
            }
        });
        
        adDeposits.forEach(deposit => {
             addValue(deposit.assetId, mePartnerId, deposit.vndAmount, 'withdrawn');
        });

        miscellaneousExpenses.forEach(exp => {
            // Case 1: Expense has its own partnership shares (no project)
            if (exp.isPartnership && exp.partnerShares) {
                exp.partnerShares.forEach(share => {
                    addValue(exp.assetId, share.partnerId, exp.amount * (share.sharePercentage / 100), 'withdrawn');
                });
            } 
            // Case 2: Expense is linked to a project
            else if (exp.projectId) {
                const project = projectMap.get(exp.projectId);
                // Sub-case 2a: It's a partnership project
                if (project?.isPartnership && project.partnerShares) {
                    project.partnerShares.forEach(share => {
                        addValue(exp.assetId, share.partnerId, exp.amount * (share.sharePercentage / 100), 'withdrawn');
                    });
                } else {
                    // Sub-case 2b: It's a personal project
                    addValue(exp.assetId, mePartnerId, exp.amount, 'withdrawn');
                }
            }
            // Case 3: Personal expense, not linked to a project and not a standalone partnership expense
            else { 
                addValue(exp.assetId, mePartnerId, exp.amount, 'withdrawn');
            }
        });

        const sortedExchangeLogs = [...exchangeLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedExchangeLogs.forEach(log => {
            const sellingAssetStats = assetOwnerStats.get(log.sellingAssetId);
            const balances = new Map<string, number>();
            let totalPositiveBalance = 0;

            if (sellingAssetStats) {
                sellingAssetStats.forEach((stats, partnerId) => {
                    const balance = stats.received - stats.withdrawn;
                    balances.set(partnerId, balance);
                    if (balance > 0) {
                        totalPositiveBalance += balance;
                    }
                });
            }

            if (totalPositiveBalance <= 0) {
                addValue(log.sellingAssetId, mePartnerId, log.usdAmount, 'withdrawn');
                addValue(log.receivingAssetId, mePartnerId, log.vndAmount, 'received');
            } else {
                balances.forEach((balance, partnerId) => {
                    if (balance > 0) {
                        const ratio = balance / totalPositiveBalance;
                        addValue(log.sellingAssetId, partnerId, log.usdAmount * ratio, 'withdrawn');
                        addValue(log.receivingAssetId, partnerId, log.vndAmount * ratio, 'received');
                    }
                });
            }
        });
        
        withdrawals.forEach(w => {
            addValue(w.assetId, w.withdrawnBy, w.amount, 'withdrawn');
        });
        
        debtPayments.forEach(p => {
            addValue(p.assetId, mePartnerId, p.amount, 'withdrawn');
        });
        
        taxPayments.forEach(p => {
            addValue(p.assetId, mePartnerId, p.amount, 'withdrawn');
        });

        capitalInflows.forEach(inflow => {
            // Capital inflows like loans or owner investments are considered personal funds.
            addValue(inflow.assetId, mePartnerId, inflow.amount, 'received');
        });

        receivablePayments.forEach(p => {
            const asset = assetMap.get(p.assetId);
            if (asset) {
                addValue(p.assetId, mePartnerId, p.amount, 'received');
            }
        });

        receivables.forEach(r => {
            const asset = assetMap.get(r.outflowAssetId);
            if (asset) {
                addValue(r.outflowAssetId, mePartnerId, r.totalAmount, 'withdrawn');
            }
        });

        const partnerMap = new Map<string, string>(partners.map(p => [p.id, p.name]));
        
        return assets.map(asset => {
            const ownerStatsMap = assetOwnerStats.get(asset.id);
            let totalReceived = 0;
            let totalWithdrawn = 0;
            const ownersData: {id: string, name: string, received: number, withdrawn: number}[] = [];
            
            if (ownerStatsMap) {
                for (const [ownerId, stats] of ownerStatsMap.entries()) {
                    totalReceived += stats.received;
                    totalWithdrawn += stats.withdrawn;
                    if (stats.received > 0 || stats.withdrawn > 0) {
                         ownersData.push({
                            id: ownerId,
                            name: partnerMap.get(ownerId) || 'N/A',
                            ...stats,
                        });
                    }
                }
            }
            
            const currentBalance = asset.balance + totalReceived - totalWithdrawn;
            const hasPartnerFlow = ownersData.some(o => o.id !== mePartnerId);

            return {
                ...asset,
                balance: currentBalance,
                totalReceived,
                totalWithdrawn,
                owners: ownersData.sort((a,b) => (a.id === mePartnerId ? -1 : b.id === mePartnerId ? 1 : a.name.localeCompare(b.name))),
                isExpandable: hasPartnerFlow,
            };
        });
    }, [assets, projects, partners, commissions, exchangeLogs, withdrawals, adDeposits, miscellaneousExpenses, debtPayments, taxPayments, capitalInflows, receivables, receivablePayments]);

    const periodFinancials = useMemo<T.PeriodFinancials | null>(() => {
        if (!currentPeriod) return null;

        const mePartnerId = 'default-me';
        const assetMap = new Map(assets.map(a => [a.id, a]));
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        const periodCommissions = commissions.filter(c => isDateInPeriod(c.date, currentPeriod));
        const periodAdCosts = enrichedDailyAdCosts.filter(c => isDateInPeriod(c.date, currentPeriod));
        const periodMiscExpenses = miscellaneousExpenses.filter(e => isDateInPeriod(e.date, currentPeriod));
        const periodProjects = projects.filter(p => p.period === currentPeriod);
        const periodExchangeLogs = exchangeLogs.filter(log => isDateInPeriod(log.date, currentPeriod)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const periodDebtPayments = debtPayments.filter(p => isDateInPeriod(p.date, currentPeriod));
        const periodWithdrawals = withdrawals.filter(w => isDateInPeriod(w.date, currentPeriod));
        const periodAdDeposits = adDeposits.filter(d => isDateInPeriod(d.date, currentPeriod));
        const periodTaxPayments = taxPayments.filter(p => p.period === currentPeriod);
        const periodCapitalInflows = capitalInflows.filter(i => isDateInPeriod(i.date, currentPeriod));
        const periodReceivables = receivables.filter(r => isDateInPeriod(r.creationDate, currentPeriod));
        const periodReceivablePayments = receivablePayments.filter(p => isDateInPeriod(p.date, currentPeriod));
        const periodLiabilities = liabilities.filter(l => isDateInPeriod(l.creationDate, currentPeriod));
        
        const projectPnL = new Map<string, { revenue: number, cost: number, inputVat: number }>();
        
        // --- REVENUE & COST CALCULATION (FIFO for USD) ---
        type CommissionLedgerItem = { projectId: string; amount: number; predictedRate: number; };
        const usdCommissionLedgers = new Map<string, CommissionLedgerItem[]>();
        const allCommissionsSorted = [...commissions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const comm of allCommissionsSorted) {
            const asset = assetMap.get(comm.assetId);
            if (asset?.currency === 'USD') {
                if (!usdCommissionLedgers.has(comm.assetId)) {
                    usdCommissionLedgers.set(comm.assetId, []);
                }
                usdCommissionLedgers.get(comm.assetId)!.push({
                    projectId: comm.projectId,
                    amount: comm.usdAmount,
                    predictedRate: comm.predictedRate,
                });
            }
        }
        
        projectPnL.clear();
        let exchangeRateGainLoss = 0;

        // **REVISED & FINAL P&L LOGIC**
        periodCommissions.forEach(c => {
            const pnl = projectPnL.get(c.projectId) || { revenue: 0, cost: 0, inputVat: 0 };
            pnl.revenue += c.vndAmount; // vndAmount is predicted for USD, actual for VND
            projectPnL.set(c.projectId, pnl);
        });

        periodAdCosts.forEach(c => {
            const pnl = projectPnL.get(c.projectId) || { revenue: 0, cost: 0, inputVat: 0 };
            pnl.cost += c.vndCost;
            pnl.inputVat += c.vndCost * (c.vatRate || 0) / 100;
            projectPnL.set(c.projectId, pnl);
        });
        periodMiscExpenses.filter(e => e.projectId).forEach(e => {
            const pnl = projectPnL.get(e.projectId!) || { revenue: 0, cost: 0, inputVat: 0 };
            pnl.cost += e.vndAmount;
            pnl.inputVat += e.vndAmount * (e.vatRate || 0) / 100;
            projectPnL.set(e.projectId!, pnl);
        });
        
        const gainLossByProject = new Map<string, number>();
        
        const fifoLedgerForGainLoss = new Map(Array.from(usdCommissionLedgers.entries()).map(([key, items]) => 
            [key, items.map(item => ({...item}))] 
        ));

        periodExchangeLogs.forEach(log => {
            const ledger = fifoLedgerForGainLoss.get(log.sellingAssetId);
            if (!ledger) return;

            let amountToSell = log.usdAmount;
            while(amountToSell > 0 && ledger.length > 0) {
                const chunk = ledger[0];
                const amountToConsume = Math.min(amountToSell, chunk.amount);

                const realizedVnd = amountToConsume * log.rate;
                const costBasisVnd = amountToConsume * chunk.predictedRate;
                
                const gainLoss = realizedVnd - costBasisVnd;
                gainLossByProject.set(chunk.projectId, (gainLossByProject.get(chunk.projectId) || 0) + gainLoss);

                chunk.amount -= amountToConsume;
                amountToSell -= amountToConsume;
                if(chunk.amount < 0.001) ledger.shift();
            }
        });
        
        gainLossByProject.forEach((gainLoss, projectId) => {
             const pnl = projectPnL.get(projectId) || { revenue: 0, cost: 0, inputVat: 0 };
             pnl.revenue += gainLoss;
             projectPnL.set(projectId, pnl);
        });

        exchangeRateGainLoss = Array.from(gainLossByProject.values()).reduce((sum, val) => sum + val, 0);

        // --- PARTNER DISTRIBUTION ---
        const partnerStatsMap = new Map<string, { revenue: number, cost: number, inputVat: number }>();
        partners.forEach(p => partnerStatsMap.set(p.id, { revenue: 0, cost: 0, inputVat: 0 }));

        periodProjects.forEach(project => {
            const pnl = projectPnL.get(project.id) || { revenue: 0, cost: 0, inputVat: 0 };
            if (project.isPartnership && project.partnerShares?.length) {
                project.partnerShares.forEach(share => {
                    const partnerStat = partnerStatsMap.get(share.partnerId);
                    if (partnerStat) {
                        const percentage = share.sharePercentage / 100;
                        partnerStat.revenue += pnl.revenue * percentage;
                        partnerStat.cost += pnl.cost * percentage;
                        partnerStat.inputVat += pnl.inputVat * percentage;
                    }
                });
            } else {
                const meStat = partnerStatsMap.get(mePartnerId);
                if (meStat) Object.keys(meStat).forEach(key => (meStat as any)[key] += (pnl as any)[key]);
            }
        });
        
        periodMiscExpenses.filter(e => !e.projectId).forEach(exp => {
            const costVat = exp.vndAmount * (exp.vatRate || 0) / 100;
            if (exp.isPartnership && exp.partnerShares?.length) {
                exp.partnerShares.forEach(share => {
                    const partnerStat = partnerStatsMap.get(share.partnerId);
                    if (partnerStat) {
                        const percentage = share.sharePercentage / 100;
                        partnerStat.cost += exp.vndAmount * percentage;
                        partnerStat.inputVat += costVat * percentage;
                    }
                });
            } else {
                const meStat = partnerStatsMap.get(mePartnerId);
                if (meStat) {
                    meStat.cost += exp.vndAmount;
                    meStat.inputVat += costVat;
                }
            }
        });
        
        let totalRevenue = 0, totalCost = 0, totalInputVat = 0;
        partnerStatsMap.forEach(stat => {
            totalRevenue += stat.revenue;
            totalCost += stat.cost;
            totalInputVat += stat.inputVat;
        });
        const totalProfit = totalRevenue - totalCost;
        const myStats = partnerStatsMap.get(mePartnerId) || { revenue: 0, cost: 0, inputVat: 0 };

        // --- Tax Calculation ---
        const calculateTax = (revenue: number, profit: number, inputVatSource: number): T.TaxCalculationResult => {
            if (taxSettings.method === 'revenue') {
                const tax = revenue * (taxSettings.revenueRate / 100);
                return { taxPayable: tax, incomeTax: tax, netVat: 0, outputVat: 0 };
            }
            if (taxSettings.method === 'profit_vat') {
                const outputVat = revenue * (taxSettings.vatRate / 100);
                let inputVat = inputVatSource;
                if (taxSettings.vatInputMethod === 'manual') {
                    if (taxSettings.vatInputBase === 'total' || (taxSettings.vatInputBase === 'personal' && revenue === myStats.revenue)) {
                        inputVat = taxSettings.manualInputVat;
                    }
                }
                const netVat = Math.max(0, outputVat - inputVat);
                const incomeTax = Math.max(0, profit) * (taxSettings.incomeRate / 100);
                return { taxPayable: netVat + incomeTax, incomeTax, netVat, outputVat };
            }
            return { taxPayable: 0, incomeTax: 0, netVat: 0, outputVat: 0 };
        };

        const taxSeparationAmount = taxSettings.taxSeparationAmount ?? 0;
        const initialRevenueBase = (taxSettings.incomeTaxBase ?? 'personal') === 'total' ? totalRevenue : myStats.revenue;
        const costBase = (taxSettings.incomeTaxBase ?? 'personal') === 'total' ? totalCost : myStats.cost;
        const initialVatOutputBase = (taxSettings.vatOutputBase ?? 'personal') === 'total' ? totalRevenue : myStats.revenue;
        const vatInputBase = (taxSettings.vatInputBase ?? 'total') === 'total' ? totalInputVat : myStats.inputVat;
        const revenueBase = Math.max(0, initialRevenueBase - taxSeparationAmount);
        const profitBase = revenueBase - costBase;
        const vatOutputBase = Math.max(0, initialVatOutputBase - taxSeparationAmount);
        const tax = calculateTax(taxSettings.method === 'revenue' ? revenueBase : vatOutputBase, profitBase, vatInputBase);
        const taxBases = { initialRevenueBase, taxSeparationAmount, revenueBase, costBase, profitBase, vatOutputBase, vatInputBase };

        const partnerPnlDetails: T.PartnerPnl[] = partners.map(p => {
            const stats = partnerStatsMap.get(p.id) || { revenue: 0, cost: 0, inputVat: 0 };
            const partnerProfit = stats.revenue - stats.cost;
            const partnerTax = calculateTax(stats.revenue, partnerProfit, stats.inputVat);
            return {
                partnerId: p.id,
                name: p.name,
                revenue: stats.revenue,
                cost: stats.cost,
                profit: partnerProfit,
                inputVat: stats.inputVat,
                taxPayable: partnerTax.taxPayable
            };
        });

        const revenueDetails = Object.entries(
            Array.from(projectPnL.entries()).reduce((acc: Record<string, number>, [projectId, pnl]) => {
                const name = projectMap.get(projectId) || 'Dự án không xác định';
                acc[name] = (acc[name] || 0) + pnl.revenue;
                return acc;
            }, {})
        ).map(([name, amount]) => ({ name, amount }));
        
        const adCostDetails = Object.entries(periodAdCosts.reduce((acc: Record<string, number>, cost) => {
            const name = projectMap.get(cost.projectId) || 'Dự án không xác định';
            acc[name] = (acc[name] || 0) + cost.vndCost;
            return acc;
        }, {})).map(([name, amount]) => ({ name, amount }));
        const miscCostDetails = periodMiscExpenses.map(exp => ({ name: exp.description, amount: exp.vndAmount }));

        // --- Statement of Cash Flows ---
        const totalVndReceivedFromSales = periodExchangeLogs.reduce((sum, log) => sum + log.vndAmount, 0);
        const totalCapitalInflow = periodCapitalInflows.reduce((sum, i) => sum + i.amount, 0);
        const vndCommissionInflow = periodCommissions.filter(c => assetMap.get(c.assetId)?.currency === 'VND').reduce((sum, c) => sum + c.vndAmount, 0);
        const receivablePaymentsReceived = periodReceivablePayments.reduce((sum, p) => sum + p.amount, 0);
        const adDepositsPaid = periodAdDeposits.reduce((sum, d) => sum + d.vndAmount, 0);
        const debtPaidThisPeriod = periodDebtPayments.reduce((sum, p) => sum + p.amount, 0);
        const withdrawalsPaid = periodWithdrawals.reduce((sum, w) => sum + w.vndAmount, 0);
        const taxPaidThisPeriod = periodTaxPayments.reduce((sum, p) => sum + p.amount, 0);
        // Fix: Add definition for totalAdCost, which is used in the return statement.
        const totalAdCost = periodAdCosts.reduce((sum, c) => sum + c.vndCost, 0);
        const totalMiscCost = periodMiscExpenses.reduce((sum, e) => sum + e.vndAmount, 0);
        const receivablesCreated = periodReceivables.reduce((sum, r) => sum + r.totalAmount, 0);
        const newDebtInflow = periodLiabilities.reduce((sum, l) => sum + l.totalAmount, 0);

        const cfOperatingInflows = [
            { label: "Tiền thu từ bán USD", amount: totalVndReceivedFromSales },
            { label: "Tiền thu từ hoa hồng (VND)", amount: vndCommissionInflow },
            { label: "Tiền thu hồi các khoản phải thu", amount: receivablePaymentsReceived },
        ].filter(item => item.amount > 0);
        const totalCfOperatingInflows = cfOperatingInflows.reduce((sum, item) => sum + item.amount, 0);

        const cfOperatingOutflows = [
            { label: "Chi phí phát sinh", amount: totalMiscCost },
            { label: "Chi nạp tiền quảng cáo", amount: adDepositsPaid },
            { label: "Chi nộp thuế", amount: taxPaidThisPeriod },
        ].filter(item => item.amount > 0);
        const totalCfOperatingOutflows = cfOperatingOutflows.reduce((sum, item) => sum + item.amount, 0);
        const netCfOperating = totalCfOperatingInflows - totalCfOperatingOutflows;

        const cfInvestingInflows: { label: string; amount: number }[] = [];
        const totalCfInvestingInflows = 0;

        const cfInvestingOutflows = [ { label: "Chi cho vay, tạo khoản phải thu", amount: receivablesCreated } ].filter(item => item.amount > 0);
        const totalCfInvestingOutflows = cfInvestingOutflows.reduce((sum, item) => sum + item.amount, 0);
        const netCfInvesting = totalCfInvestingInflows - totalCfInvestingOutflows;

        const cfFinancingInflows = [
            { label: "Vốn góp của chủ sở hữu", amount: totalCapitalInflow },
            { label: "Tiền thu từ đi vay", amount: newDebtInflow },
        ].filter(item => item.amount > 0);
        const totalCfFinancingInflows = cfFinancingInflows.reduce((sum, item) => sum + item.amount, 0);

        const cfFinancingOutflows = [
            { label: "Chi trả nợ gốc", amount: debtPaidThisPeriod },
            { label: "Chủ sở hữu/Đối tác rút vốn", amount: withdrawalsPaid },
        ].filter(item => item.amount > 0);
        const totalCfFinancingOutflows = cfFinancingOutflows.reduce((sum, item) => sum + item.amount, 0);
        const netCfFinancing = totalCfFinancingInflows - totalCfFinancingOutflows;

        const netChangeInCash = netCfOperating + netCfInvesting + netCfFinancing;

        const endBalanceVND = enrichedAssets.filter(a => a.currency === 'VND').reduce((sum, a) => sum + a.balance, 0);
        const beginningBalanceVND = endBalanceVND - netChangeInCash;

        const cashFlow = {
            operating: { inflows: cfOperatingInflows, outflows: cfOperatingOutflows, net: netCfOperating },
            investing: { inflows: cfInvestingInflows, outflows: cfInvestingOutflows, net: netCfInvesting },
            financing: { inflows: cfFinancingInflows, outflows: cfFinancingOutflows, net: netCfFinancing },
            netChange: netChangeInCash,
            beginningBalance: beginningBalanceVND,
            endBalance: endBalanceVND,
        };
        
        const profitBeforeTax = totalRevenue - totalCost;
        const netProfit = profitBeforeTax - tax.taxPayable;

        return {
          totalRevenue, totalAdCost, totalMiscCost, totalCost, totalProfit, totalInputVat,
          myRevenue: myStats.revenue, myCost: myStats.cost, myProfit: myStats.revenue - myStats.cost, myInputVat: myStats.inputVat,
          exchangeRateGainLoss, profitBeforeTax, netProfit,
          tax, taxBases, partnerPnlDetails,
          revenueDetails, adCostDetails, miscCostDetails,
          cashFlow
        };
    }, [
        currentPeriod, commissions, enrichedDailyAdCosts, miscellaneousExpenses, 
        projects, partners, exchangeLogs, debtPayments, withdrawals, adDeposits,
        taxPayments, capitalInflows, receivables, receivablePayments, liabilities,
        taxSettings, assets, enrichedAssets
    ]);
    
    const periodAssetDetails = useMemo<PeriodAssetDetail[]>(() => {
        if (!currentPeriod) return [];
        
        return enrichedAssets.map(asset => {
            const isUsd = asset.currency === 'USD';
            
            const periodInflows = [
                ...commissions.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => isUsd ? t.usdAmount : t.vndAmount),
                ...exchangeLogs.filter(t => t.receivingAssetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.vndAmount),
                ...capitalInflows.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.amount),
                ...receivablePayments.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.amount),
                 ...liabilities.filter(l => l.inflowAssetId === asset.id && isDateInPeriod(l.creationDate, currentPeriod)).map(l => l.totalAmount),
            ].reduce((sum, val) => sum + val, 0);

            const periodOutflows = [
                ...adDeposits.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.vndAmount),
                ...miscellaneousExpenses.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.amount),
                ...exchangeLogs.filter(t => t.sellingAssetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.usdAmount),
                ...debtPayments.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.amount),
                ...withdrawals.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.amount),
                ...taxPayments.filter(t => t.assetId === asset.id && isDateInPeriod(t.date, currentPeriod)).map(t => t.amount),
                ...receivables.filter(t => t.outflowAssetId === asset.id && isDateInPeriod(t.creationDate, currentPeriod)).map(t => t.totalAmount),
            ].reduce((sum, val) => sum + val, 0);

            const periodChange = periodInflows - periodOutflows;
            const closingBalance = asset.balance;
            const openingBalance = closingBalance - periodChange;

            return {
                id: asset.id,
                name: asset.name,
                currency: asset.currency,
                openingBalance: openingBalance,
                change: periodChange,
                closingBalance: closingBalance
            };
        });

    }, [currentPeriod, enrichedAssets, commissions, exchangeLogs, capitalInflows, adDeposits, miscellaneousExpenses, debtPayments, withdrawals, taxPayments, receivables, receivablePayments, liabilities]);

    const masterProjects = useMemo(() => {
        const masterProjectMap = new Map<string, { name: string; categoryId?: string; nicheId?: string }>();
        
        // Sort projects by period descending to process the newest ones first
        const sortedProjects = [...projects].sort((a, b) => b.period.localeCompare(a.period));

        sortedProjects.forEach(project => {
            const normalizedName = project.name.trim().toLowerCase();

            // If we haven't seen this project name yet, add it with its details.
            // Since we're iterating from newest to oldest, this will be the most recent version.
            if (!masterProjectMap.has(normalizedName)) {
                masterProjectMap.set(normalizedName, {
                    name: project.name, // Keep original casing for display
                    categoryId: project.categoryId,
                    nicheId: project.nicheId
                });
            }
        });

        return Array.from(masterProjectMap.values());
    }, [projects]);


  const value = {
    projects, addProject, updateProject, deleteProject,
    dailyAdCosts, addDailyAdCost, updateDailyAdCost, deleteDailyAdCost,
    adDeposits, addAdDeposit, updateAdDeposit, deleteAdDeposit,
    adFundTransfers, addAdFundTransfer, updateAdFundTransfer, deleteAdFundTransfer,
    commissions, addCommission, updateCommission, deleteCommission,
    assetTypes, addAssetType, updateAssetType, deleteAssetType,
    assets, addAsset, updateAsset, deleteAsset,
    liabilities, addLiability, updateLiability, deleteLiability,
    receivables, addReceivable, updateReceivable, deleteReceivable,
    receivablePayments, addReceivablePayment, updateReceivablePayment, deleteReceivablePayment,
    exchangeLogs, addExchangeLog, updateExchangeLog, deleteExchangeLog,
    miscellaneousExpenses, addMiscellaneousExpense, updateMiscellaneousExpense, deleteMiscellaneousExpense,
    partners, addPartner, updatePartner, deletePartner,
    withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal,
    debtPayments, addDebtPayment, updateDebtPayment, deleteDebtPayment,
    taxPayments, addTaxPayment,
    capitalInflows, addCapitalInflow, updateCapitalInflow, deleteCapitalInflow,
    taxSettings, updateTaxSettings,
    activePeriod, openPeriod, closePeriod, closedPeriods,
    viewingPeriod, setViewingPeriod, clearViewingPeriod,
    currentPage, setCurrentPage,
    currentPeriod, isReadOnly,
    enrichedAssets,
    enrichedDailyAdCosts,
    periodFinancials,
    periodAssetDetails,
    categories, addCategory, updateCategory, deleteCategory,
    niches, addNiche, updateNiche, deleteNiche,
    masterProjects,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};