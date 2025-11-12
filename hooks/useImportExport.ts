import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { AppData, DataKey } from '../types';
import { INITIAL_FEE_CONFIGURATION } from '../constants';
import { useToast } from '../context/ToastContext';

export const useImportExport = (
    data: AppData,
    dispatch: React.Dispatch<any> // Using 'any' for simplicity with reducer actions
) => {
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const { addToast } = useToast();

    const handleExport = useCallback(async (key: DataKey) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        
        if (key === 'all') {
            const zip = new JSZip();
            zip.file('sales.csv', Papa.unparse(data.sales));
            zip.file('cash_count.csv', Papa.unparse(data.cashCount));
            zip.file('transactions.csv', Papa.unparse(data.transactions));
            zip.file('cash_count_history.csv', Papa.unparse(data.cashCountHistory));
            zip.file('fee_configuration.csv', Papa.unparse([data.feeConfiguration]));
            zip.file('recurring_transactions.csv', Papa.unparse(data.recurringTransactions));
            zip.file('accounts.csv', Papa.unparse(data.accounts));
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `financeiro_pro_backup_${timestamp}.zip`);
            addToast('Backup (ZIP) exportado com sucesso!', 'success');
        } else {
            const dataToExport = key === 'feeConfiguration' ? [data[key]] : data[key];
            const csv = Papa.unparse(dataToExport as any);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `${key}_${timestamp}.csv`);
            addToast(`${key} exportado como CSV!`, 'success');
        }
        setExportModalOpen(false);
    }, [data, addToast]);

    const handleImportFile = useCallback((file: File, key: DataKey) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results: any) => {
                if(results.errors.length) {
                    addToast('Erro ao ler arquivo CSV.', 'error');
                    console.error("CSV Parsing errors: ", results.errors);
                    return;
                }
                if(key === 'all') return;
                const importedData = key === 'feeConfiguration' ? results.data[0] || INITIAL_FEE_CONFIGURATION : results.data;
                dispatch({ type: 'UPDATE_DATA', payload: { [key]: importedData } });
                addToast(`Dados de "${key}" importados com sucesso!`, 'success');
                setImportModalOpen(false);
            },
            error: (err: any) => {
                 addToast('Falha na importação do arquivo.', 'error');
                 console.error("Error parsing CSV:", err);
            }
        });
    }, [addToast, dispatch]);

    const handleImportZip = useCallback(async (file: File) => {
        try {
            const zip = await JSZip.loadAsync(file);
            const newData: Partial<AppData> = {};
            let filesFound = 0;

            const processFile = async (fileName: string, key: 'sales' | 'cashCount' | 'transactions' | 'cashCountHistory' | 'feeConfiguration' | 'recurringTransactions' | 'accounts') => {
                 const csvFile = zip.file(fileName);
                 if (csvFile) {
                    const csvText = await csvFile.async('text');
                    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true });
                    if (!parsed.errors.length) {
                        const importedData = key === 'feeConfiguration' ? parsed.data[0] || INITIAL_FEE_CONFIGURATION : parsed.data;
                        (newData as any)[key] = importedData;
                        filesFound++;
                    }
                 }
            };
            
            await processFile('sales.csv', 'sales');
            await processFile('cash_count.csv', 'cashCount');
            await processFile('transactions.csv', 'transactions');
            await processFile('cash_count_history.csv', 'cashCountHistory');
            await processFile('fee_configuration.csv', 'feeConfiguration');
            await processFile('recurring_transactions.csv', 'recurringTransactions');
            await processFile('accounts.csv', 'accounts');

            if (filesFound > 0) {
                dispatch({ type: 'UPDATE_DATA', payload: newData });
                addToast(`Backup ZIP importado com ${filesFound} seções.`, 'success');
            } else {
                addToast('Nenhum arquivo válido encontrado no ZIP.', 'error');
            }

        } catch (error) {
            addToast('Falha ao processar arquivo ZIP.', 'error');
            console.error(error);
        } finally {
            setImportModalOpen(false);
        }
    }, [addToast, dispatch]);

    return {
        isImportModalOpen,
        setImportModalOpen,
        isExportModalOpen,
        setExportModalOpen,
        handleExport,
        handleImportFile,
        handleImportZip,
    };
};