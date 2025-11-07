const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const buildPath = path.join(__dirname, 'build');
const indexPath = path.join(buildPath, 'index.html');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'express' });
});

// Serve static files from the React app build directory
// This must come before the catch-all route
app.use(express.static(buildPath));

// Handle React routing - return all requests to React app
// This catch-all handler must be last and will only be reached if no static file was found
app.get('*', (req, res) => {
  // Check if index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error(`index.html not found at ${indexPath}`);
    return res.status(500).send('Build files not found. Please ensure the build completed successfully.');
  }
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving static files from: ${buildPath}`);
  console.log(`Index file exists: ${fs.existsSync(indexPath)}`);
});

