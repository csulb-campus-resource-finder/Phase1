import crypto from 'crypto';

interface OtpRecord {
  email: string;
  codeHash: Buffer;
  expiresAt: number;
  attempts: number;
}

export class AuthService {
  // Temporary in-memory store for active OTPs (use Redis or database in production)
  private otpStore: Map<string, OtpRecord> = new Map();

  // Mock user database check (replace with real DB lookup)
  public validateCredentials(email: string, pass: string): boolean {
    return Boolean(email && email.includes('@') && pass && pass.length >= 6);
  }

  public generateAndStoreOtp(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();
    // Generate a secure 6-digit code
    const otp = crypto.randomInt(100000, 1000000).toString();
    
    // Hash the OTP and store as a Buffer for secure timing-safe comparison
    const codeHash = crypto.createHash('sha256').update(otp).digest();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    this.otpStore.set(normalizedEmail, {
      email: normalizedEmail,
      codeHash,
      expiresAt,
      attempts: 0
    });

    return otp; // Return raw OTP *only* to be dispatched via email
  }

  public verifyOtp(email: string, candidateOtp: string): { success: boolean; message: string } {
    if (!email || !candidateOtp) {
      return { success: false, message: 'Email and verification code are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = this.otpStore.get(normalizedEmail);

    if (!record) {
      return { success: false, message: 'No active verification code found. Please log in again.' };
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }

    if (record.attempts >= 5) {
      this.otpStore.delete(normalizedEmail);
      return { success: false, message: 'Too many failed attempts. Please restart login.' };
    }

    // Sanitize user input (trim whitespace) and hash
    const sanitizedCandidate = String(candidateOtp).trim();
    const candidateHash = crypto.createHash('sha256').update(sanitizedCandidate).digest();

    // Constant-time buffer comparison to prevent timing attacks
    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(candidateHash, record.codeHash);
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      record.attempts += 1;
      const remainingAttempts = 5 - record.attempts;
      return { success: false, message: `Invalid code. ${remainingAttempts} attempts remaining.` };
    }

    // Success: clean up OTP record so it can only be used once
    this.otpStore.delete(normalizedEmail);
    return { success: true, message: '2FA verification successful!' };
  }
}