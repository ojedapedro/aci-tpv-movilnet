import { Product, SaleData, SheetResponse, Client } from '../types';
import { MOCK_INVENTORY, MOCK_CLIENTS } from '../constants';

// NOTE: In a real deployment, you would replace this URL with the one generated 
// by publishing the Google Apps Script.
const API_URL = ''; 

export const fetchInventory = async (): Promise<Product[]> => {
    if (!API_URL) {
        // Return mock data if no API URL is set (Development Mode)
        return new Promise((resolve) => {
            setTimeout(() => resolve(MOCK_INVENTORY), 800);
        });
    }

    try {
        const response = await fetch(`${API_URL}?action=inventory`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching inventory", error);
        return [];
    }
};

export const fetchClients = async (): Promise<Client[]> => {
    if (!API_URL) {
        // Return mock data if no API URL is set (Development Mode)
        return new Promise((resolve) => {
            setTimeout(() => resolve(MOCK_CLIENTS), 600);
        });
    }

    try {
        const response = await fetch(`${API_URL}?action=clients`);
        const data = await response.json();
        // Ensure data matches Client interface
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching clients", error);
        return [];
    }
}

export const saveSale = async (sale: SaleData): Promise<SheetResponse> => {
    if (!API_URL) {
        console.log("Saving sale (MOCK):", sale);
        return new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, message: "Venta registrada exitosamente (Modo Demo)" }), 1500);
        });
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(sale)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error saving sale", error);
        return { success: false, message: "Error de conexión con Google Sheets" };
    }
};