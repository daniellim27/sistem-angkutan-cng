const cors = require("cors");
const express = require("express");

module.exports = (app) => {
  // Enable CORS for all origins and specifically for frontend on port 3001
  app.use(
    cors({
      origin: ["http://localhost:3001", "http://localhost:3000", "*"], // Explicitly allow port 3001
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
      ],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};
