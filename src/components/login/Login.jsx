import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../lib/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import "./login.css";
import { useUserRole } from "../../context/UserRoleContext";
import { useUserStore } from "../../lib/userStore";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { setUserRole } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { fetchUserInfo } = useUserStore();
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [email, setEmail] = useState("");

  // Check for remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      setErrorMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Store email in localStorage if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      await fetchUserInfo(user.uid);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        setErrorMessage("User data not found.");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.position;

      setUserRole(userRole);
      localStorage.setItem("userRole", userRole);

      await updateDoc(doc(db, "users", user.uid), {
        isActive: true,
      });

      if (userRole === "admin") {
        navigate("/dashboard-list");
      } else if (userRole === "teamleader" || userRole === "agent") {
        navigate("/chat-list");
      } else {
        setErrorMessage("Invalid role. Please contact support.");
      }
    } catch (err) {
      setErrorMessage("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);

    if (!recoveryEmail) {
      setErrorMessage("Please enter your email address.");
      setRecoveryLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, recoveryEmail);
      setRecoverySent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Error sending recovery email:", error);
      setErrorMessage("Failed to send recovery email. Please try again.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-item">
        <img src="./LP LOgo.png" alt="Logo" />

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {!showRecovery ? (
          <>
            <form className="login-form" onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Email"
                name="email"
                className="login-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  name="password"
                  className="login-input"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="remember-me-container">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe">Remember Me</label>
              </div>
              <button disabled={loading} type="submit" className="login-button">
                {loading ? "Loading..." : "LOGIN"}
              </button>
            </form>
            <button
              className="forgot-password-button"
              onClick={() => setShowRecovery(true)}
            >
              Forgot Password?
            </button>
          </>
        ) : (
          <form className="recovery-form" onSubmit={handlePasswordRecovery}>
            <h3>Account Recovery</h3>
            <p>Enter your email to receive a password reset link</p>
            <input
              type="email"
              placeholder="Your email address"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="login-input"
              required
            />
            <div className="recovery-buttons">
              <button
                type="submit"
                disabled={recoveryLoading || recoverySent}
                className="recovery-button"
              >
                {recoveryLoading
                  ? "Sending..."
                  : recoverySent
                  ? "Email Sent"
                  : "Send Recovery Email"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false);
                  setRecoveryEmail("");
                  setRecoverySent(false);
                }}
                className="back-to-login-button"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;