"""Shared Todo middleware configuration for user-facing Agents."""

from langchain.agents.middleware import TodoListMiddleware


def create_todo_middleware() -> TodoListMiddleware:
    """Create the standard session-scoped Todo planner middleware."""
    return TodoListMiddleware()
