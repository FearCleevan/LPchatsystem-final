import React, { useState, useEffect } from 'react';
import {
  StreamVideoClient,
  StreamCall,
  SpeakerLayout,
  CallControls,
} from '@stream-io/video-react-sdk';
import './chat.css'; // Reuse or create a new CSS file for styling

// Use your provided credentials
const apiKey = 'mmhfdzb5evj2';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Byb250by5nZXRzdHJlYW0uaW8iLCJzdWIiOiJ1c2VyL05hdGFzaV9EYWFsYSIsInVzZXJfaWQiOiJOYXRhc2lfRGFhbGEiLCJ2YWxpZGl0eV9pbl9zZWNvbmRzIjo2MDQ4MDAsImlhdCI6MTc0MTEwMjkxOCwiZXhwIjoxNzQxNzA3NzE4fQ.JfElsFQtUmniN2PTeT-YupWo2uWQ4sRPbUOBHW_QjrM';
const userId = 'Natasi_Daala';
const callId = '1BwB3MYBnoUB';

const StreamVideoCall = ({ onClose }) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);

  useEffect(() => {
    // Initialize the Stream Video client
    const videoClient = new StreamVideoClient({ apiKey, user: { id: userId }, token });
    setClient(videoClient);

    // Create or join a call
    const call = videoClient.call('default', callId);
    call.join({ create: true }).then(() => setCall(call));

    return () => {
      if (call) call.leave();
      if (videoClient) videoClient.disconnectUser();
    };
  }, []);

  if (!client || !call) return <div>Loading...</div>;

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        <button className="close-button" onClick={onClose}>
          ✖
        </button>
        <StreamCall call={call}>
          <SpeakerLayout />
          <CallControls />
        </StreamCall>
      </div>
    </div>
  );
};

export default StreamVideoCall;