import React, { useState, useMemo, useEffect } from 'react';
import { CashCountItem, CashCountHistoryEntry } from '../types';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, parseDate } from '../utility';
import { Modal } from '../components/Modal';
import { Icon, ICONS } from '../components/Icon';
import { INITIAL_CASH_COUNT } from '../constants';

const CashCountRow: React.FC<{
    item: CashCountItem;
    onQuantityChange: (id: string, newQuantity: string | number) => void;
    onOpenAccumulateModal: (item: CashCountItem) => void;
    isBalanceVisible: boolean;
}> = ({ item, onQuantityChange, onOpenAccumulateModal, isBalanceVisible }) => {
    const [localQuantity, setLocalQuantity] = useState(String(item.quantity));
    const { addToast } = useToast();

    useEffect(() => {
        setLocalQuantity(String(item.quantity));
    }, [item.quantity]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalQuantity(e.target.value);
    };

    const handleBlur = () => {
        const trimmedValue = String(localQuantity).trim();
        const isValueType = item.label.includes('Saldo'); // Saldo Cofre, Saldo Conta Stone
        const isValid = isValueType ? /^-?\d*([.,]\d{0,2})?$/.test(trimmedValue) : /^\d*$/.test(trimmedValue);

        if (isValid) {
            if (isValueType) {
                const numValue = parseFloat(trimmedValue.replace(',', '.')) || 0;
                 if (item.quantity !== numValue) {
                    onQuantityChange(item.id, numValue);
                }
                setLocalQuantity(String(numValue).replace('.', ',')); // Format back for display
            } else {
                const newQuantity = parseInt(trimmedValue, 10) || 0;
                if (item.quantity !== newQuantity) {
                    onQuantityChange(item.id, newQuantity);
                }
            }
        } else {
            addToast(`Entrada inválida para "${item.label}".`, 'error');
            setLocalQuantity(String(item.quantity));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
        if (e.key === '+' && !item.label.includes('Saldo')) {
            e.preventDefault();
            onOpenAccumulateModal(item);
        }
    };

    const isValueType = item.label.includes('Saldo');
    const itemTotal = typeof item.quantity === 'number' ? (isValueType ? item.quantity : Number(item.value) * item.quantity) : 0;
    const inputType = isValueType ? 'text' : 'number';
    const inputMode = isValueType ? 'decimal' : 'numeric';


    return (
        <tr className="border-b border-slate-200/80 last:border-b-0">
            <td className="px-4 py-2 font-medium text-slate-700">{item.label}</td>
            <td className="px-4 py-2 w-56">
                 <div className="flex items-center gap-2">
                    <input
                        type={inputType}
                        inputMode={inputMode}
                        value={localQuantity}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1.5 text-center shadow-inner focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        step={isValueType ? "0.01" : "1"}
                        min={isValueType ? undefined : "0"}
                    />
                    {!isValueType && (
                        <button
                            type="button"
                            onClick={() => onOpenAccumulateModal(item)}
                            className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                            aria-label={`Adicionar ${item.label}`}
                            title="Adicionar à contagem"
                        >
                            <Icon path={ICONS.plus} className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </td>
            <td className="px-4 py-2 text-right font-semibold text-slate-800 tabular-nums">
                {formatCurrency(itemTotal, isBalanceVisible)}
            </td>
        </tr>
    );
};

const parseCashCountDetails = (details: any): CashCountItem[] => {
    if (!details) {
        return [];
    }
    
    if (Array.isArray(details)) {
        return details.filter(item => item && typeof item === 'object' && 'id' in item);
    }

    let toParse = details;
    if (typeof details === 'string') {
        try {
            const trimmed = details.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                toParse = JSON.parse(trimmed);
            } else {
                return []; // Not a valid JSON string, e.g. "[object Object]"
            }
        } catch (e) {
            console.error("Failed to parse history details string:", details, e);
            return [];
        }
    }
    
    if (Array.isArray(toParse)) {
        return toParse.filter(item => item && typeof item === 'object' && 'id' in item);
    }
    
    if (typeof toParse === 'object' && toParse !== null) {
        const values = Object.values(toParse);
        if (values.every(item => item && typeof item === 'object' && 'id' in item && 'label' in item)) {
            return values as CashCountItem[];
        }
    }

    return [];
};


export const CashCountView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data, dispatch } = useAppContext();
    const { cashCount, cashCountHistory } = data;
    const { addToast } = useToast();

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [observation, setObservation] = useState('');
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<CashCountHistoryEntry | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<CashCountHistoryEntry | null>(null);
    
    // State for history filtering
    const [historySearch, setHistorySearch] = useState('');
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    
    // State for accumulating quantities
    const [itemToAccumulate, setItemToAccumulate] = useState<CashCountItem | null>(null);
    const [quantityToAdd, setQuantityToAdd] = useState<number>(0);
    const [accumulatedInModal, setAccumulatedInModal] = useState(0);

    const cashSummary = useMemo(() => {
        const physicalCashItems = cashCount.filter(item => item.label.includes('Cédula'));
        const accountBalanceItems = cashCount.filter(item => !item.label.includes('Cédula'));

        const physicalCashTotal = physicalCashItems.reduce((sum, item) => sum + (typeof item.quantity === 'number' ? Number(item.value) * item.quantity : 0), 0);
        const accountBalanceTotal = accountBalanceItems.reduce((sum, item) => sum + (typeof item.quantity === 'number' ? item.quantity : 0), 0);
        const grandTotal = physicalCashTotal + accountBalanceTotal;

        const compositionData = cashCount
            .map(item => {
                const isValueType = item.label.includes('Saldo');
                const total = typeof item.quantity === 'number' ? (isValueType ? item.quantity : item.value * item.quantity) : 0;
                 return {
                    name: item.label.replace('Cédula de ', '').replace('Saldo ', ''),
                    value: total,
                 };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        return {
            grandTotal,
            compositionData,
            physicalCashItems,
            accountBalanceItems
        };
    }, [cashCount]);
    
    const filteredHistory = useMemo(() => {
        return cashCountHistory.filter(entry => {
            const entryDate = parseDate(new Date(entry.date).toLocaleDateString('pt-BR'));
            const start = historyStartDate ? new Date(historyStartDate) : null;
            const end = historyEndDate ? new Date(historyEndDate) : null;

            if (start && entryDate < start) return false;
            if (end && entryDate > end) return false;
            if (historySearch && !entry.observation.toLowerCase().includes(historySearch.toLowerCase())) return false;
            
            return true;
        });
    }, [cashCountHistory, historySearch, historyStartDate, historyEndDate]);

    const historyDetailsToShow = useMemo(() => {
        return parseCashCountDetails(selectedHistoryEntry?.details);
    }, [selectedHistoryEntry]);

    const updateQuantity = (id: string, newQuantity: string | number) => {
        dispatch({type: 'SET_CASH_COUNT', payload: prevCashCount =>
            prevCashCount.map(item => item.id === id ? { ...item, quantity: newQuantity } : item)
        });
    };

    const handleSaveCount = () => {
        if (!observation.trim()) {
            addToast('Por favor, adicione uma observação.', 'error');
            return;
        }

        const newHistoryEntry: CashCountHistoryEntry = {
            id: `cash-hist-${Date.now()}`,
            date: new Date().toISOString(),
            observation,
            totalValue: cashSummary.grandTotal,
            details: JSON.parse(JSON.stringify(cashCount)), // Deep copy
        };

        dispatch({type: 'SET_CASH_COUNT_HISTORY', payload: prev => [newHistoryEntry, ...prev]});
        
        // Reset the cash count fields to their initial state for the next count
        const initialQuantities = new Map<string, number | string>(INITIAL_CASH_COUNT.map(i => [i.id, i.quantity]));
        const resetCount = cashCount.map(item => ({
            ...item,
            quantity: initialQuantities.get(item.id) ?? 0,
        }));
        dispatch({ type: 'SET_CASH_COUNT', payload: resetCount });
        
        addToast('Contagem de caixa salva com sucesso!', 'success');
        setIsSaveModalOpen(false);
        setObservation('');
    };
    
    const handleDeleteHistoryEntry = () => {
        if (!entryToDelete) return;

        dispatch({
            type: 'SET_CASH_COUNT_HISTORY',
            payload: prev => prev.filter(e => e.id !== entryToDelete.id)
        });
        addToast('Entrada do histórico excluída com sucesso.', 'success');
        setEntryToDelete(null);
    };

    const handleViewDetails = (entry: CashCountHistoryEntry) => {
        setSelectedHistoryEntry(entry);
        setIsDetailsModalOpen(true);
    };

    const handleLoadHistoryForEdit = (entry: CashCountHistoryEntry) => {
        if (window.confirm(`Deseja carregar a contagem de "${entry.observation}" para edição? Os valores atuais na tela serão perdidos.`)) {
            const detailsToLoad = parseCashCountDetails(entry.details);
    
            if (entry.details && detailsToLoad.length === 0) {
                 addToast('Não foi possível carregar os detalhes, os dados estão corrompidos ou em formato inválido.', 'error');
                 return;
            }
    
            dispatch({ type: 'SET_CASH_COUNT', payload: detailsToLoad });
            setObservation(`(Editado) ${entry.observation}`);
            addToast(`Contagem "${entry.observation}" carregada para edição.`, 'info');
        }
    };
    
    const clearHistoryFilters = () => {
        setHistorySearch('');
        setHistoryStartDate('');
        setHistoryEndDate('');
    };
    
    const handleOpenAccumulateModal = (item: CashCountItem) => {
        if (item.label.includes('Saldo')) {
            addToast('Apenas cédulas podem ter a quantidade acumulada.', 'info');
            return;
        }
        setItemToAccumulate(item);
        setQuantityToAdd(0);
        setAccumulatedInModal(0);
    };

    const handleAccumulateInModal = () => {
        if (quantityToAdd > 0) {
            setAccumulatedInModal(prev => prev + quantityToAdd);
            setQuantityToAdd(0);
        }
    };

    const handleConfirmAndCloseAccumulate = () => {
        if (!itemToAccumulate) return;

        const totalToAdd = accumulatedInModal + (quantityToAdd || 0);

        if (totalToAdd > 0) {
            const currentQuantity = Number(itemToAccumulate.quantity) || 0;
            const newTotalQuantity = currentQuantity + totalToAdd;
            updateQuantity(itemToAccumulate.id, newTotalQuantity);
            addToast(`${totalToAdd} unidade(s) de "${itemToAccumulate.label}" adicionada(s). Novo total: ${newTotalQuantity}.`, 'success');
        }

        setItemToAccumulate(null);
        setQuantityToAdd(0);
        setAccumulatedInModal(0);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Modal isOpen={!!itemToAccumulate} onClose={() => setItemToAccumulate(null)} title={`Acumular: ${itemToAccumulate?.label}`}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-slate-100 rounded-lg">
                            <p className="text-sm text-slate-500">Qtd. Atual</p>
                            <p className="font-bold text-2xl text-slate-800">{itemToAccumulate?.quantity}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg">
                            <p className="text-sm text-indigo-500">Total Adicionado</p>
                            <p className="font-bold text-2xl text-indigo-700">{accumulatedInModal + (quantityToAdd || 0)}</p>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <label htmlFor="quantity-to-add" className="block text-sm font-medium text-slate-600 mb-1">
                            Adicionar Quantidade:
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="quantity-to-add"
                                type="number"
                                value={quantityToAdd || ''}
                                onChange={(e) => setQuantityToAdd(parseInt(e.target.value, 10) || 0)}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAccumulateInModal(); 
                                    }
                                }}
                                className="w-full p-3 border border-slate-300 rounded-lg shadow-sm text-lg focus:ring-indigo-500 focus:border-indigo-500"
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={handleAccumulateInModal} 
                                className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-semibold shrink-0"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                         <button type="button" onClick={() => setItemToAccumulate(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleConfirmAndCloseAccumulate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2">
                            <Icon path={ICONS.checkCircle} className="w-5 h-5"/> Confirmar e Fechar
                        </button>
                    </div>
                </div>
            </Modal>
            
             <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Salvar Contagem de Caixa">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="observation" className="block text-sm font-medium text-slate-600 mb-1">Observação</label>
                        <textarea
                            id="observation"
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Ex: Fechamento do dia 01/01/2024"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsSaveModalOpen(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSaveCount} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2">
                            <Icon path={ICONS.save} className="w-5 h-5"/> Confirmar e Salvar
                        </button>
                    </div>
                </div>
            </Modal>
            
            {selectedHistoryEntry && (
                <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Detalhes da Contagem`}>
                    <div className="space-y-3 text-sm">
                       <p><span className="font-semibold">Data:</span> {new Date(selectedHistoryEntry.date).toLocaleString('pt-BR')}</p>
                       <p><span className="font-semibold">Observação:</span> {selectedHistoryEntry.observation}</p>
                       <p className="font-bold text-base"><span className="font-semibold">Valor Total:</span> {formatCurrency(selectedHistoryEntry.totalValue, isBalanceVisible)}</p>
                       <div className="border-t pt-3 mt-3">
                            <h4 className="font-semibold mb-2">Detalhes:</h4>
                             <table className="w-full text-left text-slate-600">
                                <thead className="text-xs text-slate-500 bg-slate-100">
                                    <tr>
                                        <th className="px-4 py-2">Item</th>
                                        <th className="px-4 py-2 text-center">Quantidade</th>
                                        <th className="px-4 py-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyDetailsToShow.map(item => (
                                        <tr key={item.id} className="border-b">
                                            <td className="px-4 py-2">{item.label}</td>
                                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(typeof item.quantity === 'number' ? (item.label.includes('Saldo') ? item.quantity : Number(item.value) * item.quantity) : 0, isBalanceVisible)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                       </div>
                    </div>
                </Modal>
            )}

            <Modal isOpen={!!entryToDelete} onClose={() => setEntryToDelete(null)} title="Confirmar Exclusão">
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Tem certeza que deseja excluir o registro de contagem com a observação: <strong className="text-slate-800">"{entryToDelete?.observation}"</strong>?
                    </p>
                    <p className="font-semibold text-rose-600">Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-3 pt-2">
                         <button type="button" onClick={() => setEntryToDelete(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleDeleteHistoryEntry} className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 font-semibold">
                            Confirmar Exclusão
                        </button>
                    </div>
                </div>
            </Modal>

            <h1 className="text-3xl font-bold text-slate-800">Contagem de Caixa</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                    <h2 className="text-xl font-bold text-slate-800 px-2 pt-2 mb-4">Lançamentos</h2>
                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3 text-center w-56">Quantidade / Valor</th>
                                    <th className="px-4 py-3 text-right w-40">Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-slate-50">
                                    <td colSpan={3} className="px-4 py-1.5 font-semibold text-slate-600 text-sm">Cédulas</td>
                                </tr>
                                {cashSummary.physicalCashItems.map(item => (
                                    <CashCountRow key={item.id} item={item} onQuantityChange={updateQuantity} onOpenAccumulateModal={handleOpenAccumulateModal} isBalanceVisible={isBalanceVisible}/>
                                ))}
                                <tr className="bg-slate-50">
                                    <td colSpan={3} className="px-4 py-1.5 font-semibold text-slate-600 text-sm">Contas e Saldos</td>
                                </tr>
                                {cashSummary.accountBalanceItems.map(item => (
                                    <CashCountRow key={item.id} item={item} onQuantityChange={updateQuantity} onOpenAccumulateModal={handleOpenAccumulateModal} isBalanceVisible={isBalanceVisible}/>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <h2 className="text-lg font-bold text-slate-700 mb-1">Resumo da Contagem</h2>
                        <p className="text-sm text-slate-500 mb-4">O total será atualizado em tempo real.</p>
                        <div className="bg-indigo-600 text-white p-4 rounded-lg text-center mb-4">
                            <p className="text-sm font-medium opacity-80">TOTAL GERAL</p>
                            <p className="text-4xl font-bold tracking-tight">{formatCurrency(cashSummary.grandTotal, isBalanceVisible)}</p>
                        </div>

                        <h3 className="text-md font-bold text-slate-600 mt-6 mb-3">Composição</h3>
                        <div className="space-y-3 text-sm">
                            {cashSummary.compositionData.length > 0 ? cashSummary.compositionData.map(item => {
                                const percentage = cashSummary.grandTotal > 0 ? (item.value / cashSummary.grandTotal) * 100 : 0;
                                return (
                                    <div key={item.name}>
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium text-slate-700">{item.name}</span>
                                            <span className="font-semibold text-slate-600">{formatCurrency(item.value, isBalanceVisible)}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                )
                            }) : <p className="text-slate-500 text-center py-4">Nenhum valor inserido.</p>}
                        </div>

                        <button onClick={() => setIsSaveModalOpen(true)} className="mt-6 w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2 font-semibold">
                            <Icon path={ICONS.save} className="w-5 h-5"/> Salvar Contagem Atual
                        </button>
                    </div>
                    
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <h2 className="text-lg font-bold text-slate-700 mb-4">Histórico de Contagens</h2>
                        <div className="space-y-3 mb-4">
                           <input 
                                type="text"
                                placeholder="Buscar por observação..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg shadow-sm text-sm"
                           />
                           <div className="flex items-center gap-2 text-sm">
                               <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} className="w-full p-1.5 border border-slate-300 rounded-lg" />
                                <span className="text-slate-500">até</span>
                               <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} className="w-full p-1.5 border border-slate-300 rounded-lg" />
                               <button onClick={clearHistoryFilters} className="p-2 text-slate-500 hover:text-slate-700" title="Limpar filtros">
                                   <Icon path={ICONS.close} className="w-4 h-4" />
                               </button>
                           </div>
                        </div>

                        {filteredHistory.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {filteredHistory.map(entry => (
                                    <div key={entry.id} className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-slate-800">{entry.observation}</p>
                                                <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleString('pt-BR')}</p>
                                            </div>
                                            <p className="font-bold text-slate-700 text-lg">{formatCurrency(entry.totalValue, isBalanceVisible)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button onClick={() => handleViewDetails(entry)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center gap-1 hover:underline">
                                                <Icon path={ICONS.eye} className="w-4 h-4" /> Ver detalhes
                                            </button>
                                            <button onClick={() => handleLoadHistoryForEdit(entry)} className="text-amber-600 hover:text-amber-800 font-medium text-xs flex items-center gap-1 hover:underline">
                                                <Icon path={ICONS.edit} className="w-4 h-4" /> Editar
                                            </button>
                                             <button onClick={() => setEntryToDelete(entry)} className="text-rose-600 hover:text-rose-800 font-medium text-xs flex items-center gap-1 hover:underline">
                                                <Icon path={ICONS.close} className="w-4 h-4" /> Excluir
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-slate-500 py-6">
                                <Icon path={ICONS.transactions} className="w-10 h-10 mx-auto text-slate-300 mb-2"/>
                                <p>Nenhum histórico encontrado para os filtros selecionados.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};