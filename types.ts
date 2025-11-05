// This file contains type definitions for the entire application.

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
  | 'Assets' 
  | 'Tax' 
  | 'Reports' 
  | 'LongReport'
  | 'DebtsReceivables'
  | 'Settings';

export type AdsPlatform = 'google' | 'youtube' | 'tiktok' | 'facebook' | 'other';
export type ProjectType = 'test' | 'deployment';
export type ProjectStatus = 'running' | 'stopped';

export interface PartnerShare {
    partnerId: string;
    sharePercentage: number;
}

export interface Project {
    id: string;
    name: string;
    adsPlatforms: AdsPlatform[];
    projectType: ProjectType;
    status: ProjectStatus;
    isPartnership: boolean;
    partnerShares?: PartnerShare[];
    period: string;
    categoryId?: string;
    nicheId?: string;
}

export interface AdAccount {
    id: string;
    accountNumber: string;
    adsPlatform: AdsPlatform;
    status: 'running' | 'stopped' | 'cancelled';
}

export interface DailyAdCost {
    id: string;
    projectId: string;
    adAccountNumber: string;
    date: string;
    amount: number; // USD amount
    vatRate?: number;
}

export interface AdDeposit {
    id: string;
    date: string;
    adsPlatform: AdsPlatform;
    adAccountNumber: string;
    projectId?: string;
    agency?: string;
    assetId: string; // The asset (bank account, etc.) used to pay
    usdAmount: number;
    rate: number;
    vndAmount: number;
    status: 'running' | 'stopped' | 'cancelled';
}

export interface AdFundTransfer {
    id: string;
    date: string;
    adsPlatform: AdsPlatform;
    fromAdAccountNumber: string;
    toAdAccountNumber: string;
    amount: number; // USD
    description?: string;
}

export interface Commission {
    id: string;
    projectId: string;
    date: string;
    assetId: string; // The asset (platform) receiving the commission
    usdAmount: number;
    predictedRate: number;
    vndAmount: number;
}

export interface AssetType {
    id: string;
    name: string;
}

export interface Asset {
    id: string;
    name: string;
    typeId: string;
    balance: number; // initial balance
    currency: 'VND' | 'USD';
}

export interface Liability {
    id: string;
    description: string;
    totalAmount: number;
    currency: 'VND' | 'USD';
    type: 'short-term' | 'long-term';
    creationDate: string;
    completionDate?: string;
    inflowAssetId?: string; // If this liability resulted in a cash inflow to an asset
    isInstallment?: boolean;
    startDate?: string;
    numberOfInstallments?: number;
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
}

export interface ReceivablePayment {
    id: string;
    receivableId: string;
    date: string;
    amount: number;
    assetId: string;
}

export interface ExchangeLog {
    id: string;
    date: string;
    sellingAssetId: string;
    receivingAssetId: string;
    usdAmount: number;
    rate: number;
    vndAmount: number;
}

export interface MiscellaneousExpense {
    id: string;
    date: string;
    description: string;
    assetId: string;
    projectId?: string;
    amount: number; // Can be USD or VND depending on asset currency
    rate?: number; // if asset is USD
    vndAmount: number;
    vatRate?: number;
    notes?: string;
    isPartnership?: boolean;
    partnerShares?: PartnerShare[];
}

export interface Partner {
    id: string;
    name: string;
}

export interface Withdrawal {
    id: string;
    date: string;
    assetId: string;
    amount: number;
    vndAmount: number;
    withdrawnBy: string; // partnerId
    description: string;
}

export interface DebtPayment {
    id: string;
    liabilityId: string;
    date: string;
    amount: number;
    assetId: string;
}

export interface TaxPayment {
    id: string;
    period: string;
    date: string;
    amount: number;
    assetId: string;
}

export interface CapitalInflow {
    id: string;
    date: string;
    assetId: string;
    amount: number;
    description: string;
    contributedByPartnerId?: string;
    externalInvestorName?: string;
}

export interface TaxSettings {
    method: 'revenue' | 'profit_vat';
    revenueRate: number;
    vatRate: number;
    incomeRate: number;
    vatInputMethod: 'auto_sum' | 'manual';
    manualInputVat: number;
    incomeTaxBase: 'personal' | 'total';
    vatOutputBase: 'personal' | 'total';
    vatInputBase: 'personal' | 'total';
    taxSeparationAmount: number;
    periodClosingDay: number;
}

export interface ClosedPeriod {
    period: string;
    closedAt: string;
}

export interface TaxCalculationResult {
    taxPayable: number;
    incomeTax: number;
    netVat: number;
    outputVat: number;
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

export interface CashFlowDetails {
    label: string;
    amount: number;
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
        operating: { inflows: CashFlowDetails[]; outflows: CashFlowDetails[]; net: number };
        investing: { inflows: CashFlowDetails[]; outflows: CashFlowDetails[]; net: number };
        financing: { inflows: CashFlowDetails[]; outflows: CashFlowDetails[]; net: number };
        netChange: number;
        beginningBalance: number;
        endBalance: number;
    };
}

export interface PeriodAssetDetail {
    id: string;
    name: string;
    currency: 'VND' | 'USD';
    openingBalance: number;
    change: number;
    closingBalance: number;
}

export interface Category {
    id: string;
    name: string;
}

export interface Niche {
    id: string;
    name: string;
    categoryId: string;
}

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

// FIX: Add missing type definitions for period-specific debts and receivables
export interface PeriodLiability {
    id: string;
    period: string;
    date: string;
    description: string;
    amount: number;
    currency: 'VND' | 'USD';
}
  
export interface PeriodReceivable {
    id: string;
    period: string;
    date: string;
    description: string;
    amount: number;
    currency: 'VND' | 'USD';
}

export interface PeriodDebtPayment {
    id: string;
    periodLiabilityId: string;
    date: string;
    amount: number;
    assetId: string;
}

export interface PeriodReceivablePayment {
    id: string;
    periodReceivableId: string;
    date: string;
    amount: number;
    assetId: string;
}