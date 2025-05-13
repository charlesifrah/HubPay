import { db } from './db';
import { users } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedUsers() {
  console.log('Seeding database with initial users...');
  
  // Check if users already exist
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log('Users already exist in the database, skipping seed.');
    return;
  }

  // Create admin user
  const adminPassword = await hashPassword("password");
  await db.insert(users).values({
    email: "admin@example.com",
    password: adminPassword,
    name: "Admin User",
    role: "admin"
  });
  console.log('Created admin user: admin@example.com');

  // Create AE user
  const aePassword = await hashPassword("password");
  await db.insert(users).values({
    email: "ae@example.com",
    password: aePassword,
    name: "Sarah Johnson",
    role: "ae"
  });
  console.log('Created AE user: ae@example.com');

  console.log('Database seeding completed successfully.');
}

// Run the seeding function
seedUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });