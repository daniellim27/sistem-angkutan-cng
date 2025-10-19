// Script to fix SPBG group links for delivery orders
require('dotenv').config();

const { DeliveryOrder, DepositGroup, DepositGroupMember } = require('./src/models');

async function fixSPBGLinks() {
  try {
    console.log('🔍 Checking SPBG group links...');
    
    // Find the Jakarta Selatan SPBG group
    const spbgGroup = await DepositGroup.findOne({
      where: { spbg_location: 'jakarta selatan' }
    });
    
    if (!spbgGroup) {
      console.log('❌ SPBG group "jakarta selatan" not found');
      return;
    }
    
    console.log('✅ Found SPBG group:', {
      id: spbgGroup.id,
      location: spbgGroup.spbg_location,
      balance: spbgGroup.balance
    });
    
    // Check existing members
    const existingMembers = await DepositGroupMember.findAll({
      where: { group_id: spbgGroup.id },
      include: [{
        model: DeliveryOrder,
        as: 'deliveryOrder',
        attributes: ['id', 'do_number', 'customer_name']
      }]
    });
    
    console.log(`📊 Existing group members: ${existingMembers.length}`);
    existingMembers.forEach(member => {
      console.log(`  - DO ${member.deliveryOrder.do_number} (${member.deliveryOrder.customer_name})`);
    });
    
    // Find delivery orders that should be in this group but aren't
    const allDOs = await DeliveryOrder.findAll({
      where: {
        customer_name: 'daniel', // Based on your data
        surat_jalan_photo_url: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'do_number', 'customer_name', 'gas_volume_m3', 'gas_filling_cost'],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    console.log(`📋 Found ${allDOs.length} delivery orders to potentially link:`);
    
    // Link unlinked delivery orders to the SPBG group
    let linkedCount = 0;
    for (const do_item of allDOs) {
      // Check if already linked
      const existingLink = await DepositGroupMember.findOne({
        where: {
          group_id: spbgGroup.id,
          delivery_order_id: do_item.id
        }
      });
      
      if (!existingLink) {
        // Create the link
        await DepositGroupMember.create({
          group_id: spbgGroup.id,
          delivery_order_id: do_item.id,
          quantity: parseFloat(do_item.gas_volume_m3) || 0
        });
        
        console.log(`✅ Linked DO ${do_item.do_number} to SPBG group`);
        linkedCount++;
      } else {
        console.log(`⚠️ DO ${do_item.do_number} already linked`);
      }
    }
    
    console.log(`\n🎉 Successfully linked ${linkedCount} delivery orders to SPBG group`);
    
    // Verify the fix
    const updatedMembers = await DepositGroupMember.findAll({
      where: { group_id: spbgGroup.id },
      include: [{
        model: DeliveryOrder,
        as: 'deliveryOrder',
        attributes: ['id', 'do_number', 'customer_name', 'surat_jalan_photo_url', 'surat_jalan_ocr_data']
      }]
    });
    
    console.log(`\n📊 Updated group members: ${updatedMembers.length}`);
    updatedMembers.forEach(member => {
      const hasPhoto = !!member.deliveryOrder.surat_jalan_photo_url;
      const hasOCR = !!member.deliveryOrder.surat_jalan_ocr_data;
      console.log(`  - DO ${member.deliveryOrder.do_number} | Photo: ${hasPhoto ? '✅' : '❌'} | OCR: ${hasOCR ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing SPBG links:', error);
  } finally {
    process.exit(0);
  }
}

fixSPBGLinks();
