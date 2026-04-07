from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Any

import yaml

sys.path.insert(0, str(Path(__file__).parent / "src"))

DEFAULT_CONFIG_PATH = Path("merge_config.yaml")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Merge images from an input directory into one output image."
    )
    parser.add_argument(
        "--config",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to a YAML config file",
    )
    parser.add_argument(
        "--input-dir",
        help="Directory that contains the source images",
    )
    parser.add_argument(
        "--output-dir",
        help="Directory where the merged image will be saved",
    )
    parser.add_argument(
        "--output-name",
        help="Base filename for the merged image",
    )
    parser.add_argument(
        "--output-format",
        choices=("png", "jpg", "jpeg"),
        help="Output image format",
    )
    parser.add_argument(
        "--direction",
        choices=("vertical", "horizontal"),
        help="Merge direction",
    )
    parser.add_argument("--spacing", type=int, help="Spacing between images")
    parser.add_argument("--padding", type=int, help="Canvas padding")
    parser.add_argument(
        "--background",
        help="Background color in hex format",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Search for images recursively in the input directory",
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Disable recursive search even if the config enables it",
    )
    return parser


def load_config(config_path: str | Path) -> dict[str, Any]:
    path = Path(config_path)
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}

    if not isinstance(data, dict):
        raise SystemExit(f"Config file must contain a YAML object: {path}")

    return data


def resolve_recursive(cli_args: argparse.Namespace, config: dict[str, Any]) -> bool:
    if cli_args.no_recursive:
        return False
    if cli_args.recursive:
        return True
    return bool(config.get("recursive", False))


def resolve_value(cli_value: Any, config: dict[str, Any], key: str, default: Any) -> Any:
    return cli_value if cli_value is not None else config.get(key, default)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    config = load_config(args.config)

    try:
        from image_merger import (
            MergeOptions,
            build_output_path,
            collect_image_paths,
            merge_images,
        )
    except ModuleNotFoundError as exc:
        if exc.name in {"PIL", "yaml"}:
            raise SystemExit(
                "Missing dependency. Run `pip install -r requirements.txt` first."
            ) from exc
        raise

    input_dir = resolve_value(args.input_dir, config, "input_dir", None)
    if not input_dir:
        raise SystemExit(
            "Missing input directory. Set `input_dir` in merge_config.yaml or pass --input-dir."
        )

    output_dir = resolve_value(args.output_dir, config, "output_dir", "output")
    output_name = resolve_value(args.output_name, config, "output_name", "merged_image")
    output_format = resolve_value(args.output_format, config, "output_format", "png")
    direction = resolve_value(args.direction, config, "direction", "vertical")
    spacing = max(0, int(resolve_value(args.spacing, config, "spacing", 0)))
    padding = max(0, int(resolve_value(args.padding, config, "padding", 0)))
    background = resolve_value(args.background, config, "background", "#ffffff")
    recursive = resolve_recursive(args, config)

    image_paths = collect_image_paths(input_dir, recursive=recursive)
    output_path = build_output_path(
        output_dir=output_dir,
        output_name=output_name,
        output_format=output_format,
    )
    options = MergeOptions(
        direction=direction,
        spacing=spacing,
        padding=padding,
        background=background,
    )

    merge_images(image_paths, output_path, options)
    print(f"Merged {len(image_paths)} images into {output_path}")


if __name__ == "__main__":
    main()
