import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, PaymentMethod, CreditProvider, SaleData, CreditPlan, Client } from './types';
import { MOCK_INVENTORY, COMPANY_INFO, BACKEND_SCRIPT_INSTRUCTIONS } from './constants';
import { fetchInventory, saveSale, fetchClients } from './services/googleSheetService';
import { formatCurrency, calculateInstallments } from './utils/finance';
import Invoice from './components/Invoice';
import { 
  ShoppingCart, 
  CreditCard, 
  Printer, 
  Search, 
  Trash2, 
  DollarSign, 
  FileText,
  Smartphone,
  CheckCircle,
  X,
  Send,
  Code,
  User,
  CreditCard as IdCard,
  Phone
} from 'lucide-react';

export default function App() {
  // Global State
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [rateModalOpen, setRateModalOpen] = useState(true);
  const [devModalOpen, setDevModalOpen] = useState(false);
  
  // Sales State
  const [inventory, setInventory] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer & Payment State
  const [clients, setClients] = useState<Client[]>([]); // Historical clients
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [creditProvider, setCreditProvider] = useState<CreditProvider>(CreditProvider.CASHEA);
  const [observations, setObservations] = useState('');
  
  // Autocomplete UI State
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showIdSuggestions, setShowIdSuggestions] = useState(false);
  const [filteredClientsByName, setFilteredClientsByName] = useState<Client[]>([]);
  const [filteredClientsById, setFilteredClientsById] = useState<Client[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [saleComplete, setSaleComplete] = useState<SaleData | null>(null);

  // Load Inventory and Clients
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [invData, clientData] = await Promise.all([
          fetchInventory(),
          fetchClients()
      ]);
      setInventory(invData);
      setClients(clientData);
      setLoading(false);
    };
    loadData();
  }, []);

  // Computed Totals
  const totalUSD = cart.reduce((acc, item) => acc + (item.priceUSD * item.quantity), 0);
  const totalBs = totalUSD * exchangeRate;

  // Credit Calculation
  const getCreditPlan = (): CreditPlan | undefined => {
    if (paymentMethod !== PaymentMethod.CREDIT) return undefined;
    const plan = calculateInstallments(totalUSD, exchangeRate, 0.4); // 40% initial
    return {
      provider: creditProvider,
      initialPaymentUSD: plan.initialUSD,
      initialPaymentBs: plan.initialBs,
      installments: plan.installments
    };
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setSearchQuery(''); // Reset search after add
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Autocomplete Logic
  const handleNameChange = (val: string) => {
    setClientName(val);
    if (val.length > 1) {
        const matches = clients.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
        setFilteredClientsByName(matches);
        setShowNameSuggestions(true);
    } else {
        setShowNameSuggestions(false);
    }
  };

  const handleIdChange = (val: string) => {
    setClientId(val);
    if (val.length > 1) {
        const matches = clients.filter(c => c.id.toLowerCase().includes(val.toLowerCase()));
        setFilteredClientsById(matches);
        setShowIdSuggestions(true);
    } else {
        setShowIdSuggestions(false);
    }
  };

  const selectClient = (client: Client) => {
      setClientName(client.name);
      setClientId(client.id);
      setClientPhone(client.phone);
      setShowNameSuggestions(false);
      setShowIdSuggestions(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !clientName || !clientId || !clientPhone) {
      alert("Por favor complete los datos del cliente y agregue productos.");
      return;
    }

    setLoading(true);
    
    const saleData: SaleData = {
      date: new Date().toISOString(),
      clientName,
      clientId,
      clientPhone,
      items: cart,
      paymentMethod,
      creditDetails: getCreditPlan(),
      totalUSD,
      totalBs,
      exchangeRate,
      observations
    };

    const res = await saveSale(saleData);
    
    if (res.success) {
      setSaleComplete(saleData);
      setCart([]);
      setClientName('');
      setClientId('');
      setClientPhone('');
      setObservations('');
      // Refresh clients history in background
      fetchClients().then(setClients); 
    } else {
      alert("Error al guardar la venta: " + res.message);
    }
    setLoading(false);
  };

  const sendToWhatsApp = () => {
    if (!saleComplete) return;
    
    let message = `*ACI Movilnet - Comprobante de Venta*\n`;
    message += `Cliente: ${saleComplete.clientName}\n`;
    message += `Fecha: ${new Date(saleComplete.date).toLocaleDateString()}\n`;
    message += `*Total: ${formatCurrency(saleComplete.totalUSD, 'USD')}*\n`;
    message += `------------------\n`;
    saleComplete.items.forEach(item => {
      message += `${item.name} x${item.quantity}\n`;
    });
    message += `------------------\n`;
    if (saleComplete.paymentMethod === PaymentMethod.CREDIT) {
       message += `Método: Crédito (${saleComplete.creditDetails?.provider})\n`;
       message += `Próxima cuota: ${saleComplete.creditDetails?.installments[0].date}`;
    } else {
       message += `Método: Contado`;
    }

    const url = `https://wa.me/58${saleComplete.clientPhone.replace(/^0/, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const printInvoice = () => {
    window.print();
  };

  // Filter products
  const filteredProducts = inventory.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.includes(searchQuery)
  );

  // --- RENDERING ---

  // 1. Exchange Rate Modal
  if (rateModalOpen) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border-t-4 border-movilnet-orange">
          <div className="flex justify-center mb-6">
            <img src={COMPANY_INFO.logoUrl} alt="Logo" className="h-16" />
          </div>
          <h2 className="text-2xl font-bold text-center text-movilnet-blue mb-2">Bienvenido</h2>
          <p className="text-center text-gray-500 mb-6">Ingrese la tasa del día (BCV o Paralelo)</p>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Cambio (Bs/$)</label>
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 font-bold">Bs.</span>
            </div>
            <input 
              type="number" 
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-movilnet-orange focus:border-movilnet-orange text-lg"
              placeholder="0.00"
              autoFocus
              onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
            />
          </div>

          <button 
            onClick={() => exchangeRate > 0 && setRateModalOpen(false)}
            disabled={!exchangeRate || exchangeRate <= 0}
            className="w-full bg-gradient-to-r from-movilnet-blue to-blue-700 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Iniciar Sistema
          </button>
        </div>
      </div>
    );
  }

  // 2. Success / Print View
  if (saleComplete) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Invoice data={saleComplete} />
        
        <div className="print:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg flex justify-center gap-4 z-50">
           <button 
             onClick={printInvoice}
             className="flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition"
           >
             <Printer size={20} />
             Imprimir / Guardar PDF
           </button>
           <button 
             onClick={sendToWhatsApp}
             className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition"
           >
             <Send size={20} />
             Enviar WhatsApp
           </button>
           <button 
             onClick={() => setSaleComplete(null)}
             className="flex items-center gap-2 bg-movilnet-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
           >
             <CheckCircle size={20} />
             Nueva Venta
           </button>
        </div>
      </div>
    );
  }

  // 3. Main POS Interface
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-800 font-sans">
      
      {/* --- Sidebar / Inventory Section (Left) --- */}
      <div className="w-full md:w-7/12 p-4 md:p-6 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-3">
             <img src={COMPANY_INFO.logoUrl} alt="Logo" className="h-10" />
             <div>
               <h1 className="font-bold text-movilnet-blue leading-tight">ACI Movilnet</h1>
               <p className="text-xs text-gray-500">Punto de Venta v1.0</p>
             </div>
           </div>
           <div className="text-right">
             <div className="text-xs text-gray-500">Tasa del día</div>
             <div className="font-bold text-movilnet-orange text-lg">Bs. {exchangeRate.toFixed(2)}</div>
           </div>
           <button onClick={() => setDevModalOpen(true)} className="p-2 text-gray-300 hover:text-gray-500">
             <Code size={16} />
           </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={20} />
          </div>
          <input 
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movilnet-blue focus:border-transparent shadow-sm"
            placeholder="Escanear Código de Barras / IMEI o Buscar Producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {loading ? (
             <p className="col-span-full text-center py-10 text-gray-400">Cargando inventario...</p>
          ) : filteredProducts.length === 0 ? (
             <p className="col-span-full text-center py-10 text-gray-400">No se encontraron productos.</p>
          ) : (
             filteredProducts.map(product => (
               <button 
                 key={product.id}
                 onClick={() => handleAddToCart(product)}
                 className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-movilnet-orange transition-all text-left flex flex-col h-full group"
               >
                 <div className="flex justify-center mb-3">
                   <Smartphone className="text-gray-300 group-hover:text-movilnet-blue transition-colors" size={48} />
                 </div>
                 <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1 flex-grow">{product.name}</h3>
                 <p className="text-xs text-gray-500 mb-2 font-mono">{product.code}</p>
                 <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-end">
                    <div>
                      <span className="block text-xs text-gray-400">Precio</span>
                      <span className="font-bold text-movilnet-blue">{formatCurrency(product.priceUSD, 'USD')}</span>
                    </div>
                    <div className="text-right">
                       <span className="block text-xs text-gray-400">Bs</span>
                       <span className="font-semibold text-gray-600 text-xs">{formatCurrency(product.priceUSD * exchangeRate, 'VES')}</span>
                    </div>
                 </div>
               </button>
             ))
          )}
        </div>
      </div>

      {/* --- Cart / Checkout Section (Right) --- */}
      <div className="w-full md:w-5/12 bg-white border-l border-gray-200 h-screen flex flex-col shadow-2xl z-10">
        <div className="p-6 bg-movilnet-blue text-white flex justify-between items-center shadow-md">
           <h2 className="font-bold text-lg flex items-center gap-2">
             <ShoppingCart size={20} />
             Carrito de Compra
           </h2>
           <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{cart.length} Ítems</span>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
               <ShoppingCart size={64} />
               <p>El carrito está vacío</p>
             </div>
           ) : (
             cart.map(item => (
               <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <div>
                   <h4 className="font-bold text-sm text-gray-800">{item.name}</h4>
                   <p className="text-xs text-gray-500 font-mono">{item.code}</p>
                   <p className="text-xs text-movilnet-blue mt-1 font-semibold">{formatCurrency(item.priceUSD, 'USD')} x {item.quantity}</p>
                 </div>
                 <div className="flex items-center gap-4">
                   <span className="font-bold">{formatCurrency(item.priceUSD * item.quantity, 'USD')}</span>
                   <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                     <Trash2 size={18} />
                   </button>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* Totals Area */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
           <div className="space-y-2 mb-4">
             <div className="flex justify-between text-sm">
               <span className="text-gray-500">Subtotal USD</span>
               <span className="font-bold">{formatCurrency(totalUSD, 'USD')}</span>
             </div>
             <div className="flex justify-between text-lg text-movilnet-blue">
               <span className="font-bold">Total a Pagar USD</span>
               <span className="font-black text-2xl">{formatCurrency(totalUSD, 'USD')}</span>
             </div>
             <div className="flex justify-between text-sm text-gray-600">
               <span>Equivalente en Bolívares</span>
               <span className="font-bold">{formatCurrency(totalBs, 'VES')}</span>
             </div>
           </div>

           {/* Client Form */}
           <div className="space-y-3 mb-4 pt-4 border-t border-gray-200">
             <h3 className="text-xs font-bold text-gray-400 uppercase">Datos del Cliente</h3>
             
             {/* ID Input with Autocomplete */}
             <div className="flex gap-2 relative">
                <div className="w-1/2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IdCard size={16} className="text-gray-400" />
                    </div>
                    <input 
                      className="pl-9 p-2 border rounded text-sm w-full" 
                      placeholder="Cédula" 
                      value={clientId}
                      onChange={e => handleIdChange(e.target.value)}
                      onBlur={() => setTimeout(() => setShowIdSuggestions(false), 200)}
                      onFocus={() => clientId.length > 1 && setShowIdSuggestions(true)}
                    />
                    {showIdSuggestions && filteredClientsById.length > 0 && (
                        <ul className="absolute z-50 left-0 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-40 overflow-auto">
                            {filteredClientsById.map((c, i) => (
                                <li 
                                    key={i} 
                                    className="p-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-50"
                                    onClick={() => selectClient(c)}
                                >
                                    <span className="font-bold text-movilnet-blue">{c.id}</span> - {c.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                {/* Phone Input */}
                <div className="w-1/2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone size={16} className="text-gray-400" />
                    </div>
                    <input 
                      className="pl-9 p-2 border rounded text-sm w-full" 
                      placeholder="Teléfono (58...)" 
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                    />
                </div>
             </div>

             {/* Name Input with Autocomplete */}
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <User size={16} className="text-gray-400" />
                </div>
                <input 
                  className="pl-9 p-2 border rounded text-sm w-full" 
                  placeholder="Nombre y Apellido" 
                  value={clientName}
                  onChange={e => handleNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  onFocus={() => clientName.length > 1 && setShowNameSuggestions(true)}
                />
                {showNameSuggestions && filteredClientsByName.length > 0 && (
                    <ul className="absolute z-50 left-0 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-40 overflow-auto">
                        {filteredClientsByName.map((c, i) => (
                            <li 
                                key={i} 
                                className="p-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-50"
                                onClick={() => selectClient(c)}
                            >
                                <span className="font-bold">{c.name}</span> <span className="text-gray-500">({c.id})</span>
                            </li>
                        ))}
                    </ul>
                )}
             </div>
           </div>

           {/* Payment Method Selector */}
           <div className="mb-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Método de Pago</h3>
             <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                 className={`p-2 rounded text-sm font-bold border ${paymentMethod === PaymentMethod.CASH ? 'bg-movilnet-blue text-white border-movilnet-blue' : 'bg-white text-gray-600 border-gray-300'}`}
               >
                 Contado
               </button>
               <button 
                 onClick={() => setPaymentMethod(PaymentMethod.CREDIT)}
                 className={`p-2 rounded text-sm font-bold border ${paymentMethod === PaymentMethod.CREDIT ? 'bg-movilnet-blue text-white border-movilnet-blue' : 'bg-white text-gray-600 border-gray-300'}`}
               >
                 Crédito / Financiamiento
               </button>
             </div>
             
             {/* Credit Options */}
             {paymentMethod === PaymentMethod.CREDIT && (
               <div className="mt-3 bg-white p-3 rounded border border-movilnet-orange/30 animate-in fade-in slide-in-from-top-2">
                 <label className="block text-xs font-bold text-gray-500 mb-1">Plataforma</label>
                 <select 
                   value={creditProvider} 
                   onChange={(e) => setCreditProvider(e.target.value as CreditProvider)}
                   className="w-full p-2 border rounded text-sm mb-2 bg-gray-50"
                 >
                   {Object.values(CreditProvider).map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
                 
                 <div className="text-xs space-y-1 text-gray-600">
                    <div className="flex justify-between font-bold">
                       <span>Inicial (40%):</span>
                       <span>{formatCurrency(totalUSD * 0.4, 'USD')}</span>
                    </div>
                    <div className="flex justify-between">
                       <span>6 Cuotas Quincenales de:</span>
                       <span>{formatCurrency((totalUSD * 0.6) / 6, 'USD')}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Fechas: 15 y 30 de cada mes</p>
                 </div>
               </div>
             )}
           </div>
           
           <input 
              className="p-2 border rounded text-sm w-full mb-4" 
              placeholder="Observaciones (Opcional)" 
              value={observations}
              onChange={e => setObservations(e.target.value)}
           />

           <button 
             onClick={handleCheckout}
             disabled={loading}
             className="w-full bg-movilnet-orange text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-orange-600 transition disabled:opacity-50 flex justify-center items-center gap-2"
           >
             {loading ? 'Procesando...' : (
               <>
                 <CheckCircle size={24} />
                 Procesar Venta
               </>
             )}
           </button>
        </div>
      </div>

      {/* Developer Modal for GAS Code */}
      {devModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-lg p-6 max-w-3xl w-full h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Backend Google Apps Script Code</h3>
                <button onClick={() => setDevModalOpen(false)}><X size={24} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-2">Copia este código en tu Google Sheet (Extensiones &gt; Apps Script) para conectar la base de datos.</p>
              <textarea 
                className="flex-1 w-full bg-gray-900 text-green-400 font-mono text-xs p-4 rounded overflow-auto"
                readOnly
                value={BACKEND_SCRIPT_INSTRUCTIONS}
              />
           </div>
        </div>
      )}

    </div>
  );
}