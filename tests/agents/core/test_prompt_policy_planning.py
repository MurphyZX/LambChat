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


def test_todo_middleware_injects_system_level_planning_guidance() -> None:
    """主 agent 的 system prompt 不含 WORKFLOW/PROGRESS 政策（fast 仅存储政策），
    Todo 触发指引必须随中间件的 system_prompt 注入，否则主 agent 零指引。"""
    from src.agents.core.todo_middleware import create_todo_middleware

    system_prompt = create_todo_middleware().system_prompt
    assert system_prompt.strip()
    assert "3+ steps" in system_prompt
    assert "always call first" in system_prompt
    assert "write_todos" in system_prompt
