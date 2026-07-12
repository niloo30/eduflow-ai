const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from auth header
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token formatting invalid' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_placement_key_123');
    req.user = decoded; // Attach user payload to request
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};
