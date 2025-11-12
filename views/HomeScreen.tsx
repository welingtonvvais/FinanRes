import React from 'react';
import { Module } from '../types';
import { Icon, ICONS } from '../components/Icon';

interface HomeScreenProps {
  onSelectModule: (module: Module) => void;
}

const ModuleCard: React.FC<{
  module: { id: Module; name: string; icon: string; description: string };
  onSelect: (module: Module) => void;
}> = ({ module, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(module.id)}
      className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 text-left flex flex-col items-start hover:shadow-lg hover:-translate-y-1 hover:border-red-500 transition-all duration-300 ease-in-out group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      <div className="bg-slate-900 p-4 rounded-lg mb-4 transition-colors duration-300 group-hover:bg-red-600">
        <Icon path={module.icon} className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-red-600 transition-colors">
        {module.name}
      </h3>
      <p className="text-slate-500 text-sm flex-grow">
        {module.description}
      </p>
      <span className="mt-6 text-sm font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Acessar Módulo &rarr;
      </span>
    </button>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  const modules = [
    {
      id: 'financeiro' as Module,
      name: 'Financeiro',
      icon: ICONS.bank,
      description: 'Controle total sobre suas receitas, despesas, fluxo de caixa e vendas.',
    },
    {
      id: 'comercial' as Module,
      name: 'Comercial',
      icon: ICONS.commercial,
      description: 'Gerencie clientes, propostas e o funil de vendas de forma eficiente.',
    },
    {
      id: 'estoque' as Module,
      name: 'Estoque',
      icon: ICONS.inventory,
      description: 'Monitore a entrada, saída e o vencimento de produtos com precisão.',
    },
    {
      id: 'pessoal' as Module,
      name: 'Departamento Pessoal',
      icon: ICONS.hr,
      description: 'Organize informações de colaboradores, folhas de pagamento e encargos.',
    },
  ];

  return (
    <div className="w-full h-full bg-slate-100 overflow-y-auto p-4 md:p-8 animate-fade-in flex items-center justify-center">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
              Bem-vindo ao seu <span className="text-red-600">Centro de Controle</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Selecione um módulo abaixo para começar a gerenciar seu negócio com eficiência e precisão.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {modules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} onSelect={onSelectModule} />
            ))}
          </div>
        </div>
    </div>
  );
};

export default HomeScreen;