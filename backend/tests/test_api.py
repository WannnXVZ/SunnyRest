import io
import os
import sys
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dev import mock_ai  # noqa: E402
from app.onchain import OnChainVerificationError, PermintaanOnChain  # noqa: E402


def _make_png_bytes(width: int = 32, height: int = 32) -> bytes:
    img = Image.new("RGB", (width, height), color=(120, 140, 100))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_mock_health():
    client = TestClient(mock_ai.app)
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["classifier_loaded"] is True
    assert body["sr_loaded"] is True
    assert body["mock"] is True


def test_mock_predict_valid_and_corrupt():
    client = TestClient(mock_ai.app)
    png_bytes = _make_png_bytes()

    res = client.post("/predict", files={"file": ("sample.png", png_bytes, "image/png")})
    assert res.status_code == 200
    data = res.json()
    assert data["label"] in ["orang", "bangunan", "lanskap"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["model_version"] == "mock-0"

    # Berkas rusak/kosong -> 400
    bad = client.post("/predict", files={"file": ("bad.png", b"bukan-gambar", "image/png")})
    assert bad.status_code == 400

    empty = client.post("/predict", files={"file": ("empty.png", b"", "image/png")})
    assert empty.status_code == 400


def test_mock_enhance_png_and_scale_validation():
    client = TestClient(mock_ai.app)
    png_bytes = _make_png_bytes()

    res = client.post(
        "/enhance",
        files={"file": ("sample.png", png_bytes, "image/png")},
        data={"scale": "4", "request_id": "1"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert res.headers.get("X-Method") == "mock"
    assert res.headers.get("X-Model-Version") == "mock-0"
    assert res.headers.get("X-Scale") == "4"
    assert res.headers.get("X-Request-Id") == "1"

    # Scale selain 4 -> 400
    bad_scale = client.post(
        "/enhance",
        files={"file": ("sample.png", png_bytes, "image/png")},
        data={"scale": "2"},
    )
    assert bad_scale.status_code == 400


def test_mock_fail_503():
    client = TestClient(mock_ai.app)
    png_bytes = _make_png_bytes()

    with patch.object(mock_ai, "MOCK_FAIL", True):
        health_res = client.get("/health")
        assert health_res.json()["status"] == "degraded"

        pred_res = client.post("/predict", files={"file": ("sample.png", png_bytes, "image/png")})
        assert pred_res.status_code == 503

        enh_res = client.post(
            "/enhance",
            files={"file": ("sample.png", png_bytes, "image/png")},
            data={"scale": "4"},
        )
        assert enh_res.status_code == 503


def test_onchain_payment_verification_in_enhance():
    client = TestClient(mock_ai.app)
    png_bytes = _make_png_bytes()

    with patch.object(mock_ai, "MOCK_VERIFY_ONCHAIN", True):
        # Tanpa request_id -> 402
        no_id = client.post(
            "/enhance",
            files={"file": ("sample.png", png_bytes, "image/png")},
            data={"scale": "4"},
        )
        assert no_id.status_code == 402

        # request_id sudah selesai -> 403
        with patch.object(
            mock_ai,
            "verify_restoration_payment",
            side_effect=OnChainVerificationError("Permintaan sudah selesai", status_code=403),
        ):
            used = client.post(
                "/enhance",
                files={"file": ("sample.png", png_bytes, "image/png")},
                data={"scale": "4", "request_id": "5"},
            )
            assert used.status_code == 403

        # request_id valid -> 200 + X-Payment-Verified: true
        valid_permintaan = PermintaanOnChain(
            pemohon="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            parent_id=1,
            jumlah_wei=10**16,
            diajukan_pada=1700000000,
            selesai=False,
        )
        with patch.object(mock_ai, "verify_restoration_payment", return_value=valid_permintaan):
            ok = client.post(
                "/enhance",
                files={"file": ("sample.png", png_bytes, "image/png")},
                data={"scale": "4", "request_id": "1"},
            )
            assert ok.status_code == 200
            assert ok.headers.get("X-Payment-Verified") == "true"


def test_real_app_missing_models_returns_degraded_and_503():
    from app import main as real_main

    client = TestClient(real_main.app)
    png_bytes = _make_png_bytes()

    with patch.object(real_main, "classifier_loaded", False), patch.object(
        real_main, "sr_loaded", False
    ):
        health = client.get("/health")
        assert health.status_code == 200
        body = health.json()
        assert body["status"] == "degraded"
        assert body["classifier_loaded"] is False
        assert body["sr_loaded"] is False

        pred = client.post("/predict", files={"file": ("sample.png", png_bytes, "image/png")})
        assert pred.status_code == 503

        enh = client.post(
            "/enhance",
            files={"file": ("sample.png", png_bytes, "image/png")},
            data={"scale": "4"},
        )
        assert enh.status_code == 503

        bad_scale = client.post(
            "/enhance",
            files={"file": ("sample.png", png_bytes, "image/png")},
            data={"scale": "2"},
        )
        assert bad_scale.status_code == 400


def test_onchain_abi_decode_and_cors_headers():
    from app import main as real_main
    from app.onchain import get_permintaan_onchain

    # Simulasi hex ABI encoding (address, parentId=1, jumlah=0.01 ETH, timestamp=1700000000, selesai=false)
    addr_word = "000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    parent_word = f"{1:064x}"
    jumlah_word = f"{10**16:064x}"
    ts_word = f"{1700000000:064x}"
    selesai_word = f"{0:064x}"
    fake_result = "0x" + addr_word + parent_word + jumlah_word + ts_word + selesai_word

    with patch("app.onchain._eth_call", return_value=fake_result):
        p = get_permintaan_onchain("http://127.0.0.1:8545", "0x5FbDB2315678afecb367f032d93F642f64180aa3", 1)
        assert p.pemohon.lower() == "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
        assert p.parent_id == 1
        assert p.jumlah_wei == 10**16
        assert p.diajukan_pada == 1700000000
        assert p.selesai is False

    # Pastikan CORS preflight untuk localhost:5173 diizinkan
    client = TestClient(real_main.app)
    preflight = client.options(
        "/enhance",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == "http://localhost:5173"
