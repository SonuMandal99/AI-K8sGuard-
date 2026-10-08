import argparse
import json
from pathlib import Path

import requests
import yaml


def load_yaml_files(directory):
    directory = Path(directory)

    if not directory.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")

    yaml_files = sorted(
        list(directory.glob("*.yaml")) +
        list(directory.glob("*.yml"))
    )

    return yaml_files


def analyze_file(api_url, yaml_file):
    yaml_content = yaml_file.read_text(encoding="utf-8")

    response = requests.post(
        api_url,
        json={"yaml": yaml_content},
        timeout=120
    )

    response.raise_for_status()

    return response.json()


def extract_findings(response):
    data = response.get("data", {})

    findings = data.get("findings", [])

    if not isinstance(findings, list):
        return []

    return findings


def run_tests(api_url, secure_dir, insecure_dir, output_file):
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
        print(f"Running: {yaml_file.name}")

        try:
            response = analyze_file(api_url, yaml_file)
            findings = extract_findings(response)

            result = {
                "scenario": yaml_file.stem,
                "category": category,
                "file": str(yaml_file),
                "actual_detection": len(findings) > 0,
                "findings": findings,
                "status": "success"
            }

        except Exception as error:
            result = {
                "scenario": yaml_file.stem,
                "category": category,
                "file": str(yaml_file),
                "actual_detection": False,
                "findings": [],
                "status": "error",
                "error": str(error)
            }

        results.append(result)

    output = {
        "experiment": "rule-only",
        "api_endpoint": api_url,
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
        description="Run Rule-Only Kubernetes security tests."
    )

    parser.add_argument(
        "--api-url",
        default="http://localhost:5000/api/analyze/yaml",
        help="AI-K8sGuard YAML analysis API endpoint"
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
        default="../results/rule-only-results.json",
        help="Output JSON file"
    )

    args = parser.parse_args()

    run_tests(
        api_url=args.api_url,
        secure_dir=args.secure_dir,
        insecure_dir=args.insecure_dir,
        output_file=args.output
    )


if __name__ == "__main__":
    main()