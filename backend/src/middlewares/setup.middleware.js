const cors = require("cors");
const express = require("express");

module.exports = (app) => {
  // Enable CORS for all origins
  app.use(
    cors({
      origin: "*", // Allow all origins
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
