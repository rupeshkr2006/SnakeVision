from __future__ import annotations
import json
import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
import app

print(json.dumps(app.model_diagnostics(), indent=2))
print("\nImportant: output class order and preprocessing flags must be verified against MATLAB, not inferred from these tensor shapes alone.")
