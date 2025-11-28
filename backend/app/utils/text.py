"""Text utility helpers."""

import re


def create_slug(text: str) -> str:
    """Create URL-friendly slug from arbitrary text."""

    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")
