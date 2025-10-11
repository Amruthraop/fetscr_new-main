import React from "react";
import "./Docs.css";

export default function Docs() {
  return (
    <div className="docs-container">
      <h1 className="docs-title">Fetscr Documentation</h1>
      <p className="docs-intro">
        Welcome to the Fetscr Docs! Here you’ll find everything you need to get started
        with scraping data using our platform.
      </p>
      
      <section className="docs-grid">
        <div className="docs-card">
          <h2>🚀 Getting Started</h2>
          <ul>
            <li>Sign up and log in to your Fetscr account.</li>
            <li>Choose a plan that suits your needs.</li>
            <li>Enter your query in the search bar to start scraping.</li>
          </ul>
        </div>

        <div className="docs-card">
          <h2>📊 Plans</h2>
          <ul>
            <li><b>Basic</b></li>
            <li><b>Pro</b></li>
            <li><b>Enterprise</b></li>
          </ul>
        </div>

        <div className="docs-card">
          <h2>⚙ API Usage</h2>
          <p>Fetscr uses <b>Google API Key</b> and <b>CX value</b> for fetching data.</p>
        </div>

        <div className="docs-card">
          <h2>💡 Example Query</h2>
          <p>Try searching with site-based queries for better results:</p>
          <code className="docs-code">site:linkedin.com software engineer</code>
        </div>

        <div className="docs-card">
          <h2>⚡ Quick Tips</h2>
          <ul>
            <li>Use specific keywords for more accurate results.</li>
            <li>Combine <code>site:</code> operator with keywords to scrape from a single website.</li>
            <li>Keep track of your daily queries to avoid hitting limits.</li>
          </ul>
        </div>

        <div className="docs-card warning-box">
          <h2>⚠ Note</h2>
          <p>
            If you see <i>"403 Forbidden"</i> or <i>"Query limit reached"</i> errors, it means
            either your API Key or CX value is invalid, or your daily query quota has been used.
          </p>
        </div>

        <div className="docs-card">
          <h2>✅ Best Practices</h2>
          <ul>
            <li>Always keep your API Key & CX value private.</li>
            <li>Use environment variables instead of hardcoding keys.</li>
            <li>Break down large scraping tasks into smaller queries.</li>
          </ul>
        </div>
      </section>
      
      <div className="docs-footer">
        <p>Need help? Visit our <a href="/community">Community</a>.</p>
      </div>
    </div>
  );
}