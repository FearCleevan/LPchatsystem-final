import { useState, useEffect } from "react";
import "./detail.css";
import { Link, useNavigate } from "react-router-dom";
import { useUserRole } from "../../context/UserRoleContext";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

const Detail = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [sharedPhotos, setSharedPhotos] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [chat, setChat] = useState(null); // Add state for chat details
  const { userRole, setUserRole } = useUserRole();
  const navigate = useNavigate();
  const { currentUser, clearUser } = useUserStore();
  const { chatId, user, chatType } = useChatStore();

  useEffect(() => {
    if (!chatId) return;

    const collectionName = chatType === "group" ? "groupChats" : "chats";

    const fetchChatDetails = async () => {
      const chatDoc = await getDoc(doc(db, collectionName, chatId));
      if (chatDoc.exists()) {
        setChat(chatDoc.data());
      }
    };

    fetchChatDetails();

    const unSub = onSnapshot(doc(db, collectionName, chatId), (doc) => {
      if (doc.exists()) {
        const messages = doc.data().messages;
        const photos = messages
          .flatMap(
            (message) =>
              message.img.map((url, index) => ({
                url,
                name:
                  message.imgNames && message.imgNames[index]
                    ? message.imgNames[index]
                    : `Photo ${index + 1}`,
              })) || []
          )
          .filter((img) => img);
        setSharedPhotos(photos);

        const files = messages
          .flatMap((message) => message.docs || [])
          .filter((doc) => doc);
        setSharedFiles(files);
      }
    });

    return () => unSub();
  }, [chatId, chatType]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUserRole(null);
      localStorage.removeItem("userRole");
      clearUser();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const togglePhotos = () => {
    setShowPhotos((prev) => !prev);
    setShowFiles(false);
  };

  const toggleFiles = () => {
    setShowFiles((prev) => !prev);
    setShowPhotos(false);
  };

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length > maxLength) {
      return text.slice(0, maxLength) + "...";
    }
    return text;
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="detail">
      <div className="user">
        <img
          src={
            chatType === "group"
              ? chat?.avatar || "./group-avatar.png"
              : user?.avatar || "./avatar.png"
          }
          alt={chatType === "group" ? "Group Avatar" : "User Avatar"}
        />
        <h2>
          {chatType === "group"
            ? chat?.name || "Unknown Group"
            : user?.fullname || "Unknown User"}
        </h2>
        <p>
          {chatType === "group"
            ? "Group Chat"
            : user?.position || "Unknown Role"}
        </p>
      </div>

      <div className="info">
        <div className="option">
          <div className="title">
            <span>Chat Settings</span>
            <img src="./arrowUp.png" alt="Toggle" />
          </div>
        </div>

        <div className="option">
          <div className="title">
            <span>Privacy & Help</span>
            <img src="./arrowUp.png" alt="Toggle" />
          </div>
        </div>

        <div className="option">
          <div className="title" onClick={togglePhotos}>
            <span>Shared Photos</span>
            <img
              src={showPhotos ? "./arrowDown.png" : "./arrowUp.png"}
              alt="Toggle"
            />
          </div>
          {showPhotos && (
            <div className="photos">
              {sharedPhotos.map((img, index) => (
                <div className="photoItem" key={index}>
                  <div className="photoDetail">
                    <img
                      src={img.url}
                      alt="Shared"
                      onClick={() => setSelectedImage(img.url)}
                    />
                    <span>{truncateText(img.name, 13)}</span>
                  </div>
                  <a href={img.url} download>
                    <img src="./download.png" alt="Download" className="icon" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="option">
          <div className="title" onClick={toggleFiles}>
            <span>Shared Files</span>
            <img
              src={showFiles ? "./arrowDown.png" : "./arrowUp.png"}
              alt="Toggle"
            />
          </div>
          {showFiles && (
            <div className="photos">
              {sharedFiles.map((file, index) => (
                <div className="photoItem" key={index}>
                  <div className="photoDetail">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src="./document-256.png" alt="File" />
                    </a>
                    <span>{truncateText(file.name, 13)}</span>
                  </div>
                  <a href={file.url} download>
                    <img src="./download.png" alt="Download" className="icon" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {userRole === "admin" && (
          <button className="logout">
            <Link to="/dashboard-list">Back to Dashboard</Link>
          </button>
        )}
      </div>

      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content">
            <img src={selectedImage} alt="Preview" />
          </div>
        </div>
      )}

      <div className="buttons">
        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Detail;
