const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const requireLogin = require('../middleware/requireLogin.js'); // Middleware for auth
const User = require('../models/User');

router.post('/update-profile', requireLogin, async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name && !email && !password) {
    return res.status(422).json({ error: 'Please provide at least one field to update.' });
  }
  
  try {
    const user = req.user;
    
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(422).json({ error: 'Email is already taken.' });
      }
      user.email = email;
    }
    
    if (name) {
      user.name = name;
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
    }
    
    await user.save();
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/user/profile', requireLogin, async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .select('-password') // Exclude password for security
        .populate({
          path: 'status.job', // Populate the job details
          select: 'title description company location', // Select fields to include from the Job model
        });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Prepare job status information
      const jobStatuses = user.status.map((statusEntry) => ({
        jobId: statusEntry.job._id,
        title: statusEntry.job.title,
        description: statusEntry.job.description,
        company: statusEntry.job.company,
        location: statusEntry.job.location,
        status: statusEntry.status,
      }));
  
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        jobStatuses, // Include job status details
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
  


module.exports = router;
