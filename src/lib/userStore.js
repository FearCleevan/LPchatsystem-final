import { create } from "zustand";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Security validators
const validateUserData = (userData) => {
  if (!userData || typeof userData !== 'object') return false;
  if (!userData.uid || typeof userData.uid !== 'string') return false;
  if (!Array.isArray(userData.blocked)) return false;
  return true;
};

export const useUserStore = create((set, get) => ({
  currentUser: null,
  isLoading: true,
  lastFetchTime: 0,

  fetchUserInfo: async (uid) => {
    if (!uid || typeof uid !== 'string') {
      return set({ currentUser: null, isLoading: false });
    }

    // Rate limiting
    const now = Date.now();
    if (now - get().lastFetchTime < 2000) {
      console.warn('User data fetch too frequent');
      return;
    }

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = { uid, ...docSnap.data() };
        
        if (!validateUserData(userData)) {
          throw new Error('Invalid user data structure');
        }

        // Sanitize blocked array
        const sanitizedBlocked = Array.isArray(userData.blocked) 
          ? userData.blocked.filter(id => typeof id === 'string')
          : [];

        set({ 
          currentUser: { ...userData, blocked: sanitizedBlocked },
          isLoading: false,
          lastFetchTime: now
        });
      } else {
        set({ currentUser: null, isLoading: false, lastFetchTime: now });
      }
    } catch (err) {
      console.error('Security error fetching user:', err);
      set({ currentUser: null, isLoading: false, lastFetchTime: now });
    }
  },

  clearUser: () => set({ 
    currentUser: null, 
    isLoading: false 
  }),

  setCurrentUser: (userData) => {
    if (!validateUserData(userData)) {
      console.error('Attempt to set invalid user data');
      return;
    }
    set({ currentUser: userData });
  },
}));

// Secure auth state listener
const auth = getAuth();
const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
  if (user) {
    // Additional validation for auth user
    if (user.uid && typeof user.uid === 'string') {
      useUserStore.getState().fetchUserInfo(user.uid);
    } else {
      console.error('Invalid auth user object');
      useUserStore.getState().clearUser();
    }
  } else {
    useUserStore.getState().clearUser();
  }
});

// Cleanup function for when store is no longer needed
export const cleanupUserStore = () => {
  unsubscribeAuth();
};