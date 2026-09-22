import * as crypto from 'crypto';
import type { PasswordHasherPort } from '../domain/password-hasher-port.js';

export class Pbkdf2PasswordHasher implements PasswordHasherPort {
  // OWASP recommended iterations for PBKDF2
  private readonly ITERATIONS = 210000;
  private readonly KEY_LENGTH = 64;
  private readonly DIGEST = 'sha512';

  async hash(password: string): Promise<{ hash: string; salt: string }> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');

      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) return reject(err);
          resolve({
            hash: derivedKey.toString('hex'),
            salt: salt,
          });
        },
      );
    });
  }

  async verify(password: string, hash: string, salt: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) return reject(err);
          resolve(derivedKey.toString('hex') === hash);
        },
      );
    });
  }
}
