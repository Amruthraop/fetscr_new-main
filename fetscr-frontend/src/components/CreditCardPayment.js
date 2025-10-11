import React, { useState } from "react"; 
import { useLocation, useNavigate } from "react-router-dom";

const SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const CreditCardPayment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!state || !state.amount || !state.plan) {
    return (
      <div>
        <h2>No payment info found.</h2>
        <button onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const { amount, plan, queries, results } = state;

  const handlePay = async () => {
    if (!cardNumber || !expiry || !cvv) {
      setError("All fields are required.");
      return;
    }

    if (cardNumber.length < 12 || cardNumber.length > 19) {
      setError("Invalid card number length.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("fetscr_token");
      if (!token) throw new Error("User not logged in.");

      // Prepare backend payload
      const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
      const body = {
        plan,
        amount: numericAmount,
        queries: Number(queries) || 0,
        resultsPerQuery: Number(results) || 0,
        platform: "credit-card",
        upiId: null, // no UPI for credit card
        card_number: cardNumber,
        cvv: cvv,
      };

      const res = await fetch(`${SERVER}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Payment failed");
      }

      // Save plan info locally for Home page
      if (json.activePlan) {
        localStorage.setItem("activePlan", JSON.stringify(json.activePlan));
      }

      alert("✅ Payment successful! Plan activated.");
      navigate("/home");

    } catch (err) {
      console.error("Credit card payment error:", err);
      alert("Payment failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h2>Credit Card Payment</h2>
      <p>
        Amount: <b>{amount}</b>
      </p>
      <p>
        Plan: <b>{plan}</b>
      </p>

      <input
        type="text"
        placeholder="Card Number"
        value={cardNumber}
        maxLength={19}
        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
      />
      <input
        type="text"
        placeholder="Expiry Date (MM/YY)"
        value={expiry}
        maxLength={5}
        onChange={(e) => setExpiry(e.target.value)}
      />
      <input
        type="password"
        placeholder="CVV"
        value={cvv}
        maxLength={4}
        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={handlePay} disabled={loading}>
        {loading ? "Processing..." : "Pay"}
      </button>
      <button onClick={() => navigate(-1)}>⬅ Back</button>
    </div>
  );
};

export default CreditCardPayment;
