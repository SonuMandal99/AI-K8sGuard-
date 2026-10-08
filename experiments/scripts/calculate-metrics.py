import argparse
import json
from pathlib import Path


def safe_divide(numerator, denominator):
    if denominator == 0:
        return 0.0

    return numerator / denominator


def calculate_precision(tp, fp):
    return safe_divide(tp, tp + fp)


def calculate_recall(tp, fn):
    return safe_divide(tp, tp + fn)


def calculate_f1(precision, recall):
    if precision + recall == 0:
        return 0.0

    return 2 * (precision * recall) / (precision + recall)


def calculate_security_metrics(results):
    tp = 0
    fp = 0
    fn = 0

    for result in results:
        expected = bool(result.get("expected_detection", False))
        actual = bool(result.get("actual_detection", False))

        if expected and actual:
            tp += 1
        elif not expected and actual:
            fp += 1
        elif expected and not actual:
            fn += 1

    precision = calculate_precision(tp, fp)
    recall = calculate_recall(tp, fn)
    f1 = calculate_f1(precision, recall)

    return {
        "true_positive": tp,
        "false_positive": fp,
        "false_negative": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4)
    }


def calculate_failure_accuracy(results):
    if not results:
        return {
            "correct_diagnoses": 0,
            "total_scenarios": 0,
            "accuracy": 0.0
        }

    correct = 0

    for result in results:
        expected_failure = result.get("expected_failure")
        actual_failure = result.get("actual_failure")

        if (
            expected_failure
            and actual_failure
            and expected_failure.lower() == actual_failure.lower()
        ):
            correct += 1

    total = len(results)
    accuracy = safe_divide(correct, total)

    return {
        "correct_diagnoses": correct,
        "total_scenarios": total,
        "accuracy": round(accuracy, 4)
    }


def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def save_json(file_path, data):
    output_path = Path(file_path)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(
            data,
            file,
            indent=2
        )


def main():
    parser = argparse.ArgumentParser(
        description="Calculate AI-K8sGuard research metrics."
    )

    parser.add_argument(
        "--security-results",
        help="JSON file containing security experiment results."
    )

    parser.add_argument(
        "--failure-results",
        help="JSON file containing failure diagnosis results."
    )

    parser.add_argument(
        "--output",
        default="experiments/results/processed/metrics.json",
        help="Output JSON file."
    )

    args = parser.parse_args()

    metrics = {}

    if args.security_results:
        security_results = load_json(
            args.security_results
        )

        metrics["security_detection"] = (
            calculate_security_metrics(
                security_results
            )
        )

    if args.failure_results:
        failure_results = load_json(
            args.failure_results
        )

        metrics["failure_diagnosis"] = (
            calculate_failure_accuracy(
                failure_results
            )
        )

    save_json(
        args.output,
        metrics
    )

    print(
        f"Metrics saved to: {args.output}"
    )


if __name__ == "__main__":
    main()