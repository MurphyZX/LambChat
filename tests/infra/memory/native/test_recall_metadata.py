"""Recall must preserve the metadata used to choose project-specific corrections."""

import logging
import os
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from motor.motor_asyncio import AsyncIOMotorClient

from src.infra.memory.client.native import search, vector_store


def _documents():
    now = datetime.now(timezone.utc)
    return [
        {
            "memory_id": mid,
            "user_id": "local-case-user",
            "content": content,
            "summary": content,
            "title": "deployment",
            "memory_type": "user",
            "source": "manual",
            "scope": scope,
            "project_id": project,
            "context": context,
            "created_at": now,
            "updated_at": now,
            "embedding": [1.0, 0.0],
        }
        for mid, scope, project, context, content in [
            ("generic", "user", None, "user_preference", "deployment uses automatic rollout"),
            ("project", "project", "billing", "project_constraint", "deployment uses staging"),
            (
                "correction",
                "project",
                "billing",
                "feedback_rule",
                "deployment correction: verify staging before production",
            ),
            ("other-project", "project", "other", "feedback_rule", "deployment other project"),
        ]
    ]


def test_formatted_recall_prioritizes_project_correction():
    memories = [search.format_memory(doc, 0.8) for doc in _documents()[:3]]

    ranked = search.prioritize_sources(memories)

    assert [m["memory_id"] for m in ranked] == ["correction", "project", "generic"]
    assert ranked[0]["context"] == "feedback_rule"


@pytest.fixture
async def local_collection():
    """Opt-in real Mongo case; creates and drops only a unique test collection."""
    if os.environ.get("LAMBCHAT_MEMORY_MONGO_TEST") != "1":
        pytest.skip("set LAMBCHAT_MEMORY_MONGO_TEST=1 with local Mongo configuration")
    from src.infra.storage.mongodb import build_mongo_connection_string
    from src.kernel.config import settings

    client = AsyncIOMotorClient(build_mongo_connection_string(), serverSelectionTimeoutMS=3000)
    collection = client[settings.MONGODB_DB][f"test_recall_metadata_{uuid4().hex}"]
    try:
        await collection.insert_many(_documents())
        yield collection
    finally:
        await collection.drop()
        client.close()


@pytest.mark.parametrize("mode", ["text", "keyword", "overview", "cosine"])
async def test_local_mongo_recall_preserves_project_corrections(
    local_collection, mode, monkeypatch
):
    """Actual query projection + formatting + ranking, including project isolation."""
    if mode == "text":
        await local_collection.create_index([("content", "text")])
    if mode in {"text", "keyword"}:
        memories = await search.text_search(
            local_collection,
            logging.getLogger(__name__),
            "local-case-user",
            "deployment",
            10,
            None,
            project_id="billing",
        )
    elif mode == "overview":
        memories = await search.recent_context_fallback(
            local_collection,
            "local-case-user",
            10,
            None,
            project_id="billing",
        )
    else:
        # Embedding provider is deterministic; Mongo filtering/projection and cosine are real.
        async def embed(query):
            return [1.0, 0.0]

        async def no_qdrant(**kwargs):
            return None

        monkeypatch.setattr(vector_store, "index_search", no_qdrant)
        backend = SimpleNamespace(
            _collection=local_collection, _maybe_embed=embed, _logger=logging.getLogger(__name__)
        )
        memories = await search.vector_search(
            backend,
            "local-case-user",
            "deployment",
            10,
            None,
            project_id="billing",
        )

    ranked = search.prioritize_sources(memories)
    assert [m["memory_id"] for m in ranked] == ["correction", "project", "generic"]
    assert ranked[0]["scope"] == "project"
    assert ranked[0]["project_id"] == "billing"
    assert ranked[0]["context"] == "feedback_rule"
