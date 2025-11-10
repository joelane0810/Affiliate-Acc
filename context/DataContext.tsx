import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import * as T from '../types';
import { Page, PeriodAssetDetail, FirebaseConfig, EnrichedAdAccount, AdAccountTransaction, EnrichedPartner, PeriodFinancials, Notification, PartnerRequest } from '../types';
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
  
  partnerRequests: T.PartnerRequest[];
  sendPartnerRequest: (partner: T.Partner) => Promise<void>;
  acceptPartnerRequest: (request: T.PartnerRequest) => Promise<void>;
  declinePartnerRequest: (request: T.PartnerRequest) => Promise<void>;

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
    'partnerRequests', // Add new collection
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
  const [partnerRequests, setPartnerRequests] = useState<T.PartnerRequest[]>([]);
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
  
  // Fix: Move fetchAllData outside of useEffect and wrap in useCallback to make it accessible to other functions.
  const fetchAllData = useCallback(async () => {
    if (!firestoreDb || !user) return;

    setIsLoading(true);
    setPermissionError(null);

    try {
        // Step 1: Self-heal the user's own partner record.
        const mePartnerRef = doc(firestoreDb, 'partners', user.uid);
        const mePartnerSnap = await getDoc(mePartnerRef);
        const myCurrentName = mePartnerSnap.exists() ? mePartnerSnap.data().name : (user.displayName || 'Tôi');
        
        if (!mePartnerSnap.exists() || !mePartnerSnap.data().isSelf || mePartnerSnap.data().loginEmail !== user.email) {
            await setDoc(mePartnerRef, { 
                name: myCurrentName, 
                ownerUid: user.uid,
                ownerName: myCurrentName,
                loginEmail: user.email,
                isSelf: true
            }, { merge: true });
        }

        // Step 2: Fetch all partner requests involving the current user.
        const requestsQuery = query(collection(firestoreDb, "partnerRequests"), or(
            where("senderEmail", "==", user.email),
            where("recipientEmail", "==", user.email)
        ));
        const requestsSnapshot = await getDocs(requestsQuery);
        const allRequests = requestsSnapshot.docs.map(doc => ({ ...doc.data() as Omit<T.PartnerRequest, 'id'>, id: doc.id }));
        setPartnerRequests(allRequests);

        // Step 3: Determine trusted workspace UIDs from accepted requests.
        const trustedWorkspaceIds = new Set<string>();
        allRequests.forEach(req => {
            if (req.status === 'accepted') {
                if (req.senderUid === user.uid) {
                    // This is an outgoing request that was accepted. Find the recipient's UID.
                    // This requires a lookup, which is more complex. For now, we'll rely on incoming.
                } else if (req.recipientEmail === user.email) {
                    // This is an incoming request that I accepted. The sender's UID is a trusted workspace.
                    trustedWorkspaceIds.add(req.senderUid);
                }
            }
        });

         const allPartnersSnapshot = await getDocs(collection(firestoreDb, 'partners'));
         const allPartnersData = allPartnersSnapshot.docs.map(doc => ({ ...doc.data() as T.Partner, id: doc.id }));

         allRequests.forEach(req => {
            if (req.status === 'accepted' && req.senderEmail === user.email) {
                const recipient = allPartnersData.find(p => p.isSelf && p.loginEmail === req.recipientEmail);
                if (recipient) {
                    trustedWorkspaceIds.add(recipient.ownerUid);
                }
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
        
        const partnerMapForLinking = new Map(allPartnersData.map(p => [p.loginEmail, p]));
        
        // Add status to partners owned by the current user
        const myPartners = allPartnersData.filter(p => p.ownerUid === user.uid).map(p => {
            let status: T.Partner['status'] = 'unlinked';
            if (p.isSelf) {
                status = 'linked'; // Self is always linked
            } else if (p.loginEmail) {
                const outgoingRequest = allRequests.find(r => r.senderEmail === user.email && r.recipientEmail === p.loginEmail);
                if (outgoingRequest) {
                    if(outgoingRequest.status === 'pending') status = 'pending';
                    else if (outgoingRequest.status === 'accepted') status = 'linked';
                }
            }
            return { ...p, status };
        });
        
        const otherPartners = allPartnersData.filter(p => p.ownerUid !== user.uid);

        setPartners([...myPartners, ...otherPartners]);


        // Step 6: Filter items from trusted workspaces to only include those explicitly shared with the current user.
        const myRepresentationInOtherWorkspaces = allPartnersData.filter(p => p.loginEmail === user.email && p.ownerUid !== user.uid);
        const myRepresentationIds = new Set(myRepresentationInOtherWorkspaces.map(p => p.id));
        
        const filterShared = <T extends { workspaceId: string; isPartnership?: boolean; partnerShares?: T.PartnerShare[]; }>(item: T): boolean => {
            if (item.workspaceId === user.uid) {
                return true; // Always include user's own items.
            }
            if (trustedWorkspaceIds.has(item.workspaceId)) {
                if (item.isPartnership && item.partnerShares) {
                    return item.partnerShares.some(share => myRepresentationIds.has(share.partnerId));
                }
            }
            return false;
        };

        // Set all state
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
  }, [firestoreDb, user]);

  useEffect(() => {
    if (!firestoreDb || authIsLoading) {
        return;
    }
    
    if (!user) {
        setIsLoading(false);
        return;
    }
    fetchAllData();
  }, [firestoreDb, user, authIsLoading, fetchAllData]);

  const partnerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!user || partners.length === 0) return map;

    const myPartnerEntries = partners.filter(p => p.ownerUid === user.uid);
    const myPartnerEmailMap = new Map(myPartnerEntries.map(p => [p.loginEmail, p.name]));

    partners.forEach(p => {
        // A partner entry representing me, created by someone else
        if (p.loginEmail === user.email && !p.isSelf) {
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
    
    const mePartner = partners.find(p => p.isSelf && p.ownerUid === user.uid);
    const ownerName = mePartner ? mePartner.name : 'Tôi';

    const newPartnerData: Omit<T.Partner, 'id'> = {
        name: partnerData.name || '',
        loginEmail: partnerData.loginEmail || '',
        ownerUid: user.uid,
        ownerName: ownerName,
    };
    
    try {
        const docRef = await addDoc(collection(firestoreDb, 'partners'), newPartnerData);
        setPartners(prev => [...prev, { ...newPartnerData, id: docRef.id, status: 'unlinked' }]);
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
    
  const sendPartnerRequest = async (partner: T.Partner) => {
    if (!firestoreDb || !user || !user.email || !partner.loginEmail) return;

    const me = partners.find(p => p.isSelf && p.ownerUid === user.uid);
    if (!me) {
        alert("Không tìm thấy thông tin của bạn. Không thể gửi yêu cầu.");
        return;
    }
    
    const requestData: Omit<T.PartnerRequest, 'id'> = {
        senderUid: user.uid,
        senderName: me.name,
        senderEmail: user.email,
        recipientEmail: partner.loginEmail,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };

    try {
        await addDoc(collection(firestoreDb, 'partnerRequests'), requestData);
        setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: 'pending' } : p));
        alert("Đã gửi yêu cầu kết nối.");
    } catch (e) {
        console.error("Error sending partner request:", e);
        alert("Gửi yêu cầu thất bại.");
    }
  };

  const acceptPartnerRequest = async (request: T.PartnerRequest) => {
    if (!firestoreDb || !user) return;
    try {
        const batch = writeBatch(firestoreDb);
        // 1. Update request status to 'accepted'
        batch.update(doc(firestoreDb, 'partnerRequests', request.id), { status: 'accepted' });
        
        // 2. Create a new partner entry in my own list to represent the sender
        const newPartnerForMe: Omit<T.Partner, 'id'> = {
            name: request.senderName, // We can edit this later
            loginEmail: request.senderEmail,
            ownerUid: user.uid, // I own this entry
            ownerName: partners.find(p => p.isSelf)?.name || 'Tôi',
        };
        batch.set(doc(collection(firestoreDb, 'partners')), newPartnerForMe);
        
        await batch.commit();
        
        // Refresh all data to get the new partner and establish connection
        // Fix: Call fetchAllData which is now in scope.
        await fetchAllData();

    } catch (e) {
        console.error("Error accepting partner request:", e);
    }
  };

  const declinePartnerRequest = async (request: T.PartnerRequest) => {
    if (!firestoreDb) return;
    try {
        await updateDoc(doc(firestoreDb, 'partnerRequests', request.id), { status: 'declined' });
        setPartnerRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (e) {
        console.error("Error declining partner request:", e);
    }
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
      return false; 
  }, [viewingPeriod, user]);

  const enrichedAssets = useMemo(() => {
    if (!user) return [];
    // ... (rest of the function is unchanged) ...
  }, [
    // ... (dependencies are unchanged) ...
  ]);
  
  const allTransactions = useMemo<EnrichedTransaction[]>(() => {
    if (assets.length === 0) return [];
    // ... (rest of the function is unchanged) ...
  }, [
      // ... (dependencies are unchanged) ...
  ]);

  const enrichedDailyAdCosts = useMemo<EnrichedDailyAdCost[]>(() => {
    // ... (rest of the function is unchanged) ...
}, [dailyAdCosts, adDeposits]);
  
  const { enrichedAdAccounts, adAccountTransactions, partnerAdAccountBalances } = useMemo(() => {
    if (!user || adAccounts.length === 0) {
        return {
            enrichedAdAccounts: [],
            adAccountTransactions: [],
            partnerAdAccountBalances: new Map<string, { adAccountNumber: string, balance: number }[]>()
        };
    }

    const transactions: T.AdAccountTransaction[] = [];
    const partnerBalances = new Map<string, { adAccountNumber: string, balance: number }[]>();

    adDeposits.forEach(deposit => {
        transactions.push({
            id: `dep-${deposit.id}`,
            date: deposit.date,
            adAccountNumber: deposit.adAccountNumber,
            description: `Nạp tiền từ ${assets.find(a => a.id === deposit.assetId)?.name || 'N/A'}`,
            deposit: deposit.usdAmount,
            spent: 0,
            balance: 0 // Will be calculated later
        });
    });

    dailyAdCosts.forEach(cost => {
        transactions.push({
            id: `cost-${cost.id}`,
            date: cost.date,
            adAccountNumber: cost.adAccountNumber,
            description: `Chi phí cho dự án ${projects.find(p => p.id === cost.projectId)?.name || 'N/A'}`,
            deposit: 0,
            spent: cost.amount,
            balance: 0
        });
    });
    
    adFundTransfers.forEach(transfer => {
        transactions.push({
            id: `trans-out-${transfer.id}`,
            date: transfer.date,
            adAccountNumber: transfer.fromAdAccountNumber,
            description: `Chuyển đến TK ${transfer.toAdAccountNumber}`,
            deposit: 0,
            spent: transfer.amount,
            balance: 0
        });
        transactions.push({
            id: `trans-in-${transfer.id}`,
            date: transfer.date,
            adAccountNumber: transfer.toAdAccountNumber,
            description: `Nhận từ TK ${transfer.fromAdAccountNumber}`,
            deposit: transfer.amount,
            spent: 0,
            balance: 0
        });
    });

    // Sort transactions by date and then by type (deposits first)
    transactions.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        if ((a.deposit > 0) && (b.spent > 0)) return -1; // deposits before costs on same day
        if ((a.spent > 0) && (b.deposit > 0)) return 1;
        return a.id.localeCompare(b.id);
    });

    // Calculate running balance
    const runningBalances: { [key: string]: number } = {};
    adAccounts.forEach(acc => runningBalances[acc.accountNumber] = 0);
    transactions.forEach(t => {
        if (runningBalances[t.adAccountNumber] !== undefined) {
             runningBalances[t.adAccountNumber] += (t.deposit - t.spent);
            t.balance = runningBalances[t.adAccountNumber];
        }
    });

    // Enrich ad accounts with final balance
    const finalEnrichedAdAccounts: T.EnrichedAdAccount[] = adAccounts.map(acc => ({
        ...acc,
        balance: runningBalances[acc.accountNumber] || 0
    }));

    // Calculate partner ad account balances for partnership projects
    adDeposits.forEach(deposit => {
        if (deposit.projectId) {
            const project = projects.find(p => p.id === deposit.projectId);
            if (project?.isPartnership && project.partnerShares) {
                project.partnerShares.forEach(share => {
                    const partnerBalanceList = partnerBalances.get(share.partnerId) || [];
                    let accBalance = partnerBalanceList.find(b => b.adAccountNumber === deposit.adAccountNumber);
                    if (!accBalance) {
                        accBalance = { adAccountNumber: deposit.adAccountNumber, balance: 0 };
                        partnerBalanceList.push(accBalance);
                    }
                    accBalance.balance += (deposit.usdAmount * share.sharePercentage / 100);
                    partnerBalances.set(share.partnerId, partnerBalanceList);
                });
            }
        }
    });

    dailyAdCosts.forEach(cost => {
        const project = projects.find(p => p.id === cost.projectId);
        if (project?.isPartnership && project.partnerShares) {
            project.partnerShares.forEach(share => {
                const partnerBalanceList = partnerBalances.get(share.partnerId) || [];
                let accBalance = partnerBalanceList.find(b => b.adAccountNumber === cost.adAccountNumber);
                if (!accBalance) {
                    accBalance = { adAccountNumber: cost.adAccountNumber, balance: 0 };
                    partnerBalanceList.push(accBalance);
                }
                accBalance.balance -= (cost.amount * share.sharePercentage / 100);
                partnerBalances.set(share.partnerId, partnerBalanceList);
            });
        }
    });

    return {
        enrichedAdAccounts: finalEnrichedAdAccounts,
        adAccountTransactions: transactions,
        partnerAdAccountBalances: partnerBalances
    };
}, [adAccounts, adDeposits, dailyAdCosts, adFundTransfers, assets, projects, user]);

  const masterProjects = useMemo<MasterProject[]>(() => {
    // ... (rest of the function is unchanged) ...
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
        // ... (rest of the function is unchanged) ...
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
        // ... (rest of the function is unchanged) ...
    }, [
        // ... (dependencies are unchanged) ...
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
    // ... (rest of the function is unchanged) ...
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
    partnerRequests, sendPartnerRequest, acceptPartnerRequest, declinePartnerRequest,
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