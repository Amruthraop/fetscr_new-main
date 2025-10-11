// src/components/Signup.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import Header from "./Header"; // import Header component
import "./Signup.css";

const SERVER = "http://localhost:5000";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",        // Add number field
    password: "",
    confirmPassword: ""
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (e) => {
    setAgreeTerms(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${SERVER}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Signup failed");
      } else {
        alert("Signup successful! Please login.");
        navigate("/login");
      }
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(`${SERVER}/social-login/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("fetscr_token", data.token);
        localStorage.setItem("fetscr_user", JSON.stringify(data.user));
        navigate("/home");
      } else {
        setError(data.error || "Google signup failed");
      }
    } catch (err) {
      setError("Google signup error: " + err.message);
    }
  };

  return (
    <>
      <Header />  {/* Render Header here */}
      <div className="signup-page">
        <form className="signup-form" onSubmit={handleSubmit}>
          <h2>Sign Up</h2>

          {error && <div className="signup-error">{error}</div>}

          <div className="input-group">
            <label htmlFor="name" className="input-label">Name</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Number input */}
          <div className="input-group">
            <label htmlFor="number" className="input-label">Number</label>
            <input
              id="number"
              type="tel"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              pattern="[0-9]{10,}"
              placeholder=""
            />
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="terms-checkbox-row">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={handleCheckboxChange}
              required
              id="termsCheck"
            />
            <label htmlFor="termsCheck" className="terms-label">
              I agree to the{" "}
              <Link to="/terms" target="_blank" rel="noopener noreferrer">
                Terms and Privacy Policy
              </Link>
            </label>
          </div>

          <button type="submit" className="btn-primary">Sign Up</button>

          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>

          <div className="or-divider">
            <span>or</span>
          </div>

          <div className="social-signup">
            <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google signup failed")}
              />
            </GoogleOAuthProvider>
          </div>

          <button
            className="signup-back-btn-bottom"
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            &#8592; Back
          </button>
        </form>
      </div>
    </>
  );
};

export default SignUpPage;
