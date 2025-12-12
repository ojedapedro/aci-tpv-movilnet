export const COMPANY_INFO = {
    name: 'ACI Movilnet',
    address: 'Av. Lara, Valencia, Venezuela',
    phone: '0426 7408955',
    logoUrl: 'https://i.ibb.co/hFq3BtD9/Movilnet-logo-0.png'
};

export const MOCK_INVENTORY = [
    { id: '1', code: '123456', name: 'Samsung Galaxy A14', priceUSD: 150, stock: 10 },
    { id: '2', code: '789012', name: 'Xiaomi Redmi Note 12', priceUSD: 180, stock: 8 },
    { id: '3', code: '345678', name: 'Infinix Hot 30', priceUSD: 135, stock: 15 },
    { id: '4', code: '901234', name: 'Cargador Tipo C 20W', priceUSD: 15, stock: 50 },
    { id: '5', code: '567890', name: 'Sim Card Movilnet 4G', priceUSD: 5, stock: 100 },
];

export const MOCK_CLIENTS = [
    { name: 'Juan Perez', id: 'V12345678', phone: '04141234567' },
    { name: 'Maria Rodriguez', id: 'V87654321', phone: '04241234567' },
    { name: 'Pedro Gonzalez', id: 'V11223344', phone: '04121234567' },
];

// Instructions for the user to deploy the backend
export const BACKEND_SCRIPT_INSTRUCTIONS = `
/**
 * COPIA Y PEGA ESTE CÓDIGO EN EL EDITOR DE SCRIPTS DE TU GOOGLE SHEET
 * ID DEL SHEET: 1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw
 */

function setup() {
  const ss = SpreadsheetApp.openById("1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw");
  
  // Hoja Ventas
  let salesSheet = ss.getSheetByName("Ventas");
  if (!salesSheet) {
    salesSheet = ss.insertSheet("Ventas");
    salesSheet.appendRow([
      "Fecha", "Cliente", "Cédula", "Teléfono", "Items (Código/Nombre)", 
      "Precio Total $", "Precio Total Bs", "Tasa", "Forma Pago", 
      "Detalle Crédito", "Observaciones", "Estado"
    ]);
    salesSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#F37021").setFontColor("white");
  }

  // Hoja Inventario (PROCDINVENT)
  let invSheet = ss.getSheetByName("PROCDINVENT");
  if (!invSheet) {
    invSheet = ss.insertSheet("PROCDINVENT");
    // Se añade columna Stock Mínimo (Columna E)
    invSheet.appendRow(["Código", "Descripción", "Precio USD", "Stock", "Stock Mínimo"]);
    invSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#00549F").setFontColor("white");
    
    // Datos de ejemplo
    invSheet.appendRow(["123456", "Samsung Galaxy A14", 150, 10, 2]);
    invSheet.appendRow(["789012", "Xiaomi Redmi Note 12", 180, 5, 2]);
  } else {
    // Verificar si existe la columna Stock Mínimo, si no, agregarla
    const headers = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf("Stock Mínimo") === -1) {
      invSheet.getRange(1, headers.length + 1).setValue("Stock Mínimo");
    }
  }
}

/**
 * Configura un disparador para revisar el stock diariamente a las 8 AM.
 * Ejecuta esta función una sola vez manualmente.
 */
function createDailyTrigger() {
  // Elimina triggers previos para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkLowStock') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('checkLowStock')
      .timeBased()
      .everyDays(1)
      .atHour(8)
      .create();
}

function doGet(e) {
  const ss = SpreadsheetApp.openById("1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw");
  const action = e.parameter.action || 'inventory';

  if (action === 'clients') {
    // Obtener lista única de clientes de la hoja Ventas
    const sheet = ss.getSheetByName("Ventas");
    const data = sheet.getDataRange().getValues();
    const clientsMap = new Map();
    
    // Empezar desde fila 1 (saltar encabezado)
    for (let i = 1; i < data.length; i++) {
      const name = data[i][1];
      const id = data[i][2];
      const phone = data[i][3];
      // Usar ID como clave para unicidad y asegurar que existan datos
      if (id && name) {
        clientsMap.set(id, { name, id, phone });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(Array.from(clientsMap.values())))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default: Obtener Inventario
  const sheet = ss.getSheetByName("PROCDINVENT");
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove headers header
  
  const inventory = data.map(row => ({
    code: row[0],
    name: row[1],
    priceUSD: row[2],
    stock: row[3],
    minStock: row[4] || 0
  }));

  return ContentService.createTextOutput(JSON.stringify(inventory))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.openById("1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw");
  const sheet = ss.getSheetByName("Ventas");
  
  // Handle text/plain or application/json
  const data = JSON.parse(e.postData.contents);
  
  const itemString = data.items.map(i => \`\${i.code} - \${i.name} (x\${i.quantity})\`).join(", ");
  const creditString = data.creditDetails ? 
    \`\${data.creditDetails.provider} - Inicial: \$\${data.creditDetails.initialPaymentUSD}\` : "N/A";

  sheet.appendRow([
    data.date,
    data.clientName,
    data.clientId,
    data.clientPhone,
    itemString,
    data.totalUSD,
    data.totalBs,
    data.exchangeRate,
    data.paymentMethod,
    creditString,
    data.observations,
    "Completado"
  ]);
  
  // Actualizar Stock
  updateStock(data.items);
  
  // Verificar Alertas inmediatamente después de la venta
  checkLowStock();

  return ContentService.createTextOutput(JSON.stringify({success: true, message: "Venta registrada"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateStock(items) {
  const ss = SpreadsheetApp.openById("1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw");
  const sheet = ss.getSheetByName("PROCDINVENT");
  const data = sheet.getDataRange().getValues();
  
  // Map codes to row index (ignoring header)
  const codeMap = new Map();
  for(let i=1; i<data.length; i++) {
    codeMap.set(String(data[i][0]), i + 1); // Store row number
  }
  
  items.forEach(item => {
    const row = codeMap.get(String(item.code));
    if(row) {
      const currentStock = sheet.getRange(row, 4).getValue();
      const newStock = currentStock - item.quantity;
      sheet.getRange(row, 4).setValue(newStock);
    }
  });
}

function checkLowStock() {
  const ss = SpreadsheetApp.openById("1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw");
  const sheet = ss.getSheetByName("PROCDINVENT");
  const lastRow = sheet.getLastRow();
  // Asumimos: Col D = Stock (4), Col E = Stock Mínimo (5)
  // Indices array: 0=A, 1=B, 2=C, 3=D(Stock), 4=E(MinStock)
  const range = sheet.getRange(2, 1, lastRow - 1, 5);
  const data = range.getValues();
  
  for (let i = 0; i < data.length; i++) {
    const stock = Number(data[i][3]);
    const minStock = Number(data[i][4]);
    const row = i + 2;
    
    // Si Stock <= Stock Mínimo y MinStock está definido
    if (data[i][4] !== "" && stock <= minStock) {
       // Alerta Visual: Rojo claro
       sheet.getRange(row, 1, 1, 5).setBackground("#FFCCCC");
       
       // OPCIONAL: Descomentar para activar correo
       /*
       if (MailApp.getRemainingDailyQuota() > 0) {
         MailApp.sendEmail({
           to: "admin@acimovilnet.com", // CAMBIAR POR EL CORREO REAL
           subject: "ALERTA: Stock Bajo - " + data[i][1],
           htmlBody: "El producto <b>" + data[i][1] + "</b> tiene un stock actual de " + stock + ", el cual es igual o inferior al mínimo (" + minStock + ")."
         });
       }
       */
    } else {
       // Restaurar blanco si estaba rojo
       sheet.getRange(row, 1, 1, 5).setBackground(null);
    }
  }
}

function generateMonthlyReport() {
  const ss = SpreadsheetApp.openById("1HTkRzSs8yavFTT-zqh-lHA_S2Be2X2A5Y1XMDyN13kw");
  const salesSheet = ss.getSheetByName("Ventas");
  let reportSheet = ss.getSheetByName("Reporte Mensual");
  
  if (!reportSheet) {
    reportSheet = ss.insertSheet("Reporte Mensual");
    reportSheet.appendRow(["Mes/Año", "Total Ventas USD", "Total Ventas Bs", "Unidades Vendidas", "Transacciones"]);
    reportSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#4CAF50").setFontColor("white");
  } else {
    // Limpiar datos viejos, dejar encabezado
    if (reportSheet.getLastRow() > 1) {
       reportSheet.getRange(2, 1, reportSheet.getLastRow()-1, 5).clearContent();
    }
  }
  
  const data = salesSheet.getDataRange().getValues();
  const monthlyData = {};
  
  // Iterar ventas (saltar header, i=1)
  for (let i = 1; i < data.length; i++) {
    const dateStr = data[i][0]; // Fecha
    const itemsStr = data[i][4]; // Items String
    const totalUSD = Number(data[i][5]) || 0;
    const totalBs = Number(data[i][6]) || 0;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;
    
    // Clave: MM-YYYY
    const key = (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getFullYear();
    
    if (!monthlyData[key]) {
      monthlyData[key] = { usd: 0, bs: 0, count: 0, units: 0 };
    }
    
    // Calcular unidades desde el string "Code - Name (xQty), ..."
    let currentUnits = 0;
    // Buscar patrones (x1), (x20), etc.
    const matches = itemsStr.match(/\\(x(\\d+)\\)/g);
    if (matches) {
      matches.forEach(m => {
        // Extraer número
        const num = m.match(/\\d+/);
        if (num) currentUnits += parseInt(num[0], 10);
      });
    }

    monthlyData[key].usd += totalUSD;
    monthlyData[key].bs += totalBs;
    monthlyData[key].count += 1;
    monthlyData[key].units += currentUnits;
  }
  
  // Escribir resultados
  const resultRows = [];
  for (const key in monthlyData) {
    resultRows.push([
      key, 
      monthlyData[key].usd, 
      monthlyData[key].bs, 
      monthlyData[key].units,
      monthlyData[key].count
    ]);
  }
  
  if (resultRows.length > 0) {
    reportSheet.getRange(2, 1, resultRows.length, 5).setValues(resultRows);
  }
}
`;