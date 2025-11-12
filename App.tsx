import React, { useState } from 'react';
import { Module } from './types';
import { Icon, ICONS } from './components/Icon';
import FinancialModule from './modules/FinancialModule';
import PlaceholderModule from './modules/PlaceholderModule';
import InventoryModule from './modules/InventoryModule';
import HRModule from './modules/HRModule';
import HomeScreen from './views/HomeScreen';

export default function App() {
    const [activeModule, setActiveModule] = useState<Module | null>(null);
    
    const handleGoHome = () => {
        setActiveModule(null);
    };

    const modules: { id: Module; name: string; icon: string; }[] = [
        { id: 'financeiro', name: 'Financeiro', icon: ICONS.bank },
        { id: 'comercial', name: 'Comercial', icon: ICONS.commercial },
        { id: 'estoque', name: 'Estoque', icon: ICONS.inventory },
        { id: 'pessoal', name: 'Departamento Pessoal', icon: ICONS.hr },
    ];
    
    const renderModule = () => {
        switch (activeModule) {
            case 'financeiro':
                return <FinancialModule />;
            case 'comercial':
                return <PlaceholderModule moduleName="Comercial" />;
            case 'estoque':
                return <InventoryModule />;
            case 'pessoal':
                return <HRModule />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <aside className="w-20 bg-slate-900 p-4 flex flex-col items-center shrink-0 z-40 shadow-lg">
                <button onClick={handleGoHome} className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shrink-0 mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white" title="Voltar ao início">
                    <span className="text-white font-bold text-lg">P</span>
                </button>

                <nav className="flex flex-col items-center space-y-4">
                    {modules.map(module => (
                        <div key={module.id} className="tooltip-container">
                            <button
                                onClick={() => setActiveModule(module.id)}
                                className={`p-3 rounded-xl transition-colors duration-200 ease-in-out ${
                                    activeModule === module.id
                                        ? 'bg-red-600 text-white'
                                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                                aria-label={module.name}
                            >
                                <Icon path={module.icon} className="w-6 h-6" />
                            </button>
                            <span className="tooltip">{module.name}</span>
                        </div>
                    ))}
                </nav>
            </aside>
            
            <div className="flex-1 flex overflow-hidden">
                 {activeModule ? renderModule() : <HomeScreen onSelectModule={setActiveModule} />}
            </div>
        </div>
    );
}