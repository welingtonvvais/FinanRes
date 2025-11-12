import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Transaction, Account } from '../types';
import { useAppContext } from '../context/DataContext';
import { formatCurrency, parseDate } from '../utility';
import { StatCard } from '../components/StatCard';
import { Icon, ICONS } from '../components/Icon';
import { EmptyChartState } from '../components/EmptyChartState';

const getTransactionIcon = (transaction: Transaction) => {
    const { type, category } = transaction;

    if (category.includes('Transferência')) {
        return {
            path: ICONS.transfer,
            color: 'text-sky-600',
            bgColor: 'bg-sky-100',
            shape: 'circle',
        };
    }
    if (category.includes('Ajuste de Saldo')) {
        return {
            path: ICONS.receipt,
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
            shape: 'square',
        };
    }

    if (type === 'revenue') {
        return {
            path: ICONS.arrowUp,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100',
            shape: 'circle',
        };
    }
    
    // type === 'expense'
    return {
        path: ICONS.arrowDown,
        color: 'text-rose-600',
        bgColor: 'bg-rose-100',
        shape: 'circle',
    };
};

export const DashboardView: React.FC<{isBalanceVisible: boolean,}> = ({ isBalanceVisible }) => {
    const { data } = useAppContext();
    const { transactions, accounts } = data;

    const dashboardData = useMemo(() => {
        const allTransactionsSorted = [...transactions].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
        
        const operationalTransactions = transactions.filter(
            t => t.category !== 'Transferência de Entrada' && t.category !== 'Transferência de Saída'
        );
        const operationalTransactionsSorted = [...operationalTransactions].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
        
        const initialBalance = accounts.reduce((sum: number, acc) => sum + Number(acc.initialBalance), 0);

        const totalRevenuesAll = transactions.filter(t => t.type === 'revenue').reduce((sum: number, t) => sum + Number(t.value), 0);
        const totalExpensesAll = transactions.filter(t => t.type === 'expense').reduce((sum: number, t) => sum + Number(t.value), 0);
        const finalBalance = initialBalance + totalRevenuesAll - totalExpensesAll;

        const totalRevenues = operationalTransactions.filter(t => t.type === 'revenue').reduce((sum: number, t) => sum + Number(t.value), 0);
        const totalExpenses = operationalTransactions.filter(t => t.type === 'expense').reduce((sum: number, t) => sum + Number(t.value), 0);

        const dailyDataMap = new Map<string, { date: string; revenue: number; expense: number }>();
        operationalTransactionsSorted.forEach(t => {
            const dateStr = t.date;
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, { date: dateStr, revenue: 0, expense: 0 });
            }
            const day = dailyDataMap.get(dateStr)!;
            if (t.type === 'revenue') day.revenue += Number(t.value);
            else day.expense += Number(t.value);
        });
        
        const allDates = new Set(allTransactionsSorted.map(t => t.date));
        const dates = Array.from(allDates).sort((a,b) => parseDate(a).getTime() - parseDate(b).getTime());

        let cumulativeBalance = initialBalance;
        const balanceByDate = new Map<string, number>();
        const netByDate = new Map<string, number>();

        allTransactionsSorted.forEach(t => {
            netByDate.set(t.date, (netByDate.get(t.date) || 0) + (t.type === 'revenue' ? Number(t.value) : -Number(t.value)));
        });

        for(const date of dates) {
            cumulativeBalance += netByDate.get(date) || 0;
            balanceByDate.set(date, cumulativeBalance);
        }
        
        const cashFlowWithBalance = dates.map(date => {
            const operationalData = dailyDataMap.get(date) || { date, revenue: 0, expense: 0 };
            return { ...operationalData, balance: balanceByDate.get(date)! };
        });

        const revenueByCategory = operationalTransactions.filter(t => t.type === 'revenue').reduce((acc: Record<string, number>, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.value);
            return acc;
        }, {});
        
        const expenseByCategory = operationalTransactions.filter(t => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.value);
            return acc;
        }, {});

        const revenuePieData = Object.entries(revenueByCategory).map(([name, value]) => ({ name, value: Number(value) })).sort((a,b) => b.value - a.value);
        const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value: Number(value) })).sort((a,b) => b.value - a.value);

        const recentTransactions = [...transactions].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()).slice(0, 5);

        const expenseTransactions = operationalTransactionsSorted.filter(t => t.type === 'expense');
        let monthlyExpenseData: { name: string; value: number }[] = [];
        let latestMonth = '';

        if (expenseTransactions.length > 0) {
            const latestTransactionDate = parseDate(expenseTransactions[expenseTransactions.length - 1].date);
            const latestYear = latestTransactionDate.getUTCFullYear();
            const latestMonthNum = latestTransactionDate.getUTCMonth();
            latestMonth = `${String(latestMonthNum + 1).padStart(2, '0')}/${latestYear}`;
            
            const expensesThisMonth = expenseTransactions.filter(t => {
                const d = parseDate(t.date);
                return d.getUTCFullYear() === latestYear && d.getUTCMonth() === latestMonthNum;
            });

            const monthlyByCategory = expensesThisMonth.reduce((acc: Record<string, number>, t) => {
                acc[t.category] = (acc[t.category] || 0) + Number(t.value);
                return acc;
            }, {});
            
            monthlyExpenseData = Object.entries(monthlyByCategory)
                .map(([name, value]) => ({ name, value: Number(value) }))
                .sort((a, b) => b.value - a.value);
        }

        return {
            initialBalance,
            totalRevenues, totalExpenses, finalBalance,
            cashFlowData: cashFlowWithBalance,
            revenuePieData, expensePieData,
            recentTransactions,
            monthlyExpenseData, latestMonth
        };
    }, [transactions, accounts]);

    const COLORS_REVENUE = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];
    const COLORS_EXPENSE = ['#EF4444', '#F87171', '#FCA5A5', '#FECACA'];
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard de Resultados</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Saldo Inicial" 
                    value={formatCurrency(dashboardData.initialBalance, isBalanceVisible)} 
                    icon={<Icon path={ICONS.bank} className="w-6 h-6" />}
                    color="amber"
                />
                <StatCard 
                    title="Total de Receitas" 
                    value={formatCurrency(dashboardData.totalRevenues, isBalanceVisible)} 
                    icon={<Icon path={ICONS.revenue} className="w-6 h-6" />}
                    color="emerald"
                />
                <StatCard 
                    title="Total de Despesas" 
                    value={formatCurrency(dashboardData.totalExpenses, isBalanceVisible)} 
                    icon={<Icon path={ICONS.expense} className="w-6 h-6" />}
                    color="rose"
                />
                 <StatCard 
                    title="Saldo Final" 
                    value={formatCurrency(dashboardData.finalBalance, isBalanceVisible)} 
                    icon={<Icon path={ICONS.balance} className="w-6 h-6" />}
                    color="blue"
                />
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Fluxo de Caixa</h2>
                <div className="h-80">
                   {dashboardData.cashFlowData.length > 1 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.cashFlowData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                            <YAxis tickFormatter={(value) => formatCurrency(value as number, isBalanceVisible)} tick={{ fontSize: 12 }} domain={['auto', 'auto']}/>
                            <Tooltip formatter={(value: number, name: string) => [formatCurrency(value, isBalanceVisible), name.charAt(0).toUpperCase() + name.slice(1)]}/>
                            <Legend />
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.7}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.7}/>
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10B981" fill="url(#colorRevenue)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expense" name="Despesa" stroke="#EF4444" fill="url(#colorExpense)" strokeWidth={2} />
                            <Area type="monotone" dataKey="balance" name="Saldo" stroke="#3B82F6" fillOpacity={0} strokeWidth={2.5} />
                        </AreaChart>
                     </ResponsiveContainer>
                   ) : (
                     <EmptyChartState message="Adicione mais lançamentos para ver a evolução do fluxo de caixa." />
                   )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Despesas do Mês por Categoria ({dashboardData.latestMonth || 'N/A'})</h2>
                <div className="h-80">
                    {dashboardData.monthlyExpenseData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.monthlyExpenseData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number, isBalanceVisible)} tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} interval={0} />
                                <Tooltip formatter={(value: number) => formatCurrency(value as number, isBalanceVisible)} cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}/>
                                <Bar dataKey="value" barSize={25}>
                                    {dashboardData.monthlyExpenseData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChartState message="Nenhuma despesa registrada no último mês." />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <h2 className="text-lg font-bold text-slate-700 mb-4">Receitas por Categoria (Total)</h2>
                    <div className="h-72">
                        {dashboardData.revenuePieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dashboardData.revenuePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                        {dashboardData.revenuePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_REVENUE[index % COLORS_REVENUE.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value as number, isBalanceVisible)}/>
                                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{fontSize: "14px"}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChartState message="Nenhuma receita registrada no período." />
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <h2 className="text-lg font-bold text-slate-700 mb-4">Despesas por Categoria (Total)</h2>
                    <div className="h-72">
                         {dashboardData.expensePieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dashboardData.expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                        {dashboardData.expensePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value as number, isBalanceVisible)}/>
                                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{fontSize: "14px"}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                             <EmptyChartState message="Nenhuma despesa registrada no período." />
                        )}
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <h2 className="text-lg font-bold text-slate-700 mb-6">Lançamentos Recentes</h2>
                    {dashboardData.recentTransactions.length > 0 ? (
                        <ol className="relative border-l-2 border-dashed border-slate-200 ml-5">
                            {dashboardData.recentTransactions.map((t) => {
                                const iconInfo = getTransactionIcon(t);
                                const isSquare = iconInfo.shape === 'square';
                                return (
                                <li key={t.id} className="mb-6 ml-10">
                                    <span className={`absolute -left-5 flex items-center justify-center w-10 h-10 ${iconInfo.bgColor} ${isSquare ? 'rounded-lg' : 'rounded-full'} ring-8 ring-white`}>
                                        <Icon path={iconInfo.path} className={`w-5 h-5 ${iconInfo.color}`} />
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <div className="overflow-hidden">
                                            <p className="font-semibold text-slate-800 text-sm truncate" title={t.description}>{t.description}</p>
                                            <p className="text-xs text-slate-500">{t.category} &bull; {t.date}</p>
                                        </div>
                                        <span className={`font-bold text-sm shrink-0 ml-4 ${t.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'expense' && '-'}
                                            {formatCurrency(Number(t.value), isBalanceVisible)}
                                        </span>
                                    </div>
                                </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <div className="text-center text-sm text-slate-500 py-10 h-full flex flex-col justify-center">
                            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhum lançamento</h3>
                            <p className="mt-1 text-sm text-slate-500">Comece adicionando uma receita ou despesa.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};