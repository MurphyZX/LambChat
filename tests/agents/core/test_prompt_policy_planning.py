"""Planning policy must give models concrete todo triggers and compliance."""

from src.agents.core.prompt_policy import PROGRESS_POLICY
from src.agents.core.todo_middleware import TODO_TOOL_DESCRIPTION


def test_progress_policy_gives_concrete_todo_trigger() -> None:
    # 阈值具体化：模型对"multi-step"主观跳过，需要可判定的触发条件。
    assert "3+ steps" in PROGRESS_POLICY
    assert "multiple tool calls" in PROGRESS_POLICY
    assert "before any tool call" in PROGRESS_POLICY


def test_progress_policy_requires_explicit_request_compliance() -> None:
    # 显式要求计划/清单/write_todos 时必须遵守（staging 实测会被模型忽略）。
    assert "Explicit" in PROGRESS_POLICY
    assert "always call first" in PROGRESS_POLICY


def test_todo_tool_description_pins_actionable_threshold() -> None:
    assert "two or more tool calls" in TODO_TOOL_DESCRIPTION
    assert "always call it" in TODO_TOOL_DESCRIPTION
