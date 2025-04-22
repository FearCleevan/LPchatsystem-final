import { useState } from "react";
import "./userInfo.css";
import { useUserStore } from "../../../lib/userStore";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import {
  getAuth,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore"; // Import getDoc
import { auth, db } from "../../../lib/firebase"; // Import your Firestore instance
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Userinfo = () => {
  const { currentUser, setCurrentUser} = useUserStore(); // Destructure clearUser
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState(currentUser?.status || "");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] =
    useState(false);
  const [isChangePasswordFormOpen, setIsChangePasswordFormOpen] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const suggestedStatuses = [
    { text: "🍔 Out for lunch" },
    { text: "💼 In meetings" },
    { text: "🎓 At school" },
    { text: "🎬 At the movies" },
    { text: "✈️ Travelling" },
    { text: "🎉 Celebrating" },
    { text: "🚗 Driving" },
    { text: "🏋️ At the gym" },
    { text: "🏠 Working from home" },
  ];

  const handleStatusSelect = async (newStatus) => {
    setStatus(newStatus);
    setIsModalOpen(false);

    // Save status to Firestore
    try {
      if (!currentUser || !currentUser.uid) {
        toast.error("User not authenticated.");
        return;
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        status: newStatus,
      });

      toast.success("Status updated successfully!");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  

  const handleEmojiSelect = (emojiObject) => {
    setStatus((prevStatus) => prevStatus + emojiObject.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleSignOut = async () => {
    try {
          // Set user as offline before logging out
          await updateDoc(doc(db, "users", currentUser.id), {
            isActive: false,
          });
    
          await signOut(auth);
          toast.success("Logged out successfully!");
          navigate("/");
        } catch (err) {
          console.error("Logout failed:", err);
          toast.error("Logout failed. Please try again.");
        }
  };

  const handlePasswordChange = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Reauthenticate the user
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update the password
      await updatePassword(user, newPassword);

      toast.success("Password updated successfully!");
      setIsChangePasswordFormOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(
        "Failed to update password. Please check your current password."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleChangePhoto = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast.error("User not authenticated. Please sign in.");
      return;
    }

    if (!window.cloudinary) {
      toast.error("Cloudinary widget not loaded.");
      return;
    }

    const cloudinaryWidget = window.cloudinary.createUploadWidget(
      {
        cloudName: "dtebf3uea", // Replace with your Cloudinary cloud name
        uploadPreset: "lp_upload_preset", // Replace with your upload preset
        sources: ["local", "url"],
        multiple: false,
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          const imageUrl = result.info.secure_url;
          updateProfilePhoto(imageUrl); // Update Firestore with the new photo URL
        }
      }
    );

    cloudinaryWidget.open();
  };

  const updateProfilePhoto = async (imageUrl) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !user.uid) {
      toast.error("User not authenticated.");
      return;
    }

    try {
      // Update the user's document in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        avatar: imageUrl,
      });

      // Update the currentUser state in useUserStore
      const updatedUser = { ...currentUser, avatar: imageUrl };
      setCurrentUser(updatedUser); // Use setCurrentUser here

      toast.success("Profile photo updated successfully!");
    } catch (error) {
      console.error("Error updating profile photo:", error);
      toast.error("Failed to update profile photo.");
    }
  };

  if (!currentUser) {
    return (
      <div className="userinfo">
        <p>No user data available.</p>
        <button className="back-to-login-btn" onClick={() => navigate("/")}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="userinfo">
      <div className="user">
        <img src={currentUser.avatar || "./avatar.png"} alt="User Avatar" />
        <div className="user-info">
          <h2 className="userName">{currentUser.fullname}</h2>
          <p className="userTitle">{currentUser.position}</p>
          <button onClick={() => setIsModalOpen(true)}>
            <p className="userStatus">
              {status ? `${status}` : "Set a status"}
            </p>
          </button>
        </div>
      </div>

      <div className="icons">
        <img
          src="./more.png"
          alt="More"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
        {isMenuOpen && (
          <div className="popup-menu">
            <div
              className="menu-item"
              onClick={() => {
                setIsAccountSettingsModalOpen(true);
                setIsMenuOpen(false);
              }}
            >
              Account Settings
            </div>

            {/* Use onClick instead of Link */}
            {currentUser.position === "admin" && (
              <div
                className="menu-item"
                onClick={() => {
                  navigate("/dashboard-list"); // Navigate programmatically
                  setIsMenuOpen(false); // Close the menu
                }}
              >
                Dashboard
              </div>
            )}

            <div className="menu-item" onClick={handleSignOut}>
              Sign Out
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Set a Status</h3>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✖
              </button>
            </div>

            <div className="status-input-container">
              <input
                className="status-input"
                type="text"
                placeholder="Enter your custom status..."
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <button
                className="emoji-btn"
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              >
                😊
              </button>
            </div>

            {isEmojiPickerOpen && (
              <div className="emoji-picker-container">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  skinTonePickerLocation="SEARCH"
                  searchPlaceholder="Search emojis..."
                  width="100%"
                  height="350px"
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}

            <div className="status-list">
              {suggestedStatuses.map((item, index) => (
                <div
                  key={index}
                  className="status-item"
                  onClick={() => handleStatusSelect(item.text)}
                >
                  <span className="emoji">{item.emoji}</span> {item.text}
                </div>
              ))}
            </div>

            <button className="done-btn" onClick={() => setIsModalOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      {isAccountSettingsModalOpen && (
        <div className="modal-overlay">
          <div className="account-settings-modal">
            <div className="modal-header">
              <h3>Account Settings</h3>
              <button
                className="close-btn"
                onClick={() => setIsAccountSettingsModalOpen(false)}
              >
                ✖
              </button>
            </div>

            <div className="account-settings-content">
              {/* Left Section: Personal Details */}
              <div className="personal-details">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={currentUser.fullname || ""}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={currentUser.username || ""}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={currentUser.email || ""}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  {isChangePasswordFormOpen ? (
                    <div className="change-password-form">
                      <div className="form-group">
                        <label>Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="form-group">
                        <label>New Password</label>
                        <div className="password-input-container">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                          <i
                            className={`password-toggle-icon ${
                              showNewPassword
                                ? "fas fa-eye-slash"
                                : "fas fa-eye"
                            }`}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          ></i>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Confirm New Password</label>
                        <div className="password-input-container">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                          <i
                            className={`password-toggle-icon ${
                              showConfirmPassword
                                ? "fas fa-eye-slash"
                                : "fas fa-eye"
                            }`}
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          ></i>
                        </div>
                      </div>
                      <button
                        className="submit-btn"
                        onClick={handlePasswordChange}
                        disabled={isUpdatingPassword}
                      >
                        {isUpdatingPassword ? "Updating..." : "Submit"}
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => setIsChangePasswordFormOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="change-password-btn"
                      onClick={() => setIsChangePasswordFormOpen(true)}
                    >
                      Change Password
                    </button>
                  )}
                </div>
              </div>

              {/* Right Section: Profile Image */}
              <div className="profile-image-section">
                <div className="profile-image-container">
                  <img
                    src={currentUser.avatar || "./avatar.png"}
                    alt="Profile"
                    className="profile-image"
                  />
                  <button
                    className="change-photo-btn"
                    onClick={handleChangePhoto}
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setIsAccountSettingsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={() => setIsAccountSettingsModalOpen(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toastify Container */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default Userinfo;
