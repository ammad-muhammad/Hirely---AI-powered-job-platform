import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { config } from '../config/env';

async function createAdmin() {
  const email = process.argv[2] || 'admin@hirely.com';
  const password = process.argv[3] || 'admin123456';
  const fullName = process.argv[4] || 'System Admin';

  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected successfully.');

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    const allPermissions = {
      canViewOverview: true,
      canManageUsers: true,
      canManageJobs: true,
      canManageVerifications: true,
      canManageBilling: true,
      canManageFraudDetection: true,
      canManageSettings: true,
      canManageSupport: true,
      canManageAdmins: true,
    };

    if (existing) {
      existing.role = 'admin';
      existing.isSuperAdmin = true;
      existing.adminPermissions = allPermissions;
      await existing.save();
      console.log(`\n✅ Existing user "${normalizedEmail}" has been upgraded to SUPER ADMIN.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const adminUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: fullName.trim(),
      role: 'admin',
      isSuperAdmin: true,
      adminPermissions: allPermissions,
    });

    console.log('\n========================================');
    console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Password: ${password}`);
    console.log(`FullName: ${adminUser.fullName}`);
    console.log(`Role:     ${adminUser.role}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
