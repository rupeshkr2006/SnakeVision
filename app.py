from __future__ import annotations

import gc
import json
import logging
import os
import threading
import warnings
from pathlib import Path
from typing import Any

import numpy as np
from flask import Flask, jsonify, render_template, request
from PIL import Image, ImageFile, UnidentifiedImageError
from werkzeug.exceptions import HTTPException

from species_info import FIRST_AID_SOURCES, GENERAL_BITE_FIRST_AID, get_species_info

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
BITE_ONNX_PATH = MODEL_DIR / "bite_resnet18.onnx"
SPECIES_CHECKPOINT_PATH = MODEL_DIR / "final_snake_model.pt"
MODEL_CONFIG_PATH = MODEL_DIR / "model_config.json"
if not BITE_ONNX_PATH.is_file():
    BITE_ONNX_PATH = BASE_DIR / "bite_resnet18.onnx"
if not SPECIES_CHECKPOINT_PATH.is_file():
    SPECIES_CHECKPOINT_PATH = BASE_DIR / "final_snake_model.pt"
if not MODEL_CONFIG_PATH.is_file():
    MODEL_CONFIG_PATH = BASE_DIR / "model_config.json"

DINO_MODEL_ID = "facebook/dinov2-small"
IMAGE_SIZE = 224
MAX_UPLOAD_MB = 18
MAX_IMAGE_MB = 8
MAX_IMAGE_PIXELS = 18_000_000
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP", "BMP"}
DEFAULT_BITE_CLASSES = ["Venomous", "Non-Venomous"]
DEFAULT_CONFIG = {
    "bite_class_names": DEFAULT_BITE_CLASSES,
    "bite_class_order_verified": False,
    "bite_input_preprocessing_verified": False,
    "species_min_confidence": 0.50,
    "species_min_margin": 0.08,
    "species_thresholds_validated": False,
    "threshold_validation_note": "Preliminary safety heuristic; not validation-calibrated.",
    "privacy": {"persist_uploads": False, "log_image_contents": False},
}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("snakevision")
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
# Heavy ML runtimes are intentionally imported only when the matching model is
# requested. Importing/loading PyTorch and Transformers at module startup caused
# Vercel cold-start timeouts and worker SIGKILLs before requests could be served.
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
ImageFile.LOAD_TRUNCATED_IMAGES = False
warnings.simplefilter("error", Image.DecompressionBombWarning)

BITE_LOCK = threading.Lock()
SPECIES_LOCK = threading.Lock()
TORCH = None


def load_runtime_config() -> dict[str, Any]:
    config = dict(DEFAULT_CONFIG)
    try:
        if MODEL_CONFIG_PATH.is_file():
            loaded = json.loads(MODEL_CONFIG_PATH.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                config.update(loaded)
    except Exception as exc:
        logger.exception("Could not read model configuration; using safe defaults")
        config["config_load_warning"] = f"Could not read model_config.json: {type(exc).__name__}"
    names = config.get("bite_class_names")
    if not isinstance(names, list) or len(names) != 2:
        config["bite_class_names"] = DEFAULT_BITE_CLASSES
    try:
        config["species_min_confidence"] = float(config.get("species_min_confidence", 0.50))
        config["species_min_margin"] = float(config.get("species_min_margin", 0.08))
    except (TypeError, ValueError):
        config["species_min_confidence"] = 0.50
        config["species_min_margin"] = 0.08
    config["species_min_confidence"] = min(0.99, max(0.01, config["species_min_confidence"]))
    config["species_min_margin"] = min(0.99, max(0.0, config["species_min_margin"]))
    return config


RUNTIME_CONFIG = load_runtime_config()
BITE_CLASS_NAMES = [str(x) for x in RUNTIME_CONFIG["bite_class_names"]]


def load_species_model():
    """Load DINOv2 on demand; never download the base model weights twice."""
    global species_model, species_classes, species_transform, SPECIES_MODEL_ERROR, TORCH

    if species_model is not None:
        return species_model, species_classes, species_transform, TORCH

    with SPECIES_LOCK:
        if species_model is not None:
            return species_model, species_classes, species_transform, TORCH
        if not SPECIES_CHECKPOINT_PATH.is_file():
            raise FileNotFoundError("Species checkpoint is not present in this deployment.")

        try:
            # Keep ML imports out of the Flask cold-start path.
            import torch
            from torchvision import transforms
            from transformers import AutoConfig, AutoImageProcessor, AutoModel

            torch.set_num_threads(1)
            try:
                torch.set_num_interop_threads(1)
            except RuntimeError:
                pass

            checkpoint = torch.load(
                SPECIES_CHECKPOINT_PATH,
                map_location="cpu",
                weights_only=True,
            )
            if not isinstance(checkpoint, dict):
                raise ValueError("Unexpected species checkpoint format.")
            state = checkpoint.get("model_state_dict")
            class_names = checkpoint.get("class_names")
            if not isinstance(state, dict) or not class_names:
                raise ValueError("Checkpoint must contain model_state_dict and class_names.")
            class_names = [str(name) for name in class_names]
            if len(class_names) != 13:
                logger.warning("Expected 13 species classes; checkpoint has %d", len(class_names))

            model_id = checkpoint.get("model_id", DINO_MODEL_ID)
            if model_id != DINO_MODEL_ID:
                logger.warning("Checkpoint model_id=%r; app expects %r", model_id, DINO_MODEL_ID)

            # The trained checkpoint already contains the backbone weights.
            # Build only the architecture from the small config file, rather than
            # loading a second full set of pretrained weights from Hugging Face.
            backbone_config = AutoConfig.from_pretrained(DINO_MODEL_ID)
            backbone = AutoModel.from_config(backbone_config)

            class DinoClassifier(torch.nn.Module):
                def __init__(self, backbone_model, num_classes: int):
                    super().__init__()
                    self.backbone = backbone_model
                    hidden_size = int(self.backbone.config.hidden_size)
                    self.classifier = torch.nn.Sequential(
                        torch.nn.Dropout(p=0.25),
                        torch.nn.Linear(hidden_size * 2, num_classes),
                    )

                def forward(self, pixel_values):
                    outputs = self.backbone(pixel_values=pixel_values)
                    tokens = outputs.last_hidden_state
                    cls_token = tokens[:, 0]
                    patch_mean = tokens[:, 1:].mean(dim=1)
                    return self.classifier(torch.cat([cls_token, patch_mean], dim=1))

            model = DinoClassifier(backbone, num_classes=len(class_names))
            state = {key.removeprefix("module."): value for key, value in state.items()}
            model.load_state_dict(state, strict=True)
            del state, checkpoint, backbone, backbone_config
            gc.collect()

            model.to("cpu").eval()
            processor = AutoImageProcessor.from_pretrained(DINO_MODEL_ID)
            image_transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(IMAGE_SIZE),
                transforms.ToTensor(),
                transforms.Normalize(mean=processor.image_mean, std=processor.image_std),
            ])

            TORCH = torch
            species_model = model
            species_classes = class_names
            species_transform = image_transform
            SPECIES_MODEL_ERROR = None
            logger.info("DINOv2 species model initialized on demand (%d classes).", len(class_names))
            return species_model, species_classes, species_transform, TORCH
        except Exception as exc:
            SPECIES_MODEL_ERROR = f"{type(exc).__name__}: {exc}"
            logger.exception("Species model initialization failed")
            raise RuntimeError(
                "The snake-species model could not start. Please retry once; if it happens again, use the bite-area image by itself and report this error."
            ) from exc


def load_bite_session():
    """Load the smaller ONNX model only when a bite-area photo is submitted."""
    global bite_session, BITE_MODEL_ERROR

    if bite_session is not None:
        return bite_session

    with BITE_LOCK:
        if bite_session is not None:
            return bite_session
        if not BITE_ONNX_PATH.is_file():
            raise FileNotFoundError("Bite-image ONNX model is not present in this deployment.")

        try:
            import onnxruntime as ort

            options = ort.SessionOptions()
            options.log_severity_level = 3
            options.intra_op_num_threads = 1
            options.inter_op_num_threads = 1
            session = ort.InferenceSession(
                str(BITE_ONNX_PATH),
                sess_options=options,
                providers=["CPUExecutionProvider"],
            )
            if not session.get_inputs() or not session.get_outputs():
                raise ValueError("ONNX model has no visible input/output tensors.")
            inp, out = session.get_inputs()[0], session.get_outputs()[0]
            logger.info("Bite ONNX input %s shape=%s type=%s", inp.name, inp.shape, inp.type)
            logger.info("Bite ONNX output %s shape=%s type=%s", out.name, out.shape, out.type)
            bite_session = session
            BITE_MODEL_ERROR = None
            return bite_session
        except Exception as exc:
            BITE_MODEL_ERROR = f"{type(exc).__name__}: {exc}"
            logger.exception("Bite model initialization failed")
            raise RuntimeError(
                "The bite-area model could not start. Please retry once or upload a smaller image."
            ) from exc


# Models are not initialized during Flask import/cold start.
bite_session = None
species_model = None
species_classes: list[str] = []
species_transform = None
BITE_MODEL_ERROR = None
SPECIES_MODEL_ERROR = None


def verify_and_open_image(file_storage) -> Image.Image:
    """Validate and decode uploads in memory; uploads are never written to disk."""
    filename = (file_storage.filename or "").strip()
    if not filename or "." not in filename:
        raise ValueError("Choose an image file first.")
    if filename.rsplit(".", 1)[-1].lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Use JPG, PNG, WEBP, or BMP.")
    try:
        file_storage.stream.seek(0, 2)
        byte_count = file_storage.stream.tell()
        file_storage.stream.seek(0)
        if byte_count <= 0:
            raise ValueError("The selected file is empty.")
        if byte_count > MAX_IMAGE_MB * 1024 * 1024:
            raise ValueError(f"Each image must be no larger than {MAX_IMAGE_MB} MB.")
        with Image.open(file_storage.stream) as check_image:
            image_format = (check_image.format or "").upper()
            if image_format not in ALLOWED_PIL_FORMATS:
                raise ValueError("The file content is not a supported image format.")
            if check_image.width * check_image.height > MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large. Use an image under 18 megapixels.")
            check_image.verify()
        file_storage.stream.seek(0)
        with Image.open(file_storage.stream) as loaded:
            if loaded.width * loaded.height > MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large. Use an image under 18 megapixels.")
            loaded.load()
            return loaded.convert("RGB")
    except ValueError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValueError("The selected file is not a valid readable image, or its dimensions are unsafe.") from exc


def image_quality_notes(image: Image.Image) -> dict[str, Any]:
    """Cheap, advisory quality checks; they are not an object detector."""
    gray = np.asarray(image.convert("L").resize((min(256, image.width), min(256, image.height))), dtype=np.float32)
    if gray.shape[0] < 3 or gray.shape[1] < 3:
        blur_score = 0.0
    else:
        center = gray[1:-1, 1:-1]
        laplacian = (
            gray[:-2, 1:-1] + gray[2:, 1:-1]
            + gray[1:-1, :-2] + gray[1:-1, 2:]
            - 4.0 * center
        )
        blur_score = float(np.var(laplacian))
    warnings_out: list[str] = []
    if min(image.width, image.height) < 96:
        warnings_out.append("Image resolution is very small; prediction may be unreliable.")
    if blur_score < 20.0:
        warnings_out.append("The image may be blurry or low-detail; prediction may be unreliable.")
    return {
        "width": int(image.width),
        "height": int(image.height),
        "blur_score_heuristic": round(blur_score, 2),
        "warnings": warnings_out,
    }


def softmax_or_probabilities(raw: np.ndarray) -> np.ndarray:
    scores = np.asarray(raw, dtype=np.float64).reshape(-1)
    if not np.all(np.isfinite(scores)):
        raise RuntimeError("Model returned non-finite values.")
    if np.all(scores >= 0) and np.all(scores <= 1) and np.isclose(scores.sum(), 1.0, atol=1e-3):
        return scores
    stable = scores - scores.max()
    exps = np.exp(stable)
    return exps / exps.sum()


def predict_bite_image(image: Image.Image) -> dict[str, Any]:
    """Run the ONNX image classifier on the BODY/BITE-AREA PHOTO ONLY.

    Current preprocessing follows the inspected exported graph assumption:
    NCHW float32 RGB pixel values in 0..255 because normalization appears inside
    the graph. The MATLAB model author should verify this before public release.
    It cannot diagnose envenoming.
    """
    session = load_bite_session()
    inp = session.get_inputs()[0]
    out = session.get_outputs()[0]
    shape = inp.shape
    if len(shape) != 4:
        raise RuntimeError(f"Expected a 4-D NCHW ONNX input; got {shape}.")
    height = shape[2] if isinstance(shape[2], int) and shape[2] > 0 else IMAGE_SIZE
    width = shape[3] if isinstance(shape[3], int) and shape[3] > 0 else IMAGE_SIZE
    resized = image.resize((width, height), Image.Resampling.BILINEAR)
    pixels = np.asarray(resized, dtype=np.float32)
    tensor = np.transpose(pixels, (2, 0, 1))[None, ...]
    raw = session.run([out.name], {inp.name: tensor})[0]
    probabilities = softmax_or_probabilities(raw)
    if len(probabilities) != len(BITE_CLASS_NAMES):
        raise RuntimeError("Unexpected ONNX output size; verify output classes and MATLAB export.")
    idx = int(np.argmax(probabilities))
    label_verified = bool(RUNTIME_CONFIG.get("bite_class_order_verified", False))
    preprocess_verified = bool(RUNTIME_CONFIG.get("bite_input_preprocessing_verified", False))
    label = BITE_CLASS_NAMES[idx] if label_verified else f"Unverified output class {idx}"
    confidence = float(probabilities[idx])
    quality = image_quality_notes(image)
    warnings_out = list(quality["warnings"])
    if not label_verified:
        warnings_out.append("The MATLAB output-index-to-class mapping has not been marked verified in model/model_config.json.")
    if not preprocess_verified:
        warnings_out.append("MATLAB input preprocessing (RGB order, scale, and normalization) has not been marked verified in model/model_config.json.")
    if confidence < 0.60:
        warnings_out.append("The model score is low under a preliminary 0.60 heuristic; it is not a calibrated medical probability.")
    return {
        "label": label,
        "proposed_label": BITE_CLASS_NAMES[idx],
        "class_index": idx,
        "class_mapping_verified": label_verified,
        "preprocessing_verified": preprocess_verified,
        "confidence": confidence,
        "probabilities": [
            {"label": BITE_CLASS_NAMES[i] if label_verified else f"Output class {i}", "proposed_label": BITE_CLASS_NAMES[i], "score": float(probabilities[i])}
            for i in range(len(BITE_CLASS_NAMES))
        ],
        "warnings": warnings_out,
        "quality": quality,
        "medical_warning": (
            "This model classifies the appearance of the uploaded body-area image. It cannot determine "
            "whether venom was injected, assess envenoming, or rule out a dangerous bite. For any suspected "
            "snakebite, seek emergency medical care immediately; do not wait for this result."
        ),
        "first_aid": GENERAL_BITE_FIRST_AID,
        "sources": FIRST_AID_SOURCES,
    }


def predict_species_scores(image: Image.Image) -> dict[str, Any]:
    """Raw closed-set scores for a snake photo. No proof of snake presence is implied."""
    model, class_names, image_transform, torch = load_species_model()
    tensor = image_transform(image).unsqueeze(0)
    with torch.inference_mode():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
    top_scores, top_indices = torch.topk(probs, k=min(3, len(class_names)))
    scores = [float(x) for x in top_scores.tolist()]
    indices = [int(x) for x in top_indices.tolist()]
    top_label = class_names[indices[0]]
    margin = scores[0] - (scores[1] if len(scores) > 1 else 0.0)
    quality = image_quality_notes(image)
    confidence_threshold = float(RUNTIME_CONFIG.get("species_min_confidence", 0.50))
    margin_threshold = float(RUNTIME_CONFIG.get("species_min_margin", 0.08))
    low_confidence = scores[0] < confidence_threshold or margin < margin_threshold
    severe_quality_issue = any(
        warning.startswith("Image resolution is very small") or warning.startswith("The image may be blurry")
        for warning in quality["warnings"]
    )
    uncertain = low_confidence or severe_quality_issue
    threshold_validated = bool(RUNTIME_CONFIG.get("species_thresholds_validated", False))
    top_predictions = [
        {"label": class_names[i], "score": score}
        for i, score in zip(indices, scores)
    ]
    warnings_out = list(quality["warnings"])
    if not threshold_validated:
        warnings_out.append(
            "The confidence gate is preliminary and has not been calibrated using a labeled validation split plus unrelated-image controls."
        )
    warnings_out.append(
        "This is a closed-set 13-species classifier, not a snake-presence detector. An unrelated image can still receive a high score; never treat a high score as proof that a snake is present."
    )
    if uncertain:
        label = "Unable to identify confidently"
        species_info = None
        warnings_out.append(
            "No species-specific classification is being presented because the score, top-two margin, or image-quality check is insufficient."
        )
    else:
        label = top_label
        species_info = get_species_info(top_label)
    return {
        "label": label,
        "candidate_label": top_label,
        "uncertain": bool(uncertain),
        "confidence": scores[0],
        "top_two_margin": float(margin),
        "thresholds_validated": threshold_validated,
        "thresholds": {
            "minimum_score": confidence_threshold,
            "minimum_top_two_margin": margin_threshold,
        },
        "top_predictions": top_predictions,
        "species_info": species_info,
        "warnings": warnings_out,
        "quality": quality,
        "notice": (
            "AI species identification is an estimate, not confirmed identification. Do not approach, "
            "touch, corner, or handle the snake. If the image may show a snake, keep a safe distance."
        ),
    }


def predict_species_image(image: Image.Image) -> dict[str, Any]:
    """Public-facing result. Uses only thresholds stored in local model_config.json."""
    return predict_species_scores(image)


def model_diagnostics() -> dict[str, Any]:
    bite_input = None
    bite_outputs = []
    if bite_session is not None:
        bite_input_obj = bite_session.get_inputs()[0]
        bite_input = {"name": bite_input_obj.name, "shape": bite_input_obj.shape, "type": bite_input_obj.type}
        bite_outputs = [{"name": out.name, "shape": out.shape, "type": out.type} for out in bite_session.get_outputs()]
    return {
        "bite_model": {
            "available": BITE_ONNX_PATH.is_file(),
            "loaded": bite_session is not None,
            "file": BITE_ONNX_PATH.name,
            "input": bite_input,
            "outputs": bite_outputs,
            "class_names_proposed": BITE_CLASS_NAMES,
            "class_order_verified": bool(RUNTIME_CONFIG.get("bite_class_order_verified", False)),
            "input_preprocessing_verified": bool(RUNTIME_CONFIG.get("bite_input_preprocessing_verified", False)),
            "error_type": (BITE_MODEL_ERROR.split(":", 1)[0] if BITE_MODEL_ERROR else None),
        },
        "species_model": {
            "available": SPECIES_CHECKPOINT_PATH.is_file(),
            "loaded": species_model is not None,
            "file": SPECIES_CHECKPOINT_PATH.name,
            "classes": species_classes,
            "count": len(species_classes),
            "expected_class_count": 13,
            "minimum_confidence": RUNTIME_CONFIG.get("species_min_confidence"),
            "minimum_top_two_margin": RUNTIME_CONFIG.get("species_min_margin"),
            "thresholds_validated": bool(RUNTIME_CONFIG.get("species_thresholds_validated", False)),
            "error_type": (SPECIES_MODEL_ERROR.split(":", 1)[0] if SPECIES_MODEL_ERROR else None),
        },
        "model_loading": "Models load on first use, not during server startup.",
        "privacy": "Uploaded images are decoded and processed in memory; this app does not intentionally save uploaded images.",
    }


@app.after_request
def add_safety_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def home():
    return render_template(
        "index.html",
        bite_model_ready=BITE_ONNX_PATH.is_file(),
        species_model_ready=SPECIES_CHECKPOINT_PATH.is_file(),
        model_config=RUNTIME_CONFIG,
        diagnostics=model_diagnostics(),
    )


@app.get("/health")
def health():
    bite_available = BITE_ONNX_PATH.is_file()
    species_available = SPECIES_CHECKPOINT_PATH.is_file()
    ready = bite_available or species_available
    return jsonify({
        "status": "ok" if bite_available and species_available else ("partial" if ready else "model_files_missing"),
        "device": "cpu",
        "bite_model_available": bite_available,
        "species_model_available": species_available,
        "bite_model_loaded": bite_session is not None,
        "species_model_loaded": species_model is not None,
        "species_count": len(species_classes),
        "model_loading": "on-demand",
    }), (200 if ready else 503)


@app.get("/api/diagnostics")
def diagnostics():
    """Development diagnostic endpoint; does not expose local filesystem paths or tracebacks."""
    details = model_diagnostics()
    available = details["bite_model"]["available"] or details["species_model"]["available"]
    return jsonify(details), (200 if available else 503)


@app.post("/api/predict")
def api_predict():
    try:
        bite_file = request.files.get("bite_image")
        snake_file = request.files.get("snake_image")
        has_bite = bool(bite_file and bite_file.filename)
        has_snake = bool(snake_file and snake_file.filename)
        if not has_bite and not has_snake:
            return jsonify({"error": "Upload a bite-area photo, a snake photo, or both in their separate boxes."}), 400
        if has_bite and not BITE_ONNX_PATH.is_file():
            return jsonify({"error": "The bite-area model file is missing from the server deployment."}), 503
        if has_snake and not SPECIES_CHECKPOINT_PATH.is_file():
            return jsonify({"error": "The snake-species model file is missing from the server deployment."}), 503

        bite_result = None
        species_result = None

        # Run one model at a time. Each loader is lazy and CPU-thread limited,
        # reducing peak cold-start and inference memory on serverless workers.
        if has_bite:
            bite_image = verify_and_open_image(bite_file)
            try:
                bite_result = {
                    "image_size": {"width": bite_image.width, "height": bite_image.height},
                    **predict_bite_image(bite_image),
                }
            finally:
                bite_image.close()

        if has_snake:
            snake_image = verify_and_open_image(snake_file)
            try:
                species_result = {
                    "image_size": {"width": snake_image.width, "height": snake_image.height},
                    **predict_species_image(snake_image),
                }
            finally:
                snake_image.close()

        return jsonify({
            "success": True,
            "bite_result": bite_result,
            "species_result": species_result,
            "safety_notice": (
                "Never approach, touch, or attempt to catch a snake based on AI output. For any suspected "
                "snakebite, seek emergency medical care immediately and do not wait for this website."
            ),
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        logger.exception("Prediction failed")
        message = str(exc).strip()
        if not message or len(message) > 240:
            message = "The AI model could not complete this request. Please retry with one image at a time."
        return jsonify({"error": message}), 500


@app.errorhandler(413)
def upload_too_large(_error):
    return jsonify({"error": f"The total request is limited to {MAX_UPLOAD_MB} MB; each image must be no larger than {MAX_IMAGE_MB} MB."}), 413


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    # Flask's normal HTML error page is not useful to the upload JavaScript.
    if isinstance(error, HTTPException):
        if request.path.startswith("/api/"):
            return jsonify({"error": error.description or "The API request could not be completed."}), error.code
        return error
    logger.exception("Unhandled application error")
    if request.path.startswith("/api/"):
        return jsonify({
            "error": "The server encountered an unexpected processing error. Please retry with one image at a time. If it continues, share the time of the error with the project maintainer."
        }), 500
    return "SnakeVision could not complete this page request. Please refresh and try again.", 500


if __name__ == "__main__":
    print("\nSnakeVision AI — local development")
    print(f"Project folder: {BASE_DIR}")
    print("Device: CPU (models load on demand)")
    print(f"Bite model file: {'READY' if BITE_ONNX_PATH.is_file() else 'MISSING'}")
    print(f"Species model file: {'READY' if SPECIES_CHECKPOINT_PATH.is_file() else 'MISSING'}")
    print("Uploaded images are processed in memory, not saved by this app.")
    print("Open http://127.0.0.1:5000 after the server starts.\n")
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=False)
