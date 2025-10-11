// src/components/PaymentPage.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./payment.css";

const SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const PaymentPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // "credit-card" or "upi"
  const [selectedUpiPlatform, setSelectedUpiPlatform] = useState(null); // "PhonePe" or "Google Pay" or "Paytm" or "Other"
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!state) {
    return (
      <div>
        <h2>No payment info found.</h2>
        <button onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const { plan, queries, results, amount } = state;

  const handlePayWithUpi = async () => {
    if (!selectedUpiPlatform) {
      alert("Please select a UPI platform.");
      return;
    }
    if (!upiId) {
      alert("Please enter your UPI ID.");
      return;
    }

    const proceed = window.confirm(
      `Initiating payment of ₹${amount} via ${selectedUpiPlatform} with UPI ID: ${upiId}\n\nClick OK to proceed.`
    );
    if (!proceed) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("fetscr_token");
      // ✅ Ensure numeric amount only
      const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ""));

      const body = {
        plan,
        amount: numericAmount,
        queries: Number(queries),
        resultsPerQuery: Number(results),
        platform: selectedUpiPlatform,
        upiId,
      };

      const res = await fetch(`${SERVER}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token} ` } : {}),
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Payment API error");
      }

      if (json.activePlan) {
        localStorage.setItem("activePlan", JSON.stringify(json.activePlan));
      }

      alert("✅ Payment successful! Plan activated.");
      navigate("/home");
    } catch (err) {
      console.error("Payment error:", err);
      alert("Failed to record payment: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h2>Payment for Plan: {plan ? plan.toUpperCase() : "Unknown"}</h2>
      <p>
        Number of Queries: {queries}
        <br />
        Results per Query: {results}
        <br />
        <b>Amount to pay: ₹{amount}</b>
      </p>

      {!selectedPaymentMethod && (
        <>
          <h3>Select Payment Method</h3>
          <div className="payment-options">
            <button onClick={() => setSelectedPaymentMethod("credit-card")}>
              Pay with Credit Card
            </button>
            <button onClick={() => setSelectedPaymentMethod("upi")}>Pay with UPI</button>
            <button className="back-btn" onClick={() => navigate(-1)}>
              ⬅ Back
            </button>
          </div>
        </>
      )}

      {selectedPaymentMethod === "credit-card" && (
        <div className="credit-card-section">
          <p>Redirecting to credit card payment...</p>
          <button
            onClick={() =>
              navigate("/credit-card-payment", { state: { amount, plan, queries, results } })
            }
          >
            Go to Credit Card Payment
          </button>
          <button onClick={() => setSelectedPaymentMethod(null)}>Back</button>
        </div>
      )}

      {selectedPaymentMethod === "upi" && (
        <div className="upi-section">
          {!selectedUpiPlatform && (
            <>
              <h3>Select UPI Platform</h3>
              <button onClick={() => setSelectedUpiPlatform("PhonePe")}>PhonePe</button>
              <button onClick={() => setSelectedUpiPlatform("Google Pay")}>Google Pay</button>
              <button onClick={() => setSelectedUpiPlatform("Paytm")}>Paytm</button>
              <button onClick={() => setSelectedUpiPlatform("Other")}>Other UPI</button>
              <button onClick={() => setSelectedPaymentMethod(null)}>Back</button>
            </>
          )}

          {selectedUpiPlatform && (
            <>
              <h3>
                {selectedUpiPlatform === "Other"
                  ? "Other UPI Payment"
                  : `${selectedUpiPlatform} UPI Payment`}
              </h3>
              <p>
                Amount: <b>₹{amount}</b>
              </p>
              <label htmlFor="upi-id-input">
                Enter your UPI ID:
              </label>
              <input
                type="text"
                id="upi-id-input"
                value={upiId}
                placeholder="e.g. yourname@okaxis"
                onChange={(e) => setUpiId(e.target.value.trim())}
              />
              <button onClick={handlePayWithUpi} disabled={loading}>
                {loading ? "Processing..." : "Pay Now"}
              </button>
              <button onClick={() => setSelectedUpiPlatform(null)}>Back</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentPage;