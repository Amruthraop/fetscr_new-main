import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Home.css";

const SERVER = "http://localhost:5000";

export default function Home() {
  const [query, setQuery] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem("fetscr_recent_queries");
    if (stored) {
      try {
        setRecentQueries(JSON.parse(stored));
      } catch {
        setRecentQueries([]);
      }
    }
  }, []);

  // Reload plan when location changes (e.g. after payment success and navigate("/home"))
  useEffect(() => {
    loadPlan();
  }, [location]);

  async function loadPlan() {
    try {
      const token = localStorage.getItem("fetscr_token");
      if (!token) return;
      const res = await fetch(`${SERVER}/getPlan`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setPlanInfo(data.plan);
      else setPlanInfo(null);
    } catch (err) {
      console.error("loadPlan error:", err);
      setPlanInfo(null);
    }
  }

  const handleSearch = async (e, customQuery) => {
    if (e) e.preventDefault();
    const finalQuery = customQuery || query.trim();
    if (!finalQuery) {
      alert("Please enter a query");
      return;
    }
    // Check remaining queries before scraping
    const remainingQueries = planInfo
      ? (planInfo.queries_remaining ??
          Math.max(0, (planInfo.allowed_queries || 0) - (planInfo.queries_used || 0)))
      : 0;
    if (remainingQueries <= 0) {
      alert("Query limit reached. Please upgrade your plan.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("fetscr_token");
      if (!token) {
        alert("Please login to scrape data.");
        navigate("/login");
        return;
      }

      const res = await fetch(`${SERVER}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: finalQuery, keywords, pages: 3 }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Scrape failed");
      }

      sessionStorage.setItem(
        "fetscr_results",
        JSON.stringify({ results: data.results, query: finalQuery })
      );

      const newRecent = [
        {
          query: finalQuery,
          count: data.results.length,
          time: new Date().toISOString(),
        },
        ...recentQueries.filter((r) => r.query !== finalQuery),
      ].slice(0, 5);

      setRecentQueries(newRecent);
      localStorage.setItem("fetscr_recent_queries", JSON.stringify(newRecent));

      setPlanInfo((prev) => ({
        ...(prev || {}),
        plan_type: data.plan_type ?? (prev && prev.plan_type),
        allowed_queries: data.allowed_queries ?? (prev && prev.allowed_queries),
        queries_remaining: data.queries_remaining,
        queries_used: data.queries_used,
        results_per_query: data.results_per_query ?? (prev && prev.results_per_query),
      }));

      navigate("/results", {
        state: { results: data.results, query: finalQuery },
      });

    } catch (err) {
      console.error(err);
      alert("Error: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = () => {
    const PLAN = planInfo?.plan_type || "Free";
    const REMAIN = planInfo
      ? (planInfo.queries_remaining ??
          Math.max(0, (planInfo.allowed_queries || 0) - (planInfo.queries_used || 0)))
      : 0;
    const RESULTS = planInfo?.results_per_query || 0;

    return (
      <div className="plan-box">
        <div className="plan-details">
          <span>
            <strong>Plan:</strong> {PLAN} &nbsp;
            <strong>Remaining queries:</strong> {REMAIN} &nbsp;
            <strong>Results/query:</strong> {RESULTS}
          </span>
        </div>
        <button
          className="change-plan-btn"
          style={{ marginTop: "10px" }}
          onClick={() => navigate("/pricing")}
        >
          {planInfo ? "Change Plan" : "Select a Plan"}
        </button>
      </div>
    );
  };

  return (
    <div className="home-container" id="home">
      <h1 className="main-heading">FETSCR</h1>
      <p className="subtitle">Scraping Data Made Simple</p>

      {renderPlanCard()}

      <form className="search-box" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Enter your query..."
        />
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          type="text"
          placeholder="Enter keywords..."
          style={{ marginLeft: 8, width: "170px" }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {recentQueries.length > 0 && (
        <div className="recent-queries">
          <h3>Recently Scraped</h3>
          <ul>
            {recentQueries.map((r, i) => (
              <li key={i}>
                <button
                  className="recent-query-btn"
                  onClick={() => handleSearch(null, r.query)}
                >
                  {r.query}
                </button>
                <span className="recent-meta">
                  ({r.count} results, {new Date(r.time).toLocaleString()})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
