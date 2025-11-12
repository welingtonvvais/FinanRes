import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, Account } from '../types';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, parseDate } from '../utility';
import { PT_BR_MONTHS } from '../constants';
import { StatCard } from '../components/StatCard';
import { Icon, ICONS } from '../components/Icon';
import { EmptyChartState } from '../components/EmptyChartState';

export const ReportsView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data } = useAppContext();
    const { transactions, accounts } = data;
    const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
    const [year, setYear] = useState(new Date().getUTCFullYear());

    const availableYears = useMemo(() => {
        if (transactions.length === 0) return [new Date().getUTCFullYear()];
        const years = new Set(transactions.map(t => parseDate(t.date).getUTCFullYear()));
        // FIX: Cast array from Set to number[] to ensure correct type for sorting, as elements were being inferred as unknown.
        return (Array.from(years) as number[]).sort((a, b) => b - a);
    }, [transactions]);

    const reportData = useMemo(() => {
        const initialBalance = accounts.reduce((sum, acc) => sum + Number(acc.initialBalance), 0);

        const priorYearsTransactions = transactions.filter(t => parseDate(t.date).getUTCFullYear() < year);
        const priorYearsNetResult = priorYearsTransactions.reduce((acc: number, t) => {
            return acc + (t.type === 'revenue' ? Number(t.value) : -Number(t.value));
        }, 0);
        const yearStartingBalance = initialBalance + priorYearsNetResult;

        const filteredByYear = transactions.filter(t => parseDate(t.date).getUTCFullYear() === year);

        const groups = new Map<string, { revenue: number; expense: number; label: string; totalNet: number }>();
        
        const getGroupKey = (date: Date) => {
            if (period === 'monthly') return String(date.getUTCMonth());
            if (period === 'quarterly') return String(Math.floor(date.getUTCMonth() / 3));
            return String(year);
        };

        if (period === 'monthly') {
            PT_BR_MONTHS.forEach((month, index) => {
                groups.set(String(index), { revenue: 0, expense: 0, label: month.substring(0, 3), totalNet: 0 });
            });
        } else if (period === 'quarterly') {
            ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q, index) => {
                groups.set(String(index), { revenue: 0, expense: 0, label: q, totalNet: 0 });
            });
        } else { // annual
            groups.set(String(year), { revenue: 0, expense: 0, label: String(year), totalNet: 0 });
        }

        filteredByYear.forEach(t => {
            const date = parseDate(t.date);
            const key = getGroupKey(date);
            const group = groups.get(key);
            if (!group) return;

            const value = Number(t.value);
            group.totalNet += (t.type === 'revenue' ? value : -value);

            if (t.category !== 'Transferência de Entrada' && t.category !== 'Transferência de Saída') {
                if (t.type === 'revenue') group.revenue += value;
                else group.expense += value;
            }
        });

        let cumulativeBalance = yearStartingBalance;
        const chartData = Array.from(groups.values()).map(item => {
            const net = item.revenue - item.expense;
            cumulativeBalance += item.totalNet;
            return { ...item, net, cumulativeBalance };
        });

        const totals = chartData.reduce((acc, curr) => ({
            revenue: acc.revenue + curr.revenue,
            expense: acc.expense + curr.expense,
        }), { revenue: 0, expense: 0 });

        const yearFinalBalance = yearStartingBalance + chartData.reduce((sum, i) => sum + i.totalNet, 0);

        return { chartData, totals, yearStartingBalance, yearFinalBalance };
    }, [transactions, period, year, accounts]);

    const hasData = reportData.totals.revenue > 0 || reportData.totals.expense > 0;
    const netResult = reportData.totals.revenue - reportData.totals.expense;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Relatório de Fluxo de Caixa</h1>
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border border-slate-200/80">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPeriod('monthly')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${period === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Mensal</button>
                        <button onClick={() => setPeriod('quarterly')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${period === 'quarterly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Trimestral</button>
                        <button onClick={() => setPeriod('annual')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${period === 'annual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Anual</button>
                    </div>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} className="p-1.5 border border-slate-300 rounded-lg shadow-sm text-sm font-semibold">
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title={`Saldo Inicial de ${year}`}
                    value={formatCurrency(reportData.yearStartingBalance, isBalanceVisible)} 
                    icon={<Icon path={ICONS.bank} className="w-6 h-6" />}
                    color="amber"
                />
                <StatCard 
                    title="Total de Receitas" 
                    value={formatCurrency(reportData.totals.revenue, isBalanceVisible)} 
                    icon={<Icon path={ICONS.revenue} className="w-6 h-6" />}
                    color="emerald"
                />
                <StatCard 
                    title="Total de Despesas" 
                    value={formatCurrency(reportData.totals.expense, isBalanceVisible)} 
                    icon={<Icon path={ICONS.expense} className="w-6 h-6" />}
                    color="rose"
                />
                 <StatCard 
                    title="Saldo Final" 
                    value={formatCurrency(reportData.yearFinalBalance, isBalanceVisible)} 
                    icon={<Icon path={ICONS.balance} className="w-6 h-6" />}
                    color="blue"
                />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Resumo Operacional ({year})</h2>
                <div className="flex flex-col md:flex-row justify-around items-center text-center gap-4 md:gap-8">
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 font-medium">Total de Receitas</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totals.revenue, isBalanceVisible)}</p>
                    </div>
                    <div className="text-2xl font-light text-slate-300">-</div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 font-medium">Total de Despesas</p>
                        <p className="text-2xl font-bold text-rose-600">{formatCurrency(reportData.totals.expense, isBalanceVisible)}</p>
                    </div>
                    <div className="text-2xl font-light text-slate-300">=</div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 font-medium">Resultado do Período</p>
                        <p className={`text-2xl font-bold ${netResult >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatCurrency(netResult, isBalanceVisible)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Evolução {period === 'monthly' ? 'Mensal' : period === 'quarterly' ? 'Trimestral' : 'Anual'}</h2>
                <div className="h-80">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData.chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="label" tick={{ fontSize: 12 }}/>
                                <YAxis tickFormatter={(value) => formatCurrency(value as number, isBalanceVisible)} tick={{ fontSize: 12 }}/>
                                <Tooltip formatter={(value: number) => formatCurrency(value as number, isBalanceVisible)} cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}/>
                                <Legend />
                                <Bar dataKey="revenue" name="Receitas" fill="#10B981" />
                                <Bar dataKey="expense" name="Despesas" fill="#EF4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChartState message={`Nenhum lançamento encontrado para ${year}.`} />
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                 <h2 className="text-lg font-bold text-slate-700 mb-4 px-2">Dados Detalhados</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                            <tr>
                                <th className="px-4 py-3">Período</th>
                                <th className="px-4 py-3 text-right">Receitas</th>
                                <th className="px-4 py-3 text-right">Despesas</th>
                                <th className="px-4 py-3 text-right">Saldo do Período</th>
                                <th className="px-4 py-3 text-right">Saldo Acumulado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.chartData.map(item => (
                                <tr key={item.label} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="px-4 py-2 font-semibold">{item.label}</td>
                                    <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(item.revenue, isBalanceVisible)}</td>
                                    <td className="px-4 py-2 text-right text-rose-600">{formatCurrency(item.expense, isBalanceVisible)}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${(item.net) >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>{formatCurrency(item.net, isBalanceVisible)}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${(item.cumulativeBalance) >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>{formatCurrency(item.cumulativeBalance, isBalanceVisible)}</td>
                                </tr>
                            ))}
                            {!hasData && (
                                <tr><td colSpan={5} className="text-center py-6 text-slate-500">Nenhum dado para exibir.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="border-t-2">
                            <tr className="font-bold text-slate-800 bg-slate-100">
                                <td className="px-4 py-3">Total</td>
                                <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(reportData.totals.revenue, isBalanceVisible)}</td>
                                <td className="px-4 py-3 text-right text-rose-700">{formatCurrency(reportData.totals.expense, isBalanceVisible)}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(reportData.totals.revenue - reportData.totals.expense, isBalanceVisible)}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(reportData.yearFinalBalance, isBalanceVisible)}</td>
                            </tr>
                        </tfoot>
                    </table>
                 </div>
            </div>
        </div>
    );
};
