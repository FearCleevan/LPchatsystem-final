import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserRoleProvider } from "./context/UserRoleContext";
import AdminDashboard from "./components/admin/AdminDashboard";
import Chat from "./components/chat/Chat";
import List from "./components/list/List";
import Notification from "./components/notification/Notification";
import Login from "./components/login/Login";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomePage from "./components/welcome/WelcomePage";
import ChatRoom from "./components/chatroom/ChatRoom";

// Define ChatListPage as a component that receives chatId and toggleListVisibility as props
const ChatListPage = ({ chatId, toggleListVisibility, isListVisible }) => (
  <div className="container">
    {isListVisible && <List />}
    {chatId ? <Chat toggleListVisibility={toggleListVisibility} /> : <WelcomePage />}
    <Notification />
  </div>
);

const DashboardListPage = () => (
  <div className="container">
    <AdminDashboard />
    <Notification />
  </div>
);

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore(); // Destructure chatId from useChatStore
  const [isListVisible, setIsListVisible] = useState(true); // State to manage List visibility

  // Toggle List visibility
  const toggleListVisibility = () => {
    setIsListVisible((prev) => !prev);
  };

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });

    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  console.log(currentUser);

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <UserRoleProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          {/* Pass chatId, toggleListVisibility, and isListVisible as props to ChatListPage */}
          <Route
            path="/chat-list"
            element={
              <ChatListPage
                chatId={chatId}
                toggleListVisibility={toggleListVisibility}
                isListVisible={isListVisible}
              />
            }
          />
          <Route
            path="/dashboard-list"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DashboardListPage />
              </ProtectedRoute>
            }
          />
          {/* Add a route for the ChatRoom component */}
          <Route
            path="/chat-room"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ChatRoom />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </UserRoleProvider>
  );
};

export default App;