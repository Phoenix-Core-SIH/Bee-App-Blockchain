"use strict";

const jwt = require("jsonwebtoken");

/**
 * Middleware to authenticate JWT tokens in the Authorization header.
 * Expects "Bearer <token>".
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not set in environment");
    return res.status(500).json({ error: "Internal server error" });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Unauthorized: Token expired" });
      }
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.operator = decoded;
    next();
  });
}

/**
 * Middleware to restrict access to specific roles.
 * Must be used AFTER authenticateJWT.
 * @param {...string} allowedRoles - e.g., 'ADMIN', 'BEEKEEPER_OPS'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.operator) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.operator.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    next();
  };
}

module.exports = {
  authenticateJWT,
  requireRole,
};
