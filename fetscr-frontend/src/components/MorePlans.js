import React from "react";
import { useNavigate } from "react-router-dom";
import "./MorePlans.css";

const plansInfo = {
  sub2: { queries: 30, results: 50, price: "$52.94" },
  sub3: { queries: 30, results: 25, price: "$26.47" },
  sub4: { queries: 20, results: 50, price: "$35.29" },
};

const MorePlans = () => {
  const navigate = useNavigate();

  function goToPayment(planKey) {
    const plan = plansInfo[planKey];
    if (!plan) return alert("Plan info not found.");

    navigate("/payment", {
      state: {
        plan: planKey,
        queries: plan.queries,
        results: plan.results,
        amount: plan.price,
      },
    });
  }

  return (
    <div className="subscription-container">
      <h1>More Pro Plans</h1>

      <div className="plans">
        <div className="plan">
          <h2>Sub2</h2>
          <p>30 Queries · 50 Results/query</p>
          <p className="price">$52.94</p>
          <button onClick={() => goToPayment("sub2")}>Subscribe Sub2</button>
        </div>

        <div className="plan">
          <h2>Sub3</h2>
          <p>30 Queries · 25 Results/query</p>
          <p className="price">$26.47</p>
          <button onClick={() => goToPayment("sub3")}>Subscribe Sub3</button>
        </div>

        <div className="plan">
          <h2>Sub4</h2>
          <p>20 Queries · 50 Results/query</p>
          <p className="price">$35.29</p>
          <button onClick={() => goToPayment("sub4")}>Subscribe Sub4</button>
        </div>
      </div>

      <button className="back-btn" onClick={() => navigate(-1)}>
        ⬅ Back
      </button>
    </div>
  );
};

export default MorePlans;
