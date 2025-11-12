import { AppData } from './types';

const LOCAL_STORAGE_KEY = 'financeAppProData';

/**
 * Carrega os dados do aplicativo do localStorage.
 * No futuro, esta função pode ser modificada para buscar dados de uma API de backend.
 * Ex: const response = await fetch('/api/data'); return await response.json();
 * @returns {AppData | null} Os dados do aplicativo ou nulo se não houver dados salvos.
 */
export const loadAppData = (): AppData | null => {
  try {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      return JSON.parse(savedData) as AppData;
    }
    return null;
  } catch (error) {
    console.error("Failed to load data from localStorage", error);
    return null;
  }
};

/**
 * Salva os dados do aplicativo no localStorage.
 * No futuro, esta função pode ser modificada para enviar dados para uma API de backend.
 * Ex: await fetch('/api/data', { method: 'POST', body: JSON.stringify(data), ... });
 * @param {AppData} data Os dados completos do aplicativo a serem salvos.
 */
export const saveAppData = (data: AppData): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save data to localStorage", error);
  }
};
