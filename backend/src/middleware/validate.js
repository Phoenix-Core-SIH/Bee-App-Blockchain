/**
 * @file   src/middleware/validate.js
 * @notice Zod-based request validation middleware for all API routes.
 *         Returns 422 Unprocessable Entity with structured field errors.
 */

"use strict";

const { z } = require("zod");

// ─── Reusable Zod types ───────────────────────────────────────────────────────

/** Ethereum address: 0x + 40 hex chars */
const EthAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid Ethereum address (0x + 40 hex chars)");

/** bytes32 hex: 0x + 64 hex chars */
const Bytes32 = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Must be a valid bytes32 hex string (0x + 64 hex chars)");

/** UUID v4 */
const UUIDv4 = z.string().uuid("Must be a valid UUID v4");

// ─── Request schemas ──────────────────────────────────────────────────────────

const CreateBatchSchema = z.object({
  batch_id:        UUIDv4.optional(),           // auto-generated if omitted
  hive_id:         z.string().min(1).max(100),
  beekeeper_id:    z.string().min(1).max(100),
  beekeeper_name:  z.string().min(1).max(200).optional(),
  beekeeper_addr:  EthAddress,
  hive_location:   z.string().max(500).optional(),
  harvest_date:    z.string().date("Must be a valid date (YYYY-MM-DD)"),
  quantity_kg:     z.number().positive("Must be a positive number"),
  honey_type:      z.string().min(1).max(100),
  quality_grade:   z.string().min(1).max(50).optional(),
  lab_report_link: z.string().url().optional().or(z.literal("")),
  metadata_hash:   Bytes32.optional(),  // auto-computed if omitted
});

const TransferCustodySchema = z.object({
  to_address:     EthAddress,
  transfer_type:  z.number().int().min(0).max(3, "Must be 0 (Harvest), 1 (Processor), 2 (Distributor), or 3 (Retailer)"),
  location_hash:  Bytes32.optional(), // computed from location JSON if omitted
  location_json:  z.string().optional(),
});

const ActivateQRSchema = z.object({
  qr_id:          Bytes32.optional(),  // computed from jar_serial if omitted
  jar_serial:     z.string().min(1).max(200),
  is_active:      z.boolean().default(true),
});

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure, responds with 422 and a list of field errors.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const errors = issues.map((e) => ({
        field:   Array.isArray(e.path) ? e.path.join(".") : String(e.path),
        message: e.message,
      }));
      return res.status(422).json({
        error: "Validation failed",
        details: errors,
      });
    }
    req.body = result.data; // Replace with coerced/defaults-applied data
    next();
  };
}

module.exports = {
  validate,
  CreateBatchSchema,
  TransferCustodySchema,
  ActivateQRSchema,
  EthAddress,
  Bytes32,
};
