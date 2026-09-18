"""Shared Todo middleware configuration for user-facing Agents."""

from langchain.agents.middleware import TodoListMiddleware


def create_todo_middleware() -> TodoListMiddleware:
    """Expose Todo state/tools without duplicating the shared progress policy."""
    return TodoListMiddleware(system_prompt="")
