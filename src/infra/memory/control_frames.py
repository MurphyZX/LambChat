"""Shared sanitization contract for model/runtime control frames."""

from __future__ import annotations

import re

CONTROL_FRAME_NAMES: tuple[str, ...] = (
    "memory_context",
    "memory_index",
    "memory_index_context",
    "turn_context",
    "session_todo_context",
    "active_goal_context",
    "active_goal",
    "env_var_keys_context",
    "sandbox_workspace_context",
)

_FRAME_ALTERNATION = "|".join(re.escape(name) for name in CONTROL_FRAME_NAMES)

# Tags are stripped from individual untrusted fields and queries.
CONTROL_FRAME_TAG_RE = re.compile(
    rf"</?(?:{_FRAME_ALTERNATION})(?:\s[^>]*)?>",
    re.IGNORECASE,
)

# Complete injected blocks are removed before durable memory extraction or
# when rebuilding a generated tool description.  The captured tag name keeps
# opening/closing pairs matched even when a provider changes the casing.
CONTROL_FRAME_BLOCK_RE = re.compile(
    rf"\s*<({_FRAME_ALTERNATION})(?:\s[^>]*)?>.*?</\1>\s*",
    re.DOTALL | re.IGNORECASE,
)
