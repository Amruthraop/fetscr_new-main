import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ Test connection
export async function initDB() {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL Connected");
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
    process.exit(1);
  }
}

// ----------------- User Queries -----------------
export const User = {
  async findOneByEmail(email) {
    const res = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
    return res.rows[0];
  },

  async findById(id) {
    const res = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    return res.rows[0];
  },

  async updateProfile(id, { name, email, number, password }) {
    const res = await pool.query(
      `UPDATE users 
       SET name=$2, email=$3, number=$4, password=$5 
       WHERE id=$1 RETURNING *`,
      [id, name, email, number, password]
    );
    return res.rows[0];
  },

  // --- Create user: allow OTP fields for signup/initiate ---
  async create({ name, email, password, number, picture, provider, plan_type, allowed_queries, results_per_query, otp, otp_expires, is_verified }) {
    const res = await pool.query(
      `INSERT INTO users 
        (name, email, number, password, picture, provider, plan_type, allowed_queries, results_per_query, queries_used, otp, otp_expires, is_verified) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12)
       RETURNING *`,
      [name, email, number, password, picture, provider, plan_type, allowed_queries, results_per_query, otp, otp_expires, is_verified]
    );
    return res.rows[0];
  },

  // --- OTP verification helpers ---
  async updateOTP(email, otp, otp_expires, password, name, number) {
    // For unverified user: update OTP, expiry and optionally update password/name/number
    await pool.query(
      `UPDATE users 
        SET otp = $1, otp_expires = $2, password = $3, name = $4, number = $5
       WHERE email = $6 AND is_verified = FALSE`,
      [otp, otp_expires, password, name, number, email]
    );
  },

  async verifyEmail(email) {
    // Mark user as verified and clear OTP fields
    await pool.query(
      `UPDATE users 
        SET is_verified = TRUE, otp = NULL, otp_expires = NULL 
       WHERE email = $1`,
      [email]
    );
  },

  async updatePlan(id, { plan_type, allowed_queries, results_per_query }) {
    await pool.query(
      `UPDATE users SET plan_type=$2, allowed_queries=$3, results_per_query=$4, queries_used=0 WHERE id=$1`,
      [id, plan_type, allowed_queries, results_per_query]
    );
  },

  async updatePassword(email, hashedPassword) {
    await pool.query(`UPDATE users SET password=$2 WHERE email=$1`, [email, hashedPassword]);
  },

  async incrementQueriesUsed(id) {
    await pool.query(`UPDATE users SET queries_used = queries_used + 1 WHERE id=$1`, [id]);
  },

  async resetQueries(id) {
    await pool.query(`UPDATE users SET queries_used = 0 WHERE id=$1`, [id]);
  },
};

// ----------------- Payments -----------------
export const Payment = {
  async create({ user_id, plan, amount, platform, upiId, queries, results_per_query, card_number, cvv }) {
    const res = await pool.query(
      `INSERT INTO payments 
      (user_id, plan, amount, platform, upiId, queries, results_per_query, card_number, cvv) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [user_id, plan, amount, platform, upiId, queries, results_per_query, card_number, cvv]
    );
    return res.rows[0];
  },
};

// ----------------- Credit Card Payments -----------------
export const CreditCardPayment = {
  async create({ payment_id, card_number, expiry, cvv }) {
    const query = `
      INSERT INTO credit_card_payments (payment_id, card_number, expiry, cvv)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [payment_id, card_number, expiry, cvv];
    const result = await pool.query(query, values);
    return result.rows[0];
  },
};

// ----------------- Scraped Queries -----------------
export const ScrapedQuery = {
  async create({ user_id, query, result_count }) {
    await pool.query(
      `INSERT INTO scraped_queries (user_id, query, result_count) VALUES ($1,$2,$3)`,
      [user_id, query, result_count]
    );
  },

  async findByUser(user_id) {
    const res = await pool.query(
      `SELECT * FROM scraped_queries WHERE user_id=$1 ORDER BY timestamp DESC`,
      [user_id]
    );
    return res.rows;
  },
};

export default pool;
