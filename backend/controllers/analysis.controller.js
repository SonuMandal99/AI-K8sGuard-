const yamlAnalyzerService = require("../services/yamlAnalyzer.service");
const reportModel = require("../models/report.model");

const createAnalysisId = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "");

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `SEC-${timestamp}-${random}`;
};

const analyzeYAML = async (req, res) => {
  try {
    const { yaml } = req.body;

    if (
      typeof yaml !== "string" ||
      !yaml.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "YAML input is required"
      });
    }

    /*
     * 1. Deterministic security analysis.
     *
     * Security truth comes only from the
     * deterministic rule engine.
     *
     * Ollama is NOT required here.
     */
    const result =
      await yamlAnalyzerService.analyzeYAML(
        yaml
      );

    /*
     * 2. Store the real analysis in MongoDB.
     *
     * LLM fields remain null because Ollama/Qwen
     * is intentionally deferred.
     *
     * No fake AI explanation or performance data.
     */
    const report =
      await reportModel.create({
        analysisId: createAnalysisId(),

        analysisType: "security",

        findings:
          result.findings || [],

        severity:
          result.highestSeverity || null,

        risk:
          Number.isFinite(
            Number(result.riskScore)
          )
            ? Number(result.riskScore)
            : 0,

        evidence: {
          source:
            "deterministic-yaml-analysis",

          configuration: yaml,

          resource:
            result.resource || null
        },

        explanation: null,
        cause: null,
        recommendation: null,

        llmResponse: null,
        diagnosis: null,

        performance: {
          latency: null,
          cpuUsage: null,
          memoryUsage: null
        }
      });

    /*
     * 3. Return the deterministic result to
     *    the frontend.
     */
    return res.status(200).json({
      success: true,

      data: {
        ...result,

        reportId: report._id,
        analysisId: report.analysisId
      }
    });

  } catch (error) {

    console.error(
      "YAML analysis failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to analyze Kubernetes YAML",
      error: error.message
    });
  }
};

module.exports = {
  analyzeYAML
};