# FixMyBharat Computer Vision Microservice

An isolated, lightweight computer-vision microservice providing real **YOLO (You Only Look Once)** inference for civic issue photos in FixMyBharat.

---

## 1. Architecture & Design Principles

- **Isolated & Non-Breaking**: Exists entirely in `cv-service/`. Does **not** modify or interfere with the existing Next.js App Router, Netlify deployment, or Supabase database rules.
- **CPU-Optimized**: Powered by **FastAPI** and **Ultralytics YOLO** (`yolov8n.pt` — ~6 MB nano model), designed for fast CPU inference without requiring a dedicated GPU.
- **Local Development Safeguard**: Binds strictly to `127.0.0.1:8000` by default, with CORS restricted to local Next.js frontends (`http://localhost:3000`). It is not exposed to the public internet.
- **Payload Guardrails**: Enforces an allowed MIME filter (`image/jpeg`, `image/png`, `image/webp`) and a strict 5 MB file size limit (matching FixMyBharat's photo upload policy).

---

## 2. Local Setup Instructions

### Prerequisites
- Python 3.10+ (Verified on Python 3.11)
- `pip` package manager

### Step-by-Step Installation

1. **Navigate to the microservice directory**:
   ```bash
   cd cv-service
   ```

2. **Create a Python virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     python -m venv .venv
     .\.venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *(On first run, Ultralytics will automatically download the 6 MB `yolov8n.pt` weights to `cv-service/`)*

4. **Start the microservice**:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The service will start at `http://127.0.0.1:8000`. Interactive OpenAPI documentation will be accessible at `http://127.0.0.1:8000/docs`.

---

## 3. API Endpoints

### 1. Health Probe — `GET /health`
Liveness check returning service status, loaded model, and device execution mode.

**Example Request**:
```bash
curl -X GET http://127.0.0.1:8000/health
```

**Example Response**:
```json
{
  "status": "ok",
  "service": "fixmybharat-cv-service",
  "model": "yolov8n.pt",
  "device": "cpu",
  "environment": "development",
  "supported_mime_types": [
    "image/jpeg",
    "image/png",
    "image/webp"
  ],
  "max_file_size_mb": 5
}
```

---

### 2. Object Detection — `POST /detect`
Accepts a civic complaint image via `multipart/form-data`, validates MIME type and file size, and executes YOLO inference.

**Query Parameters**:
- `confidence` *(optional, float, default: `0.25`)*: Minimum detection confidence threshold (range `0.05` to `0.95`).

**Example Request via cURL (Bash / Git Bash)**:
```bash
curl -X POST "http://127.0.0.1:8000/detect?confidence=0.25" \
  -H "Accept: application/json" \
  -F "file=@/path/to/complaint_photo.jpg"
```

**Example Request via PowerShell**:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/detect?confidence=0.25" `
  -Method Post `
  -Form @{ file = Get-Item "sample.jpg" }
```

**Example Successful Response (HTTP 200)**:
```json
{
  "status": "success",
  "model": "yolov8n.pt",
  "device": "cpu",
  "image": {
    "width": 1280,
    "height": 720
  },
  "total_detections": 2,
  "detections": [
    {
      "class_id": 9,
      "class_name": "traffic light",
      "confidence": 0.8842,
      "box": {
        "x1": 420.5,
        "y1": 115.0,
        "x2": 490.2,
        "y2": 260.8,
        "width": 69.7,
        "height": 145.8,
        "norm_x1": 0.3285,
        "norm_y1": 0.1597,
        "norm_width": 0.0545,
        "norm_height": 0.2025
      }
    },
    {
      "class_id": 2,
      "class_name": "car",
      "confidence": 0.9124,
      "box": {
        "x1": 600.0,
        "y1": 340.5,
        "x2": 890.0,
        "y2": 520.0,
        "width": 290.0,
        "height": 179.5,
        "norm_x1": 0.4688,
        "norm_y1": 0.4729,
        "norm_width": 0.2266,
        "norm_height": 0.2493
      }
    }
  ],
  "model_limitations_notice": "Note: The model is pretrained on standard MS COCO classes (e.g. traffic light, car, person, bottle). It does NOT natively identify asphalt potholes, open manholes, or drainage overflows without domain-specific training on a municipal road defect dataset."
}
```

---

## 4. Automated Testing

A self-contained test client is included that tests `/health`, `/detect`, and error handling (invalid file format rejection):

```bash
# Ensure the service is running in a separate terminal, then:
python test_client.py
```

Expected output:
```text
============================================================
FixMyBharat CV Microservice Test Suite
Target: http://127.0.0.1:8000
============================================================

[1/3] Testing GET http://127.0.0.1:8000/health...
  ✓ Status Code: 200
  ==> Health check PASSED.

[2/3] Testing POST http://127.0.0.1:8000/detect with valid image...
  ✓ Status Code: 200
  ✓ Status: success
  ==> Object detection endpoint PASSED.

[3/3] Testing POST http://127.0.0.1:8000/detect error handling (invalid file format)...
  ✓ Correctly rejected with HTTP 400: Unsupported file format 'text/plain'...
  ==> Input validation test PASSED.

============================================================
ALL TESTS PASSED SUCCESSFULLY! (3/3)
============================================================
```

---

## 5. Pretrained Model Domain Boundaries & Limitations

> [!IMPORTANT]
> **Pretrained COCO Class Limitations**:
> `yolov8n.pt` is trained on the standard **Microsoft COCO dataset (80 object classes)**:
> - **What it CAN detect**:
>   - Street fixtures: `traffic light`, `fire hydrant`, `stop sign`, `bench`.
>   - Litter proxies: `bottle`, `cup`.
>   - Traffic scene context: `car`, `truck`, `bus`, `motorcycle`, `bicycle`, `person`.
> - **What it CANNOT detect without custom fine-tuning**:
>   - Road surface defects (`pothole`, `cracks`).
>   - Infrastructure hazards (`open_manhole`, `broken_pavers`).
>   - Sanitation spills (`garbage_dump`, `drainage_overflow`, `water_leakage`).
>
> To detect potholes or open manholes in production, replace `MODEL_NAME` with custom fine-tuned weights (e.g. trained on the RDD2020 road damage dataset).
