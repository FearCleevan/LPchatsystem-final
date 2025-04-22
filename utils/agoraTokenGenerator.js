import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const generateToken = (channelName, uid) => {
  const appID = import.meta.env.AGORA_APP_ID; // Use environment variable
  const appCertificate = import.meta.env.AGORA_APP_CERTIFICATE; // Use environment variable
  const expirationTimeInSeconds = 3600; // Token expiry time (1 hour)

  const token = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expirationTimeInSeconds
  );

  return token;
};

export default generateToken;