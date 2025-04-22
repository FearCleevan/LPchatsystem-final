import { create } from "zustand";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,

  // Fetch user info from Firestore
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Merge Firestore data with the uid
        const userData = { uid, ...docSnap.data() };
        set({ currentUser: userData, isLoading: false });
      } else {
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
    }
  },

  // Clear user data
  clearUser: () => set({ currentUser: null, isLoading: false }),

  // Update currentUser
  setCurrentUser: (userData) => set({ currentUser: userData }),
}));

// Listen for auth state changes
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (user) {
    useUserStore.getState().fetchUserInfo(user.uid); // Fetch user info when authenticated
  } else {
    useUserStore.getState().clearUser(); // Clear user info when not authenticated
  }
});