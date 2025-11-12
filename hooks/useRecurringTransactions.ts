import { useCallback } from 'react';
import { AppData, Transaction } from '../types';
import { useToast } from '../context/ToastContext';
import { formatDate, parseDate, calculateNextDueDate } from '../utility';

export const useRecurringTransactions = () => {
    const { addToast } = useToast();

    const processRecurringTransactions = useCallback((currentData: AppData): AppData => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const newTransactions: Transaction[] = [...currentData.transactions];
        const updatedRecurring = [...currentData.recurringTransactions];
        let transactionsAdded = 0;

        const recurringToUpdate = updatedRecurring.map(recur => {
            let currentRecur = { ...recur };
            let nextDueDate = parseDate(currentRecur.nextDueDate);

            while (nextDueDate.getTime() <= today.getTime()) {
                if (currentRecur.endDate) {
                    const endDate = parseDate(currentRecur.endDate);
                    if (nextDueDate.getTime() > endDate.getTime()) {
                        break; 
                    }
                }
                
                const isAlreadyLaunched = newTransactions.some(t => 
                    t.date === formatDate(nextDueDate) && t.description === currentRecur.description
                );

                if (!isAlreadyLaunched) {
                    const newTransaction: Transaction = {
                        id: `trans-${currentRecur.id}-${nextDueDate.getTime()}`,
                        type: currentRecur.type,
                        date: formatDate(nextDueDate),
                        description: currentRecur.description,
                        observation: currentRecur.observation,
                        supplier: currentRecur.supplier,
                        docNumber: currentRecur.docNumber,
                        category: currentRecur.category,
                        account: currentRecur.account,
                        value: Number(currentRecur.value),
                    };
                    newTransactions.push(newTransaction);
                    transactionsAdded++;
                }
                
                nextDueDate = calculateNextDueDate(formatDate(nextDueDate), currentRecur.frequency);
            }
            
            currentRecur.nextDueDate = formatDate(nextDueDate);
            return currentRecur;
        });
        
        if (transactionsAdded > 0) {
            addToast(`${transactionsAdded} lançamento(s) recorrente(s) foram adicionados.`, 'info');
        }

        return {
            ...currentData,
            transactions: newTransactions.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()),
            recurringTransactions: recurringToUpdate,
        };
    }, [addToast]);

    return { processRecurringTransactions };
};
