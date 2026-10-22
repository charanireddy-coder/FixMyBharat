import io
import logging
import os
from contextlib import asynccontextmanager
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

# Load local environment configuration
load_dotenv()

# Configure secure logging (never log image payloads or auth credentials)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fixmybharat-cv")

# Synchronize Ultralytics Platform API key if provided
API_KEY = os.getenv("ULTRALYTICS_API_KEY") or os.getenv("YOLO_API_KEY")
if API_KEY:
    try:
        from ultralytics import settings

        settings.update({"api_key": API_KEY})
        logger.info("Ultralytics Platform API key synchronized successfully.")
    except Exception as e:
        logger.warning("Could not synchronize Ultralytics settings: %s", e)

# Configuration Constants
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB (aligns with FixMyBharat frontend limit)
MODEL_NAME = os.getenv("YOLO_MODEL_NAME", "yolo26n.pt" if os.path.exists("yolo26n.pt") else "yolov8n.pt")
DEFAULT_CONFIDENCE = float(os.getenv("YOLO_DEFAULT_CONFIDENCE", "0.25"))

# Global YOLO model instance
yolo_model = None


def load_model():
    """Lazily load the YOLO model for CPU inference."""
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO

            model_target = MODEL_NAME
            if not os.path.exists(model_target) and os.path.exists("yolo26n.pt"):
                model_target = "yolo26n.pt"
            elif not os.path.exists(model_target) and os.path.exists("yolov8n.pt"):
                model_target = "yolov8n.pt"

            logger.info("Loading YOLO model '%s' on CPU...", model_target)
            yolo_model = YOLO(model_target)
            logger.info("YOLO model '%s' loaded successfully.", model_target)
        except Exception as e:
            logger.error("Failed to load YOLO model: %s", str(e))
            raise RuntimeError(f"YOLO initialization error: {e}") from e
    return yolo_model



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to initialize model on startup."""
    logger.info("Starting FixMyBharat Computer Vision Microservice...")
    try:
        load_model()
    except Exception as e:
        logger.warning(
            "Model preloading deferred to first request due to: %s", str(e)
        )
    yield
    logger.info("Shutting down FixMyBharat Computer Vision Microservice...")


app = FastAPI(
    title="FixMyBharat Computer Vision Microservice",
    description=(
        "Local isolated computer-vision microservice providing real YOLO object "
        "detection for civic complaint photo analysis in FixMyBharat."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Local Development CORS Safeguard:
# Restrict access exclusively to local development frontends by default
allowed_origins_env = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Response Schemas
class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate in pixels")
    y1: float = Field(..., description="Top-left Y coordinate in pixels")
    x2: float = Field(..., description="Bottom-right X coordinate in pixels")
    y2: float = Field(..., description="Bottom-right Y coordinate in pixels")
    width: float = Field(..., description="Box width in pixels")
    height: float = Field(..., description="Box height in pixels")
    norm_x1: float = Field(..., description="Normalized top-left X (0.0 to 1.0)")
    norm_y1: float = Field(..., description="Normalized top-left Y (0.0 to 1.0)")
    norm_width: float = Field(..., description="Normalized box width (0.0 to 1.0)")
    norm_height: float = Field(..., description="Normalized box height (0.0 to 1.0)")


class Detection(BaseModel):
    class_id: int = Field(..., description="COCO class identifier integer")
    class_name: str = Field(..., description="Detected object class label")
    confidence: float = Field(..., description="Detection confidence score (0.0 to 1.0)")
    box: BoundingBox


class ImageDimensions(BaseModel):
    width: int
    height: int


class DetectionResponse(BaseModel):
    status: str
    model: str
    device: str
    image: ImageDimensions
    total_detections: int
    detections: List[Detection]
    model_limitations_notice: str


class HealthResponse(BaseModel):
    status: str
    service: str
    model: str
    device: str
    environment: str
    supported_mime_types: List[str]
    max_file_size_mb: int


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness probe and service configuration status."""
    return HealthResponse(
        status="ok",
        service="fixmybharat-cv-service",
        model=MODEL_NAME,
        device="cpu",
        environment=os.getenv("APP_ENV", "development"),
        supported_mime_types=list(ALLOWED_CONTENT_TYPES.keys()),
        max_file_size_mb=MAX_FILE_SIZE_BYTES // (1024 * 1024),
    )


@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(
    file: UploadFile = File(..., description="Complaint photo binary (JPEG, PNG, WebP)"),
    confidence: Optional[float] = Query(
        DEFAULT_CONFIDENCE,
        ge=0.05,
        le=0.95,
        description="Minimum confidence threshold for detections",
    ),
):
    """
    Runs real YOLO CPU inference on an uploaded civic complaint photo.

    Returns:
    - Detected object classes
    - Confidence scores
    - Bounding box coordinates (both pixel and normalized 0.0-1.0)
    - Clarification notice regarding COCO model domain boundaries
    """
    # 1. Validate MIME content type
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file format '{content_type}'. "
                f"Allowed formats: {', '.join(ALLOWED_CONTENT_TYPES.keys())}."
            ),
        )

    # 2. Read stream with strict size validation
    try:
        contents = await file.read()
    except Exception as e:
        logger.error("Failed to read upload stream: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded image data.",
        )

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    if len(contents) > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image file size ({len(contents)} bytes) exceeds the {max_mb} MB limit.",
        )

    # 3. Validate image integrity and parse dimensions with Pillow
    try:
        pil_image = Image.open(io.BytesIO(contents))
        pil_image.verify()
        # verify() resets file pointer; reopen for processing
        pil_image = Image.open(io.BytesIO(contents))
        img_width, img_height = pil_image.size
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
        logger.warning("Invalid or corrupt image submitted: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid or decipherable image.",
        )

    # 4. Convert to RGB (normalizes PNG alpha channels and grayscale)
    if pil_image.mode != "RGB":
        pil_image = pil_image.convert("RGB")

    # 5. Execute real YOLO inference
    try:
        model = load_model()
        results = model.predict(
            source=pil_image,
            conf=confidence,
            device="cpu",
            verbose=False,
        )
    except Exception as e:
        logger.error("Inference execution error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Computer vision inference engine encountered an internal error.",
        )

    # 6. Parse structured detections
    detections: List[Detection] = []
    if results and len(results) > 0:
        first_res = results[0]
        boxes = first_res.boxes

        if boxes is not None and len(boxes) > 0:
            names = first_res.names or {}

            for box in boxes:
                xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                conf = float(box.conf[0].item())
                cls_id = int(box.cls[0].item())
                cls_name = names.get(cls_id, f"class_{cls_id}")

                x1, y1, x2, y2 = xyxy
                box_w = max(0.0, x2 - x1)
                box_h = max(0.0, y2 - y1)

                # Normalized bounding coordinates (safe against zero division)
                norm_x1 = max(0.0, min(1.0, x1 / img_width)) if img_width > 0 else 0.0
                norm_y1 = max(0.0, min(1.0, y1 / img_height)) if img_height > 0 else 0.0
                norm_w = max(0.0, min(1.0, box_w / img_width)) if img_width > 0 else 0.0
                norm_h = max(0.0, min(1.0, box_h / img_height)) if img_height > 0 else 0.0

                detections.append(
                    Detection(
                        class_id=cls_id,
                        class_name=cls_name,
                        confidence=round(conf, 4),
                        box=BoundingBox(
                            x1=round(x1, 1),
                            y1=round(y1, 1),
                            x2=round(x2, 1),
                            y2=round(y2, 1),
                            width=round(box_w, 1),
                            height=round(box_h, 1),
                            norm_x1=round(norm_x1, 4),
                            norm_y1=round(norm_y1, 4),
                            norm_width=round(norm_w, 4),
                            norm_height=round(norm_h, 4),
                        ),
                    )
                )

    return DetectionResponse(
        status="success",
        model=MODEL_NAME,
        device="cpu",
        image=ImageDimensions(width=img_width, height=img_height),
        total_detections=len(detections),
        detections=detections,
        model_limitations_notice=(
            "Note: The model is pretrained on standard MS COCO classes (e.g. traffic light, "
            "car, person, bottle). It does NOT natively identify asphalt potholes, open manholes, "
            "or drainage overflows without domain-specific training on a municipal road defect dataset."
        ),
    )


if __name__ == "__main__":
    import uvicorn

    # Bind to localhost (127.0.0.1) exclusively for local development safety
    port = int(os.getenv("PORT", "8000"))
    logger.info("Starting local development server on 127.0.0.1:%d", port)
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
