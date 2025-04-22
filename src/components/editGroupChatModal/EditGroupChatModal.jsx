import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { FaTimes } from "react-icons/fa";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const EditGroupChatModal = ({ isOpen, onClose, group, users }) => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // Holds the IDs of selected members
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState(""); // State for group name
  const [avatarFile, setAvatarFile] = useState(null); // State for avatar file
  const [avatarPreview, setAvatarPreview] = useState(""); // State for avatar preview URL

  // Initialize selectedUsers, groupName, and avatarPreview with the current group data
  useEffect(() => {
    if (group) {
      setSelectedUsers(group.members);
      setGroupName(group.name);
      setAvatarPreview(group.avatar || "./group-avatar.png");
    }
  }, [group]);

  // Filter users based on search query and exclude current members
  useEffect(() => {
    if (users) {
      const filtered = users.filter(
        (user) =>
          user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !selectedUsers.includes(user.id) // Exclude users who are already members
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users, selectedUsers]);

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file)); // Preview the uploaded image
    }
  };

  // Upload avatar to Cloudinary (or any other service)
  const uploadAvatar = async () => {
    if (!avatarFile) return avatarPreview;

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
      if (!data.secure_url) {
        throw new Error("Failed to upload avatar");
      }
      return data.secure_url; // Return the uploaded image URL
    } catch (error) {
      console.error("Error uploading avatar: ", error);
      toast.error("Failed to upload avatar. Please try again.");
      return avatarPreview;
    }
  };

  // Add a user to the selected members
  const handleAddUser = (user) => {
    if (!selectedUsers.includes(user.id)) {
      setSelectedUsers([...selectedUsers, user.id]);
    }
  };

  // Remove a user from the selected members
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((id) => id !== userId));
  };

  // Update the group chat in Firestore
  const handleSubmit = async () => {
    try {
      // Upload the new avatar if a file is selected
      const avatarUrl = avatarFile ? await uploadAvatar() : group.avatar;

      // Ensure avatarUrl is not undefined
      if (!avatarUrl) {
        throw new Error("Avatar URL is undefined");
      }

      // Update the group chat document in Firestore
      await updateDoc(doc(db, "groupChats", group.id), {
        name: groupName, // Updated group name
        members: selectedUsers, // Updated members list
        avatar: avatarUrl, // Updated avatar URL
        updatedAt: new Date().toISOString(), // Timestamp for last update
      });

      // Show success toast notification
      toast.success("Group chat updated successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      onClose(); // Close the modal
    } catch (error) {
      console.error("Error updating group chat: ", error);

      // Show error toast notification
      toast.error("Failed to update group chat. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Edit Group Chat: {group.name}</h2>

        {/* Group Name Input */}
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* Avatar Upload */}
        <label htmlFor="avatar-upload" className="file-input-label">
          Upload New Group Avatar
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

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Selected Users Section */}
        <div className="selected-users">
          {selectedUsers.map((userId) => {
            const user = users.find((u) => u.id === userId);
            return (
              <div key={userId} className="selected-user">
                <img
                  src={user?.avatar || "./avatar.png"}
                  alt={user?.fullname}
                  className="user-avatar"
                  title={user?.fullname}
                />
                <span>{user?.fullname}</span>
                <FaTimes
                  className="remove-icon"
                  onClick={() => handleRemoveUser(userId)}
                />
              </div>
            );
          })}
        </div>

        {/* User List (Non-members) */}
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
                disabled={selectedUsers.includes(user.id)}
              >
                Add
              </button>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Update</button>
        </div>
      </div>
    </div>
  );
};

export default EditGroupChatModal;
