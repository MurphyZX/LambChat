"""Document parse providers: multi-provider OCR/parsing clients.

对齐 Open WebUI 的文档解析接入面（Mistral OCR / MinerU / Azure Document
Intelligence / docling-serve / Apache Tika / PaddleOCR-VL / MarkItDown），
按本仓库 web_search_providers 的形态组织：settings 选 provider（auto =
第一个配好凭据的，markitdown 为零配置本地兜底），归一化输出统一为
``{"markdown", "images": [{"ref", "base64"}], "pages", "engine"}``；
图片由工具层统一上传存储并重写 Markdown 引用。
"""

from __future__ import annotations

import asyncio
import base64
import importlib.util
import io
import re
import zipfile
from collections.abc import Callable
from typing import Any

import httpx

from src.infra.async_utils import run_blocking_io
from src.infra.logging import get_logger
from src.kernel.config import settings

logger = get_logger(__name__)

_MISTRAL_DEFAULT_BASE_URL = "https://api.mistral.ai"
_MISTRAL_DEFAULT_MODEL = "mistral-ocr-latest"
_MINERU_DEFAULT_CLOUD_URL = "https://mineru.net/api/v4"
_MINERU_POLL_INTERVAL_SECONDS = 2.0
_MINERU_MAX_POLLS = 150  # 5 分钟上限
_AZURE_DEFAULT_MODEL = "prebuilt-read"
_AZURE_API_VERSION = "2024-11-30"
_AZURE_POLL_INTERVAL_SECONDS = 1.5
_AZURE_MAX_POLLS = 200
_TIKA_CONTENT_KEY = "X-TIKA:content"
_PADDLE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"}
_MARKITDOWN_SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx"}
_MEDIA_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"}
# markitdown 输出里的本地图片引用：docx 是被截断的 data URI
# （`![](data:image/png;base64...)`），pptx 是自造文件名（`![](Picture2.jpg)`），
# 都不带 http(s) 前缀——按出现顺序换成我们生成的 ref。
_LOCAL_MARKDOWN_IMAGE_REF_RE = re.compile(r"(!\[[^\]]*\]\()((?!https?://)[^\s)]+)(\))")
_markitdown_available: bool | None = None


class DocumentParseError(Exception):
    """Provider 配置缺失或请求失败。"""


def _setting(name: str, default: str = "") -> str:
    return str(getattr(settings, name, default) or default).strip()


def _result(
    *,
    markdown: str,
    images: list[dict[str, str]] | None = None,
    pages: int | None = None,
    engine: str,
) -> dict[str, Any]:
    return {
        "markdown": markdown,
        "images": images or [],
        "pages": pages,
        "engine": engine,
    }


def _raise_for_status(response: httpx.Response, provider: str) -> None:
    if response.is_success:
        return
    detail = ""
    try:
        body = response.json()
        detail = str(body.get("msg") or body.get("message") or body)
    except Exception:
        detail = response.text[:200]
    raise DocumentParseError(f"{provider} HTTP {response.status_code}: {detail}")


# ── Mistral OCR ───────────────────────────────────────────────────────────


def build_mistral_ocr_request(
    model: str,
    filename: str,
    base64_data: str,
    *,
    include_images: bool = True,
    image_limit: int | None = None,
    pages: str | None = None,
) -> dict[str, Any]:
    """Build the JSON body for Mistral's /v1/ocr endpoint."""
    body: dict[str, Any] = {
        "model": model,
        "document": {
            "type": "base64",
            "base64": base64_data,
            "document_name": filename,
        },
    }
    if pages:
        body["pages"] = pages
    if include_images:
        body["include_image_base64"] = True
        if image_limit is not None and image_limit > 0:
            body["image_limit"] = int(image_limit)
    return body


def merge_page_markdown(pages: list[dict[str, Any]]) -> str:
    """Concatenate per-page markdown in page order."""
    ordered = sorted(pages, key=lambda page: page.get("index") or 0)
    return "\n\n".join(str(page.get("markdown") or "") for page in ordered if page.get("markdown"))


def extract_ocr_images(pages: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Collect provider-embedded images (ref + base64), deduped by ref, in page order."""
    collected: list[dict[str, str]] = []
    seen_refs: set[str] = set()
    ordered = sorted(pages, key=lambda page: page.get("index") or 0)
    for page in ordered:
        images = page.get("images") or []
        if not isinstance(images, list):
            continue
        for image in images:
            if not isinstance(image, dict):
                continue
            ref = image.get("id")
            image_base64 = image.get("image_base64")
            if not ref or not image_base64 or str(ref) in seen_refs:
                continue
            seen_refs.add(str(ref))
            collected.append({"ref": str(ref), "base64": str(image_base64)})
    return collected


def _collect_image_dict(images: Any) -> list[dict[str, str]]:
    """Providers that return ``{name: base64}`` image maps (MinerU/Paddle)."""
    if not isinstance(images, dict):
        return []
    return [
        {"ref": str(name), "base64": str(value)}
        for name, value in images.items()
        if isinstance(name, str) and isinstance(value, str) and value
    ]


async def mistral_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    api_key = _setting("DOCUMENT_PARSE_MISTRAL_API_KEY")
    if not api_key:
        raise DocumentParseError("DOCUMENT_PARSE_MISTRAL_API_KEY is not configured")
    base_url = (_setting("DOCUMENT_PARSE_MISTRAL_BASE_URL") or _MISTRAL_DEFAULT_BASE_URL).rstrip(
        "/"
    )
    model = _setting("DOCUMENT_PARSE_MISTRAL_MODEL") or _MISTRAL_DEFAULT_MODEL

    encoded = base64.b64encode(data).decode("ascii")
    body = build_mistral_ocr_request(
        model,
        filename,
        encoded,
        include_images=include_images,
        image_limit=image_limit or None,
        pages=pages,
    )
    response = await client.post(
        f"{base_url}/v1/ocr",
        headers={"Authorization": f"Bearer {api_key}"},
        json=body,
    )
    _raise_for_status(response, "mistral")
    payload = response.json()

    page_list = payload.get("pages") or []
    if not isinstance(page_list, list) or not page_list:
        raise DocumentParseError("mistral returned no pages")

    usage = payload.get("usage_info") or {}
    return _result(
        markdown=merge_page_markdown(page_list),
        images=extract_ocr_images(page_list) if include_images else [],
        pages=usage.get("pages_processed") or len(page_list),
        engine=f"mistral:{model}",
    )


# ── MinerU（cloud / local 两种模式） ──────────────────────────────────────


def _mineru_mode() -> str:
    mode = _setting("DOCUMENT_PARSE_MINERU_API_MODE", "cloud").lower()
    return mode if mode in ("cloud", "local") else "cloud"


async def _mineru_parse_local(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
) -> dict[str, Any]:
    api_url = _setting("DOCUMENT_PARSE_MINERU_API_URL")
    if not api_url:
        raise DocumentParseError("DOCUMENT_PARSE_MINERU_API_URL is not configured")
    base = api_url.rstrip("/")

    response = await client.post(
        f"{base}/file_parse",
        data={"return_md": "true"},
        files={"files": (filename, data, "application/octet-stream")},
    )
    _raise_for_status(response, "mineru")
    payload = response.json()

    results = payload.get("results")
    file_result: dict[str, Any] | None = None
    if isinstance(results, dict) and results:
        file_result = next(iter(results.values()))
    elif isinstance(results, list) and results:
        file_result = results[0]
    if not isinstance(file_result, dict):
        raise DocumentParseError("mineru local returned no results")

    markdown = str(file_result.get("md_content") or "")
    if not markdown:
        raise DocumentParseError("mineru local returned empty markdown")
    return _result(
        markdown=markdown,
        images=_collect_image_dict(file_result.get("images")) if include_images else [],
        pages=None,
        engine="mineru:local",
    )


def extract_mineru_zip(zip_bytes: bytes) -> tuple[str, list[dict[str, str]]]:
    """Extract markdown + ``images/`` entries from a MinerU results ZIP.

    Markdown 引用形如 ``![...](images/xxx.jpg)``，ref 保持相对路径
    ``images/<name>`` 以便上传后原地重写。
    """
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
            markdown = ""
            for name in archive.namelist():
                if name.endswith(".md"):
                    markdown = archive.read(name).decode("utf-8", errors="replace")
                    break
            if not markdown:
                raise DocumentParseError("no .md file in mineru results zip")

            images: list[dict[str, str]] = []
            for name in archive.namelist():
                lowered = name.lower()
                if "/images/" not in f"/{lowered}" and not lowered.startswith("images/"):
                    continue
                if lowered.rsplit(".", 1)[-1] not in {"png", "jpg", "jpeg", "gif", "webp", "bmp"}:
                    continue
                ref = f"images/{name.rsplit('/', 1)[-1]}"
                encoded = base64.b64encode(archive.read(name)).decode("ascii")
                images.append({"ref": ref, "base64": encoded})
            return markdown, images
    except zipfile.BadZipFile as e:
        raise DocumentParseError(f"mineru results zip invalid: {e}") from e


async def _mineru_parse_cloud(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
) -> dict[str, Any]:
    api_key = _setting("DOCUMENT_PARSE_MINERU_API_KEY")
    if not api_key:
        raise DocumentParseError("DOCUMENT_PARSE_MINERU_API_KEY is not configured")
    base = (_setting("DOCUMENT_PARSE_MINERU_API_URL") or _MINERU_DEFAULT_CLOUD_URL).rstrip("/")
    headers = {"Authorization": f"Bearer {api_key}"}

    response = await client.post(
        f"{base}/file-urls/batch",
        headers={**headers, "Content-Type": "application/json"},
        json={"files": [{"name": filename, "is_ocr": False}]},
    )
    _raise_for_status(response, "mineru")
    batch_payload = response.json()
    if batch_payload.get("code") != 0:
        raise DocumentParseError(f"mineru cloud error: {batch_payload.get('msg')}")
    batch_data = batch_payload.get("data") or {}
    batch_id = batch_data.get("batch_id")
    file_urls = batch_data.get("file_urls") or []
    if not batch_id or not file_urls:
        raise DocumentParseError("mineru cloud response missing batch_id/file_urls")

    upload_response = await client.put(str(file_urls[0]), content=data)
    _raise_for_status(upload_response, "mineru")

    zip_url = ""
    for _ in range(_MINERU_MAX_POLLS):
        status_response = await client.get(
            f"{base}/extract-results/batch/{batch_id}", headers=headers
        )
        _raise_for_status(status_response, "mineru")
        status_payload = status_response.json()
        if status_payload.get("code") != 0:
            raise DocumentParseError(f"mineru cloud error: {status_payload.get('msg')}")
        extract_result = (status_payload.get("data") or {}).get("extract_result") or []
        file_result = next(
            (item for item in extract_result if item.get("file_name") == filename), None
        )
        if file_result is None:
            raise DocumentParseError(f"mineru cloud: {filename} missing from batch results")
        state = file_result.get("state")
        if state == "done":
            zip_url = str(file_result.get("full_zip_url") or "")
            break
        if state == "failed":
            raise DocumentParseError(f"mineru cloud failed: {file_result.get('err_msg')}")
        await asyncio.sleep(_MINERU_POLL_INTERVAL_SECONDS)
    if not zip_url:
        raise DocumentParseError("mineru cloud processing timed out")

    zip_response = await client.get(str(zip_url))
    _raise_for_status(zip_response, "mineru")
    markdown, images = extract_mineru_zip(zip_response.content)
    return _result(
        markdown=markdown,
        images=images if include_images else [],
        pages=None,
        engine="mineru:cloud",
    )


async def mineru_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    if _mineru_mode() == "local":
        return await _mineru_parse_local(
            client, data=data, filename=filename, include_images=include_images
        )
    return await _mineru_parse_cloud(
        client, data=data, filename=filename, include_images=include_images
    )


# ── Azure Document Intelligence ───────────────────────────────────────────


async def azure_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    endpoint = _setting("DOCUMENT_PARSE_AZURE_ENDPOINT")
    api_key = _setting("DOCUMENT_PARSE_AZURE_KEY")
    if not endpoint or not api_key:
        raise DocumentParseError("DOCUMENT_PARSE_AZURE_ENDPOINT/KEY is not configured")
    model = _setting("DOCUMENT_PARSE_AZURE_MODEL") or _AZURE_DEFAULT_MODEL
    headers = {"Ocp-Apim-Subscription-Key": api_key}

    analyze_url = f"{endpoint.rstrip('/')}/documentintelligence/documentModels/{model}:analyze"
    response = await client.post(
        analyze_url,
        params={"api-version": _AZURE_API_VERSION, "outputContentFormat": "markdown"},
        headers=headers,
        json={"base64Source": base64.b64encode(data).decode("ascii")},
    )
    _raise_for_status(response, "azure")
    operation_url = response.headers.get("operation-location") or response.headers.get(
        "Operation-Location"
    )
    if not operation_url:
        raise DocumentParseError("azure response missing operation-location")

    for _ in range(_AZURE_MAX_POLLS):
        status_response = await client.get(operation_url, headers=headers)
        _raise_for_status(status_response, "azure")
        body = status_response.json()
        status = body.get("status")
        if status == "succeeded":
            analyze_result = body.get("analyzeResult") or {}
            markdown = str(analyze_result.get("content") or "")
            if not markdown:
                raise DocumentParseError("azure returned empty content")
            page_count = len(analyze_result.get("pages") or [])
            return _result(
                markdown=markdown,
                pages=page_count or None,
                engine=f"azure:{model}",
            )
        if status in ("failed", "canceled"):
            raise DocumentParseError(f"azure analyze {status}")
        await asyncio.sleep(_AZURE_POLL_INTERVAL_SECONDS)
    raise DocumentParseError("azure analyze timed out")


# ── docling-serve ─────────────────────────────────────────────────────────


async def docling_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    api_url = _setting("DOCUMENT_PARSE_DOCLING_URL")
    if not api_url:
        raise DocumentParseError("DOCUMENT_PARSE_DOCLING_URL is not configured")
    headers = {}
    api_key = _setting("DOCUMENT_PARSE_DOCLING_API_KEY")
    if api_key:
        headers["X-Api-Key"] = api_key

    response = await client.post(
        f"{api_url.rstrip('/')}/v1/convert/file",
        files={"files": (filename, data, "application/octet-stream")},
        headers=headers,
    )
    _raise_for_status(response, "docling")
    payload = response.json()

    document = payload.get("document") or {}
    markdown = str(document.get("md") or "")
    if not markdown:
        raise DocumentParseError("docling returned empty markdown")
    return _result(
        markdown=markdown,
        pages=document.get("num_pages") if isinstance(document.get("num_pages"), int) else None,
        engine="docling",
    )


# ── Apache Tika ───────────────────────────────────────────────────────────


async def tika_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    api_url = _setting("DOCUMENT_PARSE_TIKA_URL")
    if not api_url:
        raise DocumentParseError("DOCUMENT_PARSE_TIKA_URL is not configured")

    response = await client.put(
        f"{api_url.rstrip('/')}/tika/text",
        content=data,
        headers={"Content-Type": "application/octet-stream"},
    )
    _raise_for_status(response, "tika")
    text = str(response.json().get(_TIKA_CONTENT_KEY) or "")
    if not text.strip():
        raise DocumentParseError("tika returned empty text")
    return _result(markdown=text, pages=None, engine="tika")


# ── PaddleOCR-VL ──────────────────────────────────────────────────────────


async def paddleocr_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    api_url = _setting("DOCUMENT_PARSE_PADDLEOCR_URL")
    token = _setting("DOCUMENT_PARSE_PADDLEOCR_TOKEN")
    if not api_url or not token:
        raise DocumentParseError("DOCUMENT_PARSE_PADDLEOCR_URL/TOKEN is not configured")

    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    payload = {
        "file": base64.b64encode(data).decode("ascii"),
        "fileType": 1 if f".{suffix}" in _PADDLE_IMAGE_EXTENSIONS else 0,
        "useDocOrientationClassify": False,
        "useDocUnwarping": False,
        "useChartRecognition": False,
    }
    response = await client.post(
        f"{api_url.rstrip('/')}/layout-parsing",
        headers={"Authorization": f"token {token}", "Content-Type": "application/json"},
        json=payload,
    )
    _raise_for_status(response, "paddleocr_vl")

    layout_results = ((response.json().get("result") or {}).get("layoutParsingResults")) or []
    if not layout_results:
        raise DocumentParseError("paddleocr_vl returned no layout results")

    parts: list[str] = []
    images: list[dict[str, str]] = []
    for page in layout_results:
        markdown_part = (page.get("markdown") or {}).get("text") or ""
        if markdown_part.strip():
            parts.append(str(markdown_part))
        if include_images:
            images.extend(_collect_image_dict((page.get("markdown") or {}).get("images")))
    markdown = "\n\n".join(parts)
    if not markdown:
        raise DocumentParseError("paddleocr_vl returned empty markdown")
    return _result(
        markdown=markdown,
        images=images,
        pages=len(layout_results),
        engine="paddleocr_vl",
    )


# ── MarkItDown（本地库，零配置兜底） ─────────────────────────────────────


def extract_ooxml_media_images(data: bytes) -> list[dict[str, str]]:
    """直接从 OOXML ZIP 的 media 目录抽图片（word/media、ppt/media）。

    markitdown 的 Markdown 里 data URI 会被截断（`base64...`）、pptx 引用
    是自造文件名，字节只能回源文件里拿；ref 用我们生成的序号名。
    """
    images: list[dict[str, str]] = []
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for name in archive.namelist():
                if "/media/" not in f"/{name}":
                    continue
                extension = name.lower().rsplit(".", 1)[-1]
                if extension not in _MEDIA_IMAGE_EXTENSIONS:
                    continue
                ref = f"markitdown-img-{len(images) + 1}.{extension}"
                images.append(
                    {
                        "ref": ref,
                        "base64": base64.b64encode(archive.read(name)).decode("ascii"),
                    }
                )
    except (zipfile.BadZipFile, OSError, ValueError):
        return []
    return images


def rewrite_local_image_refs(markdown: str, refs: list[str]) -> str:
    """把 Markdown 里的本地图片引用按出现顺序换成生成的 ref。"""
    state = {"next": 0}

    def _replace(match: re.Match[str]) -> str:
        if state["next"] >= len(refs):
            return match.group(0)
        ref = refs[state["next"]]
        state["next"] += 1
        return f"{match.group(1)}{ref}{match.group(3)}"

    return _LOCAL_MARKDOWN_IMAGE_REF_RE.sub(_replace, markdown)


def _markitdown_importable() -> bool:
    global _markitdown_available
    if _markitdown_available is None:
        try:
            _markitdown_available = importlib.util.find_spec("markitdown") is not None
        except Exception:
            _markitdown_available = False
    return _markitdown_available


async def markitdown_parse(
    client: httpx.AsyncClient,
    *,
    data: bytes,
    filename: str,
    include_images: bool,
    pages: str | None,
    image_limit: int,
) -> dict[str, Any]:
    extension = f".{filename.lower().rsplit('.', 1)[-1]}" if "." in filename else ""
    if extension not in _MARKITDOWN_SUPPORTED_EXTENSIONS:
        raise DocumentParseError(
            f"markitdown does not support '{extension}' files (pdf/docx/pptx only)"
        )

    def _convert() -> str:
        from markitdown import MarkItDown

        converter = MarkItDown(enable_plugins=False)
        result = converter.convert_stream(io.BytesIO(data), file_extension=extension)
        return str(getattr(result, "markdown", None) or result.text_content or "")

    try:
        markdown = await run_blocking_io(_convert)
    except ImportError as exc:
        raise DocumentParseError(f"markitdown not installed: {exc}") from exc
    except Exception as exc:
        raise DocumentParseError(f"markitdown conversion failed: {exc}") from exc
    if not markdown.strip():
        raise DocumentParseError("markitdown returned empty markdown")

    images = extract_ooxml_media_images(data) if include_images else []
    if images:
        markdown = rewrite_local_image_refs(markdown, [image["ref"] for image in images])
    return _result(markdown=markdown, images=images, pages=None, engine="markitdown")


# ── 注册表与 auto 选择（对齐 web_search_providers） ──────────────────────

PROVIDER_FUNCS: dict[str, Callable[..., Any]] = {
    "mistral": mistral_parse,
    "mineru": mineru_parse,
    "azure": azure_parse,
    "docling": docling_parse,
    "paddleocr_vl": paddleocr_parse,
    "tika": tika_parse,
    "markitdown": markitdown_parse,
}

# markitdown 零配置即可用，放在链尾兜底：配了任何 API 提供商优先走 API。
_PROVIDER_ORDER = ("mistral", "mineru", "azure", "docling", "paddleocr_vl", "tika", "markitdown")

_PROVIDER_REQUIREMENTS: dict[str, tuple[str, ...]] = {
    "mistral": ("DOCUMENT_PARSE_MISTRAL_API_KEY",),
    "azure": ("DOCUMENT_PARSE_AZURE_ENDPOINT", "DOCUMENT_PARSE_AZURE_KEY"),
    "docling": ("DOCUMENT_PARSE_DOCLING_URL",),
    "paddleocr_vl": ("DOCUMENT_PARSE_PADDLEOCR_URL", "DOCUMENT_PARSE_PADDLEOCR_TOKEN"),
    "tika": ("DOCUMENT_PARSE_TIKA_URL",),
}


def _provider_available(provider: str) -> bool:
    if provider == "mineru":
        # cloud 走官方 API 必须带 token；local 只要求显式给服务地址
        if _mineru_mode() == "cloud":
            return bool(_setting("DOCUMENT_PARSE_MINERU_API_KEY"))
        return bool(_setting("DOCUMENT_PARSE_MINERU_API_URL"))
    if provider == "markitdown":
        return _markitdown_importable()
    required = _PROVIDER_REQUIREMENTS.get(provider)
    if not required:
        return False
    return all(_setting(name) for name in required)


def resolve_document_parse_provider_chain() -> list[str]:
    """auto = 按注册顺序取已配置项；钉死供应商时只返回它。"""
    choice = _setting("DOCUMENT_PARSE_PROVIDER", "auto").lower() or "auto"
    if choice in PROVIDER_FUNCS:
        return [choice]
    return [provider for provider in _PROVIDER_ORDER if _provider_available(provider)]


async def execute_document_parse(
    *,
    data: bytes,
    filename: str,
    include_images: bool = True,
    pages: str | None = None,
    image_limit: int = 0,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """按 provider 链解析文档；全部失败时抛出最后一个错误。"""
    chain = resolve_document_parse_provider_chain()
    if not chain:
        raise DocumentParseError("document_parse_no_provider_configured")

    owned_client: httpx.AsyncClient | None = None
    if client is None:
        owned_client = httpx.AsyncClient(
            follow_redirects=True, timeout=httpx.Timeout(60.0, read=300.0)
        )
        client = owned_client
    try:
        last_error: Exception | None = None
        for provider in chain:
            try:
                return await PROVIDER_FUNCS[provider](
                    client,
                    data=data,
                    filename=filename,
                    include_images=include_images,
                    pages=pages,
                    image_limit=image_limit,
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    "[DocumentParse] provider %s failed: error_type=%s: %s",
                    provider,
                    type(e).__name__,
                    e,
                )
        raise last_error or DocumentParseError("document_parse_failed")
    finally:
        if owned_client is not None:
            await owned_client.aclose()
