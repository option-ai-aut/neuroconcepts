import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class EncryptionService {
  private key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-32chars!!';
    
    if (secret.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
    
    // Derive key from secret
    this.key = crypto.scryptSync(secret, 'salt', KEY_LENGTH);
  }

  /**
   * Encrypt a string (e.g., FTP password)
   */
  encrypt(text: string): string {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a string
   */
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

  /**
   * Check if a string is encrypted (has our format)
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;
    const parts = text.split(':');
    return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
