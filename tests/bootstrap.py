"""Load standalone integration modules without importing the HA entry point."""
from pathlib import Path
import sys
import types

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "custom_components.eufymake_e1"
for name, path in [("custom_components", ROOT / "custom_components"), (PACKAGE, ROOT / "custom_components/eufymake_e1")]:
    if name not in sys.modules:
        module = types.ModuleType(name)
        module.__path__ = [str(path)]
        sys.modules[name] = module
