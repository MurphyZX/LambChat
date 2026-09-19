"""Shared Todo middleware configuration for user-facing Agents."""

from langchain.agents.middleware import TodoListMiddleware

TODO_TOOL_DESCRIPTION = (
    "Create or replace the Todo plan for the current task.\n\n"
    "Use this for multi-step work: two or more tool calls, three or more distinct\n"
    "steps, uncertainty, external checks, or an explicit Todo/plan request. Skip\n"
    "trivial one-step requests. The tool replaces the entire list, so include\n"
    "every item that should remain. Start the first active item as `in_progress`,\n"
    "mark items `completed` immediately after verification, and remove stale\n"
    "items. Call it at most once per model turn; update the plan again when the\n"
    "phase changes. If the user explicitly asks for a plan or for this tool,\n"
    "always call it before doing the work.\n"
)


def create_todo_middleware() -> TodoListMiddleware:
    """Expose Todo state/tools without duplicating the shared progress policy."""
    return TodoListMiddleware(system_prompt="", tool_description=TODO_TOOL_DESCRIPTION)
