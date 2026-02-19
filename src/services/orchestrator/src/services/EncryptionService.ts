import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

// Legacy salt kept for backwards-compatibility with existing encrypted data.
// New encryptions also use this salt since changing it would break all stored ciphertext.
const KEY_SALT = 'salt';

export class EncryptionService {
  private key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    
    if (!secret) {
      throw new Error('ENCRYPTION_KEY environment variable is required but not set');
    }
    
    if (secret.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
    
    this.key = crypto.scryptSync(secret, KEY_SALT, KEY_LENGTH);
  }

  encrypt(text: string): string {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }
      
      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt password');
    }
  }

  isEncrypted(text: string): boolean {
    if (!text) return false;
    const parts = text.split(':');
    return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
  }
}

// Lazy singleton — only instantiated when first used (avoids crash during CDK builds)
let _instance: EncryptionService | null = null;
export const encryptionService = new Proxy({} as EncryptionService, {
  get(_target, prop) {
    if (!_instance) _instance = new EncryptionService();
    return (_instance as any)[prop];
  }
});
