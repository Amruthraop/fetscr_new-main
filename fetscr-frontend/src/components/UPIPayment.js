import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const UPIPayment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Hooks must be declared at the top
  const [userUpiId, setUserUpiId] = useState("");
  const [error, setError] = useState("");

  if (!state || !state.amount || !state.platform) {
    return (
      <div>
        <h2>No payment info found.</h2>
        <button onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const { amount, plan, platform } = state;

  const validateUpi = (id) => id.includes("@") && id.length > 3;

  const handlePay = () => {
    if (!userUpiId) {
      setError("Please enter your UPI ID.");
      return;
    }
    if (!validateUpi(userUpiId)) {
      setError("Invalid UPI ID format.");
      return;
    }
    setError("");
    // Construct UPI payment URL with userUpiId as payee
    const txnNote = `Payment for ${plan}`;
    const amountValue = amount.replace("$", "").trim();

    const upiUrl = 
      `upi://pay?pa=${encodeURIComponent(userUpiId)}&pn=User&am=${amountValue}&cu=INR&tn=${encodeURIComponent(txnNote)}`;

    // Redirect to UPI payment platform (opens installed UPI apps)
    window.location.href = upiUrl;
  };

  return (
    <div className="payment-container">
      <h2>{platform} UPI Payment</h2>
      <p>Amount: <b>{amount}</b></p>
      <p>Plan: {plan}</p>
      <p>Enter your UPI ID to send the payment:</p>

      <input
        type="text"
        placeholder="e.g. yourname@okaxis"
        value={userUpiId}
        onChange={(e) => setUserUpiId(e.target.value.trim())}
        required
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      <button onClick={handlePay}>Pay Now</button>
      <button onClick={() => navigate(-1)}>⬅ Back</button>
    </div>
  );
};

export default UPIPayment;
