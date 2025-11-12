import React, { useState } from 'react';
import { formatCurrency } from '../utility';

export const EditableCell: React.FC<{
    value: string | number;
    onChange: (newValue: string | number) => void;
    type?: 'text' | 'number';
    isVisible: boolean;
}> = ({ value, onChange, type = 'number', isVisible }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(String(value));

    const handleBlur = () => {
        setIsEditing(false);
        if (type === 'number') {
            const numValue = parseFloat(currentValue);
            onChange(isNaN(numValue) ? 0 : numValue);
        } else {
            onChange(currentValue);
        }
    };

    if (isEditing) {
        return (
            <input
                type={type === 'number' ? 'number' : 'text'}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                className="w-full bg-white/80 border border-indigo-300 rounded px-2 py-1 text-right shadow-inner"
                autoFocus
                step={type === 'number' ? '0.01' : undefined}
            />
        );
    }
    return (
        <div onClick={() => setIsEditing(true)} className="cursor-pointer w-full h-full px-2 py-1 text-right rounded hover:bg-slate-200/50 transition-colors">
            {type === 'number' ? formatCurrency(Number(value), isVisible) : value}
        </div>
    );
};
