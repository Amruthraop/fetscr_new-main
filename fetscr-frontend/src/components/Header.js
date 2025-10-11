// header.js
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../images/logo.svg"; // adjust path if required

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

  return (
    <header className="header">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo-image" />
        <span className="logo-text">FETSCR</span>
      </div>

      {/* Always show navigation links on all pages */}
      <nav className="header-center">
        <Link to="/home" onClick={blockIfAuthRequired}>Home</Link>
        <Link to="/pricing" onClick={blockIfAuthRequired}>Pricing</Link>
        <Link to="/community" onClick={blockIfAuthRequired}>Community</Link>
        <Link to="/docs" onClick={blockIfAuthRequired}>Docs</Link>
      </nav>

      <div className="header-right">
        {token && user ? (
          <>
            <button className="hamburger" onClick={handleMenuToggle}>
              &#9776;
            </button>
            <div
              className="profile-avatar"
              onClick={() => {
                setShowMobileMenu(false);
                navigate("/profile");
              }}
            >
              {getFirstLetter(user.name)}
            </div>
          </>
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

      {/* Mobile menu */}
      {token && user && showMobileMenu && (
        <div className="mobile-menu">
          <Link to="/home" onClick={blockIfAuthRequired}>Home</Link>
          <Link to="/pricing" onClick={blockIfAuthRequired}>Pricing</Link>
          <Link to="/community" onClick={blockIfAuthRequired}>Community</Link>
          <Link to="/docs" onClick={blockIfAuthRequired}>Docs</Link>
          <div className="mobile-menu-buttons">
            <div
              className="profile-avatar"
              onClick={() => {
                setShowMobileMenu(false);
                navigate("/profile");
              }}
            >
              {getFirstLetter(user.name)}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
