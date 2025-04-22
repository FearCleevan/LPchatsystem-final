import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useUserStore } from "../lib/userStore";
import { toast } from "react-toastify";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useUserStore();

  useEffect(() => {
    if (currentUser && !allowedRoles.includes(currentUser.position)) {
      toast.error("You do not have permission to access this page.");
    }
  }, [currentUser, allowedRoles]);

  // If the user is not logged in, redirect to the login page
  if (!currentUser) {
    return <Navigate to="/" />;
  }

  // If the user's role is not allowed, redirect to /chat-list
  if (!allowedRoles.includes(currentUser.position)) {
    return <Navigate to="/chat-list" />;
  }

  // If the user is allowed, render the children (the requested route)
  return children;
};

export default ProtectedRoute;