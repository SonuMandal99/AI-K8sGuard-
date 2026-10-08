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
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    analysisId: {
      type: String,
      required: true,
      unique: true
    },

    analysisType: {
      type: String,
      enum: ["yaml", "security", "failure"],
      required: true
    },

    findings: {
      type: [findingSchema],
      default: []
    },

    riskScore: {
      type: Number,
      default: 0
    },

    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    llmResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    diagnosis: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    recommendation: {
      type: String,
      default: null
    },

    performance: {
      latency: {
        type: Number,
        default: null
      },

      cpuUsage: {
        type: Number,
        default: null
      },

      memoryUsage: {
        type: Number,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Analysis", analysisSchema);