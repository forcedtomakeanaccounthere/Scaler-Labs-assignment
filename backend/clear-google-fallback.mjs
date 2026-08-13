/**
 * Utility script to clear the old Google fallback user from database
 * Run this after adding real Google OAuth credentials
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/redactiq';

async function clearFallbackUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      googleId: String,
      avatar: String,
    }));

    // Find and delete the fallback user
    const fallbackEmail = 'google_user@gmail.com';
    const result = await User.deleteMany({ 
      $or: [
        { email: fallbackEmail },
        { name: 'Google Authorized User' },
        { googleId: { $regex: /^google_fallback/ } }
      ]
    });

    console.log(`✓ Deleted ${result.deletedCount} fallback user(s)`);

    // List remaining Google users
    const googleUsers = await User.find({ googleId: { $exists: true } });
    console.log(`\nRemaining Google users: ${googleUsers.length}`);
    googleUsers.forEach(u => {
      console.log(`  - ${u.name} (${u.email})`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Done!');
    console.log('\nNext steps:');
    console.log('1. Clear your browser localStorage (F12 → Application → Local Storage → Clear)');
    console.log('2. Log out from the app');
    console.log('3. Log in again with Google OAuth');
    console.log('4. You should see your real name, email, and profile picture!\n');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearFallbackUser();
