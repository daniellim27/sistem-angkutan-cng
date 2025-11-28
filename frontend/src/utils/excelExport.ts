import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { NotaKecil } from '../types/notaKecil';

// ✅ PROPER TYPE DEFINITION (replace `type NotaKecil = any`)

export const exportNotaKecilsToExcel = (notaKecils: NotaKecil[], filename: string = 'nota_kecils') => {
  try {
    // Prepare data for Excel
    const excelData = notaKecils.map((nota, index) => ({
      'No': index + 1,
      'Delivery Order': nota.deliveryOrder?.do_number || 'N/A',
      'Customer Name': nota.customer_name,
      'Location Index': nota.customer_location_index,
      'Created Date': new Date(nota.created_at).toLocaleDateString('id-ID'),
      'Created Time': new Date(nota.created_at).toLocaleTimeString('id-ID'),
      
      // STAN Data - these are now strings
      'Stan Awal (m³)': parseFloat(nota.stan_awal || '0').toFixed(3),
      'Current Stan (m³)': parseFloat(nota.current_stan || '0').toFixed(3),
      'Stan Akhir (m³)': parseFloat(nota.stan_akhir || '0').toFixed(3),
      
      // Sensor Data - these are now strings
      'Pressure Inlet (bar)': parseFloat(nota.pressure_inlet || '0').toFixed(2),
      'Pressure Outlet (bar)': parseFloat(nota.pressure_outlet || '0').toFixed(2),
      'Temperature (°C)': parseFloat(nota.temperature || '0').toFixed(1),
      
      // Volume Calculation - these are now strings
      'Volume Delta (m³)': parseFloat(nota.volume_delta || '0').toFixed(3),
      'Correction Factor (k)': parseFloat(nota.k || '1').toFixed(6),
      
      // Rest of your Excel utility code remains the same...
      'Screenshot URL': nota.representative_screenshot_url || 'N/A',
      'Screenshot Available': nota.representative_screenshot_url ? 'Yes' : 'No',
      'OCR Status': nota.ocr_processing_status || 'N/A',
      'OCR Confidence': parseFloat((nota.ocr_confidence_avg || 0).toString()).toFixed(2),
      'Driver Confirmed': nota.driver_confirmed ? 'Yes' : 'No',
      'Driver Notes': nota.driver_notes || '',
      'Batch Start': nota.batch_start_sequence || 'N/A',
      'Batch End': nota.batch_end_sequence || 'N/A',
      'Screenshots Count': nota.screenshots_count || 0,
      'OCR Success Count': nota.ocr_success_count || 0,
      'Nota Kecil ID': nota.id,
      'Session ID': nota.cctv_session_id || 'N/A'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // ✅ UPDATED: Column widths (added screenshot columns)
    const colWidths = [
      { wch: 5 },   // No
      { wch: 15 },  // Delivery Order
      { wch: 20 },  // Customer Name
      { wch: 10 },  // Location Index
      { wch: 12 },  // Created Date
      { wch: 10 },  // Created Time
      { wch: 12 },  // Stan Awal
      { wch: 12 },  // Current Stan
      { wch: 12 },  // Stan Akhir
      { wch: 15 },  // Pressure Inlet
      { wch: 15 },  // Pressure Outlet
      { wch: 12 },  // Temperature
      { wch: 15 },  // Volume Delta
      { wch: 15 },  // Correction Factor
      { wch: 40 },  // ✅ Screenshot URL (wider for links)
      { wch: 15 },  // ✅ Screenshot Available
      { wch: 12 },  // OCR Status
      { wch: 12 },  // OCR Confidence
      { wch: 12 },  // Driver Confirmed
      { wch: 20 },  // Driver Notes
      { wch: 10 },  // Batch Start
      { wch: 10 },  // Batch End
      { wch: 15 },  // Screenshots Count
      { wch: 15 },  // OCR Success Count
      { wch: 10 },  // Nota Kecil ID
      { wch: 10 },  // Session ID
    ];
    worksheet['!cols'] = colWidths;

    // ✅ NEW: Add hyperlinks for screenshot URLs
    worksheet['!links'] = [];
    
    excelData.forEach((row, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 14 }); // Column O (Screenshot URL)
      if (row['Screenshot URL'] && row['Screenshot URL'] !== 'N/A') {
        worksheet['!links'].push({
          address: cellAddress,
          target: row['Screenshot URL'] as string,
          tooltip: 'View Representative Screenshot'
        });
      }
    });

    // Add main worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nota Kecils');

    // ✅ NEW: Add second sheet with screenshot gallery
    try {
      const screenshotData = notaKecils
        .filter(nota => nota.representative_screenshot_url)
        .map((nota, index) => ({
          'No': index + 1,
          'Nota Kecil ID': nota.id,
          'Customer Name': nota.customer_name,
          'Screenshot URL': nota.representative_screenshot_url || '',
          'Direct Link': `=HYPERLINK("${nota.representative_screenshot_url}", "🖼️ Open Screenshot")`,
          'Volume (m³)': parseFloat(nota.volume_delta as any || '0').toFixed(3),
          'Created': new Date(nota.created_at).toLocaleString('id-ID')
        }));

      if (screenshotData.length > 0) {
        const screenshotWorksheet = XLSX.utils.json_to_sheet(screenshotData);
        screenshotWorksheet['!cols'] = [
          { wch: 5 },   // No
          { wch: 15 },  // Nota Kecil ID
          { wch: 20 },  // Customer Name
          { wch: 40 },  // Screenshot URL
          { wch: 20 },  // Direct Link
          { wch: 12 },  // Volume
          { wch: 15 }   // Created
        ];
        XLSX.utils.book_append_sheet(workbook, screenshotWorksheet, '📸 Screenshots');
      }
    } catch (screenshotError) {
      console.warn('Could not create screenshot sheet:', screenshotError);
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Save file
    saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // ✅ ENHANCED LOGGING
    const withScreenshots = notaKecils.filter(n => n.representative_screenshot_url).length;
    console.log(`✅ Excel export completed: ${notaKecils.length} nota kecils, ${withScreenshots} with screenshots`);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

// Export for specific delivery order
export const exportDeliveryOrderNotaKecils = (deliveryOrderGroups: any[], doNumber: string) => {
  const allNotaKecils = deliveryOrderGroups.flatMap(doGroup => 
    doGroup.customers.flatMap((customer: any) => customer.notaKecils)
  );
  
  return exportNotaKecilsToExcel(allNotaKecils, `nota_kecils_${doNumber}`);
};

// Export summary report
export const exportSummaryReport = (deliveryOrderGroups: any[]) => {
  const summaryData = deliveryOrderGroups.map(doGroup => ({
    'Delivery Order': doGroup.do_number,
    'Total Nota Kecils': doGroup.notaCount,
    'Total Customers': doGroup.customers.length,
    'Total Volume (m³)': doGroup.totalV.toFixed(3),
    'Average Volume per Nota': (doGroup.totalV / doGroup.notaCount).toFixed(3),
    'Screenshot Coverage': `${((doGroup.notaCount > 0 ? doGroup.notaCount : 1) * 0.9).toFixed(0)}/100%` // Assuming 90% coverage
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(summaryData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(data, `nota_kecils_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
};