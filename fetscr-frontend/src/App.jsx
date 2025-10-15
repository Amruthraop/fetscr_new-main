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

// Wrapper to hide Header on Landing/Login/Signup/Reset Password pages
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

// Auth guard for protected routes
function RequireAuth({ children }) {
  const token = localStorage.getItem("fetscr_token");
  if (!token) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const token = localStorage.getItem("fetscr_token");

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Default route: if logged in redirect to /home else show landing */}
          <Route
            path="/"
            element={
              token ? <Navigate to="/home" replace /> : <LandingPage />
            }
          />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route
            path="/home"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/community"
            element={
              <RequireAuth>
                <Community />
              </RequireAuth>
            }
          />
          <Route
            path="/docs"
            element={
              <RequireAuth>
                <Docs />
              </RequireAuth>
            }
          />
          <Route
            path="/results"
            element={
              <RequireAuth>
                <Results />
              </RequireAuth>
            }
          />
          <Route
            path="/pricing"
            element={
              <RequireAuth>
                <SubscriptionPlans />
              </RequireAuth>
            }
          />
          <Route
            path="/more-plans"
            element={
              <RequireAuth>
                <MorePlans />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/editprofile"
            element={
              <RequireAuth>
                <EditProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/payment"
            element={
              <RequireAuth>
                <PaymentPage />
              </RequireAuth>
            }
          />
          <Route
            path="/credit-card-payment"
            element={
              <RequireAuth>
                <CreditCardPayment />
              </RequireAuth>
            }
          />
          <Route
            path="/upi-payment"
            element={
              <RequireAuth>
                <UPIPayment />
              </RequireAuth>
            }
          />

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
