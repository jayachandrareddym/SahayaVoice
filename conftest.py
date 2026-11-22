"""Put backend/ on sys.path so tests can `import pipeline...` like main.py does."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent / "backend"))
