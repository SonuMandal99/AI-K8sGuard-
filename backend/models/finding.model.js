const mongoose = require("mongoose");

const findingSchema = new mongoose.Schema(
  {
    rule_id: {
      type: String,
      required: true
    },

    title: {
      type: String,
      required: true
    },

    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      required: true
    },

    evidence: {
      type: String,
      required: true
    },

    risk: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Finding", findingSchema);