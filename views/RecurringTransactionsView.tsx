import React, { useState, useMemo, useEffect } from 'react';
import { RecurringTransaction, RecurringTransactionFrequency, Transaction, Account } from '../types';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, formatDate, parseDate, calculateNextDueDate } from '../utility';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { Icon, ICONS } from '../components/Icon';


const RecurringTransactionForm: React.FC<{
    transaction: Omit<RecurringTransaction, 'id' | 'nextDueDate'> | null;
    onSave: (transaction: RecurringTransaction) => void;
    onCancel: () => void;
    accounts: Account[];
    transactionCategories: { revenue: string[], expense: string[] };
}> = ({ transaction, onSave, onCancel, accounts, transactionCategories }) => {
    const INITIAL_FORM_STATE = {
        type: 'expense' as 'revenue' | 'expense',
        description: '', category: '', value: 0, observation: '', supplier: '', docNumber: '',
        account: '', frequency: 'monthly' as RecurringTransactionFrequency,
        startDate: formatDate(new Date()), endDate: '',
    };

    const [formState, setFormState] = useState(transaction || INITIAL_FORM_STATE);

    useEffect(() => {
        setFormState(transaction || INITIAL_FORM_STATE);
    }, [transaction]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.description || formState.value <= 0 || !formState.category || !formState.account) {
            alert('Preencha os campos de descrição, valor, categoria e conta.');
            return;
        }

        const newRecur: RecurringTransaction = {
            id: (transaction as RecurringTransaction)?.id || `recur-${Date.now()}`,
            type: formState.type,
            description: formState.description, category: formState.category, value: Number(formState.value),
            observation: formState.observation, supplier: formState.supplier, docNumber: formState.docNumber,
            account: formState.account, frequency: formState.frequency, startDate: formState.startDate,
            endDate: formState.endDate || undefined,
            nextDueDate: (transaction as RecurringTransaction)?.nextDueDate || formState.startDate,
        };
        onSave(newRecur);
    };

    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                <button type="button" onClick={() => setFormState(p => ({...p, type: 'revenue'}))} className={`px-4 py-2 rounded-md transition-all duration-300 w-full font-semibold ${formState.type === 'revenue' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-slate-700'}`}>Receita</button>
                <button type="button" onClick={() => setFormState(p => ({...p, type: 'expense'}))} className={`px-4 py-2 rounded-md transition-all duration-300 w-full font-semibold ${formState.type === 'expense' ? 'bg-rose-600 text-white shadow' : 'bg-transparent text-slate-700'}`}>Despesa</button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                    <input type="text" name="description" value={formState.description} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="Ex: Aluguel, Salário" required />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                    <input type="number" name="value" step="0.01" value={formState.value || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="R$ 0,00" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                    <select name="category" value={formState.category} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                       <option value="">Selecione...</option>
                       {transactionCategories[formState.type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Conta</label>
                    <select name="account" value={formState.account} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                       <option value="">Selecione...</option>
                       {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                    </select>
                </div>

                <div className="md:col-span-2"><hr className="my-2"/></div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Frequência</label>
                    <select name="frequency" value={formState.frequency} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                        <option value="daily">Diário</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                        <option value="yearly">Anual</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data de Início</label>
                    <input type="date" name="startDate" value={parseDate(formState.startDate).toISOString().split('T')[0]} onChange={e => {
                        if(!e.target.value) return;
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        const newDate = new Date(Date.UTC(year, month - 1, day));
                        setFormState({...formState, startDate: formatDate(newDate)});
                    }} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data Final (Opcional)</label>
                    <input type="date" name="endDate" value={formState.endDate ? parseDate(formState.endDate).toISOString().split('T')[0] : ''} onChange={e => {
                         if(!e.target.value) {
                            setFormState({...formState, endDate: ''});
                            return;
                         }
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        const newDate = new Date(Date.UTC(year, month - 1, day));
                        setFormState({...formState, endDate: formatDate(newDate)});
                    }} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" />
                </div>
            </div>
             <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold">
                    Cancelar
                </button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    Salvar Recorrência
                </button>
            </div>
        </form>
    );
}

export const RecurringTransactionsView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data, dispatch } = useAppContext();
    const { recurringTransactions, transactions, accounts, transactionCategories } = data;
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
    const [filter, setFilter] = useState<'all' | 'revenue' | 'expense'>('all');

    const FREQUENCY_MAP: Record<RecurringTransactionFrequency, string> = {
        daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual',
    };

    const monthlySummary = useMemo(() => {
        let monthlyRevenue = 0;
        let monthlyExpense = 0;
        recurringTransactions.forEach(t => {
            let monthlyValue = 0;
            const value = Number(t.value);
            switch (t.frequency) {
                case 'daily': monthlyValue = value * 30.44; break;
                case 'weekly': monthlyValue = value * (52 / 12); break;
                case 'monthly': monthlyValue = value; break;
                case 'yearly': monthlyValue = value / 12; break;
            }
            if (t.type === 'revenue') monthlyRevenue += monthlyValue;
            else monthlyExpense += monthlyValue;
        });
        return { revenue: monthlyRevenue, expense: monthlyExpense, net: monthlyRevenue - monthlyExpense };
    }, [recurringTransactions]);

    const upcomingTransactions = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const threshold = new Date(today);
        threshold.setUTCDate(today.getUTCDate() + 14); // 2-week window

        return recurringTransactions
            .filter(r => {
                const dueDate = parseDate(r.nextDueDate);
                if (r.endDate && dueDate > parseDate(r.endDate)) return false;
                const isLaunched = transactions.some(t => t.date === r.nextDueDate && t.description === r.description);
                return dueDate <= threshold && !isLaunched;
            })
            .sort((a, b) => parseDate(a.nextDueDate).getTime() - parseDate(b.nextDueDate).getTime());
    }, [recurringTransactions, transactions]);

    const handleOpenModal = (transaction: RecurringTransaction | null) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleSave = (formData: RecurringTransaction) => {
        if (editingTransaction) { // Update
            dispatch({type: 'SET_RECURRING_TRANSACTIONS', payload: prev => prev.map(r => r.id === editingTransaction.id ? formData : r)});
            addToast('Recorrência atualizada!', 'success');
        } else { // Create
            dispatch({type: 'SET_RECURRING_TRANSACTIONS', payload: prev => [...prev, formData]});
            addToast('Recorrência adicionada!', 'success');
        }
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta recorrência?')) {
            dispatch({type: 'SET_RECURRING_TRANSACTIONS', payload: prev => prev.filter(r => r.id !== id)});
            addToast('Recorrência excluída.', 'success');
        }
    };

    const handleLaunchNow = (recur: RecurringTransaction) => {
        let observation = recur.observation;
        let docNumber = recur.docNumber;

        if (recur.type === 'expense') {
            const launchDate = parseDate(recur.nextDueDate);
            const month = String(launchDate.getUTCMonth() + 1).padStart(2, '0');
            const year = launchDate.getUTCFullYear();
            observation = `${recur.description} - ${month}/${year}`;
            docNumber = `${month}${year}`;
        }
        
        const newTransaction: Transaction = {
            id: `trans-${recur.id}-${Date.now()}`,
            type: recur.type, date: recur.nextDueDate, description: recur.description,
            observation, supplier: recur.supplier, docNumber,
            category: recur.category, account: recur.account, value: Number(recur.value),
        };

        const nextDueDate = calculateNextDueDate(recur.nextDueDate, recur.frequency);
        const updatedRecur = { ...recur, nextDueDate: formatDate(nextDueDate) };

        dispatch({type: 'SET_TRANSACTIONS', payload: prev => [newTransaction, ...prev].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())});
        dispatch({type: 'SET_RECURRING_TRANSACTIONS', payload: prev => prev.map(r => r.id === recur.id ? updatedRecur : r)});

        addToast('Lançamento recorrente processado!', 'success');
    };
    
    const filteredRecurringTransactions = useMemo(() => {
      if (filter === 'all') return recurringTransactions;
      return recurringTransactions.filter(t => t.type === filter);
    }, [filter, recurringTransactions]);

    return (
        <div className="animate-fade-in space-y-6">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? 'Editar Recorrência' : 'Adicionar Recorrência'} size="lg">
                <RecurringTransactionForm transaction={editingTransaction} onSave={handleSave} onCancel={() => setIsModalOpen(false)} accounts={accounts} transactionCategories={transactionCategories} />
            </Modal>
            
            <h1 className="text-3xl font-bold text-slate-800">Lançamentos Recorrentes</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Receitas Mensais" value={formatCurrency(monthlySummary.revenue, isBalanceVisible)} icon={<Icon path={ICONS.revenue} />} color="emerald" />
                <StatCard title="Despesas Mensais" value={formatCurrency(monthlySummary.expense, isBalanceVisible)} icon={<Icon path={ICONS.expense} />} color="rose" />
                <StatCard title="Saldo Mensal Previsto" value={formatCurrency(monthlySummary.net, isBalanceVisible)} icon={<Icon path={ICONS.balance} />} color="blue" />
            </div>

            {upcomingTransactions.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <h2 className="text-lg font-bold text-slate-700 mb-4">Próximos Vencimentos (14 dias)</h2>
                    <div className="space-y-3">
                        {upcomingTransactions.map(t => (
                            <div key={t.id} className="flex flex-wrap items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex-1 min-w-[200px] mb-2 sm:mb-0">
                                    <p className="font-semibold text-slate-800">{t.description}</p>
                                    <p className={`text-sm font-bold ${t.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(Number(t.value), isBalanceVisible)}</p>
                                </div>
                                <p className="text-sm text-slate-500 w-full sm:w-auto sm:mx-4 mb-2 sm:mb-0 text-center">Vence em: <span className="font-semibold text-slate-700">{t.nextDueDate}</span></p>
                                <button onClick={() => handleLaunchNow(t)} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 text-sm font-semibold rounded-md hover:bg-indigo-200 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                                    <Icon path={ICONS.checkCircle} className="w-4 h-4"/> Lançar Agora
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-2 pt-2 pb-4 border-b">
                    <h2 className="text-xl font-bold text-slate-700">Todas as Recorrências</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Todos</button>
                             <button onClick={() => setFilter('revenue')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'revenue' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Receitas</button>
                             <button onClick={() => setFilter('expense')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'expense' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Despesas</button>
                        </div>
                        <button onClick={() => handleOpenModal(null)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow flex items-center gap-2 font-semibold">
                            <Icon path={ICONS.plus} className="w-5 h-5"/> Adicionar
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                             <tr>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3">Frequência</th>
                                <th className="px-4 py-3">Próximo Lanç.</th>
                                <th className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecurringTransactions.map(r => (
                                <tr key={r.id} className="bg-white border-b hover:bg-slate-50/70">
                                    <td className="px-4 py-3 font-medium text-slate-800">{r.description}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.type === 'revenue' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                            {r.type === 'revenue' ? 'Receita' : 'Despesa'}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-semibold ${r.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(Number(r.value), isBalanceVisible)}</td>
                                    <td className="px-4 py-3">{FREQUENCY_MAP[r.frequency]}</td>
                                    <td className="px-4 py-3">{r.nextDueDate}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center items-center gap-2">
                                            <button onClick={() => handleOpenModal(r)} title="Editar recorrência" className="p-1 text-slate-500 hover:text-indigo-600 transition-colors">
                                               <Icon path={ICONS.edit} className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} title="Excluir recorrência" className="p-1 text-slate-500 hover:text-rose-600 transition-colors">
                                               <Icon path={ICONS.close} className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecurringTransactions.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhuma recorrência encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}