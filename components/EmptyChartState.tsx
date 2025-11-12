import React from 'react';

export const EmptyChartState = ({ message }: { message: string }) => (
    <div className="h-full flex items-center justify-center text-center text-slate-500">
        <div>
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13v-1m4 1v-3m4 3V8M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">Sem dados para exibir</h3>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
    </div>
);
