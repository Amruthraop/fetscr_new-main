// backend.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import cluster from "cluster";
import os from "os";
import { initDB, User, Payment, ScrapedQuery } from "./database.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.CX;
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ----------------- CLUSTER MODE -----------------
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`⚡ Master running. Forking ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`⚠️ Worker ${worker.process.pid} died. Restarting...`);
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

  // ✅ Initialize DB
  initDB();

  // Root
  app.get("/", (req, res) => {
    res.json({ success: true, message: "FETSCR backend is running (PostgreSQL)" });
  });

  // ----------------- Google Login -----------------
  app.post("/social-login/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) return res.status(400).json({ success: false, error: "No credential provided" });

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
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

      const plan = {
        plan_type: user.plan_type,
        allowed_queries: user.allowed_queries,
        results_per_query: user.results_per_query,
        queries_used: user.queries_used,
      };
      plan.queries_remaining = Math.max(0, plan.allowed_queries - plan.queries_used);

      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, picture: user.picture }, plan });
    } catch (err) {
      console.error("Google login error:", err);
      res.status(500).json({ success: false, error: "Google login failed" });
    }
  });

  // ----------------- Signup -----------------
  app.post("/signup", async (req, res) => {
    try {
      const { name, email, password, number } = req.body;
      if (!name || !email || !password || !number) return res.status(400).json({ success: false, error: "Missing fields" });

      const existing = await User.findOneByEmail(email);
      if (existing) return res.status(400).json({ success: false, error: "Email already registered" });

      const hashed = await bcrypt.hash(password, 10);
      await User.create({ name, email,number,  password: hashed, provider: "local", plan_type: "free", allowed_queries: 2, results_per_query: 5 });

      res.json({ success: true, message: "User registered" });
    } catch (err) {
      console.error("signup error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------- Login -----------------
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOneByEmail(email);
      if (!user) return res.status(400).json({ success: false, error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ success: false, error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

      const plan = {
        plan_type: user.plan_type,
        allowed_queries: user.allowed_queries,
        results_per_query: user.results_per_query,
        queries_used: user.queries_used,
      };
      plan.queries_remaining = Math.max(0, plan.allowed_queries - plan.queries_used);

      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email }, plan });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------- Reset Password -----------------
  app.post("/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) return res.status(400).json({ success: false, error: "Missing fields" });

      const user = await User.findOneByEmail(email);
      if (!user) return res.status(400).json({ success: false, error: "No user found with that email" });

      const hashed = await bcrypt.hash(newPassword, 10);
      await User.updatePassword(email, hashed);

      res.json({ success: true, message: "Password updated" });
    } catch (err) {
      console.error("reset password error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------- Middleware -----------------
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

  // ----------------- Update Profile -----------------
app.post("/update-profile", authenticate, async (req, res) => {
  try {
    const { name, email,number,  newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    let hashedPassword = null;
    if (newPassword && newPassword.trim().length > 0) {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await User.updateProfile(req.user.id, {
      name: name || user.name,
      email: email || user.email,
      number: number || user.number,   // <-- update phone number
      password: hashedPassword || user.password,
    });

    res.json({
      success: true,
      message: "Profile updated",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        number: updatedUser.number,    // <-- return number
      },
    });
  } catch (err) {
    console.error("update-profile error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

  // ----------------- Payments -----------------
app.post("/api/payments", authenticate, async (req, res) => {
  try {
    const { plan, amount, queries = 0, resultsPerQuery = 0, platform, upiId } = req.body;

    // Validate required fields
    if (!plan || !amount || !platform) {
      return res.status(400).json({ success: false, error: "Missing payment fields" });
    }

    // Require UPI ID only for UPI payments
    if (platform === "upi" && !upiId) {
      return res.status(400).json({ success: false, error: "UPI ID required for UPI payments" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
    if (isNaN(cleanAmount)) return res.status(400).json({ success: false, error: "Invalid amount format" });

    // Save payment record and get inserted payment
const payment = await Payment.create({
  user_id: user.id,
  plan,
  amount: cleanAmount,
  platform,
  upiId: upiId || null,
  queries: Number(queries),
  results_per_query: Number(resultsPerQuery),
  card_number: req.body.card_number || null,
  cvv: req.body.cvv || null,
});

// If platform is credit card, save card info
if (platform === "credit_card") {
  const { card_number, expiry, cvv } = req.body;

  if (!card_number || !expiry || !cvv) {
    return res.status(400).json({ success: false, error: "Card details required for credit card payments" });
  }

  await CreditCardPayment.create({
    payment_id: payment.id, // link to payments table
    card_number,
    expiry,
    cvv,
  });
}

    // Update user plan in DB
    let allowed_queries = Number(queries) || 0;
    let results_per_query = Number(resultsPerQuery) || 0;

    if (plan === "free") {
      allowed_queries = 2;
      results_per_query = 5;
    } else if (plan.startsWith("sub")) {
      // Hardcoded sub plans (sub1, sub2, sub3, sub4)
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

    // Return active plan info
    const activePlan = {
      plan,
      amount: cleanAmount,
      remainingQueries: allowed_queries,
      resultsPerQuery: results_per_query,
      upiId: upiId || null,
    };

    res.json({
      success: true,
      message: "Payment recorded and plan activated",
      activePlan,
    });
  } catch (err) {
    console.error("payment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


  // ----------------- Set Plan -----------------
app.post("/setPlan", authenticate, async (req, res) => {
  try {
    const { plan, queries, results, resultsPerQuery } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    let plan_type = "free",
      allowed_queries = 2,
      results_per_query = 5,
      priceUSD = 0;

    if (plan === "free") {
      plan_type = "free"; 
      allowed_queries = 2; 
      results_per_query = 5;
    } else if (plan === "sub1") {
      plan_type = "sub1"; 
      allowed_queries = 30; 
      results_per_query = 20; 
      priceUSD = 21.18;
    } else if (plan === "sub2") {
      plan_type = "sub2"; 
      allowed_queries = 30; 
      results_per_query = 50; 
      priceUSD = 52.94;
    } else if (plan === "sub3") {
      plan_type = "sub3"; 
      allowed_queries = 30; 
      results_per_query = 25; 
      priceUSD = 26.47;
    } else if (plan === "sub4") {
      plan_type = "sub4"; 
      allowed_queries = 20; 
      results_per_query = 50; 
      priceUSD = 35.29;
    } else if (plan === "enterprise") {
      const q = Number(queries) || 1000;   // default 1000 queries
      const r = Number(results ?? resultsPerQuery) || 100; // default 100 results
      allowed_queries = Math.max(1, Math.min(10000, q));
      results_per_query = Math.max(1, Math.min(100, r));
      plan_type = "enterprise";
      priceUSD = ((allowed_queries * results_per_query) * 0.04).toFixed(2);
    } else {
      return res.status(400).json({ success: false, error: "Unknown plan" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      plan_type,
      allowed_queries,
      results_per_query,
      queries_used: 0,
    });

    res.json({
      success: true,
      plan: plan_type,
      allowed_queries,
      results_per_query,
      priceUSD,
      message: "Plan updated",
    });
  } catch (err) {
    console.error("setPlan error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

  // ----------------- Get Plan -----------------
  app.get("/getPlan", authenticate, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });

      const plan = {
        plan_type: user.plan_type,
        allowed_queries: user.allowed_queries,
        results_per_query: user.results_per_query,
        queries_used: user.queries_used,
      };
      plan.queries_remaining = Math.max(0, plan.allowed_queries - plan.queries_used);

      res.json({ success: true, plan });
    } catch (err) {
      console.error("getPlan error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------- Scrape -----------------
  async function scrapeGoogle(query, startIndex = 1) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}&start=${startIndex}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google API error ${res.status}`);
    const data = await res.json();
    if (!data.items?.length) return [];

    let nextStartIndex = 1;
    if (data.queries?.nextPage?.[0]) nextStartIndex = data.queries.nextPage[0].startIndex;
    const hasMoreResults = nextStartIndex <= 100;

    return data.items.map((item) => ({
      name: (item.title || "").split(" - ")[0] || null,
      title: (item.title || "").split(" - ").slice(1).join(" - ") || null,
      link: item.link || null,
      snippet: item.snippet || null,
      image: item.pagemap?.cse_thumbnail?.[0]?.src || null,
      startIndex: nextStartIndex,
      hasMoreResults,
    }));
  }


  //scraping 
  app.post("/scrape", authenticate, async (req, res) => {
  try {
    let { query, keywords } = req.body;
    if (!query?.trim() && !keywords?.trim()) 
      return res.status(400).json({ success: false, error: "Missing query" });

    // Combine website and keywords into a single query string
    const fullQuery = `${query || ""} ${keywords || ""}`.trim();

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (user.queries_used >= user.allowed_queries)
      return res.status(403).json({ success: false, error: "Query limit reached. Please upgrade." });

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

    const queries_remaining = Math.max(0, user.allowed_queries - (user.queries_used + 1));

    res.json({ 
      success: true, 
      count: limited.length, 
      results: limited, 
      queries_used: user.queries_used + 1, 
      queries_remaining, 
      results_per_query: user.results_per_query 
    });
  } catch (err) {
    console.error("scrape error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


  // ----------------- History -----------------
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
