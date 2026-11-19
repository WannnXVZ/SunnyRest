import json
from typing import Any, Dict

import requests

from .config import settings


class IpfsPinError(RuntimeError):
    """Error yang dilempar saat layanan pinning IPFS tidak terkonfigurasi atau gagal."""

    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


def build_gateway_url(cid: str, gateway: str = "") -> str:
    base = (gateway or settings.IPFS_GATEWAY or "https://gateway.pinata.cloud/ipfs/").strip()
    if not base.endswith("/"):
        base += "/"
    return f"{base}{cid}"


def pin_bytes_to_ipfs(
    data: bytes,
    filename: str,
    content_type: str = "application/octet-stream",
) -> Dict[str, str]:
    """
    Pin berkas biner ke IPFS melalui Pinata (PINATA_JWT) atau node Kubo lokal (IPFS_API_URL).
    Tidak menghasilkan CID palsu apabila belum dikonfigurasi.
    """
    if not data:
        raise IpfsPinError("Berkas untuk diunggah ke IPFS tidak boleh kosong.", status_code=400)

    pinata_jwt = settings.PINATA_JWT.strip()
    if pinata_jwt:
        try:
            res = requests.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                headers={"Authorization": f"Bearer {pinata_jwt}"},
                files={"file": (filename, data, content_type)},
                timeout=30,
            )
        except requests.RequestException as exc:
            raise IpfsPinError(f"Gagal menghubungi layanan Pinata IPFS: {exc}", status_code=502) from exc

        if not res.ok:
            raise IpfsPinError(
                f"Pinata menolak permintaan pinning (HTTP {res.status_code}): {res.text}",
                status_code=502,
            )

        body = res.json()
        cid = str(body.get("IpfsHash") or "").strip()
        if not cid:
            raise IpfsPinError("Respon Pinata tidak mengandung IpfsHash yang valid.", status_code=502)
        return {
            "cid": cid,
            "uri": f"ipfs://{cid}",
            "gateway_url": build_gateway_url(cid),
            "strategy": "pinata",
        }

    ipfs_api = settings.IPFS_API_URL.strip().rstrip("/")
    if ipfs_api:
        try:
            res = requests.post(
                f"{ipfs_api}/api/v0/add?pin=true&cid-version=1",
                files={"file": (filename, data, content_type)},
                timeout=30,
            )
        except requests.RequestException as exc:
            raise IpfsPinError(
                f"Node IPFS Kubo di {ipfs_api} tidak dapat dijangkau: {exc}",
                status_code=503,
            ) from exc

        if not res.ok:
            raise IpfsPinError(
                f"Node IPFS Kubo gagal menyimpan berkas (HTTP {res.status_code}): {res.text}",
                status_code=503,
            )

        body = res.json()
        cid = str(body.get("Hash") or "").strip()
        if not cid:
            raise IpfsPinError("Respon node IPFS Kubo tidak mengandung Hash CID yang valid.", status_code=503)
        return {
            "cid": cid,
            "uri": f"ipfs://{cid}",
            "gateway_url": build_gateway_url(cid),
            "strategy": "local-kubo",
        }

    raise IpfsPinError(
        "Layanan pinning IPFS belum dikonfigurasi. Isi PINATA_JWT atau IPFS_API_URL pada file .env backend.",
        status_code=503,
    )


def pin_json_to_ipfs(payload: Dict[str, Any], filename: str = "metadata.json") -> Dict[str, str]:
    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    return pin_bytes_to_ipfs(raw, filename=filename or "metadata.json", content_type="application/json")
