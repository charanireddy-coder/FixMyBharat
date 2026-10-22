"""
FixMyBharat Computer Vision Microservice - Automated Test Client
Tests GET /health and POST /detect using standard Python library.
"""

import json
import mimetypes
import sys
import urllib.error
import urllib.request
import uuid

import io
from PIL import Image

BASE_URL = "http://127.0.0.1:8000"


def generate_sample_image():
    """Generates a valid test image (320x240 RGB JPEG) using Pillow."""
    img = Image.new("RGB", (320, 240), color=(50, 120, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def post_multipart(url: str, filename: str, file_bytes: bytes, content_type: str):
    """Encodes and sends multipart/form-data request using urllib."""
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()

    # File field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(
            "utf-8"
        )
    )
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
    body.extend(file_bytes)
    body.extend(b"\r\n")

    # Closing boundary
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
        method="POST",
    )
    return urllib.request.urlopen(req)


def test_health():
    print(f"\n[1/3] Testing GET {BASE_URL}/health...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] Status Code: {resp.status}")
            print(f"  [OK] Response: {json.dumps(data, indent=2)}")
            assert data["status"] == "ok"
            assert data["device"] == "cpu"
            print("  ==> Health check PASSED.")
            return True
    except Exception as e:
        print(f"  [FAIL] Health check failed: {e}")
        return False


def test_detect():
    print(f"\n[2/3] Testing POST {BASE_URL}/detect with valid image...")
    try:
        with post_multipart(
            f"{BASE_URL}/detect?confidence=0.25",
            filename="sample.jpg",
            file_bytes=generate_sample_image(),
            content_type="image/jpeg",
        ) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] Status Code: {resp.status}")
            print(f"  [OK] Detection Status: {data.get('status')}")
            print(f"  [OK] Total Detections: {data.get('total_detections')}")
            print(f"  [OK] Notice: {data.get('model_limitations_notice')[:65]}...")
            assert data["status"] == "success"
            print("  ==> Object detection endpoint PASSED.")
            return True
    except Exception as e:
        print(f"  [FAIL] Detection test failed: {e}")
        return False


def test_invalid_mime():
    print(f"\n[3/3] Testing POST {BASE_URL}/detect error handling (invalid file format)...")
    try:
        post_multipart(
            f"{BASE_URL}/detect",
            filename="malicious.txt",
            file_bytes=b"Hello, this is not an image.",
            content_type="text/plain",
        )
        print("  [FAIL] Expected 400 error, but request succeeded.")
        return False
    except urllib.error.HTTPError as err:
        if err.code == 400:
            error_body = json.loads(err.read().decode("utf-8"))
            print(f"  [OK] Correctly rejected with HTTP 400: {error_body.get('detail')}")
            print("  ==> Input validation test PASSED.")
            return True
        else:
            print(f"  [FAIL] Unexpected HTTP status code: {err.code}")
            return False
    except Exception as e:
        print(f"  [FAIL] Unexpected error: {e}")
        return False


def main():
    print("=" * 60)
    print("FixMyBharat CV Microservice Test Suite")
    print(f"Target: {BASE_URL}")
    print("=" * 60)

    t1 = test_health()
    if not t1:
        print("\nERROR: Service is not running or unreachable at http://127.0.0.1:8000.")
        print("Please start the microservice with:")
        print("    cd cv-service")
        print("    python -m uvicorn main:app --host 127.0.0.1 --port 8000")
        sys.exit(1)

    t2 = test_detect()
    t3 = test_invalid_mime()

    print("\n" + "=" * 60)
    if t1 and t2 and t3:
        print("ALL TESTS PASSED SUCCESSFULLY! (3/3)")
    else:
        print("SOME TESTS FAILED.")
    print("=" * 60)


if __name__ == "__main__":
    main()
