export type AdsPlatform = 'google' | 'youtube' | 'tiktok' | 'facebook' | 'other';
export type ProjectType = 'test' | 'deployment';
export type ProjectStatus = 'running' | 'stopped';

export type Page = 
  'Dashboard' | 'Projects' | 'DailyAdCosts' | 'Commissions' | 
  'ExchangeLog' | 'MiscellaneousExpenses' | 'DebtsReceivables' | 'Partners' | 
  'Assets' | 'Tax' | 'Reports' | 'LongReport' | 'Settings';

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

export interface Project {
  id: string;
  name: string;
  adsPlatforms: AdsPlatform[];
  projectType: ProjectType;
  status: ProjectStatus;
  isPartnership?: boolean;
  partnerShares?: PartnerShare[];
  period: string; // "YYYY-MM"
  categoryId?: string;
  nicheId?: string;
}

export interface DailyAdCost {
  id: string;
  projectId: string;
  adAccountNumber: string;
  date: string; // YYYY-MM-DD
  amount: number; // Amount in USD
  vatRate?: number;
}

export interface Commission {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  usdAmount: number;
  predictedRate: number;
  vndAmount: number; // auto-calculated
}

export interface ExchangeLog {
  id: string;
  date: string; // YYYY-MM-DD
  sellingAssetId: string;
  receivingAssetId: string;
  usdAmount: number;
  rate: number;
  vndAmount: number; // auto-calculated
}

export interface MiscellaneousExpense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  assetId: string;
  amount: number; // Amount in original currency (USD or VND)
  rate?: number; // exchange rate if USD
  vndAmount: number; // the final cost in VND
  notes?: string;
  projectId?: string;
  vatRate?: number;
  isPartnership?: boolean;
  partnerShares?: PartnerShare[];
}

export interface DebtPayment {
  id: string;
  liabilityId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  assetId: string;
}

export interface Partner {
  id: string;
  name: string;
}

export interface AssetType {
  id: string;
  name: string;
}

export interface Asset {
  id: string;
  name: string;
  typeId: string;
  balance: number;
  currency: 'USD' | 'VND';
}

export interface Liability {
  id: string;
  description: string;
  totalAmount: number;
  currency: 'USD' | 'VND';
  type: 'long-term' | 'short-term';
  creationDate: string; // YYYY-MM-DD
  inflowAssetId?: string;
  isInstallment?: boolean;
  startDate?: string; // YYYY-MM-DD
  numberOfInstallments?: number;
  completionDate?: string; // YYYY-MM-DD
}

export interface Receivable {
  id: string;
  description: string;
  totalAmount: number;
  currency: 'USD' | 'VND';
  type: 'long-term' | 'short-term';
  creationDate: string; // YYYY-MM-DD
  outflowAssetId: string; // The asset that the money came from
  isInstallment?: boolean;
  startDate?: string; // YYYY-MM-DD
  numberOfInstallments?: number;
  completionDate?: string; // YYYY-MM-DD
}

export interface ReceivablePayment {
  id: string;
  receivableId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  assetId: string; // The asset that received the payment
}


export interface TaxSettings {
  method: 'revenue' | 'profit_vat';
  revenueRate: number; // For 'revenue' method
  vatRate: number; // For 'profit_vat' method (percentage of cost)
  incomeRate: number; // For 'profit_vat' method
  vatInputMethod: 'auto_sum' | 'manual';
  manualInputVat: number;
  incomeTaxBase?: 'personal' | 'total';
  vatOutputBase?: 'personal' | 'total';
  vatInputBase?: 'personal' | 'total';
  taxSeparationAmount?: number;
  periodClosingDay: number;
}


export interface Withdrawal {
  id: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  amount: number; // in original currency
  vndAmount: number;
  withdrawnBy: string; // Partner ID
  description: string;
}

export interface ClosedPeriod {
  period: string; // "YYYY-MM"
  closedAt: string; // ISO string
}

export interface AdDeposit {
  id: string;
  date: string; // YYYY-MM-DD
  adsPlatform: AdsPlatform;
  adAccountNumber: string;
  agency?: string;
  projectId?: string;
  assetId: string; // Asset used to pay for deposit
  usdAmount: number;
  rate: number;
  vndAmount: number; // auto-calculated
  status: 'running' | 'stopped' | 'cancelled';
}

export interface AdFundTransfer {
  id: string;
  date: string;
  fromAdAccountNumber: string;
  toAdAccountNumber: string;
  adsPlatform: AdsPlatform;
  amount: number; // USD
  description?: string;
}

export interface TaxPayment {
  id: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  amount: number;
  period: string; // "YYYY-MM" the period this payment is for
}

export interface CapitalInflow {
  id: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  amount: number;
  description?: string;
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
  // P&L
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
  
  // Tax
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

  // Partner Details
  partnerPnlDetails: PartnerPnl[];

  // Details for report breakdown
  revenueDetails: { name: string; amount: number; }[];
  adCostDetails: { name: string; amount: number; }[];
  miscCostDetails: { name: string; amount: number; }[];

  // Cash Flow Statement
  cashFlow: {
    operating: {
        inflows: { label: string; amount: number }[];
        outflows: { label: string; amount: number }[];
        net: number;
    };
    investing: {
        inflows: { label: string; amount: number }[];
        outflows: { label: string; amount: number }[];
        net: number;
    };
    financing: {
        inflows: { label: string; amount: number }[];
        outflows: { label: string; amount: number }[];
        net: number;
    };
    netChange: number;
    beginningBalance: number;
    endBalance: number;
  };
}

export interface PeriodAssetDetail {
  id: string;
  name: string;
  currency: 'USD' | 'VND';
  openingBalance: number;
  change: number;
  closingBalance: number;
}

export interface PeriodLiability {
  id: string;
  period: string; // "YYYY-MM"
  date: string; // "YYYY-MM-DD"
  description: string;
  amount: number;
  currency: 'USD' | 'VND';
  isPaid: boolean;
  paymentDate?: string; // "YYYY-MM-DD"
  paymentAssetId?: string;
}

export interface PeriodReceivable {
  id: string;
  period: string; // "YYYY-MM"
  date: string; // "YYYY-MM-DD"
  description: string;
  amount: number;
  currency: 'USD' | 'VND';
  isReceived: boolean;
  receiptDate?: string; // "YYYY-MM-DD"
  receiptAssetId?: string;
}