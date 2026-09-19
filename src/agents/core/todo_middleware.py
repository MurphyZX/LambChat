"""Shared Todo middleware configuration for user-facing Agents."""

from langchain.agents.middleware import TodoListMiddleware

TODO_TOOL_DESCRIPTION = (
    "Create or replace the Todo plan for the current task.\n\n"
    "Use this for multi-step work: multiple tools, three or more distinct steps,\n"
    "uncertainty, external checks, or an explicit Todo request. Skip trivial\n"
    "one-step requests. The tool replaces the entire list, so include every item\n"
    "that should remain. Start the first active item as `in_progress`, mark items\n"
    "`completed` immediately after verification, and remove stale items. "
    "Call it at most once per model turn; update the plan again when the phase changes.\n"
)


def create_todo_middleware() -> TodoListMiddleware:
    """Expose Todo state/tools without duplicating the shared progress policy."""
    return TodoListMiddleware(system_prompt="", tool_description=TODO_TOOL_DESCRIPTION)
