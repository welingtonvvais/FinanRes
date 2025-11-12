import React, { useState, useEffect, useMemo } from 'react';
import { FeeConfiguration, Account, Transaction } from '../types';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, formatDate, parseDate } from '../utility';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Icon, ICONS } from '../components/Icon';

const RateInput: React.FC<{
    name: keyof FeeConfiguration;
    label: string;
    value: number;
    onChange: (name: keyof FeeConfiguration, value: number) => void;
}> = ({ name, label, value, onChange }) => {
    
    const formatForDisplay = (num: number | string): string => {
        return String(num).replace('.', ',');
    };

    const [inputValue, setInputValue] = useState(formatForDisplay(value || 0));

    useEffect(() => {
        if (document.activeElement?.id !== name) {
            setInputValue(formatForDisplay(value || 0));
        }
    }, [value, name]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value: rawValue } = e.target;
        // Only allow numbers and a single comma
        if (/^\d*,?\d*$/.test(rawValue)) {
            setInputValue(rawValue);
        }
    };

    const handleBlur = () => {
        // Replace comma with dot for parsing, handle empty or just comma input
        const normalizedValue = inputValue.replace(',', '.').trim();
        if (normalizedValue === '' || normalizedValue === '.') {
            onChange(name, 0);
            setInputValue(formatForDisplay(0));
            return;
        }

        const parsedValue = parseFloat(normalizedValue);
        const numValue = isNaN(parsedValue) ? 0 : parsedValue;
        
        onChange(name, numValue);
        setInputValue(formatForDisplay(numValue));
    };

    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-slate-600">{label}</label>
            <div className="relative mt-1">
                <input
                    type="text"
                    inputMode="decimal"
                    id={name}
                    name={name}
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full p-2 pr-8 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0,00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    %
                </div>
            </div>
        </div>
    );
};

const TransferForm: React.FC<{
    accounts: Account[];
    onSave: (data: { sourceAccountId: string; destinationAccountId: string; value: number; date: string; description: string }) => void;
    onCancel: () => void;
}> = ({ accounts, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        sourceAccountId: '',
        destinationAccountId: '',
        value: 0,
        date: formatDate(new Date()),
        description: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || 0 : value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(!e.target.value) return;
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(Date.UTC(year, month - 1, day));
        setFormData(prev => ({ ...prev, date: formatDate(newDate) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Conta de Origem</label>
                    <select name="sourceAccountId" value={formData.sourceAccountId} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                       <option value="">Selecione...</option>
                       {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Conta de Destino</label>
                    <select name="destinationAccountId" value={formData.destinationAccountId} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required>
                       <option value="">Selecione...</option>
                       {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                    <input type="date" name="date" value={parseDate(formData.date).toISOString().split('T')[0]} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                    <input type="number" name="value" step="0.01" value={formData.value || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="R$ 0,00" required />
                </div>
            </div>
            <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1">Descrição (Opcional)</label>
                 <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="Ex: Transferência para poupança"/>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold">
                    Cancelar
                </button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    Confirmar Transferência
                </button>
            </div>
        </form>
    );
};

const AdjustmentModal: React.FC<{
    account: Account | null;
    currentBalance: number;
    onSave: (adjustment: Transaction) => void;
    onClose: () => void;
}> = ({ account, currentBalance, onSave, onClose }) => {
    const [newBalance, setNewBalance] = useState('');
    const [observation, setObservation] = useState('');
    
    useEffect(() => {
        if (account) {
            setNewBalance(String(currentBalance).replace('.', ','));
            setObservation('');
        }
    }, [account, currentBalance]);

    if (!account) return null;

    const parsedNewBalance = parseFloat(newBalance.replace(',', '.')) || 0;
    const adjustmentAmount = parsedNewBalance - currentBalance;
    const isAdjustmentValid = newBalance.trim() !== '' && !isNaN(parsedNewBalance) && adjustmentAmount !== 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdjustmentValid) return;

        const transaction: Transaction = {
            id: `trans-adj-${Date.now()}`,
            type: adjustmentAmount > 0 ? 'revenue' : 'expense',
            date: formatDate(new Date()),
            description: `Ajuste de Saldo - ${account.name}`,
            observation: observation || 'Ajuste manual de saldo.',
            supplier: '',
            docNumber: '',
            category: adjustmentAmount > 0 ? 'Ajuste de Saldo - Aumento' : 'Ajuste de Saldo - Redução',
            account: account.name,
            value: Math.abs(adjustmentAmount),
        };
        
        onSave(transaction);
    };

    return (
        <Modal isOpen={!!account} onClose={onClose} title={`Ajustar Saldo: ${account.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 bg-slate-100 rounded-lg text-center">
                    <p className="text-sm text-slate-500">Saldo Atual Calculado</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(currentBalance, true)}</p>
                </div>

                <div>
                    <label htmlFor="newBalance" className="block text-sm font-medium text-slate-600 mb-1">Novo Saldo Correto</label>
                    <input
                        id="newBalance"
                        type="text"
                        inputMode="decimal"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg shadow-sm text-lg text-center"
                        autoFocus
                        required
                    />
                </div>
                
                {isAdjustmentValid && (
                     <div className={`p-3 rounded-lg text-center ${adjustmentAmount > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                        <p className="text-sm font-medium">
                            Será criado um lançamento de <span className="font-bold">{adjustmentAmount > 0 ? 'RECEITA' : 'DESPESA'}</span> no valor de 
                            <span className="font-bold"> {formatCurrency(Math.abs(adjustmentAmount), true)}</span>.
                        </p>
                    </div>
                )}

                <div>
                    <label htmlFor="observation" className="block text-sm font-medium text-slate-600 mb-1">Observação (Opcional)</label>
                    <input
                        id="observation"
                        type="text"
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg shadow-sm"
                        placeholder="Ex: Correção de saldo do dia X"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button type="button" onClick={onClose} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">
                        Cancelar
                    </button>
                    <button type="submit" disabled={!isAdjustmentValid} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-indigo-300 disabled:cursor-not-allowed">
                        Salvar Ajuste
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const ConfigurationView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data, dispatch } = useAppContext();
    const { feeConfiguration: feeConfig, accounts, transactions, transactionCategories } = data;
    const { addToast } = useToast();
    
    const [localFeeConfig, setLocalFeeConfig] = useState<FeeConfiguration>(feeConfig);
    const [activeTab, setActiveTab] = useState<'fees' | 'accounts' | 'categories'>('fees');

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null);
    
    const [historyPage, setHistoryPage] = useState(1);
    const [historyAccountFilter, setHistoryAccountFilter] = useState('all');
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setLocalFeeConfig(feeConfig);
    }, [feeConfig]);

    const accountBalances = useMemo(() => {
        const balances = new Map<string, number>();
        accounts.forEach(acc => {
            balances.set(acc.name, Number(acc.initialBalance));
        });

        transactions.forEach(t => {
            const currentBalance = balances.get(t.account) || 0;
            const value = Number(t.value);
            if (t.type === 'revenue') {
                balances.set(t.account, currentBalance + value);
            } else {
                balances.set(t.account, currentBalance - value);
            }
        });

        return balances;
    }, [accounts, transactions]);

    const filteredHistoryTransactions = useMemo(() => {
        let filtered = [...transactions].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
        if (historyAccountFilter !== 'all') {
            filtered = filtered.filter(t => t.account === historyAccountFilter);
        }
        return filtered;
    }, [transactions, historyAccountFilter]);

    const paginatedHistoryTransactions = useMemo(() => {
        return filteredHistoryTransactions.slice(
            (historyPage - 1) * ITEMS_PER_PAGE,
            historyPage * ITEMS_PER_PAGE
        );
    }, [filteredHistoryTransactions, historyPage]);


    const handleFeeConfigChange = (name: keyof FeeConfiguration, value: number) => {
        setLocalFeeConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveFees = () => {
        dispatch({type: 'SET_FEE_CONFIG', payload: localFeeConfig});
        addToast('Configurações de taxas salvas com sucesso!', 'success');
    };

    const handleOpenAccountModal = (account: Account | null) => {
        setEditingAccount(account);
        setIsAccountModalOpen(true);
    };

    const handleSaveAccount = (accountToSave: Account) => {
        if (accountToSave.id) { // Editing existing
            dispatch({type: 'SET_ACCOUNTS', payload: prev => prev.map(acc => acc.id === accountToSave.id ? accountToSave : acc)});
            addToast('Conta atualizada com sucesso!', 'success');
        } else { // Adding new
            const newAccount = { ...accountToSave, id: `acc-${Date.now()}`};
            dispatch({type: 'SET_ACCOUNTS', payload: prev => [...prev, newAccount]});
            addToast('Nova conta adicionada!', 'success');
        }
        setIsAccountModalOpen(false);
    };

    const handleDeleteAccount = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.')) {
            dispatch({type: 'SET_ACCOUNTS', payload: prev => prev.filter(acc => acc.id !== id)});
            addToast('Conta excluída.', 'success');
        }
    };
    
    const handleSaveTransfer = (data: { sourceAccountId: string; destinationAccountId: string; value: number; date: string; description: string }) => {
        const { sourceAccountId, destinationAccountId, value, date, description } = data;

        if (!sourceAccountId || !destinationAccountId || value <= 0) {
            addToast('Selecione as contas de origem/destino e um valor maior que zero.', 'error');
            return;
        }
        if (sourceAccountId === destinationAccountId) {
            addToast('A conta de origem e destino não podem ser a mesma.', 'error');
            return;
        }

        const sourceAccount = accounts.find(acc => acc.id === sourceAccountId);
        const destinationAccount = accounts.find(acc => acc.id === destinationAccountId);

        if (!sourceAccount || !destinationAccount) {
            addToast('Contas inválidas selecionadas.', 'error');
            return;
        }

        const sourceAccountBalance = accountBalances.get(sourceAccount.name);
        if (sourceAccountBalance === undefined || sourceAccountBalance < value) {
            addToast(`Saldo insuficiente na conta de origem. Saldo atual: ${formatCurrency(sourceAccountBalance || 0, true)}.`, 'error');
            return;
        }
        
        const descriptionText = description || `Transferência de ${sourceAccount.name} para ${destinationAccount.name}`;

        const expenseTransaction: Transaction = {
            id: `trans-exp-${Date.now()}`, type: 'expense', date,
            description: descriptionText, supplier: 'Transferência', docNumber: '',
            category: 'Transferência de Saída', account: sourceAccount.name, value, observation: `Para: ${destinationAccount.name}`
        };

        const revenueTransaction: Transaction = {
            id: `trans-rev-${Date.now()}`, type: 'revenue', date,
            description: descriptionText, observation: `De: ${sourceAccount.name}`, supplier: '', docNumber: '',
            category: 'Transferência de Entrada', account: destinationAccount.name, value,
        };
        
        dispatch({type: 'SET_TRANSACTIONS', payload: prev => [expenseTransaction, revenueTransaction, ...prev].sort((a,b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())});
        addToast('Transferência realizada com sucesso!', 'success');
        setIsTransferModalOpen(false);
    };

    const handleSaveAdjustment = (adjustmentTransaction: Transaction) => {
        dispatch({
            type: 'SET_TRANSACTIONS',
            payload: prev => [adjustmentTransaction, ...prev].sort((a,b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
        });
        addToast('Ajuste de saldo salvo com sucesso!', 'success');
        setAdjustingAccount(null);
    };

    const handleAddCategory = (type: 'revenue' | 'expense', name: string) => {
        if (!name.trim()) {
            addToast('O nome da categoria não pode ser vazio.', 'error');
            return;
        }
        const existing = transactionCategories[type].find(c => c.toLowerCase() === name.toLowerCase().trim());
        if (existing) {
            addToast('Esta categoria já existe.', 'error');
            return;
        }
        const newCategories = { ...transactionCategories };
        newCategories[type] = [...newCategories[type], name.trim()].sort();
        dispatch({ type: 'SET_TRANSACTION_CATEGORIES', payload: newCategories });
        addToast('Categoria adicionada com sucesso!', 'success');
    };

    const handleDeleteCategory = (type: 'revenue' | 'expense', name: string) => {
        if (window.confirm(`Tem certeza que deseja excluir a categoria "${name}"? Esta ação não pode ser desfeita e não alterará os lançamentos existentes.`)) {
            const newCategories = { ...transactionCategories };
            newCategories[type] = newCategories[type].filter(c => c !== name);
            dispatch({ type: 'SET_TRANSACTION_CATEGORIES', payload: newCategories });
            addToast('Categoria excluída.', 'success');
        }
    };

    const handleUpdateCategory = (type: 'revenue' | 'expense', oldName: string, newName: string) => {
        if (!newName.trim()) {
            addToast('O nome da categoria não pode ser vazio.', 'error');
            return;
        }
        if (oldName === newName) return;

        const existing = transactionCategories[type].find(c => c.toLowerCase() === newName.toLowerCase().trim());
        if (existing) {
            addToast('Esta categoria já existe.', 'error');
            return;
        }

        const newCategories = { ...transactionCategories };
        newCategories[type] = newCategories[type].map(c => c === oldName ? newName.trim() : c).sort();

        const updatedTransactions = transactions.map(t => {
            if (t.category === oldName && t.type === type) {
                return { ...t, category: newName.trim() };
            }
            return t;
        });
        
        dispatch({ type: 'SET_TRANSACTION_CATEGORIES', payload: newCategories });
        dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
        addToast('Categoria e lançamentos atualizados!', 'success');
    };

    const AccountModal: React.FC = () => {
        const [formData, setFormData] = useState<Omit<Account, 'id'>>({ name: '', initialBalance: 0 });

        useEffect(() => {
            if (editingAccount) {
                setFormData({ name: editingAccount.name, initialBalance: Number(editingAccount.initialBalance) });
            } else {
                setFormData({ name: '', initialBalance: 0 });
            }
        }, [editingAccount]);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!formData.name) {
                addToast('O nome da conta é obrigatório.', 'error');
                return;
            }
            handleSaveAccount({ ...formData, id: editingAccount?.id || '' });
        };
        
        return (
             <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={editingAccount ? 'Editar Conta' : 'Adicionar Nova Conta'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="accountName" className="block text-sm font-medium text-slate-600 mb-1">Nome da Conta</label>
                        <input id="accountName" type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required/>
                    </div>
                     <div>
                        <label htmlFor="initialBalance" className="block text-sm font-medium text-slate-600 mb-1">Saldo Inicial</label>
                        <input id="initialBalance" type="number" step="0.01" value={formData.initialBalance || ''} onChange={e => setFormData(p => ({...p, initialBalance: parseFloat(e.target.value) || 0}))} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                         <button type="button" onClick={() => setIsAccountModalOpen(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
                         <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold">Salvar</button>
                    </div>
                </form>
            </Modal>
        )
    };
    
    const CategoryManager: React.FC<{
        type: 'revenue' | 'expense',
        title: string,
        categories: string[],
    }> = ({ type, title, categories }) => {
        const [newCategory, setNewCategory] = useState('');
        const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);

        const onUpdate = (index: number) => {
            if (editing) {
                handleUpdateCategory(type, categories[index], editing.value);
                setEditing(null);
            }
        };

        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <h2 className={`text-lg font-bold ${type === 'revenue' ? 'text-emerald-700' : 'text-rose-700'} mb-4 border-b pb-3`}>{title}</h2>
                <div className="space-y-2">
                    {categories.map((cat, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                            {editing?.index === index ? (
                                <input
                                    type="text"
                                    value={editing.value}
                                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                    onBlur={() => onUpdate(index)}
                                    onKeyDown={(e) => e.key === 'Enter' && onUpdate(index)}
                                    className="flex-grow p-1 border border-indigo-300 rounded-md"
                                    autoFocus
                                />
                            ) : (
                                <span className="flex-grow cursor-pointer" onClick={() => setEditing({ index, value: cat })}>{cat}</span>
                            )}
                            <button onClick={() => setEditing({ index, value: cat })} className="p-1 text-slate-500 hover:text-indigo-600"><Icon path={ICONS.edit} className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteCategory(type, cat)} className="p-1 text-slate-500 hover:text-rose-600"><Icon path={ICONS.close} className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Nova categoria"
                        className="w-full p-2 border border-slate-300 rounded-lg shadow-sm"
                    />
                    <button onClick={() => { handleAddCategory(type, newCategory); setNewCategory(''); }} className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-semibold">Adicionar</button>
                </div>
            </div>
        );
    };


    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <AccountModal/>
            <AdjustmentModal
                account={adjustingAccount}
                currentBalance={adjustingAccount ? accountBalances.get(adjustingAccount.name) ?? 0 : 0}
                onSave={handleSaveAdjustment}
                onClose={() => setAdjustingAccount(null)}
            />
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transferir Dinheiro Entre Contas">
                <TransferForm accounts={accounts} onSave={handleSaveTransfer} onCancel={() => setIsTransferModalOpen(false)} />
            </Modal>
            <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('fees')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'fees' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Taxas e Investimento
                    </button>
                     <button onClick={() => setActiveTab('accounts')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'accounts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Contas
                    </button>
                     <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        Categorias
                    </button>
                </nav>
            </div>

            {activeTab === 'fees' && (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-3">Taxas de Cartão de Crédito</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <RateInput name="creditVisa" label="Visa" value={localFeeConfig.creditVisa} onChange={handleFeeConfigChange} />
                            <RateInput name="creditMastercard" label="MasterCard" value={localFeeConfig.creditMastercard} onChange={handleFeeConfigChange} />
                            <RateInput name="creditElo" label="ELO" value={localFeeConfig.creditElo} onChange={handleFeeConfigChange} />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-3">Taxas de Cartão de Débito</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <RateInput name="debitVisa" label="Visa" value={localFeeConfig.debitVisa} onChange={handleFeeConfigChange} />
                            <RateInput name="debitMastercard" label="MasterCard" value={localFeeConfig.debitMastercard} onChange={handleFeeConfigChange} />
                            <RateInput name="debitElo" label="ELO" value={localFeeConfig.debitElo} onChange={handleFeeConfigChange} />
                        </div>
                    </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-3">Outras Taxas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <RateInput name="pixQRCode" label="PIX QR Code" value={localFeeConfig.pixQRCode} onChange={handleFeeConfigChange} />
                        </div>
                    </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-3">Investimento Automático</h2>
                         <p className="text-sm text-slate-500 mb-4 pt-4">Defina um percentual das vendas digitais (Cartões e PIX QR Code), líquido de taxas, para ser alocado automaticamente na conta de investimentos.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <RateInput name="investmentPercentage" label="Percentual para Investimento" value={localFeeConfig.investmentPercentage} onChange={handleFeeConfigChange} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSaveFees} className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Salvar Configurações de Taxas
                        </button>
                    </div>
                </div>
            )}
            
            {activeTab === 'accounts' && (
              <>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4 border-b pb-3">
                        <h2 className="text-lg font-bold text-slate-700">Gerenciar Contas</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsTransferModalOpen(true)} className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow flex items-center gap-2 font-semibold text-sm">
                                <Icon path={ICONS.transfer} className="w-5 h-5"/> Transferir
                            </button>
                            <button onClick={() => handleOpenAccountModal(null)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow flex items-center gap-2 font-semibold text-sm">
                                <Icon path={ICONS.plus} className="w-5 h-5"/> Adicionar Conta
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Nome da Conta</th>
                                    <th className="px-4 py-3 text-right">Saldo Inicial</th>
                                    <th className="px-4 py-3 text-right">Saldo Atual</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(acc => {
                                    const currentBalance = accountBalances.get(acc.name) ?? Number(acc.initialBalance);
                                    return (
                                        <tr key={acc.id} className="border-b hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{acc.name}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(Number(acc.initialBalance), isBalanceVisible)}</td>
                                            <td className={`px-4 py-3 text-right font-semibold ${currentBalance >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>{formatCurrency(currentBalance, isBalanceVisible)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <button onClick={() => handleOpenAccountModal(acc)} className="p-1 text-slate-500 hover:text-indigo-600 transition-colors" title="Editar"><Icon path={ICONS.edit} className="w-5 h-5" /></button>
                                                    <button onClick={() => setAdjustingAccount(acc)} className="p-1 text-slate-500 hover:text-emerald-600 transition-colors" title="Ajustar Saldo"><Icon path={ICONS.bills} className="w-5 h-5" /></button>
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-1 text-slate-500 hover:text-rose-600 transition-colors" title="Excluir"><Icon path={ICONS.close} className="w-5 h-5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {accounts.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-6 text-slate-500">Nenhuma conta cadastrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4 border-b pb-3">
                        <h2 className="text-lg font-bold text-slate-700">Histórico de Movimentações</h2>
                        <div>
                            <label htmlFor="history-account-filter" className="sr-only">Filtrar por conta</label>
                            <select
                                id="history-account-filter"
                                value={historyAccountFilter}
                                onChange={(e) => {
                                    setHistoryAccountFilter(e.target.value);
                                    setHistoryPage(1);
                                }}
                                className="w-full sm:w-auto p-2 border border-slate-300 rounded-lg shadow-sm text-sm"
                            >
                                <option value="all">Todas as Contas</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.name}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Conta</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistoryTransactions.map(t => (
                                    <tr key={t.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-2 whitespace-nowrap">{t.date}</td>
                                        <td className="px-4 py-2">{t.description}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{t.account}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                t.category.includes('Transferência') ? 'bg-sky-100 text-sky-800' :
                                                t.type === 'revenue' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-2 text-right font-semibold whitespace-nowrap ${
                                            t.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                            {t.type === 'expense' ? '-' : ''}{formatCurrency(Number(t.value), isBalanceVisible)}
                                        </td>
                                    </tr>
                                ))}
                                {paginatedHistoryTransactions.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-6 text-slate-500">Nenhuma movimentação encontrada para o filtro selecionado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredHistoryTransactions.length > ITEMS_PER_PAGE && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={historyPage}
                                totalItems={filteredHistoryTransactions.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={setHistoryPage}
                            />
                        </div>
                    )}
                </div>
              </>
            )}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <CategoryManager type="revenue" title="Categorias de Receita" categories={transactionCategories.revenue} />
                    <CategoryManager type="expense" title="Categorias de Despesa" categories={transactionCategories.expense} />
                </div>
            )}
        </div>
    );
};