import argparse
import json
import statistics
from pathlib import Path


def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def safe_average(values):
    if not values:
        return 0.0

    return statistics.mean(values)


def calculate_performance(results):
    latency_values = []
    cpu_values = []
    memory_values = []

    for result in results:
        latency = result.get("latency")
        cpu = result.get("cpu")
        memory = result.get("memory")

        if isinstance(latency, (int, float)):
            latency_values.append(latency)

        if isinstance(cpu, (int, float)):
            cpu_values.append(cpu)

        if isinstance(memory, (int, float)):
            memory_values.append(memory)

    return {
        "samples": len(results),

        "latency": {
            "samples": len(latency_values),
            "average": round(
                safe_average(latency_values),
                4
            )
        },

        "cpu": {
            "samples": len(cpu_values),
            "average": round(
                safe_average(cpu_values),
                4
            )
        },

        "memory": {
            "samples": len(memory_values),
            "average": round(
                safe_average(memory_values),
                4
            )
        }
    }


def calculate_by_mode(results):
    modes = {}

    for result in results:
        mode = result.get("mode", "unknown")

        if mode not in modes:
            modes[mode] = []

        modes[mode].append(result)

    performance = {}

    for mode, mode_results in modes.items():
        performance[mode] = calculate_performance(
            mode_results
        )

    return performance


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
        description="Calculate AI-K8sGuard performance metrics."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="JSON file containing raw performance measurements."
    )

    parser.add_argument(
        "--output",
        default="experiments/results/processed/performance.json",
        help="Output JSON file."
    )

    args = parser.parse_args()

    results = load_json(args.input)

    performance = {
        "overall": calculate_performance(results),
        "by_mode": calculate_by_mode(results)
    }

    save_json(
        args.output,
        performance
    )

    print(
        f"Performance metrics saved to: {args.output}"
    )


if __name__ == "__main__":
    main()