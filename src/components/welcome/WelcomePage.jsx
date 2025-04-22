import React from "react";
import { useUserStore } from "../../lib/userStore"; // Import useUserStore to get the current user
import "./welcomePage.css"; // Add styling for the welcome page

const WelcomePage = () => {
  const { currentUser } = useUserStore(); // Get the current user

  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <h1 className="user-fullname">Hi! {currentUser?.fullname || "User"}</h1>
        <p>Welcome to</p>
        <img src="./LP LOgo.png" alt="The Launchpad Logo" className="lp-logo" />
        <p>Chat System</p>
      </div>
    </div>
  );
};

export default WelcomePage;