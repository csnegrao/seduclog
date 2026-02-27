import bcrypt from 'bcrypt';
import { User } from '../types';

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

// In-memory user store — replace with a real database in production.
// Passwords are hashed synchronously at startup so the store is ready immediately.
const SEED_SALT_ROUNDS = 10;

const users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@seduclog.com',
    passwordHash: bcrypt.hashSync('admin123', SEED_SALT_ROUNDS),
    role: 'admin',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Manager User',
    email: 'manager@seduclog.com',
    passwordHash: bcrypt.hashSync('manager123', SEED_SALT_ROUNDS),
    role: 'manager',
    createdAt: new Date(),
  },
  {
    id: '3',
    name: 'Driver User',
    email: 'driver@seduclog.com',
    passwordHash: bcrypt.hashSync('driver123', SEED_SALT_ROUNDS),
    role: 'driver',
    createdAt: new Date(),
  },
];

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}
