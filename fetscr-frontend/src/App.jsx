import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/Signup";
import Home from "./components/Home";
import Results from "./components/Results";
import EditProfile from "./components/EditProfile";
import Profile from "./components/Profile";
import SubscriptionPlans from "./components/SubscriptionPlans";
import ResetPassword from "./components/ResetPassword";
import MorePlans from "./components/MorePlans";
import PaymentPage from "./components/PaymentPage";
import CreditCardPayment from "./components/CreditCardPayment";
import UPIPayment from "./components/UPIPayment";
import Community from "./components/Community";
import Docs from "./components/Docs";
import LandingPage from "./components/LandingPage";

// Simple NotFoundPage Component
function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you requested does not exist.</p>
      <a href="/home">Go to Home</a>
    </div>
  );
}


// Wrapper to hide Header on Welcome/Login/Signup
function Layout({ children }) {
  const location = useLocation();
  const hideHeaderPaths = ["/", "/login", "/signup", "/reset-password"];
  const hideHeader = hideHeaderPaths.includes(location.pathname);

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Default route goes to LandingPage */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/community" element={<Community />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/results" element={<Results />} />
          <Route path="/pricing" element={<SubscriptionPlans />} />
          <Route path="/more-plans" element={<MorePlans />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/editprofile" element={<EditProfile />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/credit-card-payment" element={<CreditCardPayment />} />
          <Route path="/upi-payment" element={<UPIPayment />} />

          {/* 404 Route */}
          <Route path="/404" element={<NotFoundPage />} />

          {/* Catch all unknown routes → redirect to 404 */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;