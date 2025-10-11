import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./plans.css";

const SERVER = "http://localhost:5000";

const SubscriptionPlans = () => {
  const [customQueries, setCustomQueries] = useState(1);
  const [customResults, setCustomResults] = useState(5);
  const [customPrice, setCustomPrice] = useState("$0");
  const navigate = useNavigate();

  useEffect(() => {
    const totalResults = customQueries * customResults;
    const priceINR = totalResults * 3;
    const priceUSD = (priceINR / 83).toFixed(2);
    setCustomPrice(`$${priceUSD}`);
  }, [customQueries, customResults]);

  function saveActivePlan(planData) {
    const activePlanInfo = {
      plan: planData.plan,
      price: planData.price,
      queries_remaining: planData.queries_remaining ?? null,
      allowed_queries: planData.allowed_queries ?? null,
      queries_used: planData.queries_used ?? 0,
      results_per_query: planData.results_per_query ?? planData.results,
    };
    localStorage.setItem("activePlan", JSON.stringify(activePlanInfo));
  }

  function goToPayment(plan, queries, results, price, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    let queries_remaining = 0;
    let allowed_queries = 0;
    let results_per_query = 0;

    switch (plan) {
      case "free":
        queries_remaining = 2;
        allowed_queries = 2;
        results_per_query = 5;
        break;
      case "enterprise":
        queries_remaining = queries;
        allowed_queries = queries;
        results_per_query = results;
        break;
      case "sub1":
        queries_remaining = 30;
        allowed_queries = 30;
        results_per_query = 20;
        break;
      default:
        queries_remaining = queries;
        allowed_queries = queries;
        results_per_query = results;
    }

    const usageData = {
      plan,
      price,
      queries_remaining,
      allowed_queries,
      queries_used: 0,
      results_per_query,
    };

    saveActivePlan(usageData);

    if (plan === "free") {
      alert("✅ Free Plan selected successfully!");
      navigate("/home");
      return;
    }

    navigate("/payment", {
      state: { plan, queries, results, amount: price },
    });
  }

  function goToCustomPayment() {
    if (!customQueries || !customResults || customResults > 100) {
      alert("⚠ Please enter valid values (Max results = 100).");
      return;
    }
    goToPayment("enterprise", customQueries, customResults, customPrice);
  }

  return (
    <div className="subscription-container" id="pricing">
      <h1>Choose Your Subscription Plan</h1>

      <div className="plans">
        {/* Free Plan */}
        <div className="plan">
          <h2>Base (Free)</h2>
          <p className="price">Free</p>
          <p>✔ 2 Queries</p>
          <p>✔ 5 Results per Query</p>
          <button onClick={(e) => goToPayment("free", 2, 5, "Free", e)}>
            Start Free
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="plan">
          <h2>Enterprise</h2>
          <p className="price" id="customPrice">{customPrice}</p>
          <label>Number of Queries</label>
          <input
            type="number"
            min="1"
            max="10000"
            value={customQueries}
            onChange={(e) => setCustomQueries(parseInt(e.target.value) || 0)}
          />
          <label>Results per Query (max 100)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={customResults}
            onChange={(e) => setCustomResults(parseInt(e.target.value) || 0)}
          />
          <p>
            <small>💡 Price = $0.04 per data (result)</small>
          </p>
          <button onClick={goToCustomPayment}>Subscribe</button>
        </div>

        {/* Pro Plan */}
        <div className="plan">
          <h2>Pro Plan</h2>
          <p className="price">Fixed Options</p>
          <div className="sub-options">
            <p>
              <b>Sub1:</b> 30 Queries · 20 Results/query · $21.18
            </p>
            <button onClick={() => goToPayment("sub1", 30, 20, "$21.18")}>
              Subscribe Sub1
            </button>
            <button
              className="click-more-btn"
              onClick={() => navigate("/more-plans")}
            >
              Click More
            </button>
          </div>
        </div>
      </div>

      {/* Back button below cards */}
      <button className="back-btn" onClick={() => navigate(-1)}>
        ⬅ Back
      </button>
    </div>
  );
};

export default SubscriptionPlans;
