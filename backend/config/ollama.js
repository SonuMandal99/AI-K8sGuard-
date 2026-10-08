const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

module.exports = {
  OLLAMA_HOST,
  OLLAMA_MODEL
};