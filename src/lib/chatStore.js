import { create } from "zustand";
import { useUserStore } from "./userStore";

export const useChatStore = create((set) => ({
  chatId: null,
  user: null,
  chatType: null, // "individual" or "group"
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,

  // Updated changeChat function to handle group chats
  changeChat: (chatId, user, chatType = "individual") => {
    const currentUser = useUserStore.getState().currentUser;

    if (chatType === "individual") {
      // Handle individual chat
      if (user.blocked.includes(currentUser.id)) {
        return set({
          chatId: null,
          user: null,
          chatType: null,
          isCurrentUserBlocked: true,
          isReceiverBlocked: false,
        });
      } else if (currentUser.blocked.includes(user.id)) {
        return set({
          chatId: null,
          user: user,
          chatType: null,
          isCurrentUserBlocked: false,
          isReceiverBlocked: true,
        });
      } else {
        return set({
          chatId,
          user,
          chatType: "individual",
          isCurrentUserBlocked: false,
          isReceiverBlocked: false,
        });
      }
    } else if (chatType === "group") {
      // Handle group chat
      return set({
        chatId,
        user: null, // No user object for group chats
        chatType: "group",
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
      });
    }
  },

  changeBlock: () => {
    set((state) => ({ ...state, isReceiverBlocked: !state.isReceiverBlocked }));
  },
}));