import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import * as T from '../types';
import { Page, PeriodAssetDetail, FirebaseConfig, EnrichedAdAccount, AdAccountTransaction, EnrichedPartner, PeriodFinancials, Notification } from '../types';
import { isDateInPeriod, formatCurrency } from '../lib/utils';
import { initializeFirebase, auth, onAuthStateChanged, User } from '../lib/firebase';
import { 
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, 
    query, where, writeBatch, Firestore, setDoc, getDoc, or
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
    affiliateUrls?: T.AffiliateUrl[];
};

// Define a unified transaction type for the transaction history feature.
export type EnrichedTransaction = {
    id: string;
    date: string;
    asset: T.Asset;
    type: string;
    description: string;
    inflow: number;
    outflow: number;
    sender?: string;
    receiver?: string;
};

interface DataContextType {
  isLoading: boolean;
  projects: T.Project[];
  addProject: (project: Omit<T.Project, 'id' | 'period' | 'workspaceId'>) => Promise<void>;
  updateProject: (project: T.Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  adAccounts: T.AdAccount[];
  addAdAccount: (account: Omit<T.AdAccount, 'id' | 'workspaceId'> | Omit<T.AdAccount, 'id' | 'workspaceId'>[]) => Promise<void>;
  updateAdAccount: (account: T.AdAccount) => Promise<void>;
  deleteAdAccount: (id: string) => Promise<void>;

  dailyAdCosts: T.DailyAdCost[];
  addDailyAdCost: (cost: Omit<T.DailyAdCost, 'id' | 'workspaceId'>) => Promise<void>;
  updateDailyAdCost: (cost: T.DailyAdCost) => Promise<void>;
  deleteDailyAdCost: (id: string) => Promise<void>;

  adDeposits: T.AdDeposit[];
  addAdDeposit: (deposit: Omit<T.AdDeposit, 'id' | 'workspaceId'> | Omit<T.AdDeposit, 'id' | 'workspaceId'>[]) => Promise<void>;
  updateAdDeposit: (deposit: T.AdDeposit) => Promise<void>;
  deleteAdDeposit: (id: string) => Promise<void>;

  adFundTransfers: T.AdFundTransfer[];
  addAdFundTransfer: (transfer: Omit<T.AdFundTransfer, 'id' | 'workspaceId'>) => Promise<void>;
  updateAdFundTransfer: (transfer: T.AdFundTransfer) => Promise<void>;
  deleteAdFundTransfer: (id: string) => Promise<void>;

  commissions: T.Commission[];
  addCommission: (commission: Omit<T.Commission, 'id' | 'workspaceId'>) => Promise<void>;
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
  addLiability: (liability: Omit<T.Liability, 'id' | 'workspaceId'>) => Promise<void>;
  updateLiability: (liability: T.Liability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;

  receivables: T.Receivable[];
  addReceivable: (receivable: Omit<T.Receivable, 'id' | 'workspaceId'>) => Promise<void>;
  updateReceivable: (receivable: T.Receivable) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;

  receivablePayments: T.ReceivablePayment[];
  addReceivablePayment: (payment: Omit<T.ReceivablePayment, 'id' | 'workspaceId'>) => Promise<void>;
  updateReceivablePayment: (payment: T.ReceivablePayment) => Promise<void>;
  deleteReceivablePayment: (id: string) => Promise<void>;

  exchangeLogs: T.ExchangeLog[];
  addExchangeLog: (log: Omit<T.ExchangeLog, 'id' | 'workspaceId'>) => Promise<void>;
  updateExchangeLog: (log: T.ExchangeLog) => Promise<void>;
  deleteExchangeLog: (id: string) => Promise<void>;

  miscellaneousExpenses: T.MiscellaneousExpense[];
  addMiscellaneousExpense: (expense: Omit<T.MiscellaneousExpense, 'id' | 'workspaceId'>) => Promise<void>;
  updateMiscellaneousExpense: (expense: T.MiscellaneousExpense) => Promise<void>;
  deleteMiscellaneousExpense: (id: string) => Promise<void>;
  
  partners: T.Partner[];
  addPartner: (partner: Partial<Omit<T.Partner, 'id' | 'ownerUid' | 'ownerName'>>) => Promise<void>;
  updatePartner: (partner: T.Partner) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;

  withdrawals: T.Withdrawal[];
  addWithdrawal: (withdrawal: Omit<T.Withdrawal, 'id' | 'workspaceId'>) => Promise<void>;
  updateWithdrawal: (withdrawal: T.Withdrawal) => Promise<void>;
  deleteWithdrawal: (id: string) => Promise<void>;

  debtPayments: T.DebtPayment[];
  addDebtPayment: (payment: Omit<T.DebtPayment, 'id' | 'workspaceId'>) => Promise<void>;
  updateDebtPayment: (payment: T.DebtPayment) => Promise<void>;
  deleteDebtPayment: (id: string) => Promise<void>;

  taxPayments: T.TaxPayment[];
  addTaxPayment: (payment: Omit<T.TaxPayment, 'id' | 'workspaceId'>) => Promise<void>;

  capitalInflows: T.CapitalInflow[];
  addCapitalInflow: (inflow: Omit<T.CapitalInflow, 'id' | 'workspaceId'>) => Promise<void>;
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
  addCategory: (category: Omit<T.Category, 'id' | 'workspaceId'>) => Promise<void>;
  updateCategory: (category: T.Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;

  niches: T.Niche[];
  addNiche: (niche: Omit<T.Niche, 'id' | 'workspaceId'>) => Promise<void>;
  updateNiche: (niche: T.Niche) => Promise<void>;
  deleteNiche: (id: string) => Promise<boolean>;

  masterProjects: MasterProject[];

  firebaseConfig: T.FirebaseConfig | null;
  setFirebaseConfig: React.Dispatch<React.SetStateAction<T.FirebaseConfig | null>>;

  // Add full support for period-specific debts/receivables.
  periodLiabilities: T.PeriodLiability[];
  addPeriodLiability: (liability: Omit<T.PeriodLiability, 'id' | 'period' | 'workspaceId'>) => Promise<void>;
  updatePeriodLiability: (liability: T.PeriodLiability) => Promise<void>;
  deletePeriodLiability: (id: string) => Promise<void>;
  periodDebtPayments: T.PeriodDebtPayment[];
  addPeriodDebtPayment: (payment: Omit<T.PeriodDebtPayment, 'id' | 'workspaceId'>) => Promise<void>;

  periodReceivables: T.PeriodReceivable[];
  addPeriodReceivable: (receivable: Omit<T.PeriodReceivable, 'id' | 'period' | 'workspaceId'>) => Promise<void>;
  updatePeriodReceivable: (receivable: T.PeriodReceivable) => Promise<void>;
  deletePeriodReceivable: (id: string) => Promise<void>;
  periodReceivablePayments: T.PeriodReceivablePayment[];
  addPeriodReceivablePayment: (payment: Omit<T.PeriodReceivablePayment, 'id' | 'workspaceId'>) => Promise<void>;
  allTransactions: EnrichedTransaction[];
  enrichedAdAccounts: EnrichedAdAccount[];
  adAccountTransactions: AdAccountTransaction[];

  savings: T.Saving[];
  addSaving: (saving: Omit<T.Saving, 'id' | 'workspaceId'>) => Promise<void>;
  updateSaving: (saving: T.Saving) => Promise<void>;
  deleteSaving: (id: string) => Promise<void>;

  investments: T.Investment[];
  addInvestment: (investment: Omit<T.Investment, 'id' | 'workspaceId'>) => Promise<void>;
  updateInvestment: (investment: T.Investment) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;

  enrichedPartners: EnrichedPartner[];
  partnerLedgerEntries: T.PartnerLedgerEntry[];
  allPartnerLedgerEntries: T.PartnerLedgerEntry[];
  addPartnerLedgerEntry: (entry: Omit<T.PartnerLedgerEntry, 'id' | 'workspaceId'>) => Promise<void>;
  updatePartnerLedgerEntry: (entry: T.PartnerLedgerEntry) => Promise<void>;
  deletePartnerLedgerEntry: (id: string) => Promise<void>;
  partnerAssetBalances: Map<string, { assetId: string, assetName: string, balance: number, currency: 'VND' | 'USD' }[]>;
  user: User | null;
  authIsLoading: boolean;
  permissionError: string | null;
  // FIX: Add missing properties for toast and notifications
  toast: Notification | null;
  clearToast: () => void;
  notifications: Notification[];
  unreadCount: number;
  markNotificationsAsRead: () => void;
  partnerNameMap: Map<string, string>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Export a useData hook for cleaner consumption.
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
    'adAccounts', 'savings', 'investments', 'partnerLedger',
    'periodLiabilities', 'periodDebtPayments', 'periodReceivables', 'periodReceivablePayments',
];

const wipeAllFirestoreData = async (db: Firestore) => {
    if (!db) {
        throw new Error("DB not connected");
    }
    
    // FIX: Removed special handling for 'default-me'. The partners collection will be wiped completely.
    for (const collectionName of COLLECTION_NAMES_FOR_SEED) {
        const snapshot = await getDocs(collection(db, collectionName));
        if(snapshot.empty) continue;
        
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationCount = 0;
        
        snapshot.docs.forEach(doc => {
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


const seedInitialData = async (db: Firestore, userId: string) => {
    const batch = writeBatch(db);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentPeriod = today.toISOString().slice(0, 7);

    console.log("Seeding data for period:", currentPeriod, "and date:", todayStr);

    // 1. Settings
    batch.set(doc(db, 'settings', 'tax'), defaultTaxSettings);
    batch.set(doc(db, 'settings', 'periods'), { activePeriod: currentPeriod, closedPeriods: [] });

    // 2. Asset Types
    const typePlatformRef = doc(db, 'assetTypes', 'platform'); batch.set(typePlatformRef, { name: 'Platform' });
    const typeBankRef = doc(db, 'assetTypes', 'bank'); batch.set(typeBankRef, { name: 'Bank' });
    const typeCashRef = doc(db, 'assetTypes', 'cash'); batch.set(typeCashRef, { name: 'Cash' });
    const typeAgencyRef = doc(db, 'assetTypes', 'agency'); batch.set(typeAgencyRef, { name: 'Agency' });

    // 3. Categories & Niches
    const healthCategoryRef = doc(collection(db, 'categories'));
    batch.set(healthCategoryRef, { name: 'Sức khỏe' });
    const weightLossNicheRef = doc(collection(db, 'niches'));
    batch.set(weightLossNicheRef, { name: 'Giảm cân', categoryId: healthCategoryRef.id });

    // 4. Assets
    const vcbAssetRef = doc(collection(db, 'assets'));
    batch.set(vcbAssetRef, { name: 'Vietcombank', typeId: 'bank', balance: 0, currency: 'VND', ownershipType: 'personal' });
    const clickbankAssetRef = doc(collection(db, 'assets'));
    // FIX: Use the dynamic userId instead of hardcoded 'default-me'.
    batch.set(clickbankAssetRef, { name: 'ClickBank', typeId: 'platform', balance: 0, currency: 'USD', ownershipType: 'shared', sharedWith: [{ partnerId: userId, permission: 'full' }] });

    // 5. Projects
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
    
    // 6. Capital Inflow
    batch.set(doc(collection(db, 'capitalInflows')), {
        date: todayStr, assetId: vcbAssetRef.id, amount: 50000000, description: 'Vốn góp ban đầu',
        contributedByPartnerId: userId, // FIX: Use dynamic userId
    });

    // 7. Ad Account
    const adAccount1Ref = doc(collection(db, 'adAccounts'));
    batch.set(adAccount1Ref, { accountNumber: 'GG-ACC-001', adsPlatform: 'google', status: 'running' });

    // 8. Ad Deposit
    batch.set(doc(collection(db, 'adDeposits')), {
        date: todayStr, adsPlatform: 'google', adAccountNumber: 'GG-ACC-001', projectId: project1Ref.id,
        assetId: vcbAssetRef.id, usdAmount: 500, rate: 25500, vndAmount: 500 * 25500, status: 'running'
    });

    // 9. Daily Ad Cost
    batch.set(doc(collection(db, 'dailyAdCosts')), {
        projectId: project1Ref.id, adAccountNumber: 'GG-ACC-001', date: todayStr, amount: 50.75, vatRate: 8
    });

    // 10. Commission
    batch.set(doc(collection(db, 'commissions')), {
        projectId: project1Ref.id, date: todayStr, assetId: clickbankAssetRef.id,
        usdAmount: 350, predictedRate: 25400, vndAmount: 350 * 25400
    });
    
    // 11. Exchange Log
    batch.set(doc(collection(db, 'exchangeLogs')), {
        date: todayStr, sellingAssetId: clickbankAssetRef.id, receivingAssetId: vcbAssetRef.id,
        usdAmount: 300, rate: 25600, vndAmount: 300 * 25600
    });
    
    // 12. Miscellaneous Expense
    batch.set(doc(collection(db, 'miscellaneousExpenses')), {
        date: todayStr, description: 'Thuê VPS tháng này', assetId: vcbAssetRef.id,
        amount: 500000, vndAmount: 500000
    });
    
    // 13. Liability
    const liabilityRef = doc(collection(db, 'liabilities'));
    batch.set(liabilityRef, {
        description: 'Vay nóng bạn bè', totalAmount: 10000000, currency: 'VND',
        type: 'short-term', creationDate: todayStr
    });

    // 14. Debt Payment
    batch.set(doc(collection(db, 'debtPayments')), {
        liabilityId: liabilityRef.id, date: todayStr, amount: 1000000, assetId: vcbAssetRef.id
    });

    // 15. Receivable
    const receivableRef = doc(collection(db, 'receivables'));
    batch.set(receivableRef, {
        description: 'Tạm ứng cho Agency', totalAmount: 5000000, currency: 'VND', type: 'short-term',
        creationDate: todayStr, outflowAssetId: vcbAssetRef.id
    });

    // 16. Receivable Payment
    batch.set(doc(collection(db, 'receivablePayments')), {
        receivableId: receivableRef.id, date: todayStr, amount: 500000, assetId: vcbAssetRef.id
    });

    // 17. Withdrawal
    batch.set(doc(collection(db, 'withdrawals')), {
        date: todayStr, assetId: vcbAssetRef.id, amount: 2000000, vndAmount: 2000000,
        withdrawnBy: userId, description: 'Rút tiền cá nhân' // FIX: Use dynamic userId
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
  const [savings, setSavings] = useState<T.Saving[]>([]);
  const [investments, setInvestments] = useState<T.Investment[]>([]);
  const [partnerLedgerEntries, setPartnerLedgerEntries] = useState<T.PartnerLedgerEntry[]>([]);
  // Add state for period-specific debts/receivables.
  const [periodLiabilities, setPeriodLiabilities] = useState<T.PeriodLiability[]>([]);
  const [periodDebtPayments, setPeriodDebtPayments] = useState<T.PeriodDebtPayment[]>([]);
  const [periodReceivables, setPeriodReceivables] = useState<T.PeriodReceivable[]>([]);
  const [periodReceivablePayments, setPeriodReceivablePayments] = useState<T.PeriodReceivablePayment[]>([]);
  
  const [taxSettings, setTaxSettings] = useState<T.TaxSettings>(defaultTaxSettings);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [viewingPeriod, setViewingPeriodInternal] = useState<string | null>(null);
  const [closedPeriods, setClosedPeriods] = useState<T.ClosedPeriod[]>([]);
  const [currentPage, setCurrentPage] = useLocalStorage<Page>('currentPage', 'Dashboard');

  const [user, setUser] = useState<User | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [toast, setToast] = useState<T.Notification | null>(null);
  const [notifications, setNotifications] = useState<T.Notification[]>([]);
  
  const clearToast = () => setToast(null);

  const addNotification = (message: string, type: T.Notification['type']) => {
    const newNotification: T.Notification = {
        id: `${type}-${Date.now()}`,
        timestamp: Date.now(),
        message,
        type,
        read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    if (type === 'partner') {
        setToast(newNotification);
    }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  
  const markNotificationsAsRead = () => {
      setNotifications(prev => prev.map(n => ({...n, read: true})));
  };


  useEffect(() => {
    if (firebaseConfig) {
      const { db } = initializeFirebase(firebaseConfig);
      setFirestoreDb(db);
      
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setAuthIsLoading(false);
        });
        return () => unsubscribe();
      } else {
        setUser(null);
        setAuthIsLoading(false);
      }
    } else {
        setIsLoading(false);
        setUser(null);
        setAuthIsLoading(false);
    }
  }, [firebaseConfig]);
  
  useEffect(() => {
    if (!firestoreDb || authIsLoading) {
        return;
    }
    
    if (!user) {
        setIsLoading(false);
        return;
    }

    const fetchAllData = async () => {
        setIsLoading(true);
        setPermissionError(null);

        try {
            // Step 1: Self-heal the user's own partner record using their UID. This is the new, robust way to identify "self".
            const mePartnerRef = doc(firestoreDb, 'partners', user.uid);
            const mePartnerSnap = await getDoc(mePartnerRef);
            const myCurrentName = mePartnerSnap.exists() ? mePartnerSnap.data().name : (user.displayName || 'Tôi');
            
            if (!mePartnerSnap.exists() || !mePartnerSnap.data().isSelf) {
                await setDoc(mePartnerRef, { 
                    name: myCurrentName, 
                    ownerUid: user.uid,
                    ownerName: myCurrentName, // The owner of "me" is "me"
                    loginEmail: user.email,  // Store email for cross-workspace lookups
                    isSelf: true             // Crucial flag to identify this as a "self" record
                }, { merge: true });
            }

            // Step 1.5: One-time migration to clean up the old "default-me" record if it exists.
            const legacyDefaultMeRef = doc(firestoreDb, 'partners', 'default-me');
            const legacyDefaultMeSnap = await getDoc(legacyDefaultMeRef);
            if (legacyDefaultMeSnap.exists()) {
                await deleteDoc(legacyDefaultMeRef);
                console.log("Migrated by deleting legacy 'default-me' partner record.");
            }

            // Step 2: Fetch all partners to determine relationships.
            const allPartnersSnapshot = await getDocs(collection(firestoreDb, 'partners'));
            const allPartners = allPartnersSnapshot.docs.map(doc => ({ ...doc.data() as Omit<T.Partner, 'id'>, id: doc.id }));
            
            // Step 3: Establish trusted workspaces based on mutual partnership.
            const myPartnerEntries = allPartners.filter(p => p.ownerUid === user.uid && !p.isSelf);
            const myPartnerEmails = new Set(myPartnerEntries.map(p => p.loginEmail).filter(Boolean));
            
            const partnerEntriesForMe = allPartners.filter(p => p.loginEmail === user.email && !p.isSelf);
            
            const trustedWorkspaceIds = new Set<string>();
            partnerEntriesForMe.forEach(partnerEntry => {
                // Find the "self" record of the partner who created this entry for me.
                const partnerOwner = allPartners.find(p => p.ownerUid === partnerEntry.ownerUid && p.isSelf === true);
                // If that owner's email exists in the list of partners I've created, it's a mutual relationship.
                if (partnerOwner && partnerOwner.loginEmail && myPartnerEmails.has(partnerOwner.loginEmail)) {
                    trustedWorkspaceIds.add(partnerEntry.ownerUid);
                }
            });

            const workspaceIdsToFetch = [user.uid, ...Array.from(trustedWorkspaceIds)];

            // Step 4: Fetch data from all relevant workspaces.
            async function fetchDataFromWorkspaces<T extends {workspaceId: string}>(collectionName: string): Promise<T[]> {
                if(workspaceIdsToFetch.length === 0) return [];
                const q = query(collection(firestoreDb, collectionName), where("workspaceId", "in", workspaceIdsToFetch));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ ...doc.data() as T, id: doc.id }));
            };

            async function fetchGlobalCollection<T>(collectionName: string): Promise<T[]> {
                const snapshot = await getDocs(collection(firestoreDb, collectionName));
                return snapshot.docs.map(doc => ({ ...doc.data() as T, id: doc.id }));
            };
            
            // Step 5: Fetch settings for the current user.
            async function fetchSettings() {
                const taxDocRef = doc(firestoreDb, 'settings', 'tax');
                const taxDocSnap = await getDoc(taxDocRef);
                if (taxDocSnap.exists()) setTaxSettings(taxDocSnap.data() as T.TaxSettings);
                else await setDoc(taxDocRef, defaultTaxSettings);

                const periodsDocRef = doc(firestoreDb, 'settings', 'periods');
                const periodsDocSnap = await getDoc(periodsDocRef);
                if (periodsDocSnap.exists()) {
                    const data = periodsDocSnap.data();
                    setActivePeriod(data.activePeriod || null);
                    setClosedPeriods(data.closedPeriods || []);
                } else {
                    await setDoc(periodsDocRef, { activePeriod: null, closedPeriods: [] });
                }
            };
            
            await fetchSettings();
            
            const [
                fetchedProjects, fetchedAdAccounts, fetchedDailyAdCosts, fetchedCommissions,
                fetchedExchangeLogs, fetchedMiscExpenses, fetchedAdDeposits, fetchedAdFundTransfers,
                fetchedLiabilities, fetchedReceivables, fetchedReceivablePayments, fetchedWithdrawals,
                fetchedDebtPayments, fetchedTaxPayments, fetchedCapitalInflows, fetchedCategories,
                fetchedNiches, fetchedSavings, fetchedInvestments, fetchedPartnerLedger,
                fetchedPeriodLiabilities, fetchedPeriodDebtPayments, fetchedPeriodReceivables, fetchedPeriodReceivablePayments,
                fetchedAssets, fetchedAssetTypes
            ] = await Promise.all([
                fetchDataFromWorkspaces<T.Project>('projects'),
                fetchDataFromWorkspaces<T.AdAccount>('adAccounts'),
                fetchDataFromWorkspaces<T.DailyAdCost>('dailyAdCosts'),
                fetchDataFromWorkspaces<T.Commission>('commissions'),
                fetchDataFromWorkspaces<T.ExchangeLog>('exchangeLogs'),
                fetchDataFromWorkspaces<T.MiscellaneousExpense>('miscellaneousExpenses'),
                fetchDataFromWorkspaces<T.AdDeposit>('adDeposits'),
                fetchDataFromWorkspaces<T.AdFundTransfer>('adFundTransfers'),
                fetchDataFromWorkspaces<T.Liability>('liabilities'),
                fetchDataFromWorkspaces<T.Receivable>('receivables'),
                fetchDataFromWorkspaces<T.ReceivablePayment>('receivablePayments'),
                fetchDataFromWorkspaces<T.Withdrawal>('withdrawals'),
                fetchDataFromWorkspaces<T.DebtPayment>('debtPayments'),
                fetchDataFromWorkspaces<T.TaxPayment>('taxPayments'),
                fetchDataFromWorkspaces<T.CapitalInflow>('capitalInflows'),
                fetchDataFromWorkspaces<T.Category>('categories'),
                fetchDataFromWorkspaces<T.Niche>('niches'),
                fetchDataFromWorkspaces<T.Saving>('savings'),
                fetchDataFromWorkspaces<T.Investment>('investments'),
                fetchDataFromWorkspaces<T.PartnerLedgerEntry>('partnerLedger'),
                fetchDataFromWorkspaces<T.PeriodLiability>('periodLiabilities'),
                fetchDataFromWorkspaces<T.PeriodDebtPayment>('periodDebtPayments'),
                fetchDataFromWorkspaces<T.PeriodReceivable>('periodReceivables'),
                fetchDataFromWorkspaces<T.PeriodReceivablePayment>('periodReceivablePayments'),
                fetchGlobalCollection<T.Asset>('assets'),
                fetchGlobalCollection<T.AssetType>('assetTypes'),
            ]);

            // Step 6: Filter items from trusted workspaces to only include those explicitly shared with the current user.
            const myRepresentationIds = new Set(partnerEntriesForMe.map(p => p.id));
            const filterShared = <T extends { workspaceId: string; isPartnership?: boolean; partnerShares?: T.PartnerShare[]; }>(item: T): boolean => {
                if (item.workspaceId === user.uid) {
                    return true; // Always include user's own items.
                }
                if (trustedWorkspaceIds.has(item.workspaceId)) {
                    // For items from a trusted partner, only include it if it's explicitly shared with me.
                    if (item.isPartnership && item.partnerShares) {
                        return item.partnerShares.some(share => myRepresentationIds.has(share.partnerId));
                    }
                }
                return false; // Exclude by default if from another workspace and not shared.
            };

            // Set all state
            setPartners(allPartners);
            setProjects(fetchedProjects.filter(filterShared));
            setAdAccounts(fetchedAdAccounts);
            setDailyAdCosts(fetchedDailyAdCosts);
            setCommissions(fetchedCommissions);
            setExchangeLogs(fetchedExchangeLogs);
            setMiscellaneousExpenses(fetchedMiscExpenses.filter(filterShared));
            setAdDeposits(fetchedAdDeposits);
            setAdFundTransfers(fetchedAdFundTransfers);
            setLiabilities(fetchedLiabilities);
            setReceivables(fetchedReceivables);
            setReceivablePayments(fetchedReceivablePayments);
            setWithdrawals(fetchedWithdrawals);
            setDebtPayments(fetchedDebtPayments);
            setTaxPayments(fetchedTaxPayments);
            setCapitalInflows(fetchedCapitalInflows);
            setCategories(fetchedCategories);
            setNiches(fetchedNiches);
            setSavings(fetchedSavings);
            setInvestments(fetchedInvestments);
            setPartnerLedgerEntries(fetchedPartnerLedger);
            setPeriodLiabilities(fetchedPeriodLiabilities);
            setPeriodDebtPayments(fetchedPeriodDebtPayments);
            setPeriodReceivables(fetchedPeriodReceivables);
            setPeriodReceivablePayments(fetchedPeriodReceivablePayments);
            setAssets(fetchedAssets);
            setAssetTypes(fetchedAssetTypes);

            console.log("All data fetched successfully for user:", user.uid, "from workspaces:", workspaceIdsToFetch);
        } catch (error: any) {
            console.error("Error during data fetch:", error);
            if (error.code === 'permission-denied') {
                setPermissionError("Lỗi quyền truy cập dữ liệu. Vui lòng làm theo hướng dẫn trong trang 'Hướng dẫn' để khắc phục.");
            } else {
                alert("Đã xảy ra lỗi khi tải dữ liệu từ Firebase.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    fetchAllData();
  }, [firestoreDb, user, authIsLoading]);

  const partnerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!user || partners.length === 0) return map;

    const myPartnerEntries = partners.filter(p => p.ownerUid === user.uid);
    const myPartnerEmailMap = new Map(myPartnerEntries.map(p => [p.loginEmail, p.name]));

    partners.forEach(p => {
        // A partner entry representing me, created by someone else
        if (p.loginEmail === user.email) {
            map.set(p.id, "Tôi");
        } 
        // My own 'self' record
        else if (p.isSelf && p.ownerUid === user.uid) {
            map.set(p.id, "Tôi");
        }
        // A 'self' record from another workspace (i.e., the owner of a shared item)
        else if (p.isSelf) {
            if (p.loginEmail) {
                const localName = myPartnerEmailMap.get(p.loginEmail);
                map.set(p.id, localName || p.ownerName || 'Đối tác không xác định');
            } else {
                 map.set(p.id, p.ownerName || 'Đối tác không xác định');
            }
        }
        // A regular partner entry I created
        else {
            map.set(p.id, p.name);
        }
    });

    return map;
  }, [partners, user]);

  const seedData = async () => {
    if (!firestoreDb || !user) return;
    setIsLoading(true);
    try {
        await wipeAllFirestoreData(firestoreDb); // Ensure clean state before seeding
        await seedInitialData(firestoreDb, user.uid);
        alert("Đã khôi phục dữ liệu mẫu thành công. Ứng dụng sẽ được tải lại.");
        window.location.reload();
    } catch (error) {
        console.error("Error seeding data:", error);
        alert("Đã xảy ra lỗi khi khôi phục dữ liệu mẫu.");
        setIsLoading(false);
    }
  };


  const addProject = async (project: Omit<T.Project, 'id' | 'period' | 'workspaceId'>) => {
    if (!activePeriod || !firestoreDb || !user) return;
    if (projects.some((p: T.Project) => p.name.trim().toLowerCase() === project.name.trim().toLowerCase() && p.period === activePeriod)) {
      alert('Tên dự án đã tồn tại trong kỳ này. Vui lòng chọn tên khác.'); return;
    }
    const newProjectData = { ...project, period: activePeriod, workspaceId: user.uid };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'projects'), newProjectData);
        setProjects(prev => [...prev, { ...newProjectData, id: docRef.id }]);
    } catch (e) { console.error("Error adding project: ", e); }
  };
  const updateProject = async (updatedProject: T.Project) => {
    if (!firestoreDb) return;
    if (projects.some((p: T.Project) => p.id !== updatedProject.id && p.name.trim().toLowerCase() === updatedProject.name.trim().toLowerCase() && p.period === updatedProject.period)) {
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

  const addAdAccount = async (accountData: Omit<T.AdAccount, 'id' | 'workspaceId'> | Omit<T.AdAccount, 'id' | 'workspaceId'>[]) => {
    if (!firestoreDb || !user) return;

    const accountsToAdd = Array.isArray(accountData) ? accountData : [accountData];
    const newAccounts: T.AdAccount[] = [];
    const batch = writeBatch(firestoreDb);

    for (const account of accountsToAdd) {
        if (adAccounts.some(acc => acc.accountNumber.trim().toLowerCase() === account.accountNumber.trim().toLowerCase())) {
            alert(`Số tài khoản Ads "${account.accountNumber}" đã tồn tại.`);
            continue; // Skip this one
        }
        const newAccountData = { ...account, workspaceId: user.uid };
        const docRef = doc(collection(firestoreDb, 'adAccounts'));
        batch.set(docRef, newAccountData);
        newAccounts.push({ ...newAccountData, id: docRef.id });
    }
    
    try {
        await batch.commit();
        setAdAccounts(prev => [...prev, ...newAccounts]);
    } catch (e) {
        console.error("Error adding ad accounts: ", e);
    }
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

  const addDailyAdCost = async (cost: Omit<T.DailyAdCost, 'id' | 'workspaceId'>) => {
    if (!firestoreDb || !user) return;
    const project = projects.find(p => p.id === cost.projectId);
    if (!project) { console.error("Project not found"); return; }
    
    const newCostData = { ...cost, workspaceId: project.workspaceId };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'dailyAdCosts'), newCostData);
        setDailyAdCosts(prev => [...prev, { ...newCostData, id: docRef.id }]);
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

  const addAdDeposit = async (depositData: Omit<T.AdDeposit, 'id' | 'workspaceId'> | Omit<T.AdDeposit, 'id' | 'workspaceId'>[]) => {
    if (!firestoreDb || !user) return;
    const depositsToAdd = Array.isArray(depositData) ? depositData : [depositData];
    const newDeposits: T.AdDeposit[] = [];
    const batch = writeBatch(firestoreDb);

    for (const deposit of depositsToAdd) {
        const project = deposit.projectId ? projects.find(p => p.id === deposit.projectId) : null;
        const workspaceId = project ? project.workspaceId : user.uid; // Default to user's workspace if no project
        const newDepositData = { ...deposit, workspaceId };
        const docRef = doc(collection(firestoreDb, 'adDeposits'));
        batch.set(docRef, newDepositData);
        newDeposits.push({ ...newDepositData, id: docRef.id });
    }

    try {
        await batch.commit();
        setAdDeposits(prev => [...prev, ...newDeposits]);
    } catch (e) {
        console.error("Error adding ad deposits: ", e);
    }
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

  const addAdFundTransfer = async (transfer: Omit<T.AdFundTransfer, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const newTransferData = { ...transfer, workspaceId: user.uid };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'adFundTransfers'), newTransferData);
            setAdFundTransfers(prev => [...prev, { ...newTransferData, id: docRef.id }]);
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

  const addCommission = async (commission: Omit<T.Commission, 'id' | 'workspaceId'>) => {
    if (!firestoreDb || !user) return;
    const project = projects.find(p => p.id === commission.projectId);
    if (!project) { console.error("Project not found"); return; }
    const newCommissionData = { ...commission, workspaceId: project.workspaceId };
    try {
      const docRef = await addDoc(collection(firestoreDb, 'commissions'), newCommissionData);
      setCommissions(prev => [...prev, { ...newCommissionData, id: docRef.id }]);
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
            const newAssetData = { ...asset, ownershipType: asset.ownershipType || 'personal' };
            const docRef = await addDoc(collection(firestoreDb, 'assets'), newAssetData);
            setAssets(prev => [...prev, { ...newAssetData, id: docRef.id }]);
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

  const addLiability = async (liability: Omit<T.Liability, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const newLiabilityData = { ...liability, workspaceId: user.uid };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'liabilities'), newLiabilityData);
            setLiabilities(prev => [...prev, { ...newLiabilityData, id: docRef.id }]);
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
  
  const addReceivable = async (receivable: Omit<T.Receivable, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const newReceivableData = { ...receivable, workspaceId: user.uid };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'receivables'), newReceivableData);
            setReceivables(prev => [...prev, { ...newReceivableData, id: docRef.id }]);
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

  const addReceivablePayment = async (payment: Omit<T.ReceivablePayment, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const receivable = receivables.find(r => r.id === payment.receivableId);
        if (!receivable) { console.error("Receivable not found"); return; }
        const newPaymentData = { ...payment, workspaceId: receivable.workspaceId };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'receivablePayments'), newPaymentData);
            setReceivablePayments(prev => [...prev, { ...newPaymentData, id: docRef.id }]);
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

  const addExchangeLog = async (log: Omit<T.ExchangeLog, 'id' | 'workspaceId'>) => {
    if (!firestoreDb || !user) return;
    const newLogData = { ...log, workspaceId: user.uid };
    try {
      const docRef = await addDoc(collection(firestoreDb, 'exchangeLogs'), newLogData);
      setExchangeLogs(prev => [...prev, { ...newLogData, id: docRef.id }]);
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
  
  const addMiscellaneousExpense = async (expense: Omit<T.MiscellaneousExpense, 'id' | 'workspaceId'>) => {
    if (!firestoreDb || !user) return;
    const project = expense.projectId ? projects.find(p => p.id === expense.projectId) : null;
    
    const workspaceId = project ? project.workspaceId : user.uid;

    const newExpenseData = { ...expense, workspaceId };
    try {
      const docRef = await addDoc(collection(firestoreDb, 'miscellaneousExpenses'), newExpenseData);
      setMiscellaneousExpenses(prev => [...prev, { ...newExpenseData, id: docRef.id }]);

      // Send notifications to partners
      const isShared = (project?.isPartnership && project.partnerShares) || (expense.isPartnership && expense.partnerShares);
      if (isShared) {
        const shares = project?.partnerShares || expense.partnerShares || [];
        const me = partners.find(p => p.isSelf && p.ownerUid === user.uid);
        shares.forEach(share => {
            if (share.partnerId !== user.uid) {
                const partner = partners.find(p => p.id === share.partnerId);
                const message = `${me?.name || 'Chủ sở hữu'} đã thêm chi phí chung "${expense.description}" trị giá ${formatCurrency(expense.vndAmount)} mà bạn có tham gia.`;
                addNotification(message, 'partner');
            }
        });
      }
    } catch (e) { console.error("Error adding miscellaneous expense: ", e); }
  };
  const updateMiscellaneousExpense = async (updatedExpense: T.MiscellaneousExpense) => {
    if (!firestoreDb) return;
    const { id, ...expenseData } = updatedExpense;
    try {
      await updateDoc(doc(firestoreDb, 'miscellaneousExpenses', id), expenseData);
      setMiscellaneousExpenses(prev => prev.map(e => (e.id === id ? updatedExpense : e)));

      const project = updatedExpense.projectId ? projects.find(p => p.id === updatedExpense.projectId) : null;
      const isShared = (project?.isPartnership && project.partnerShares) || (updatedExpense.isPartnership && updatedExpense.partnerShares);
      if (isShared) {
        const shares = project?.partnerShares || updatedExpense.partnerShares || [];
        const me = partners.find(p => p.isSelf && p.ownerUid === user?.uid);
        shares.forEach(share => {
            if (share.partnerId !== user?.uid) {
                 const message = `${me?.name || 'Chủ sở hữu'} đã cập nhật chi phí chung "${updatedExpense.description}" mà bạn có tham gia.`;
                 addNotification(message, 'partner');
            }
        });
      }
    } catch (e) { console.error("Error updating miscellaneous expense: ", e); }
  };
  const deleteMiscellaneousExpense = async (id: string) => {
    if (!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'miscellaneousExpenses', id));
      setMiscellaneousExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error("Error deleting miscellaneous expense: ", e); }
  };
  
 const addPartner = async (partnerData: Partial<Omit<T.Partner, 'id' | 'ownerUid' | 'ownerName'>>) => {
    if (!firestoreDb || !user) return;
    
    // Get the current user's actual name from their 'self' record.
    const mePartner = partners.find(p => p.isSelf && p.ownerUid === user.uid);
    const ownerName = mePartner ? mePartner.name : 'Tôi'; // Fallback to 'Tôi'

    const newPartnerData: Omit<T.Partner, 'id'> = {
        name: partnerData.name || '',
        loginEmail: partnerData.loginEmail || '',
        ownerUid: user.uid,
        ownerName: ownerName,
    };
    
    try {
        const docRef = await addDoc(collection(firestoreDb, 'partners'), newPartnerData);
        setPartners(prev => [...prev, { ...newPartnerData, id: docRef.id }]);
    } catch (e) {
        console.error("Error adding partner: ", e);
    }
};

const updatePartner = async (updatedPartner: T.Partner) => {
    if (!firestoreDb || !user) return;

    const { id, ...partnerData } = updatedPartner;
    const dataToSave = { ...partnerData };

    try {
        const partnerRef = doc(firestoreDb, 'partners', id);
        await updateDoc(partnerRef, dataToSave);

        // If the user is updating their own name, propagate this new name to the `ownerName`
        // field of all other partners they own.
        const partnerToUpdate = partners.find(p => p.id === id);
        if (partnerToUpdate?.isSelf) {
            const batch = writeBatch(firestoreDb);
            const userPartners = partners.filter(p => p.ownerUid === user.uid && !p.isSelf);
            userPartners.forEach(p => {
                const partnerDocRef = doc(firestoreDb, 'partners', p.id);
                batch.update(partnerDocRef, { ownerName: dataToSave.name });
            });
            await batch.commit();
        }

        // Optimistically update local state for a responsive UI
        setPartners(prev => {
            const updatedPartners = prev.map(p => {
                if (p.id === id) {
                    return { ...p, ...dataToSave };
                }
                if (partnerToUpdate?.isSelf && p.ownerUid === user.uid) {
                    return { ...p, ownerName: dataToSave.name };
                }
                return p;
            });
            return updatedPartners;
        });

    } catch (e) {
        console.error("Error updating partner: ", e);
    }
};

  const deletePartner = async (id: string) => {
        if (!firestoreDb) return;
        const partner = partners.find(p => p.id === id);
        if (partner?.isSelf) { alert("Không thể xóa bản ghi đại diện cho chính bạn."); return; }
        const isPartnerInProject = projects.some((p: T.Project) => p.isPartnership && p.partnerShares?.some(s => s.partnerId === id));
        if (isPartnerInProject) {
            alert('Không thể xóa đối tác này vì họ đang được liên kết với một hoặc nhiều dự án hợp tác.'); return;
        }
        const isPartnerInWithdrawal = withdrawals.some(w => w.withdrawnBy === id);
        if (isPartnerInWithdrawal) {
            alert('Không thể xóa đối tác này vì họ có giao dịch rút tiền liên quan.'); return;
        }
        const isPartnerInMiscExpense = miscellaneousExpenses.some((e: T.MiscellaneousExpense) => e.isPartnership && e.partnerShares?.some(s => s.partnerId === id));
        if (isPartnerInMiscExpense) {
            alert('Không thể xóa đối tác này vì họ được phân bổ trong một chi phí hợp tác.'); return;
        }

        try {
            await deleteDoc(doc(firestoreDb, "partners", id));
            setPartners(prev => prev.filter(p => p.id !== id));
        } catch (e) { console.error("Error deleting partner: ", e); }
    };

  const addWithdrawal = async (withdrawal: Omit<T.Withdrawal, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const newWithdrawalData = { ...withdrawal, workspaceId: user.uid };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'withdrawals'), newWithdrawalData);
            setWithdrawals(prev => [...prev, { ...newWithdrawalData, id: docRef.id }]);
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

  const addDebtPayment = async (payment: Omit<T.DebtPayment, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const liability = liabilities.find(l => l.id === payment.liabilityId);
        if (!liability) { console.error("Liability not found"); return; }
        const newPaymentData = { ...payment, workspaceId: liability.workspaceId };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'debtPayments'), newPaymentData);
            setDebtPayments(prev => [...prev, { ...newPaymentData, id: docRef.id }]);
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
  
  const addTaxPayment = async (payment: Omit<T.TaxPayment, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const newPaymentData = { ...payment, workspaceId: user.uid };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'taxPayments'), newPaymentData);
            setTaxPayments(prev => [...prev, { ...newPaymentData, id: docRef.id }]);
        } catch (e) { console.error("Error adding tax payment: ", e); }
    };

  const addCapitalInflow = async (inflow: Omit<T.CapitalInflow, 'id' | 'workspaceId'>) => {
        if (!firestoreDb || !user) return;
        const newInflowData = { ...inflow, workspaceId: user.uid };
        try {
            const docRef = await addDoc(collection(firestoreDb, 'capitalInflows'), newInflowData);
            setCapitalInflows(prev => [...prev, { ...newInflowData, id: docRef.id }]);
        } catch (e) { console.error("Error adding capital inflow: ", e); }
    };
  const updateCapitalInflow = async (updatedInflow: T.CapitalInflow) => {
        if (!firestoreDb) return;
        const { id, ...data } = updatedInflow;
        try {
            await updateDoc(doc(firestoreDb, 'capitalInflows', id), data);
            setCapitalInflows(prev => prev.map(i => (i.id === id ? updatedInflow : i)));
        } catch (e) { console.error("Error updating capital inflow: ", e); }
    };
  const deleteCapitalInflow = async (id: string) => {
        if (!firestoreDb) return;
        try {
            await deleteDoc(doc(firestoreDb, 'capitalInflows', id));
            setCapitalInflows(prev => prev.filter(i => i.id !== id));
        } catch (e) { console.error("Error deleting capital inflow: ", e); }
    };

  const addCategory = async (category: Omit<T.Category, 'id' | 'workspaceId'>) => {
    if(!firestoreDb || !user) return;
    const newCategoryData = { ...category, workspaceId: user.uid };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'categories'), newCategoryData);
        setCategories(prev => [...prev, { ...newCategoryData, id: docRef.id}]);
    } catch(e) { console.error("Error adding category:", e); }
  };

  const updateCategory = async (category: T.Category) => {
    if(!firestoreDb) return;
    const {id, ...data} = category;
    try {
        await updateDoc(doc(firestoreDb, 'categories', id), data);
        setCategories(prev => prev.map(c => c.id === id ? category : c));
    } catch(e) { console.error("Error updating category:", e); }
  };
  
  const deleteCategory = async (id: string) => {
    if(!firestoreDb) return false;
    if(niches.some(n => n.categoryId === id)) {
        alert("Không thể xóa hạng mục này vì vẫn còn ngách trực thuộc.");
        return false;
    }
    if(projects.some(p => p.categoryId === id)) {
        alert("Không thể xóa hạng mục này vì nó đang được sử dụng trong các dự án.");
        return false;
    }
    try {
        await deleteDoc(doc(firestoreDb, 'categories', id));
        setCategories(prev => prev.filter(c => c.id !== id));
        return true;
    } catch(e) { 
        console.error("Error deleting category:", e);
        return false;
    }
  };

  const addNiche = async (niche: Omit<T.Niche, 'id' | 'workspaceId'>) => {
    if(!firestoreDb || !user) return;
    const newNicheData = { ...niche, workspaceId: user.uid };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'niches'), newNicheData);
        setNiches(prev => [...prev, { ...newNicheData, id: docRef.id }]);
    } catch(e) { console.error("Error adding niche:", e); }
  };

  const updateNiche = async (niche: T.Niche) => {
    if(!firestoreDb) return;
    const { id, ...data } = niche;
    try {
        await updateDoc(doc(firestoreDb, 'niches', id), data);
        setNiches(prev => prev.map(n => n.id === id ? niche : n));
    } catch(e) { console.error("Error updating niche:", e); }
  };
  
  const deleteNiche = async (id: string) => {
    if(!firestoreDb) return false;
    if(projects.some(p => p.nicheId === id)) {
        alert("Không thể xóa ngách này vì nó đang được sử dụng trong các dự án.");
        return false;
    }
    try {
        await deleteDoc(doc(firestoreDb, 'niches', id));
        setNiches(prev => prev.filter(n => n.id !== id));
        return true;
    } catch(e) { 
        console.error("Error deleting niche:", e);
        return false;
    }
  };


  const addSaving = async (saving: Omit<T.Saving, 'id' | 'workspaceId'>) => {
    if(!firestoreDb || !user) return;
    const newSavingData = { ...saving, workspaceId: user.uid };
    try {
      const docRef = await addDoc(collection(firestoreDb, 'savings'), newSavingData);
      setSavings(prev => [...prev, { ...newSavingData, id: docRef.id }]);
    } catch(e) { console.error("Error adding saving:", e); }
  };
  const updateSaving = async (saving: T.Saving) => {
    if(!firestoreDb) return;
    const { id, ...data } = saving;
    try {
      await updateDoc(doc(firestoreDb, 'savings', id), data);
      setSavings(prev => prev.map(s => s.id === id ? saving : s));
    } catch(e) { console.error("Error updating saving:", e); }
  };
  const deleteSaving = async (id: string) => {
    if(!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'savings', id));
      setSavings(prev => prev.filter(s => s.id !== id));
    } catch(e) { console.error("Error deleting saving:", e); }
  };
  
  const addInvestment = async (investment: Omit<T.Investment, 'id' | 'workspaceId'>) => {
    if(!firestoreDb || !user) return;
    const newInvestmentData = { ...investment, workspaceId: user.uid };
    try {
      const docRef = await addDoc(collection(firestoreDb, 'investments'), newInvestmentData);
      setInvestments(prev => [...prev, { ...newInvestmentData, id: docRef.id }]);
    } catch(e) { console.error("Error adding investment:", e); }
  };
  const updateInvestment = async (investment: T.Investment) => {
    if(!firestoreDb) return;
    const { id, ...data } = investment;
    try {
      await updateDoc(doc(firestoreDb, 'investments', id), data);
      setInvestments(prev => prev.map(i => i.id === id ? investment : i));
    } catch(e) { console.error("Error updating investment:", e); }
  };
  const deleteInvestment = async (id: string) => {
    if(!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'investments', id));
      setInvestments(prev => prev.filter(i => i.id !== id));
    } catch(e) { console.error("Error deleting investment:", e); }
  };
  
  const addPartnerLedgerEntry = async (entry: Omit<T.PartnerLedgerEntry, 'id' | 'workspaceId'>) => {
    if(!firestoreDb || !user) return;
    const newEntryData = { ...entry, workspaceId: user.uid };
    try {
      const docRef = await addDoc(collection(firestoreDb, 'partnerLedger'), newEntryData);
      setPartnerLedgerEntries(prev => [...prev, { ...newEntryData, id: docRef.id }]);
    } catch(e) { console.error("Error adding partner ledger entry:", e); }
  };
  const updatePartnerLedgerEntry = async (entry: T.PartnerLedgerEntry) => {
    if(!firestoreDb) return;
    const { id, ...data } = entry;
    try {
      await updateDoc(doc(firestoreDb, 'partnerLedger', id), data);
      setPartnerLedgerEntries(prev => prev.map(e => e.id === id ? entry : e));
    } catch(e) { console.error("Error updating partner ledger entry:", e); }
  };
  const deletePartnerLedgerEntry = async (id: string) => {
    if(!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, 'partnerLedger', id));
      setPartnerLedgerEntries(prev => prev.filter(e => e.id !== id));
    } catch(e) { console.error("Error deleting partner ledger entry:", e); }
  };

  const addPeriodLiability = async (liability: Omit<T.PeriodLiability, 'id' | 'period' | 'workspaceId'>) => {
    if (!activePeriod || !firestoreDb || !user) return;
    const newLiability = { ...liability, period: activePeriod, workspaceId: user.uid };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'periodLiabilities'), newLiability);
        setPeriodLiabilities(prev => [...prev, { ...newLiability, id: docRef.id }]);
    } catch (e) { console.error("Error adding period liability: ", e); }
  };
  const updatePeriodLiability = async (liability: T.PeriodLiability) => {
    if (!firestoreDb) return;
    const {id, ...data} = liability;
    try {
        await updateDoc(doc(firestoreDb, 'periodLiabilities', id), data);
        setPeriodLiabilities(prev => prev.map(l => l.id === id ? liability : l));
    } catch (e) { console.error("Error updating period liability: ", e); }
  };
  const deletePeriodLiability = async (id: string) => {
    if (!firestoreDb) return;
    try {
        await deleteDoc(doc(firestoreDb, 'periodLiabilities', id));
        // Also delete related payments
        const paymentsToDelete = periodDebtPayments.filter(p => p.periodLiabilityId === id);
        const batch = writeBatch(firestoreDb);
        paymentsToDelete.forEach(p => batch.delete(doc(firestoreDb, 'periodDebtPayments', p.id)));
        await batch.commit();
        setPeriodLiabilities(prev => prev.filter(l => l.id !== id));
        setPeriodDebtPayments(prev => prev.filter(p => p.periodLiabilityId !== id));
    } catch (e) { console.error("Error deleting period liability: ", e); }
  };
  const addPeriodDebtPayment = async (payment: Omit<T.PeriodDebtPayment, 'id' | 'workspaceId'>) => {
    if (!firestoreDb || !user) return;
    const liability = periodLiabilities.find(l => l.id === payment.periodLiabilityId);
    if(!liability) { console.error("Period liability not found"); return; }
    const newPaymentData = { ...payment, workspaceId: liability.workspaceId };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'periodDebtPayments'), newPaymentData);
        setPeriodDebtPayments(prev => [...prev, { ...newPaymentData, id: docRef.id }]);
    } catch (e) { console.error("Error adding period debt payment: ", e); }
  };
  
  const addPeriodReceivable = async (receivable: Omit<T.PeriodReceivable, 'id' | 'period' | 'workspaceId'>) => {
    if (!activePeriod || !firestoreDb || !user) return;
    const newReceivable = { ...receivable, period: activePeriod, workspaceId: user.uid };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'periodReceivables'), newReceivable);
        setPeriodReceivables(prev => [...prev, { ...newReceivable, id: docRef.id }]);
    } catch (e) { console.error("Error adding period receivable: ", e); }
  };
  const updatePeriodReceivable = async (receivable: T.PeriodReceivable) => {
    if (!firestoreDb) return;
    const {id, ...data} = receivable;
    try {
        await updateDoc(doc(firestoreDb, 'periodReceivables', id), data);
        setPeriodReceivables(prev => prev.map(r => r.id === id ? receivable : r));
    } catch (e) { console.error("Error updating period receivable: ", e); }
  };
  const deletePeriodReceivable = async (id: string) => {
    if (!firestoreDb) return;
    try {
        await deleteDoc(doc(firestoreDb, 'periodReceivables', id));
        // Also delete related payments
        const paymentsToDelete = periodReceivablePayments.filter(p => p.periodReceivableId === id);
        const batch = writeBatch(firestoreDb);
        paymentsToDelete.forEach(p => batch.delete(doc(firestoreDb, 'periodReceivablePayments', p.id)));
        await batch.commit();
        setPeriodReceivables(prev => prev.filter(r => r.id !== id));
        setPeriodReceivablePayments(prev => prev.filter(p => p.periodReceivableId !== id));
    } catch (e) { console.error("Error deleting period receivable: ", e); }
  };
  const addPeriodReceivablePayment = async (payment: Omit<T.PeriodReceivablePayment, 'id' | 'workspaceId'>) => {
    if (!firestoreDb || !user) return;
    const receivable = periodReceivables.find(r => r.id === payment.periodReceivableId);
    if (!receivable) { console.error("Period receivable not found"); return; }
    const newPaymentData = { ...payment, workspaceId: receivable.workspaceId };
    try {
        const docRef = await addDoc(collection(firestoreDb, 'periodReceivablePayments'), newPaymentData);
        setPeriodReceivablePayments(prev => [...prev, { ...newPaymentData, id: docRef.id }]);
    } catch (e) { console.error("Error adding period receivable payment: ", e); }
  };


  const currentPeriod = viewingPeriod || activePeriod;
  const isReadOnly = useMemo(() => {
      if (viewingPeriod) return true;
      // In the new model, we check write access on a per-item basis.
      // This global flag can be simplified or used for UI hints.
      // For now, if the user is viewing their own workspace, they have write access.
      return false; 
  }, [viewingPeriod, user]);

  const enrichedAssets = useMemo(() => {
    if (!user) return [];
    const assetMap = new Map<string, T.Asset>(assets.map(a => [a.id, a]));
    const projectMap = new Map<string, T.Project>(projects.map(p => [p.id, p]));
    const partnerMap = new Map<string, string>(partners.map(p => [p.id, p.name]));

    const transactions: Record<string, {
        inflows: { date: string, amount: number, description: string }[];
        outflows: { date: string, amount: number, description: string }[];
    }> = {};

    const ownerBalances: Record<string, Record<string, { received: number, withdrawn: number }>> = {};

    assets.forEach(asset => {
        transactions[asset.id] = { inflows: [], outflows: [] };
        ownerBalances[asset.id] = {};
        if (asset.balance > 0) {
            transactions[asset.id].inflows.push({
                date: 'N/A',
                amount: asset.balance,
                description: 'Số dư ban đầu',
            });
            if (!ownerBalances[asset.id][user.uid]) {
                ownerBalances[asset.id][user.uid] = { received: 0, withdrawn: 0 };
            }
            ownerBalances[asset.id][user.uid].received += asset.balance;
        }
    });

    const getAssetName = (assetId: string) => assetMap.get(assetId)?.name || 'Không rõ';

    capitalInflows.forEach(inflow => {
        const asset = assetMap.get(inflow.assetId);
        if (!asset || !transactions[inflow.assetId]) return;

        transactions[inflow.assetId].inflows.push({ date: inflow.date, amount: inflow.amount, description: `Vốn góp: ${inflow.description}`});
        
        let partnerId = user.uid;
        if (asset.ownershipType === 'shared') {
             const assetSharers = new Set((asset.sharedWith || []).map(s => s.partnerId));
             const inflowPartner = inflow.contributedByPartnerId || user.uid;
             if (assetSharers.has(inflowPartner)) {
                partnerId = inflowPartner;
             }
        }

        if (!ownerBalances[inflow.assetId][partnerId]) {
            ownerBalances[inflow.assetId][partnerId] = { received: 0, withdrawn: 0 };
        }
        ownerBalances[inflow.assetId][partnerId].received += inflow.amount;
    });

    commissions.forEach(comm => {
        const project = projectMap.get(comm.projectId);
        const asset = assetMap.get(comm.assetId);
        if (!asset || !transactions[comm.assetId] || !project) return;
        
        const amount = asset.currency === 'USD' ? comm.usdAmount : comm.vndAmount;
        transactions[comm.assetId].inflows.push({ date: comm.date, amount, description: `Hoa hồng dự án ${project.name}` });

        const assetOwners = ownerBalances[comm.assetId];
        const assetSharers = new Set((asset.sharedWith || []).map(s => s.partnerId));

        if (asset.ownershipType === 'shared' && project.isPartnership && project.partnerShares) {
            project.partnerShares.forEach(share => {
                const shareAmount = amount * (share.sharePercentage / 100);
                const targetPartnerId = assetSharers.has(share.partnerId) ? share.partnerId : user.uid;

                if (!assetOwners[targetPartnerId]) {
                    assetOwners[targetPartnerId] = { received: 0, withdrawn: 0 };
                }
                assetOwners[targetPartnerId].received += shareAmount;
            });
        } else {
            const me = assetOwners[user.uid] || (assetOwners[user.uid] = { received: 0, withdrawn: 0 });
            me.received += amount;
        }
    });
    
    exchangeLogs.forEach(log => {
      const sellingAsset = assetMap.get(log.sellingAssetId);
      const receivingAsset = assetMap.get(log.receivingAssetId);

      if (sellingAsset && transactions[log.sellingAssetId]) {
        transactions[log.sellingAssetId].outflows.push({
          date: log.date, amount: log.usdAmount, description: `Bán USD nhận vào ${getAssetName(log.receivingAssetId)}`
        });
      }
      if (receivingAsset && transactions[log.receivingAssetId]) {
        transactions[log.receivingAssetId].inflows.push({
          date: log.date, amount: log.vndAmount, description: `Nhận tiền từ bán ${formatCurrency(log.usdAmount, 'USD')} tại ${getAssetName(log.sellingAssetId)}`
        });
      }
      
      const sellingAssetOwners = ownerBalances[log.sellingAssetId];
      const receivingAssetOwners = ownerBalances[log.receivingAssetId];

      if (sellingAsset && receivingAsset && sellingAssetOwners && receivingAssetOwners) {
          const receivingAssetSharers = new Set((receivingAsset.sharedWith || []).map(s => s.partnerId));
          const totalBalanceInSellingAsset = Object.values(sellingAssetOwners).reduce((sum, owner) => sum + (owner.received - owner.withdrawn), 0);

          if (totalBalanceInSellingAsset > 0.01) {
              Object.keys(sellingAssetOwners).forEach(partnerId => {
                  const partner = sellingAssetOwners[partnerId];
                  const partnerBalance = partner.received - partner.withdrawn;
                  const share = partnerBalance > 0 ? partnerBalance / totalBalanceInSellingAsset : 0;
                  
                  if (share > 0) {
                      const usdShare = log.usdAmount * share;
                      const vndShare = log.vndAmount * share;
                      partner.withdrawn += usdShare;

                      const targetPartnerId = receivingAssetSharers.has(partnerId) ? partnerId : user.uid;

                      if (!receivingAssetOwners[targetPartnerId]) {
                          receivingAssetOwners[targetPartnerId] = { received: 0, withdrawn: 0 };
                      }
                      receivingAssetOwners[targetPartnerId].received += vndShare;
                  }
              });
          } else {
              const meSelling = sellingAssetOwners[user.uid] || (sellingAssetOwners[user.uid] = { received: 0, withdrawn: 0 });
              meSelling.withdrawn += log.usdAmount;
              const meReceiving = receivingAssetOwners[user.uid] || (receivingAssetOwners[user.uid] = { received: 0, withdrawn: 0 });
              meReceiving.received += log.vndAmount;
          }
      }
    });

    miscellaneousExpenses.forEach(exp => {
      const asset = assetMap.get(exp.assetId);
      if (!asset || !transactions[exp.assetId]) return;
      
      const project = exp.projectId ? projectMap.get(exp.projectId) : null;
      transactions[exp.assetId].outflows.push({ date: exp.date, amount: exp.amount, description: `Chi phí: ${exp.description}` });
      
      const assetOwners = ownerBalances[exp.assetId];
      if (!assetOwners) return;
      
      if (asset.ownershipType === 'personal') {
          const me = assetOwners[user.uid] || (assetOwners[user.uid] = { received: 0, withdrawn: 0 });
          me.withdrawn += exp.amount;
          return;
      }

      let shares: T.PartnerShare[] | undefined;
      let isShared = false;

      if(project && project.isPartnership && project.partnerShares) {
          shares = project.partnerShares;
          isShared = true;
      } else if (!project && exp.isPartnership && exp.partnerShares) {
          shares = exp.partnerShares;
          isShared = true;
      }

      if (isShared && shares) {
          const assetSharers = new Set((asset.sharedWith || []).map(s => s.partnerId));
          shares.forEach((share: T.PartnerShare) => {
              const shareAmount = exp.amount * (share.sharePercentage / 100);
              const targetPartnerId = assetSharers.has(share.partnerId) ? share.partnerId : user.uid;
              
              if (!assetOwners[targetPartnerId]) {
                  assetOwners[targetPartnerId] = { received: 0, withdrawn: 0 };
              }
              assetOwners[targetPartnerId].withdrawn += shareAmount;
          });
      } else {
          const me = assetOwners[user.uid] || (assetOwners[user.uid] = { received: 0, withdrawn: 0 });
          me.withdrawn += exp.amount;
      }
    });

    adDeposits.forEach(deposit => {
      const asset = assetMap.get(deposit.assetId);
      if (!asset || !transactions[deposit.assetId]) return;

      const project = projectMap.get(deposit.projectId || '');
      const description = `Nạp tiền Ads: TK ${deposit.adAccountNumber}` + (project ? ` cho dự án ${project.name}` : '');
      transactions[deposit.assetId].outflows.push({ date: deposit.date, amount: deposit.vndAmount, description });
      
      const assetOwners = ownerBalances[deposit.assetId];
      if (!assetOwners) return;

      if (asset.ownershipType === 'personal') {
          const me = assetOwners[user.uid] || (assetOwners[user.uid] = { received: 0, withdrawn: 0 });
          me.withdrawn += deposit.vndAmount;
          return;
      }

      if (project && project.isPartnership && project.partnerShares) {
          const assetSharers = new Set((asset.sharedWith || []).map(s => s.partnerId));
          project.partnerShares.forEach(share => {
              const shareAmount = deposit.vndAmount * (share.sharePercentage / 100);
              const targetPartnerId = assetSharers.has(share.partnerId) ? share.partnerId : user.uid;

              if (!assetOwners[targetPartnerId]) {
                  assetOwners[targetPartnerId] = { received: 0, withdrawn: 0 };
              }
              assetOwners[targetPartnerId].withdrawn += shareAmount;
          });
      } else {
          const me = assetOwners[user.uid] || (assetOwners[user.uid] = { received: 0, withdrawn: 0 });
          me.withdrawn += deposit.vndAmount;
      }
    });

    withdrawals.forEach(withdrawal => {
        if (transactions[withdrawal.assetId]) {
            const partnerName = partnerMap.get(withdrawal.withdrawnBy) || 'Không rõ';
            transactions[withdrawal.assetId].outflows.push({ date: withdrawal.date, amount: withdrawal.amount, description: `Đối tác ${partnerName} rút tiền: ${withdrawal.description}` });
            
            const partnerId = withdrawal.withdrawnBy;
            const assetOwners = ownerBalances[withdrawal.assetId];
            if (assetOwners) {
                if (!assetOwners[partnerId]) {
                    assetOwners[partnerId] = { received: 0, withdrawn: 0 };
                }
                assetOwners[partnerId].withdrawn += withdrawal.amount;
            }
        }
    });

    const allDebtPayments = [...debtPayments, ...periodDebtPayments];
    allDebtPayments.forEach(p => {
        const liability = liabilities.find(l => l.id === ('liabilityId' in p ? p.liabilityId : null)) || periodLiabilities.find(l => l.id === ('periodLiabilityId' in p ? p.periodLiabilityId : null));
        if (transactions[p.assetId]) {
            transactions[p.assetId].outflows.push({ date: p.date, amount: p.amount, description: `Trả nợ: ${liability?.description || 'Không rõ'}` });
            const me = ownerBalances[p.assetId][user.uid] || (ownerBalances[p.assetId][user.uid] = { received: 0, withdrawn: 0 });
            me.withdrawn += p.amount;
        }
    });

    const allReceivablePayments = [...receivablePayments, ...periodReceivablePayments];
    allReceivablePayments.forEach(p => {
        const receivable = receivables.find(r => r.id === ('receivableId' in p ? p.receivableId : null)) || periodReceivables.find(r => r.id === ('periodReceivableId' in p ? p.periodReceivableId : null));
        if (transactions[p.assetId]) {
            transactions[p.assetId].inflows.push({ date: p.date, amount: p.amount, description: `Thu nợ: ${receivable?.description || 'Không rõ'}` });
            const me = ownerBalances[p.assetId][user.uid] || (ownerBalances[p.assetId][user.uid] = { received: 0, withdrawn: 0 });
            me.received += p.amount;
        }
    });

    taxPayments.forEach(p => {
        if (transactions[p.assetId]) {
            transactions[p.assetId].outflows.push({ date: p.date, amount: p.amount, description: `Thanh toán thuế kỳ ${p.period}` });
            const me = ownerBalances[p.assetId][user.uid] || (ownerBalances[p.assetId][user.uid] = { received: 0, withdrawn: 0 });
            me.withdrawn += p.amount;
        }
    });

    investments.forEach(i => {
        if(transactions[i.assetId]) {
            transactions[i.assetId].outflows.push({date: i.date, amount: i.investmentAmount, description: `Đầu tư: ${i.description}`});
            const me = ownerBalances[i.assetId][user.uid] || (ownerBalances[i.assetId][user.uid] = { received: 0, withdrawn: 0 });
            me.withdrawn += i.investmentAmount;
        }
        if(i.status === 'liquidated' && i.liquidationAssetId && transactions[i.liquidationAssetId]) {
            transactions[i.liquidationAssetId].inflows.push({date: i.liquidationDate!, amount: i.liquidationAmount!, description: `Thanh lý đầu tư: ${i.description}`});
            const me = ownerBalances[i.liquidationAssetId][user.uid] || (ownerBalances[i.liquidationAssetId][user.uid] = { received: 0, withdrawn: 0 });
            me.received += i.liquidationAmount!;
        }
    });

    savings.forEach(s => {
        if(transactions[s.assetId]) {
            transactions[s.assetId].outflows.push({date: s.startDate, amount: s.principalAmount, description: `Gửi tiết kiệm: ${s.description}`});
             const me = ownerBalances[s.assetId][user.uid] || (ownerBalances[s.assetId][user.uid] = { received: 0, withdrawn: 0 });
            me.withdrawn += s.principalAmount;
        }
    });


    return assets.map(asset => {
        const assetTransactions = transactions[asset.id];
        const totalReceived = assetTransactions.inflows.reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawn = assetTransactions.outflows.reduce((sum, t) => sum + t.amount, 0);
        const balance = totalReceived - totalWithdrawn;
        
        const assetOwners = ownerBalances[asset.id];
        const owners = Object.keys(assetOwners)
            .map(partnerId => {
                const partner = assetOwners[partnerId];
                const partnerName = partnerMap.get(partnerId);
                if (!partnerName) return null;
                return {
                    id: partnerId,
                    name: partnerName,
                    received: partner.received,
                    withdrawn: partner.withdrawn,
                };
            })
            .filter((owner): owner is { id: string; name: string; received: number; withdrawn: number; } => owner !== null && (owner.received > 0.01 || owner.withdrawn > 0.01));

        return {
            ...asset,
            balance,
            totalReceived,
            totalWithdrawn,
            owners,
            isExpandable: owners.length > 1 || (owners.length === 1 && owners[0].id !== user.uid),
        };
    });
  }, [
    assets, projects, partners, capitalInflows, commissions, exchangeLogs, miscellaneousExpenses, 
    adDeposits, debtPayments, receivablePayments, withdrawals, taxPayments, investments, savings,
    liabilities, receivables, periodLiabilities, periodReceivables, periodDebtPayments, periodReceivablePayments, user
  ]);
  
  const allTransactions = useMemo<EnrichedTransaction[]>(() => {
    if (assets.length === 0) return [];

    const assetMap = new Map<string, T.Asset>(assets.map(a => [a.id, a]));
    const partnerMap = new Map<string, string>(partners.map(p => [p.id, p.name]));
    const projectMap = new Map<string, string>(projects.map(p => [p.id, p.name]));
    const liabilityMap = new Map<string, string>(liabilities.map(l => [l.id, l.description]));
    const receivableMap = new Map<string, string>(receivables.map(r => [r.id, r.description]));
    const periodLiabilityMap = new Map<string, string>(periodLiabilities.map(l => [l.id, l.description]));
    const periodReceivableMap = new Map<string, string>(periodReceivables.map(r => [r.id, r.description]));
    
    const transactions: EnrichedTransaction[] = [];
    const push = (t: Omit<EnrichedTransaction, 'id'>, id: string) => {
        transactions.push({ ...t, id });
    };

    capitalInflows.forEach(i => {
        const asset = assetMap.get(i.assetId); if (!asset) return;
        push({ date: i.date, asset, type: 'Vốn góp', description: i.description, inflow: i.amount, outflow: 0, sender: i.contributedByPartnerId ? partnerMap.get(i.contributedByPartnerId) : i.externalInvestorName || 'Nguồn bên ngoài', receiver: asset.name }, `capital-${i.id}`);
    });

    commissions.forEach(c => {
        const asset = assetMap.get(c.assetId); if (!asset) return;
        const amount = asset.currency === 'USD' ? c.usdAmount : c.vndAmount;
        push({ date: c.date, asset, type: 'Hoa hồng', description: `Dự án ${projectMap.get(c.projectId) || ''}`, inflow: amount, outflow: 0, sender: 'Platform', receiver: asset.name }, `commission-${c.id}`);
    });

    exchangeLogs.forEach(log => {
        const sellingAsset = assetMap.get(log.sellingAssetId);
        const receivingAsset = assetMap.get(log.receivingAssetId);
        if(sellingAsset) push({ date: log.date, asset: sellingAsset, type: 'Bán ngoại tệ', description: `Bán ${formatCurrency(log.usdAmount, 'USD')}`, inflow: 0, outflow: log.usdAmount, sender: sellingAsset.name, receiver: receivingAsset?.name }, `ex-out-${log.id}`);
        if(receivingAsset) push({ date: log.date, asset: receivingAsset, type: 'Bán ngoại tệ', description: `Nhận từ bán ${formatCurrency(log.usdAmount, 'USD')}`, inflow: log.vndAmount, outflow: 0, sender: sellingAsset?.name, receiver: receivingAsset.name }, `ex-in-${log.id}`);
    });

    adDeposits.forEach(d => {
        const asset = assetMap.get(d.assetId); if (!asset) return;
        push({ date: d.date, asset, type: 'Chi phí Ads', description: `Nạp tiền TK ${d.adAccountNumber}`, inflow: 0, outflow: d.vndAmount, sender: asset.name, receiver: d.adAccountNumber }, `ad_deposit-${d.id}`);
    });

    miscellaneousExpenses.forEach(e => {
        const asset = assetMap.get(e.assetId); if (!asset) return;
        push({ date: e.date, asset, type: 'Chi phí', description: e.description, inflow: 0, outflow: e.amount, sender: asset.name, receiver: e.projectId ? projectMap.get(e.projectId) : 'Chi phí chung' }, `misc_exp-${e.id}`);
    });

    withdrawals.forEach(w => {
        const asset = assetMap.get(w.assetId); if (!asset) return;
        push({ date: w.date, asset, type: 'Rút tiền', description: w.description, inflow: 0, outflow: w.amount, sender: asset.name, receiver: partnerMap.get(w.withdrawnBy) }, `withdrawal-${w.id}`);
    });

    [...debtPayments, ...periodDebtPayments].forEach(p => {
        const asset = assetMap.get(p.assetId); if (!asset) return;
        const desc = 'liabilityId' in p ? `Trả nợ: ${liabilityMap.get(p.liabilityId)}` : `Trả nợ: ${periodLiabilityMap.get(p.periodLiabilityId)}`;
        push({ date: p.date, asset, type: 'Trả nợ', description: desc, inflow: 0, outflow: p.amount, sender: asset.name }, `debt_payment-${p.id}`);
    });

    [...receivablePayments, ...periodReceivablePayments].forEach(p => {
        const asset = assetMap.get(p.assetId); if (!asset) return;
        const desc = 'receivableId' in p ? `Thu nợ: ${receivableMap.get(p.receivableId)}` : `Thu nợ: ${periodReceivableMap.get(p.periodReceivableId)}`;
        push({ date: p.date, asset, type: 'Thu nợ', description: desc, inflow: p.amount, outflow: 0, receiver: asset.name }, `rec_payment-${p.id}`);
    });

    taxPayments.forEach(p => {
        const asset = assetMap.get(p.assetId); if (!asset) return;
        push({ date: p.date, asset, type: 'Thuế', description: `Nộp thuế kỳ ${p.period}`, inflow: 0, outflow: p.amount, sender: asset.name, receiver: 'Cơ quan thuế' }, `tax_payment-${p.id}`);
    });

    investments.forEach(i => {
        const asset = assetMap.get(i.assetId); if (asset) push({ date: i.date, asset, type: 'Đầu tư', description: i.description, inflow: 0, outflow: i.investmentAmount, sender: asset.name }, `invest_out-${i.id}`);
        if (i.status === 'liquidated' && i.liquidationAssetId) {
            const liqAsset = assetMap.get(i.liquidationAssetId); if (liqAsset) push({ date: i.liquidationDate!, asset: liqAsset, type: 'Thanh lý ĐT', description: `Thanh lý: ${i.description}`, inflow: i.liquidationAmount!, outflow: 0, receiver: liqAsset.name }, `invest_in-${i.id}`);
        }
    });

    savings.forEach(s => {
        const asset = assetMap.get(s.assetId); if (asset) push({ date: s.startDate, asset, type: 'Tiết kiệm', description: s.description, inflow: 0, outflow: s.principalAmount, sender: asset.name, receiver: `Sổ tiết kiệm` }, `saving-${s.id}`);
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [
      assets, partners, projects, capitalInflows, commissions, exchangeLogs, adDeposits, miscellaneousExpenses, 
      withdrawals, debtPayments, receivablePayments, taxPayments, investments, savings,
      liabilities, receivables, periodLiabilities, periodReceivables, periodDebtPayments, periodReceivablePayments
  ]);

  const enrichedDailyAdCosts = useMemo<EnrichedDailyAdCost[]>(() => {
    // This function implements a strict FIFO (First-In, First-Out) logic for ad cost calculation.
    
    // 1. Create mutable queues for each ad account to track remaining deposit balances.
    const depositQueues: Record<string, {
        deposit: T.AdDeposit;
        remainingUsd: number;
    }[]> = {};

    // 2. Group and sort all deposits by account number and date to form the initial queues.
    const sortedDeposits = [...adDeposits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const deposit of sortedDeposits) {
        if (!depositQueues[deposit.adAccountNumber]) {
            depositQueues[deposit.adAccountNumber] = [];
        }
        depositQueues[deposit.adAccountNumber].push({
            deposit: deposit,
            remainingUsd: deposit.usdAmount,
        });
    }

    // 3. Sort all daily costs chronologically. This is crucial for FIFO processing.
    const sortedCosts = [...dailyAdCosts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Process each cost, consuming from the deposit queues.
    return sortedCosts.map(cost => {
        const queue = depositQueues[cost.adAccountNumber] || [];
        let amountToProcess = cost.amount;
        let totalVndCost = 0;

        // 5. FIFO loop: Consume from the oldest deposits first.
        while (amountToProcess > 0 && queue.length > 0) {
            const currentDeposit = queue[0];
            const amountToTake = Math.min(amountToProcess, currentDeposit.remainingUsd);

            totalVndCost += amountToTake * currentDeposit.deposit.rate;
            currentDeposit.remainingUsd -= amountToTake;
            amountToProcess -= amountToTake;

            // If a deposit is fully used up, remove it from the queue.
            if (currentDeposit.remainingUsd < 0.001) { // Use a small epsilon for float comparison
                queue.shift();
            }
        }
        
        // 6. If costs exceed total deposits, use a fallback rate for the remaining amount.
        if (amountToProcess > 0) {
            totalVndCost += amountToProcess * 25000; // Fallback rate
        }

        // 7. Calculate the final effective rate and return the enriched cost object.
        const effectiveRate = cost.amount > 0 ? totalVndCost / cost.amount : 0;
        
        return {
            ...cost,
            vndCost: totalVndCost,
            effectiveRate: effectiveRate,
        };
    });
}, [dailyAdCosts, adDeposits]);
  
  const { enrichedAdAccounts, adAccountTransactions, partnerAdAccountBalances } = useMemo(() => {
    if (!user) return { enrichedAdAccounts: [], adAccountTransactions: [], partnerAdAccountBalances: new Map() };
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const assetMap = new Map(assets.map(a => [a.id, a.name]));

    const transactions: any[] = [
        ...adDeposits.map(d => ({ ...d, type: 'deposit' })),
        ...dailyAdCosts.map(c => ({ ...c, type: 'cost' })),
        ...adFundTransfers.map(t => ({ ...t, type: 'transfer' })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));

    const balances: Record<string, number> = {}; // adAccountNumber -> balance
    const partnerBalances: Record<string, Record<string, number>> = {}; // adAccountNumber -> partnerId -> balance
    const ledger: T.AdAccountTransaction[] = [];

    adAccounts.forEach(acc => {
        balances[acc.accountNumber] = 0;
        partnerBalances[acc.accountNumber] = {};
    });

    const ensurePartnerBalance = (accountNumber: string, partnerId: string) => {
        if (!partnerBalances[accountNumber]) partnerBalances[accountNumber] = {};
        if (!partnerBalances[accountNumber][partnerId]) partnerBalances[accountNumber][partnerId] = 0;
    };
    
    transactions.forEach(tx => {
        if (tx.type === 'deposit') {
            const accNum = tx.adAccountNumber;
            balances[accNum] = (balances[accNum] || 0) + tx.usdAmount;
            
            const project = tx.projectId ? projectMap.get(tx.projectId) : null;
            const shares = project?.isPartnership ? project.partnerShares : null;

            if (shares && shares.length > 0) {
                shares.forEach(share => {
                    ensurePartnerBalance(accNum, share.partnerId);
                    partnerBalances[accNum][share.partnerId] += tx.usdAmount * (share.sharePercentage / 100);
                });
            } else {
                ensurePartnerBalance(accNum, user.uid);
                partnerBalances[accNum][user.uid] += tx.usdAmount;
            }

            ledger.push({
                id: `deposit-${tx.id}`,
                date: tx.date,
                adAccountNumber: accNum,
                description: `Nạp tiền từ ${assetMap.get(tx.assetId) || 'Không rõ'}`,
                deposit: tx.usdAmount,
                spent: 0,
                balance: balances[accNum],
            });
        } 
        else if (tx.type === 'cost') {
            const accNum = tx.adAccountNumber;
            balances[accNum] = (balances[accNum] || 0) - tx.amount;

            const currentPartnerBals = partnerBalances[accNum] || {};
            const positiveCapitalPartners = Object.entries(currentPartnerBals).filter(([, bal]) => bal > 0);
            const totalPositiveCapital = positiveCapitalPartners.reduce((sum, [, bal]) => sum + bal, 0);

            if (totalPositiveCapital > 0.01) {
                // Distribute cost among partners with positive capital proportionally
                positiveCapitalPartners.forEach(([partnerId, balance]) => {
                    const partnerShare = balance / totalPositiveCapital;
                    currentPartnerBals[partnerId] -= tx.amount * partnerShare;
                });
            } else {
                // No positive capital, distribute cost/debt based on project shares
                const project = projectMap.get(tx.projectId);
                const shares = project?.isPartnership ? project.partnerShares : null;

                if (shares && shares.length > 0) {
                    shares.forEach(share => {
                        ensurePartnerBalance(accNum, share.partnerId);
                        partnerBalances[accNum][share.partnerId] -= tx.amount * (share.sharePercentage / 100);
                    });
                } else {
                    ensurePartnerBalance(accNum, user.uid);
                    partnerBalances[accNum][user.uid] -= tx.amount;
                }
            }

            ledger.push({
                id: `cost-${tx.id}`,
                date: tx.date,
                adAccountNumber: accNum,
                description: `Chi tiêu cho dự án ${projectMap.get(tx.projectId)?.name || 'Không rõ'}`,
                deposit: 0,
                spent: tx.amount,
                balance: balances[accNum],
            });
        } 
        else if (tx.type === 'transfer') {
            const fromAcc = tx.fromAdAccountNumber;
            balances[fromAcc] = (balances[fromAcc] || 0) - tx.amount;
            
            const fromPartnerBals = partnerBalances[fromAcc] || {};
            const transferredPartnerShares: Record<string, number> = {};

            const positiveCapitalPartners = Object.entries(fromPartnerBals).filter(([, bal]) => bal > 0);
            const totalPositiveCapital = positiveCapitalPartners.reduce((sum, [, bal]) => sum + bal, 0);
            
            if (totalPositiveCapital > 0.01) {
                // Transfer from partners with positive capital
                positiveCapitalPartners.forEach(([partnerId, balance]) => {
                    const partnerShare = balance / totalPositiveCapital;
                    const amountToTransfer = tx.amount * partnerShare;
                    fromPartnerBals[partnerId] -= amountToTransfer;
                    transferredPartnerShares[partnerId] = amountToTransfer;
                });
            } else {
                // No positive capital, it's a debt transfer. Distribute based on existing debt shares.
                const negativeCapitalPartners = Object.entries(fromPartnerBals).filter(([, bal]) => bal < 0);
                const totalNegativeCapital = negativeCapitalPartners.reduce((sum, [, bal]) => sum + bal, 0);
                
                if (totalNegativeCapital < -0.01) {
                    negativeCapitalPartners.forEach(([partnerId, balance]) => {
                        const debtShare = balance / totalNegativeCapital; // negative/negative = positive share
                        const amountToTransfer = tx.amount * debtShare;
                        fromPartnerBals[partnerId] -= amountToTransfer; // Increase the debt
                        transferredPartnerShares[partnerId] = amountToTransfer;
                    });
                } else {
                    // Zero balance case, fallback to 'me' as last resort
                    ensurePartnerBalance(fromAcc, user.uid);
                    fromPartnerBals[user.uid] -= tx.amount;
                    transferredPartnerShares[user.uid] = tx.amount;
                }
            }

            ledger.push({
                id: `transfer-out-${tx.id}`,
                date: tx.date,
                adAccountNumber: fromAcc,
                description: `Chuyển tiền đến TK ${tx.toAdAccountNumber}`,
                deposit: 0,
                spent: tx.amount,
                balance: balances[fromAcc],
            });

            // Inflow to destination account
            const toAcc = tx.toAdAccountNumber;
            balances[toAcc] = (balances[toAcc] || 0) + tx.amount;
            
            Object.entries(transferredPartnerShares).forEach(([partnerId, amount]) => {
                ensurePartnerBalance(toAcc, partnerId);
                partnerBalances[toAcc][partnerId] += amount;
            });
            
            ledger.push({
                id: `transfer-in-${tx.id}`,
                date: tx.date,
                adAccountNumber: toAcc,
                description: `Nhận tiền từ TK ${tx.fromAdAccountNumber}`,
                deposit: tx.amount,
                spent: 0,
                balance: balances[toAcc],
            });
        }
    });

    const finalEnrichedAccounts = adAccounts.map(acc => ({
        ...acc,
        balance: balances[acc.accountNumber] || 0,
    }));
    
    // This is for the partner asset allocation view.
    const finalPartnerAdBalances = new Map<string, { adAccountNumber: string, balance: number }[]>();
    
    Object.entries(partnerBalances).forEach(([accNum, partnerBals]) => {
        Object.entries(partnerBals).forEach(([partnerId, bal]) => {
            if (bal > 0.01) { // Only show positive balances
                if (!finalPartnerAdBalances.has(partnerId)) {
                    finalPartnerAdBalances.set(partnerId, []);
                }
                finalPartnerAdBalances.get(partnerId)!.push({ adAccountNumber: accNum, balance: bal });
            }
        });
    });

    const sortedLedger = ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.id.localeCompare(b.id));

    return {
        enrichedAdAccounts: finalEnrichedAccounts,
        adAccountTransactions: sortedLedger,
        partnerAdAccountBalances: finalPartnerAdBalances,
    };

}, [adAccounts, adDeposits, dailyAdCosts, adFundTransfers, assets, projects, user]);

  const masterProjects = useMemo<MasterProject[]>(() => {
    const uniqueProjects = new Map<string, MasterProject>();
    // Sắp xếp dự án theo kỳ giảm dần để lấy thông tin từ dự án gần nhất
    const sortedProjects = [...projects].sort((a, b) => b.period.localeCompare(a.period));

    sortedProjects.forEach(p => {
        const key = p.name.trim().toLowerCase();
        if (!uniqueProjects.has(key)) {
            uniqueProjects.set(key, { 
                name: p.name, 
                categoryId: p.categoryId, 
                nicheId: p.nicheId,
                affiliateUrls: p.affiliateUrls
            });
        }
    });
    return Array.from(uniqueProjects.values());
  }, [projects]);
  
    const calculatePeriodFinancials = (
        period: string,
        allProjects: T.Project[],
        allCommissions: T.Commission[],
        allEnrichedDailyAdCosts: EnrichedDailyAdCost[],
        allMiscellaneousExpenses: T.MiscellaneousExpense[],
        allPartners: T.Partner[],
        allTaxSettings: T.TaxSettings,
        allExchangeLogs: T.ExchangeLog[],
        allInvestments: T.Investment[],
        allTaxPayments: T.TaxPayment[],
        allWithdrawals: T.Withdrawal[],
        allCapitalInflows: T.CapitalInflow[],
        allPeriodDebtPayments: T.PeriodDebtPayment[],
        allPeriodReceivablePayments: T.PeriodReceivablePayment[],
        allAdDeposits: T.AdDeposit[]
    ): PeriodFinancials | null => {
        if (!period || !user) return null;

        const projectsForPeriod = allProjects.filter(p => isDateInPeriod(p.period, period));
        const projectMap = new Map(projectsForPeriod.map(p => [p.id, p]));
        const commissionsForPeriod = allCommissions.filter(c => isDateInPeriod(c.date, period));
        const enrichedDailyAdCostsForPeriod = allEnrichedDailyAdCosts.filter(c => isDateInPeriod(c.date, period));
        const miscExpensesForPeriod = allMiscellaneousExpenses.filter(e => isDateInPeriod(e.date, period));
        const exchangeLogsForPeriod = allExchangeLogs.filter(e => isDateInPeriod(e.date, period));
        const liquidatedInvestmentsForPeriod = allInvestments.filter(i => i.status === 'liquidated' && i.liquidationDate && isDateInPeriod(i.liquidationDate, period));
        const taxPaymentsForPeriod = allTaxPayments.filter(p => isDateInPeriod(p.date, period));
        const periodDebtPaymentsForPeriod = allPeriodDebtPayments.filter(p => isDateInPeriod(p.date, period));
        const periodReceivablePaymentsForPeriod = allPeriodReceivablePayments.filter(p => isDateInPeriod(p.date, period));
        const adDepositsForPeriod = allAdDeposits.filter(d => isDateInPeriod(d.date, period));


        const partnerPnlDetails: T.PartnerPnl[] = allPartners.map(p => ({
            partnerId: p.id, name: p.name, revenue: 0, cost: 0, profit: 0, inputVat: 0, taxPayable: 0
        }));
        const partnerPnlMap = new Map(partnerPnlDetails.map(p => [p.partnerId, p]));

        const revenueDetailsMap = new Map<string, number>();
        commissionsForPeriod.forEach(comm => {
            const project = projectMap.get(comm.projectId);
            if (!project) return;

            const currentAmount = revenueDetailsMap.get(project.name) || 0;
            revenueDetailsMap.set(project.name, currentAmount + comm.vndAmount);

            if (project.isPartnership && project.partnerShares) {
                project.partnerShares.forEach(share => {
                    const partnerPnl = partnerPnlMap.get(share.partnerId);
                    if (partnerPnl) partnerPnl.revenue += comm.vndAmount * (share.sharePercentage / 100);
                });
            } else {
                const mePnl = partnerPnlMap.get(user.uid);
                if (mePnl) mePnl.revenue += comm.vndAmount;
            }
        });
        const revenueDetails: { name: string, amount: number }[] = Array.from(revenueDetailsMap, ([name, amount]) => ({ name, amount }));

        // Calculate Exchange Rate Gain/Loss using FIFO
        let exchangeRateGainLoss = 0;
        const transactionsByAsset: { [assetId: string]: (T.Commission | T.ExchangeLog)[] } = {};
        const usdAssetIds = new Set<string>();
        assets.forEach(a => { if (a.currency === 'USD') usdAssetIds.add(a.id); });
        allCommissions.forEach(c => {
            if (usdAssetIds.has(c.assetId)) {
                if (!transactionsByAsset[c.assetId]) transactionsByAsset[c.assetId] = [];
                transactionsByAsset[c.assetId].push(c);
            }
        });
        allExchangeLogs.forEach(e => {
            if (usdAssetIds.has(e.sellingAssetId)) {
                if (!transactionsByAsset[e.sellingAssetId]) transactionsByAsset[e.sellingAssetId] = [];
                transactionsByAsset[e.sellingAssetId].push(e);
            }
        });
        for (const assetId in transactionsByAsset) {
            transactionsByAsset[assetId].sort((a, b) => a.date.localeCompare(b.date));
        }
        for (const assetId in transactionsByAsset) {
            const fifoQueue: { amount: number, rate: number }[] = [];
            for (const tx of transactionsByAsset[assetId]) {
                if ('predictedRate' in tx) { // Commission
                    fifoQueue.push({ amount: tx.usdAmount, rate: tx.predictedRate });
                } else { // ExchangeLog
                    let amountToSell = tx.usdAmount;
                    let costBasisVND = 0;
                    while (amountToSell > 0 && fifoQueue.length > 0) {
                        const firstIn = fifoQueue[0];
                        const amountFromChunk = Math.min(amountToSell, firstIn.amount);
                        costBasisVND += amountFromChunk * firstIn.rate;
                        amountToSell -= amountFromChunk;
                        firstIn.amount -= amountFromChunk;
                        if (firstIn.amount < 0.001) {
                            fifoQueue.shift();
                        }
                    }
                    if (isDateInPeriod(tx.date, period)) {
                         const actualVND = tx.usdAmount * tx.rate;
                         exchangeRateGainLoss += actualVND - costBasisVND;
                    }
                }
            }
        }
        
        if (exchangeRateGainLoss !== 0) {
            revenueDetails.push({ name: 'Lãi/Lỗ tỷ giá', amount: exchangeRateGainLoss });
        }

        const totalCommissionRevenue = commissionsForPeriod.reduce((sum, c) => sum + c.vndAmount, 0);
        if (totalCommissionRevenue > 0) {
            partnerPnlDetails.forEach(pnl => {
                const partnerRevenueShare = pnl.revenue / totalCommissionRevenue;
                pnl.revenue += exchangeRateGainLoss * partnerRevenueShare;
            });
        } else if (exchangeRateGainLoss !== 0) {
            const mePnl = partnerPnlMap.get(user.uid);
            if (mePnl) {
                mePnl.revenue += exchangeRateGainLoss;
            }
        }
        
        const adCostDetailsMap = new Map<string, number>();
        enrichedDailyAdCostsForPeriod.forEach(cost => {
            const project = projectMap.get(cost.projectId);
            if (!project) return;
            const totalVndCost = cost.vndCost;
            const inputVat = totalVndCost * (cost.vatRate || 0) / 100;

            const currentAmount = adCostDetailsMap.get(project.name) || 0;
            adCostDetailsMap.set(project.name, currentAmount + totalVndCost);

            if (project.isPartnership && project.partnerShares) {
                project.partnerShares.forEach(share => {
                    const partnerPnl = partnerPnlMap.get(share.partnerId);
                    if (partnerPnl) {
                        const shareAmount = share.sharePercentage / 100;
                        partnerPnl.cost += totalVndCost * shareAmount;
                        partnerPnl.inputVat += inputVat * shareAmount;
                    }
                });
            } else {
                const mePnl = partnerPnlMap.get(user.uid);
                if (mePnl) {
                    mePnl.cost += totalVndCost;
                    mePnl.inputVat += inputVat;
                }
            }
        });
        const adCostDetails: { name: string, amount: number }[] = Array.from(adCostDetailsMap, ([name, amount]) => ({ name, amount }));

        const miscCostDetailsMap = new Map<string, number>();
        miscExpensesForPeriod.forEach(exp => {
            const project = exp.projectId ? projectMap.get(exp.projectId) : null;
            const totalVndCost = exp.vndAmount;
            const inputVat = totalVndCost * (exp.vatRate || 0) / 100;
            
            const key = project ? project.name : exp.description;
            const currentAmount = miscCostDetailsMap.get(key) || 0;
            miscCostDetailsMap.set(key, currentAmount + totalVndCost);

            let shares = (project && project.isPartnership && project.partnerShares) ? project.partnerShares :
                         (!project && exp.isPartnership && exp.partnerShares) ? exp.partnerShares : undefined;

            if (shares) {
                shares.forEach(share => {
                    const partnerPnl = partnerPnlMap.get(share.partnerId);
                    if (partnerPnl) {
                        const shareAmount = share.sharePercentage / 100;
                        partnerPnl.cost += totalVndCost * shareAmount;
                        partnerPnl.inputVat += inputVat * shareAmount;
                    }
                });
            } else {
                const mePnl = partnerPnlMap.get(user.uid);
                if (mePnl) {
                    mePnl.cost += totalVndCost;
                    mePnl.inputVat += inputVat;
                }
            }
        });
        const miscCostDetails: { name: string, amount: number }[] = Array.from(miscCostDetailsMap, ([name, amount]) => ({ name, amount }));

        partnerPnlDetails.forEach(p => p.profit = p.revenue - p.cost);
        const totalRevenue = partnerPnlDetails.reduce((sum, p) => sum + p.revenue, 0);
        const totalAdCost = adCostDetails.reduce((sum, d) => sum + d.amount, 0);
        const totalMiscCost = miscCostDetails.reduce((sum, d) => sum + d.amount, 0);
        const totalCost = totalAdCost + totalMiscCost;
        const totalProfit = totalRevenue - totalCost;

        const investmentGainLoss = liquidatedInvestmentsForPeriod.reduce((sum, i) => sum + ((i.liquidationAmount || 0) - i.investmentAmount), 0);
        const profitBeforeTax = totalProfit + investmentGainLoss;

        const mePnl = partnerPnlMap.get(user.uid) || { revenue: 0, cost: 0, profit: 0, inputVat: 0, partnerId: '', name: '', taxPayable: 0 };
        const taxBases = {
            initialRevenueBase: allTaxSettings.incomeTaxBase === 'personal' ? mePnl.revenue : totalRevenue,
            taxSeparationAmount: allTaxSettings.taxSeparationAmount || 0,
            get revenueBase() { return this.initialRevenueBase - this.taxSeparationAmount; },
            costBase: allTaxSettings.incomeTaxBase === 'personal' ? mePnl.cost : totalCost,
            get profitBase() { return this.revenueBase - this.costBase + investmentGainLoss }, // Adjusted to reflect new profitBeforeTax logic
            vatOutputBase: allTaxSettings.vatOutputBase === 'personal' ? mePnl.revenue : totalRevenue,
            vatInputBase: allTaxSettings.vatInputMethod === 'manual' ? allTaxSettings.manualInputVat :
                          (allTaxSettings.vatInputBase === 'personal' ? mePnl.inputVat : partnerPnlDetails.reduce((sum, p) => sum + p.inputVat, 0)),
        };

        let tax: T.TaxCalculationResult = { taxPayable: 0, incomeTax: 0, netVat: 0, outputVat: 0 };
        if (allTaxSettings.method === 'revenue') {
            tax.taxPayable = taxBases.revenueBase * (allTaxSettings.revenueRate / 100);
        } else {
            tax.outputVat = taxBases.vatOutputBase * (allTaxSettings.vatRate / 100);
            tax.netVat = tax.outputVat - taxBases.vatInputBase;
            tax.incomeTax = Math.max(0, taxBases.profitBase) * (allTaxSettings.incomeRate / 100);
            tax.taxPayable = Math.max(0, tax.netVat) + tax.incomeTax;
        }

        if (profitBeforeTax > 0) {
            partnerPnlDetails.forEach(p => {
                const profitShare = p.profit / profitBeforeTax;
                p.taxPayable = tax.taxPayable * profitShare;
            });
        }

        const netProfit = profitBeforeTax - tax.taxPayable;

        // Cash Flow Calculation
        const cashInflowFromCommissionAndExchange = commissionsForPeriod.reduce((s, i) => s + i.vndAmount, 0) + exchangeRateGainLoss;
        const cfOperatingInflows = [
            { label: 'Thu từ hoa hồng', amount: cashInflowFromCommissionAndExchange },
            { label: 'Thu nợ trong kỳ', amount: periodReceivablePaymentsForPeriod.reduce((s, i) => s + i.amount, 0) }
        ].filter(i => i.amount > 0);
        const cfOperatingOutflows = [
            { label: 'Nạp tiền Ads', amount: adDepositsForPeriod.reduce((s, i) => s + i.vndAmount, 0) },
            { label: 'Chi phí phát sinh', amount: miscExpensesForPeriod.reduce((s, i) => s + i.vndAmount, 0) },
            { label: 'Trả nợ trong kỳ', amount: periodDebtPaymentsForPeriod.reduce((s, i) => s + i.amount, 0) },
            { label: 'Nộp thuế', amount: taxPaymentsForPeriod.reduce((s, i) => s + i.amount, 0) }
        ].filter(i => i.amount > 0);
        const cashFlow: T.PeriodFinancials['cashFlow'] = {
            operating: { inflows: cfOperatingInflows, outflows: cfOperatingOutflows, net: cfOperatingInflows.reduce((s,i)=>s+i.amount,0) - cfOperatingOutflows.reduce((s,i)=>s+i.amount,0) },
            investing: { inflows: [], outflows: [], net: 0 },
            financing: { inflows: [], outflows: [], net: 0 },
            netChange: 0, beginningBalance: 0, endBalance: 0
        };

        return {
            totalRevenue, totalAdCost, totalMiscCost, totalCost, totalProfit,
            totalInputVat: partnerPnlDetails.reduce((sum, p) => sum + p.inputVat, 0),
            myRevenue: mePnl.revenue, myCost: mePnl.cost, myProfit: mePnl.profit, myInputVat: mePnl.inputVat,
            exchangeRateGainLoss, investmentGainLoss, profitBeforeTax, netProfit,
            tax, taxBases, partnerPnlDetails,
            revenueDetails, adCostDetails, miscCostDetails, cashFlow,
        };
    };
  
    const periodFinancials = useMemo<T.PeriodFinancials | null>(() => {
        if (!currentPeriod || !user) return null;
        return calculatePeriodFinancials(
            currentPeriod, projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, 
            partners, taxSettings, exchangeLogs, investments, taxPayments, withdrawals, 
            capitalInflows, periodDebtPayments, periodReceivablePayments, adDeposits
        );
    }, [
        currentPeriod, projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, 
        partners, taxSettings, exchangeLogs, investments, taxPayments, withdrawals, 
        capitalInflows, periodDebtPayments, periodReceivablePayments, adDeposits, user
    ]);
  
    const allPartnerLedgerEntries = useMemo<T.PartnerLedgerEntry[]>(() => {
        if (!user) return [];
        const assetMap = new Map<string, T.Asset>(assets.map(a => [a.id, a]));
        const projectMap = new Map<string, T.Project>(projects.map(p => [p.id, p]));
    
        const ledgerEntries: T.PartnerLedgerEntry[] = [];
    
        const transactions: any[] = [
            ...capitalInflows.map(i => ({ ...i, type: 'capitalInflow' })),
            ...withdrawals.map(w => ({ ...w, type: 'withdrawal' })),
            ...commissions.map(c => ({ ...c, type: 'commission' })),
            ...enrichedDailyAdCosts.map(c => ({ ...c, type: 'dailyAdCost' })),
            ...miscellaneousExpenses.map(e => ({ ...e, type: 'miscExpense' })),
            ...exchangeLogs.map(log => ({ ...log, type: 'exchange' })),
            ...partnerLedgerEntries.map(e => ({ ...e, type: 'manual' })),
        ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    
        transactions.forEach(tx => {
            switch (tx.type) {
                case 'capitalInflow': {
                    const capitalInflow = tx as T.CapitalInflow;
                    const partnerId = capitalInflow.contributedByPartnerId || user.uid;
                    const asset = assetMap.get(capitalInflow.assetId);
                    if (!asset) break;
    
                    ledgerEntries.push({
                        id: `ci-${capitalInflow.id}`, date: capitalInflow.date, partnerId,
                        description: `Vốn góp: ${capitalInflow.description}`, type: 'inflow', amount: capitalInflow.amount,
                        sourceName: capitalInflow.externalInvestorName || 'Nguồn vốn bên ngoài',
                        destinationName: asset.name,
                        workspaceId: capitalInflow.workspaceId
                    });
                    break;
                }
                case 'withdrawal': {
                    const withdrawal = tx as T.Withdrawal;
                    ledgerEntries.push({
                        id: `wd-${withdrawal.id}`, date: withdrawal.date, partnerId: withdrawal.withdrawnBy,
                        description: `Rút tiền: ${withdrawal.description}`, type: 'outflow', amount: withdrawal.vndAmount,
                        sourceName: assetMap.get(withdrawal.assetId)?.name || 'Không rõ',
                        destinationName: 'Rút ra ngoài',
                        workspaceId: withdrawal.workspaceId
                    });
                    break;
                }
                case 'commission': {
                    const commission = tx as T.Commission;
                    const project = projectMap.get(commission.projectId);
                    if (!project) break;
                    const asset = assetMap.get(commission.assetId);
                    if (!asset) break;
    
                    const shares = project.isPartnership ? project.partnerShares : null;
                    
                    if (shares && shares.length > 0) {
                        shares.forEach(share => {
                            ledgerEntries.push({
                                id: `rev-${commission.id}-${share.partnerId}`, date: commission.date, partnerId: share.partnerId,
                                description: `Hoa hồng dự án ${project.name}`, type: 'inflow', amount: commission.vndAmount * (share.sharePercentage / 100),
                                sourceName: project.name, destinationName: asset.name,
                                workspaceId: commission.workspaceId
                            });
                        });
                    } else {
                        ledgerEntries.push({
                            id: `rev-${commission.id}-${user.uid}`, date: commission.date, partnerId: user.uid,
                            description: `Hoa hồng dự án ${project.name}`, type: 'inflow', amount: commission.vndAmount,
                            sourceName: project.name, destinationName: asset.name,
                            workspaceId: commission.workspaceId
                        });
                    }
                    break;
                }
                // FIX: The combined 'dailyAdCost' and 'miscExpense' case was split into two separate cases and type assertions were added to handle their different properties correctly and fix property access errors on an 'unknown' type.
                case 'dailyAdCost': {
                    const expense = tx as EnrichedDailyAdCost;
                    const project = expense.projectId ? projectMap.get(expense.projectId) : undefined;
                    
                    let shares: T.PartnerShare[] | undefined | null = null;
                    // FIX: Changed optional chaining to an explicit check to help type inference.
                    if (project && project.isPartnership && project.partnerShares) {
                        shares = project.partnerShares;
                    }
                    
                    const vndAmount = expense.vndCost;
                    // FIX: Changed optional chaining to an explicit check to help type inference.
                    const description = `Chi phí Ads cho dự án ${project ? project.name : expense.adAccountNumber}`;
                    const sourceName = `TK Ads ${expense.adAccountNumber}`;
                    // FIX: Changed optional chaining to an explicit check to help type inference.
                    const destinationName = project ? project.name : undefined;

                    if (shares && shares.length > 0) {
                        shares.forEach(share => {
                            ledgerEntries.push({
                                id: `cost-${expense.id}-${share.partnerId}`, date: expense.date, partnerId: share.partnerId,
                                description, type: 'outflow', amount: vndAmount * (share.sharePercentage / 100),
                                sourceName: sourceName, destinationName: destinationName,
                                workspaceId: expense.workspaceId
                            });
                        });
                    } else {
                        ledgerEntries.push({
                            id: `cost-${expense.id}-${user.uid}`, date: expense.date, partnerId: user.uid,
                            description, type: 'outflow', amount: vndAmount,
                            sourceName: sourceName, destinationName: destinationName,
                            workspaceId: expense.workspaceId
                        });
                    }
                    break;
                }
                case 'miscExpense': {
                    const expense = tx as T.MiscellaneousExpense;
                    const project = expense.projectId ? projectMap.get(expense.projectId) : undefined;
                    
                    let shares: T.PartnerShare[] | undefined | null = null;
                    // FIX: Changed optional chaining to an explicit check to help type inference.
                    if (project && project.isPartnership && project.partnerShares) {
                        shares = project.partnerShares;
                    } else if (expense.isPartnership && expense.partnerShares) {
                        shares = expense.partnerShares;
                    }
                    
                    const vndAmount = expense.vndAmount;
                    const description = `Chi phí: ${expense.description}`;
                    const sourceName = assetMap.get(expense.assetId)?.name;
                    const destinationName = project ? project.name : 'Chi phí chung';

                    if (shares && shares.length > 0) {
                        shares.forEach(share => {
                            ledgerEntries.push({
                                id: `cost-${expense.id}-${share.partnerId}`, date: expense.date, partnerId: share.partnerId,
                                description, type: 'outflow', amount: vndAmount * (share.sharePercentage / 100),
                                sourceName: sourceName, destinationName: destinationName,
                                workspaceId: expense.workspaceId
                            });
                        });
                    } else {
                        ledgerEntries.push({
                            id: `cost-${expense.id}-${user.uid}`, date: expense.date, partnerId: user.uid,
                            description, type: 'outflow', amount: vndAmount,
                            sourceName: sourceName, destinationName: destinationName,
                            workspaceId: expense.workspaceId
                        });
                    }
                    break;
                }
                case 'exchange': {
                    // Exchange logs are capital movements between assets, not P&L events for the ledger.
                    // The P&L impact (gain/loss) is calculated in periodFinancials and should be entered as an adjustment if needed.
                    // For simplicity, we omit direct ledger entries for exchanges now.
                    break;
                }
                // FIX: Added type assertion to ensure the transaction object conforms to the PartnerLedgerEntry type.
                case 'manual':
                    ledgerEntries.push(tx as T.PartnerLedgerEntry);
                    break;
            }
        });

        const pnlEntries: T.PartnerLedgerEntry[] = [];
        closedPeriods.forEach((closedPeriod: T.ClosedPeriod) => {
            const financials = calculatePeriodFinancials(
                closedPeriod.period, projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, 
                partners, taxSettings, exchangeLogs, investments, taxPayments, withdrawals, 
                capitalInflows, periodDebtPayments, periodReceivablePayments, adDeposits
            );
            if (financials) {
                const [year, month] = closedPeriod.period.split('-');
                const periodLabel = `T${parseInt(month)}/${year}`;
                financials.partnerPnlDetails.forEach(pnl => {
                    if (Math.abs(pnl.profit) > 0.01) {
                        pnlEntries.push({
                            id: `pnl-${closedPeriod.period}-${pnl.partnerId}`,
                            date: closedPeriod.closedAt,
                            partnerId: pnl.partnerId,
                            description: `Ghi nhận Lãi/Lỗ kỳ ${periodLabel}`,
                            type: pnl.profit > 0 ? 'inflow' : 'outflow',
                            amount: Math.abs(pnl.profit),
                            sourceName: 'Kết chuyển Lãi/Lỗ',
                            destinationName: 'Vốn chủ sở hữu',
                            workspaceId: user?.uid || '' // PNL is a personal event
                        });
                    }
                });
            }
        });

        return [...ledgerEntries, ...pnlEntries].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    }, [
        assets, capitalInflows, withdrawals, commissions, miscellaneousExpenses,
        exchangeLogs, partnerLedgerEntries, projects, partners, closedPeriods, taxSettings,
        investments, taxPayments, periodDebtPayments, periodReceivablePayments, enrichedDailyAdCosts, user
    ]);


  const enrichedPartners = useMemo<EnrichedPartner[]>(() => {
    return partners.map(p => {
        const inflows = allPartnerLedgerEntries.filter(e => e.partnerId === p.id && e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0);
        const outflows = allPartnerLedgerEntries.filter(e => e.partnerId === p.id && e.type === 'outflow').reduce((sum, e) => sum + e.amount, 0);
        return {
            ...p,
            totalInflow: inflows,
            totalOutflow: outflows,
            balance: inflows - outflows,
        };
    });
  }, [partners, allPartnerLedgerEntries]);
  
  const partnerAssetBalances = useMemo(() => {
        const balances = new Map<string, { assetId: string, assetName: string, balance: number, currency: 'VND' | 'USD' }[]>();
        
        partners.forEach(p => balances.set(p.id, []));

        // 1. Physical assets
        enrichedAssets.forEach(asset => {
            asset.owners.forEach(owner => {
                const partnerBalance = owner.received - owner.withdrawn;
                if (Math.abs(partnerBalance) > 0.01) { // Only show if there's a non-trivial balance
                    const partnerBalances = balances.get(owner.id);
                    if (partnerBalances) {
                        partnerBalances.push({
                            assetId: asset.id,
                            assetName: asset.name,
                            balance: partnerBalance,
                            currency: asset.currency,
                        });
                    }
                }
            });
        });
        
        // 2. Ad account virtual assets
        partnerAdAccountBalances.forEach((adBalances, partnerId) => {
            const partnerPhysicalBalances = balances.get(partnerId);
            if (partnerPhysicalBalances) {
                adBalances.forEach(adBal => {
                    partnerPhysicalBalances.push({
                        assetId: adBal.adAccountNumber, // Use account number as a unique ID
                        assetName: `TK Ads ${adBal.adAccountNumber}`, // Display name
                        balance: adBal.balance,
                        currency: 'USD',
                    });
                });
            }
        });

        return balances;
    }, [enrichedAssets, partners, partnerAdAccountBalances]);

  const periodAssetDetails = useMemo<PeriodAssetDetail[]>(() => {
    if (!currentPeriod) return [];

    const details = assets.map(asset => {
        let openingBalance = asset.balance;
        let change = 0;

        const transactionsForAsset = allTransactions.filter(t => t.asset.id === asset.id);

        transactionsForAsset.forEach(t => {
            const netAmount = t.inflow - t.outflow;
            if (t.date < currentPeriod) {
                openingBalance += netAmount;
            } else if (t.date.startsWith(currentPeriod)) {
                change += netAmount;
            }
        });

        const closingBalance = openingBalance + change;

        return {
            id: asset.id,
            name: asset.name,
            currency: asset.currency,
            openingBalance,
            change,
            closingBalance,
        };
    });

    return details;
}, [currentPeriod, assets, allTransactions]);

  const updateTaxSettings = async (settings: T.TaxSettings) => {
    if (!firestoreDb || !user) return;
    try {
        await setDoc(doc(firestoreDb, 'settings', 'tax'), settings);
        setTaxSettings(settings);
    } catch (e) {
        console.error("Error updating tax settings: ", e);
    }
  };

  const openPeriod = async (period: string) => {
    if (!firestoreDb || !user) return;
    try {
        await setDoc(doc(firestoreDb, 'settings', 'periods'), { activePeriod: period, closedPeriods });
        setActivePeriod(period);
    } catch (e) {
        console.error("Error opening period: ", e);
    }
  };

  const closePeriod = async (period: string) => {
      if (!firestoreDb || period !== activePeriod || !user) return;
      try {
          const newClosedPeriods = [...closedPeriods, { period, closedAt: new Date().toISOString() }];
          await setDoc(doc(firestoreDb, 'settings', 'periods'), { activePeriod: null, closedPeriods: newClosedPeriods });
          setActivePeriod(null);
          setClosedPeriods(newClosedPeriods);
      } catch (e) {
          console.error("Error closing period: ", e);
      }
  };

  const setViewingPeriod = (period: string) => {
      setViewingPeriodInternal(period);
  };

  const clearViewingPeriod = () => {
      setViewingPeriodInternal(null);
  };

  const value: DataContextType = {
    isLoading,
    projects, addProject, updateProject, deleteProject,
    adAccounts, addAdAccount, updateAdAccount, deleteAdAccount,
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
    activePeriod, viewingPeriod, openPeriod, closePeriod, closedPeriods, setViewingPeriod, clearViewingPeriod, seedData,
    currentPage, setCurrentPage,
    currentPeriod, isReadOnly,
    enrichedAssets,
    enrichedDailyAdCosts,
    periodFinancials,
    periodAssetDetails,
    categories, addCategory, updateCategory, deleteCategory,
    niches, addNiche, updateNiche, deleteNiche,
    masterProjects,
    firebaseConfig, setFirebaseConfig,
    periodLiabilities, addPeriodLiability, updatePeriodLiability, deletePeriodLiability,
    periodDebtPayments, addPeriodDebtPayment,
    periodReceivables, addPeriodReceivable, updatePeriodReceivable, deletePeriodReceivable,
    periodReceivablePayments, addPeriodReceivablePayment,
    allTransactions,
    enrichedAdAccounts,
    adAccountTransactions,
    savings, addSaving, updateSaving, deleteSaving,
    investments, addInvestment, updateInvestment, deleteInvestment,
    enrichedPartners,
    partnerLedgerEntries,
    allPartnerLedgerEntries,
    addPartnerLedgerEntry, updatePartnerLedgerEntry, deletePartnerLedgerEntry,
    partnerAssetBalances,
    user,
    authIsLoading,
    permissionError,
    toast,
    clearToast,
    notifications,
    unreadCount,
    markNotificationsAsRead,
    partnerNameMap,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};