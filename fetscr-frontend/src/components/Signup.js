import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "./Header";
import "./Signup.css";

import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const SERVER = "http://localhost:5000";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    password: "",
    confirmPassword: ""
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("form"); // "form", "otp"
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Resend OTP timer
  const [resendDisabled, setResendDisabled] = useState(true);
  const [timer, setTimer] = useState(60);

  const navigate = useNavigate();

  // Update timer for resend
  useEffect(() => {
    let interval = null;
    if (step === "otp" && resendDisabled && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [step, resendDisabled, timer]);

  // Handle input changes
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle terms checkbox
  const handleCheckboxChange = (e) => {
    setAgreeTerms(e.target.checked);
  };

  // Signup form submission, triggers OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const res = await fetch(`${SERVER}/signup/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Signup failed");
      } else {
        setPendingEmail(formData.email);
        setStep("otp");
        setResendDisabled(true);
        setTimer(60); // Start resend OTP timer
      }
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  // Submit OTP for verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${SERVER}/signup/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, otp }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "OTP verification failed");
      } else {
        alert("Signup and verification successful! Please login.");
        navigate("/login");
      }
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  // Resend the OTP
  const handleResendOtp = async () => {
    setResendDisabled(true);
    setTimer(60);
    try {
      const res = await fetch(`${SERVER}/signup/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, email: pendingEmail }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error || "Resend failed");
      else setError("OTP resent! Check your email.");
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };


  // Handle Google login success response
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

  // OTP Verification UI
  if (step === "otp") {
    return (
      <>
        <Header />
        <div className="signup-page">
          <form className="signup-form" onSubmit={handleOtpSubmit}>
            <h2>Email OTP Verification</h2>
            <p>
              Enter the OTP sent to <b>{pendingEmail}</b>
            </p>
            {error && <div className="signup-error">{error}</div>}
            <div className="input-group">
              <label htmlFor="otp" className="input-label">OTP</label>
              <input
                id="otp"
                type="text"
                name="otp"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary">Verify OTP</button>
            <button
              className="signup-back-btn-bottom"
              type="button"
              onClick={() => setStep("form")}
              aria-label="Back"
              style={{ marginTop: "10px" }}
            >
              &#8592; Back
            </button>
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                disabled={resendDisabled}
                onClick={handleResendOtp}
                className="btn-secondary"
              >
                {resendDisabled
                  ? `Resend OTP (${timer}s)`
                  : "Resend OTP"}
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  // Signup Form UI including Google Login
  return (
    <>
      <Header />
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
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
                placeholder="Enter your name"
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
                placeholder="Your email address"
              />
            </div>
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
                placeholder="10-digit phone number"
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
                placeholder="Create password"
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
                placeholder="Re-enter your password"
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
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google signup failed")}
              />
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
      </GoogleOAuthProvider>
    </>
  );
};

export default SignUpPage;
