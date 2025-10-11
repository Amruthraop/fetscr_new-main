import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Community.css";

export default function Community() {
  const [selectedVote, setSelectedVote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleVote = () => {
    if (selectedVote) {
      setSubmitted(true);
    } else {
      alert("Please select an option before submitting!");
    }
  };

  // Function to navigate to 404 page
  const goTo404 = () => navigate("/404");

  return (
    <div className="community-container">
      {/* Hero Section */}
      <section className="community-hero">
        <h1>Welcome to the fetscr Community 🚀</h1>
        <p>Connect, learn, and grow with other developers using fetscr.</p>
      </section>

      {/* Sections */}
      <section className="community-sections">
        <div className="community-card">
          <h2>💬 Discussions & Support</h2>
          <p>
            Ask questions, share tips, and help others. Join the conversation on our{" "}
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub Discussions</a>.
          </p>
        </div>
        <div className="community-card">
          <h2>📢 Announcements & Updates</h2>
          <p>
            Stay up to date with new releases, features, and bug fixes. Check out the latest updates on our{" "}
            <a href="https://github.com" target="_blank" rel="noreferrer">Release Notes</a>.
          </p>
        </div>
        <div className="community-card">
          <h2>🌟 Showcase</h2>
          <p>
            Share your projects built with fetscr. Inspire others and get featured in our community wall.
          </p>
        </div>
        <div className="community-card join-us-card">
          <h2>🔗 Join Us</h2>
          <p>Connect with fellow developers:</p>
          <ul>
            <li>
              <a className="cta-btn" href="https://discord.com" target="_blank" rel="noreferrer">
                Join Discord
              </a>
            </li>
            <li>
              <a className="cta-btn" href="https://twitter.com" target="_blank" rel="noreferrer">
                Follow on Twitter
              </a>
            </li>
            <li>
              <a className="cta-btn" href="https://github.com" target="_blank" rel="noreferrer">
                Contribute on GitHub
              </a>
            </li>
          </ul>
        </div>
        <div className="community-card learning-resources">
          <h2>📘 Learning Resources</h2>
          <p>Boost your skills with community-driven resources:</p>
          <ul>
            <li>
              <button className="cta-btn" type="button" onClick={goTo404}>
                Official Documentation
              </button>
            </li>
            <li>
              <button className="cta-btn" type="button" onClick={goTo404}>
                Step-by-Step Tutorials
              </button>
            </li>
            <li>
              <button className="cta-btn" type="button" onClick={goTo404}>
                Community Blog Posts
              </button>
            </li>
          </ul>
        </div>
        <div className="community-card">
          <h2>🤝 Collaboration</h2>
          <p>Looking for a project partner or mentor? Connect with community members.</p>
          <div className="collab-btns">
            <button className="cta-btn" type="button" onClick={goTo404}>
              Find a Mentor
            </button>
            <button className="cta-btn" type="button" onClick={goTo404}>
              Join a Project
            </button>
          </div>
        </div>
        <div className="community-card">
          <h2>📰 Community Spotlight</h2>
          <p>
            This month: <strong>Jane Doe</strong> built an AI-powered scraper using Fetscr 
            and integrated it with Notion. Check out her story 👉 <a href="#">Read More</a>
          </p>
        </div>
        <div className="community-card">
          <h2>💡 Tips & Tricks</h2>
          <p>Quick hacks from the community to make your scraping smarter:</p>
          <ul>
            <li>Use filters to refine your queries</li>
            <li>Cache responses to save limits</li>
            <li>Always validate JSON responses</li>
          </ul>
        </div>
      </section>
    </div>
  );
}