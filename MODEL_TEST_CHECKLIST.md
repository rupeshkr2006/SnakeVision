# Model test checklist — before public launch

Use separate, labeled validation samples. Do not tune thresholds using the held-out test set. The app itself does not save uploaded photos.

## Bite-area ONNX model

- [ ] Confirm the MATLAB class order for output indices 0 and 1. Record it in `model/model_config.json` before setting `bite_class_order_verified` to `true`.
- [ ] Confirm MATLAB input layout, RGB/BGR ordering, resize method, scaling (0–1 vs 0–255), and whether normalization is embedded in the ONNX graph. Set `bite_input_preprocessing_verified` only after confirming all items.
- [ ] Test known Venomous validation images.
- [ ] Test known Non-Venomous validation images.
- [ ] Test wrong input types: snake-only photographs, hands without bite marks, people, furniture, and landscapes. The model will still output one of its two classes; that does not make the output meaningful.
- [ ] Test blurred, dark, low-resolution, and poorly framed body-area images.
- [ ] Save a confusion matrix and per-class precision/recall on labeled validation images.
- [ ] Regardless of output, keep urgent medical guidance visible for a suspected bite.

## Snake species model

- [ ] Evaluate the `val` rows from `dinov2_clean_split_manifest.csv` and inspect per-species recall and confusion matrix.
- [ ] Create a negative-control directory with unrelated images: hands, people, furniture, pets, landscapes, drawings/screenshots, and blurred images. Avoid any images from the training or test split.
- [ ] Record the top species, top score, top-two margin, and whether the confidence gate accepts/rejects each negative-control image.
- [ ] Review false accepts: non-snake images that the classifier still treats as a species candidate.
- [ ] Review false rejects: real snake images rejected by the confidence gate.
- [ ] Run `scripts/validate_models.py` with a validation split and negative controls before marking thresholds calibrated.
- [ ] Remember that confidence thresholds are only a heuristic. A separate, validated snake-presence detector is needed for robust rejection of all unrelated images.

## Upload, privacy, and website behaviour

- [ ] Valid JPG, JPEG, PNG, WEBP, and BMP images are accepted.
- [ ] Unsupported file extensions and invalid image bytes return a clear user-facing error.
- [ ] Images larger than 8 MB, requests larger than 18 MB, and decompression-bomb dimensions are rejected.
- [ ] Blurry/low-resolution images trigger warnings and/or uncertain classification.
- [ ] Uploading a body photo runs only the ONNX bite model.
- [ ] Uploading a snake photo runs only the species model.
- [ ] Uploading both photos runs each matching model independently.
- [ ] Model failure returns a clear error without exposing full local paths or a traceback to the browser.
- [ ] Uploaded pictures are not deliberately written to disk or returned by API routes.
- [ ] Every page keeps the medical emergency notice visible; AI output never replaces medical care.
