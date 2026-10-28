from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)

# Make the project root importable when launched from scripts/.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

import app as site_app  # noqa: E402

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
DEFAULT_MANIFEST = Path(r"D:\EPICS project\snake_species_python\results\dinov2_clean_split_manifest.csv")


def find_col(frame: pd.DataFrame, options: list[str], description: str) -> str:
    cmap = {str(c).strip().lower(): c for c in frame.columns}
    for opt in options:
        if opt.lower() in cmap:
            return cmap[opt.lower()]
    raise ValueError(f"Could not find {description} column. Found: {list(frame.columns)}")


def load_validation_rows(manifest: Path) -> tuple[pd.DataFrame, list[str]]:
    if not manifest.exists():
        raise FileNotFoundError(
            f"Validation manifest not found: {manifest}\n"
            "Pass --manifest with your clean split manifest. This script only uses rows marked 'val'."
        )
    df = pd.read_csv(manifest)
    path_col = find_col(df, ["path", "image_path", "filepath", "file_path", "image"], "image path")
    label_col = find_col(df, ["species", "label", "class_name", "class", "category"], "species")
    split_col = find_col(df, ["split", "subset", "set", "partition", "data_split"], "split")
    df = df.rename(columns={path_col: "path", label_col: "species", split_col: "split"})
    split_map = {
        "training": "train", "training_set": "train", "train": "train",
        "validation": "val", "valid": "val", "val": "val", "dev": "val",
        "testing": "test", "testing_set": "test", "test": "test",
    }
    df["split"] = df["split"].astype(str).str.strip().str.lower().map(lambda x: split_map.get(x, x))
    df["path"] = df["path"].astype(str)
    df["species"] = df["species"].astype(str).str.strip()
    val = df[df["split"] == "val"].copy().reset_index(drop=True)
    if val.empty:
        raise ValueError("The manifest contains no rows marked 'val'.")
    missing = [p for p in val["path"] if not Path(p).is_file()]
    if missing:
        raise FileNotFoundError(f"{len(missing)} validation images are missing; example: {missing[0]}")
    classes = sorted(df["species"].unique().tolist())
    return val, classes


def walk_images(root: Path):
    if not root.exists():
        raise FileNotFoundError(f"Image directory not found: {root}")
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
            yield path


def open_rgb(path: Path):
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        im.load()
        return im.convert("RGB")


def run_species_validation(val_frame: pd.DataFrame, classes: list[str], output_dir: Path):
    if site_app.species_model is None:
        raise RuntimeError(f"Species model unavailable: {site_app.SPECIES_MODEL_ERROR}")
    y_true: list[str] = []
    y_pred: list[str] = []
    confs: list[float] = []
    margins: list[float] = []
    rows = []
    print(f"\nRunning species model on {len(val_frame)} validation images...")
    for i, row in val_frame.iterrows():
        path = Path(row["path"])
        im = open_rgb(path)
        result = site_app.predict_species_scores(im)
        candidate = result["candidate_label"]
        true_label = str(row["species"])
        y_true.append(true_label)
        y_pred.append(candidate)
        confs.append(float(result["confidence"]))
        margins.append(float(result["top_two_margin"]))
        rows.append({
            "filename": path.name,
            "true_species": true_label,
            "top_candidate": candidate,
            "top_score": result["confidence"],
            "top_two_margin": result["top_two_margin"],
            "correct": candidate == true_label,
        })
        if (i + 1) % 25 == 0 or i + 1 == len(val_frame):
            print(f"  {i + 1}/{len(val_frame)}")

    labels = classes
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    per_species = pd.DataFrame({
        "species": labels,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "support": support,
    })
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    pd.DataFrame(rows).to_csv(output_dir / "species_validation_predictions.csv", index=False)
    per_species.to_csv(output_dir / "species_validation_per_class.csv", index=False)
    pd.DataFrame(cm, index=labels, columns=labels).to_csv(output_dir / "species_validation_confusion_matrix.csv")
    metrics = {
        "validation_images": len(y_true),
        "top1_accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_precision": float(np.mean(precision)),
        "macro_recall": float(np.mean(recall)),
        "macro_f1": float(np.mean(f1)),
        "mean_top_score": float(np.mean(confs)),
        "mean_top_two_margin": float(np.mean(margins)),
    }
    print("Species validation metrics:", json.dumps(metrics, indent=2))
    return rows, metrics, np.asarray(confs), np.asarray(margins)


def run_negative_controls(root: Path | None, output_dir: Path):
    if root is None:
        return [], []
    if site_app.species_model is None:
        raise RuntimeError(f"Species model unavailable: {site_app.SPECIES_MODEL_ERROR}")
    rows = []
    confs = []
    margins = []
    files = list(walk_images(root))
    if not files:
        raise ValueError(f"No supported images found under negative-control directory: {root}")
    print(f"\nRunning species classifier on {len(files)} unrelated/negative-control images...")
    for i, path in enumerate(files, start=1):
        im = open_rgb(path)
        result = site_app.predict_species_scores(im)
        conf = float(result["confidence"])
        margin = float(result["top_two_margin"])
        category = path.parent.name if path.parent != root else "uncategorized"
        rows.append({
            "filename": path.name,
            "category_folder": category,
            "top_candidate": result["candidate_label"],
            "top_score": conf,
            "top_two_margin": margin,
        })
        confs.append(conf)
        margins.append(margin)
        if i % 10 == 0 or i == len(files):
            print(f"  {i}/{len(files)}")
    pd.DataFrame(rows).to_csv(output_dir / "species_negative_controls.csv", index=False)
    return rows, [np.asarray(confs), np.asarray(margins)]


def calibrate_open_set_gate(positive_conf, positive_margin, negative_conf, negative_margin) -> dict:
    """Tune a *heuristic reject gate* on validation snakes and manually labeled negatives.

    It is not a substitute for a dedicated snake-vs-non-snake detector. The negative set
    must represent the intended deployment conditions (hands, people, objects, blur, etc.).
    """
    if len(positive_conf) == 0 or len(negative_conf) == 0:
        return {"calibrated": False, "reason": "Need both labeled validation snake images and unrelated negative controls."}
    all_conf = np.concatenate([positive_conf, negative_conf])
    all_margin = np.concatenate([positive_margin, negative_margin])
    conf_candidates = np.unique(np.quantile(all_conf, np.linspace(0.05, 0.95, 15)))
    margin_candidates = np.unique(np.quantile(all_margin, np.linspace(0.05, 0.95, 15)))
    best = None
    for cth in conf_candidates:
        for mth in margin_candidates:
            positive_accept = (positive_conf >= cth) & (positive_margin >= mth)
            negative_accept = (negative_conf >= cth) & (negative_margin >= mth)
            sensitivity = float(positive_accept.mean())
            specificity = float((~negative_accept).mean())
            bal_acc = (sensitivity + specificity) / 2
            # At tied balanced accuracy, prefer higher sensitivity to avoid rejecting snakes.
            key = (bal_acc, sensitivity, -float(cth), -float(mth))
            if best is None or key > best[0]:
                best = (key, float(cth), float(mth), sensitivity, specificity, bal_acc, int(positive_accept.sum()), int(negative_accept.sum()))
    assert best is not None
    _, cth, mth, sens, spec, bacc, tp, fp = best
    enough = len(positive_conf) >= 30 and len(negative_conf) >= 30
    return {
        "calibrated": enough,
        "minimum_confidence": cth,
        "minimum_top_two_margin": mth,
        "validation_snake_count": int(len(positive_conf)),
        "negative_control_count": int(len(negative_conf)),
        "snake_acceptance_rate": sens,
        "negative_rejection_rate": spec,
        "balanced_accuracy": bacc,
        "accepted_validation_snakes": tp,
        "accepted_negative_controls_false_positive_count": fp,
        "note": (
            "Thresholds were tuned using only the provided validation snake images and negative controls. "
            "The gate is a heuristic, not a true object detector. Use a separate detector and a broader external test set before public use."
            if enough else
            "Proposed thresholds are based on a small validation sample (<30 snake or negative images); they are not marked validated. Add more representative, separately labeled controls."
        ),
    }


def run_bite_validation(root: Path | None, output_dir: Path):
    if root is None:
        return None
    if site_app.bite_session is None:
        raise RuntimeError(f"Bite model unavailable: {site_app.BITE_MODEL_ERROR}")
    class_names = list(site_app.BITE_CLASS_NAMES)
    rows = []
    for class_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        expected = class_dir.name.strip()
        if expected not in class_names:
            print(f"WARNING: bite validation folder '{expected}' is not in configured labels {class_names}; keeping predictions but excluding from mapped accuracy.")
        for path in walk_images(class_dir):
            im = open_rgb(path)
            result = site_app.predict_bite_image(im)
            rows.append({
                "filename": path.name,
                "expected_folder_label": expected,
                "predicted_output_index": result["class_index"],
                "proposed_label_under_config": result["proposed_label"],
                "mapping_verified": result["class_mapping_verified"],
                "score": result["confidence"],
                "mapped_correct_under_assumption": expected == result["proposed_label"],
            })
    if not rows:
        raise ValueError("No labeled bite images found. Expected folders named Venomous/ and Non-Venomous/.")
    df = pd.DataFrame(rows)
    df.to_csv(output_dir / "bite_validation_predictions.csv", index=False)
    accuracy_under_assumption = float(df["mapped_correct_under_assumption"].mean())
    report = {
        "validation_images": len(df),
        "accuracy_under_configured_mapping": accuracy_under_assumption,
        "class_mapping_verified": bool(site_app.RUNTIME_CONFIG.get("bite_class_order_verified", False)),
        "warning": "Accuracy is not interpretable as a trustworthy labeled metric until bite_class_order_verified is checked against MATLAB's original class ordering." if not site_app.RUNTIME_CONFIG.get("bite_class_order_verified", False) else None,
    }
    print("Bite model validation:", json.dumps(report, indent=2))
    return report


def main():
    parser = argparse.ArgumentParser(description="Validate SnakeVision models on labeled validation data; never point this tool at test data for threshold selection.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST, help="Clean split manifest; only rows marked val are used for species validation.")
    parser.add_argument("--negative-dir", type=Path, default=None, help="Folder of manually labeled non-snake controls grouped by subfolder (hands, people, objects, blurry, etc.).")
    parser.add_argument("--bite-validation-dir", type=Path, default=None, help="Optional labeled bite-area validation folder with Venomous/ and Non-Venomous/ subfolders.")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "results" / "model_validation", help="Report output directory. No images are copied there.")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 72)
    print("SNAKEVISION MODEL VALIDATION — VALIDATION DATA ONLY")
    print("=" * 72)
    print("Important: thresholds from this script must be tuned only on validation examples, never on the test set.")
    print("Bite model class mapping verified:", site_app.RUNTIME_CONFIG.get("bite_class_order_verified", False))
    print("Bite preprocessing verified:", site_app.RUNTIME_CONFIG.get("bite_input_preprocessing_verified", False))

    diagnostics = site_app.model_diagnostics()
    (args.output_dir / "model_diagnostics.json").write_text(json.dumps(diagnostics, indent=2), encoding="utf-8")
    print("Model diagnostics saved. ONNX input/output names and dimensions are available in model_diagnostics.json.")

    val_frame, classes = load_validation_rows(args.manifest)
    species_rows, species_metrics, positive_conf, positive_margin = run_species_validation(val_frame, classes, args.output_dir)
    negative_rows, negative_arrays = run_negative_controls(args.negative_dir, args.output_dir)
    threshold_report = {"calibrated": False, "reason": "No --negative-dir supplied; no open-set gate calibration was attempted."}
    if negative_arrays:
        negative_conf, negative_margin = negative_arrays
        threshold_report = calibrate_open_set_gate(positive_conf, positive_margin, negative_conf, negative_margin)
        print("\nProposed species reject-gate calibration:", json.dumps(threshold_report, indent=2))
        if "minimum_confidence" in threshold_report:
            # Persist only the values measured on this validation/negative-control set.
            config_path = site_app.MODEL_CONFIG_PATH
            config = dict(site_app.RUNTIME_CONFIG)
            config["species_min_confidence"] = threshold_report["minimum_confidence"]
            config["species_min_margin"] = threshold_report["minimum_top_two_margin"]
            config["species_thresholds_validated"] = bool(threshold_report["calibrated"])
            config["threshold_validation_note"] = threshold_report["note"]
            config["threshold_validation_metrics"] = threshold_report
            config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")
            print(f"Updated model confidence settings: {config_path}")
            if not threshold_report["calibrated"]:
                print("NOTE: Too few examples were provided to mark thresholds as validated.")

    bite_report = run_bite_validation(args.bite_validation_dir, args.output_dir)
    report = {
        "species_validation": species_metrics,
        "species_negative_controls": {
            "count": len(negative_rows),
            "categories": sorted({r["category_folder"] for r in negative_rows}),
        },
        "species_gate_calibration": threshold_report,
        "bite_validation": bite_report,
        "notes": [
            "The species model is closed-set; high softmax scores do not establish that an input contains a snake.",
            "The unrelated-image gate is only a heuristic. A separately trained snake-vs-non-snake detector is recommended.",
            "The ONNX class order and normalization must be checked against MATLAB and marked in model/model_config.json only after verification.",
            "These are validation results. Do not use the held-out test set to tune thresholds.",
        ],
    }
    (args.output_dir / "model_validation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nSaved validation report to: {args.output_dir / 'model_validation_report.json'}")
    print("No uploaded image from the website is saved by the website app. This validation script writes metrics and filenames only.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"VALIDATION FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1)
