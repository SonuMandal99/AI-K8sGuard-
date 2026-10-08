const {
  OLLAMA_HOST,
  OLLAMA_MODEL
} = require("../config/ollama");

const generateResponse = async (prompt) => {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt is required");
  }

  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Ollama request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error("Ollama returned an empty response");
  }

  return data.response;
};

const generateStructuredResponse = async (prompt) => {
  const response = await generateResponse(prompt);

  try {
    return JSON.parse(response);
  } catch (error) {
    return {
      rawResponse: response,
      parsed: false
    };
  }
};

module.exports = {
  generateResponse,
  generateStructuredResponse
};