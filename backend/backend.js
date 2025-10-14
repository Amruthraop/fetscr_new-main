import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import cluster from "cluster";
import os from "os";
import nodemailer from "nodemailer";
import { initDB, User, Payment, ScrapedQuery } from "./database.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Email OTP setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Master running. Forking ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    next();
  });

  initDB();

  app.get("/", (req, res) => {
    res.json({ success: true, message: "FETSCR backend is running (PostgreSQL)" });
  });

  // --- Google Login (MUST always return JSON) ---
  app.post("/social-login/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: "No credential provided" });
      }

      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name, picture } = payload;

      let user = await User.findOneByEmail(email);
      if (!user) {
        user = await User.create({
          name,
          email,
          password: null,
          picture,
          provider: "google",
          plan_type: "free",
          allowed_queries: 2,
          results_per_query: 5,
          is_verified: true // Google signup is always verified
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, picture: user.picture }
      });
    } catch (err) {
      // Always return JSON, never HTML
      console.error("Google login error:", err);
      res
        .status(500)
        .json({ success: false, error: "Google login failed: " + (err.message || "Unknown error") });
    }
  });

  // --- Signup INITIATE: send OTP ---
  app.post("/signup/initiate", async (req, res) => {
    try {
      const { name, email, password, number } = req.body;
      if (!name || !email || !password || !number)
        return res.status(400).json({ success: false, error: "Missing fields" });

      const existing = await User.findOneByEmail(email);
      if (existing && existing.is_verified)
        return res.status(400).json({ success: false, error: "Email already registered" });

      const hashed = await bcrypt.hash(password, 10);
      const otp = generateOTP();
      const otp_expires = new Date(Date.now() + 10 * 60 * 1000);

      if (existing) {
        await User.updateOTP(email, otp, otp_expires, hashed, name, number);
      } else {
        await User.create({
          name, email, number, password: hashed, provider: "local", plan_type: "free",
          allowed_queries: 2, results_per_query: 5, otp, otp_expires, is_verified: false,
        });
      }

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Fetscr OTP Code",
        text: `Your OTP code: ${otp} (valid for 10 minutes)`
      });

      res.json({ success: true, message: "OTP sent to email" });
    } catch (err) {
      console.error("signup/initiate error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Signup VERIFY-OTP ---
  app.post("/signup/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp)
        return res.status(400).json({ success: false, error: "Missing fields" });

      const user = await User.findOneByEmail(email);
      if (!user) return res.status(400).json({ success: false, error: "Email not found" });
      if (user.is_verified) return res.status(400).json({ success: false, error: "Already verified" });
      if (user.otp !== otp) return res.status(400).json({ success: false, error: "Invalid OTP" });
      if (new Date() > user.otp_expires) return res.status(400).json({ success: false, error: "OTP expired" });

      await User.verifyEmail(email);

      res.json({ success: true, message: "Email verified. Signup complete!" });
    } catch (err) {
      console.error("signup/verify-otp error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- LOGIN: Require verified email for local ---
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOneByEmail(email);
      if (!user) return res.status(400).json({ success: false, error: "Invalid credentials" });
      if (!user.is_verified) return res.status(403).json({ success: false, error: "Verify your email to login" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ success: false, error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

      // ...plan info calculation omitted for brevity...
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ...all your other endpoints (scraping, payments, etc) remain unchanged...

  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

// --- In your User class (database.js), add these methods if missing: ---
/*
static async updateOTP(email, otp, otp_expires, password, name, number) {
  return pool.query(
    `UPDATE users SET otp=$1, otp_expires=$2, password=$3, name=$4, number=$5 WHERE email=$6 AND is_verified=FALSE`,
    [otp, otp_expires, password, name, number, email]
  );
}
static async verifyEmail(email) {
  return pool.query(
    `UPDATE users SET is_verified=TRUE, otp=NULL, otp_expires=NULL WHERE email=$1`,
    [email]
  );
}
*/
