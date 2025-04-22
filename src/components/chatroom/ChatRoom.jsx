import {
  FaBell,
  // FaCog,
  FaComments,
  FaSignOutAlt,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import "./chatRoom.css";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { useUserStore } from "../../lib/userStore";
import { db } from "../../lib/firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CreateGroupChatModal from "../../components/createGroupChatModal/CreateGroupChatModal";
import ViewGroupChatModal from "../../components/viewGroupChatModal/ViewGroupChatModal";
import EditGroupChatModal from "../../components/editGroupChatModal/EditGroupChatModal";

const ChatRoom = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { currentUser } = useUserStore();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  // Fetch group chats from Firestore
  useEffect(() => {
    const fetchGroupChats = async () => {
      try {
        const groupChatsCollection = collection(db, "groupChats");
        const unsubscribe = onSnapshot(groupChatsCollection, (snapshot) => {
          const groupChatsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setGroupChats(groupChatsList);
        });

        return () => unsubscribe(); // Cleanup on unmount
      } catch (error) {
        console.error("Error fetching group chats: ", error);
      }
    };

    fetchGroupChats();
  }, []);

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users: ", error);
      }
    };

    fetchUsers();
  }, []);

  // Handle group chat creation
  const handleCreateGroupChat = async ({
    groupName,
    selectedUsers,
    avatarUrl,
  }) => {
    if (!groupName || selectedUsers.length === 0) {
      toast.error("Please provide a group name and select at least one user.");
      return;
    }

    try {
      // Prepare the group chat data
      const groupChatData = {
        name: groupName,
        members: selectedUsers.map((user) => user.id), // Save user IDs
        avatar: avatarUrl || "./group-avatar.png", // Use the uploaded avatar or a default one
        createdAt: new Date().toISOString(), // Timestamp for creation
        updatedAt: new Date().toISOString(), // Timestamp for last update
      };

      // Add the group chat to Firestore
      const groupChatsCollection = collection(db, "groupChats");
      await addDoc(groupChatsCollection, groupChatData);

      // Close the modal
      setIsCreateModalOpen(false);
      toast.success("Group chat created successfully!");
    } catch (error) {
      console.error("Error creating group chat: ", error);
      toast.error("Failed to create group chat. Please try again.");
    }
  };

  // Handle viewing group chat members
  const handleViewMembers = (group) => {
    setSelectedGroup(group);
    setIsViewModalOpen(true);
  };

  // Handle editing group chat members
  const handleEditMembers = (group) => {
    setSelectedGroup(group);
    setIsEditModalOpen(true);
  };

  // Handle deleting group chat
  const handleDeleteGroupChat = async (group) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the group chat "${group.name}"?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "groupChats", group.id));
      toast.success("Group chat deleted successfully!");
    } catch (error) {
      console.error("Error deleting group chat: ", error);
      toast.error("Failed to delete group chat. Please try again.");
    }
  };

  // Fetch unread messages count
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

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter group chats based on search query
  const filteredGroupChats = groupChats.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNotificationClick = () => {
    setNotificationCount(0);
    navigate("/chat-list");
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <ul>
            <li>
              <Link to="/dashboard-list">
                <FaUserShield /> Dashboard
              </Link>
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
            <li className="logout">
              <FaSignOutAlt /> Log Out
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <div className="user-header">
          <div className="page-title-left">
            <h1>Chat Room</h1>
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

        <div className="user-table-container">
          <h2>Group Chat List</h2>
          <input
            type="text"
            className="search-bar"
            placeholder="Search by group chat name..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <div className="table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Group Chat Name</th>
                  <th>Members</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroupChats.length > 0 ? (
                  filteredGroupChats.map((group) => (
                    <tr key={group.id}>
                      <td>
                        <img
                          src={group.avatar || "./group-avatar.png"}
                          alt={group.name}
                          className="group-avatar"
                        />
                      </td>
                      <td>{group.name}</td>
                      <td>
                        <div className="member-avatarss">
                          {group.members.map((userId) => {
                            const user = users.find((u) => u.id === userId);
                            return (
                              <img
                                key={userId}
                                src={user?.avatar || "./avatar.png"}
                                alt={user?.fullname || "Unknown User"}
                                className="member-avatars"
                                title={user?.fullname || "Unknown User"}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td>{new Date(group.createdAt).toLocaleString()}</td>
                      <td className="action-buttons">
                        <div
                          className="actions"
                          style={{ display: "flex", gap: "8px" }}
                        >
                          <button
                            className="edit-btn"
                            onClick={() => handleViewMembers(group)}
                            style={{
                              background: "#4285F4",
                              color: "#fff",
                            }}
                            title="View Members"
                          >
                            <i
                              className="fas fa-eye"
                              style={{ fontSize: "16px" }}
                            />
                          </button>
                          <button
                            className="edit-btn"
                            onClick={() => handleEditMembers(group)}
                            style={{
                              background: "#5F6368",
                              color: "#fff",
                            }}
                            title="Edit Group"
                          >
                            <i
                              className="fas fa-edit"
                              style={{ fontSize: "16px" }}
                            />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteGroupChat(group)}
                            title="Delete Group"
                          >
                            <i
                              className="fas fa-trash-alt"
                              style={{ fontSize: "16px" }}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-results">
                      No group chats found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            className="add-user-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Group Chat
          </button>
        </div>
      </div>

      {/* Modal for creating group chat */}
      <CreateGroupChatModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGroupChat}
      />

      {/* Modal for viewing group chat */}
      {selectedGroup && (
        <ViewGroupChatModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          group={selectedGroup}
          users={users}
        />
      )}

      {/* Modal for editing group chat */}
      {selectedGroup && (
        <EditGroupChatModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          group={selectedGroup}
          users={users}
        />
      )}
    </div>
  );
};

export default ChatRoom;
