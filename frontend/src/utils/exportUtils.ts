// src/utils/exportUtils.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportDeliveryOrder {
  do_number: string;
  do_name: string;
  customer_name: string;
  item_name: string;
  driver_name: string;
  vehicle_info: string;
  spbu_location: string;
  customer_locations: string;
  quantity_unit: string;
  status: string;
  total_amount: string;
  has_documents: string;
}

export const formatDeliveryOrdersForExport = (deliveryOrders: any[]): ExportDeliveryOrder[] => {
  return deliveryOrders.map((order) => {
    // Format customer locations
    const formatCustomerLocations = () => {
      const hasPrimaryLocation = order.unload_location && order.unload_location.trim() !== '';
      const hasAdditionalLocations = order.additional_unload_locations && order.additional_unload_locations.length > 0;
      
      if (!hasPrimaryLocation && !hasAdditionalLocations) {
        return 'N/A';
      }
      
      if (hasPrimaryLocation && !hasAdditionalLocations) {
        return order.unload_location;
      }
      
      if (!hasPrimaryLocation && hasAdditionalLocations) {
        // Filter out undefined/null locations and join with comma
        const validLocations = order.additional_unload_locations
          ?.filter((loc: any) => loc && loc.location && loc.location.trim() !== '')
          ?.map((loc: any) => loc.location) || [];
        return validLocations.length > 0 ? validLocations.join(', ') : 'N/A';
      }
      
      // Both primary and additional
      const primary = order.unload_location;
      const validAdditionalLocations = order.additional_unload_locations
        ?.filter((loc: any) => loc && loc.location && loc.location.trim() !== '')
        ?.map((loc: any) => loc.location) || [];
      
      if (validAdditionalLocations.length === 0) {
        return primary;
      }
      
      // Only add "+" prefix if there are multiple additional locations
      const additional = validAdditionalLocations.length === 1 
        ? validAdditionalLocations[0]
        : validAdditionalLocations.map((loc: string) => `+ ${loc}`).join(', ');
      
      return [primary, additional].filter(Boolean).join(', ');
    };

    // Format quantity and unit
    const formatQuantityUnit = () => {
      const unitDisplay = 'm³'; // All DOs use cubic meters
      const target = parseFloat(order.minimal_load_quantity?.toString() || '0').toLocaleString('id-ID');
      const actual = order.actual_load_quantity 
        ? parseFloat(order.actual_load_quantity.toString()).toLocaleString('id-ID')
        : null;
      
      if (actual) {
        return `Target: ${target} ${unitDisplay}, Actual: ${actual} ${unitDisplay}`;
      }
      return `Target: ${target} ${unitDisplay}`;
    };

    // Format total amount
    const formatTotalAmount = () => {
      const minimal = order.financial_summary?.minimal_total_amount || 0;
      const actual = order.financial_summary?.actual_total_amount;
      
      if (actual && actual !== minimal) {
        return `Rp ${minimal.toLocaleString('id-ID')} (Actual: Rp ${actual.toLocaleString('id-ID')})`;
      }
      return `Rp ${minimal.toLocaleString('id-ID')}`;
    };

    // Check if has documents
    const hasDocuments = () => {
      const hasSuratJalan = Array.isArray(order.surat_jalan_photo_url) && order.surat_jalan_photo_url.length > 0;
      const hasNota = Array.isArray(order.nota_photo_url) && order.nota_photo_url.length > 0;
      return hasSuratJalan || hasNota ? 'Yes' : 'No';
    };

    return {
      do_number: order.do_number || 'N/A',
      do_name: order.do_name || 'N/A',
      customer_name: order.customer_name || 'N/A',
      item_name: order.item_name || 'N/A',
      driver_name: order.driver_name || 'N/A',
      vehicle_info: order.vehicle_info || 'N/A',
      spbu_location: order.load_location || order.spbg_location || 'N/A',
      customer_locations: formatCustomerLocations(),
      quantity_unit: formatQuantityUnit(),
      status: order.status_text || order.status || 'N/A',
      total_amount: formatTotalAmount(),
      has_documents: hasDocuments()
    };
  });
};

export const exportToExcel = (data: ExportDeliveryOrder[], filename: string = 'delivery_orders') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Delivery Orders');
  
  // Auto-size columns
  const colWidths = [
    { wch: 15 }, // DO Number
    { wch: 20 }, // Name
    { wch: 25 }, // Customer
    { wch: 15 }, // Item
    { wch: 20 }, // Driver
    { wch: 20 }, // Vehicle
    { wch: 30 }, // SPBU Location
    { wch: 40 }, // Customer Locations
    { wch: 30 }, // Quantity & Unit
    { wch: 20 }, // Status
    { wch: 25 }, // Total Amount
    { wch: 12 }  // Has Documents
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToCSV = (data: ExportDeliveryOrder[], filename: string = 'delivery_orders') => {
  const headers = [
    'DO Number',
    'Name', 
    'Customer',
    'Item Name',
    'Driver',
    'Vehicle',
    'SPBU Location',
    'Customer Locations',
    'Quantity & Unit',
    'Status',
    'Total Amount',
    'Has Documents'
  ];
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      `"${row.do_number}"`,
      `"${row.do_name}"`,
      `"${row.customer_name}"`,
      `"${row.item_name}"`,
      `"${row.driver_name}"`,
      `"${row.vehicle_info}"`,
      `"${row.spbu_location}"`,
      `"${row.customer_locations}"`,
      `"${row.quantity_unit}"`,
      `"${row.status}"`,
      `"${row.total_amount}"`,
      `"${row.has_documents}"`
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: ExportDeliveryOrder[], filename: string = 'delivery_orders') => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table fit
  
  // Add title
  doc.setFontSize(16);
  doc.text('Delivery Orders Report', 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
  
  // Prepare table data
  const tableData = data.map(row => [
    row.do_number,
    row.do_name,
    row.customer_name,
    row.item_name,
    row.driver_name,
    row.vehicle_info,
    row.spbu_location,
    row.customer_locations,
    row.quantity_unit,
    row.status,
    row.total_amount,
    row.has_documents
  ]);
  
  const headers = [
    'DO Number',
    'Name',
    'Customer', 
    'Item',
    'Driver',
    'Vehicle',
    'SPBU Location',
    'Customer Locations',
    'Quantity & Unit',
    'Status',
    'Total Amount',
    'Documents'
  ];
  
  // Create table
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [71, 85, 105], // Gray-600
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    columnStyles: {
      0: { cellWidth: 20 }, // DO Number
      1: { cellWidth: 25 }, // Name
      2: { cellWidth: 30 }, // Customer
      3: { cellWidth: 20 }, // Item
      4: { cellWidth: 25 }, // Driver
      5: { cellWidth: 25 }, // Vehicle
      6: { cellWidth: 35 }, // SPBU Location
      7: { cellWidth: 40 }, // Customer Locations
      8: { cellWidth: 35 }, // Quantity & Unit
      9: { cellWidth: 25 }, // Status
      10: { cellWidth: 30 }, // Total Amount
      11: { cellWidth: 15 }  // Documents
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
    showHead: 'everyPage',
    pageBreak: 'auto',
  });
  
  doc.save(`${filename}.pdf`);
};

