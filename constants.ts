import { SalesRecord, CashCountItem, Transaction, TransactionColumn, FeeConfiguration, Account } from './types';

export const PT_BR_WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const PT_BR_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const INITIAL_SALES_RECORD: Omit<SalesRecord, 'id' | 'date' | 'dayOfWeek'> = {
  cash: 0,
  pixManual: 0,
  pixQRCode: 0,
  creditMastercard: 0,
  creditVisa: 0,
  creditElo: 0,
  debitMastercard: 0,
  debitVisa: 0,
  debitElo: 0,
};

export const INITIAL_CASH_COUNT: CashCountItem[] = [
  { id: '1', label: 'Cédula de R$ 2,00', value: 2, quantity: 0 },
  { id: '2', label: 'Cédula de R$ 5,00', value: 5, quantity: 0 },
  { id: '3', label: 'Cédula de R$ 10,00', value: 10, quantity: 0 },
  { id: '4', label: 'Cédula de R$ 20,00', value: 20, quantity: 0 },
  { id: '5', label: 'Cédula de R$ 50,00', value: 50, quantity: 0 },
  { id: '6', label: 'Cédula de R$ 100,00', value: 100, quantity: 0 },
  { id: '7', label: 'Cédula de R$ 200,00', value: 200, quantity: 0 },
  { id: '8', label: 'Saldo Conta Stone', value: 1, quantity: '##' },
  { id: '9', label: 'Saldo Cofre', value: 1, quantity: '##' },
];

export const INITIAL_FEE_CONFIGURATION: FeeConfiguration = {
  creditVisa: 0,
  creditMastercard: 0,
  creditElo: 0,
  debitVisa: 0,
  debitMastercard: 0,
  debitElo: 0,
  pixQRCode: 0,
  investmentPercentage: 0,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Caixa Físico', initialBalance: 0 },
  { id: 'acc-2', name: 'Cofre', initialBalance: 0 },
  { id: 'acc-3', name: 'Stone I.P', initialBalance: 0 },
  { id: 'acc-4', name: 'Mercado Pago', initialBalance: 0 },
  { id: 'acc-5', name: 'PagBank', initialBalance: 0 },
  { id: 'acc-6', name: 'Banco do Brasil', initialBalance: 0 },
  { id: 'acc-7', name: 'Stone I.P - Investimento', initialBalance: 0 },
];

export const SALES_COLUMNS = [
    { key: 'date', label: 'Data' },
    { key: 'dayOfWeek', label: 'Dia Semana' },
    { key: 'cash', label: 'Dinheiro' },
    { key: 'pixManual', label: 'Pix Manual' },
    { key: 'pixQRCode', label: 'Pix QR Code' },
    { key: 'creditMastercard', label: 'MasterCard' },
    { key: 'creditVisa', label: 'Visa' },
    { key: 'creditElo', label: 'Elo' },
    { key: 'debitMastercard', label: 'MasterCard' },
    { key: 'debitVisa', label: 'Visa' },
    { key: 'debitElo', label: 'Elo' },
];

export const INITIAL_TRANSACTION_CATEGORIES = {
    revenue: ['Venda de Produtos', 'Outras Receitas', 'Transferência de Entrada', 'Ajuste de Saldo - Aumento'],
    expense: ['Produtos P/ Venda', 'Fornecedores', 'Despesa Variável', 'Impostos', 'Material Uso/Consumo', 'Salários', 'Pró-labore', 'Despesas Fixas', 'Juros', 'Tarifa Adquirente', 'Doação', 'Transferência de Saída', 'Ajuste de Saldo - Redução'],
};

export const REVENUE_COLUMNS: TransactionColumn[] = [
    { key: 'date', label: 'Data' },
    { key: 'description', label: 'Descrição' },
    { key: 'observation', label: 'Observação' },
    { key: 'docNumber', label: 'Número Doc' },
    { key: 'category', label: 'Categoria' },
    { key: 'account', label: 'Conta' },
    { key: 'value', label: 'Valor (R$)', isCurrency: true },
];

export const EXPENSE_COLUMNS: TransactionColumn[] = [
    { key: 'date', label: 'Data' },
    { key: 'description', label: 'Descrição' },
    { key: 'supplier', label: 'Fornecedor' },
    { key: 'docNumber', label: 'Número Doc' },
    { key: 'category', label: 'Categoria' },
    { key: 'account', label: 'Conta' },
    { key: 'value', label: 'Valor (R$)', isCurrency: true },
];