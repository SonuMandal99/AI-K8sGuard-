const fs = require("fs");
const path = require("path");

const evidenceBuilder = require("./evidenceBuilder.service");
const ollamaService = require("./ollama.service");

const PROMPT_PATH = path.join(
  __dirname,
  "../prompts/failure-diagnosis.prompt.txt"
);

/*
 * LLM diagnosis is intentionally disabled by default.
 *
 * The deterministic Kubernetes evidence collection must work
 * independently of Ollama/Qwen2.5 3B.
 *
 * Enable later by adding this to .env:
 *
 * ENABLE_LLM_DIAGNOSIS=true
 */
const isLlmDiagnosisEnabled = () =>
  String(process.env.ENABLE_LLM_DIAGNOSIS).toLowerCase() === "true";


/*
 * Load the diagnosis prompt template.
 */
const loadPromptTemplate = () => {
  return fs.readFileSync(PROMPT_PATH, "utf8");
};


/*
 * Replace placeholders in the prompt template.
 *
 * Example:
 * {{failureType}}
 * {{namespace}}
 * {{podName}}
 */
const replacePlaceholder = (
  template,
  placeholder,
  value
) => {
  return template.replace(
    new RegExp(`{{${placeholder}}}`, "g"),
    value ?? "Not available"
  );
};


/*
 * Build the prompt using ONLY the collected evidence.
 *
 * The LLM receives:
 * - Failure type
 * - Namespace
 * - Pod
 * - Deployment
 * - Kubernetes configuration
 * - Pod status
 * - Deployment status
 * - Events
 * - Logs
 * - Runtime information
 */
const buildDiagnosisPrompt = ({
  template,
  failureType,
  namespace,
  podName,
  deploymentName,
  evidence
}) => {
  let prompt = template;

  prompt = replacePlaceholder(
    prompt,
    "failureType",
    failureType
  );

  prompt = replacePlaceholder(
    prompt,
    "namespace",
    namespace
  );

  prompt = replacePlaceholder(
    prompt,
    "podName",
    podName
  );

  prompt = replacePlaceholder(
    prompt,
    "deploymentName",
    deploymentName
  );

  prompt = replacePlaceholder(
    prompt,
    "configuration",
    JSON.stringify(
      evidence.configuration,
      null,
      2
    )
  );

  prompt = replacePlaceholder(
    prompt,
    "podStatus",
    JSON.stringify(
      evidence.runtime?.podStatus,
      null,
      2
    )
  );

  prompt = replacePlaceholder(
    prompt,
    "deploymentStatus",
    JSON.stringify(
      evidence.runtime?.deploymentStatus,
      null,
      2
    )
  );

  prompt = replacePlaceholder(
    prompt,
    "events",
    JSON.stringify(
      evidence.runtime?.events || [],
      null,
      2
    )
  );

  prompt = replacePlaceholder(
    prompt,
    "logs",
    evidence.runtime?.logs ||
      "Not available"
  );

  prompt = replacePlaceholder(
    prompt,
    "runtimeInformation",
    JSON.stringify(
      evidence.runtime,
      null,
      2
    )
  );

  return prompt;
};


/*
 * Main Kubernetes failure diagnosis workflow.
 */
const diagnoseFailure = async ({
  namespace,
  podName,
  deploymentName,
  failureType,
  yaml = null
}) => {

  /*
   * Validate required inputs.
   */
  if (!namespace || !podName) {
    throw new Error(
      "namespace and podName are required"
    );
  }


  /*
   * STEP 1
   *
   * Collect deterministic Kubernetes evidence.
   *
   * This does NOT require Ollama.
   */
  const evidence =
    await evidenceBuilder.buildFailureEvidence({
      failureType,
      yaml,
      namespace,
      podName,
      deploymentName
    });


  /*
   * STEP 2
   *
   * Do not call Ollama unless explicitly enabled.
   *
   * This allows the complete Kubernetes evidence
   * workflow to work before Qwen2.5 3B is installed.
   */
  if (!isLlmDiagnosisEnabled()) {

    return {
      failure: failureType || "Unknown",

      namespace,

      podName,

      deploymentName:
        deploymentName || null,

      evidence,

      diagnosis: null,

      llm: {
        enabled: false,

        status: "deferred",

        message:
          "Local LLM diagnosis is disabled. Kubernetes evidence was collected successfully."
      }
    };
  }


  /*
   * STEP 3
   *
   * Load the LLM prompt template.
   */
  const template =
    loadPromptTemplate();


  /*
   * STEP 4
   *
   * Build the prompt from the collected
   * Kubernetes evidence.
   */
  const prompt =
    buildDiagnosisPrompt({
      template,
      failureType,
      namespace,
      podName,
      deploymentName,
      evidence
    });


  /*
   * STEP 5
   *
   * Send the evidence-based prompt to
   * Ollama / Qwen2.5 3B.
   *
   * This stage is optional and disabled
   * until ENABLE_LLM_DIAGNOSIS=true.
   */
  const llmResponse =
    await ollamaService.generateStructuredResponse(
      prompt
    );


  /*
   * STEP 6
   *
   * Return the complete diagnosis result.
   */
  return {
    failure: failureType || "Unknown",

    namespace,

    podName,

    deploymentName:
      deploymentName || null,

    evidence,

    diagnosis: llmResponse,

    llm: {
      enabled: true,

      status: "completed"
    }
  };
};


module.exports = {
  diagnoseFailure,
  buildDiagnosisPrompt
};