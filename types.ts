export type View = 'dashboard' | 'sales' | 'cash' | 'transactions' | 'configuration' | 'recurring' | 'reports';
export type Module = 'financeiro' | 'comercial' | 'estoque' | 'pessoal';
export type HRView = 'employees' | 'payrollEntries' | 'payroll';

export interface SalesRecord {
  id: string;
  date: string;
  dayOfWeek: string;
  cash: number;
  pixManual: number;
  pixQRCode: number;
  creditMastercard: number;
  creditVisa: number;
  creditElo: number;
  debitMastercard: number;
  debitVisa: number;
  debitElo: number;
}

export interface CashCountItem {
  id: string;
  label: string;
  value: number;
  quantity: number | string;
}

export interface Transaction {
  id:string;
  type: 'revenue' | 'expense';
  date: string;
  description: string;
  observation: string; // Specific to revenue
  supplier: string;    // Specific to expense
  docNumber: string;
  category: string;
  account: string;
  value: number;
}

export type RecurringTransactionFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: 'revenue' | 'expense';
  description: string;
  observation: string;
  supplier: string;
  docNumber: string;
  category: string;
  account: string;
  value: number;
  frequency: RecurringTransactionFrequency;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
}

export type TransactionColumn = {
    key: keyof Transaction;
    label: string;
    isCurrency?: boolean;
};

export interface CashCountHistoryEntry {
  id: string;
  date: string; // ISO string for timestamp
  observation: string;
  totalValue: number;
  details: CashCountItem[];
}

export interface FeeConfiguration {
  creditVisa: number;
  creditMastercard: number;
  creditElo: number;
  debitVisa: number;
  debitMastercard: number;
  debitElo: number;
  pixQRCode: number;
  investmentPercentage: number;
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
}

export interface ExpirationProduct {
  id: string;
  barcode: string;
  description: string;
  quantity: number;
  expirationDate: string; // Stored as DD/MM/AAAA
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  admissionDate: string; // Stored as DD/MM/AAAA
  salary: number;
  status: 'active' | 'inactive';
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  description: string;
  type: 'earning' | 'deduction';
  value: number;
  month: number; // 1-12
  year: number;
}

export type DataKey = 'sales' | 'cashCount' | 'transactions' | 'cashCountHistory' | 'feeConfiguration' | 'recurringTransactions' | 'accounts' | 'transactionCategories' | 'expirationProducts' | 'employees' | 'payrollEntries' | 'all';

export interface AppData {
  sales: SalesRecord[];
  cashCount: CashCountItem[];
  transactions: Transaction[];
  cashCountHistory: CashCountHistoryEntry[];
  feeConfiguration: FeeConfiguration;
  recurringTransactions: RecurringTransaction[];
  accounts: Account[];
  transactionCategories: {
    revenue: string[];
    expense: string[];
  };
  expirationProducts: ExpirationProduct[];
  employees: Employee[];
  payrollEntries: PayrollEntry[];
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}