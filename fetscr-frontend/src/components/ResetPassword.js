import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPages.css";

const ResetPassword = () => {
  const [formData, setFormData] = useState({ email: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!data.success) setError(data.error || "Failed to reset password");
      else {
        setSuccess("Password reset successfully! You can now login.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {success && <p style={{ color: "green", textAlign: "center" }}>{success}</p>}
        <label>Email
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>
        <label>New Password
          <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} required />
        </label>
        <label>Confirm Password
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
        </label>
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
