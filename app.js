const express = require('express');
const mongoose = require('mongoose');
// const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

require("./models/User")
require("./models/Job")
// Import routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/job');
const userRoutes = require('./routes/user');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
// app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('MongoDB connection error:', err));

// Route middleware
app.use(authRoutes);
app.use(jobRoutes);
app.use(userRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
