import argparse
import json
from pathlib import Path
from collections import Counter


VALID_LABELS = {
    "SUPPORTED",
    "PARTIALLY_SUPPORTED",
    "UNSUPPORTED"
}


def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def calculate_grounding(results):
    labels = []

    for result in results:
        label = str(
            result.get("grounding", "")
        ).strip().upper()

        if label in VALID_LABELS:
            labels.append(label)

    counts = Counter(labels)

    total = len(labels)

    if total == 0:
        return {
            "total_evaluated": 0,
            "supported": 0,
            "partially_supported": 0,
            "unsupported": 0,
            "supported_percentage": 0.0,
            "partially_supported_percentage": 0.0,
            "unsupported_percentage": 0.0
        }

    return {
        "total_evaluated": total,

        "supported": counts["SUPPORTED"],
        "partially_supported": counts["PARTIALLY_SUPPORTED"],
        "unsupported": counts["UNSUPPORTED"],

        "supported_percentage": round(
            counts["SUPPORTED"] / total * 100,
            2
        ),

        "partially_supported_percentage": round(
            counts["PARTIALLY_SUPPORTED"] / total * 100,
            2
        ),

        "unsupported_percentage": round(
            counts["UNSUPPORTED"] / total * 100,
            2
        )
    }


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
        description="Calculate evidence-grounding metrics."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="JSON file containing grounding evaluations."
    )

    parser.add_argument(
        "--output",
        default="experiments/results/processed/grounding.json",
        help="Output JSON file."
    )

    args = parser.parse_args()

    results = load_json(args.input)

    grounding = calculate_grounding(results)

    save_json(
        args.output,
        grounding
    )

    print(
        f"Grounding metrics saved to: {args.output}"
    )


if __name__ == "__main__":
    main()