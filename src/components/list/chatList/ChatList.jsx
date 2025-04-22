import { useEffect, useState } from "react";
import "./chatList.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import AddUser from "./addUser/AddUser";
import { useUserStore } from "../../../lib/userStore";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";
import { toast } from "react-toastify";

// Utility function to truncate text
const truncateText = (text, maxLength) => {
  if (!text) return "";
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }
  return text;
};

const ChatList = () => {
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);

  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();

  // Fetch and listen for updates to chats
  useEffect(() => {
    if (!currentUser) return;

    setChatsLoading(true);

    // Fetch individual chats
    const unSubIndividual = onSnapshot(
      doc(db, "userchats", currentUser.id),
      async (res) => {
        try {
          if (!res.exists()) {
            console.log("No userchats document found.");
            setChatsLoading(false);
            return;
          }

          const items = res.data().chats || [];

          const promises = items.map(async (item) => {
            try {
              const userDocRef = doc(db, "users", item.receiverId);
              const userDocSnap = await getDoc(userDocRef);

              if (!userDocSnap.exists()) {
                console.log(
                  "User document not found for receiverId:",
                  item.receiverId
                );
                return null;
              }

              const user = userDocSnap.data();
              return { ...item, user, type: "individual" };
            } catch (err) {
              console.error("Error fetching user data:", err);
              return null;
            }
          });

          const individualChats = (await Promise.all(promises)).filter(Boolean);

          // Fetch group chats
          const groupChatsCollection = collection(db, "groupChats");
          const unSubGroupChats = onSnapshot(
            groupChatsCollection,
            (snapshot) => {
              try {
                const groupChats = snapshot.docs
                  .filter((doc) => doc.data().members.includes(currentUser.id))
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    type: "group",
                    isSeen: doc.data().lastSeen?.[currentUser.id] || false,
                    lastMessage: doc.data().lastSeen?.[currentUser.id] ? doc.data().lastMessage : "New message",
                    updatedAt: doc.data().updatedAt || Date.now(),
                  }));

                // Combine individual and group chats
                const allChats = [...individualChats, ...groupChats].sort(
                  (a, b) => b.updatedAt - a.updatedAt
                );

                setChats(allChats);
              } catch (err) {
                console.error("Error processing group chats:", err);
              } finally {
                setChatsLoading(false);
              }
            }
          );

          return () => {
            unSubGroupChats();
          };
        } catch (err) {
          console.error("Error in chats listener:", err);
          setChatsLoading(false);
        }
      }
    );

    return () => {
      unSubIndividual();
    };
  }, [currentUser]);

  // Handle chat selection
  const handleSelect = async (chat) => {
    try {
      if (chat.type === "individual") {
        if (!chat.user) {
          console.error("User data is missing for chat:", chat);
          return;
        }

        const userChats = chats
          .filter((item) => item.type === "individual")
          .map((item) => {
            const { ...rest } = item;
            return rest;
          });

        const chatIndex = userChats.findIndex(
          (item) => item.chatId === chat.chatId
        );

        if (chatIndex === -1) {
          console.error("Chat not found in userChats:", chat.chatId);
          return;
        }

        userChats[chatIndex].isSeen = true;

        const userChatsRef = doc(db, "userchats", currentUser.id);
        await updateDoc(userChatsRef, {
          chats: userChats,
        });
        changeChat(chat.chatId, chat.user, "individual");
      } else if (chat.type === "group") {
        // Update local state first for immediate feedback
        const updatedChats = chats.map((c) => {
          if (c.type === "group" && c.id === chat.id) {
            return { ...c, isSeen: true, lastMessage: chat.lastMessage };
          }
          return c;
        });
        setChats(updatedChats);

        // Update Firestore
        const groupChatsRef = doc(db, "groupChats", chat.id);
        await updateDoc(groupChatsRef, {
          [`lastSeen.${currentUser.id}`]: true,
        });
        changeChat(chat.id, null, "group");
      }
    } catch (err) {
      console.error("Error selecting chat:", err);
      toast.error("Failed to open chat");
    }
  };

  // Filter chats based on search input
  const filteredChats = chats.filter((c) => {
    if (c.type === "individual") {
      return c.user?.fullname?.toLowerCase().includes(input.toLowerCase());
    } else if (c.type === "group") {
      return c.name?.toLowerCase().includes(input.toLowerCase());
    }
    return false;
  });

  return (
    <div className="chatList">
      {/* Search Bar */}
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="" />
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => setInput(e.target.value)}
            disabled={chatsLoading}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt=""
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Chats Section */}
      <div className="section">
        {chatsLoading ? (
          <div className="loading-state">
            <p>Loading chats...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="empty-state">
            <p>No chats found. Start a new conversation!</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              className="item"
              key={chat.chatId || chat.id}
              onClick={() => handleSelect(chat)}
              style={{
                backgroundColor: chat.isSeen ? "transparent" : "#5183fe19",
                borderLeft: chat.isSeen ? "none" : "3px solid #5183fe",
              }}
            >
              <img
                src={
                  chat.type === "individual"
                    ? chat.user?.avatar || "./avatar.png"
                    : chat.avatar || "./group-avatar.png"
                }
                alt=""
                onError={(e) => {
                  e.target.src = "./avatar.png";
                }}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              <div className="texts">
                <span
                  style={{
                    fontWeight: chat.isSeen ? "normal" : "600",
                  }}
                >
                  {chat.type === "individual"
                    ? chat.user?.fullname || "Unknown User"
                    : chat.name}
                  {chat.type === "group" && (
                    <span
                      style={{
                        fontSize: "0.6rem",
                        color: "#b3b5b3",
                        marginLeft: "5px",
                      }}
                    >
                      <br />
                      (Group Chat)
                    </span>
                  )}
                </span>
                <p
                  style={{
                    fontWeight: chat.isSeen ? "normal" : "500",
                  }}
                >
                  {truncateText(chat.lastMessage, 25)}
                  {!chat.isSeen && (
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: "50%",
                        marginLeft: "5px",
                      }}
                    ></span>
                  )}
                </p>
              </div>
              {!chat.isSeen && (
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: "#5183fe",
                    borderRadius: "50%",
                    marginLeft: "auto",
                    alignSelf: "flex-start",
                    marginTop: "5px",
                  }}
                ></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {addMode && <AddUser />}
    </div>
  );
};

export default ChatList;