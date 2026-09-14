"""重复告警限频过滤器测试（LangSmith 429 额度耗尽曾每秒刷屏数百条）。"""

from __future__ import annotations

import logging

from src.infra.logging.filter import KeywordRateLimitFilter


def _record(message: str) -> logging.LogRecord:
    return logging.LogRecord(
        name="langsmith.client",
        level=logging.WARNING,
        pathname=__file__,
        lineno=1,
        msg=message,
        args=(),
        exc_info=None,
    )


def test_matching_records_pass_once_then_suppressed_within_window():
    gate = KeywordRateLimitFilter(
        keywords=("Rate limit exceeded",), window_seconds=600
    )

    assert gate.filter(_record("Rate limit exceeded for https://api.smith...")) is True
    assert gate.filter(_record("Rate limit exceeded for https://api.smith...")) is False
    assert gate.filter(_record("Rate limit exceeded (other tenant)")) is False


def test_window_reopens_after_interval():
    gate = KeywordRateLimitFilter(
        keywords=("Rate limit exceeded",), window_seconds=600
    )

    assert gate.filter(_record("Rate limit exceeded")) is True

    gate._last_emit = 0.0  # simulate window elapsed

    assert gate.filter(_record("Rate limit exceeded")) is True


def test_unrelated_records_pass_through_untouched():
    gate = KeywordRateLimitFilter(
        keywords=("Rate limit exceeded",), window_seconds=600
    )

    assert gate.filter(_record("Some other warning")) is True
    assert gate.filter(_record("Some other warning")) is True
    assert gate.filter(_record("Rate limit exceeded")) is True
