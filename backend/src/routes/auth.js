"use strict";

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getDb, getOperatorByUsername, insertOperator } = require("../db/database.js");
const { authenticateJWT, requireRole } = require("../middleware/auth.js");

const router = express.Router();

/**
 * @route POST /auth/login
 * @desc  Authenticates user and returns a JWT
 * @body  { username, password }
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(422).json({ error: "Missing username or password" });
  }

  const db = getDb();
  const operator = getOperatorByUsername(db, username);

  if (!operator) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const isMatch = await bcrypt.compare(password, operator.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const payload = {
    id: operator.id,
    username: operator.username,
    role: operator.role,
    entity_id: operator.entity_id
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return res.status(500).json({ error: "Internal server error" });
  }

  const token = jwt.sign(payload, secret, { expiresIn: "1h" });

  res.json({ token, role: operator.role, entity_id: operator.entity_id });
});

/**
 * @route POST /auth/register
 * @desc  Creates a new operator account (ADMIN only)
 * @body  { username, password, role, entity_id }
 */
router.post("/register", authenticateJWT, requireRole("ADMIN"), async (req, res) => {
  const { username, password, role, entity_id } = req.body;

  if (!username || !password || !role) {
    return res.status(422).json({ error: "Missing required fields" });
  }

  const db = getDb();
  const existing = getOperatorByUsername(db, username);
  if (existing) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  try {
    insertOperator(db, {
      username,
      password_hash,
      role,
      entity_id: entity_id || null
    });
    res.status(201).json({ message: "Operator created successfully", username, role });
  } catch (err) {
    console.error("[auth/register] error:", err);
    res.status(500).json({ error: "Failed to create operator" });
  }
});

module.exports = router;
