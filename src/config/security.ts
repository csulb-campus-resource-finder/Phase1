// Imports the dotenv library to load environment variables from a .env file.
import dotenv from 'dotenv';
// Executes config() to read variables from .env and attach them to process.env.
dotenv.config();

// Exports the JWT secret key from environment variables, or uses a secure fallback string for development.
export const JWT_SECRET = process.env.JWT_SECRET || 'csulb_campus_resource_finder_secure_jwt_secret_2026';
// Exports the MFA encryption key from environment variables, or uses a default fallback key string.
export const MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'csulb_mfa_encryption_key_32_bytes_long';

// Checks if the JWT_SECRET environment variable is missing from the system environment.
if (!process.env.JWT_SECRET) {
  // Logs a warning message to the server console indicating that a default fallback secret is being used.
  console.warn('⚠️ Warning: JWT_SECRET not found in environment variables. Using default fallback.');
}