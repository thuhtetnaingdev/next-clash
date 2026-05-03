import { jwtVerify, SignJWT } from 'jose';

const getSecret = () => {
  const secretString = process.env.JWT_SECRET || 'your-secret-key-change-in-env';
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(secretString);
  }
  return Buffer.from(secretString);
};

const secret = getSecret();

export async function createToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as { userId: number };
  } catch (err) {
    return null;
  }
}
