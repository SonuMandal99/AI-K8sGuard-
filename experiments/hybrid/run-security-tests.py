import argparse
import json
import time
from pathlib import Path

import requests


def load_yaml_files(directory):
    directory = Path(directory)

    if not directory.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")

    return sorted(
        list(directory.glob("*.yaml")) +
        list(directory.glob("*.yml"))
    )


def run_rule_engine(api_url, yaml_content):
    response = requests.post(
        api_url,
        json={"yaml": yaml_content},
        timeout=120
    )

    response.raise_for_status()

    return response.json()


def build_hybrid_prompt(yaml_content, rule_result):
    data = rule_result.get("data", {})

    findings = data.get("findings", [])
    risk_score = data.get("riskScore", 0)

    return f"""
You are the explainability component of AI-K8sGuard.

The deterministic Kubernetes security rule engine has already analyzed
the supplied Kubernetes YAML.

IMPORTANT:

1. The deterministic rule engine is authoritative.
2. Do not create new security findings.
3. Do not remove any supplied findings.
4. Do not change rule IDs.
5. Do not change severity.
6. Do not change the supplied risk score.
7. Use only the supplied YAML and rule-engine findings.
8. Every explanation must be grounded in the supplied evidence.
9. If evidence is insufficient, explicitly state that.
10. Return valid JSON only.

KUBERNETES YAML

{yaml_content}

DETERMINISTIC RULE ENGINE FINDINGS

{json.dumps(findings, indent=2)}

RISK SCORE

{risk_score}

For every supplied finding provide:

- rule_id
- title
- severity
- explanation
- impact
- supportingEvidence
- recommendation
- confidence

OUTPUT FORMAT

{{
  "summary": "Overall explanation of the detected security findings",
  "findings": [
    {{
      "rule_id": "K8S-XXX",
      "title": "Finding title",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "explanation": "Evidence-grounded explanation",
      "impact": "Potential security impact",
      "supportingEvidence": [
        "Evidence directly observed from the YAML"
      ],
      "recommendation": "Recommended remediation",
      "confidence": "HIGH|MEDIUM|LOW"
    }}
  ],
  "riskAssessment": {{
    "riskScore": {risk_score}
  }}
}}
"""


def run_ollama(ollama_url, model, prompt):
    response = requests.post(
        f"{ollama_url}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        },
        timeout=300
    )

    response.raise_for_status()

    data = response.json()

    return data.get("response", "")


def parse_llm_response(response):
    try:
        parsed = json.loads(response)

        if isinstance(parsed, dict):
            return parsed

        return {
            "rawResponse": response,
            "parsed": False
        }

    except json.JSONDecodeError:
        return {
            "rawResponse": response,
            "parsed": False
        }


def run_tests(
    rule_api_url,
    ollama_url,
    model,
    secure_dir,
    insecure_dir,
    output_file
):
    secure_files = load_yaml_files(secure_dir)
    insecure_files = load_yaml_files(insecure_dir)

    test_files = [
        ("secure", file_path)
        for file_path in secure_files
    ] + [
        ("insecure", file_path)
        for file_path in insecure_files
    ]

    results = []

    print(f"Found {len(test_files)} YAML test files.")

    for category, yaml_file in test_files:
        print(f"Running Hybrid analysis: {yaml_file.name}")

        try:
            yaml_content = yaml_file.read_text(
                encoding="utf-8"
            )

            total_start = time.perf_counter()

            # Stage 1: deterministic rule engine
            rule_result = run_rule_engine(
                rule_api_url,
                yaml_content
            )

            # Stage 2: LLM explanation
            prompt = build_hybrid_prompt(
                yaml_content,
                rule_result
            )

            llm_response = run_ollama(
                ollama_url,
                model,
                prompt
            )

            total_latency = (
                time.perf_counter() - total_start
            ) * 1000

            rule_data = rule_result.get("data", {})
            findings = rule_data.get("findings", [])

            parsed_llm_response = parse_llm_response(
                llm_response
            )

            results.append({
                "scenario": yaml_file.stem,
                "category": category,
                "file": str(yaml_file),

                "actual_detection": len(findings) > 0,

                "rule_engine": {
                    "findings": findings,
                    "findingCount": len(findings),
                    "riskScore": rule_data.get(
                        "riskScore",
                        0
                    )
                },

                "llm_response": parsed_llm_response,

                "latency": total_latency,

                "status": "success"
            })

        except Exception as error:
            results.append({
                "scenario": yaml_file.stem,
                "category": category,
                "file": str(yaml_file),
                "actual_detection": False,
                "rule_engine": None,
                "llm_response": None,
                "latency": None,
                "status": "error",
                "error": str(error)
            })

    output = {
        "experiment": "hybrid",
        "rule_api_endpoint": rule_api_url,
        "ollama_url": ollama_url,
        "model": model,
        "total_tests": len(results),
        "results": results
    }

    output_path = Path(output_file)
    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    output_path.write_text(
        json.dumps(output, indent=2),
        encoding="utf-8"
    )

    print()
    print(f"Results saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Run Hybrid Kubernetes security tests."
    )

    parser.add_argument(
        "--rule-api-url",
        default="http://localhost:5000/api/analyze/yaml",
        help="AI-K8sGuard deterministic rule-engine API"
    )

    parser.add_argument(
        "--ollama-url",
        default="http://localhost:11434",
        help="Ollama server URL"
    )

    parser.add_argument(
        "--model",
        default="qwen2.5:3b",
        help="Ollama model"
    )

    parser.add_argument(
        "--secure-dir",
        default="../../test-data/yaml/secure",
        help="Directory containing secure YAML test cases"
    )

    parser.add_argument(
        "--insecure-dir",
        default="../../test-data/yaml/insecure",
        help="Directory containing insecure YAML test cases"
    )

    parser.add_argument(
        "--output",
        default="../results/hybrid-results.json",
        help="Output JSON file"
    )

    args = parser.parse_args()

    run_tests(
        rule_api_url=args.rule_api_url,
        ollama_url=args.ollama_url,
        model=args.model,
        secure_dir=args.secure_dir,
        insecure_dir=args.insecure_dir,
        output_file=args.output
    )


if __name__ == "__main__":
    main()