import React, { useState, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SalesRecord, Transaction } from '../types';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, formatDate, parseDate } from '../utility';
import { INITIAL_SALES_RECORD, PT_BR_WEEKDAYS } from '../constants';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { EditableCell } from '../components/EditableCell';
import { Icon, ICONS } from '../components/Icon';
import { EmptyChartState } from '../components/EmptyChartState';

const getStartOfWeek = (date: Date): Date => {
    const dateCopy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = dateCopy.getUTCDay();
    const diff = dateCopy.getUTCDate() - day + (day === 0 ? -6 : 1);
    return new Date(dateCopy.setUTCDate(diff));
};

const WeekChart: React.FC<{
    weekSales: SalesRecord[];
    isBalanceVisible: boolean;
    calculateSaleDetails: (sale: SalesRecord) => { fee: number; investment: number };
}> = ({ weekSales, isBalanceVisible, calculateSaleDetails }) => {
    
    const chartData = useMemo(() => {
        const dayOrder = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
        const salesByDay = weekSales.map(sale => {
            const total = Object.keys(INITIAL_SALES_RECORD).reduce((sum, key) => sum + Number(sale[key as keyof typeof INITIAL_SALES_RECORD]), 0);
            return {
                name: sale.dayOfWeek.substring(0, 3),
                Vendas: total,
            };
        });

        // Ensure days are always in the correct Monday-Sunday order
        return dayOrder.map(day => {
            const saleData = salesByDay.find(s => s.name === day);
            return saleData || { name: day, Vendas: 0 };
        });
    }, [weekSales]);

    const weekTotals = useMemo(() => {
        let totalFees = 0;
        let totalInvestment = 0;
        
        weekSales.forEach(sale => {
            const { fee, investment } = calculateSaleDetails(sale);
            totalFees += fee;
            totalInvestment += investment;
        });
        
        return { totalFees, totalInvestment };
    }, [weekSales, calculateSaleDetails]);

    const hasData = chartData.some(d => d.Vendas > 0);

    if (!hasData) {
        return null; // Don't show chart section if there are no sales in the week
    }

    return (
        <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Resumo Gráfico da Semana</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => formatCurrency(value as number, isBalanceVisible)} tick={{ fontSize: 12 }} />
                            <Tooltip 
                                formatter={(value: number) => [formatCurrency(value, isBalanceVisible), "Vendas"]}
                                cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                            />
                            <Bar dataKey="Vendas" fill="#4f46e5" barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center space-y-4">
                    <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                        <p className="text-sm font-medium text-rose-600">Total de Taxas Est.</p>
                        <p className="text-2xl font-bold text-rose-700">{formatCurrency(weekTotals.totalFees, isBalanceVisible)}</p>
                    </div>
                     <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm font-medium text-emerald-600">Total de Investimento Est.</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(weekTotals.totalInvestment, isBalanceVisible)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


const WeekSection: React.FC<{
    weekSales: SalesRecord[];
    isBalanceVisible: boolean;
    onUpdateSale: (saleId: string, columnKey: keyof SalesRecord, value: any) => void;
    onLaunchSale: (sale: SalesRecord) => void;
    onManageLaunch: (sale: SalesRecord) => void;
    calculateSaleDetails: (sale: SalesRecord) => { fee: number; investment: number };
    launchedDates: Set<string>;
    isWeekLaunched: boolean;
    weekStartDate: Date;
}> = ({ weekSales, isBalanceVisible, onUpdateSale, onLaunchSale, onManageLaunch, calculateSaleDetails, launchedDates, isWeekLaunched, weekStartDate }) => {
    const weekStart = weekStartDate;
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const weekTotal = useMemo(() => {
        return weekSales.reduce((sum, sale) => {
            return sum + Object.entries(sale).reduce((daySum, [key, value]) => {
                if (typeof value === 'number' && key !== 'id') {
                    return daySum + value;
                }
                return daySum;
            }, 0);
        }, 0);
    }, [weekSales]);

    const tableHeaderGroups = [
      { label: "Pagamentos Imediatos", span: 3 }, { label: "Crédito", span: 3 }, { label: "Débito", span: 3 },
    ];
    
    const tableSubHeaders: { key: keyof SalesRecord, label: string }[] = [
        { key: 'cash', label: 'Dinheiro' }, { key: 'pixManual', label: 'Pix Manual' }, { key: 'pixQRCode', label: 'Pix QR' },
        { key: 'creditMastercard', label: 'MasterCard' }, { key: 'creditVisa', label: 'Visa' }, { key: 'creditElo', label: 'Elo' },
        { key: 'debitMastercard', label: 'MasterCard' }, { key: 'debitVisa', label: 'Visa' }, { key: 'debitElo', label: 'Elo' },
    ];

    const weekTotals = useMemo(() => {
        const totals = { ...INITIAL_SALES_RECORD };
        let totalFees = 0;
        let totalInvestment = 0;
        let grandTotal = 0;
        
        weekSales.forEach(sale => {
            const { fee, investment } = calculateSaleDetails(sale);
            totalFees += fee;
            totalInvestment += investment;
            tableSubHeaders.forEach(col => {
                totals[col.key] = (Number(totals[col.key]) || 0) + Number(sale[col.key]);
            });
            grandTotal += Object.keys(INITIAL_SALES_RECORD).reduce((sum, key) => sum + Number(sale[key as keyof typeof INITIAL_SALES_RECORD]), 0);
        });
        
        return { ...totals, totalFees, totalInvestment, grandTotal };
    }, [weekSales, calculateSaleDetails]);


    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            <header className="flex items-center justify-between p-4 bg-slate-50/50 border-b">
                <div className="flex items-center gap-4">
                    <div 
                        className={`w-3 h-3 rounded-full shrink-0 ${isWeekLaunched ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        title={isWeekLaunched ? 'Semana com lançamentos efetuados' : 'Semana sem lançamentos'}
                    />
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">
                           Detalhes da Semana
                        </h3>
                        <p className="text-sm text-slate-500">
                            Total: <span className="font-semibold">{formatCurrency(weekTotal, isBalanceVisible)}</span>
                        </p>
                    </div>
                </div>
                 <Icon path={ICONS.sales} className="w-8 h-8 text-indigo-500" />
            </header>
            <div className="overflow-x-auto animate-fade-in">
                 <table className="w-full text-sm text-left text-slate-600 border-separate border-spacing-0">
                    <thead className="text-xs text-slate-500 bg-slate-50">
                        <tr>
                            <th rowSpan={2} className="px-3 py-3 w-[150px] text-left font-semibold border-b">Data</th>
                            {tableHeaderGroups.map(group => (
                                <th key={group.label} colSpan={group.span} className="px-6 py-2 text-center font-semibold border-b border-l">{group.label}</th>
                            ))}
                            <th rowSpan={2} className="px-3 py-3 text-right font-semibold border-b border-l">Tarifa Est.</th>
                            <th rowSpan={2} className="px-3 py-3 text-right font-semibold border-b border-l">Invest. Est.</th>
                            <th rowSpan={2} className="px-3 py-3 text-right font-semibold border-b border-l">Total Dia</th>
                            <th rowSpan={2} className="px-3 py-3 w-[120px] text-center font-semibold border-b border-l">Ação</th>
                        </tr>
                        <tr>
                            {tableSubHeaders.map(sub => (
                                <th key={sub.key} scope="col" className="px-3 py-2 text-center font-medium border-b border-l">{sub.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {weekSales.map((sale) => {
                            const rowTotal = Object.keys(INITIAL_SALES_RECORD).reduce((sum, key) => sum + Number(sale[key as keyof typeof INITIAL_SALES_RECORD]), 0);
                            const { fee, investment } = calculateSaleDetails(sale);
                            const isLaunched = launchedDates.has(sale.date);
                            
                            return (
                            <tr key={sale.id} className="group hover:bg-slate-50/70">
                                <td className="px-3 py-1 whitespace-nowrap font-medium text-slate-800 border-t">
                                    <div className="flex items-center gap-2">
                                        {isLaunched && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Lançado"></div>}
                                        <span>{sale.date} <span className="text-slate-400 text-xs">({sale.dayOfWeek.split('-')[0]})</span></span>
                                    </div>
                                </td>
                                
                                {tableSubHeaders.map(col => (
                                    <td key={col.key} className="p-0 min-w-[120px] border-t border-l">
                                        <EditableCell
                                            value={sale[col.key]}
                                            onChange={(newValue) => onUpdateSale(sale.id, col.key, newValue)}
                                            isVisible={isBalanceVisible}
                                        />
                                    </td>
                                ))}
                                
                                <td className="px-4 py-1 text-right text-rose-600 border-t border-l">{formatCurrency(fee, isBalanceVisible)}</td>
                                <td className="px-4 py-1 text-right text-emerald-600 border-t border-l">{formatCurrency(investment, isBalanceVisible)}</td>
                                <td className="px-4 py-1 font-semibold text-right text-slate-700 border-t border-l">{formatCurrency(rowTotal, isBalanceVisible)}</td>
                                
                                <td className="px-2 py-1 text-center border-t border-l">
                                    {isLaunched ? (
                                        <button onClick={() => onManageLaunch(sale)} disabled={rowTotal <= 0} className="bg-slate-200 text-slate-700 px-2 py-1.5 text-xs font-semibold rounded-md hover:bg-slate-300 disabled:opacity-50 flex items-center gap-1.5" title="Gerenciar lançamento" >
                                            <Icon path={ICONS.config} className="w-4 h-4" /> Gerenciar
                                        </button>
                                    ) : (
                                        <button onClick={() => onLaunchSale(sale)} disabled={rowTotal <= 0} className="bg-indigo-600 text-white px-2 py-1.5 text-xs font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5" title="Lançar como receita" >
                                            <Icon path={ICONS.checkCircle} className="w-4 h-4" /> Lançar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                     <tfoot className="font-semibold text-slate-800 bg-slate-100 border-t-2 border-slate-300">
                        <tr>
                            <td className="px-3 py-3">TOTAIS</td>
                            {tableSubHeaders.map(col => (
                                <td key={`total-${col.key}`} className="px-2 py-3 text-right border-l">{formatCurrency(Number(weekTotals[col.key]), isBalanceVisible)}</td>
                            ))}
                            <td className="px-2 py-3 text-right text-rose-700 border-l">{formatCurrency(weekTotals.totalFees, isBalanceVisible)}</td>
                            <td className="px-2 py-3 text-right text-emerald-700 border-l">{formatCurrency(weekTotals.totalInvestment, isBalanceVisible)}</td>
                            <td className="px-2 py-3 text-right text-indigo-700 border-l">{formatCurrency(weekTotals.grandTotal, isBalanceVisible)}</td>
                            <td className="border-l"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export const SalesView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data, dispatch } = useAppContext();
    const { sales, transactions, feeConfiguration } = data;
    const { addToast } = useToast();
    const [confirmModalState, setConfirmModalState] = useState<{isOpen: boolean; sale: SalesRecord | null}>({isOpen: false, sale: null});
    const [currentDate, setCurrentDate] = useState(new Date());

    const salesByWeek = useMemo(() => {
        const groups = new Map<string, SalesRecord[]>();
        sales.forEach((sale: SalesRecord) => {
            const saleDate = parseDate(sale.date);
            const startOfWeek = getStartOfWeek(saleDate);
            const key = startOfWeek.toISOString();
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(sale);
        });
        const sortedGroups = new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
        return sortedGroups;
    }, [sales]);

    const feeConfig = useMemo(() => ({
        creditVisa: Number(feeConfiguration.creditVisa) || 0, creditMastercard: Number(feeConfiguration.creditMastercard) || 0, creditElo: Number(feeConfiguration.creditElo) || 0,
        debitVisa: Number(feeConfiguration.debitVisa) || 0, debitMastercard: Number(feeConfiguration.debitMastercard) || 0, debitElo: Number(feeConfiguration.debitElo) || 0,
        pixQRCode: Number(feeConfiguration.pixQRCode) || 0, investmentPercentage: Number(feeConfiguration.investmentPercentage) || 0,
    }), [feeConfiguration]);

    const calculateSaleDetails = useCallback((sale: SalesRecord) => {
        const creditVisa = Number(sale.creditVisa); const creditMastercard = Number(sale.creditMastercard); const creditElo = Number(sale.creditElo);
        const debitVisa = Number(sale.debitVisa); const debitMastercard = Number(sale.debitMastercard); const debitElo = Number(sale.debitElo);
        const pixQRCode = Number(sale.pixQRCode);

        const fee = (creditVisa * feeConfig.creditVisa / 100) + (creditMastercard * feeConfig.creditMastercard / 100) + (creditElo * feeConfig.creditElo / 100) +
                    (debitVisa * feeConfig.debitVisa / 100) + (debitMastercard * feeConfig.debitMastercard / 100) + (debitElo * feeConfig.debitElo / 100) +
                    (pixQRCode * feeConfig.pixQRCode / 100);
        
        const netDigitalSales = (creditVisa + creditMastercard + creditElo + debitVisa + debitMastercard + debitElo + pixQRCode) - fee;
        const investment = netDigitalSales > 0 ? (netDigitalSales * feeConfig.investmentPercentage / 100) : 0;
        
        return { fee, investment };
    }, [feeConfig]);
    
    const updateSale = (saleId: string, columnKey: keyof SalesRecord, value: any) => {
        dispatch({type: 'SET_SALES', payload: sales.map((sale) => sale.id === saleId ? { ...sale, [columnKey]: value } : sale)});
    };
    
    const handleNavigateWeek = (days: number) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setUTCDate(newDate.getUTCDate() + days);
            return newDate;
        });
    };
    
    const createWeekForDate = (date: Date) => {
        const startOfWeek = getStartOfWeek(date);
        
        const newSales: SalesRecord[] = Array.from({ length: 7 }, (_, i) => {
            const nextDate = new Date(startOfWeek);
            nextDate.setUTCDate(startOfWeek.getUTCDate() + i);
            return {
                id: `sale-${Date.now()}-${i}`, date: formatDate(nextDate), dayOfWeek: PT_BR_WEEKDAYS[nextDate.getUTCDay()], ...INITIAL_SALES_RECORD,
            };
        });

        dispatch({type: 'SET_SALES', payload: prev => [...prev, ...newSales].sort((a,b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())});
        addToast(`Semana criada com sucesso!`, 'success');
    };

    const generateTransactionsFromSale = useCallback((sale: SalesRecord, currentTransactions: Transaction[]): Transaction[] => {
        const { fee, investment } = calculateSaleDetails(sale);
        const cash = Number(sale.cash); const pixManual = Number(sale.pixManual);
        const totalElectronicValue = Number(sale.creditVisa) + Number(sale.creditMastercard) + Number(sale.creditElo) +
            Number(sale.debitVisa) + Number(sale.debitMastercard) + Number(sale.debitElo) + Number(sale.pixQRCode) + pixManual;
    
        if (cash + totalElectronicValue <= 0) return [];
    
        const newTransactions: Transaction[] = [];
        const maxDocNumber = currentTransactions.map(t => parseInt(t.docNumber, 10)).filter(n => !isNaN(n)).reduce((max, current) => Math.max(max, current), 0);
        const newDocNumber = String(maxDocNumber + 1);
        const maxFeeDocNumber = currentTransactions.filter(t => t.category === 'Tarifa Adquirente').map(t => parseInt(t.docNumber, 10)).filter(n => !isNaN(n)).reduce((max, current) => Math.max(max, current), 0);
        const newFeeDocNumber = String(maxFeeDocNumber + 1);
    
        if (cash > 0) newTransactions.push({ id: `trans-sale-cash-${Date.now()}`, type: 'revenue', date: sale.date, description: `Venda do dia ${sale.date} (Dinheiro)`, observation: 'LAN_AUT - Tela de Vendas', supplier: '', docNumber: newDocNumber, category: 'Venda de Produtos', account: 'Caixa Físico', value: cash });
        const electronicRevenueForMainAccount = totalElectronicValue - investment;
        if (electronicRevenueForMainAccount > 0) newTransactions.push({ id: `trans-sale-elec-${Date.now()}`, type: 'revenue', date: sale.date, description: `Venda do dia ${sale.date} (Eletrônico)`, observation: 'LAN_AUT - Tela de Vendas', supplier: '', docNumber: newDocNumber, category: 'Venda de Produtos', account: 'Stone I.P', value: electronicRevenueForMainAccount });
        if (investment > 0) newTransactions.push({ id: `trans-sale-invest-${Date.now()}`, type: 'revenue', date: sale.date, description: `Investimento da venda ${sale.date}`, observation: 'LANC_AUTO', supplier: '', docNumber: newDocNumber, category: 'Venda de Produtos', account: 'Stone I.P - Investimento', value: investment });
        if (fee > 0) newTransactions.push({ id: `trans-fee-${Date.now()}`, type: 'expense', date: sale.date, description: 'LANC_AUTO - Taxas e Tarifas', observation: '', supplier: 'Adquirente', docNumber: newFeeDocNumber, category: 'Tarifa Adquirente', account: 'Stone I.P', value: fee });
        return newTransactions;
    }, [calculateSaleDetails]);

    const launchedDates = useMemo(() => new Set(transactions
        .filter(t => t.observation?.includes('LAN_AUT') || t.description?.includes('LANC_AUTO'))
        .map(t => t.date)
    ), [transactions]);

    const handleLaunchSale = (saleToLaunch: SalesRecord) => {
        const rowTotal = Object.keys(INITIAL_SALES_RECORD).reduce((sum, key) => sum + Number(saleToLaunch[key as keyof typeof INITIAL_SALES_RECORD]), 0);
        if (rowTotal <= 0) { addToast("Venda com total zero não pode ser lançada.", "error"); return; }
        if (launchedDates.has(saleToLaunch.date)) { addToast(`A venda do dia ${saleToLaunch.date} já foi lançada.`, "info"); return; }
        
        const newTransactions = generateTransactionsFromSale(saleToLaunch, transactions);
        if (newTransactions.length > 0) {
            dispatch({type: 'SET_TRANSACTIONS', payload: prev => [...prev, ...newTransactions].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())});
            addToast(`Venda de ${formatCurrency(rowTotal)} e taxas lançadas!`, 'success');
        }
    };

    const executeEditLaunch = (saleToEdit: SalesRecord) => {
        const rowTotal = Object.keys(INITIAL_SALES_RECORD).reduce((sum, key) => sum + Number(saleToEdit[key as keyof typeof INITIAL_SALES_RECORD]), 0);
        if (rowTotal <= 0) { addToast("A venda deve ter um total maior que zero.", "error"); return; }
        
        dispatch({type: 'SET_TRANSACTIONS', payload: prevTransactions => {
            const newTransactions = generateTransactionsFromSale(saleToEdit, prevTransactions);
            const transactionsToKeep = prevTransactions.filter(t => t.date !== saleToEdit.date || !(t.observation?.includes('LAN_AUT') || t.description?.includes('LANC_AUTO')));
            return [...transactionsToKeep, ...newTransactions].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
        }});
        addToast(`Lançamento de ${saleToEdit.date} atualizado!`, 'success');
        setConfirmModalState({ isOpen: false, sale: null });
    };

    const handleDeleteLaunch = (saleToDelete: SalesRecord) => {
        if (!saleToDelete) return;
        dispatch({type: 'SET_TRANSACTIONS', payload: prev => prev.filter(t => t.date !== saleToDelete.date || !(t.observation?.includes('LAN_AUT') || t.description?.includes('LANC_AUTO')))});
        addToast(`Lançamento de ${saleToDelete.date} excluído!`, 'success');
        setConfirmModalState({ isOpen: false, sale: null });
    };

    const salesSummary = useMemo(() => {
        if (sales.length === 0) return { grandTotal: 0, totalFees: 0, totalInvestment: 0, paymentMethodData: [] };
        const totals = sales.reduce((acc, sale) => {
            const { fee, investment } = calculateSaleDetails(sale);
            acc.grandTotal += Object.keys(INITIAL_SALES_RECORD).reduce((sum, key) => sum + Number(sale[key as keyof typeof INITIAL_SALES_RECORD]), 0);
            acc.totalFees += fee; acc.totalInvestment += investment;
            acc.paymentMethods.cash += Number(sale.cash); acc.paymentMethods.pix += Number(sale.pixManual) + Number(sale.pixQRCode);
            acc.paymentMethods.credit += Number(sale.creditMastercard) + Number(sale.creditVisa) + Number(sale.creditElo);
            acc.paymentMethods.debit += Number(sale.debitMastercard) + Number(sale.debitVisa) + Number(sale.debitElo);
            return acc;
        }, { grandTotal: 0, totalFees: 0, totalInvestment: 0, paymentMethods: { cash: 0, pix: 0, credit: 0, debit: 0 } });
        const paymentMethodData = [
            { name: 'Dinheiro', value: totals.paymentMethods.cash }, { name: 'PIX', value: totals.paymentMethods.pix },
            { name: 'Crédito', value: totals.paymentMethods.credit }, { name: 'Débito', value: totals.paymentMethods.debit },
        ].filter(item => item.value > 0);
        return { ...totals, paymentMethodData };
    }, [sales, calculateSaleDetails]);
    
    const COLORS = ['#10B981', '#3B82F6', '#F97316', '#F59E0B'];

    const startOfVisibleWeek = getStartOfWeek(currentDate);
    const endOfVisibleWeek = new Date(startOfVisibleWeek);
    endOfVisibleWeek.setUTCDate(startOfVisibleWeek.getUTCDate() + 6);
    const visibleWeekKey = startOfVisibleWeek.toISOString();
    const visibleWeekSales = salesByWeek.get(visibleWeekKey);
    const isVisibleWeekLaunched = visibleWeekSales ? visibleWeekSales.some(sale => launchedDates.has(sale.date)) : false;

    return (
        <div className="space-y-6 animate-fade-in">
            <Modal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, sale: null })} title={`Ações para Lançamento de ${confirmModalState.sale?.date}`}>
                <div className="space-y-4">
                    <p className="text-slate-600">Escolha a ação para a venda de <span className="font-bold">{confirmModalState.sale?.date}</span>.</p>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-semibold text-amber-800">Editar Lançamento</h4>
                        <p className="text-sm text-amber-700 mt-1">Remove as transações existentes para este dia e cria novas com os valores atuais.</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                        <h4 className="font-semibold text-rose-800">Excluir Lançamento</h4>
                        <p className="text-sm text-rose-700 mt-1">Remove permanentemente as transações financeiras associadas a esta venda.</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
                        <button type="button" onClick={() => setConfirmModalState({ isOpen: false, sale: null })} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
                        <button type="button" onClick={() => { if (confirmModalState.sale) handleDeleteLaunch(confirmModalState.sale) }} className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 font-semibold">Excluir</button>
                        <button type="button" onClick={() => { if (confirmModalState.sale) executeEditLaunch(confirmModalState.sale) }} className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-semibold">Editar</button>
                    </div>
                </div>
            </Modal>
            
            <h1 className="text-3xl font-bold text-slate-800">Conferência de Vendas</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Vendas Totais do Período" value={formatCurrency(salesSummary.grandTotal, isBalanceVisible)} icon={<Icon path={ICONS.balance} className="w-6 h-6" />} color="indigo" />
                <StatCard title="Taxas Estimadas" value={formatCurrency(salesSummary.totalFees, isBalanceVisible)} icon={<Icon path={ICONS.expense} className="w-6 h-6" />} color="rose" />
                <StatCard title="Investimento Estimado" value={formatCurrency(salesSummary.totalInvestment, isBalanceVisible)} icon={<Icon path={ICONS.trendingUp} className="w-6 h-6" />} color="emerald" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Vendas por Forma de Pagamento (Período Total)</h2>
                <div className="h-72">
                     {salesSummary.paymentMethodData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={salesSummary.paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3}>
                                    {salesSummary.paymentMethodData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value as number, isBalanceVisible)}/>
                                <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{fontSize: "14px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <EmptyChartState message="Sem dados de vendas para exibir." />}
                </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200/80">
                <h2 className="text-xl font-bold text-slate-800">Navegar Semanas</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleNavigateWeek(-7)} className="p-2 rounded-md hover:bg-slate-100 transition-colors" aria-label="Semana anterior">
                        <Icon path={ICONS.transactions} className="w-5 h-5 text-slate-500" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors">
                        Hoje
                    </button>
                    <span className="font-semibold text-slate-700 text-center w-48 tabular-nums">
                        {formatDate(startOfVisibleWeek)} - {formatDate(endOfVisibleWeek)}
                    </span>
                    <button onClick={() => handleNavigateWeek(7)} className="p-2 rounded-md hover:bg-slate-100 transition-colors" aria-label="Próxima semana">
                        <Icon path={ICONS.transactions} className="w-5 h-5 text-slate-500 transform rotate-180" />
                    </button>
                </div>
            </div>
            
            <div className="mt-6">
                {visibleWeekSales ? (
                    <>
                        <WeekSection
                            weekSales={visibleWeekSales}
                            weekStartDate={startOfVisibleWeek}
                            isWeekLaunched={isVisibleWeekLaunched}
                            isBalanceVisible={isBalanceVisible}
                            onUpdateSale={updateSale}
                            onLaunchSale={handleLaunchSale}
                            onManageLaunch={(sale) => setConfirmModalState({isOpen: true, sale})}
                            calculateSaleDetails={calculateSaleDetails}
                            launchedDates={launchedDates}
                        />
                         <WeekChart 
                            weekSales={visibleWeekSales}
                            isBalanceVisible={isBalanceVisible}
                            calculateSaleDetails={calculateSaleDetails}
                        />
                    </>
                ) : (
                    <div className="text-center bg-white rounded-xl shadow-sm border border-slate-200/80 p-12">
                        <Icon path={ICONS.sales} className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Nenhum lançamento para esta semana.</h3>
                        <p className="text-slate-500 mt-1">Deseja adicionar os lançamentos para a semana de {formatDate(startOfVisibleWeek)} a {formatDate(endOfVisibleWeek)}?</p>
                        <button 
                            onClick={() => createWeekForDate(currentDate)}
                            className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow flex items-center gap-2 font-semibold mx-auto"
                        >
                            <Icon path={ICONS.plus} className="w-5 h-5"/> Criar Semana
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};