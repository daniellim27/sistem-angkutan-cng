const cors = require("cors");
const express = require("express");

module.exports = (app) => {
  // Enable CORS for development including ngrok
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost and local network
        if (origin.includes("localhost") || origin.includes("192.168.43.105")) {
          return callback(null, true);
        }

        // Allow ngrok domains
        if (origin.includes("ngrok-free.app") || origin.includes("ngrok.io")) {
          return callback(null, true);
        }

        // Allow expo domains
        if (origin.includes("exp.direct")) {
          return callback(null, true);
        }

        callback(null, true); // Allow all origins in development
      },
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
      ],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Global error handler for JSON parsing errors
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      console.error('❌ Invalid JSON received:', error.body);
      console.error('❌ JSON Error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format',
        details: error.message
      });
    }
    next(error);
  });
};
