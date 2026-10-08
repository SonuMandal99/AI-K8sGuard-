const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    analysisId: {
      type: String,
      required: true,
      index: true
    },

    analysisType: {
      type: String,
      enum: ["yaml", "security", "failure"],
      required: true
    },

    findings: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      default: null
    },

    risk: {
      type: Number,
      default: 0
    },

    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    explanation: {
      type: String,
      default: null
    },

    cause: {
      type: String,
      default: null
    },

    recommendation: {
      type: String,
      default: null
    },

    llmResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    diagnosis: {
      type: mongoose.Schema.Types.Mixed,
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

module.exports = mongoose.model("Report", reportSchema);