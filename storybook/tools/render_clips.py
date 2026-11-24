#!/usr/bin/env python3
"""Pre-render narration clips with Kokoro (kokoro-onnx) to Ogg Opus.

Usage:
  venv/bin/python -I scripts/render.py items.json out_dir [--jobs 2] [--model PATH] [--voices PATH]
                                       [--bitrate 24k] [--default-voice bf_emma] [--default-speed 0.9]
                                       [--pad-ms 80] [--force] [--wav]

items.json: [{"id": "p01_line1", "text": "...", "voice": "bf_emma", "speed": 0.9}, ...]
  "voice" and "speed" are optional (defaults from CLI). Optional "lang" overrides the
  language derived from the voice prefix (a* -> en-us, b* -> en-gb).
Writes <out_dir>/<id>.ogg (Opus, mono, 24 kbps); existing files are skipped unless --force.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = HERE / "models" / "kokoro-v1.0.onnx"
DEFAULT_VOICES = HERE / "models" / "voices-v1.0.bin"
LANG_BY_PREFIX = {"a": "en-us", "b": "en-gb", "e": "es", "f": "fr-fr", "h": "hi",
                  "i": "it", "p": "pt-br", "j": "ja", "z": "cmn"}
SAFE_ID = re.compile(r"^[A-Za-z0-9._-]+$")


def write_wav(path, samples, sr):
    pcm = (np.clip(samples, -1.0, 1.0) * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def tighten(samples, sr, thresh_db=-45.0, keep_ms=40):
    """Trim leading/trailing near-silence (Kokoro sometimes leaves ~0.7 s at the end)."""
    f = max(1, int(sr * 0.01))
    n = len(samples) // f
    if n == 0:
        return samples
    e = 20 * np.log10(np.sqrt((samples[: n * f].reshape(n, f) ** 2).mean(1)) + 1e-12)
    act = np.where(e > thresh_db)[0]
    if len(act) == 0:
        return samples
    k = int(sr * keep_ms / 1000)
    return samples[max(0, act[0] * f - k): min(len(samples), (act[-1] + 1) * f + k)]


def normalise(samples, sr, target_dbfs, peak_cap=0.89):
    f = max(1, int(sr * 0.02))
    n = len(samples) // f
    if n == 0:
        return samples
    fr = samples[: n * f].reshape(n, f)
    rms_f = np.sqrt((fr ** 2).mean(1))
    voiced = fr[20 * np.log10(rms_f + 1e-12) > -40]
    if voiced.size == 0:
        return samples
    rms = float(np.sqrt((voiced ** 2).mean()))
    gain = (10 ** (target_dbfs / 20)) / max(rms, 1e-9)
    peak = float(np.abs(samples).max())
    gain = min(gain, peak_cap / max(peak, 1e-9))
    return samples * gain


def encode_opus(wav_path, out_path, bitrate):
    subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
         "-ac", "1", "-c:a", "libopus", "-b:a", bitrate, "-vbr", "on",
         "-application", "voip", "-map_metadata", "-1", "-f", "ogg", str(out_path)],
        check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("items")
    ap.add_argument("out_dir")
    ap.add_argument("--jobs", type=int, default=1, help="parallel clips (each ONNX run is already multi-threaded; 1-2 is usually best)")
    ap.add_argument("--model", default=str(DEFAULT_MODEL))
    ap.add_argument("--voices", default=str(DEFAULT_VOICES))
    ap.add_argument("--bitrate", default="24k")
    ap.add_argument("--default-voice", default="bf_emma")
    ap.add_argument("--default-speed", type=float, default=0.9)
    ap.add_argument("--pad-ms", type=int, default=80, help="silence added at each end after trimming")
    ap.add_argument("--target-dbfs", type=float, default=-20.0,
                    help="RMS level of the speech part after normalisation (peak capped at -1 dBFS); 0 disables")
    ap.add_argument("--force", action="store_true", help="re-render even if output exists")
    ap.add_argument("--wav", action="store_true", help="also keep a 16-bit WAV next to the .ogg")
    a = ap.parse_args()

    items = json.loads(Path(a.items).read_text(encoding="utf-8"))
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    seen = set()
    for it in items:
        if not SAFE_ID.match(it.get("id", "")):
            sys.exit(f"bad id (use [A-Za-z0-9._-]): {it.get('id')!r}")
        if it["id"] in seen:
            sys.exit(f"duplicate id: {it['id']}")
        seen.add(it["id"])

    todo = [it for it in items if a.force or not (out / f"{it['id']}.ogg").exists()]
    print(f"{len(items)} items, {len(items) - len(todo)} already exist, rendering {len(todo)}")
    if not todo:
        return
    kokoro = Kokoro(a.model, a.voices)
    pad = None

    def render(it):
        voice = it.get("voice") or a.default_voice
        speed = float(it.get("speed") or a.default_speed)
        lang = it.get("lang") or LANG_BY_PREFIX.get(voice[0], "en-us")
        t0 = time.perf_counter()
        samples, sr = kokoro.create(it["text"], voice=voice, speed=speed, lang=lang, trim=True)
        dt = time.perf_counter() - t0
        samples = np.asarray(samples, dtype=np.float32)
        peak = float(np.max(np.abs(samples))) if samples.size else 0.0
        if len(samples) == 0:
            raise RuntimeError(f"{it['id']}: empty audio")
        samples = tighten(samples, sr)
        if a.target_dbfs:
            samples = normalise(samples, sr, a.target_dbfs)
        elif peak > 0.98:  # guard against clipping
            samples = samples * (0.98 / peak)
        z = np.zeros(int(sr * a.pad_ms / 1000), dtype=np.float32)
        samples = np.concatenate([z, samples, z])
        dur = len(samples) / sr
        target = out / f"{it['id']}.ogg"
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / "a.wav"
            write_wav(wav, samples, sr)
            tmp = out / f".{it['id']}.tmp.ogg"
            encode_opus(wav, tmp, a.bitrate)
            os.replace(tmp, target)
            if a.wav:
                write_wav(out / f"{it['id']}.wav", samples, sr)
        kb = target.stat().st_size / 1024
        print(f"{it['id']}: {voice} x{speed} {dur:.2f}s audio, synth {dt:.2f}s (RTF {dt / max(dur, 1e-9):.2f}), "
              f"{kb:.1f} KB, raw peak {peak:.2f}", flush=True)
        return dur, dt, kb

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
        res = list(ex.map(render, todo))
    wall = time.perf_counter() - t0
    tot_dur = sum(r[0] for r in res)
    tot_kb = sum(r[2] for r in res)
    print(f"done: {tot_dur:.1f}s audio in {wall:.1f}s wall (RTF {wall / tot_dur:.2f}), "
          f"{tot_kb:.1f} KB total, {tot_kb / tot_dur:.2f} KB/s")


if __name__ == "__main__":
    main()
