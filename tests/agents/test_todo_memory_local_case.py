from types import SimpleNamespace

import pytest
from langchain_core.messages import HumanMessage
from langchain_core.tools import BaseTool


@pytest.mark.asyncio
async def test_local_two_turn_todo_memory_workflow(monkeypatch):
    """A local two-turn case keeps Todo state separate from durable memory."""
    from src.agents.core.todo_middleware import create_todo_middleware
    from src.infra.agent.middleware import prompt_injection as pi
    from src.infra.memory.client.native.search import prioritize_sources

    todo_tool = create_todo_middleware().tools[0]
    runtime = SimpleNamespace(tool_call_id="todo-1")
    todo_result = await todo_tool.coroutine(
        todos=[
            {"content": "Inspect project constraints", "status": "completed"},
            {"content": "Apply the implementation", "status": "in_progress"},
            {"content": "Run the tests", "status": "pending"},
        ],
        runtime=runtime,
    )
    todos = todo_result.update["todos"]

    async def fake_index(user_id: str, *, session_id: str | None, project_id: str | None):
        assert (user_id, session_id, project_id) == ("u1", "s1", "project-1")
        return "<memory_index>project deployment decision</memory_index>"

    monkeypatch.setattr(pi, "_build_memory_index_for_user", fake_index)
    monkeypatch.setattr(
        "src.infra.memory.scope.resolve_session_project_id",
        lambda session_id: _project_id(session_id),
    )
    middleware = pi.MemoryRecallIndexMiddleware(user_id="u1", session_id="s1")

    class RecallTool(BaseTool):
        name: str = "memory_recall"
        description: str = "Recall memory"

        def _run(self, *args, **kwargs):
            return ""

    class Request:
        messages = [HumanMessage(content="Continue the project implementation")]
        state = {"todos": todos}
        tools = [RecallTool()]

        def override(self, **updates):
            updated = Request()
            updated.__dict__.update(self.__dict__)
            updated.__dict__.update(updates)
            return updated

    captured = {}

    async def handler(request):
        captured["request"] = request
        return request

    await middleware.awrap_model_call(Request(), handler)
    description = captured["request"].tools[0].description
    assert "Apply the implementation" in description
    assert "checkpoint" in description
    assert "project deployment decision" in description

    ranked = prioritize_sources(
        [
            {"memory_id": "user", "scope": "user", "source": "manual", "score": 0.95},
            {
                "memory_id": "project",
                "scope": "project",
                "project_id": "project-1",
                "source": "manual",
                "score": 0.4,
            },
        ]
    )
    assert ranked[0]["memory_id"] == "project"


async def _project_id(session_id: str | None) -> str:
    assert session_id == "s1"
    return "project-1"
