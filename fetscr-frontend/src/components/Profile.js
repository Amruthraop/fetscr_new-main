// src/components/Profile.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

export default function Profile() {
  const storedUser = JSON.parse(localStorage.getItem("fetscr_user"));
  const [user, setUser] = useState(storedUser);
  const [isEditing, setIsEditing] = useState(false);
  const [planInfo, setPlanInfo] = useState(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    number: user?.number || "",        // <-- added phone number
    newPassword: "",
    confirmPassword: "",
  });

  // 🔹 Fetch Active Plan
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem("fetscr_token");
        if (!token) return;

        const res = await fetch("http://localhost:5000/getPlan", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log("Fetched plan info:", data);

        if (data.success) {
          setPlanInfo(data.plan);
        }
      } catch (err) {
        console.error("Error fetching plan:", err);
      }
    };

    fetchPlan();
  }, []);

  if (!user) {
    return (
      <div className="profile-container">
        <h2>User not found</h2>
        <p>Please login again.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        alert("New password and confirm password do not match!");
        return;
      }
    }

    try {
      const token = localStorage.getItem("fetscr_token");
      const res = await fetch("http://localhost:5000/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          number: formData.number,      // <-- added number
          newPassword: formData.newPassword || null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Update failed");
        return;
      }

      // Update local storage and state
      localStorage.setItem("fetscr_user", JSON.stringify(data.user));
      setUser(data.user);
      setIsEditing(false);

      // clear password fields
      setFormData({
        ...formData,
        newPassword: "",
        confirmPassword: "",
      });

      alert("Profile updated successfully");
    } catch (err) {
      console.error(err);
      alert("Error updating profile");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("fetscr_user");
    localStorage.removeItem("fetscr_token");
    navigate("/");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-avatar-large">
          {user.name ? user.name.charAt(0).toUpperCase() : "?"}
        </div>

        {!isEditing ? (
          <>
            <h2>{user.name}</h2>
            <p>Email: {user.email || "Not provided"}</p>
            

            {/* ✅ Active Plan Section */}
            <div className="active-plan" style={{ marginTop: 16 }}>
              <h3>Active Plan</h3>
              {planInfo ? (
                <p>
                  <strong>Plan:</strong> {planInfo.plan_type || "free"} &nbsp;|&nbsp;
                  <strong>Remaining queries:</strong> {planInfo.queries_remaining} &nbsp;|&nbsp;
                  <strong>Results/query:</strong> {planInfo.results_per_query}
                </p>
              ) : (
                <p>Loading plan...</p>
              )}

              <button
                className="plan-btn"
                style={{ marginTop: 8 }}
                onClick={() => navigate("/pricing")}
              >
                Change Plan
              </button>
            </div>

            <div className="profile-actions">
              <button className="btn-primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
              <button className="btn-outline logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Edit Profile</h2>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="profile-input"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="profile-input"
            />
            <input
  type="tel"
  name="number"
  value={formData.number}
  onChange={handleChange}
  placeholder="Enter phone number"
  className="profile-input"
/>

            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              className="profile-input"
            />
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              className="profile-input"
            />
            <div className="edit-actions">
              <button className="btn-primary" onClick={handleSave}>
                Save
              </button>
              <button
                className="btn-outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
