import { create } from "zustand";
import { useUserStore } from "./userStore";

// Security validators
const validateChatId = (chatId) => {
  if (typeof chatId !== 'string' || !chatId.match(/^[a-zA-Z0-9_-]{20}$/)) {
    throw new Error('Invalid chat ID format');
  }
  return true;
};

const validateUserObject = (user) => {
  if (!user || typeof user !== 'object') return false;
  if (!user.id || typeof user.id !== 'string') return false;
  if (!Array.isArray(user.blocked)) return false;
  return true;
};

export const useChatStore = create((set) => ({
  chatId: null,
  user: null,
  chatType: null,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  lastActionTimestamp: 0,

  changeChat: (chatId, user, chatType = "individual") => {
    // Rate limiting check
    const now = Date.now();
    if (now - useChatStore.getState().lastActionTimestamp < 500) {
      throw new Error('Action too frequent');
    }

    // Input validation
    validateChatId(chatId);
    if (chatType !== 'group') validateUserObject(user);

    const currentUser = useUserStore.getState().currentUser;
    if (!currentUser?.id) throw new Error('Unauthorized');

    if (chatType === "individual") {
      // Security checks for individual chat
      if (!user?.id) throw new Error('Invalid user data');
      
      const updatedState = {
        chatId,
        user,
        chatType: "individual",
        lastActionTimestamp: now
      };

      if (Array.isArray(user.blocked) && user.blocked.includes(currentUser.id)) {
        return set({
          ...updatedState,
          chatId: null,
          chatType: null,
          isCurrentUserBlocked: true,
          isReceiverBlocked: false,
        });
      } else if (Array.isArray(currentUser.blocked) && currentUser.blocked.includes(user.id)) {
        return set({
          ...updatedState,
          chatId: null,
          chatType: null,
          isCurrentUserBlocked: false,
          isReceiverBlocked: true,
        });
      } else {
        return set({
          ...updatedState,
          isCurrentUserBlocked: false,
          isReceiverBlocked: false,
        });
      }
    } else if (chatType === "group") {
      // Group chat security
      return set({
        chatId,
        user: null,
        chatType: "group",
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
        lastActionTimestamp: now
      });
    }
  },

  changeBlock: () => {
    const now = Date.now();
    if (now - useChatStore.getState().lastActionTimestamp < 1000) {
      throw new Error('Action too frequent');
    }
    set((state) => ({ 
      ...state, 
      isReceiverBlocked: !state.isReceiverBlocked,
      lastActionTimestamp: now
    }));
  },
}));