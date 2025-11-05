import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import * as T from '../types';
import { Page, PeriodAssetDetail, FirebaseConfig } from '../types';
import { isDateInPeriod } from '../lib/utils';
import { initializeFirebase, db } from '../lib/firebase';
import { 
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, 
    query, where, writeBatch, Firestore, setDoc, getDoc
} from 'firebase/firestore';


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
  isLoading: boolean;
  projects: T.Project[];
  addProject: (project: Omit<T.Project, 'id' | 'period'>) => Promise<void>;
  updateProject: (project: T.Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  adAccounts: T.AdAccount[];
  addAdAccount: (account: Omit<T.AdAccount, 'id'>) => Promise<void>;
  updateAdAccount: (account: T.AdAccount) => Promise<void>;
  deleteAdAccount: (id: string) => Promise<void>;

  dailyAdCosts: T.DailyAdCost[];
  addDailyAdCost: (cost: Omit<T.DailyAdCost, 'id'>) => Promise<void>;
  updateDailyAdCost: (cost: T.DailyAdCost) => Promise<void>;
  deleteDailyAdCost: (id: string) => Promise<void>;

  adDeposits: T.AdDeposit[];
  addAdDeposit: (deposit: Omit<T.AdDeposit, 'id'>) => Promise<void>;
  updateAdDeposit: (deposit: T.AdDeposit) => Promise<void>;
  deleteAdDeposit: (id: string) => Promise<void>;

  adFundTransfers: T.AdFundTransfer[];
  addAdFundTransfer: (transfer: Omit<T.AdFundTransfer, 'id'>) => Promise<void>;
  updateAdFundTransfer: (transfer: T.AdFundTransfer) => Promise<void>;
  // FIX: Changed parameter type from T.AdFundTransfer to string to match implementation.
  deleteAdFundTransfer: (id: string) => Promise<void>;

  commissions: T.Commission[];
  addCommission: (commission: Omit<T.Commission, 'id'>) => Promise<void>;
  updateCommission: (commission: T.Commission) => Promise<void>;
  deleteCommission: (id: string) => Promise<void>;
  
  assetTypes: T.AssetType[];
  addAssetType: (assetType: Omit<T.AssetType, 'id'>) => Promise<void>;
  updateAssetType: (assetType: T.AssetType) => Promise<void>;
  deleteAssetType: (id: string) => Promise<void>;

  assets: T.Asset[];
  addAsset: (asset: Omit<T.Asset, 'id'>) => Promise<void>;
  updateAsset: (asset: T.Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  liabilities: T.Liability[];
  addLiability: (liability: Omit<T.Liability, 'id'>) => Promise<void>;
  updateLiability: (liability: T.Liability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;

  receivables: T.Receivable[];
  addReceivable: (receivable: Omit<T.Receivable, 'id'>) => Promise<void>;
  updateReceivable: (receivable: T.Receivable) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;

  receivablePayments: T.ReceivablePayment[];
  addReceivablePayment: (payment: Omit<T.ReceivablePayment, 'id'>) => Promise<void>;
  updateReceivablePayment: (payment: T.ReceivablePayment) => Promise<void>;
  deleteReceivablePayment: (id: string) => Promise<void>;

  exchangeLogs: T.ExchangeLog[];
  addExchangeLog: (log: Omit<T.ExchangeLog, 'id'>) => Promise<void>;
  updateExchangeLog: (log: T.ExchangeLog) => Promise<void>;
  deleteExchangeLog: (id: string) => Promise<void>;

  miscellaneousExpenses: T.MiscellaneousExpense[];
  addMiscellaneousExpense: (expense: Omit<T.MiscellaneousExpense, 'id'>) => Promise<void>;
  updateMiscellaneousExpense: (expense: T.MiscellaneousExpense) => Promise<void>;
  deleteMiscellaneousExpense: (id: string) => Promise<void>;
  
  partners: T.Partner[];
  addPartner: (partner: Omit<T.Partner, 'id'>) => Promise<void>;
  updatePartner: (partner: T.Partner) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;

  withdrawals: T.Withdrawal[];
  addWithdrawal: (withdrawal: Omit<T.Withdrawal, 'id'>) => Promise<void>;
  updateWithdrawal: (withdrawal: T.Withdrawal) => Promise<void>;
  deleteWithdrawal: (id: string) => Promise<void>;

  debtPayments: T.DebtPayment[];
  addDebtPayment: (payment: Omit<T.DebtPayment, 'id'>) => Promise<void>;
  updateDebtPayment: (payment: T.DebtPayment) => Promise<void>;
  deleteDebtPayment: (id: string) => Promise<void>;

  taxPayments: T.TaxPayment[];
  addTaxPayment: (payment: Omit<T.TaxPayment, 'id'>) => Promise<void>;

  capitalInflows: T.CapitalInflow[];
  addCapitalInflow: (inflow: Omit<T.CapitalInflow, 'id'>) => Promise<void>;
  updateCapitalInflow: (inflow: T.CapitalInflow) => Promise<void>;
  deleteCapitalInflow: (id: string) => Promise<void>;

  taxSettings: T.TaxSettings;
  updateTaxSettings: (settings: T.TaxSettings) => Promise<void>;

  activePeriod: string | null;
  viewingPeriod: string | null;
  openPeriod: (period: string) => Promise<void>;
  closePeriod: (period: string) => Promise<void>;
  closedPeriods: T.ClosedPeriod[];
  setViewingPeriod: (period: string) => void;
  clearViewingPeriod: () => void;
  seedData: () => Promise<void>;

  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  
  currentPeriod: string | null;
  isReadOnly: boolean;

  enrichedAssets: EnrichedAsset[];
  enrichedDailyAdCosts: EnrichedDailyAdCost[];
  periodFinancials: T.PeriodFinancials | null;
  periodAssetDetails: PeriodAssetDetail[];
  
  categories: T.Category[];
  addCategory: (category: Omit<T.Category, 'id'>) => Promise<void>;
  updateCategory: (category: T.Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;

  niches: T.Niche[];
  addNiche: (niche: Omit<T.Niche, 'id'>) => Promise<void>;
  updateNiche: (niche: T.Niche) => Promise<void>;
  deleteNiche: (id: string) => Promise<boolean>;

  masterProjects: MasterProject[];

  firebaseConfig: T.FirebaseConfig | null;
  setFirebaseConfig: React.Dispatch<React.SetStateAction<T.FirebaseConfig | null>>;

  // FIX: Add properties for period-specific debts and receivables
  periodLiabilities: T.PeriodLiability[];
  addPeriodLiability: (liability: Omit<T.PeriodLiability, 'id' | 'period'>) => Promise<void>;
  updatePeriodLiability: (liability: T.PeriodLiability) => Promise<void>;
  deletePeriodLiability: (id: string) => Promise<void>;
  periodDebtPayments: T.PeriodDebtPayment[];
  addPeriodDebtPayment: (payment: Omit<T.PeriodDebtPayment, 'id'>) => Promise<void>;

  periodReceivables: T.PeriodReceivable[];
  addPeriodReceivable: (receivable: Omit<T.PeriodReceivable, 'id' | 'period'>) => Promise<void>;
  updatePeriodReceivable: (receivable: T.PeriodReceivable) => Promise<void>;
  deletePeriodReceivable: (id: string) => Promise<void>;
  periodReceivablePayments: T.PeriodReceivablePayment[];
  addPeriodReceivablePayment: (payment: Omit<T.PeriodReceivablePayment, 'id'>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Fix: Export a 'useData' hook to allow components to consume the context.
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

const defaultTaxSettings: T.TaxSettings = {
    method: 'revenue', revenueRate: 1.5, vatRate: 10, incomeRate: 20, vatInputMethod: 'auto_sum',
    manualInputVat: 0, incomeTaxBase: 'personal', vatOutputBase: 'personal', vatInputBase: 'total',
    taxSeparationAmount: 0, periodClosingDay: 1,
};

const COLLECTION_NAMES_FOR_SEED = [
    'projects', 'dailyAdCosts', 'adDeposits', 'adFundTransfers', 'commissions', 
    'assetTypes', 'assets', 'liabilities', 'receivables', 'receivablePayments', 
    'exchangeLogs', 'miscellaneousExpenses', 'partners', 'withdrawals', 
    'debtPayments', 'taxPayments', 'capitalInflows', 'categories', 'niches',
    'adAccounts',
    // FIX: Add period-specific collections to be wiped during seeding.
    'periodLiabilities', 'periodDebtPayments', 'periodReceivables', 'periodReceivablePayments',
];

const wipeAllFirestoreData = async (db: Firestore) => {
    if (!db) {
        throw new Error("DB not connected");
    }
    
    for (const collectionName of COLLECTION_NAMES_FOR_SEED) {
        const snapshot = await getDocs(collection(db, collectionName));
        if(snapshot.empty) continue;
        
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationCount = 0;
        
        snapshot.docs.forEach(doc => {
            if (collectionName === 'partners' && doc.id === 'default-me') {
                return; // Skip deleting the default partner
            }
            currentBatch.delete(doc.ref);
            operationCount++;
            if (operationCount >= 499) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                operationCount = 0;
            }
        });
        if(operationCount > 0) batches.push(currentBatch);
        
        await Promise.all(batches.map(batch => batch.commit()));
    }

    await deleteDoc(doc(db, 'settings', 'tax')).catch(()=>{});
    await deleteDoc(doc(db, 'settings', 'periods')).catch(()=>{});
};


const seedInitialData = async (db: Firestore) => {
    const batch = writeBatch(db);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentPeriod = today.toISOString().slice(0, 7);

    console.log("Seeding data for period:", currentPeriod, "and date:", todayStr);

    // 1. Settings
    batch.set(doc(db, 'settings', 'tax'), defaultTaxSettings);
    batch.set(doc(db, 'settings', 'periods'), { activePeriod: currentPeriod, closedPeriods: [] });

    // 2. Partners
    const mePartnerRef = doc(db, 'partners', 'default-me');
    batch.set(mePartnerRef, { name: 'Tôi' });

    // 3. Asset Types
    const typePlatformRef = doc(db, 'assetTypes', 'platform'); batch.set(typePlatformRef, { name: 'Platform' });
    const typeBankRef = doc(db, 'assetTypes', 'bank'); batch.set(typeBankRef, { name: 'Bank' });
    const typeCashRef = doc(db, 'assetTypes', 'cash'); batch.set(typeCashRef, { name: 'Cash' });
    const typeAgencyRef = doc(db, 'assetTypes', 'agency'); batch.set(typeAgencyRef, { name: 'Agency' });

    // 4. Categories & Niches
    const healthCategoryRef = doc(collection(db, 'categories'));
    batch.set(healthCategoryRef, { name: 'Sức khỏe' });
    const weightLossNicheRef = doc(collection(db, 'niches'));
    batch.set(weightLossNicheRef, { name: 'Giảm cân', categoryId: healthCategoryRef.id });

    // 5. Assets
    const vcbAssetRef = doc(collection(db, 'assets'));
    batch.set(vcbAssetRef, { name: 'Vietcombank', typeId: 'bank', balance: 0, currency: 'VND' });
    const clickbankAssetRef = doc(collection(db, 'assets'));
    batch.set(clickbankAssetRef, { name: 'ClickBank', typeId: 'platform', balance: 0, currency: 'USD' });

    // 6. Projects
    const project1Ref = doc(collection(db, 'projects'));
    const month = today.getMonth() + 1;
    batch.set(project1Ref, {
        name: `Dự án Giảm cân T${month}`,
        adsPlatforms: ['facebook', 'google'],
        projectType: 'deployment',
        status: 'running',
        isPartnership: false,
        period: currentPeriod,
        categoryId: healthCategoryRef.id,
        nicheId: weightLossNicheRef.id
    });
    
    // 7. Capital Inflow
    batch.set(doc(collection(db, 'capitalInflows')), {
        date: todayStr, assetId: vcbAssetRef.id, amount: 50000000, description: 'Vốn góp ban đầu',
        contributedByPartnerId: 'default-me',
    });

    // 8. Ad Account
    const adAccount1Ref = doc(collection(db, 'adAccounts'));
    batch.set(adAccount1Ref, { accountNumber: 'GG-ACC-001', adsPlatform: 'google', status: 'running' });

    // 9. Ad Deposit
    batch.set(doc(collection(db, 'adDeposits')), {
        date: todayStr, adsPlatform: 'google', adAccountNumber: 'GG-ACC-001', projectId: project1Ref.id,
        assetId: vcbAssetRef.id, usdAmount: 500, rate: 25500, vndAmount: 500 * 25500, status: 'running'
    });

    // 10. Daily Ad Cost
    batch.set(doc(collection(db, 'dailyAdCosts')), {
        projectId: project1Ref.id, adAccountNumber: 'GG-ACC-001', date: todayStr, amount: 50.75, vatRate: 8
    });

    // 11. Commission
    batch.set(doc(collection(db, 'commissions')), {
        projectId: project1Ref.id, date: todayStr, assetId: clickbankAssetRef.id,
        usdAmount: 350, predictedRate: 25400, vndAmount: 350 * 25400
    });
    
    // 12. Exchange Log
    batch.set(doc(collection(db, 'exchangeLogs')), {
        date: todayStr, sellingAssetId: clickbankAssetRef.id, receivingAssetId: vcbAssetRef.id,
        usdAmount: 300, rate: 25600, vndAmount: 300 * 25600
    });
    
    // 13. Miscellaneous Expense
    batch.set(doc(collection(db, 'miscellaneousExpenses')), {
        date: todayStr, description: 'Thuê VPS tháng này', assetId: vcbAssetRef.id,
        amount: 500000, vndAmount: 500000
    });
    
    // 14. Liability
    const liabilityRef = doc(collection(db, 'liabilities'));
    batch.set(liabilityRef, {
        description: 'Vay nóng bạn bè', totalAmount: 10000000, currency: 'VND',
        type: 'short-term', creationDate: todayStr
    });

    // 15. Debt Payment
    batch.set(doc(collection(db, 'debtPayments')), {
        liabilityId: liabilityRef.id, date: todayStr, amount: 1000000, assetId: vcbAssetRef.id
    });

    // 16. Receivable
    const receivableRef = doc(collection(db, 'receivables'));
    batch.set(receivableRef, {
        description: 'Tạm ứng cho Agency', totalAmount: 5000000, currency: 'VND', type: 'short-term',
        creationDate: todayStr, outflowAssetId: vcbAssetRef.id
    });

    // 17. Receivable Payment
    batch.set(doc(collection(db, 'receivablePayments')), {
        receivableId: receivableRef.id, date: todayStr, amount: 500000, assetId: vcbAssetRef.id
    });

    // 18. Withdrawal
    batch.set(doc(collection(db, 'withdrawals')), {
        date: todayStr, assetId: vcbAssetRef.id, amount: 2000000, vndAmount: 2000000,
        withdrawnBy: mePartnerRef.id, description: 'Rút tiền cá nhân'
    });

    await batch.commit();
    console.log("Firebase data seeding completed.");
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseConfig, setFirebaseConfig] = useLocalStorage<FirebaseConfig | null>('firebaseConfig', null);
  const [firestoreDb, setFirestoreDb] = useState<Firestore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [projects, setProjects] = useState<T.Project[]>([]);
  const [adAccounts, setAdAccounts] = useState<T.AdAccount[]>([]);
  const [dailyAdCosts, setDailyAdCosts] = useState<T.DailyAdCost[]>([]);
  const [partners, setPartners] = useState<T.Partner[]>([]);
  const [assetTypes, setAssetTypes] = useState<T.AssetType[]>([]);
  const [assets, setAssets] = useState<T.Asset[]>([]);
  const [commissions, setCommissions] = useState<T.Commission[]>([]);
  const [exchangeLogs, setExchangeLogs] = useState<T.ExchangeLog[]>([]);
  const [miscellaneousExpenses, setMiscellaneousExpenses] = useState<T.MiscellaneousExpense[]>([]);
  const [adDeposits, setAdDeposits] = useState<T.AdDeposit[]>([]);
  const [adFundTransfers, setAdFundTransfers] = useState<T.AdFundTransfer[]>([]);
  const [liabilities, setLiabilities] = useState<T.Liability[]>([]);
  const [receivables, setReceivables] = useState<T.Receivable[]>([]);
  const [receivablePayments, setReceivablePayments] = useState<T.ReceivablePayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<T.Withdrawal[]>([]);
  const [debtPayments, setDebtPayments] = useState<T.DebtPayment[]>([]);
  const [taxPayments, setTaxPayments] = useState<T.TaxPayment[]>([]);
  const [capitalInflows, setCapitalInflows] = useState<T.CapitalInflow[]>([]);
  const [categories, setCategories] = useState<T.Category[]>([]);
  const [niches, setNiches] = useState<T.Niche[]>([]);
  // FIX: Add state for period-specific debts and receivables
  const [periodLiabilities, setPeriodLiabilities] = useState<T.PeriodLiability[]>([]);
  const [periodDebtPayments, setPeriodDebtPayments] = useState<T.PeriodDebtPayment[]>([]);
  const [periodReceivables, setPeriodReceivables] = useState<T.PeriodReceivable[]>([]);
  const [periodReceivablePayments, setPeriodReceivablePayments] = useState<T.PeriodReceivablePayment[]>([]);
  
  const [taxSettings, setTaxSettings] = useState<T.TaxSettings>(defaultTaxSettings);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [viewingPeriod, setViewingPeriodInternal] = useState<string | null>(null);
  const [closedPeriods, setClosedPeriods] = useState<T.ClosedPeriod[]>([]);
  const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'Dashboard');

  useEffect(() => {
    if (firebaseConfig) {
      const dbInstance = initializeFirebase(firebaseConfig);
      setFirestoreDb(dbInstance);
    } else {
        setIsLoading(false);
    }
  }, [firebaseConfig]);
  
  useEffect(() => {
    if (!firestoreDb) return;

    const fetchAllData = async () => {
        const fetchCollection = async <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
            try {
                const dataCollection = collection(firestoreDb, collectionName);
                const dataSnapshot = await getDocs(dataCollection);
                const dataList = dataSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as T[];
                setter(dataList);
            } catch (error) { console.error(`Error fetching ${collectionName}:`, error); }
        };
        
        const fetchSettings = async () => {
            try {
                const taxDocRef = doc(firestoreDb, 'settings', 'tax');
                const taxDocSnap = await getDoc(taxDocRef);
                if (taxDocSnap.exists()) {
                    setTaxSettings(taxDocSnap.data() as T.TaxSettings);
                } else {
                    console.log("No tax settings found, using default.");
                    setTaxSettings(defaultTaxSettings);
                }

                const periodsDocRef = doc(firestoreDb, 'settings', 'periods');
                const periodsDocSnap = await getDoc(periodsDocRef);
                if (periodsDocSnap.exists()) {
                    const data = periodsDocSnap.data();
                    setActivePeriod(data.activePeriod || null);
                    setClosedPeriods(data.closedPeriods || []);
                } else {
                    console.log("No period settings found, using default.");
                    setActivePeriod(null);
                    setClosedPeriods([]);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };

        try {
            await Promise.all([
                fetchSettings(),
                fetchCollection<T.Project>('projects', setProjects),
                fetchCollection<T.AdAccount>('adAccounts', setAdAccounts),
                fetchCollection<T.DailyAdCost>('dailyAdCosts', setDailyAdCosts),
                fetchCollection<T.Asset>('assets', setAssets),
                fetchCollection<T.Commission>('commissions', setCommissions),
                fetchCollection<T.ExchangeLog>('exchangeLogs', setExchangeLogs),
                fetchCollection<T.MiscellaneousExpense>('miscellaneousExpenses', setMiscellaneousExpenses),
                fetchCollection<T.AdDeposit>('adDeposits', setAdDeposits),
                fetchCollection<T.AdFundTransfer>('adFundTransfers', setAdFundTransfers),
                fetchCollection<T.Liability>('liabilities', setLiabilities),
                fetchCollection<T.Receivable>('receivables', setReceivables),
                fetchCollection<T.ReceivablePayment>('receivablePayments', setReceivablePayments),
                fetchCollection<T.Withdrawal>('withdrawals', setWithdrawals),
                fetchCollection<T.DebtPayment>('debtPayments', setDebtPayments),
                fetchCollection<T.TaxPayment>('taxPayments', setTaxPayments),
                fetchCollection<T.CapitalInflow>('capitalInflows', setCapitalInflows),
                fetchCollection<T.Partner>('partners', setPartners),
                fetchCollection<T.AssetType>('assetTypes', setAssetTypes),
                fetchCollection<T.Category>('categories', setCategories),
                fetchCollection<T.Niche>('niches', setNiches),
                // FIX: Fetch period-specific collections.
                fetchCollection<T.PeriodLiability>('periodLiabilities', setPeriodLiabilities),
                fetchCollection<T.PeriodDebtPayment>('periodDebtPayments', setPeriodDebtPayments),
                fetchCollection<T.PeriodReceivable>('periodReceivables', setPeriodReceivables),
                fetchCollection<T.PeriodReceivablePayment>('periodReceivablePayments', setPeriodReceivablePayments),
            ]);
            console.log("All data fetched successfully.");
        } catch (error) {
            console.error("Error during data fetch:", error);
            alert("Đã xảy ra lỗi khi tải dữ liệu từ Firebase. Vui lòng kiểm tra lại kết nối và cấu hình.");
        } finally {
            setIsLoading(false);
        }
    };

    fetchAllData();
  }, [firestoreDb]);

  const seedData = async () => {
    if (!firestoreDb) return;
    setIsLoading(true);
    try {
        await wipeAllFirestoreData(firestoreDb); // Ensure clean state before seeding
        await seedInitialData(firestoreDb);
        alert("Đã khôi phục dữ liệu mẫu thành công. Ứng dụng sẽ được tải lại.");
        window.location.reload();
    } catch (error) {
        console.error("Error seeding data:", error);
        alert("Đã xảy ra lỗi khi khôi phục dữ liệu mẫu.");
        setIsLoading(false);
    }
  };


  const addProject = async (project: Omit<T.Project, 'id' | 'period'>) => {
    if (!activePeriod || !firestoreDb) return;
    if (projects.some(p => p.name.trim().toLowerCase() === project.name.trim().toLowerCase() && p.period === activePeriod)) {
      alert('Tên dự án đã tồn tại trong kỳ này. Vui lòng chọn tên khác.'); return;
    }
    const newProjectData = { ...project, period: activePeriod };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'projects'), newProjectData);
        setProjects(prev => [...prev, { ...newProjectData, id: docRef.id }]);
    } catch (e) { console.error("Error adding project: ", e); }
  };
  const updateProject = async (updatedProject: T.Project) => {
    if (!firestoreDb) return;
    if (projects.some(p => p.id !== updatedProject.id && p.name.trim().toLowerCase() === updatedProject.name.trim().toLowerCase() && p.period === updatedProject.period)) {
      alert('Tên dự án đã tồn tại trong kỳ này. Vui lòng chọn tên khác.'); return;
    }
    const { id, ...projectData } = updatedProject;
    try {
        await updateDoc(doc(firestoreDb, 'projects', id), projectData);
        setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    } catch (e) { console.error("Error updating project: ", e); }
  };
  const deleteProject = async (id: string) => {
      if (!firestoreDb) return;
      try {
        const batch = writeBatch(firestoreDb);

        // 1. Delete the project itself
        batch.delete(doc(firestoreDb, "projects", id));

        // 2. Find and delete related documents
        const collectionsToDeleteFrom = ['dailyAdCosts', 'commissions', 'miscellaneousExpenses', 'adDeposits'];
        const deletedIds: { [key: string]: string[] } = { dailyAdCosts: [], commissions: [], miscellaneousExpenses: [], adDeposits: [] };

        for (const collectionName of collectionsToDeleteFrom) {
            const q = query(collection(firestoreDb, collectionName), where("projectId", "==", id));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
                deletedIds[collectionName].push(doc.id);
            });
        }
        
        // 3. Commit batch
        await batch.commit();

        // 4. Update local state
        setProjects(prev => prev.filter(p => p.id !== id));
        setDailyAdCosts(prev => prev.filter(item => !deletedIds.dailyAdCosts.includes(item.id)));
        setCommissions(prev => prev.filter(item => !deletedIds.commissions.includes(item.id)));
        setMiscellaneousExpenses(prev => prev.filter(item => !deletedIds.miscellaneousExpenses.includes(item.id)));
        setAdDeposits(prev => prev.filter(item => !deletedIds.adDeposits.includes(item.id)));
        
      } catch (e) { 
          console.error("Error deleting project and related data: ", e);
          alert("Đã xảy ra lỗi khi xóa dự án. Vui lòng thử lại.");
      }
  };

  const addAdAccount = async (account: Omit<T.AdAccount, 'id'>) => {
    if (!firestoreDb) return;
    if (adAccounts.some(acc => acc.accountNumber.trim().toLowerCase() === account.accountNumber.trim().toLowerCase())) {
        alert('Số tài khoản Ads đã tồn tại.');
        return;
    }
    try {
        const docRef = await addDoc(collection(firestoreDb, 'adAccounts'), account);
        setAdAccounts(prev => [...prev, { ...account, id: docRef.id }]);
    } catch (e) { console.error("Error adding ad account: ", e); }
  };
  const updateAdAccount = async (updatedAccount: T.AdAccount) => {
    if (!firestoreDb) return;
    if (adAccounts.some(acc => acc.id !== updatedAccount.id && acc.accountNumber.trim().toLowerCase() === updatedAccount.accountNumber.trim().toLowerCase())) {
        alert('Số tài khoản Ads đã tồn tại.');
        return;
    }
    const { id, ...accountData } = updatedAccount;
    try {
        await updateDoc(doc(firestoreDb, 'adAccounts', id), accountData);
        setAdAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc));
    } catch (e) { console.error("Error updating ad account: ", e); }
  };
  const deleteAdAccount = async (id: string) => {
    if (!firestoreDb) return;
    const accountToDelete = adAccounts.find(acc => acc.id === id);
    if (!accountToDelete) return;

    const { accountNumber } = accountToDelete;

    const isUsed = 
        adDeposits.some(d => d.adAccountNumber === accountNumber) ||
        adFundTransfers.some(t => t.fromAdAccountNumber === accountNumber || t.toAdAccountNumber === accountNumber) ||
        dailyAdCosts.some(c => c.adAccountNumber === accountNumber);

    if (isUsed) {
        alert('Không thể xóa tài khoản Ads này vì nó đã được sử dụng trong các giao dịch. Vui lòng xóa các giao dịch liên quan trước.');
        return;
    }

    try {
        await deleteDoc(doc(firestoreDb, 'adAccounts', id));
        setAdAccounts(prev => prev.filter(acc => acc.id !== id));
    } catch (e) { console.error("Error deleting ad account: ", e); }
  };

  const addDailyAdCost = async (cost: Omit<T.DailyAdCost, 'id'>) => {
    if (!firestoreDb) return;
    try {
        const docRef = await addDoc(collection(firestoreDb, 'dailyAdCosts'), cost);
        setDailyAdCosts(prev => [...prev, { ...cost, id: docRef.id }]);
    } catch (e) { console.error("Error adding daily ad cost: ", e); }
  };
  const updateDailyAdCost = async (updatedCost: T.DailyAdCost) => {
    if (!firestoreDb) return;
    const { id, ...costData } = updatedCost;
    try {
        await updateDoc(doc(firestoreDb, 'dailyAdCosts', id), costData);
        setDailyAdCosts(prev => prev.map(c => c.id === id ? updatedCost : c));
    } catch (e) { console.error("Error updating daily ad cost: ", e); }
  };
  const deleteDailyAdCost = async (id: string) => {
    if (!firestoreDb) return;
    try {
        await deleteDoc(doc(firestoreDb, 'dailyAdCosts', id));
        setDailyAdCosts(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error("Error deleting daily ad cost: ", e); }
  };

  const addAdDeposit = async (deposit: Omit<T.AdDeposit, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'adDeposits'), deposit);
            setAdDeposits(prev => [...prev, { ...deposit, id: docRef.id }]);
        } catch (e) { console.error("Error adding ad deposit: ", e); }
    };
  const updateAdDeposit = async (updatedDeposit: T.AdDeposit) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedDeposit;
        try {
            await updateDoc(doc(firestoreDb, 'adDeposits', id), data);
            setAdDeposits(prev => prev.map(d => d.id === id ? updatedDeposit : d));
        } catch (e) { console.error("Error updating ad deposit: ", e); }
    };
  const deleteAdDeposit = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'adDeposits', id));
            setAdDeposits(prev => prev.filter(d => d.id !== id));
        } catch (e) { console.error("Error deleting ad deposit: ", e); }
    };

  const addAdFundTransfer = async (transfer: Omit<T.AdFundTransfer, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'adFundTransfers'), transfer);
            setAdFundTransfers(prev => [...prev, { ...transfer, id: docRef.id }]);
        } catch (e) { console.error("Error adding ad fund transfer: ", e); }
    };
  const updateAdFundTransfer = async (updatedTransfer: T.AdFundTransfer) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedTransfer;
        try {
            await updateDoc(doc(firestoreDb, 'adFundTransfers', id), data);
            setAdFundTransfers(prev => prev.map(t => t.id === id ? updatedTransfer : t));
        } catch (e) { console.error("Error updating ad fund transfer: ", e); }
    };
  const deleteAdFundTransfer = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'adFundTransfers', id));
            setAdFundTransfers(prev => prev.filter(t => t.id !== id));
        } catch (e) { console.error("Error deleting ad fund transfer: ", e); }
    };

  const addCommission = async (commission: Omit<T.Commission, 'id'>) => {
    if (!firestoreDb) return;
    try {
      const docRef = await addDoc(collection(firestoreDb, 'commissions'), commission);
      setCommissions(prev => [...prev, { ...commission, id: docRef.id }]);
    } catch (e) { console.error("Error adding commission: ", e); }
  };
  const updateCommission = async (updatedCommission: T.Commission) => {
    if (!firestoreDb) return;
    const { id, ...commissionData } = updatedCommission;
    try {
      await updateDoc(doc(firestoreDb, 'commissions', id), commissionData);
      setCommissions(prev => prev.map(c => c.id === id ? updatedCommission : c));
    } catch (e) { console.error("Error updating commission: ", e); }
  };
  const deleteCommission = async (id: string) => {
    if (!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'commissions', id));
      setCommissions(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error("Error deleting commission: ", e); }
  };

  const addAssetType = async (assetType: Omit<T.AssetType, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'assetTypes'), assetType);
            setAssetTypes(prev => [...prev, { ...assetType, id: docRef.id }]);
        } catch (e) { console.error("Error adding asset type: ", e); }
    };
  const updateAssetType = async (updatedAssetType: T.AssetType) => {
        if (!firestoreDb) return;
        const { id, ...typeData } = updatedAssetType;
        try {
            await updateDoc(doc(firestoreDb, 'assetTypes', id), typeData);
            setAssetTypes(prev => prev.map(at => at.id === id ? updatedAssetType : at));
        } catch (e) { console.error("Error updating asset type: ", e); }
    };
  const deleteAssetType = async (id: string) => {
        if (!firestoreDb) return;
        if (assets.some(a => a.typeId === id)) {
            alert('Không thể xóa loại tài sản này vì nó đang được sử dụng bởi một hoặc nhiều tài sản.'); return;
        }
        try {
            await deleteDoc(doc(firestoreDb, 'assetTypes', id));
            setAssetTypes(prev => prev.filter(at => at.id !== id));
        } catch (e) { console.error("Error deleting asset type: ", e); }
    };

  const addAsset = async (asset: Omit<T.Asset, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'assets'), asset);
            setAssets(prev => [...prev, { ...asset, id: docRef.id }]);
        } catch (e) { console.error("Error adding asset: ", e); }
    };
  const updateAsset = async (updatedAsset: T.Asset) => {
        if (!firestoreDb) return;
        const { id, ...assetData } = updatedAsset;
        try {
            await updateDoc(doc(firestoreDb, 'assets', id), assetData);
            setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));
        } catch (e) { console.error("Error updating asset: ", e); }
    };
  const deleteAsset = async (id: string) => {
        if (!firestoreDb) return;

        const isAssetUsed = 
            commissions.some(c => c.assetId === id) || 
            adDeposits.some(d => d.assetId === id) ||
            exchangeLogs.some(e => e.sellingAssetId === id || e.receivingAssetId === id) ||
            miscellaneousExpenses.some(m => m.assetId === id) ||
            debtPayments.some(dp => dp.assetId === id) ||
            receivablePayments.some(rp => rp.assetId === id) ||
            withdrawals.some(w => w.assetId === id) ||
            taxPayments.some(tp => tp.assetId === id) ||
            capitalInflows.some(ci => ci.assetId === id) ||
            liabilities.some(l => l.inflowAssetId === id) ||
            receivables.some(r => r.outflowAssetId === id);

        if (isAssetUsed) {
             alert('Không thể xóa tài sản này vì nó đã được sử dụng trong các giao dịch. Vui lòng xóa các giao dịch liên quan trước.'); return;
        }
        try {
            await deleteDoc(doc(firestoreDb, 'assets', id));
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch (e) { console.error("Error deleting asset: ", e); }
    };

  const addLiability = async (liability: Omit<T.Liability, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'liabilities'), liability);
            setLiabilities(prev => [...prev, { ...liability, id: docRef.id }]);
        } catch (e) { console.error("Error adding liability: ", e); }
    };
  const updateLiability = async (updatedLiability: T.Liability) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedLiability;
        try {
            await updateDoc(doc(firestoreDb, 'liabilities', id), data);
            setLiabilities(prev => prev.map(l => l.id === id ? updatedLiability : l));
        } catch (e) { console.error("Error updating liability: ", e); }
    };
  const deleteLiability = async (id: string) => {
        if (!firestoreDb) return;
        try {
            const batch = writeBatch(firestoreDb);
            batch.delete(doc(firestoreDb, "liabilities", id));
            const paymentsQuery = query(collection(firestoreDb, "debtPayments"), where("liabilityId", "==", id));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            setLiabilities(prev => prev.filter(l => l.id !== id));
            setDebtPayments(prev => prev.filter(p => p.liabilityId !== id));
        } catch (e) { console.error("Error deleting liability and payments: ", e); }
    };
  
  const addReceivable = async (receivable: Omit<T.Receivable, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'receivables'), receivable);
            setReceivables(prev => [...prev, { ...receivable, id: docRef.id }]);
        } catch (e) { console.error("Error adding receivable: ", e); }
    };
  const updateReceivable = async (updatedReceivable: T.Receivable) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedReceivable;
        try {
            await updateDoc(doc(firestoreDb, 'receivables', id), data);
            setReceivables(prev => prev.map(r => r.id === id ? updatedReceivable : r));
        } catch (e) { console.error("Error updating receivable: ", e); }
    };
  const deleteReceivable = async (id: string) => {
        if (!firestoreDb) return;
        try {
            const batch = writeBatch(firestoreDb);
            batch.delete(doc(firestoreDb, "receivables", id));
            const paymentsQuery = query(collection(firestoreDb, "receivablePayments"), where("receivableId", "==", id));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            setReceivables(prev => prev.filter(r => r.id !== id));
            setReceivablePayments(prev => prev.filter(p => p.receivableId !== id));
        } catch (e) { console.error("Error deleting receivable and payments: ", e); }
    };

  const addReceivablePayment = async (payment: Omit<T.ReceivablePayment, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'receivablePayments'), payment);
            setReceivablePayments(prev => [...prev, { ...payment, id: docRef.id }]);
        } catch (e) { console.error("Error adding receivable payment: ", e); }
    };
  const updateReceivablePayment = async (updatedPayment: T.ReceivablePayment) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedPayment;
        try {
            await updateDoc(doc(firestoreDb, 'receivablePayments', id), data);
            setReceivablePayments(prev => prev.map(p => p.id === id ? updatedPayment : p));
        } catch (e) { console.error("Error updating receivable payment: ", e); }
    };
  const deleteReceivablePayment = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'receivablePayments', id));
            setReceivablePayments(prev => prev.filter(p => p.id !== id));
        } catch (e) { console.error("Error deleting receivable payment: ", e); }
    };

  const addExchangeLog = async (log: Omit<T.ExchangeLog, 'id'>) => {
    if (!firestoreDb) return;
    try {
      const docRef = await addDoc(collection(firestoreDb, 'exchangeLogs'), log);
      setExchangeLogs(prev => [...prev, { ...log, id: docRef.id }]);
    } catch (e) { console.error("Error adding exchange log: ", e); }
  };
  const updateExchangeLog = async (updatedLog: T.ExchangeLog) => {
    if (!firestoreDb) return;
    const { id, ...logData } = updatedLog;
    try {
      await updateDoc(doc(firestoreDb, 'exchangeLogs', id), logData);
      setExchangeLogs(prev => prev.map(l => (l.id === id ? updatedLog : l)));
    } catch (e) { console.error("Error updating exchange log: ", e); }
  };
  const deleteExchangeLog = async (id: string) => {
    if (!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'exchangeLogs', id));
      setExchangeLogs(prev => prev.filter(l => l.id !== id));
    } catch (e) { console.error("Error deleting exchange log: ", e); }
  };
  
  const addMiscellaneousExpense = async (expense: Omit<T.MiscellaneousExpense, 'id'>) => {
    if (!firestoreDb) return;
    try {
      const docRef = await addDoc(collection(firestoreDb, 'miscellaneousExpenses'), expense);
      setMiscellaneousExpenses(prev => [...prev, { ...expense, id: docRef.id }]);
    } catch (e) { console.error("Error adding miscellaneous expense: ", e); }
  };
  const updateMiscellaneousExpense = async (updatedExpense: T.MiscellaneousExpense) => {
    if (!firestoreDb) return;
    const { id, ...expenseData } = updatedExpense;
    try {
      await updateDoc(doc(firestoreDb, 'miscellaneousExpenses', id), expenseData);
      setMiscellaneousExpenses(prev => prev.map(e => (e.id === id ? updatedExpense : e)));
    } catch (e) { console.error("Error updating miscellaneous expense: ", e); }
  };
  const deleteMiscellaneousExpense = async (id: string) => {
    if (!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'miscellaneousExpenses', id));
      setMiscellaneousExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error("Error deleting miscellaneous expense: ", e); }
  };
  
  const addPartner = async (partner: Omit<T.Partner, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'partners'), partner);
            setPartners(prev => [...prev, { ...partner, id: docRef.id }]);
        } catch (e) { console.error("Error adding partner: ", e); }
    };
  const updatePartner = async (updatedPartner: T.Partner) => {
        if (!firestoreDb) return;
        const { id, ...partnerData } = updatedPartner;
        try {
            await updateDoc(doc(firestoreDb, 'partners', id), partnerData);
            setPartners(prev => prev.map(p => p.id === id ? updatedPartner : p));
        } catch (e) { console.error("Error updating partner: ", e); }
    };
  const deletePartner = async (id: string) => {
        if (!firestoreDb) return;
        if (id === 'default-me') { alert("Không thể xóa đối tác mặc định 'Tôi'."); return; }
        const isPartnerInProject = projects.some(p => p.isPartnership && p.partnerShares?.some(s => s.partnerId === id));
        if (isPartnerInProject) {
            alert('Không thể xóa đối tác này vì họ đang được liên kết với một hoặc nhiều dự án hợp tác.'); return;
        }
        const isPartnerInWithdrawal = withdrawals.some(w => w.withdrawnBy === id);
        if (isPartnerInWithdrawal) {
            alert('Không thể xóa đối tác này vì họ có giao dịch rút tiền liên quan.'); return;
        }
        const isPartnerInMiscExpense = miscellaneousExpenses.some(e => e.isPartnership && e.partnerShares?.some(s => s.partnerId === id));
        if (isPartnerInMiscExpense) {
            alert('Không thể xóa đối tác này vì họ được phân bổ trong một chi phí hợp tác.'); return;
        }

        try {
            await deleteDoc(doc(firestoreDb, "partners", id));
            setPartners(prev => prev.filter(p => p.id !== id));
        } catch (e) { console.error("Error deleting partner: ", e); }
    };

  const addWithdrawal = async (withdrawal: Omit<T.Withdrawal, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'withdrawals'), withdrawal);
            setWithdrawals(prev => [...prev, { ...withdrawal, id: docRef.id }]);
        } catch (e) { console.error("Error adding withdrawal: ", e); }
    };
  const updateWithdrawal = async (updatedWithdrawal: T.Withdrawal) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedWithdrawal;
        try {
            await updateDoc(doc(firestoreDb, 'withdrawals', id), data);
            setWithdrawals(prev => prev.map(w => (w.id === id ? updatedWithdrawal : w)));
        } catch (e) { console.error("Error updating withdrawal: ", e); }
    };
  const deleteWithdrawal = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'withdrawals', id));
            setWithdrawals(prev => prev.filter(w => w.id !== id));
        } catch (e) { console.error("Error deleting withdrawal: ", e); }
    };

  const addDebtPayment = async (payment: Omit<T.DebtPayment, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'debtPayments'), payment);
            setDebtPayments(prev => [...prev, { ...payment, id: docRef.id }]);
        } catch (e) { console.error("Error adding debt payment: ", e); }
    };
  const updateDebtPayment = async (updatedPayment: T.DebtPayment) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedPayment;
        try {
            await updateDoc(doc(firestoreDb, 'debtPayments', id), data);
            setDebtPayments(prev => prev.map(p => (p.id === id ? updatedPayment : p)));
        } catch (e) { console.error("Error updating debt payment: ", e); }
    };
  const deleteDebtPayment = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'debtPayments', id));
            setDebtPayments(prev => prev.filter(p => p.id !== id));
        } catch (e) { console.error("Error deleting debt payment: ", e); }
    };
  
  const addTaxPayment = async (payment: Omit<T.TaxPayment, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'taxPayments'), payment);
            setTaxPayments(prev => [...prev, { ...payment, id: docRef.id }]);
        } catch (e) { console.error("Error adding tax payment: ", e); }
    };

  const addCapitalInflow = async (inflow: Omit<T.CapitalInflow, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'capitalInflows'), inflow);
            setCapitalInflows(prev => [...prev, { ...inflow, id: docRef.id }]);
        } catch (e) { console.error("Error adding capital inflow: ", e); }
    };
  const updateCapitalInflow = async (updatedInflow: T.CapitalInflow) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedInflow;
        try {
            await updateDoc(doc(firestoreDb, 'capitalInflows', id), data);
            setCapitalInflows(prev => prev.map(i => (i.id === updatedInflow.id ? updatedInflow : i)));
        } catch (e) { console.error("Error updating capital inflow: ", e); }
    };
  const deleteCapitalInflow = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'capitalInflows', id));
            setCapitalInflows(prev => prev.filter(i => i.id !== id));
        } catch (e) { console.error("Error deleting capital inflow: ", e); }
    };
  
    const updateTaxSettings = async (settings: T.TaxSettings) => {
        if (!firestoreDb) return;
        try {
            await setDoc(doc(firestoreDb, 'settings', 'tax'), settings);
            setTaxSettings(settings);
        } catch (e) { console.error("Error updating tax settings: ", e); }
    };
  
  const addCategory = async (category: Omit<T.Category, 'id'>) => {
    if (!firestoreDb) return;
    if (categories.some(c => c.name.trim().toLowerCase() === category.name.trim().toLowerCase())) {
      alert('Tên hạng mục đã tồn tại.'); return;
    }
    try {
      const docRef = await addDoc(collection(firestoreDb, 'categories'), category);
      setCategories(prev => [...prev, { ...category, id: docRef.id }]);
    } catch (e) { console.error("Error adding category: ", e); }
  };
  const updateCategory = async (updatedCategory: T.Category) => {
    if (!firestoreDb) return;
    if (categories.some(c => c.id !== updatedCategory.id && c.name.trim().toLowerCase() === updatedCategory.name.trim().toLowerCase())) {
      alert('Tên hạng mục đã tồn tại.'); return;
    }
    const { id, ...categoryData } = updatedCategory;
    try {
      await setDoc(doc(firestoreDb, 'categories', id), categoryData);
      setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c));
    } catch (e) { console.error("Error updating category: ", e); }
  };
  const deleteCategory = async (id: string): Promise<boolean> => {
    if (!firestoreDb) return false;
    if (niches.some(n => n.categoryId === id) || projects.some(p => p.categoryId === id)) {
      alert('Không thể xóa hạng mục đang được sử dụng.'); return false;
    }
    try {
      await deleteDoc(doc(firestoreDb, 'categories', id));
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (e) {
      console.error("Error deleting category: ", e);
      return false;
    }
  };

  const addNiche = async (niche: Omit<T.Niche, 'id'>) => {
    if (!firestoreDb) return;
    if (niches.some(n => n.name.trim().toLowerCase() === niche.name.trim().toLowerCase() && n.categoryId === niche.categoryId)) {
      alert('Tên ngách đã tồn tại trong hạng mục này.'); return;
    }
    try {
      const docRef = await addDoc(collection(firestoreDb, 'niches'), niche);
      setNiches(prev => [...prev, { ...niche, id: docRef.id }]);
    } catch (e) { console.error("Error adding niche: ", e); }
  };
  const updateNiche = async (updatedNiche: T.Niche) => {
    if (!firestoreDb) return;
    if (niches.some(n => n.id !== updatedNiche.id && n.name.trim().toLowerCase() === updatedNiche.name.trim().toLowerCase() && n.categoryId === updatedNiche.categoryId)) {
      alert('Tên ngách đã tồn tại trong hạng mục này.'); return;
    }
    const { id, ...nicheData } = updatedNiche;
    try {
      await setDoc(doc(firestoreDb, 'niches', id), nicheData);
      setNiches(prev => prev.map(n => n.id === id ? updatedNiche : n));
    } catch (e) { console.error("Error updating niche: ", e); }
  };
  const deleteNiche = async (id: string): Promise<boolean> => {
    if (!firestoreDb) return false;
    if (projects.some(p => p.nicheId === id)) {
      alert('Không thể xóa ngách đang được sử dụng.'); return false;
    }
    try {
      await deleteDoc(doc(firestoreDb, 'niches', id));
      setNiches(prev => prev.filter(n => n.id !== id));
      return true;
    } catch (e) {
      console.error("Error deleting niche: ", e);
      return false;
    }
  };

    // FIX: Add CRUD functions for period-specific debts and receivables
    const addPeriodLiability = async (liability: Omit<T.PeriodLiability, 'id' | 'period'>) => {
        if (!activePeriod || !firestoreDb) return;
        const newLiabilityData = { ...liability, period: activePeriod };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'periodLiabilities'), newLiabilityData);
            setPeriodLiabilities(prev => [...prev, { ...newLiabilityData, id: docRef.id }]);
        } catch (e) { console.error("Error adding period liability: ", e); }
    };
    const updatePeriodLiability = async (updatedLiability: T.PeriodLiability) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedLiability;
        try {
            await updateDoc(doc(firestoreDb, 'periodLiabilities', id), data);
            setPeriodLiabilities(prev => prev.map(l => l.id === id ? updatedLiability : l));
        } catch (e) { console.error("Error updating period liability: ", e); }
    };
    const deletePeriodLiability = async (id: string) => {
        if (!firestoreDb) return;
        try {
            const batch = writeBatch(firestoreDb);
            batch.delete(doc(firestoreDb, "periodLiabilities", id));
            const paymentsQuery = query(collection(firestoreDb, "periodDebtPayments"), where("periodLiabilityId", "==", id));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            setPeriodLiabilities(prev => prev.filter(l => l.id !== id));
            setPeriodDebtPayments(prev => prev.filter(p => p.periodLiabilityId !== id));
        } catch (e) { console.error("Error deleting period liability and payments: ", e); }
    };
    const addPeriodDebtPayment = async (payment: Omit<T.PeriodDebtPayment, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'periodDebtPayments'), payment);
            setPeriodDebtPayments(prev => [...prev, { ...payment, id: docRef.id }]);
        } catch (e) { console.error("Error adding period debt payment: ", e); }
    };

    const addPeriodReceivable = async (receivable: Omit<T.PeriodReceivable, 'id' | 'period'>) => {
        if (!activePeriod || !firestoreDb) return;
        const newReceivableData = { ...receivable, period: activePeriod };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'periodReceivables'), newReceivableData);
            setPeriodReceivables(prev => [...prev, { ...newReceivableData, id: docRef.id }]);
        } catch (e) { console.error("Error adding period receivable: ", e); }
    };
    const updatePeriodReceivable = async (updatedReceivable: T.PeriodReceivable) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedReceivable;
        try {
            await updateDoc(doc(firestoreDb, 'periodReceivables', id), data);
            setPeriodReceivables(prev => prev.map(r => r.id === id ? updatedReceivable : r));
        } catch (e) { console.error("Error updating period receivable: ", e); }
    };
    const deletePeriodReceivable = async (id: string) => {
        if (!firestoreDb) return;
        try {
            const batch = writeBatch(firestoreDb);
            batch.delete(doc(firestoreDb, "periodReceivables", id));
            const paymentsQuery = query(collection(firestoreDb, "periodReceivablePayments"), where("periodReceivableId", "==", id));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            setPeriodReceivables(prev => prev.filter(r => r.id !== id));
            setPeriodReceivablePayments(prev => prev.filter(p => p.periodReceivableId !== id));
        } catch (e) { console.error("Error deleting period receivable and payments: ", e); }
    };
    const addPeriodReceivablePayment = async (payment: Omit<T.PeriodReceivablePayment, 'id'>) => {
        if (!firestoreDb) return;
        try {
            const docRef = await addDoc(collection(firestoreDb, 'periodReceivablePayments'), payment);
            setPeriodReceivablePayments(prev => [...prev, { ...payment, id: docRef.id }]);
        } catch (e) { console.error("Error adding period receivable payment: ", e); }
    };


    const updatePeriodsInFirestore = async (newActivePeriod: string | null, newClosedPeriods: T.ClosedPeriod[]) => {
        if (!firestoreDb) return;
        try {
            const periodsDocRef = doc(firestoreDb, 'settings', 'periods');
            await setDoc(periodsDocRef, { activePeriod: newActivePeriod, closedPeriods: newClosedPeriods });
        } catch (e) { console.error("Error updating period settings: ", e); }
    };
  
    const openPeriod = async (period: string) => {
        const newActivePeriod = period;
        await updatePeriodsInFirestore(newActivePeriod, closedPeriods);
        setActivePeriod(newActivePeriod);
        setViewingPeriodInternal(null);
    };

    const closePeriod = async (period: string) => {
        const newClosedPeriods = [...closedPeriods, { period, closedAt: new Date().toISOString() }];
        const newActivePeriod = null;
        await updatePeriodsInFirestore(newActivePeriod, newClosedPeriods);
        setClosedPeriods(newClosedPeriods);
        setActivePeriod(newActivePeriod);
        setViewingPeriodInternal(null);
    };

  const setViewingPeriod = (period: string) => { setViewingPeriodInternal(period); };
  const clearViewingPeriod = () => { setViewingPeriodInternal(null); };
  
  const currentPeriod = viewingPeriod || activePeriod;
  const isReadOnly = !!viewingPeriod;
  
  const adAccountMap = useMemo(() => new Map(adAccounts.map(acc => [acc.accountNumber, acc])), [adAccounts]);

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
        } else {
            const fromKey = getAccountKey(event.adsPlatform, event.fromAdAccountNumber);
            const toKey = getAccountKey(event.adsPlatform, event.toAdAccountNumber);
            if (!ledgersByAccount.has(fromKey)) continue;
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
            toLedger.push(...transferredChunks);
            ledgersByAccount.set(fromKey, fromLedger.filter(item => item.amount > 0.001));
        }
    }

    const consumableLedgers = new Map(Array.from(ledgersByAccount.entries()).map(([key, items]) => 
        [key, items.map(item => ({...item}))]
    ));

    const sortedCosts = [...dailyAdCosts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedCosts.map(cost => {
        const project = projectMap.get(cost.projectId);
        const accountDetails = adAccountMap.get(cost.adAccountNumber);
        
        if (!project || !accountDetails) {
            return { ...cost, vndCost: 0, effectiveRate: 0 };
        }

        const platformForCosting = accountDetails.adsPlatform;
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
        
        if (costRemaining > 0.001) {
            const relevantDeposits = adDeposits.filter(d => d.adAccountNumber === cost.adAccountNumber).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const lastRate = relevantDeposits.length > 0 ? relevantDeposits[relevantDeposits.length - 1].rate : 25000;
            totalVndCost += costRemaining * lastRate;
        }

        return { ...cost, vndCost: totalVndCost, effectiveRate: cost.amount > 0 ? totalVndCost / cost.amount : 0 };
    });
  }, [dailyAdCosts, adDeposits, adFundTransfers, projects, adAccountMap]);

  const enrichedAssets = useMemo<EnrichedAsset[]>(() => {
        const assetOwnerStats = new Map<string, Map<string, { received: number, withdrawn: number }>>();
        const projectMap = new Map<string, T.Project>(projects.map(p => [p.id, p]));
        const mePartnerId = 'default-me';
        const assetMap = new Map(assets.map(a => [a.id, a]));
        const addValue = (assetId: string, partnerId: string, value: number, type: 'received' | 'withdrawn') => {
            if (!assetId || !partnerId || value === 0 || typeof assetId !== 'string' || typeof partnerId !== 'string') return;
            if (!assetOwnerStats.has(assetId)) assetOwnerStats.set(assetId, new Map());
            const ownerStats = assetOwnerStats.get(assetId)!;
            if (!ownerStats.has(partnerId)) ownerStats.set(partnerId, { received: 0, withdrawn: 0 });
            ownerStats.get(partnerId)![type] += value;
        };

        commissions.forEach(comm => {
            const project = projectMap.get(comm.projectId);
            const value = comm.usdAmount; 
            if (project?.isPartnership && project.partnerShares) {
                project.partnerShares.forEach(share => addValue(comm.assetId, share.partnerId, value * (share.sharePercentage / 100), 'received'));
            } else { addValue(comm.assetId, mePartnerId, value, 'received'); }
        });
        adDeposits.forEach(deposit => addValue(deposit.assetId, mePartnerId, deposit.vndAmount, 'withdrawn'));
        miscellaneousExpenses.forEach(exp => {
            if (exp.isPartnership && exp.partnerShares) {
                exp.partnerShares.forEach(share => addValue(exp.assetId, share.partnerId, exp.amount * (share.sharePercentage / 100), 'withdrawn'));
            } else if (exp.projectId) {
                const project = projectMap.get(exp.projectId);
                if (project?.isPartnership && project.partnerShares) {
                    project.partnerShares.forEach(share => addValue(exp.assetId, share.partnerId, exp.amount * (share.sharePercentage / 100), 'withdrawn'));
                } else { addValue(exp.assetId, mePartnerId, exp.amount, 'withdrawn'); }
            } else { addValue(exp.assetId, mePartnerId, exp.amount, 'withdrawn'); }
        });
        [...exchangeLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(log => {
            const sellingAssetStats = assetOwnerStats.get(log.sellingAssetId);
            const balances = new Map<string, number>();
            let totalPositiveBalance = 0;
            if (sellingAssetStats) {
                sellingAssetStats.forEach((stats, partnerId) => {
                    const balance = stats.received - stats.withdrawn;
                    balances.set(partnerId, balance);
                    if (balance > 0) totalPositiveBalance += balance;
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
        withdrawals.forEach(w => addValue(w.assetId, w.withdrawnBy, w.amount, 'withdrawn'));
        debtPayments.forEach(p => addValue(p.assetId, mePartnerId, p.amount, 'withdrawn'));
        taxPayments.forEach(p => addValue(p.assetId, mePartnerId, p.amount, 'withdrawn'));
        
        capitalInflows.forEach(inflow => {
            const partnerToCredit = inflow.contributedByPartnerId || mePartnerId;
            addValue(inflow.assetId, partnerToCredit, inflow.amount, 'received');
        });

        receivablePayments.forEach(p => { if (assetMap.has(p.assetId)) addValue(p.assetId, mePartnerId, p.amount, 'received'); });
        receivables.forEach(r => { if (assetMap.has(r.outflowAssetId)) addValue(r.outflowAssetId, mePartnerId, r.totalAmount, 'withdrawn'); });
        
        const partnerMap = new Map<string, string>(partners.map(p => [p.id, p.name]));
        return assets.map(asset => {
            const ownerStatsMap = assetOwnerStats.get(asset.id);
            let totalReceived = 0, totalWithdrawn = 0;
            const ownersData: {id: string, name: string, received: number, withdrawn: number}[] = [];
            if (ownerStatsMap) {
                for (const [ownerId, stats] of ownerStatsMap.entries()) {
                    totalReceived += stats.received; totalWithdrawn += stats.withdrawn;
                    if (stats.received > 0 || stats.withdrawn > 0) {
                         ownersData.push({ id: ownerId, name: partnerMap.get(ownerId) || 'N/A', ...stats });
                    }
                }
            }
            const currentBalance = asset.balance + totalReceived - totalWithdrawn;
            const hasPartnerFlow = ownersData.some(o => o.id !== mePartnerId);
            return { ...asset, balance: currentBalance, totalReceived, totalWithdrawn,
                owners: ownersData.sort((a,b) => (a.id === mePartnerId ? -1 : b.id === mePartnerId ? 1 : a.name.localeCompare(b.name))),
                isExpandable: hasPartnerFlow,
            };
        });
    }, [assets, projects, partners, commissions, exchangeLogs, withdrawals, adDeposits, miscellaneousExpenses, debtPayments, taxPayments, capitalInflows, receivables, receivablePayments]);
    
  const periodAssetDetails = useMemo<PeriodAssetDetail[]>(() => {
    if (!currentPeriod) return [];
    
    return assets.map(asset => {
        const enriched = enrichedAssets.find(a => a.id === asset.id);
        const closingBalance = enriched?.balance ?? asset.balance;
        
        let change = 0;
        
        // Inflows this period
        commissions.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change += asset.currency === 'USD' ? t.usdAmount : t.vndAmount);
        exchangeLogs.filter(t => isDateInPeriod(t.date, currentPeriod) && t.receivingAssetId === asset.id).forEach(t => change += t.vndAmount);
        receivablePayments.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change += t.amount);
        capitalInflows.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change += t.amount);
        
        // Outflows this period
        adDeposits.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change -= t.vndAmount);
        exchangeLogs.filter(t => isDateInPeriod(t.date, currentPeriod) && t.sellingAssetId === asset.id).forEach(t => change -= t.usdAmount);
        miscellaneousExpenses.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change -= t.amount);
        debtPayments.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change -= t.amount);
        withdrawals.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change -= t.amount);
        taxPayments.filter(t => isDateInPeriod(t.date, currentPeriod) && t.assetId === asset.id).forEach(t => change -= t.amount);
        receivables.filter(t => isDateInPeriod(t.creationDate, currentPeriod) && t.outflowAssetId === asset.id).forEach(t => change -= t.totalAmount);

        const openingBalance = closingBalance - change;

        return { id: asset.id, name: asset.name, currency: asset.currency, openingBalance, change, closingBalance };
    });
  }, [currentPeriod, assets, enrichedAssets, commissions, exchangeLogs, receivablePayments, capitalInflows, adDeposits, miscellaneousExpenses, debtPayments, withdrawals, taxPayments, receivables]);

  const periodFinancials = useMemo<T.PeriodFinancials | null>(() => {
        if (!currentPeriod || !periodAssetDetails) return null;
        const mePartnerId = 'default-me';
        const assetMap = new Map<string, T.Asset>(assets.map(a => [a.id, a]));
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
        
        const projectPnL = new Map<string, { revenue: number, cost: number, inputVat: number }>();
        periodProjects.forEach(p => projectPnL.set(p.id, { revenue: 0, cost: 0, inputVat: 0 }));

        periodCommissions.forEach(c => {
            const pnl = projectPnL.get(c.projectId);
            if (pnl) pnl.revenue += c.vndAmount;
        });

        periodAdCosts.forEach(c => {
            const pnl = projectPnL.get(c.projectId);
            if (pnl) {
                pnl.cost += c.vndCost;
                pnl.inputVat += c.vndCost * (c.vatRate || 0) / 100;
            }
        });

        periodMiscExpenses.forEach(e => {
            if (e.projectId) {
                const pnl = projectPnL.get(e.projectId);
                if (pnl) {
                    pnl.cost += e.vndAmount;
                    pnl.inputVat += e.vndAmount * (e.vatRate || 0) / 100;
                }
            }
        });
        
        let exchangeRateGainLoss = 0;
        const commissionLedger = new Map<string, {amount: number, predictedRate: number}[]>();
        periodCommissions.forEach(c => {
            if(!commissionLedger.has(c.assetId)) commissionLedger.set(c.assetId, []);
            commissionLedger.get(c.assetId)!.push({amount: c.usdAmount, predictedRate: c.predictedRate});
        });
        periodExchangeLogs.forEach(log => {
            const ledger = commissionLedger.get(log.sellingAssetId);
            if(!ledger) return;
            let amountToProcess = log.usdAmount;
            while(amountToProcess > 0 && ledger.length > 0) {
                const chunk = ledger[0];
                const amountFromChunk = Math.min(amountToProcess, chunk.amount);
                exchangeRateGainLoss += amountFromChunk * (log.rate - chunk.predictedRate);
                chunk.amount -= amountFromChunk;
                amountToProcess -= amountFromChunk;
                if(chunk.amount < 0.001) ledger.shift();
            }
        });
        
        const totalRevenue = Array.from(projectPnL.values()).reduce((sum, pnl) => sum + pnl.revenue, 0) + exchangeRateGainLoss;
        const totalAdCost = periodAdCosts.reduce((sum, c) => sum + c.vndCost, 0);
        const totalMiscCost = periodMiscExpenses.reduce((sum, e) => sum + e.vndAmount, 0);
        const totalCost = totalAdCost + totalMiscCost;
        const totalInputVat = periodAdCosts.reduce((s, c) => s + c.vndCost * (c.vatRate || 0)/100, 0) + periodMiscExpenses.reduce((s, e) => s + e.vndAmount * (e.vatRate || 0)/100, 0);
        const totalProfit = totalRevenue - totalCost;

        const partnerPnl = new Map<string, { revenue: number, cost: number, profit: number, inputVat: number }>();
        partners.forEach(p => partnerPnl.set(p.id, { revenue: 0, cost: 0, profit: 0, inputVat: 0 }));

        periodProjects.forEach(p => {
            const pnl = projectPnL.get(p.id);
            if (!pnl) return;
            const shares = p.isPartnership ? p.partnerShares : [{ partnerId: mePartnerId, sharePercentage: 100 }];
            shares?.forEach(share => {
                const partner = partnerPnl.get(share.partnerId);
                if (partner) {
                    const ratio = share.sharePercentage / 100;
                    partner.revenue += pnl.revenue * ratio;
                    partner.cost += pnl.cost * ratio;
                    partner.inputVat += pnl.inputVat * ratio;
                }
            });
        });

        periodMiscExpenses.filter(e => !e.projectId).forEach(e => {
            const shares = e.isPartnership ? e.partnerShares : [{ partnerId: mePartnerId, sharePercentage: 100 }];
            shares?.forEach(share => {
                 const partner = partnerPnl.get(share.partnerId);
                 if(partner) {
                     const ratio = share.sharePercentage / 100;
                     partner.cost += e.vndAmount * ratio;
                     partner.inputVat += e.vndAmount * (e.vatRate || 0) / 100 * ratio;
                 }
            });
        });

        partnerPnl.forEach((pnl, id) => {
            const partnerShareOfGainLoss = (id === mePartnerId) ? exchangeRateGainLoss : 0; // Simplified
            pnl.revenue += partnerShareOfGainLoss;
            pnl.profit = pnl.revenue - pnl.cost;
        });

        const myPnl = partnerPnl.get(mePartnerId) || { revenue: 0, cost: 0, profit: 0, inputVat: 0 };

        const { taxSeparationAmount = 0 } = taxSettings;
        const initialRevenueBase = taxSettings.incomeTaxBase === 'personal' ? myPnl.revenue : totalRevenue;
        const revenueBase = Math.max(0, initialRevenueBase - taxSeparationAmount);
        const costBase = taxSettings.incomeTaxBase === 'personal' ? myPnl.cost : totalCost;
        const profitBase = revenueBase - costBase;
        const vatOutputBase = taxSettings.vatOutputBase === 'personal' ? myPnl.revenue : totalRevenue;
        const vatInputBase = taxSettings.vatInputMethod === 'manual' 
            ? taxSettings.manualInputVat
            : (taxSettings.vatInputBase === 'personal' ? myPnl.inputVat : totalInputVat);
        
        let taxPayable=0, incomeTax=0, netVat=0, outputVat=0;

        if(taxSettings.method === 'revenue'){
            taxPayable = revenueBase * (taxSettings.revenueRate/100);
        } else {
            outputVat = vatOutputBase * (taxSettings.vatRate/100);
            netVat = outputVat - vatInputBase;
            incomeTax = Math.max(0, profitBase) * (taxSettings.incomeRate/100);
            taxPayable = Math.max(0, netVat) + incomeTax;
        }

        const partnerPnlDetails = Array.from(partnerPnl.entries()).map(([partnerId, pnl]) => {
             const { taxSeparationAmount = 0 } = taxSettings;
             const partnerInitialRevenueBase = taxSettings.incomeTaxBase === 'personal' ? pnl.revenue : totalRevenue;
             const partnerRevenueBase = Math.max(0, partnerInitialRevenueBase - (partnerId === mePartnerId ? taxSeparationAmount : 0)); // only apply separation to 'me'
             const partnerCostBase = taxSettings.incomeTaxBase === 'personal' ? pnl.cost : totalCost;
             const partnerProfitBase = partnerRevenueBase - partnerCostBase;
             const partnerVatOutputBase = taxSettings.vatOutputBase === 'personal' ? pnl.revenue : totalRevenue;
             const partnerVatInputBase = taxSettings.vatInputMethod === 'manual' ? taxSettings.manualInputVat : (taxSettings.vatInputBase === 'personal' ? pnl.inputVat : totalInputVat);
             
             let partnerTaxPayable=0;
             if(taxSettings.method === 'revenue'){
                partnerTaxPayable = partnerRevenueBase * (taxSettings.revenueRate/100);
             } else {
                 const partnerOutputVat = partnerVatOutputBase * (taxSettings.vatRate/100);
                 const partnerNetVat = partnerOutputVat - partnerVatInputBase;
                 const partnerIncomeTax = Math.max(0, partnerProfitBase) * (taxSettings.incomeRate/100);
                 partnerTaxPayable = Math.max(0, partnerNetVat) + partnerIncomeTax;
             }
            
            return {
                partnerId,
                name: partners.find(p => p.id === partnerId)?.name || 'N/A',
                ...pnl,
                taxPayable: partnerId === mePartnerId ? taxPayable : partnerTaxPayable,
            };
        });

        const cashFlow = {
            operating: { inflows: [] as T.CashFlowDetails[], outflows: [] as T.CashFlowDetails[], net: 0 },
            investing: { inflows: [] as T.CashFlowDetails[], outflows: [] as T.CashFlowDetails[], net: 0 },
            financing: { inflows: [] as T.CashFlowDetails[], outflows: [] as T.CashFlowDetails[], net: 0 },
            netChange: 0, beginningBalance: 0, endBalance: 0,
        };
        const addCashFlow = (category: 'operating' | 'investing' | 'financing', type: 'inflows' | 'outflows', label: string, amount: number) => {
            if(amount === 0) return;
            cashFlow[category][type].push({label, amount});
        }
        
        // Operating - Inflows
        addCashFlow('operating', 'inflows', 'Từ hoa hồng', periodCommissions.reduce((s, c) => {
             const receivingAsset = assetMap.get(c.assetId);
             if(!receivingAsset || receivingAsset.currency !== 'VND') return s;
             return s + c.vndAmount;
        }, 0));
        addCashFlow('operating', 'inflows', 'Từ thu nợ phải thu', periodReceivablePayments.reduce((s, p) => s + p.amount, 0));
        addCashFlow('operating', 'inflows', 'Từ bán USD', periodExchangeLogs.reduce((s, l) => s + l.vndAmount, 0));

        // Operating - Outflows
        addCashFlow('operating', 'outflows', 'Nạp tiền Ads', periodAdDeposits.reduce((s, d) => s + d.vndAmount, 0));
        addCashFlow('operating', 'outflows', 'Chi phí phát sinh', periodMiscExpenses.reduce((s, e) => s + e.vndAmount, 0));
        addCashFlow('operating', 'outflows', 'Trả nợ', periodDebtPayments.reduce((s, p) => s + p.amount, 0));
        addCashFlow('operating', 'outflows', 'Nộp thuế', periodTaxPayments.reduce((s, p) => s + p.amount, 0));
        
        // Investing - Outflows
        addCashFlow('investing', 'outflows', 'Tạo khoản phải thu', periodReceivables.reduce((s,r) => s+r.totalAmount, 0));

        // Financing - Inflows & Outflows
        addCashFlow('financing', 'inflows', 'Vốn góp', periodCapitalInflows.reduce((s,i)=>s+i.amount, 0));
        addCashFlow('financing', 'outflows', 'Rút vốn', periodWithdrawals.reduce((s,w)=>s+w.vndAmount, 0));
        
        cashFlow.operating.net = cashFlow.operating.inflows.reduce((s,i)=>s+i.amount,0) - cashFlow.operating.outflows.reduce((s,i)=>s+i.amount,0);
        cashFlow.investing.net = cashFlow.investing.inflows.reduce((s,i)=>s+i.amount,0) - cashFlow.investing.outflows.reduce((s,i)=>s+i.amount,0);
        cashFlow.financing.net = cashFlow.financing.inflows.reduce((s,i)=>s+i.amount,0) - cashFlow.financing.outflows.reduce((s,i)=>s+i.amount,0);
        
        cashFlow.netChange = cashFlow.operating.net + cashFlow.investing.net + cashFlow.financing.net;
        cashFlow.beginningBalance = periodAssetDetails.filter(a => a.currency === 'VND').reduce((sum, a) => sum + a.openingBalance, 0);
        cashFlow.endBalance = cashFlow.beginningBalance + cashFlow.netChange;

        return {
            totalRevenue, totalAdCost, totalMiscCost, totalCost, totalProfit, totalInputVat,
            myRevenue: myPnl.revenue, myCost: myPnl.cost, myProfit: myPnl.profit, myInputVat: myPnl.inputVat,
            exchangeRateGainLoss, profitBeforeTax: totalProfit, netProfit: totalProfit - taxPayable, tax: { taxPayable, incomeTax, netVat, outputVat },
            taxBases: { initialRevenueBase, taxSeparationAmount, revenueBase, costBase, profitBase, vatOutputBase, vatInputBase },
            partnerPnlDetails, cashFlow,
            revenueDetails: Array.from(projectPnL.entries()).map(([id, pnl]) => ({name: projectMap.get(id) || 'N/A', amount: pnl.revenue})).filter(d => d.amount > 0),
            adCostDetails: periodAdCosts.map(c => ({name: projectMap.get(c.projectId) || 'N/A', amount: c.vndCost})).filter(d => d.amount > 0),
            miscCostDetails: periodMiscExpenses.map(e => ({name: e.description, amount: e.vndAmount})).filter(d => d.amount > 0),
        };
    }, [
        currentPeriod, taxSettings, partners, projects, enrichedDailyAdCosts, commissions, miscellaneousExpenses,
        exchangeLogs, debtPayments, withdrawals, adDeposits, taxPayments, capitalInflows, receivables, receivablePayments,
        periodAssetDetails, assets
    ]);

    const masterProjects = useMemo(() => {
        const uniqueProjects = new Map<string, { name: string; categoryId?: string; nicheId?: string; }>();
        projects.forEach(p => {
            const key = p.name.trim().toLowerCase();
            if (!uniqueProjects.has(key)) {
                uniqueProjects.set(key, { name: p.name, categoryId: p.categoryId, nicheId: p.nicheId });
            }
        });
        return Array.from(uniqueProjects.values());
    }, [projects]);


  return (
    <DataContext.Provider value={{ 
        isLoading, projects, addProject, updateProject, deleteProject, adAccounts, addAdAccount, updateAdAccount,
        deleteAdAccount, dailyAdCosts, addDailyAdCost, updateDailyAdCost, deleteDailyAdCost,
        partners, addPartner, updatePartner, deletePartner,
        assetTypes, addAssetType, updateAssetType, deleteAssetType,
        assets, addAsset, updateAsset, deleteAsset,
        commissions, addCommission, updateCommission, deleteCommission,
        exchangeLogs, addExchangeLog, updateExchangeLog, deleteExchangeLog,
        miscellaneousExpenses, addMiscellaneousExpense, updateMiscellaneousExpense, deleteMiscellaneousExpense,
        adDeposits, addAdDeposit, updateAdDeposit, deleteAdDeposit,
        adFundTransfers, addAdFundTransfer, updateAdFundTransfer, deleteAdFundTransfer,
        liabilities, addLiability, updateLiability, deleteLiability,
        receivables, addReceivable, updateReceivable, deleteReceivable,
        receivablePayments, addReceivablePayment, updateReceivablePayment, deleteReceivablePayment,
        withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal,
        debtPayments, addDebtPayment, updateDebtPayment, deleteDebtPayment,
        taxPayments, addTaxPayment,
        capitalInflows, addCapitalInflow, updateCapitalInflow, deleteCapitalInflow,
        taxSettings, updateTaxSettings,
        activePeriod, openPeriod, closePeriod, closedPeriods, viewingPeriod, setViewingPeriod, clearViewingPeriod,
        currentPage, setCurrentPage,
        currentPeriod, isReadOnly,
        enrichedAssets,
        enrichedDailyAdCosts,
        periodFinancials,
        periodAssetDetails,
        seedData,
        categories, addCategory, updateCategory, deleteCategory,
        niches, addNiche, updateNiche, deleteNiche,
        masterProjects,
        firebaseConfig, setFirebaseConfig,
        // Add period-specific data and functions
        periodLiabilities, addPeriodLiability, updatePeriodLiability, deletePeriodLiability,
        periodDebtPayments, addPeriodDebtPayment,
        periodReceivables, addPeriodReceivable, updatePeriodReceivable, deletePeriodReceivable,
        periodReceivablePayments, addPeriodReceivablePayment,
     }}>
      {children}
    </DataContext.Provider>
  );
};