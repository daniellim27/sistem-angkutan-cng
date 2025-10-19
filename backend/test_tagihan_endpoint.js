// Test the tagihan endpoint directly
require('dotenv').config();

const { DepositGroup, DepositGroupMember, DeliveryOrder } = require('./src/models');

async function testTagihanEndpoint() {
  try {
    console.log('🔍 Testing tagihan endpoint logic...');
    
    // Find the Jakarta Selatan SPBG group (same as the endpoint)
    const group = await DepositGroup.findOne({
      where: { spbg_location: 'jakarta selatan' },
      include: [{
        model: DepositGroupMember,
        as: 'members',
        include: [{
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: [
            'id',
            'do_number',
            'customer_name',
            'status',
            'gas_filling_cost',
            'gas_volume_m3',
            'actual_load_quantity',
            'surat_jalan_photo_url',
            'surat_jalan_ocr_data',
            'surat_jalan_ocr_confidence',
            'surat_jalan_volume_extracted',
            'surat_jalan_ocr_confirmed',
            'surat_jalan_confirmed_volume',
            'surat_jalan_ocr_processed_at',
            'surat_jalan_confirmed_at',
            'created_at',
            'completed_at'
          ]
        }]
      }]
    });
    
    if (!group) {
      console.log('❌ SPBG group "jakarta selatan" not found');
      return;
    }
    
    console.log('✅ Found SPBG group:', {
      id: group.id,
      location: group.spbg_location,
      members_count: group.members.length
    });
    
    // Process delivery orders (same logic as endpoint)
    const processedDOs = group.members
      .map(member => {
        const doItem = member.deliveryOrder;
        if (!doItem) return null;

        // Get the set volume (allocated volume from gas_volume_m3)
        const setVolume = parseFloat(doItem.gas_volume_m3) || 0;
        
        // Get actual volume from surat jalan (use confirmed if available, otherwise extracted)
        const actualVolume = doItem.surat_jalan_ocr_confirmed 
          ? parseFloat(doItem.surat_jalan_confirmed_volume) || 0
          : parseFloat(doItem.surat_jalan_volume_extracted) || 0;
        
        // Calculate selisih (difference between actual and set)
        const selisihVolume = actualVolume > 0 ? (actualVolume - setVolume) : 0;
        
        // Calculate gas filling cost
        const gasCost = parseFloat(doItem.gas_filling_cost) || 0;
        
        // Calculate unit rate (cost per m3)
        const unitRate = setVolume > 0 ? (gasCost / setVolume) : 0;
        
        // Calculate additional cost for selisih
        const selisihCost = selisihVolume > 0 ? (selisihVolume * unitRate) : 0;
        
        // Total cost including selisih
        const totalCost = gasCost + selisihCost;

        return {
          id: doItem.id,
          do_number: doItem.do_number,
          customer_name: doItem.customer_name,
          status: doItem.status,
          // Add comparison fields
          set_volume_m3: setVolume,
          actual_volume_m3: actualVolume,
          selisih_volume_m3: selisihVolume,
          unit_rate: unitRate,
          base_gas_cost: gasCost,
          selisih_cost: selisihCost,
          total_cost: totalCost,
          has_surat_jalan: !!doItem.surat_jalan_photo_url,
          has_ocr_data: !!doItem.surat_jalan_ocr_data,
          needs_confirmation: actualVolume > 0 && !doItem.surat_jalan_ocr_confirmed,
          // OCR details
          ocr_confidence: doItem.surat_jalan_ocr_confidence,
          volume_extracted: doItem.surat_jalan_volume_extracted,
          ocr_processed_at: doItem.surat_jalan_ocr_processed_at
        };
      })
      .filter(Boolean) // Remove any null/undefined
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by created_at DESC

    console.log(`\n📊 Processed ${processedDOs.length} delivery orders:`);
    
    processedDOs.forEach(do_item => {
      console.log(`\n🚚 DO ${do_item.do_number}:`);
      console.log(`  Set Volume: ${do_item.set_volume_m3} m³`);
      console.log(`  Actual Volume: ${do_item.actual_volume_m3} m³`);
      console.log(`  Selisih: ${do_item.selisih_volume_m3} m³`);
      console.log(`  Has Photo: ${do_item.has_surat_jalan ? '✅' : '❌'}`);
      console.log(`  Has OCR: ${do_item.has_ocr_data ? '✅' : '❌'}`);
      console.log(`  OCR Confidence: ${do_item.ocr_confidence || 'N/A'}`);
      console.log(`  Volume Extracted: ${do_item.volume_extracted || 'N/A'}`);
      console.log(`  Needs Confirmation: ${do_item.needs_confirmation ? '✅' : '❌'}`);
    });

    // Calculate summary statistics
    const summary = {
      total_delivery_orders: processedDOs.length,
      total_set_volume: processedDOs.reduce((sum, do_item) => 
        sum + do_item.set_volume_m3, 0),
      total_actual_volume: processedDOs.reduce((sum, do_item) => 
        sum + do_item.actual_volume_m3, 0),
      total_selisih_volume: processedDOs.reduce((sum, do_item) => 
        sum + do_item.selisih_volume_m3, 0),
      total_base_gas_cost: processedDOs.reduce((sum, do_item) => 
        sum + do_item.base_gas_cost, 0),
      total_selisih_cost: processedDOs.reduce((sum, do_item) => 
        sum + do_item.selisih_cost, 0),
      total_cost: processedDOs.reduce((sum, do_item) => 
        sum + do_item.total_cost, 0),
      pending_confirmation: processedDOs.filter(do_item => 
        do_item.needs_confirmation).length,
      confirmed: processedDOs.filter(do_item => 
        do_item.surat_jalan_ocr_confirmed).length,
      with_surat_jalan: processedDOs.filter(do_item => 
        do_item.has_surat_jalan).length,
      with_ocr_data: processedDOs.filter(do_item => 
        do_item.has_ocr_data).length
    };

    console.log('\n📈 Summary:');
    console.log(`  Total DOs: ${summary.total_delivery_orders}`);
    console.log(`  With Photos: ${summary.with_surat_jalan}`);
    console.log(`  With OCR Data: ${summary.with_ocr_data}`);
    console.log(`  Pending Confirmation: ${summary.pending_confirmation}`);
    console.log(`  Total Set Volume: ${summary.total_set_volume.toFixed(2)} m³`);
    console.log(`  Total Actual Volume: ${summary.total_actual_volume.toFixed(2)} m³`);
    console.log(`  Total Selisih Volume: ${summary.total_selisih_volume.toFixed(2)} m³`);
    console.log(`  Total Cost: Rp ${summary.total_cost.toLocaleString()}`);

    // Simulate the API response
    const apiResponse = {
      success: true,
      data: {
        spbg: {
          id: group.id,
          spbg_location: group.spbg_location,
          balance: group.balance,
          deposited_amount: group.deposited_amount,
          status: group.status
        },
        delivery_orders: processedDOs,
        summary
      }
    };

    console.log('\n🎯 API Response would be:');
    console.log('Success:', apiResponse.success);
    console.log('SPBG ID:', apiResponse.data.spbg.id);
    console.log('Delivery Orders Count:', apiResponse.data.delivery_orders.length);
    console.log('Summary Total Cost:', apiResponse.data.summary.total_cost);

    if (processedDOs.length === 0) {
      console.log('\n❌ NO DELIVERY ORDERS FOUND - This would cause "No billing data available"');
    } else {
      console.log('\n✅ DELIVERY ORDERS FOUND - Frontend should show billing data');
    }
    
  } catch (error) {
    console.error('❌ Tagihan endpoint test failed:', error);
  } finally {
    process.exit(0);
  }
}

testTagihanEndpoint();
