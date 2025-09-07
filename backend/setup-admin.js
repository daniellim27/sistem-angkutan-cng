const bcrypt = require('bcrypt');
const { sequelize } = require('./src/models');

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin user...');
    
    // Wait for database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if admin user already exists
    const User = require('./src/models').User;
    const AdminProfile = require('./src/models').AdminProfile;
    
    const existingUser = await User.findOne({ where: { username: 'admin' } });
    
    if (existingUser) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    console.log('🆕 Creating admin user...');
    const passwordHash = await bcrypt.hash('awak1234', 10);
    
    const user = await User.create({
      username: 'admin',
      password_hash: passwordHash,
      role: 'admin'
    });

    // Create admin profile
    await AdminProfile.create({
      user_id: user.id,
      full_name: 'System Administrator',
      phone: '081234567890',
      email: 'admin@company.com'
    });

    console.log('✅ Admin user created successfully');
    console.log('📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: awak1234');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  setupAdmin();
}

module.exports = setupAdmin;
