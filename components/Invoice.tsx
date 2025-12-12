import React from 'react';
import { SaleData, PaymentMethod, CreditProvider } from '../types';
import { COMPANY_INFO } from '../constants';
import { formatCurrency } from '../utils/finance';

interface InvoiceProps {
    data: SaleData;
}

const Invoice: React.FC<InvoiceProps> = ({ data }) => {
    return (
        <div id="printable-area" className="p-8 max-w-2xl mx-auto bg-white text-sm text-gray-800 hidden print:block">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-movilnet-orange pb-6 mb-6">
                <div>
                    <img src={COMPANY_INFO.logoUrl} alt="Logo" className="h-16 mb-2 object-contain" />
                    <h1 className="text-xl font-bold text-movilnet-blue">{COMPANY_INFO.name}</h1>
                    <p>{COMPANY_INFO.address}</p>
                    <p>Tel: {COMPANY_INFO.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-movilnet-orange">RECIBO DE VENTA</h2>
                    <p className="mt-2">Fecha: {new Date(data.date).toLocaleDateString()} {new Date(data.date).toLocaleTimeString()}</p>
                    <p className="font-mono text-gray-500 text-xs mt-1">ID: {Date.now().toString().slice(-8)}</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                    <span className="block text-gray-500 text-xs uppercase font-bold">Cliente</span>
                    <span className="font-semibold">{data.clientName}</span>
                </div>
                <div>
                    <span className="block text-gray-500 text-xs uppercase font-bold">Cédula / RIF</span>
                    <span className="font-semibold">{data.clientId}</span>
                </div>
                <div>
                    <span className="block text-gray-500 text-xs uppercase font-bold">Teléfono</span>
                    <span className="font-semibold">{data.clientPhone}</span>
                </div>
                <div>
                    <span className="block text-gray-500 text-xs uppercase font-bold">Tasa de Cambio</span>
                    <span className="font-semibold">{formatCurrency(data.exchangeRate, 'VES')} / USD</span>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-6">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 font-bold text-movilnet-blue">Descripción / IMEI</th>
                        <th className="text-center py-2 font-bold text-movilnet-blue">Cant.</th>
                        <th className="text-right py-2 font-bold text-movilnet-blue">Precio Unit.</th>
                        <th className="text-right py-2 font-bold text-movilnet-blue">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">
                                <div className="font-semibold">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.code}</div>
                            </td>
                            <td className="text-center py-2">{item.quantity}</td>
                            <td className="text-right py-2">{formatCurrency(item.priceUSD, 'USD')}</td>
                            <td className="text-right py-2">{formatCurrency(item.priceUSD * item.quantity, 'USD')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals & Payment */}
            <div className="flex justify-between items-start mb-8">
                <div className="w-1/2">
                    <h3 className="font-bold text-movilnet-blue mb-2">Forma de Pago</h3>
                    <p className="text-lg">{data.paymentMethod}</p>
                    {data.paymentMethod === PaymentMethod.CREDIT && data.creditDetails && (
                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                            <p className="font-bold text-movilnet-orange">{data.creditDetails.provider}</p>
                            <p>Inicial: {formatCurrency(data.creditDetails.initialPaymentUSD, 'USD')} ({formatCurrency(data.creditDetails.initialPaymentBs, 'VES')})</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                {data.creditDetails.installments.map((inst) => (
                                    <div key={inst.number} className="flex justify-between border-b border-gray-200 pb-1">
                                        <span>Cuota {inst.number} ({inst.date}):</span>
                                        <span className="font-mono">{formatCurrency(inst.amountUSD, 'USD')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.observations && (
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-500 uppercase">Observaciones</p>
                            <p className="text-sm italic">{data.observations}</p>
                        </div>
                    )}
                </div>
                
                <div className="w-1/3 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                        <span>Total USD:</span>
                        <span className="font-bold text-lg">{formatCurrency(data.totalUSD, 'USD')}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-2">
                        <span>Total Bs:</span>
                        <span className="font-bold text-lg">{formatCurrency(data.totalBs, 'VES')}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-12 border-t pt-4">
                <p>Gracias por su compra en ACI Movilnet</p>
                <p>Conserve este recibo para cualquier reclamo o garantía.</p>
            </div>
        </div>
    );
};

export default Invoice;