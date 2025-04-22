import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { FaTimes } from "react-icons/fa";
import "./createGroupChat.css";

const CreateGroupChatModal = ({ isOpen, onClose, onSubmit }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
      setFilteredUsers(usersList);
    };

    fetchUsers();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    const filtered = users.filter((user) =>
      user.fullname.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Upload avatar to Cloudinary
  const uploadAvatar = async () => {
    if (!avatarFile) return null;

    const formData = new FormData();
    formData.append("file", avatarFile);
    formData.append("upload_preset", "lp_upload_preset"); // Replace with your Cloudinary upload preset
    formData.append("cloud_name", "dtebf3uea"); // Replace with your Cloudinary cloud name

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dtebf3uea/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return data.secure_url; // Return the uploaded image URL
    } catch (error) {
      console.error("Error uploading avatar: ", error);
      return null;
    }
  };

  // Add user to selected users
  const handleAddUser = (user) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Remove user from selected users
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!groupName || selectedUsers.length === 0) {
      alert("Please provide a group name and select at least one user.");
      return;
    }

    // Upload avatar to Cloudinary
    const avatarUrl = await uploadAvatar();

    // Pass group data to the parent component
    onSubmit({ groupName, selectedUsers, avatarUrl });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Create Group Chat</h2>
        <input
          type="text"
          placeholder="Name the Group Chat"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* File Input for Avatar */}
        <label htmlFor="avatar-upload" className="file-input-label">
          Upload Group Avatar
        </label>
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={handleAvatarChange}
        />

        {/* Avatar Preview */}
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="Group Avatar Preview"
            className="avatar-preview"
          />
        )}

        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Selected Users Section */}
        <div className="selected-users">
          {selectedUsers.map((user) => (
            <div key={user.id} className="selected-user">
              <img
                src={user.avatar || "./avatar.png"}
                alt={user.fullname}
                className="user-avatar"
                title={user.fullname}
              />
              <FaTimes
                className="remove-icon"
                onClick={() => handleRemoveUser(user.id)}
              />
            </div>
          ))}
        </div>

        {/* User List */}
        <div className="user-list">
          {filteredUsers.map((user) => (
            <div key={user.id} className="user-item">
              <img
                src={user.avatar || "./avatar.png"}
                alt={user.fullname}
                className="user-avatar"
              />
              <span>{user.fullname}</span>
              <button
                className="add-btn"
                onClick={() => handleAddUser(user)}
                disabled={selectedUsers.some((u) => u.id === user.id)}
              >
                Add
              </button>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupChatModal;
