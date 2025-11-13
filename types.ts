// Fix: Define the Page type to resolve the circular dependency.
export type Page =
  | 'Dashboard'
  | 'Projects'
  | 'DailyAdCosts'
  | 'Commissions'
  | 'ExchangeLog'
  | 'MiscellaneousExpenses'
  | 'CapitalSources'
  | 'Partners'
  | 'AdAccounts'
  | 'SavingsAndInvestments'
  | 'Assets'
  | 'Tax'
  | 'Reports'
  | 'LongReport'
  | 'Settings'
  | 'DebtsReceivables'
  | 'Guide';

export type AdsPlatform = 'google' | 'youtube' | 'tiktok' | 'facebook' | 'other';
export type ProjectType = 'test' | 'deployment';
export type ProjectStatus = 'running' | 'stopped';
export type PermissionLevel = 'view' | 'edit' | 'full';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface PartnerShare {
    partnerId: string;
    sharePercentage: number;
    permission: PermissionLevel;
}

export interface AffiliateUrl {
    name: string;
    url: string;
}

export interface Project {
    id: string;
    name: string;
    adsPlatforms: AdsPlatform[];
    projectType: ProjectType;
    status: ProjectStatus;
    period: string; // YYYY-MM
    isPartnership: boolean;
    partnerShares?: PartnerShare[];
    workspaceId: string;
    categoryId?: string;
    nicheId?: string;
    affiliateUrls?: AffiliateUrl[];
}

export interface AdAccount {
    id: string;
    accountNumber: string;
    adsPlatform: AdsPlatform;
    status: 'running' | 'stopped' | 'cancelled';
    workspaceId: string;
}

export interface DailyAdCost {
    id: string;
    projectId: string;
    adAccountNumber: string;
    date: string; // YYYY-MM-DD
    amount: number; // USD
    vatRate?: number; // percentage
    workspaceId: string;
}

export interface Commission {
    id: string;
    projectId: string;
    date: string; // YYYY-MM-DD
    assetId: string; // ID of the receiving asset
    usdAmount: number;
    predictedRate: number;
    vndAmount: number;
    workspaceId: string;
}

export interface AssetType {
    id: string;
    name: string;
}

export interface AssetShare {
    partnerId: string;
    permission: PermissionLevel;
}

export interface Asset {
    id: string;
    name: string;
    typeId: string;
    balance: number; // initial balance
    currency: 'VND' | 'USD';
    ownershipType: 'personal' | 'shared';
    sharedWith?: AssetShare[];
    workspaceId: string;
}

export interface AdDeposit {
    id: string;
    date: string;
    adsPlatform: AdsPlatform;
    adAccountNumber: string;
    projectId?: string;
    assetId: string; // paying asset ID
    usdAmount: number;
    rate: number;
    vndAmount: number;
    status: 'running' | 'stopped' | 'cancelled';
    workspaceId: string;
}

export interface AdFundTransfer {
    id: string;
    date: string;
    adsPlatform: AdsPlatform;
    fromAdAccountNumber: string;
    toAdAccountNumber: string;
    amount: number; // USD
    description: string;
    workspaceId: string;
}

export interface ExchangeLog {
    id: string;
    date: string;
    sellingAssetId: string; // USD asset
    receivingAssetId: string; // VND asset
    usdAmount: number;
    rate: number;
    vndAmount: number;
    workspaceId: string;
}

export interface MiscellaneousExpense {
    id: string;
    date: string;
    description: string;
    assetId: string;
    amount: number; // Can be USD or VND depending on asset
    vndAmount: number; // Always VND for calculation
    projectId?: string;
    vatRate?: number;
    isPartnership?: boolean;
    partnerShares?: PartnerShare[];
    workspaceId: string;
}

export interface Partner {
    id: string;
    name: string;
    loginEmail?: string;
    ownerUid: string;
    ownerName: string;
    isSelf?: boolean;
    status?: 'unlinked' | 'pending' | 'linked';
}

export interface PartnerRequest {
    id: string;
    senderUid: string;
    senderName: string;
    senderEmail: string;
    recipientEmail: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string; // ISO date string
}

export interface Withdrawal {
    id: string;
    date: string;
    assetId: string;
    amount: number; // in asset's currency
    vndAmount: number; // always VND equivalent for PnL
    withdrawnBy: string; // partner ID
    description: string;
    workspaceId: string;
}

export interface CapitalInflow {
    id: string;
    date: string;
    assetId: string;
    amount: number;
    description: string;
    contributedByPartnerId?: string; // partner ID
    externalInvestorName?: string;
    workspaceId: string;
}

export interface Liability {
    id: string;
    description: string;
    totalAmount: number;
    currency: 'VND' | 'USD';
    type: 'short-term' | 'long-term';
    creationDate: string;
    completionDate?: string;
    inflowAssetId?: string;
    isInstallment?: boolean;
    startDate?: string;
    numberOfInstallments?: number;
    workspaceId: string;
}

export interface DebtPayment {
    id: string;
    liabilityId: string;
    date: string;
    amount: number;
    assetId: string;
    workspaceId: string;
}

export interface Receivable {
    id: string;
    description: string;
    totalAmount: number;
    currency: 'VND' | 'USD';
    type: 'short-term' | 'long-term';
    creationDate: string;
    completionDate?: string;
    outflowAssetId: string;
    isInstallment?: boolean;
    startDate?: string;
    numberOfInstallments?: number;
    workspaceId: string;
}

export interface ReceivablePayment {
    id: string;
    receivableId: string;
    date: string;
    amount: number;
    assetId: string;
    workspaceId: string;
}

export interface TaxSettings {
    method: 'revenue' | 'profit_vat';
    revenueRate: number; // for revenue method
    vatRate: number; // for profit_vat method
    incomeRate: number; // for profit_vat method
    vatInputMethod: 'auto_sum' | 'manual';
    manualInputVat: number;
    incomeTaxBase: 'personal' | 'total';
    vatOutputBase: 'personal' | 'total';
    vatInputBase: 'personal' | 'total';
    taxSeparationAmount: number;
    periodClosingDay: number;
}

export interface TaxPayment {
    id: string;
    period: string;
    date: string;
    amount: number;
    assetId: string;
    workspaceId: string;
}

export interface ClosedPeriod {
    period: string; // YYYY-MM
    closedAt: string; // ISO date string
}

export interface Category {
    id: string;
    name: string;
    workspaceId: string;
}

export interface Niche {
    id: string;
    name: string;
    categoryId: string;
    workspaceId: string;
}

export interface PeriodAssetDetail {
    id: string;
    name: string;
    currency: 'VND' | 'USD';
    openingBalance: number;
    change: number;
    closingBalance: number;
}

export interface AdAccountTransaction {
    id: string;
    date: string;
    adAccountNumber: string;
    description: string;
    deposit: number;
    spent: number;
    balance: number;
}

export interface EnrichedAdAccount extends AdAccount {
    balance: number;
}

export interface EnrichedPartner extends Partner {
    totalInflow: number;
    totalOutflow: number;
    balance: number;
}

export interface PartnerLedgerEntry {
    id: string;
    date: string;
    partnerId: string;
    description: string;
    type: 'inflow' | 'outflow';
    amount: number;
    sourceName?: string;
    destinationName?: string;
    workspaceId: string;
}

export interface Saving {
    id: string;
    description: string;
    assetId: string;
    principalAmount: number;
    currency: 'VND' | 'USD';
    startDate: string;
    endDate: string;
    interestRate: number;
    status: 'active' | 'matured';
    workspaceId: string;
}

export interface Investment {
    id: string;
    description: string;
    assetId: string;
    investmentAmount: number;
    currency: 'VND' | 'USD';
    date: string;
    status: 'ongoing' | 'liquidated';
    liquidationDate?: string;
    liquidationAmount?: number;
    liquidationAssetId?: string;
    workspaceId: string;
}

export interface PeriodLiability {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: 'VND' | 'USD';
    period: string;
    workspaceId: string;
    isPartnership?: boolean;
    partnerShares?: PartnerShare[];
}

export interface PeriodDebtPayment {
    id: string;
    periodLiabilityId: string;
    date: string;
    amount: number;
    assetId: string;
    workspaceId: string;
}

export interface PeriodReceivable {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: 'VND' | 'USD';
    period: string;
    workspaceId: string;
    isPartnership?: boolean;
    partnerShares?: PartnerShare[];
}

export interface PeriodReceivablePayment {
    id: string;
    periodReceivableId: string;
    date: string;
    amount: number;
    assetId: string;
    workspaceId: string;
}

export interface PartnerPnl {
    partnerId: string;
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    inputVat: number;
    taxPayable: number;
}

export interface TaxCalculationResult {
    taxPayable: number;
    incomeTax: number;
    netVat: number;
    outputVat: number;
}

export interface PeriodFinancials {
    totalRevenue: number;
    totalAdCost: number;
    totalMiscCost: number;
    totalCost: number;
    totalProfit: number;
    totalInputVat: number;
    myRevenue: number;
    myCost: number;
    myProfit: number;
    myInputVat: number;
    exchangeRateGainLoss: number;
    investmentGainLoss: number;
    profitBeforeTax: number;
    netProfit: number;
    tax: TaxCalculationResult;
    taxBases: {
        initialRevenueBase: number;
        taxSeparationAmount: number;
        revenueBase: number;
        costBase: number;
        profitBase: number;
        vatOutputBase: number;
        vatInputBase: number;
    };
    partnerPnlDetails: PartnerPnl[];
    revenueDetails: { name: string; amount: number }[];
    adCostDetails: { name: string; amount: number }[];
    miscCostDetails: { name: string; amount: number }[];
    cashFlow: {
        operating: { inflows: { label: string, amount: number }[]; outflows: { label: string, amount: number }[]; net: number; };
        investing: { inflows: { label: string, amount: number }[]; outflows: { label: string, amount: number }[]; net: number; };
        financing: { inflows: { label: string, amount: number }[]; outflows: { label: string, amount: number }[]; net: number; };
        netChange: number;
        beginningBalance: number;
        endBalance: number;
    };
}

export interface Notification {
    id: string;
    timestamp: number;
    message: string;
    type: 'system' | 'partner';
    read: boolean;
}