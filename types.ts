export enum PaymentMethod {
    CASH = 'Contado',
    CREDIT = 'Crédito'
}

export enum CreditProvider {
    CASHEA = 'Cashea',
    ZONA_NARANJA = 'Zona Naranja',
    WEPA = 'Wepa',
    CHOLLO = 'Chollo'
}

export interface Product {
    id: string;
    code: string; // Barcode or IMEI
    name: string;
    priceUSD: number;
    stock: number;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Installment {
    number: number;
    date: string;
    amountUSD: number;
    amountBs: number;
}

export interface CreditPlan {
    provider: CreditProvider;
    initialPaymentUSD: number;
    initialPaymentBs: number;
    installments: Installment[];
}

export interface Client {
    name: string;
    id: string;
    phone: string;
}

export interface SaleData {
    date: string;
    clientName: string;
    clientId: string;
    clientPhone: string;
    items: CartItem[];
    paymentMethod: PaymentMethod;
    creditDetails?: CreditPlan;
    totalUSD: number;
    totalBs: number;
    exchangeRate: number;
    observations: string;
}

export interface SheetResponse {
    success: boolean;
    message: string;
    data?: any;
}