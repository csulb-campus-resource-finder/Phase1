import { db } from './db';

async function runDatabaseTest() {
  const client = await db.connect();
  try {
    console.log("=== Starting Database Test ===");

    // 1. Optional: Ensure a test table exists for demonstration purposes
    await client.query(`
      CREATE TABLE IF NOT EXISTS db_test_logs (
        id SERIAL PRIMARY KEY,
        message VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Perform an INSERT test
    const testMessage = `Test Run at ${new Date().toISOString()}`;
    const insertQuery = `INSERT INTO db_test_logs (message) VALUES ($1) RETURNING *;`;
    const insertResult = await client.query(insertQuery, [testMessage]);
    
    console.log("[SUCCESS] Inserted Record:");
    console.log(insertResult.rows[0]);

    // 3. Perform a SELECT query to retrieve records back
    const selectQuery = `SELECT * FROM db_test_logs ORDER BY id DESC LIMIT 5;`;
    const selectResult = await client.query(selectQuery);

    console.log("\n[SUCCESS] Retrieved Records (SELECT):");
    console.table(selectResult.rows);

  } catch (error) {
    console.error("[ERROR] Database test failed:", error);
  } finally {
    // Release client back to pool and end pool connection
    client.release();
    await db.end();
    console.log("=== Database Test Complete ===");
  }
}

runDatabaseTest();