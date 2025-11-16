const path = require('path');
// Ensure env is loaded when running outside Docker
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Resolve models path robustly regardless of CWD or spaces in path
const modelsPath = path.join(__dirname, '..', '..', 'src', 'models');
const { sequelize, Customer, DeliveryOrder, DepositGroup, DepositGroupMember, NotaKecil, NotaBesar, NotaBesarItem, User } = require(modelsPath);

async function main() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('OK');

    // Ensure there is an admin user to attribute Nota Besar
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      throw new Error('Admin user not found. Create admin first before running this script.');
    }

    // 1) Customer
    const customer = await Customer.create({
      customer_name: 'PT Demo Gas',
      location: 'Jl. Contoh No. 123, Bandung',
      latitude: -6.917464,
      longitude: 107.619123,
      phone: '081234567890',
      nota_besar: 0,
      nota_kecil: 0,
    });
    console.log('Customer created:', customer.id);

    // 2) Delivery Orders (2 DOs)
    const do1 = await DeliveryOrder.create({
      do_number: 'DO-MOCK-001',
      do_name: 'Pengiriman Gas - Batch 1',
      customer_name: customer.customer_name,
      customer_location: customer.location,
      item_name: 'Gas CNG',
      unit: 'kubik',
      minimal_load_quantity: 10,
      actual_load_quantity: 10,
      unit_price: 150000, // IDR per m3 (example)
      total_amount: 1500000,
      trip_allowance: 200000,
      gaji: 300000,
      status: 'completed',
    });

    const do2 = await DeliveryOrder.create({
      do_number: 'DO-MOCK-002',
      do_name: 'Pengiriman Gas - Batch 2',
      customer_name: customer.customer_name,
      customer_location: customer.location,
      item_name: 'Gas CNG',
      unit: 'kubik',
      minimal_load_quantity: 8,
      actual_load_quantity: 8,
      unit_price: 150000,
      total_amount: 1200000,
      trip_allowance: 150000,
      gaji: 250000,
      status: 'completed',
    });
    console.log('Delivery orders created:', do1.id, do2.id);

    // 3) Deposit Group + Memberships
    const depGroup = await DepositGroup.create({
      spbg_location: 'SPBG Bandung Utara',
      balance: 5000000,
      completed_quantity: 0,
      deposited_amount: 5000000,
      remaining_quantity: 50,
      unit: 'kubik',
      status: 'active',
    });
    await DepositGroupMember.create({
      group_id: depGroup.id,
      delivery_order_id: do1.id,
      quantity: 10,
    });
    await DepositGroupMember.create({
      group_id: depGroup.id,
      delivery_order_id: do2.id,
      quantity: 8,
    });
    console.log('Deposit group + members created:', depGroup.id);

    // 4) Nota Kecils for each DO (simulate OCRed volumes etc.)
    const nk1 = await NotaKecil.create({
      delivery_order_id: do1.id,
      customer_location_index: 0,
      customer_name: customer.customer_name,
      customer_address: customer.location,
      stan_awal: 100.000,
      stan_akhir: 110.000,
      tekanan_operasi: 20.5,
      temperatur_operasi: 28.2,
      Vt: 10.000,
      k: 1.000000,
      V: 10.000,
      driver_confirmed: true,
    });

    const nk2 = await NotaKecil.create({
      delivery_order_id: do2.id,
      customer_location_index: 0,
      customer_name: customer.customer_name,
      customer_address: customer.location,
      stan_awal: 200.000,
      stan_akhir: 208.000,
      tekanan_operasi: 20.0,
      temperatur_operasi: 29.0,
      Vt: 8.000,
      k: 1.000000,
      V: 8.000,
      driver_confirmed: true,
    });
    console.log('Nota Kecil created:', nk1.id, nk2.id);

    // 5) Nota Besar composed of the Nota Kecil items
    const gasPrice = 150000; // same as DO unit_price
    const totalVolume = 18.0;
    const totalPrice = gasPrice * totalVolume;

    const nb = await NotaBesar.create({
      delivery_order_id: do1.id, // associate with first DO (arbitrary for mock)
      created_by: adminUser.id,
      total_volume: totalVolume,
      total_price: totalPrice,
      gas_price_per_m3: gasPrice,
      status: 'draft',
      notes: 'Mock Nota Besar for testing',
      customer_id: customer.id,
      applied_to_customer: false,
    });

    await NotaBesarItem.create({
      nota_besar_id: nb.id,
      nota_kecil_id: nk1.id,
      volume_m3: 10.000,
      price: 10.000 * gasPrice,
    });
    await NotaBesarItem.create({
      nota_besar_id: nb.id,
      nota_kecil_id: nk2.id,
      volume_m3: 8.000,
      price: 8.000 * gasPrice,
    });
    console.log('Nota Besar + items created:', nb.id);

    console.log('DONE. Summary IDs =>', {
      customerId: customer.id,
      deliveryOrderIds: [do1.id, do2.id],
      depositGroupId: depGroup.id,
      notaKecilIds: [nk1.id, nk2.id],
      notaBesarId: nb.id,
    });
  } catch (err) {
    console.error('Error populating mock data:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = main;

