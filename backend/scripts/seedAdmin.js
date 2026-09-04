"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const bcrypt = require("bcrypt");
const { getDb, insertOperator, getOperatorByUsername } = require("../src/db/database.js");

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("❌ SEED_ADMIN_USERNAME or SEED_ADMIN_PASSWORD not set in environment");
    process.exit(1);
  }

  const db = getDb();

  const existing = getOperatorByUsername(db, username);
  if (existing) {
    console.log(`✅ Admin operator '${username}' already exists. Skipping.`);
    process.exit(0);
  }

  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    insertOperator(db, {
      username,
      password_hash,
      role: "ADMIN",
      entity_id: "system"
    });

    console.log(`🎉 Admin operator '${username}' seeded successfully.`);
  } catch (err) {
    console.error("❌ Failed to seed admin:", err);
    process.exit(1);
  }
}

seedAdmin();
