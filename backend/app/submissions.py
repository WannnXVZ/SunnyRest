import hashlib
import json
import os
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .config import settings

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
_LOCK = threading.Lock()

PATCHABLE_FIELDS = {
    "status",
    "finalCategory",
    "curatorNotes",
    "originalCid",
    "paymentTxHash",
    "restorationFeePaid",
    "versions",
    "updatedAt",
    "chainId",
}


def _storage_root() -> Path:
    return Path(settings.STORAGE_DIR).resolve()


def _files_dir() -> Path:
    return _storage_root() / "files"


def _index_path() -> Path:
    return _storage_root() / "submissions.json"


def _ensure_dirs() -> None:
    _storage_root().mkdir(parents=True, exist_ok=True)
    _files_dir().mkdir(parents=True, exist_ok=True)


def _read_all_unlocked() -> List[Dict[str, Any]]:
    idx = _index_path()
    if not idx.exists():
        return []
    try:
        data = json.loads(idx.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _write_all_unlocked(items: List[Dict[str, Any]]) -> None:
    _ensure_dirs()
    idx = _index_path()
    tmp = idx.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, idx)


def save_raw_file(
    data: bytes,
    original_filename: str,
    prefix: str = "orig",
) -> Tuple[str, str]:
    """
    Simpan byte mentah persis sesuai unggahan tanpa re-encoding agar hash SHA-256 tidak berubah.
    Mengembalikan (stored_filename, sha256_hex).
    """
    _ensure_dirs()
    ext = Path(original_filename or "image.png").suffix.lower()
    if ext not in ALLOWED_EXTS:
        ext = ".png"

    sha256_hex = hashlib.sha256(data).hexdigest()
    stored_name = f"{prefix}_{sha256_hex[:12]}_{uuid.uuid4().hex[:8]}{ext}"
    target = _files_dir() / stored_name
    target.write_bytes(data)
    return stored_name, sha256_hex


def resolve_stored_file(filename: str) -> Path:
    if not filename or Path(filename).name != filename:
        raise ValueError("Nama berkas tidak valid.")
    target = (_files_dir() / filename).resolve()
    files_root = _files_dir().resolve()
    if target.parent != files_root:
        raise ValueError("Akses path di luar direktori penyimpanan ditolak.")
    return target


def list_submissions() -> List[Dict[str, Any]]:
    with _LOCK:
        return list(reversed(_read_all_unlocked()))


def get_submission(sub_id: str) -> Optional[Dict[str, Any]]:
    with _LOCK:
        for item in _read_all_unlocked():
            if item.get("id") == sub_id:
                return item
    return None


def _next_submission_id(items: List[Dict[str, Any]]) -> str:
    max_num = 0
    for item in items:
        raw_id = str(item.get("id", ""))
        if raw_id.startswith("SR-"):
            tail = raw_id.split("-")[-1]
            if tail.isdigit():
                max_num = max(max_num, int(tail))
    return f"SR-{max_num + 1:04d}"


def create_submission(item: Dict[str, Any]) -> Dict[str, Any]:
    target_hash = str(item.get("originalHash") or "").strip().lower()
    with _LOCK:
        items = _read_all_unlocked()
        if target_hash:
            for existing in items:
                if (
                    existing.get("status") != "ditolak"
                    and str(existing.get("originalHash") or "").strip().lower() == target_hash
                ):
                    raise ValueError("Hash berkas SHA-256 sudah terdaftar di antrean kurasi.")

        new_item = dict(item)
        new_item["id"] = _next_submission_id(items)
        items.append(new_item)
        _write_all_unlocked(items)
        return new_item


def patch_submission(sub_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _LOCK:
        items = _read_all_unlocked()
        for idx, existing in enumerate(items):
            if existing.get("id") == sub_id:
                updated = dict(existing)
                for key, val in patch.items():
                    if key in PATCHABLE_FIELDS:
                        updated[key] = val
                items[idx] = updated
                _write_all_unlocked(items)
                return updated
    return None
