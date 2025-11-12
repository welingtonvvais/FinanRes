import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionColumn, Account } from '../types';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, formatDate, parseDate } from '../utility';
import { REVENUE_COLUMNS, EXPENSE_COLUMNS } from '../constants';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { Pagination } from '../components/Pagination';
import { Icon, ICONS } from '../components/Icon';


const TransactionEditForm: React.FC<{
    transaction: Transaction;
    onSave: (transaction: Transaction) => void;
    onCancel: () => void;
    accounts: Account[];
    transactionCategories: { revenue: string[], expense: string[] };
}> = ({ transaction, onSave, onCancel, accounts, transactionCategories }) => {
    const [formData, setFormData] = useState<Transaction>(transaction);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const type = formData.type;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                    <input type="date" name="date" value={parseDate(formData.date).toISOString().split('T')[0]} onChange={e => {
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        const newDate = new Date(Date.UTC(year, month - 1, day));
                        setFormData({...formData, date: formatDate(newDate)});
                    }} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                    <input type="number" name="value" step="0.01" value={formData.value || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="R$ 0,00" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                    <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
                 {type === 'revenue' ? (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Observação</label>
                        <input type="text" name="observation" value={formData.observation} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Fornecedor</label>
                        <input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Número Doc</label>
                    <input type="text" name="docNumber" value={formData.docNumber} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                       <option value="">Selecione...</option>
                       {transactionCategories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Conta</label>
                    <select name="account" value={formData.account} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                       <option value="">Selecione...</option>
                       {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold">
                    Cancelar
                </button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    Salvar Alterações
                </button>
            </div>
        </form>
    );
};

export const TransactionsView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data, dispatch } = useAppContext();
    const { transactions, accounts } = data;
    const { addToast } = useToast();
    
    const ITEMS_PER_PAGE = 10;
    const INITIAL_FORM_STATE = {
        date: formatDate(new Date()),
        description: '',
        category: '',
        value: 0,
        observation: '',
        supplier: '',
        docNumber: '',
        account: '',
    };
    const [newTransaction, setNewTransaction] = useState(INITIAL_FORM_STATE);
    const [transactionType, setTransactionType] = useState<'revenue' | 'expense'>('revenue');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const [activeFilter, setActiveFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedAccount, setSelectedAccount] = useState<string>('all');


    const [revenuePage, setRevenuePage] = useState(1);
    const [expensePage, setExpensePage] = useState(1);

    const handleSetDateFilter = (filter: string) => {
        setActiveFilter(filter);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        let start: Date | null = null;
        let end: Date | null = null;
    
        switch (filter) {
            case 'currentMonth':
                start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
                end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
                break;
            case 'currentYear':
                start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
                end = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
                break;
            case 'all':
            default:
                setDateRange({ start: '', end: '' });
                return;
        }
    
        setDateRange({
            start: start ? start.toISOString().split('T')[0] : '',
            end: end ? end.toISOString().split('T')[0] : ''
        });
    };
    
    const filteredTransactions = useMemo(() => {
        let results = transactions;

        // Filter by Date
        if (activeFilter !== 'all' && dateRange.start && dateRange.end) {
            const startDate = new Date(dateRange.start + 'T00:00:00Z');
            const endDate = new Date(dateRange.end + 'T00:00:00Z');
            
            results = results.filter(t => {
                const transactionDate = parseDate(t.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
        }
        
        // Filter by Account
        if (selectedAccount !== 'all') {
            results = results.filter(t => t.account === selectedAccount);
        }
    
        return results;
    }, [transactions, dateRange, activeFilter, selectedAccount]);

    useEffect(() => {
        setRevenuePage(1);
        setExpensePage(1);
    }, [activeFilter, dateRange, selectedAccount]);


    const handleOpenEditModal = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingTransaction(null);
    };

    const handleUpdateTransaction = (updatedTransaction: Transaction) => {
        dispatch({type: 'SET_TRANSACTIONS', payload: prev =>
            prev.map(t => (t.id === updatedTransaction.id ? updatedTransaction : t))
                .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
        });
        addToast('Lançamento atualizado com sucesso!', 'success');
        handleCloseEditModal();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewTransaction(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || 0 : value }));
    };
    
    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTransaction.description || newTransaction.value <= 0 || !newTransaction.category || !newTransaction.account) {
            addToast('Preencha os campos de descrição, valor, categoria e conta.', 'error');
            return;
        }
        const newTrans: Transaction = {
            id: `trans-${Date.now()}`,
            type: transactionType,
            date: newTransaction.date,
            description: newTransaction.description,
            docNumber: newTransaction.docNumber,
            category: newTransaction.category,
            account: newTransaction.account,
            value: Number(newTransaction.value),
            observation: transactionType === 'revenue' ? newTransaction.observation : '',
            supplier: transactionType === 'expense' ? newTransaction.supplier : '',
        };
        dispatch({type: 'SET_TRANSACTIONS', payload: prev => [newTrans, ...prev].sort((a,b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())});
        addToast(`${transactionType === 'revenue' ? 'Receita' : 'Despesa'} adicionada!`, 'success');
        setNewTransaction(INITIAL_FORM_STATE);
    };

    const revenues = useMemo(() => filteredTransactions.filter(t => t.type === 'revenue'), [filteredTransactions]);
    const expenses = useMemo(() => filteredTransactions.filter(t => t.type === 'expense'), [filteredTransactions]);
    
    const paginatedRevenues = useMemo(() => revenues.slice((revenuePage - 1) * ITEMS_PER_PAGE, revenuePage * ITEMS_PER_PAGE), [revenues, revenuePage]);
    const paginatedExpenses = useMemo(() => expenses.slice((expensePage - 1) * ITEMS_PER_PAGE, expensePage * ITEMS_PER_PAGE), [expenses, expensePage]);

    const totalRevenues = useMemo(() => revenues.filter(t => t.category !== 'Transferência de Entrada').reduce((sum, t) => sum + Number(t.value), 0), [revenues]);
    const totalExpenses = useMemo(() => expenses.filter(t => t.category !== 'Transferência de Saída').reduce((sum, t) => sum + Number(t.value), 0), [expenses]);
    
    const TransactionTable = ({ data, title, color, total, columns, onEdit, currentPage, onPageChange, totalItems }: { data: Transaction[], title: string, color: string, total: number, columns: TransactionColumn[], onEdit: (transaction: Transaction) => void, currentPage: number, onPageChange: (page: number) => void, totalItems: number }) => (
        <div className="bg-white p-4 rounded-lg shadow-md mb-8">
            <h3 className={`text-xl font-bold text-${color}-700 mb-4`}>{title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className={`text-xs text-${color}-50 uppercase bg-${color}-500`}>
                        <tr>
                            {columns.map(c => <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>)}
                            <th className="px-4 py-3 whitespace-nowrap">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(t => (
                            <tr key={t.id} className="bg-white border-b hover:bg-slate-50">
                                {columns.map(c => (
                                    <td key={c.key} className="px-4 py-2 whitespace-nowrap">
                                        {c.isCurrency ? formatCurrency(Number(t[c.key]), isBalanceVisible) : String(t[c.key] || '')}
                                    </td>
                                ))}
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => onEdit(t)} title="Editar lançamento" className="p-1 text-slate-500 hover:text-indigo-600 transition-colors">
                                        <Icon path={ICONS.edit} className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {data.length === 0 && (
                            <tr className="bg-white border-b"><td colSpan={columns.length + 1} className="text-center py-4 text-slate-500">Nenhum lançamento encontrado para o período.</td></tr>
                         )}
                    </tbody>
                    <tfoot>
                        <tr className={`font-semibold text-slate-800 bg-${color}-100`}>
                            <td colSpan={columns.length-1} className="px-4 py-3 text-right font-bold">Total</td>
                            <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{formatCurrency(total, isBalanceVisible)}</td>
                            <td></td>
                        </tr>
                        {totalItems > ITEMS_PER_PAGE && (
                            <tr className="bg-white">
                                <td colSpan={columns.length + 1}>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalItems={totalItems}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={onPageChange}
                                    />
                                </td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>
        </div>
    );
    
    return (
        <div className="animate-fade-in space-y-6">
             <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Editar Lançamento">
                {editingTransaction && (
                    <TransactionEditForm
                        transaction={editingTransaction}
                        onSave={handleUpdateTransaction}
                        onCancel={handleCloseEditModal}
                        accounts={accounts}
                        transactionCategories={data.transactionCategories}
                    />
                )}
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Receitas no Período" 
                    value={formatCurrency(totalRevenues, isBalanceVisible)} 
                    icon={<Icon path={ICONS.revenue} />}
                    color="emerald"
                />
                <StatCard 
                    title="Despesas no Período" 
                    value={formatCurrency(totalExpenses, isBalanceVisible)} 
                    icon={<Icon path={ICONS.expense} />}
                    color="rose"
                />
                 <StatCard 
                    title="Saldo no Período" 
                    value={formatCurrency(totalRevenues - totalExpenses, isBalanceVisible)} 
                    icon={<Icon path={ICONS.balance} />}
                    color="blue"
                />
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Filtrar Lançamentos</h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleSetDateFilter('currentMonth')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === 'currentMonth' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Mês Atual</button>
                        <button onClick={() => handleSetDateFilter('currentYear')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === 'currentYear' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Ano Atual</button>
                        <button onClick={() => handleSetDateFilter('all')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Todos</button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <input type="date" value={dateRange.start} onChange={e => { setDateRange(p => ({...p, start: e.target.value})); setActiveFilter('custom'); }} className="p-1.5 border border-slate-300 rounded-lg shadow-sm" />
                        <span className="text-slate-500">até</span>
                        <input type="date" value={dateRange.end} onChange={e => { setDateRange(p => ({...p, end: e.target.value})); setActiveFilter('custom'); }} className="p-1.5 border border-slate-300 rounded-lg shadow-sm" />
                    </div>
                     <div className="flex-grow min-w-[200px]">
                        <label htmlFor="account-filter" className="sr-only">Filtrar por conta</label>
                        <select
                            id="account-filter"
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg shadow-sm text-sm"
                        >
                            <option value="all">Todas as Contas</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.name}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <h2 className="text-2xl font-bold text-slate-700">Adicionar Lançamento</h2>
                </div>
                <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                    <button onClick={() => setTransactionType('revenue')} className={`px-4 py-2 rounded-md transition-all duration-300 w-full font-semibold ${transactionType === 'revenue' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-slate-700'}`}>Receita</button>
                    <button onClick={() => setTransactionType('expense')} className={`px-4 py-2 rounded-md transition-all duration-300 w-full font-semibold ${transactionType === 'expense' ? 'bg-rose-600 text-white shadow' : 'bg-transparent text-slate-700'}`}>Despesa</button>
                </div>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                            <input type="date" name="date" value={parseDate(newTransaction.date).toISOString().split('T')[0]} onChange={e => {
                                if(!e.target.value) return;
                                const [year, month, day] = e.target.value.split('-').map(Number);
                                const newDate = new Date(Date.UTC(year, month - 1, day));
                                setNewTransaction({...newTransaction, date: formatDate(newDate)});
                            }} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                            <input type="text" name="description" value={newTransaction.description} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder={`Ex: Venda de produto X`} required />
                        </div>
                        {transactionType === 'revenue' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Observação</label>
                                <input
                                    type="text"
                                    name="observation"
                                    value={newTransaction.observation}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg shadow-sm"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Fornecedor</label>
                                <input
                                    type="text"
                                    name="supplier"
                                    value={newTransaction.supplier}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg shadow-sm"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Número Doc</label>
                            <input type="text" name="docNumber" value={newTransaction.docNumber} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                            <select name="category" value={newTransaction.category} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                               <option value="">Selecione...</option>
                               {data.transactionCategories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Conta</label>
                            <select name="account" value={newTransaction.account} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                               <option value="">Selecione...</option>
                               {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                            </select>
                        </div>
                         <div className="lg:col-start-3">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                             <input type="number" name="value" step="0.01" value={newTransaction.value || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="R$ 0,00" required />
                        </div>
                    </div>
                    <button type="submit" className={`w-full md:w-auto md:float-right p-2.5 px-6 rounded-lg text-white font-semibold transition-colors shadow ${transactionType === 'revenue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}`}>Adicionar Lançamento</button>
                </form>
            </div>
            
            <TransactionTable data={paginatedRevenues} title="Receitas" color="blue" total={totalRevenues} columns={REVENUE_COLUMNS} onEdit={handleOpenEditModal} currentPage={revenuePage} onPageChange={setRevenuePage} totalItems={revenues.length} />
            <TransactionTable data={paginatedExpenses} title="Despesas" color="rose" total={totalExpenses} columns={EXPENSE_COLUMNS} onEdit={handleOpenEditModal} currentPage={expensePage} onPageChange={setExpensePage} totalItems={expenses.length} />
        </div>
    );
};