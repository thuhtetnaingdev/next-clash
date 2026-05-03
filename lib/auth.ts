import bcrypt from 'bcryptjs';
import { db } from './db/client';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getOrCreateUser(username: string, password: string) {
  // Verify against env credentials
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return null;
  }

  // Check if user exists in database
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create new user if doesn't exist
  const hashedPassword = await hashPassword(password);
  const newUser = await db
    .insert(users)
    .values({
      username,
      password: hashedPassword,
    })
    .returning();

  return newUser[0] || null;
}

export async function authenticateUser(username: string, password: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user.length) {
    return null;
  }

  const isValid = await verifyPassword(password, user[0].password);
  if (!isValid) {
    return null;
  }

  return user[0];
}
