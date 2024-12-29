const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const User = mongoose.model('User');

module.exports = async (req, res, next) => {
    const { authorization } = req.headers;
  
    // Check if the authorization header exists
    if (!authorization) {
      return res.status(401).json({ error: "Authorization token required" });
    }
  
    // Extract the token and verify it
    const token = authorization.replace(/bearer\s+/i, ""); // Case-insensitive match for 'Bearer '
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
  
      // Check if the database is ready before querying
      if (!User.db || !User.db.readyState) {
        return res.status(500).json({ error: "Database connection is not established" });
      }
  
      // Find the user in the database
      const user = await User.findById(payload._id).select("-password");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Attach user to the request and proceed
      req.user = user;
      next();
    } catch (err) {
      console.error("Error in middleware:", err.message);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };