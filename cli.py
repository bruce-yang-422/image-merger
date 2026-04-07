from __future__ import annotations

import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / "src"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Merge images from an input directory into one output image."
    )
    parser.add_argument(
        "--input-dir",
        required=True,
        help="Directory that contains the source images",
    )
    parser.add_argument(
        "--output-dir",
        default="output",
        help="Directory where the merged image will be saved",
    )
    parser.add_argument(
        "--output-name",
        default="merged_image",
        help="Base filename for the merged image",
    )
    parser.add_argument(
        "--output-format",
        choices=("png", "jpg", "jpeg"),
        default="png",
        help="Output image format",
    )
    parser.add_argument(
        "--direction",
        choices=("vertical", "horizontal"),
        default="vertical",
        help="Merge direction",
    )
    parser.add_argument("--spacing", type=int, default=0, help="Spacing between images")
    parser.add_argument("--padding", type=int, default=0, help="Canvas padding")
    parser.add_argument(
        "--background",
        default="#ffffff",
        help="Background color in hex format",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Search for images recursively in the input directory",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    try:
        from image_merger import (
            MergeOptions,
            build_output_path,
            collect_image_paths,
            merge_images,
        )
    except ModuleNotFoundError as exc:
        if exc.name == "PIL":
            raise SystemExit(
                "Missing dependency: Pillow. Run `pip install -r requirements.txt` first."
            ) from exc
        raise

    image_paths = collect_image_paths(args.input_dir, recursive=args.recursive)
    output_path = build_output_path(
        output_dir=args.output_dir,
        output_name=args.output_name,
        output_format=args.output_format,
    )
    options = MergeOptions(
        direction=args.direction,
        spacing=max(0, args.spacing),
        padding=max(0, args.padding),
        background=args.background,
    )

    merge_images(image_paths, output_path, options)
    print(f"Merged {len(image_paths)} images into {output_path}")


if __name__ == "__main__":
    main()
