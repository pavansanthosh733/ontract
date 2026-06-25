
"""
AI Prompt Validation & Sanitization

Purpose:
--------
Provides centralized validation and sanitization for all AI prompts before
they are sent to Gemini or any other LLM.

Security Controls:
------------------
- Empty prompt validation
- Prompt length validation
- Control character removal
- HTML escaping
- Prompt injection detection
- Whitespace normalization

OWASP:
-------
Supports AI Prompt Sanitization and Validation Controls.
"""

import html
import re
from typing import Tuple

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------

MAX_PROMPT_LENGTH = 1000

# Common prompt injection / jailbreak patterns.
# This list can be extended over time.
BLOCKED_PATTERNS = [
    "ignore previous instructions",
    "forget previous instructions",
    "system prompt",
    "developer mode",
    "reveal hidden prompt",
    "show hidden prompt",
    "show your instructions",
    "reveal your instructions",
    "jailbreak",
    "act as",
    "simulate",
]


# ------------------------------------------------------------------
# Internal Helpers
# ------------------------------------------------------------------

def _normalize(prompt: str) -> str:
    """
    Normalize whitespace.

    Example:
        "Hello    World"

    becomes

        "Hello World"
    """
    return re.sub(r"\s+", " ", prompt).strip()


def _remove_control_characters(prompt: str) -> str:
    """
    Remove non-printable ASCII control characters.
    """

    return re.sub(r"[\x00-\x1F\x7F]", "", prompt)


def _contains_prompt_injection(prompt: str) -> Tuple[bool, str]:
    """
    Detect common prompt injection attempts.
    """

    lower_prompt = prompt.lower()

    for pattern in BLOCKED_PATTERNS:
        if pattern in lower_prompt:
            return True, pattern

    return False, ""


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

def validate_prompt(prompt: str) -> str:
    """
    Validate and sanitize a user prompt.

    Raises:
        ValueError

    Returns:
        Sanitized prompt.
    """

    if prompt is None:
        raise ValueError("Prompt is required.")

    prompt = str(prompt)

    prompt = _remove_control_characters(prompt)

    prompt = _normalize(prompt)

    if not prompt:
        raise ValueError("Prompt is required.")

    if len(prompt) > MAX_PROMPT_LENGTH:
        raise ValueError(
            f"Prompt exceeds maximum length of {MAX_PROMPT_LENGTH} characters."
        )

    blocked, pattern = _contains_prompt_injection(prompt)

    if blocked:
        raise ValueError(
            f"Prompt contains prohibited content ({pattern})."
        )

    # Escape HTML tags
    prompt = html.escape(prompt)

    return prompt

