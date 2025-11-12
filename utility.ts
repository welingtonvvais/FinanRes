import { RecurringTransactionFrequency } from './types';

// --- HELPER FUNCTIONS ---
export const formatCurrency = (value: number, isVisible: boolean = true) => {
    if (!isVisible) {
        return 'R$ ●●●,●●';
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatDate = (date: Date): string => {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export const parseDate = (dateString: string): Date => {
    const [day, month, year] = dateString.split('/').map(Number);
    // To prevent timezone issues, create date in UTC
    return new Date(Date.UTC(year, month - 1, day));
};

export const calculateNextDueDate = (currentDueDateStr: string, frequency: RecurringTransactionFrequency): Date => {
    const currentDueDate = parseDate(currentDueDateStr);
    const nextDate = new Date(currentDueDate.getTime());
    switch (frequency) {
        case 'daily':
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
            break;
        case 'weekly':
            nextDate.setUTCDate(nextDate.getUTCDate() + 7);
            break;
        case 'monthly':
            nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
            break;
        case 'yearly':
            nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
            break;
    }
    return nextDate;
};

export const daysUntil = (dateString: string): number => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const expirationDate = parseDate(dateString);
    if (isNaN(expirationDate.getTime())) {
        return NaN;
    }
    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};