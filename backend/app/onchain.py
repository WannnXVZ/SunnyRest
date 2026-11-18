"""
Verifikasi pembayaran biaya restorasi on-chain melalui JSON-RPC eth_call.
Memanggil fungsi view `getPermintaan(uint256)` dan `biayaRestorasi()` pada kontrak ArsipFotoVersi.
"""
from dataclasses import dataclass
from typing import Optional
import requests


# 4-byte function selectors (keccak256 signature)
SELECTOR_GET_PERMINTAAN = "0xe6e2fee1"  # getPermintaan(uint256)
SELECTOR_BIAYA_RESTORASI = "0xcba4f75b"  # biayaRestorasi()


@dataclass
class PermintaanOnChain:
    pemohon: str
    parent_id: int
    jumlah_wei: int
    diajukan_pada: int
    selesai: bool


class OnChainVerificationError(Exception):
    def __init__(self, message: str, status_code: int = 402):
        super().__init__(message)
        self.status_code = status_code


def _eth_call(rpc_url: str, contract_address: str, data: str, timeout: float = 5.0) -> str:
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_call",
        "params": [{"to": contract_address, "data": data}, "latest"],
        "id": 1,
    }
    try:
        resp = requests.post(rpc_url, json=payload, timeout=timeout)
        resp.raise_for_status()
        body = resp.json()
    except requests.RequestException as exc:
        raise OnChainVerificationError(
            f"Gagal menghubungi node blockchain RPC: {exc}", status_code=503
        ) from exc

    if "error" in body and body["error"]:
        msg = body["error"].get("message", "Panggilan kontrak revert")
        raise OnChainVerificationError(
            f"Permintaan restorasi tidak valid di smart contract: {msg}", status_code=402
        )

    result = body.get("result")
    if not result or result == "0x":
        raise OnChainVerificationError(
            "Kontrak tidak ditemukan atau mengembalikan data kosong.", status_code=503
        )
    return result


def get_biaya_restorasi(rpc_url: str, contract_address: str) -> int:
    raw = _eth_call(rpc_url, contract_address, SELECTOR_BIAYA_RESTORASI)
    return int(raw, 16)


def get_permintaan_onchain(
    rpc_url: str, contract_address: str, request_id: int
) -> PermintaanOnChain:
    if request_id <= 0:
        raise OnChainVerificationError("request_id harus lebih besar dari 0.", status_code=400)

    encoded_arg = f"{request_id:064x}"
    raw = _eth_call(rpc_url, contract_address, SELECTOR_GET_PERMINTAAN + encoded_arg)
    hex_data = raw[2:] if raw.startswith("0x") else raw

    # Struct Permintaan: (address, uint256, uint256, uint64, bool) = 5 words * 64 hex chars = 320 chars
    if len(hex_data) < 320:
        raise OnChainVerificationError(
            "Format respons kontrak getPermintaan tidak sesuai.", status_code=503
        )

    words = [hex_data[i * 64 : (i + 1) * 64] for i in range(5)]
    pemohon = "0x" + words[0][-40:]
    parent_id = int(words[1], 16)
    jumlah_wei = int(words[2], 16)
    diajukan_pada = int(words[3], 16)
    selesai = int(words[4], 16) != 0

    return PermintaanOnChain(
        pemohon=pemohon,
        parent_id=parent_id,
        jumlah_wei=jumlah_wei,
        diajukan_pada=diajukan_pada,
        selesai=selesai,
    )


def verify_restoration_payment(
    rpc_url: str, contract_address: str, request_id: Optional[int]
) -> PermintaanOnChain:
    if not contract_address:
        raise OnChainVerificationError(
            "CONTRACT_ADDRESS belum dikonfigurasi pada backend.", status_code=503
        )
    if request_id is None:
        raise OnChainVerificationError(
            "Pembayaran wajib diverifikasi: sertakan request_id hasil ajukanRestorasi.",
            status_code=402,
        )

    permintaan = get_permintaan_onchain(rpc_url, contract_address, request_id)
    if permintaan.selesai:
        raise OnChainVerificationError(
            f"Permintaan restorasi #{request_id} sudah selesai digunakan atau dikembalikan.",
            status_code=403,
        )

    biaya_dibutuhkan = get_biaya_restorasi(rpc_url, contract_address)
    if permintaan.jumlah_wei < biaya_dibutuhkan:
        raise OnChainVerificationError(
            f"Jumlah pembayaran untuk request #{request_id} kurang dari biaya kontrak.",
            status_code=402,
        )

    return permintaan
