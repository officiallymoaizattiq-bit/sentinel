"""One-off: generate placeholder WAVs for demo replay.

Real recordings should replace these before any live demo. Run once:
    python demo/audio/generate_placeholder.py
"""
import numpy as np
import soundfile as sf
from pathlib import Path

HERE = Path(__file__).parent
SR = 16000
DUR = 12

def make(name: str, kind: str) -> None:
    t = np.linspace(0, DUR, DUR * SR, endpoint=False, dtype="float32")
    if kind == "baseline":
        y = 0.1 * np.sin(2 * np.pi * 180 * t) + 0.05 * np.sin(2 * np.pi * 220 * t)
    elif kind == "drift":
        y = 0.1 * np.sin(2 * np.pi * 160 * t) + 0.1 * np.sin(2 * np.pi * 240 * t)
        y += 0.03 * np.random.default_rng(1).standard_normal(len(t))
    else:  # red
        y = 0.08 * np.sin(2 * np.pi * 130 * t) + 0.12 * np.sin(2 * np.pi * 260 * t)
        y += 0.08 * np.random.default_rng(2).standard_normal(len(t))
    sf.write(HERE / f"{name}.wav", y.astype("float32"), SR, subtype="PCM_16")

for name in ("baseline", "drift", "red"):
    make(name, name)
print("generated baseline.wav, drift.wav, red.wav")
