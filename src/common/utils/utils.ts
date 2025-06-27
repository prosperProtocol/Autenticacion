import * as crypto from 'crypto';
import * as hyperid from 'hyperid';

export async function createSignature(
  data: unknown,
  secret: any,
): Promise<string> {
  const timestamp = Math.floor(new Date().getTime() / 1000);

  const dataToSign = `${timestamp}.${JSON.stringify(data)}`;
  const hmac = await crypto.createHmac('sha256', secret);
  const signature = hmac.update(dataToSign).digest('hex');
  const signatureHeader = `t=${timestamp},s=${signature}`;

  return signatureHeader;
}

export function randomOtpGenerator() {
  return Math.floor(Math.random() * 10000000)
    .toString()
    .slice(0, 4)
    .padStart(4, '0');
}

export function uuid() {
  const generator = hyperid({ fixedLength: true, urlSafe: true });
  return generator.uuid;
}

export function memoGeneratorString(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateMemo(): string {
  const secondsInYear = 365.25 * 24 * 60 * 60;
  const offsetInSeconds = Math.floor(25.5 * secondsInYear);
  const pastTimestamp = Math.floor(Date.now() / 1000) - offsetInSeconds;
  const prefix = Math.floor(Math.random() * 10);
  const suffix = Math.floor(Math.random() * 10);
  return `${prefix}${pastTimestamp}${suffix}`;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}