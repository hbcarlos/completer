import json
from pathlib import Path

__all__ = ["__version__"]

HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)

__version__ = data["version"]

