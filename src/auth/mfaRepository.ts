// Imports the Pool class from the 'pg' (node-postgres) library to manage database connections.
import { Pool } from 'pg';

// Configures and initializes a new PostgreSQL connection pool.
const pool = new Pool({
  // Uses the DATABASE_URL environment variable, or falls back to a default local platform connection string.
  connectionString: process.env.DATABASE_URL || 'postgresql://csulb_admin:12162004Hm_runs20@localhost:5432/csulb_platform',
});

// Defines a TypeScript interface representing the structure of a user record in the database.
export interface UserRecord {
  id: string;               // Unique user ID
  email: string;            // User's email address
  name: string;             // User's full name
  role: 'student' | 'faculty' | 'staff'; // User role restriction type
  mfaEnabled: boolean;      // Flag indicating if MFA is active for the user
  mfaSecret: string | null; // The active MFA secret key used for verification
  pendingSecret: string | null; // Temporary MFA secret awaiting verification/activation
}

// Defines a repository class containing static helper methods for MFA database queries.
export class MFARepository {
  // Retrieves a user record from the database searching by either ID or email.
  static async getUser(emailOrId: string): Promise<UserRecord | null> {
    // Defines the SQL query mapping snake_case database columns to camelCase TypeScript properties.
    const query = `
      SELECT id, email, name, role, mfa_enabled as "mfaEnabled", mfa_secret as "mfaSecret", pending_secret as "pendingSecret"
      FROM users WHERE id = $1 OR email = $1
    `;
    // Executes the query passing the identifier parameter.
    const result = await pool.query(query, [emailOrId]);
    // If no matching user rows are found, return null.
    if (result.rows.length === 0) return null;
    // Returns the first matched user record.
    return result.rows[0];
  }

  // Saves a temporary (pending) MFA secret for a user before they verify and enable it.
  static async savePendingSecret(userIdOrEmail: string, secret: string): Promise<void> {
    await pool.query(
      `UPDATE users SET pending_secret = $1 WHERE id = $2 OR email = $2`,
      [secret, userIdOrEmail]
    );
  }

  // Finalizes MFA setup by moving the pending secret to the active secret, clearing the pending field, and enabling MFA.
  static async enableMFA(userIdOrEmail: string): Promise<void> {
    await pool.query(
      `UPDATE users SET mfa_secret = pending_secret, pending_secret = NULL, mfa_enabled = TRUE WHERE id = $1 OR email = $1`,
      [userIdOrEmail]
    );
  }

  // Prevents replay attacks by ensuring a unique challenge token identifier (jti) can only be consumed once.
  static async consumeChallenge(jti: string): Promise<boolean> {
    // Attempts to insert the jti; if it already exists, 'ON CONFLICT DO NOTHING' prevents duplicates.
    const res = await pool.query(
      `INSERT INTO mfa_challenges (jti, consumed_at) VALUES ($1, NOW()) ON CONFLICT (jti) DO NOTHING RETURNING jti`,
      [jti]
    );
    // Returns true if a row was successfully inserted (meaning the token was fresh and is now consumed).
    return res.rowCount !== null && res.rowCount > 0;
  }
}