import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const Call = ({ channelName, appId, token, uid, callType }) => {
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const localPlayerRef = useRef(null);
  const remotePlayersRef = useRef({});

  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  useEffect(() => {
    const joinChannel = async () => {
      try {
        if (!appId) {
          throw new Error("App ID is undefined");
        }

        // Initialize the client
        await client.join(appId, channelName, token, uid);

        // Create and publish local tracks
        if (callType === "video") {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          setLocalVideoTrack(videoTrack);
          await client.publish(videoTrack);
          videoTrack.play(localPlayerRef.current);
        }

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);
        await client.publish(audioTrack);

        // Listen for remote users
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);

          if (mediaType === "video") {
            const remotePlayer = document.createElement("div");
            remotePlayer.id = `remote-player-${user.uid}`;
            remotePlayersRef.current[user.uid] = remotePlayer;
            document.getElementById("remote-players").appendChild(remotePlayer);
            user.videoTrack.play(remotePlayer);
          }

          if (mediaType === "audio") {
            user.audioTrack.play();
          }
        });

        client.on("user-unpublished", (user) => {
          const remotePlayer = remotePlayersRef.current[user.uid];
          if (remotePlayer) {
            remotePlayer.remove();
            delete remotePlayersRef.current[user.uid];
          }
        });
      } catch (error) {
        console.error("Error joining channel:", error);
      }
    };

    joinChannel();

    return () => {
      // Clean up
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      client.leave();
    };
  }, [appId, channelName, token, uid, callType, client, localAudioTrack, localVideoTrack]);

  return (
    <div className="call-container">
      <div className="local-player" ref={localPlayerRef}></div>
      <div id="remote-players" className="remote-players"></div>
      <button
        onClick={() => {
          if (localAudioTrack)
            localAudioTrack.setEnabled(!localAudioTrack.enabled);
        }}
      >
        Toggle Audio
      </button>
      <button
        onClick={() => {
          if (localVideoTrack)
            localVideoTrack.setEnabled(!localVideoTrack.enabled);
        }}
      >
        Toggle Video
      </button>
    </div>
  );
};

export default Call;