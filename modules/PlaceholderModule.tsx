import React from 'react';
import { Icon, ICONS } from '../components/Icon';

const PlaceholderModule: React.FC<{ moduleName: string }> = ({ moduleName }) => {
    return (
        <main className="flex-1 flex items-center justify-center p-8 bg-slate-100">
            <div className="text-center">
                <Icon path={ICONS.config} className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-slate-700">Módulo {moduleName}</h1>
                <p className="text-slate-500 mt-2">Este módulo está em desenvolvimento.</p>
            </div>
        </main>
    );
};

export default PlaceholderModule;
