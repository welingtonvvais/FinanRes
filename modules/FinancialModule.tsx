import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/DataContext';
import { useImportExport } from '../hooks/useImportExport';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { Icon, ICONS } from '../components/Icon';
import { Modal } from '../components/Modal';
import { DashboardView } from '../views/DashboardView';
import { SalesView } from '../views/SalesView';
import { CashCountView } from '../views/CashCountView';
import { TransactionsView } from '../views/TransactionsView';
import { RecurringTransactionsView } from '../views/RecurringTransactionsView';
import { ReportsView } from '../views/ReportsView';
import { ConfigurationView } from '../views/ConfigurationView';


export default function FinancialModule() {
    const [view, setView] = useState<View>('dashboard');
    const { data, isLoading, dispatch } = useAppContext();
    const { addToast } = useToast();
    const { processRecurringTransactions } = useRecurringTransactions();

    const {
        isImportModalOpen, setImportModalOpen,
        isExportModalOpen, setExportModalOpen,
        handleExport, handleImportFile, handleImportZip
    } = useImportExport(data, dispatch);
    
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);

    // Process recurring transactions on load
    useEffect(() => {
        if (!isLoading) {
            const processedData = processRecurringTransactions(data);
            if(JSON.stringify(processedData) !== JSON.stringify(data)) {
                dispatch({ type: 'UPDATE_DATA', payload: processedData });
            }
        }
    }, [isLoading, data, processRecurringTransactions, dispatch]);


    const ImportModalContent = () => {
        const [file, setFile] = useState<File | null>(null);

        const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files?.length) {
                const selectedFile = e.target.files[0];
                if (selectedFile.name.endsWith('.zip')) {
                    handleImportZip(selectedFile);
                } else if (selectedFile.name.endsWith('.csv')) {
                    setFile(selectedFile);
                } else {
                    addToast("Formato inválido. Use .csv ou .zip", 'error');
                }
            }
        };

        if (file) {
            return (
                <div className="text-center space-y-4">
                    <p className="font-medium text-slate-700">Importar "{file.name}" como:</p>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => handleImportFile(file, 'sales')} className="w-full bg-indigo-100 text-indigo-700 font-semibold p-3 rounded-lg hover:bg-indigo-200 transition-colors">Vendas</button>
                        <button onClick={() => handleImportFile(file, 'cashCount')} className="w-full bg-emerald-100 text-emerald-700 font-semibold p-3 rounded-lg hover:bg-emerald-200 transition-colors">Contagem de Caixa</button>
                        <button onClick={() => handleImportFile(file, 'transactions')} className="w-full bg-sky-100 text-sky-700 font-semibold p-3 rounded-lg hover:bg-sky-200 transition-colors">Lançamentos</button>
                        <button onClick={() => handleImportFile(file, 'cashCountHistory')} className="w-full bg-amber-100 text-amber-700 font-semibold p-3 rounded-lg hover:bg-amber-200 transition-colors">Histórico de Caixa</button>
                        <button onClick={() => handleImportFile(file, 'feeConfiguration')} className="w-full bg-purple-100 text-purple-700 font-semibold p-3 rounded-lg hover:bg-purple-200 transition-colors">Configurações de Taxas</button>
                        <button onClick={() => handleImportFile(file, 'recurringTransactions')} className="w-full bg-pink-100 text-pink-700 font-semibold p-3 rounded-lg hover:bg-pink-200 transition-colors">Lançamentos Recorrentes</button>
                        <button onClick={() => handleImportFile(file, 'accounts')} className="w-full bg-gray-100 text-gray-700 font-semibold p-3 rounded-lg hover:bg-gray-200 transition-colors">Contas</button>
                    </div>
                </div>
            )
        }
        
        return (
             <div className="text-center">
                <label htmlFor="file-upload" className="cursor-pointer w-full border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-slate-50 transition-colors">
                    <Icon path={ICONS.upload} className="w-12 h-12 text-slate-400 mb-2"/>
                    <span className="font-semibold text-indigo-600">Clique para selecionar</span>
                    <p className="text-sm text-slate-500 mt-1">ou arraste e solte o arquivo</p>
                    <p className="text-xs text-slate-400 mt-2">Suporta .ZIP ou .CSV</p>
                </label>
                <input id="file-upload" type="file" className="hidden" accept=".csv,.zip" onChange={onFileChange}/>
            </div>
        )
    };
    
    // --- RENDER LOGIC ---
    const NavItem = ({ targetView, icon, label }: { targetView: View, icon: React.ReactNode, label: string }) => (
        <li className="mb-1">
            <button onClick={() => setView(targetView)} className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${view === targetView ? 'bg-[rgb(170,45,49)] text-white shadow-md' : 'text-red-100 hover:bg-white/10 hover:text-white'}`}>
                {icon}
                <span className="ml-4 font-medium">{label}</span>
            </button>
        </li>
    );
    
    const renderView = () => {
        if (isLoading) return <div className="text-center p-10 font-medium text-slate-500">Carregando dados...</div>;
        switch (view) {
            case 'dashboard': return <DashboardView isBalanceVisible={isBalanceVisible} />;
            case 'sales': return <SalesView isBalanceVisible={isBalanceVisible} />;
            case 'cash': return <CashCountView isBalanceVisible={isBalanceVisible} />;
            case 'transactions': return <TransactionsView isBalanceVisible={isBalanceVisible} />;
            case 'recurring': return <RecurringTransactionsView isBalanceVisible={isBalanceVisible} />;
            case 'reports': return <ReportsView isBalanceVisible={isBalanceVisible} />;
            case 'configuration': return <ConfigurationView isBalanceVisible={isBalanceVisible} />;
            default: return <div>Selecione uma visão</div>;
        }
    };
    
    return (
        <>
            <Modal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Dados"><ImportModalContent /></Modal>
            <Modal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} title="Exportar Dados">
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => handleExport('all')} className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors shadow">Exportar Tudo (.zip)</button>
                    <hr className="my-2"/>
                    <button onClick={() => handleExport('sales')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Vendas (.csv)</button>
                    <button onClick={() => handleExport('cashCount')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Contagem Caixa (.csv)</button>
                    <button onClick={() => handleExport('transactions')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Lançamentos (.csv)</button>
                    <button onClick={() => handleExport('cashCountHistory')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Histórico de Caixa (.csv)</button>
                    <button onClick={() => handleExport('feeConfiguration')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Configurações de Taxas (.csv)</button>
                    <button onClick={() => handleExport('recurringTransactions')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Lançamentos Recorrentes (.csv)</button>
                    <button onClick={() => handleExport('accounts')} className="w-full bg-slate-100 text-slate-700 font-semibold p-3 rounded-lg hover:bg-slate-200 transition-colors">Apenas Contas (.csv)</button>
                </div>
            </Modal>
            
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-[rgb(150,25,29)] border-r border-red-900/50 p-4 flex flex-col justify-between shadow-lg shrink-0">
                    <div>
                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="flex items-center">
                                <span className="text-2xl font-bold text-white">Financeiro</span>
                            </div>
                            <button onClick={() => setIsBalanceVisible(prev => !prev)} className="p-2 rounded-full text-red-200 hover:bg-white/10" title={isBalanceVisible ? "Ocultar saldos" : "Mostrar saldos"}>
                                <Icon path={isBalanceVisible ? ICONS.eye : ICONS.eyeSlashed} className="w-6 h-6" />
                            </button>
                        </div>
                        <ul className="space-y-1">
                            <NavItem targetView="dashboard" icon={<Icon path={ICONS.dashboard}/>} label="Resultado"/>
                            <NavItem targetView="sales" icon={<Icon path={ICONS.sales}/>} label="Vendas"/>
                            <NavItem targetView="cash" icon={<Icon path={ICONS.cash}/>} label="Caixa"/>
                            <NavItem targetView="transactions" icon={<Icon path={ICONS.transactions} className="w-6 h-6 transform rotate-180"/>} label="Lançamentos"/>
                            <NavItem targetView="recurring" icon={<Icon path={ICONS.recurring}/>} label="Recorrentes"/>
                            <NavItem targetView="reports" icon={<Icon path={ICONS.reports}/>} label="Relatórios"/>
                            <NavItem targetView="configuration" icon={<Icon path={ICONS.config}/>} label="Configurações"/>
                        </ul>
                    </div>
                    <div className="border-t border-red-500/30 pt-4 space-y-2">
                        <button onClick={() => setImportModalOpen(true)} className="w-full flex items-center p-3 rounded-lg transition-colors text-red-100 hover:bg-white/10 hover:text-white">
                            <Icon path={ICONS.upload}/>
                            <span className="ml-4 font-medium">Importar Dados</span>
                        </button>
                        <button onClick={() => setExportModalOpen(true)} className="w-full flex items-center p-3 rounded-lg transition-colors text-red-100 hover:bg-white/10 hover:text-white">
                            <Icon path={ICONS.download}/>
                            <span className="ml-4 font-medium">Exportar Dados</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 p-8 overflow-y-auto">
                    {renderView()}
                </main>
            </div>
        </>
    );
}