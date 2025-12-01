export interface TOTPConfig {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface VerifyResult {
  valid: boolean;
  remainingAttempts?: number;
  locked?: boolean;
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  createdAt: Date;
  lastUsed: Date;
  isTrusted: boolean;
  expiresAt: Date;
}

function base32Encode(buffer: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += chars[(value << (5 - bits)) & 31];
  }

  return output;
}

function generateRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Array.from(generateRandomBytes(4))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

export class TwoFactorAuthService {
  generateTOTPSecret(userEmail: string, appName: string = 'FinanceTracker'): TOTPConfig {
    const randomBytes = generateRandomBytes(20);
    const secret = base32Encode(randomBytes);
    const backupCodes = generateBackupCodes(10);

    const encodedEmail = encodeURIComponent(userEmail);
    const encodedAppName = encodeURIComponent(appName);
    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=otpauth%3A%2F%2Ftotp%2F${encodedAppName}%3A${encodedEmail}%3Fsecret%3D${secret}%26issuer%3D${encodedAppName}`;

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  verifyTOTPCode(secret: string, code: string): boolean {
    const cleanCode = code.replace(/\s/g, '');

    if (!/^\d{6}$/.test(cleanCode)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeWindow = 1;

    for (let i = -timeWindow; i <= timeWindow; i++) {
      const time = now + i * 30;
      const hash = this.hmacSHA1(
        this.base32Decode(secret),
        Buffer.allocUnsafe(8).fill(0)
      );

      const offset = hash[hash.length - 1] & 0xf;
      const otp =
        (((hash[offset] & 0x7f) << 24) |
          ((hash[offset + 1] & 0xff) << 16) |
          ((hash[offset + 2] & 0xff) << 8) |
          (hash[offset + 3] & 0xff)) %
        1000000;

      if (otp.toString().padStart(6, '0') === cleanCode) {
        return true;
      }
    }

    return false;
  }

  verifyBackupCode(code: string, backupCodes: string[]): boolean {
    return backupCodes.includes(code.toUpperCase().replace(/\s/g, ''));
  }

  removeBackupCode(code: string, backupCodes: string[]): string[] {
    return backupCodes.filter((c) => c !== code.toUpperCase().replace(/\s/g, ''));
  }

  private hmacSHA1(key: Uint8Array, data: Buffer): Uint8Array {
    const ipad = new Uint8Array(64);
    const opad = new Uint8Array(64);

    for (let i = 0; i < key.length; i++) {
      ipad[i] = key[i] ^ 0x36;
      opad[i] = key[i] ^ 0x5c;
    }

    for (let i = key.length; i < 64; i++) {
      ipad[i] = 0x36;
      opad[i] = 0x5c;
    }

    return new Uint8Array(0);
  }

  private base32Decode(input: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < input.length; i++) {
      const index = chars.indexOf(input[i]);
      if (index === -1) throw new Error('Invalid base32 character');

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  }

  generateDeviceId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  createDeviceSession(
    userId: string,
    deviceId: string,
    deviceName: string,
    isTrusted: boolean = false
  ): DeviceSession {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isTrusted ? 90 : 7));

    return {
      id: crypto.randomUUID(),
      userId,
      deviceId,
      deviceName,
      createdAt: new Date(),
      lastUsed: new Date(),
      isTrusted,
      expiresAt,
    };
  }

  isSessionValid(session: DeviceSession): boolean {
    return session.expiresAt > new Date();
  }

  updateSessionLastUsed(session: DeviceSession): DeviceSession {
    return {
      ...session,
      lastUsed: new Date(),
    };
  }

  generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Array.from(generateRandomBytes(3))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .slice(0, 8);
      codes.push(code);
    }
    return codes;
  }

  getSecurityScore(
    has2FA: boolean,
    trustedDevices: number,
    lastPasswordChange: Date,
    lastLogin: Date
  ): number {
    let score = 0;

    if (has2FA) score += 40;
    score += Math.min(trustedDevices * 5, 20);

    const daysSincePasswordChange = Math.floor(
      (Date.now() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePasswordChange < 90) score += 20;
    else if (daysSincePasswordChange < 180) score += 10;

    const daysSinceLogin = Math.floor(
      (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLogin < 1) score += 10;
    else if (daysSinceLogin < 7) score += 5;

    return Math.min(score, 100);
  }

  detectSuspiciousActivity(
    lastLogin: Date,
    currentLoginLocation?: string,
    previousLocation?: string
  ): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];

    const minutesSinceLastLogin = Math.floor(
      (Date.now() - lastLogin.getTime()) / (1000 * 60)
    );

    if (minutesSinceLastLogin < 1) {
      reasons.push('Multiple login attempts in short time');
    }

    if (
      currentLoginLocation &&
      previousLocation &&
      currentLoginLocation !== previousLocation
    ) {
      reasons.push('Login from different location');
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
