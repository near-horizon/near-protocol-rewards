import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';
import { formatError } from '../utils/format-error';

interface EncryptionConfig {
  logger: Logger;
  secretKey: string;
}

export class Encryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly logger: Logger;
  private readonly key: Buffer;
  private readonly keyRotationInterval = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(config: EncryptionConfig) {
    this.logger = config.logger;
    this.key = crypto.scryptSync(config.secretKey, 'salt', 32);
  }

  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        iv: iv.toString('hex'),
        data: encrypted,
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      this.logger.error('Encryption failed', {
        error: formatError(error),
        context: { operation: 'encrypt' }
      });
      throw new BaseError(
        'Encryption failed',
        ErrorCode.ENCRYPTION_ERROR,
        { error: formatError(error) }
      );
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const { iv, data, authTag } = JSON.parse(encryptedData);
      
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', {
        error: formatError(error),
        context: { operation: 'decrypt' }
      });
      throw new BaseError(
        'Decryption failed',
        ErrorCode.DECRYPTION_ERROR,
        { error: formatError(error) }
      );
    }
  }

  // Key rotation is not implemented in MVP
  private async rotateKey(): Promise<void> {
    // TODO: Implement key rotation in future version
    throw new Error('Key rotation not implemented');
  }
}
