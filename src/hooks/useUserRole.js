import { useContext } from "react";
import { UserRoleContext } from "../context/UserRoleContext";

// Custom hook to use the UserRoleContext
const useUserRole = () => {
  const context = useContext(UserRoleContext);

  // Optional: Add error handling if the hook is used outside the provider
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }

  return context;
};

export default useUserRole;