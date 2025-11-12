import React from 'react';

export const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    color: 'emerald' | 'rose' | 'blue' | 'indigo' | 'amber';
}> = ({ title, value, icon, color }) => {
    const colorClasses = {
        emerald: 'bg-emerald-100 text-emerald-600',
        rose: 'bg-rose-100 text-rose-600',
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        amber: 'bg-amber-100 text-amber-600',
    };
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 flex items-center space-x-4">
            <div className={`rounded-full p-3 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
};
