import { useEffect, useState } from "react";
import "./viewGroupChat.css";

const ViewGroupChatModal = ({ isOpen, onClose, group, users }) => {
  const [groupMembers, setGroupMembers] = useState([]);

  useEffect(() => {
    if (group && users) {
      const members = group.members.map((userId) => {
        const user = users.find((u) => u.id === userId);
        return user || { fullname: "Unknown User", avatar: "", id: userId };
      });
      setGroupMembers(members);
    }
  }, [group, users]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Group Chat: {group.name}</h2>
        <div className="group-members">
          <h3>Members ({groupMembers.length})</h3>
          <div className="members-grid">
            {groupMembers.map((member) => (
              <div key={member.id} className="member-item">
                <img 
                  src={member.avatar || "./avatar.png"} 
                  alt={member.fullname}
                  className="member-avatar"
                />
                <span className="member-name">{member.fullname}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewGroupChatModal;