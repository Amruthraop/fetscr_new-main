// landingpage.js
import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header"; // ✅ import the Header
import logo from "../images/logo.svg";
import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing-container">
      {/* Add the Header here */}
      <Header />

      {/* Landing page content */}
      <div className="landing-content">
        <img src={logo} alt="Fetscr Logo" className="landing-logo" />
        <h1 className="landing-title">Fetscr</h1>
        <p className="landing-tagline">Your AI-powered scraping & insights platform</p>

        <div className="landing-buttons">
          <Link to="/login" className="btn">Login</Link>
          <Link to="/signup" className="btn purple">Signup</Link>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
