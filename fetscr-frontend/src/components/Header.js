// Header.js
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../images/logo.svg"; // Adjust path if required

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const user = JSON.parse(localStorage.getItem("fetscr_user"));
  const token = localStorage.getItem("fetscr_token");

  const getFirstLetter = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const handleMenuToggle = () => setShowMobileMenu((prev) => !prev);

  // 🔹 Block all nav clicks if not logged in
  const blockIfAuthRequired = (e) => {
    if (!token || !user) {
      e.preventDefault();
      alert("Please login first");
    } else {
      setShowMobileMenu(false);
    }
  };

  // Hide hamburger in desktop, show in mobile/tab
  // Hamburger should be in header, after header-right in DOM, so it stays right
  return (
    <header className="header">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo-image" />
        <span className="logo-text">FETSCR</span>
      </div>

      {/* Nav in center for desktop */}
      <nav className="header-center">
        <Link to="/home" onClick={blockIfAuthRequired}>Home</Link>
        <Link to="/pricing" onClick={blockIfAuthRequired}>Pricing</Link>
        <Link to="/community" onClick={blockIfAuthRequired}>Community</Link>
        <Link to="/docs" onClick={blockIfAuthRequired}>Docs</Link>
      </nav>

      {/* Right side: user actions */}
      <div className="header-right">
        {token && user ? (
          <div
            className="profile-avatar"
            onClick={() => {
              setShowMobileMenu(false);
              navigate("/profile");
            }}
          >
            {getFirstLetter(user.name)}
          </div>
        ) : (
          <>
            <Link to="/login" onClick={() => setShowMobileMenu(false)}>
              <button className="btn-login">Login</button>
            </Link>
            <Link to="/signup" onClick={() => setShowMobileMenu(false)}>
              <button className="btn-primary">Sign Up</button>
            </Link>
          </>
        )}
      </div>

      {/* Hamburger button: only visible on mobile/tablet via CSS */}
      <button
        className="hamburger"
        onClick={handleMenuToggle}
        aria-label={showMobileMenu ? "Close menu" : "Open menu"}
        style={{
          display: "none", // always hidden by default, media query shows it at <=992px
        }}
      >
        &#9776;
      </button>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="mobile-menu">
          <Link to="/home" onClick={blockIfAuthRequired}>Home</Link>
          <Link to="/pricing" onClick={blockIfAuthRequired}>Pricing</Link>
          <Link to="/community" onClick={blockIfAuthRequired}>Community</Link>
          <Link to="/docs" onClick={blockIfAuthRequired}>Docs</Link>
          <div className="mobile-menu-buttons">
            {token && user ? (
              <div
                className="profile-avatar"
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/profile");
                }}
              >
                {getFirstLetter(user.name)}
              </div>
            ) : (
              <>
                <Link to="/login" onClick={() => setShowMobileMenu(false)}>
                  <button className="btn-login">Login</button>
                </Link>
                <Link to="/signup" onClick={() => setShowMobileMenu(false)}>
                  <button className="btn-primary">Sign Up</button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
