# SnakeVision AI — safety and validation update

This is an **update to the existing project** at `D:\snakebite-website`, not a separate project to run elsewhere. Merge these files into that folder. Do not replace your `venv` or trained model files.

## What this update adds

- A persistent emergency guidance panel based on WHO snakebite guidance.
- Bite-image classification language that explicitly says the model is not a clinical assessment and cannot rule out envenoming.
- Separate image fields: `bite_image` is sent only to the ONNX model; `snake_image` is sent only to the 13-species model.
- Per-species scientific names, risk notes, conservative precautions, and source links for all 13 labels.
- Low-confidence and small-margin abstention for species output. It displays `Unable to identify confidently` rather than assigning species-specific risk guidance when the preliminary gate rejects a result.
- Image dimension, format, extension and file-size checks, malformed-image handling, blur/low-resolution warnings, and generic user-facing errors.
- Upload processing in memory; the web app does not intentionally write uploaded images to disk or log image content.
- `/health` and `/api/diagnostics` endpoints to inspect model readiness and verification flags without exposing local model paths.
- `scripts/model_diagnostics.py` for input/output and class-order status.
- `scripts/validate_models.py` for validation-split evaluation, per-species confusion metrics, negative controls (hands/people/objects/blur), optional labeled bite image validation, and validation-only threshold calibration.
- `MODEL_TEST_CHECKLIST.md` for explicit checks before public launch.

## Existing model files to preserve

The app searches these locations (preferred is `model/`):

```
D:\snakebite-website\model\bite_resnet18.onnx
D:\snakebite-website\model\final_snake_model.pt
```

The package includes `model\model_config.json` but not your trained model files or virtual environment. Merge this config file into your existing `model` folder; do not remove either model file.

## Apply the update

1. Stop Flask using `Ctrl+C` in the terminal.
2. Extract/merge the ZIP contents into `D:\snakebite-website`.
3. Keep the current `venv` and both model files in `model\`.
4. In VS Code PowerShell:

```powershell
cd "D:\snakebite-website"
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe .\app.py
```

5. Open `http://127.0.0.1:5000`. The diagnostics panel reports whether class order, input preprocessing, and confidence thresholds have been verified.

## Safety switches that require manual verification

Open `model\model_config.json`.

- `bite_class_order_verified` starts as `false`. Set it to `true` **only after checking the class-index order of the original MATLAB model** against `bite_class_names` in the file. ONNX tensor shapes alone cannot prove which class is index 0 or 1.
- `bite_input_preprocessing_verified` starts as `false`. Set it to `true` only after comparing the MATLAB input pipeline to the website's RGB, resize, pixel-scale, and embedded-normalization assumptions. Don't normalize twice.
- `species_thresholds_validated` starts as `false`. The app uses preliminary conservative thresholds until you run calibration with a labeled validation split plus a varied negative-control set. The page labels those thresholds as preliminary until there are at least 30 validation snake images and 30 negative controls.

Do not alter a flag just to remove a warning. Verify it first. The ONNX bite model's output is an image classification score, not a diagnosis.

## Validate model behaviour before deployment

The script only uses rows in your existing manifest that are explicitly marked `val`, never `test`, for threshold selection. By default it looks for:

`D:\EPICS project\snake_species_python\results\dinov2_clean_split_manifest.csv`

Run:

```powershell
.\venv\Scripts\python.exe .\scripts\model_diagnostics.py
```

To evaluate species classification and calibrate an open-set reject gate, prepare a folder of **unrelated negative controls not used in training/testing**. Include a useful variety such as `hands`, `people`, `furniture`, `pets`, `landscapes`, `drawings`, `blurry`, and `non_snake_objects`. The script uses subfolder names as category labels for reporting only.

```powershell
.\venv\Scripts\python.exe .\scripts\validate_models.py `
  --manifest "D:\EPICS project\snake_species_python\results\dinov2_clean_split_manifest.csv" `
  --negative-dir ".\validation_samples\negative_controls" `
  --bite-validation-dir ".\validation_samples\bite_area"
```

`--bite-validation-dir` is optional. If used, it must contain `Venomous\` and `Non-Venomous\` folders with separately labeled **validation** bite-area photos. Since output class names cannot be inferred safely from the ONNX tensor itself, the script will explicitly warn if mapping verification is not set.

Threshold calibration is only a confidence/margin heuristic. It is **not equivalent to a real snake-vs-non-snake detector**. A high-confidence non-snake can still fool a closed-set classifier; public deployment should use a separate snake-presence detector trained and tested on relevant negative examples.

Metrics are saved to `results\model_validation`. Images are not copied into the results folder; CSVs contain filenames and scores only. After calibration, restart the Flask app so it reloads `model_config.json`.

## Medical and wildlife safety

The page always instructs users to seek emergency medical care for a suspected bite, keep the person still, immobilize the affected limb, remove tight items near swelling if easy, and avoid cutting/sucking the wound or using a tight tourniquet. It deliberately avoids recommending pressure-immobilisation bandaging generically because first-aid guidance can differ by region and venom effects; follow qualified local emergency/medical instructions.

Species entries are conservative educational summaries and link to sources; image predictions are not verified identifications. Green Tree Vine is explicitly flagged because your dataset's `Non-Venomous` folder assignment conflicts with some Indian snake-education sources that describe *Ahaetulla nasuta* as mildly venomous/rear-fanged. Review the dataset label. No result should be used to decide to approach a snake or to delay care after a suspected bite.

General first-aid references:

- WHO treatment guidance: https://www.who.int/teams/control-of-neglected-tropical-diseases/snakebite-envenoming/treatment
- WHO snakebite information: https://www.who.int/health-topics/snakebite/snakebite
- Government of India National Action Plan: https://ncdc.mohfw.gov.in/uploads/pdf/NATIONAL-ACTION-PLAN-FOR-PREVENTION-AND-CONTROL-OF-SNAKEBITE-ENVENOMING-NAPSE.pdf

## Vercel note

This update is first for **local integration and validation**. The PyTorch + Transformers species model can be large and slow to initialize in a serverless function. Don't publish this configuration to Vercel until the full local workflow works and deployment bundle/runtime limits have been checked. The `venv`, full dataset, checkpoints from experiments, and local validation images must not be uploaded as website assets.
