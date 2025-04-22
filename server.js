import express from "express";
import dotenv from "dotenv";
import generateToken from "./utils/agoraTokenGenerator.js"; // Import the token generator utility

// Load environment variables from .env file
dotenv.config();

// Create an Express app
const app = express();
const PORT = import.meta.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to generate and return an Agora token
app.get("/generate-token", (req, res) => {
  const channelName = req.query.channelName; // Channel name from query params
  const uid = req.query.uid || 0; // User ID from query params (default: 0)

  // Validate channel name
  if (!channelName) {
    return res.status(400).json({ error: "Channel name is required" });
  }

  try {
    // Generate the Agora token
    const token = generateToken(channelName, uid);
    res.json({ token }); // Return the token as JSON
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});