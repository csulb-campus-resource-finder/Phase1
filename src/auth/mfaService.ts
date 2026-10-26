// Imports TOTP secret generation, URI builder, and verification functions from the 'otplib' library.
import { generateSecret, generateURI, verify } from 'otplib';
// Imports the qrcode library to convert otpauth URIs into renderable image data URLs.
import QRCode from 'qrcode';

// Defines a constant issuer name displayed inside authenticator apps (e.g., Google Authenticator).
const ISSUER = 'CSULB Campus Resource Finder';

// Declares and exports a utility class containing static methods for MFA operations.
export class MFAService {
  // Static method to generate a new random cryptographic MFA secret string.
  static generateSecret(): string {
    // Calls and returns the result of otplib's built-in secret generator.
    return generateSecret();
  }

  // Static asynchronous method to create a QR code data URL for client-side display.
  static async createQRCode(email: string, secret: string): Promise<string> {
    // Generates an otpauth:// URI bundling the issuer name, user email label, and secret key.
    const uri = generateURI({ issuer: ISSUER, label: email, secret });
    // Converts the otpauth URI into a base64 image data URL string and returns it.
    return QRCode.toDataURL(uri);
  }

  // Static asynchronous method to verify a 6-digit TOTP code against a user's secret.
  static async verifyCode(secret: string, code: string): Promise<boolean> {
    // Checks using a regular expression whether the code string consists of exactly 6 numeric digits.
    if (!/^\d{6}$/.test(code)) {
      // Returns false immediately if the code format is invalid.
      return false;
    }
    // Verifies the code token against the secret using otplib and returns the boolean validity status.
    return (await verify({ token: code, secret })).valid;
  }
}