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
import { initDB, User, Payment, CreditCardPayment, ScrapedQuery } from "./database.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.CX;
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

// Helper: Compose web search query
const buildFullQuery = (query, keywords) =>
  `${(query || "").trim()} ${(keywords || "").trim()}`.trim();

// Google Custom Search API scraping helper
async function scrapeGoogle(fullQuery, startIndex = 1) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${CX}&q=${encodeURIComponent(fullQuery)}&start=${startIndex}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.items || !Array.isArray(data.items)) return [];

  let nextStartIndex = 1;
  if (data.queries?.nextPage?.[0]) nextStartIndex = data.queries.nextPage[0].startIndex;
  const hasMoreResults = nextStartIndex <= 100;

  return data.items.map((item) => ({
    title: item.title || "",
    snippet: item.snippet || "",
    link: item.link || "",
    image: item.pagemap?.cse_thumbnail?.[0]?.src || "",
    startIndex: nextStartIndex,
    hasMoreResults,
  }));
}

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`⚡ Master running. Forking ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on("exit", (worker) => {
    console.log(`⚠ Worker ${worker.process.pid} died. Restarting...`);
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

  // --- Google Social Login ---
  app.post("/social-login/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential)
        return res.status(400).json({ success: false, error: "No credential provided" });
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { email, name, picture } = payload;

      let user = await User.findOneByEmail(email);
      if (!user) {
        user = await User.create({
          name, email, password: null, picture, provider: "google",
          plan_type: "free", allowed_queries: 2, results_per_query: 5, is_verified: true,
        });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, picture: user.picture } });
    } catch (err) {
      console.error("Google login error:", err);
      res.status(500).json({ success: false, error: "Google login failed: " + (err.message || "Unknown error") });
    }
  });

  // --- OTP Signup, Verification ---
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
          allowed_queries: 2, results_per_query: 5, otp, otp_expires, is_verified: false
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

  // --- Local Login (requires verified email) ---
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOneByEmail(email);
      if (!user) return res.status(400).json({ success: false, error: "Invalid credentials" });
      if (!user.is_verified) return res.status(403).json({ success: false, error: "Verify your email to login" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ success: false, error: "Invalid credentials" });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Authenticate Middleware ---
  function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "No token provided" });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, error: "No token provided" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
  }

  // --- Get current user's active plan ---
  app.get("/getPlan", authenticate, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      res.json({
        success: true,
        plan: {
          plan_type: user.plan_type,
          allowed_queries: user.allowed_queries,
          queries_used: user.queries_used,
          queries_remaining: Math.max(0, user.allowed_queries - user.queries_used),
          results_per_query: user.results_per_query
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Payments & Plan ---
  app.post("/api/payments", authenticate, async (req, res) => {
    try {
      const { plan, amount, queries = 0, resultsPerQuery = 0, platform, upiId, card_number, cvv, expiry } = req.body;
      if (!plan || !amount || !platform) return res.status(400).json({ success: false, error: "Missing payment fields" });
      if (platform === "upi" && !upiId) return res.status(400).json({ success: false, error: "UPI ID required for UPI payments" });
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
      if (isNaN(cleanAmount)) return res.status(400).json({ success: false, error: "Invalid amount format" });

      // Save payment record
      const payment = await Payment.create({
        user_id: user.id,
        plan,
        amount: cleanAmount,
        platform,
        upiId: upiId || null,
        queries: Number(queries),
        results_per_query: Number(resultsPerQuery),
        card_number: card_number || null,
        cvv: cvv || null,
      });

      if (platform === "credit_card") {
        if (!card_number || !expiry || !cvv)
          return res.status(400).json({ success: false, error: "Card details required for credit card payments" });
        await CreditCardPayment.create({
          payment_id: payment.id,
          card_number,
          expiry,
          cvv,
        });
      }

      // Update user plan
      let allowed_queries = Number(queries) || 0;
      let results_per_query = Number(resultsPerQuery) || 0;
      if (plan === "free") {
        allowed_queries = 2;
        results_per_query = 5;
      } else if (plan.startsWith("sub")) {
        const subPlans = {
          sub1: { queries: 30, results: 20 },
          sub2: { queries: 30, results: 50 },
          sub3: { queries: 30, results: 25 },
          sub4: { queries: 20, results: 50 },
        };
        allowed_queries = subPlans[plan]?.queries || 0;
        results_per_query = subPlans[plan]?.results || 0;
      } else if (plan === "enterprise") {
        allowed_queries = Math.max(1, Math.min(10000, queries));
        results_per_query = Math.max(1, Math.min(100, resultsPerQuery));
      }

      await User.updatePlan(user.id, {
        plan_type: plan,
        allowed_queries,
        results_per_query,
        queries_used: 0,
      });

      res.json({
        success: true,
        message: "Payment recorded and plan activated",
        activePlan: {
          plan,
          amount: cleanAmount,
          remainingQueries: allowed_queries,
          resultsPerQuery: results_per_query,
          upiId: upiId || null,
        },
      });
    } catch (err) {
      console.error("payment error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // (rest of your code unchanged: /scrape, history, etc.)

  // Scraping, history, etc. go here...

  // --- Scraping Endpoint (smart, keywords or simple) ---
  app.post("/scrape", authenticate, async (req, res) => {
    try {
      let { query, keywords } = req.body;
      if (!query?.trim() && !keywords?.trim())
        return res.status(400).json({ success: false, error: "Missing query" });

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      if (user.queries_used >= user.allowed_queries)
        return res.status(403).json({ success: false, error: "Query limit reached. Please upgrade." });

      // If keywords are comma separated, do smart search
      if (keywords && keywords.includes(",")) {
        // Smart keyword mode
        const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);
        const resultsByKeyword = {};
        const pagesNeeded = Math.ceil(user.results_per_query / 10);
        const maxPages = Math.min(pagesNeeded, 5);
        for (const kw of keywordList) {
          const fullQuery = buildFullQuery(query, kw);
          let start = 1, allResults = [];
          for (let i = 0; i < maxPages; i++) {
            const pageResults = await scrapeGoogle(fullQuery, start);
            if (!pageResults.length) break;
            allResults.push(...pageResults);
            start = pageResults[pageResults.length - 1]?.startIndex || start + 10;
            if (!pageResults[0]?.hasMoreResults) break;
            if (allResults.length >= user.results_per_query) break;
          }
          resultsByKeyword[kw] = allResults.slice(0, user.results_per_query);
        }
        await ScrapedQuery.create({
          user_id: user.id,
          query: `${query} - ${keywords}`,
          result_count: Object.values(resultsByKeyword).flat().length
        });
        await User.incrementQueriesUsed(user.id);

        // Fetch latest active plan info after increment
        const updatedUser = await User.findById(user.id);
        const queries_remaining = Math.max(0, updatedUser.allowed_queries - updatedUser.queries_used);

        res.json({ 
          success: true, 
          results: resultsByKeyword, 
          queries_used: updatedUser.queries_used, 
          queries_remaining,
          plan_type: updatedUser.plan_type,
          allowed_queries: updatedUser.allowed_queries,
          results_per_query: updatedUser.results_per_query
        });
      } else {
        // Simple search
        const fullQuery = buildFullQuery(query, keywords);
        const pagesNeeded = Math.ceil(user.results_per_query / 10);
        const maxPages = Math.min(pagesNeeded, 10);
        let start = 1, results = [];
        for (let i = 0; i < maxPages; i++) {
          const pageResults = await scrapeGoogle(fullQuery, start);
          if (!pageResults.length) break;
          results.push(...pageResults);
          start = pageResults[pageResults.length - 1]?.startIndex || start + 10;
          if (!pageResults[0]?.hasMoreResults) break;
          if (results.length >= user.results_per_query) break;
        }
        const limited = results.slice(0, user.results_per_query);
        await ScrapedQuery.create({ user_id: user.id, query: fullQuery, result_count: limited.length });
        await User.incrementQueriesUsed(user.id);

        // Fetch latest active plan info after increment
        const updatedUser = await User.findById(user.id);
        const queries_remaining = Math.max(0, updatedUser.allowed_queries - updatedUser.queries_used);

        res.json({
          success: true,
          count: limited.length,
          results: limited,
          queries_used: updatedUser.queries_used,
          queries_remaining,
          plan_type: updatedUser.plan_type,
          allowed_queries: updatedUser.allowed_queries,
          results_per_query: updatedUser.results_per_query
        });
      }
    } catch (err) {
      console.error("scrape error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/my-scrapes", authenticate, async (req, res) => {
    try {
      const history = await ScrapedQuery.findByUser(req.user.id);
      res.json({ success: true, history });
    } catch (err) {
      console.error("my-scrapes error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
}
