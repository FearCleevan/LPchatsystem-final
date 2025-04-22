import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import "./addUser.css";
import { db } from "../../../../lib/firebase";
import { useUserStore } from "../../../../lib/userStore";
import { useState } from "react";
import { toast } from "react-toastify";

const AddUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const fullname = formData.get("fullname");

    if (!fullname) {
      toast.error("Please enter a full name.");
      return;
    }

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("fullname", "==", fullname));

      const querySnapShot = await getDocs(q);

      if (!querySnapShot.empty) {
        setUser(querySnapShot.docs[0].data());
      } else {
        setUser(null);
        toast.error("No user found with that name.");
      }
    } catch (err) {
      console.log(err);
      toast.error("An error occurred while searching for the user.");
    }
  };

  const handleAdd = async () => {
    if (!user || !currentUser) return;

    setLoading(true);

    const chatRef = collection(db, "chats");
    const userChatsRef = collection(db, "userchats");

    try {
      const userChatsDocRef = doc(userChatsRef, currentUser.id);
      const userChatsDoc = await getDoc(userChatsDocRef);

      // Check if the document exists, if not, create it
      if (!userChatsDoc.exists()) {
        await setDoc(userChatsDocRef, { chats: [] });
      }

      const existingChats = userChatsDoc.data()?.chats || [];

      const isUserAlreadyAdded = existingChats.some(
        (chat) => chat.receiverId === user.id
      );

      if (isUserAlreadyAdded) {
        toast.warning(`${user.fullname} is already added.`);
        setLoading(false);
        return;
      }

      const newChatRef = doc(chatRef);

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      await updateDoc(doc(userChatsRef, user.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: currentUser.id,
          updatedAt: Date.now(),
        }),
      });

      await updateDoc(doc(userChatsRef, currentUser.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: user.id,
          updatedAt: Date.now(),
        }),
      });

      toast.success(`${user.fullname} added successfully!`);
      setUser(null);
    } catch (err) {
      console.log(err);
      toast.error("Failed to add user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Full Name" name="fullname" required />
        <button type="submit">Search</button>
      </form>

      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.fullname}</span>
          </div>
          <button onClick={handleAdd} disabled={loading}>
            {loading ? "Adding..." : "Add User"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AddUser;