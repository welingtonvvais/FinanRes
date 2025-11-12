import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { AppData, SalesRecord, CashCountItem, Transaction, CashCountHistoryEntry, FeeConfiguration, RecurringTransaction, Account, ExpirationProduct, Employee, PayrollEntry } from '../types';
import { loadAppData, saveAppData } from '../dataService';
import { INITIAL_CASH_COUNT, INITIAL_FEE_CONFIGURATION, INITIAL_ACCOUNTS, PT_BR_WEEKDAYS, INITIAL_SALES_RECORD, INITIAL_TRANSACTION_CATEGORIES } from '../constants';
import { calculateNextDueDate, formatDate } from '../utility';

interface DataContextState {
  data: AppData;
  isLoading: boolean;
  dispatch: React.Dispatch<Action>;
}

type Action =
  | { type: 'SET_INITIAL_DATA'; payload: AppData }
  | { type: 'FINISH_LOADING' }
  | { type: 'UPDATE_DATA'; payload: Partial<AppData> }
  | { type: 'SET_SALES'; payload: React.SetStateAction<SalesRecord[]> }
  | { type: 'SET_CASH_COUNT'; payload: React.SetStateAction<CashCountItem[]> }
  | { type: 'SET_TRANSACTIONS'; payload: React.SetStateAction<Transaction[]> }
  | { type: 'SET_CASH_COUNT_HISTORY'; payload: React.SetStateAction<CashCountHistoryEntry[]> }
  | { type: 'SET_FEE_CONFIG'; payload: FeeConfiguration }
  | { type: 'SET_RECURRING_TRANSACTIONS'; payload: React.SetStateAction<RecurringTransaction[]> }
  | { type: 'SET_ACCOUNTS'; payload: React.SetStateAction<Account[]> }
  | { type: 'SET_TRANSACTION_CATEGORIES'; payload: { revenue: string[]; expense: string[] } }
  | { type: 'SET_EXPIRATION_PRODUCTS'; payload: React.SetStateAction<ExpirationProduct[]> }
  | { type: 'SET_EMPLOYEES'; payload: React.SetStateAction<Employee[]> }
  | { type: 'SET_PAYROLL_ENTRIES'; payload: React.SetStateAction<PayrollEntry[]> };


const initialState: AppData = {
  sales: [],
  cashCount: INITIAL_CASH_COUNT,
  transactions: [],
  cashCountHistory: [],
  feeConfiguration: INITIAL_FEE_CONFIGURATION,
  recurringTransactions: [],
  accounts: INITIAL_ACCOUNTS,
  transactionCategories: INITIAL_TRANSACTION_CATEGORIES,
  expirationProducts: [],
  employees: [],
  payrollEntries: [],
};

const DataContext = createContext<DataContextState | undefined>(undefined);

const dataReducer = (state: AppData, action: Action): AppData => {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return action.payload;
    case 'UPDATE_DATA':
        return { ...state, ...action.payload };
    case 'SET_SALES':
        return { ...state, sales: typeof action.payload === 'function' ? action.payload(state.sales) : action.payload };
    case 'SET_CASH_COUNT':
        return { ...state, cashCount: typeof action.payload === 'function' ? action.payload(state.cashCount) : action.payload };
    case 'SET_TRANSACTIONS':
        return { ...state, transactions: typeof action.payload === 'function' ? action.payload(state.transactions) : action.payload };
    case 'SET_CASH_COUNT_HISTORY':
        return { ...state, cashCountHistory: typeof action.payload === 'function' ? action.payload(state.cashCountHistory) : action.payload };
    case 'SET_FEE_CONFIG':
        return { ...state, feeConfiguration: action.payload };
    case 'SET_RECURRING_TRANSACTIONS':
        return { ...state, recurringTransactions: typeof action.payload === 'function' ? action.payload(state.recurringTransactions) : action.payload };
    case 'SET_ACCOUNTS':
        return { ...state, accounts: typeof action.payload === 'function' ? action.payload(state.accounts) : action.payload };
    case 'SET_TRANSACTION_CATEGORIES':
        return { ...state, transactionCategories: action.payload };
    case 'SET_EXPIRATION_PRODUCTS':
        return { ...state, expirationProducts: typeof action.payload === 'function' ? action.payload(state.expirationProducts) : action.payload };
    case 'SET_EMPLOYEES':
        return { ...state, employees: typeof action.payload === 'function' ? action.payload(state.employees) : action.payload };
    case 'SET_PAYROLL_ENTRIES':
        return { ...state, payrollEntries: typeof action.payload === 'function' ? action.payload(state.payrollEntries) : action.payload };
    default:
      return state;
  }
};

// FIX: Update component signature to use React.FC for better type compatibility.
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, dispatch] = useReducer(dataReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load data on mount
  useEffect(() => {
    const savedData = loadAppData();
    if (savedData) {
      // Ensure all keys exist to prevent errors from older data structures
      const fullData = {
        ...initialState,
        ...savedData,
      };
      dispatch({ type: 'SET_INITIAL_DATA', payload: fullData });
    } else {
       const now = new Date();
       const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
       const dayOfWeek = todayUTC.getUTCDay();
       const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
       const startOfWeek = new Date(todayUTC);
       startOfWeek.setUTCDate(todayUTC.getUTCDate() - daysToSubtract);

       const initialSales = Array.from({ length: 7 }, (_, i) => {
           const date = new Date(startOfWeek);
           date.setUTCDate(startOfWeek.getUTCDate() + i);
           return {
               id: `sale-initial-${i}`,
               date: formatDate(date),
               dayOfWeek: PT_BR_WEEKDAYS[date.getUTCDay()],
               ...INITIAL_SALES_RECORD
           };
       });
       dispatch({ type: 'UPDATE_DATA', payload: { sales: initialSales } });
    }
    setIsLoading(false);
  }, []);

  // Save data on change
  useEffect(() => {
    if (!isLoading) {
      saveAppData(data);
    }
  }, [data, isLoading]);

  const value = { data, isLoading, dispatch };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a DataProvider');
  }
  return context;
};