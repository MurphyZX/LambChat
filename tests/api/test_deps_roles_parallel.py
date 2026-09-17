from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from src.api import deps


def _role(name: str, permissions: list[str]) -> SimpleNamespace:
    return SimpleNamespace(id=f"id-{name}", name=name, permissions=permissions)


@pytest.mark.asyncio
async def test_role_lookups_run_concurrently(monkeypatch: pytest.MonkeyPatch) -> None:
    started: list[str] = []
    all_started = asyncio.Event()

    class _RoleStorage:
        async def get_by_name(self, name: str) -> SimpleNamespace | None:
            started.append(name)
            if len(started) == 2:
                all_started.set()
            # 串行实现下第二个查询永远等不到第一个完成，超时即失败
            await asyncio.wait_for(all_started.wait(), timeout=1.0)
            return _role(name, [f"{name}:read"]) if name != "ghost" else None

    monkeypatch.setattr(deps, "RoleStorage", _RoleStorage)
    deps.clear_auth_cache()

    roles, permissions = await deps._get_user_roles_and_permissions(["admin", "user"])

    assert roles == ["admin", "user"]
    assert set(permissions) == {"admin:read", "user:read"}


@pytest.mark.asyncio
async def test_missing_roles_are_skipped_and_merge_order_kept(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _RoleStorage:
        async def get_by_name(self, name: str) -> SimpleNamespace | None:
            if name == "ghost":
                return None
            return _role(name, [f"{name}:read", "shared:perm"])

    monkeypatch.setattr(deps, "RoleStorage", _RoleStorage)
    deps.clear_auth_cache()

    roles, permissions = await deps._get_user_roles_and_permissions(
        ["ghost", "admin", "user", "ghost"]
    )

    assert roles == ["admin", "user"]
    assert set(permissions) == {"admin:read", "user:read", "shared:perm"}


@pytest.mark.asyncio
async def test_role_cache_hits_within_ttl(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    class _RoleStorage:
        async def get_by_name(self, name: str) -> SimpleNamespace | None:
            calls.append(name)
            return _role(name, [f"{name}:read"])

    monkeypatch.setattr(deps, "RoleStorage", _RoleStorage)
    deps.clear_auth_cache()

    await deps._get_user_roles_and_permissions(["admin", "user"])
    await deps._get_user_roles_and_permissions(["admin", "user"])

    assert sorted(calls) == ["admin", "user"]

    # clear_auth_cache（用户/角色变更）后必须重新查库
    deps.clear_auth_cache()
    await deps._get_user_roles_and_permissions(["admin", "user"])
    assert sorted(calls) == ["admin", "admin", "user", "user"]


@pytest.mark.asyncio
async def test_role_cache_does_not_cache_missing_roles(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    class _RoleStorage:
        async def get_by_name(self, name: str) -> SimpleNamespace | None:
            calls.append(name)
            return None

    monkeypatch.setattr(deps, "RoleStorage", _RoleStorage)
    deps.clear_auth_cache()

    roles, permissions = await deps._get_user_roles_and_permissions(["ghost"])
    assert roles == []
    assert permissions == []

    # 角色不存在的路径不缓存，下一次请求仍查库（行为与无缓存时一致）
    roles, permissions = await deps._get_user_roles_and_permissions(["ghost"])
    assert roles == []
    assert calls == ["ghost", "ghost"]
