const bcrypt = require('bcrypt');
const { sequelize } = require('./src/models');

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Hash the password
    const passwordHash = await bcrypt.hash('awak1234', 10);
    console.log('✅ Password hashed');

    // Create user using Sequelize model
    const User = require('./src/models').User;
    const AdminProfile = require('./src/models').AdminProfile;

    // Check if admin user already exists
    const existingUser = await User.findOne({ where: { username: 'admin' } });
    if (existingUser) {
      console.log('⚠️ Admin user already exists, updating password...');
      existingUser.password_hash = passwordHash;
      await existingUser.save();
      console.log('✅ Admin user password updated');
    } else {
      console.log('🆕 Creating new admin user...');
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
    }

    console.log('🎉 Admin user setup complete!');
    console.log('📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: awak1234');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();
