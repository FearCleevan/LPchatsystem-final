import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaUsers,
  FaUserShield,
  FaComments,
  // FaCog,
  FaSignOutAlt,
  FaBell,
} from "react-icons/fa";
import "./admindashboard.css";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useUserStore } from "../../lib/userStore";

const AdminDashboard = () => {
  const { currentUser } = useUserStore();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });
  const [notificationCount, setNotificationCount] = useState(0); // Initialize notification count
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      doc(db, "userchats", currentUser.id),
      (doc) => {
        if (doc.exists()) {
          const chats = doc.data().chats;
          let newMessageCount = 0;

          // Check for unread messages
          chats.forEach((chat) => {
            if (!chat.isSeen) {
              newMessageCount++;
            }
          });

          setNotificationCount(newMessageCount);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = () => {
    // Reset notification count when the admin clicks the notification icon
    setNotificationCount(0);
    navigate("/chat-list"); // Redirect to the chat list or messages page
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCloudinaryWidget = () => {
    window.cloudinary.openUploadWidget(
      {
        cloudName: "dtebf3uea",
        uploadPreset: "lp_upload_preset",
        sources: ["local", "url"],
        multiple: false,
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          setAvatar({
            file: null,
            url: result.info.secure_url,
          });
        }
      }
    );
  };

  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { fullname, username, email, password, confirmPassword, role } =
      Object.fromEntries(formData);

    // Check if passwords match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      // 1. First create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const newUserId = user.uid;

      // 2. Then create Firestore document
      await setDoc(doc(db, "users", newUserId), {
        username,
        email,
        id: newUserId,
        position: role,
        fullname,
        avatar: avatar.url,
        blocked: [],
        isActive: false,
        createdAt: new Date(),
      });

      await setDoc(doc(db, "userchats", newUserId), {
        chats: [],
      });

      const updatedUser = {
        id: newUserId,
        fullname,
        username,
        email,
        position: role,
        avatar: avatar.url,
        isActive: false,
      };

      setUsers((prevUsers) => [...prevUsers, updatedUser]);

      toast.success(`Account created successfully for ${fullname}`, {
        autoClose: 3000,
      });

      setTimeout(() => {
        setShowModal(false);
      }, 3000);
    } catch (err) {
      console.error("Error during registration:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { fullname, username, role } = Object.fromEntries(formData);

    try {
      await updateDoc(doc(db, "users", userToEdit.id), {
        fullname,
        username,
        position: role,
        avatar: avatar.url || userToEdit.avatar,
      });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userToEdit.id
            ? {
                ...user,
                fullname,
                username,
                position: role,
                avatar: avatar.url || user.avatar,
              }
            : user
        )
      );

      toast.success("User updated successfully!");
      setShowEditModal(false);
    } catch (err) {
      console.error("Error during update:", err);
      toast.error("Failed to update user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      await deleteDoc(doc(db, "users", userToDelete.id));

      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userToDelete.id)
      );

      toast.success("User deleted successfully!");
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Error during deletion:", err);
      toast.error("Failed to delete user. Please try again.");
    }
  };

  const handleLogout = async () => {
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

  const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
      return text.slice(0, maxLength) + "...";
    }
    return text;
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
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <ul>
            <li>
              <FaUserShield /> Dashboard
            </li>
            <li className="links">
              <Link to="/chat-list">
                <FaComments /> Chat List
              </Link>
            </li>
            <li>
              <Link to="/chat-room">
                <FaUsers /> Chat Room
              </Link>
            </li>
            {/* <li>
              <FaCog /> Account Settings
            </li> */}
            <li className="logout" onClick={handleLogout}>
              <FaSignOutAlt /> Log Out
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <div className="user-header">
          <div className="page-title-left">
            <h1>Dashboard</h1>
          </div>

          <div className="user-header-right">
            <div
              className="notification-icon"
              onClick={handleNotificationClick}
            >
              <FaBell />
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </div>
            <div className="user-info">
              <img
                src={currentUser.avatar || "./avatar.png"}
                alt="User Avatar"
                className="user-avatar"
              />
              <div className="user-details">
                <span className="user-name">{currentUser.fullname}</span>
                <span className="user-role">{currentUser.position}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <FaUser className="stat-icon" />
            <h3>Agents</h3>
            <p>{users.filter((user) => user.position === "agent").length}</p>
          </div>
          <div className="stat-card">
            <FaUserShield className="stat-icon" />
            <h3>Team Leaders</h3>
            <p>
              {users.filter((user) => user.position === "teamleader").length}
            </p>
          </div>
          <div className="stat-card">
            <FaUserShield className="stat-icon" />
            <h3>Admins</h3>
            <p>{users.filter((user) => user.position === "admin").length}</p>
          </div>
          <div className="stat-card">
            <FaUsers className="stat-icon" />
            <h3>Online Users</h3>
            <p>{users.filter((user) => user.isActive).length}</p>
          </div>
        </div>

        <div className="user-table-container">
          <h2>User List</h2>
          <input
            type="text"
            className="search-bar"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 100).map((user) => (
                  <tr key={user.id}>
                    <td className="user-info">
                      <div className="avatar-container">
                        <img
                          src={user.avatar || "./avatar.png"}
                          alt="User Avatar"
                          className="avatar"
                        />
                        <div
                          className={`status-dot ${
                            user.isActive ? "active" : "inactive"
                          }`}
                        ></div>
                      </div>
                    </td>
                    <td>{truncateText(user.fullname, 12)}</td>
                    <td>{truncateText(user.username, 12)}</td>
                    <td>{truncateText(user.email, 12)}</td>
                    <td>{truncateText(user.position, 12)}</td>
                    <td>{user.isActive ? "Online" : "Offline"}</td>
                    <td className="action-buttons">
                      <div
                        className="actions"
                        style={{ display: "flex", gap: "8px" }}
                      >
                        <button
                          className="edit-btn"
                          onClick={() => handleEditUser(user)}
                          style={{
                            background: "#5F6368",
                            color: "#fff",
                          }}
                          title="Edit User"
                        >
                          <i
                            className="fas fa-edit"
                            style={{ fontSize: "16px" }}
                          />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteUser(user)}
                          style={{
                            background: "#FF4444",
                            color: "#fff",
                          }}
                          title="Delete User"
                        >
                          <i
                            className="fas fa-trash-alt"
                            style={{ fontSize: "16px" }}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="add-user-btn" onClick={() => setShowModal(true)}>
            Add User
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-container">
          <div className="modal">
            <h2>Add New User</h2>
            <form onSubmit={handleRegister}>
              <label htmlFor="file" className="avatar-upload">
                <img src={avatar.url || "./avatar.png"} alt="User Avatar" />
                <button
                  type="button"
                  onClick={openCloudinaryWidget}
                  style={{
                    backgroundColor: "#4285F4",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    marginTop: "8px",
                    ":hover": {
                      backgroundColor: "#3367D6",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    },
                  }}
                >
                  Upload an Image
                </button>
              </label>
              <input
                type="text"
                placeholder="Full Name"
                name="fullname"
                required
              />
              <input
                type="text"
                placeholder="Username"
                name="username"
                required
              />
              <input type="email" placeholder="Email" name="email" required />
              <input
                type="password"
                placeholder="Password"
                name="password"
                required
                minLength="6"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                name="confirmPassword"
                required
                minLength="6"
              />
              <select
                name="role"
                className="styled-select"
                defaultValue=""
                required
              >
                <option disabled value="">
                  Select a role
                </option>
                <option value="agent">Agent</option>
                <option value="teamleader">Team Leader</option>
                <option value="admin">Admin</option>
              </select>
              <div className="modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button disabled={loading} className="add-btn" type="submit">
                  {loading ? "Loading" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-container">
          <div className="modal">
            <h2>Edit User</h2>
            <form onSubmit={handleUpdateUser}>
              <label htmlFor="file" className="avatar-upload">
                <img
                  src={avatar.url || userToEdit.avatar || "./avatar.png"}
                  alt="User Avatar"
                />
                <button type="button" onClick={openCloudinaryWidget}>
                  Upload an Image
                </button>
              </label>
              <input
                type="text"
                placeholder="Full Name"
                name="fullname"
                defaultValue={userToEdit.fullname}
              />
              <input
                type="text"
                placeholder="Username"
                name="username"
                defaultValue={userToEdit.username}
              />
              <input
                type="email"
                placeholder="Email"
                disabled
                name="email"
                defaultValue={userToEdit.email}
                style={{ cursor: "not-allowed" }}
              />
              <select
                name="role"
                className="styled-select"
                defaultValue={userToEdit.position}
              >
                <option value="agent">Agent</option>
                <option value="teamleader">Team Leader</option>
                <option value="admin">Admin</option>
              </select>
              <div className="modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    borderRadius: "5px",
                    transition: "all 0.3s ease",
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  className="add-btn"
                  style={{
                    borderRadius: "5px",
                    transition: "all 0.3s ease",
                  }}
                >
                  {loading ? "Loading" : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-container">
          <div className="modal">
            <h2>Delete User</h2>
            <p>Are you sure you want to delete this account?</p>
            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button className="delete-btn" onClick={confirmDeleteUser}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
