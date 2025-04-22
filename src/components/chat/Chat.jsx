import { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import Call from "../call/Call";

const Chat = () => {
  const [chat, setChat] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [activeTab, setActiveTab] = useState("chat"); // State to manage active tab
  const [token, setToken] = useState(null); // Add token state

  const { currentUser } = useUserStore();
  const { chatId, user, chatType } = useChatStore();

  const endRef = useRef(null);
  const inputRef = useRef(null);

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const fetchToken = async (channelName, uid) => {
    try {
      const response = await fetch(
        `http://localhost:3000/generate-token?channelName=${channelName}&uid=${uid}`
      );
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null;
    }
  };

  const notifyUserAboutCall = async () => {
    const callData = {
      callerId: currentUser.id,
      callerName: currentUser.fullname,
      channelName: chatId,
      callType: callType,
      status: "ringing",
      timestamp: new Date(),
    };

    await updateDoc(doc(db, "calls", chatId), callData);
  };

  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState(null);

  const startCall = async (type) => {
    const token = await fetchToken(chatId, currentUser.id);
    if (token) {
      setToken(token);
      setIsCalling(true);
      setCallType(type);
      notifyUserAboutCall();
    } else {
      console.error("Failed to fetch token");
    }
  };

  const stopCall = () => {
    setIsCalling(false);
    setCallType(null);
    updateDoc(doc(db, "calls", chatId), { status: "ended" });
  };

  useEffect(() => {
    if (!chatId) return;

    const unSub = onSnapshot(doc(db, "calls", chatId), (doc) => {
      if (doc.exists()) {
        const callData = doc.data();
        if (callData.status === "ringing") {
          const shouldAnswer = window.confirm(
            `${callData.callerName} is calling. Do you want to answer?`
          );

          if (shouldAnswer) {
            updateDoc(doc(db, "calls", chatId), { status: "answered" });
            setIsCalling(true);
            setCallType(callData.callType);
          } else {
            updateDoc(doc(db, "calls", chatId), { status: "declined" });
          }
        }
      }
    });

    return () => unSub();
  }, [chatId]);

  const normalizedMessages = chat?.messages?.map((message) => ({
    ...message,
    img: Array.isArray(message.img)
      ? message.img
      : message.img
      ? [message.img]
      : [],
    docs: Array.isArray(message.docs)
      ? message.docs
      : message.docs
      ? [message.docs]
      : [],
  }));

  const allImages = normalizedMessages
    ?.flatMap((message) => message.img)
    .filter((img) => img);

  const allFiles = normalizedMessages
    ?.flatMap((message) => message.docs)
    .filter((doc) => doc);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    if (!chatId) return;

    const collectionName = chatType === "group" ? "groupChats" : "chats";

    const unSub = onSnapshot(doc(db, collectionName, chatId), async (res) => {
      if (res.exists()) {
        const chatData = res.data();
        const messages = Array.isArray(chatData?.messages)
          ? chatData.messages
          : [];

        if (chatType === "group") {
          const senderIds = [...new Set(messages.map((msg) => msg.senderId))];
          const userProfiles = await Promise.all(
            senderIds.map(async (id) => {
              const userDoc = await getDoc(doc(db, "users", id));
              return { id, ...userDoc.data() };
            })
          );
          const profiles = userProfiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
          setUserProfiles(profiles);
        }

        const lastMessage = messages[messages.length - 1];
        if (
          lastMessage?.senderId !== currentUser.id &&
          lastMessage?.status === "delivered"
        ) {
          const updatedMessages = messages.map((msg, index) =>
            index === messages.length - 1 ? { ...msg, status: "seen" } : msg
          );

          updateDoc(doc(db, collectionName, chatId), {
            messages: updatedMessages,
          });
        }

        setChat(chatData);
      } else {
        setChat(null);
      }
    });

    return () => {
      unSub();
    };
  }, [chatId, currentUser?.id, chatType]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "lp_upload_preset");
    formData.append("cloud_name", "dtebf3uea");

    const endpoint = file.type.startsWith("image")
      ? "image/upload"
      : "raw/upload";

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dtebf3uea/${endpoint}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return {
        url: data.secure_url,
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "file",
      };
    } catch (err) {
      console.error("Error uploading file:", err);
      return null;
    }
  };

  const handleSend = async () => {
    if (!currentUser) {
      console.error("User is not logged in.");
      return;
    }

    if (text === "" && files.length === 0) return;

    const uploads = await Promise.all(files.map((file) => handleUpload(file)));

    const newMessage = {
      senderId: currentUser.id,
      text: text || "",
      img: uploads
        .filter((upload) => upload?.type === "image")
        .map((upload) => upload.url),
      docs: uploads
        .filter((upload) => upload?.type === "file")
        .map((upload) => ({
          url: upload.url,
          name: upload.name,
        })),
      createdAt: new Date(),
      status: "delivered",
    };

    const collectionName = chatType === "group" ? "groupChats" : "chats";

    await updateDoc(doc(db, collectionName, chatId), {
      messages: arrayUnion(newMessage),
      lastMessage: text || "📷 Image",
      updatedAt: Date.now(),
      [`isSeen.${currentUser.id}`]: true,
    });

    if (chatType === "individual") {
      const userIDs = [currentUser.id, user.id];

      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();

          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId
          );

          userChatsData.chats[chatIndex].lastMessage = text || "📷 Image";
          userChatsData.chats[chatIndex].isSeen =
            id === currentUser.id ? true : false;
          userChatsData.chats[chatIndex].updatedAt = Date.now();

          await updateDoc(userChatsRef, {
            chats: userChatsData.chats,
          });
        }
      });
    }

    setText("");
    setFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          setFiles((prev) => [...prev, file]);
        }
      }
    }
  };

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.addEventListener("paste", handlePaste);
    }
    return () => {
      if (input) {
        input.removeEventListener("paste", handlePaste);
      }
    };
  }, []);

  const handleImageClick = (image, index) => {
    setPreviewImage(image);
    setPreviewIndex(index);
    setShowPreviewModal(true);
  };

  const handleNextImage = () => {
    if (previewIndex < allImages.length - 1) {
      setPreviewIndex(previewIndex + 1);
      setPreviewImage(allImages[previewIndex + 1]);
    }
  };

  const handlePrevImage = () => {
    if (previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
      setPreviewImage(allImages[previewIndex - 1]);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes("word")) return "./ms-word-icon.png";
    if (fileType.includes("pdf")) return "./pdf-icon.png";
    if (fileType.includes("powerpoint")) return "./pptx-icon.png";
    // Add more file types as needed
    return "./default-file-icon.png";
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <div className="avatar-container">
            <img
              src={
                chatType === "group"
                  ? chat?.avatar || "./group-avatar.png"
                  : user?.avatar || "./avatar.png"
              }
              alt={chatType === "group" ? "Group Avatar" : "User Avatar"}
              className="avatar"
            />
            <div
              className={`status-dot ${user?.isActive ? "active" : "inactive"}`}
            ></div>
          </div>
          <div className="user-info">
            <h2 className="userName">
              {chatType === "group"
                ? chat?.name
                : user?.fullname || "Unknown User"}
            </h2>
          </div>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`tab ${activeTab === "files" ? "active" : ""}`}
            onClick={() => setActiveTab("files")}
          >
            Files
          </button>
          <button
            className={`tab ${activeTab === "photos" ? "active" : ""}`}
            onClick={() => setActiveTab("photos")}
          >
            Photos
          </button>
        </div>
        {/* <div className="icons">
          <img
            src="./phone.png"
            alt="Voice Call"
            className="img-icons"
            onClick={() => startCall("audio")}
          />
          <img
            src="./video.png"
            alt="Video Call"
            className="img-icons"
            onClick={() => startCall("video")}
          />
          <img src="./info.png" alt="" className="img-icons" />
        </div> */}
      </div>

      {isCalling && (
        <div className="call-overlay">
          <Call
            channelName={chatId} // Use the chat ID as the channel name
            appId="0223d0bea5584210af011a8878b35f5b" // Hardcoded App ID for testing
            token={token} // Pass the token state
            uid={currentUser.id} // Use the current user's ID
            callType={callType} // "audio" or "video"
          />
          <button onClick={stopCall}>End Call</button>
        </div>
      )}

      <div className="center">
        {activeTab === "chat" && (
          <>
            {normalizedMessages?.map((message, index) => (
              <div
                className={`message ${
                  message.senderId === currentUser.id ? "own" : ""
                }`}
                key={message.createdAt}
              >
                {message.senderId !== currentUser.id &&
                  chatType === "group" && (
                    <div className="message-user-info">
                      <img
                        src={
                          userProfiles[message.senderId]?.avatar ||
                          "./avatar.png"
                        }
                        alt="User Avatar"
                        className="message-avatar"
                      />
                      <span className="message-username">
                        {userProfiles[message.senderId]?.fullname ||
                          "Unknown User"}
                      </span>
                    </div>
                  )}
                <div className="texts">
                  {message.img?.map((imgSrc, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={imgSrc}
                      alt="Chat image"
                      className="chat-image"
                      onClick={() => handleImageClick(imgSrc, imgIndex)}
                    />
                  ))}
                  {message.docs?.map((doc, docIndex) => (
                    <a
                      key={docIndex}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doc-link"
                    >
                      📄 {doc.name || "Document"}
                    </a>
                  ))}
                  {message.text && <p>{message.text}</p>}
                  <span>
                    {new Date(message.createdAt?.toDate()).toLocaleTimeString()}
                  </span>
                  {index === normalizedMessages.length - 1 &&
                    message.senderId === currentUser.id && (
                      <span className="message-status">
                        {message.status === "delivered" ? "Delivered" : "Seen"}
                      </span>
                    )}
                </div>
              </div>
            ))}
            <div ref={endRef}></div>
          </>
        )}

        {activeTab === "files" && (
          <div className="files-section">
            {allFiles.length > 0 ? (
              allFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-link"
                  >
                    📄 {file.name || "Document"}
                  </a>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <img
                  src="./empty-files.png"
                  alt="No files"
                  className="empty-icon"
                />
                <p>No files shared yet.</p>
                <p>Upload files to share them in this chat.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "photos" && (
          <div className="photos-section">
            {allImages.length > 0 ? (
              allImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt="Chat image"
                  className="photo-thumbnail"
                  onClick={() => handleImageClick(image, index)}
                />
              ))
            ) : (
              <div className="empty-state">
                <img
                  src="./empty-files.png"
                  alt="No photos"
                  className="empty-icon"
                />
                <p>No photos shared yet.</p>
                <p>Upload photos to share them in this chat.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bottom">
        <div
          className="file-previews-container"
          style={{
            maxHeight: "110px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            padding: "5px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(17, 25, 40, 0.5) transparent",
          }}
        >
          {files.map((file, index) => (
            <div
              key={index}
              style={{
                position: "relative",
                width: "80px",
                height: "100px",
                borderRadius: "8px",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Remove button */}
              <button
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  background: "rgba(255, 0, 0, 0.85)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  cursor: "pointer",
                  zIndex: 2,
                }}
                onClick={() => handleRemoveFile(index)}
              >
                ✖
              </button>

              {/* File name overlay - added to both images and files */}
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "0",
                  right: "0",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  padding: "4px",
                  fontSize: "10px",
                  textAlign: "center",
                  zIndex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {file.name}
              </div>

              {file.type.startsWith("image") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "rgba(0, 0, 0, 0.26)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px",
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src={getFileIcon(file.type)}
                    alt="File Icon"
                    style={{ width: "40px", height: "40px" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="input-container">
          {(currentUser.position === "admin" ||
            currentUser.position === "teamleader") && (
            <div className="action-icons">
              <label htmlFor="file" className="icon-button">
                <img src="./send-file.png" alt="Attach file" />
              </label>
              <input
                type="file"
                id="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
                multiple
                accept="image/*, .doc, .docx, .pdf, .ppt, .pptx"
              />
            </div>
          )}
          <div className="text-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
          </div>
          <button
            className="icon-button"
            onClick={() => setOpen((prev) => !prev)}
          >
            <img src="./emoji.png" alt="Emoji picker" />
          </button>
          <button
            className="send-button"
            onClick={handleSend}
            style={{
              backgroundColor: isHovered ? "#0056b3" : "#007bff", // Change color on hover
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "12px",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            Send
          </button>
        </div>

        {open && (
          <div className="emoji-picker">
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        )}
      </div>

      {showPreviewModal && (
        <div
          className="preview-modal"
          onClick={() => setShowPreviewModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-modal"
              onClick={() => setShowPreviewModal(false)}
            >
              ✖
            </button>
            <div className="image-container">
              <img src={previewImage} alt="Preview" className="zoomed-image" />
            </div>
            <button className="nav-button prev" onClick={handlePrevImage}>
              &#10094;
            </button>
            <button className="nav-button next" onClick={handleNextImage}>
              &#10095;
            </button>
            <div className="thumbnail-container">
              {allImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt="Thumbnail"
                  className={`thumbnail ${
                    index === previewIndex ? "active" : ""
                  }`}
                  onClick={() => {
                    setPreviewImage(image);
                    setPreviewIndex(index);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
