"""记忆提取的 System One 预门：Phase 1 LLM 调用前先判会话是否值得提取。

模式（MEMORY_EXTRACTION_SYSTEMONE_MODE）：
- off：关闭（默认，行为与引入前完全一致）
- shadow：只记录判定不生效，用于真实流量观察一致率
- gate：P(值得记忆) < 阈值时直接终态 no-op 跳过 LLM 提取

判定调用失败一律 fail-open（照旧走 LLM），预门永不阻断提取主链路。
"""

from __future__ import annotations

import logging
import time
from collections.abc import Sequence
from dataclasses import dataclass

from src.infra.decision.client import is_systemone_configured, judge_noul
from src.kernel.config import settings

logger = logging.getLogger(__name__)

GATE_MODE_OFF = "off"
GATE_MODE_SHADOW = "shadow"
GATE_MODE_GATE = "gate"
_VALID_MODES = {GATE_MODE_OFF, GATE_MODE_SHADOW, GATE_MODE_GATE}

# 预门只需整体印象：取转录前缀即可，远小于提取转录 24k 上限
_STATE_MAX_CHARS = 12_000

# 提问与 criteria 用英文（Jev/von 以英文训练为主，判定语义最稳），
# state 本身保持用户语言
_MEMORABLE_INSTRUCTIONS = (
    "Does this conversation transcript contain durable facts, preferences, "
    "decisions, or project context about the user that would be useful in "
    "future conversations?"
)
_MEMORABLE_CRITERIA = {
    "true": (
        "Concrete personal facts, stable preferences, requirements, decisions, "
        "or project context with lasting value beyond this conversation"
    ),
    "false": (
        "Casual chat, one-off questions, ephemeral task execution, or content "
        "fully handled with no lasting value"
    ),
}


@dataclass(frozen=True)
class GateResult:
    """预门判定结果；skip=True 时提取主链路应跳过 LLM 调用。"""

    p_memorable: float
    skip: bool


def _render_gate_state(
    session_name: str,
    agent_id: str,
    turns: Sequence[dict[str, str]],
) -> str:
    lines = [f"Session: {session_name or '(unnamed)'}"]
    if agent_id:
        lines.append(f"Agent: {agent_id}")
    lines.append("Transcript:")
    budget = _STATE_MAX_CHARS
    emitted_any = False
    for turn in turns:
        user = str(turn.get("user") or "").strip()
        assistant = str(turn.get("assistant") or "").strip()
        if not user and not assistant:
            continue
        parts = []
        if user:
            parts.append(f"User: {user}")
        if assistant:
            parts.append(f"Assistant: {assistant}")
        block = "\n".join(parts)
        # 每块预留其前置 join 分隔符（\n\n）的预算，保证整体渲染不超上限
        reserve = 0 if not emitted_any else 2
        block = block[: max(0, budget - reserve)]
        if not block:
            break
        lines.append(block)
        budget -= len(block) + reserve
        emitted_any = True
        if budget <= 0:
            break
    return "\n\n".join(lines)


async def evaluate_extraction_gate(
    session_id: str,
    session_name: str,
    agent_id: str,
    turns: Sequence[dict[str, str]],
) -> GateResult | None:
    """运行提取预门；off / 未配置 / 判定失败返回 None（照旧走 LLM）。"""
    mode = (
        str(getattr(settings, "MEMORY_EXTRACTION_SYSTEMONE_MODE", GATE_MODE_OFF) or GATE_MODE_OFF)
        .strip()
        .lower()
    )
    if mode not in _VALID_MODES or mode == GATE_MODE_OFF:
        return None
    if not is_systemone_configured():
        return None

    threshold = float(getattr(settings, "MEMORY_EXTRACTION_SYSTEMONE_GATE_THRESHOLD", 0.35) or 0.35)
    started = time.monotonic()
    p_memorable = await judge_noul(
        _render_gate_state(session_name, agent_id, turns),
        _MEMORABLE_INSTRUCTIONS,
        criteria=_MEMORABLE_CRITERIA,
    )
    elapsed_ms = int((time.monotonic() - started) * 1000)

    if p_memorable is None:
        # fail-open：预门不可用不阻断提取
        logger.warning(
            "[MemoryExtraction] systemone gate unavailable, falling back to LLM: session=%s mode=%s",
            session_id,
            mode,
        )
        return None

    skip = mode == GATE_MODE_GATE and p_memorable < threshold
    logger.info(
        "[MemoryExtraction] systemone gate: session=%s mode=%s p_memorable=%.3f threshold=%.2f skip=%s elapsed_ms=%d",
        session_id,
        mode,
        p_memorable,
        threshold,
        skip,
        elapsed_ms,
    )
    return GateResult(p_memorable=p_memorable, skip=skip)
