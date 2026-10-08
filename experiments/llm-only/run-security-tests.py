import argparse
import json
import time
from pathlib import Path

import requests
import yaml


def load_yaml_files(directory):
    directory = Path(directory)

    if not directory.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")

    return sorted(
        list(directory.glob("*.yaml")) +
        list(directory.glob("*.yml"))
    )


def load_ollama_model(ollama_url, model, prompt):
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


def build_prompt(yaml_content):
    return f"""
You are a Kubernetes security analysis assistant.

Analyze the following Kubernetes Deployment YAML.

Identify security weaknesses such as:

- Privileged containers
- Root execution
- Privilege escalation
- Missing resource limits
- Missing readiness probes
- Missing liveness probes
- Mutable image tags
- Excessive Linux capabilities

For every detected issue, provide:

- rule_id
- title
- severity
- explanation
- evidence
- recommendation

Return valid JSON only.

Expected JSON format:

{{
  "findings": [
    {{
      "rule_id": "K8S-XXX",
      "title": "Security issue",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "explanation": "Explanation of the issue",
      "evidence": "Evidence from the YAML",
      "recommendation": "Recommended remediation"
    }}
  ]
}}

Kubernetes YAML:

{yaml_content}
"""


def analyze_file(ollama_url, model, yaml_file):
    yaml_content = yaml_file.read_text(encoding="utf-8")

    start_time = time.perf_counter()

    response = load_ollama_model(
        ollama_url,
        model,
        build_prompt(yaml_content)
    )

    latency = (time.perf_counter() - start_time) * 1000

    return response, latency


def parse_llm_response(response):
    try:
        parsed = json.loads(response)

        if isinstance(parsed, dict):
            findings = parsed.get("findings", [])

            if isinstance(findings, list):
                return parsed, findings

        return {
            "rawResponse": response,
            "parsed": False
        }, []

    except json.JSONDecodeError:
        return {
            "rawResponse": response,
            "parsed": False
        }, []


def run_tests(
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
        print(f"Running LLM analysis: {yaml_file.name}")

        try:
            raw_response, latency = analyze_file(
                ollama_url,
                model,
                yaml_file
            )

            parsed_response, findings = parse_llm_response(
                raw_response
            )

            results.append({
                "scenario": yaml_file.stem,
                "category": category,
                "file": str(yaml_file),
                "actual_detection": len(findings) > 0,
                "findings": findings,
                "llm_response": parsed_response,
                "latency": latency,
                "status": "success"
            })

        except Exception as error:
            results.append({
                "scenario": yaml_file.stem,
                "category": category,
                "file": str(yaml_file),
                "actual_detection": False,
                "findings": [],
                "llm_response": None,
                "latency": None,
                "status": "error",
                "error": str(error)
            })

    output = {
        "experiment": "llm-only",
        "ollama_url": ollama_url,
        "model": model,
        "total_tests": len(results),
        "results": results
    }

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output_path.write_text(
        json.dumps(output, indent=2),
        encoding="utf-8"
    )

    print()
    print(f"Results saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Run LLM-Only Kubernetes security tests."
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
        default="../results/llm-only-results.json",
        help="Output JSON file"
    )

    args = parser.parse_args()

    run_tests(
        ollama_url=args.ollama_url,
        model=args.model,
        secure_dir=args.secure_dir,
        insecure_dir=args.insecure_dir,
        output_file=args.output
    )


if __name__ == "__main__":
    main()