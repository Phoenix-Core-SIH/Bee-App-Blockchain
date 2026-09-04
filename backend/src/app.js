/**
 * @file   src/app.js
 * @notice Express application factory.
 *         Does NOT call app.listen() so it can be imported by tests
 *         without binding to a port.
 *
 * Usage:
 *   const { createApp } = require('./app');
 *   const app = createApp({ blockchain, db });
 */

"use strict";

const express = require("express");

const batchRoutes  = require("./routes/batches.js");
const publicRoutes = require("./routes/public.js");
const authRoutes   = require("./routes/auth.js");
const { ApiError } = require("./blockchain/BlockchainService.js");

/**
 * Creates and configures the Express application.
 *
 * @param {object} opts
 * @param {import('./blockchain/BlockchainService').BlockchainService} opts.blockchain
 * @returns {import('express').Application}
 */
function createApp({ blockchain }) {
  const app = express();

  // ── Middleware ─────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Inject shared services into request context via app settings
  app.set("blockchain", blockchain);

  // ── Health check ───────────────────────────────────────────────────────────
  app.get("/health", (req, res) => {
    res.json({
      status:   "ok",
      service:  "honeychain-api",
      operator: blockchain.operatorAddress,
      ts:       new Date().toISOString(),
    });
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use("/auth",           authRoutes);
  app.use("/batches",        batchRoutes);
  app.use("/public",         publicRoutes);

  // ── 404 ────────────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found", path: req.path });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        error:   err.message,
        details: err.details ?? undefined,
      });
    }

    // Unexpected error — log and return 500
    console.error("[Unhandled]", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
