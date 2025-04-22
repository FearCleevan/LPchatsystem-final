import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../lib/firebase";
import { 
  doc, getDoc, updateDoc,
  collection, query, where, getDocs
} from "firebase/firestore";
import { updatePassword, signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./AdminResetPassword.css"; // Create this CSS file for styling

const AdminResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");
  const userEmail = queryParams.get("email");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!token || !userEmail) {
          throw new Error("Invalid reset link - missing parameters");
        }

        const tokenDoc = await getDoc(doc(db, "passwordResetTokens", token));
        
        if (!tokenDoc.exists()) {
          throw new Error("Invalid reset link - token not found");
        }

        const tokenData = tokenDoc.data();
        
        if (tokenData.used) {
          throw new Error("This reset link has already been used");
        }

        if (tokenData.expiresAt < new Date().toISOString()) {
          throw new Error("This reset link has expired");
        }

        if (tokenData.email !== userEmail) {
          throw new Error("Email does not match reset token");
        }

        setTokenValid(true);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setTokenLoading(false);
      }
    };

    verifyToken();
  }, [token, userEmail]);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!tokenValid) {
      setError("Invalid reset token");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      // In a real implementation, this would be done via a Cloud Function
      // with admin privileges. This is a simplified client-side version.
      
      // 1. First verify the user exists in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("User not found in database");
      }

      // 2. Get the user's UID
      const userDoc = querySnapshot.docs[0];
      const uid = userDoc.id;

      // 3. Sign in with a temporary password (would need to be set beforehand)
      // Note: In production, this should be handled server-side with Admin SDK
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          userEmail,
          "temporaryPassword123" // This should be pre-set for admin reset scenarios
        );
      } catch (signInError) {
        throw new Error("Unable to authenticate. Please contact support.");
      }

      // 4. Update the password
      await updatePassword(userCredential.user, newPassword);

      // 5. Mark token as used
      await updateDoc(doc(db, "passwordResetTokens", token), {
        used: true,
        usedAt: new Date().toISOString()
      });

      // 6. Update user record in Firestore
      await updateDoc(doc(db, "users", uid), {
        passwordLastChanged: new Date().toISOString(),
      });

      toast.success(`Password for ${userEmail} has been reset successfully`);
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Reset error:", err);
      setError(err.message || "Failed to reset password");
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (tokenLoading) {
    return (
      <div className="reset-container">
        <h2>Verifying Reset Link...</h2>
        <p>Please wait while we verify your password reset link.</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-container">
        <h2>Invalid Reset Link</h2>
        <p className="error">{error}</p>
        <p>Please request a new password reset link.</p>
        <button onClick={() => navigate("/login")}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <h2>Reset Password for {userEmail}</h2>
      <form onSubmit={handleReset}>
        <div className="password-input-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        
        <div className="password-input-container">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        
        {error && <p className="error">{error}</p>}
        
        <div className="button-group">
          <button type="submit" disabled={loading} className="reset-button">
            {loading ? "Processing..." : "Reset Password"}
          </button>
          <button 
            type="button" 
            onClick={() => navigate("/login")}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminResetPassword;