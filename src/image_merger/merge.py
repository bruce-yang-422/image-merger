from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageColor

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass(slots=True)
class MergeOptions:
    direction: str = "vertical"
    spacing: int = 0
    padding: int = 0
    background: str = "#ffffff"


def normalize_image_paths(paths: Iterable[str | Path]) -> list[Path]:
    normalized = [Path(path) for path in paths]
    if not normalized:
        raise ValueError("At least one image path is required.")
    return normalized


def collect_image_paths(input_dir: str | Path, recursive: bool = False) -> list[Path]:
    directory = Path(input_dir)
    if not directory.exists():
        raise FileNotFoundError(f"Input directory does not exist: {directory}")
    if not directory.is_dir():
        raise NotADirectoryError(f"Input path is not a directory: {directory}")

    iterator = directory.rglob("*") if recursive else directory.iterdir()
    image_paths = [
        path
        for path in iterator
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
    ]
    image_paths.sort(key=lambda path: path.name.lower())

    if not image_paths:
        raise ValueError(f"No supported images found in: {directory}")

    return image_paths


def build_output_path(
    output_dir: str | Path,
    output_name: str,
    output_format: str,
) -> Path:
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)

    safe_name = output_name.strip().replace(" ", "_") or "merged_image"
    extension = output_format.lower().lstrip(".")
    if extension == "jpeg":
        extension = "jpg"

    return directory / f"{safe_name}.{extension}"


def merge_images(
    image_paths: Iterable[str | Path],
    output_path: str | Path,
    options: MergeOptions | None = None,
) -> Path:
    options = options or MergeOptions()
    paths = normalize_image_paths(image_paths)
    images = [Image.open(path).convert("RGBA") for path in paths]

    try:
        widths = [image.width for image in images]
        heights = [image.height for image in images]
        spacing_total = max(0, options.spacing) * (len(images) - 1)
        padding = max(0, options.padding)

        if options.direction == "horizontal":
            canvas_width = sum(widths) + spacing_total + (padding * 2)
            canvas_height = max(heights) + (padding * 2)
        else:
            canvas_width = max(widths) + (padding * 2)
            canvas_height = sum(heights) + spacing_total + (padding * 2)

        background = ImageColor.getrgb(options.background)
        canvas = Image.new("RGBA", (canvas_width, canvas_height), background + (255,))

        offset_x = padding
        offset_y = padding

        for image in images:
            if options.direction == "horizontal":
                y = padding + ((canvas_height - (padding * 2) - image.height) // 2)
                canvas.alpha_composite(image, (offset_x, y))
                offset_x += image.width + max(0, options.spacing)
            else:
                x = padding + ((canvas_width - (padding * 2) - image.width) // 2)
                canvas.alpha_composite(image, (x, offset_y))
                offset_y += image.height + max(0, options.spacing)

        output = Path(output_path)
        save_format = "JPEG" if output.suffix.lower() in {".jpg", ".jpeg"} else output.suffix.lstrip(".").upper()
        canvas.convert("RGB").save(output, format=save_format)
        return output
    finally:
        for image in images:
            image.close()