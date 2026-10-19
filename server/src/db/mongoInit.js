import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Service } from '../models/Service.js';
import { OfficeLocation } from '../models/OfficeLocation.js';
import { Notification } from '../models/Others.js';
import { categoriesData, servicesData, officeLocationsData, sampleNotificationsData } from '../seed/seedData.js';

export const connectAndSeedMongo = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri);
    console.log('🍃 Connected to MongoDB Atlas/Instance successfully at:', mongoUri);

    // Seed Categories if empty
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      await Category.insertMany(categoriesData);
      console.log(`✅ Seeded ${categoriesData.length} categories into MongoDB.`);
    }

    // Seed Services if empty or refresh
    const srvCount = await Service.countDocuments();
    if (srvCount === 0) {
      await Service.insertMany(servicesData);
      console.log(`✅ Seeded ${servicesData.length} services into MongoDB.`);
    } else {
      // Upsert/refresh keywords and services
      for (const s of servicesData) {
        await Service.updateOne({ id: s.id }, { $set: s }, { upsert: true });
      }
      console.log(`✅ Refreshed keywords and data for ${servicesData.length} schemes in MongoDB.`);
    }

    // Seed Office Locations
    const offCount = await OfficeLocation.countDocuments();
    if (offCount === 0) {
      await OfficeLocation.insertMany(officeLocationsData);
      console.log(`✅ Seeded ${officeLocationsData.length} real offices across Indian states into MongoDB.`);
    } else {
      for (const o of officeLocationsData) {
        await OfficeLocation.updateOne({ id: o.id }, { $set: o }, { upsert: true });
      }
    }

    // Seed Initial Admin User if none exists
    const adminUser = await User.findOne({ email: 'admin@govdesk.in' });
    if (!adminUser) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('admin123', salt);
      await User.create({
        name: 'National Admin Officer',
        email: 'admin@govdesk.in',
        phone: '9811002233',
        password_hash: hash,
        role: 'superadmin',
        state: 'All India'
      });
      console.log('✅ Created initial Super Admin in MongoDB (admin@govdesk.in).');
    }

    // Seed Notifications
    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      await Notification.insertMany(sampleNotificationsData);
    }

    console.log('🚀 GovDesk MongoDB Database Initialized & Synchronized.');
  } catch (err) {
    console.warn('⚠️ MongoDB connection/seeding notice:', err.message);
  }
};
