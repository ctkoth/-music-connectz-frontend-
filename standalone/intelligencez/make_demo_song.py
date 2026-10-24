#!/usr/bin/env python3
"""Synthesize the song the Mix ConnectZ screenshots master.

    python make_demo_song.py out.wav            # ~-22 LUFS, 40 s, 44.1 kHz stereo 16-bit

Why a synthesized song: the Play screenshots have to show a REAL mastering run
(the engine measures and masters whatever file it is handed, in the browser, with
no server involved) and there is no licensed audio in this repo. So this makes
something music-shaped — kick, snare, hats, a sub bass, a detuned-saw pad, a
plucked lead through a ping-pong delay — with a stereo field and, on purpose, two
faults a mastering pass can find and name: a bump of low-mids around 300 Hz (the
"mud" EQ is for) and a mix that is quiet (about -22 LUFS) so the loudness stage
has something to do. It is a test signal with a beat, not a recording.

Deterministic (seeded), and it measures itself with a BS.1770 meter (K-weighting,
400 ms blocks, absolute and relative gates) so "about -22 LUFS" is a measurement
and not a hope. numpy and scipy only.
"""
import sys
import wave

import numpy as np
from scipy import signal

FS = 44100
BPM = 96
BARS = 16
BEAT = 60.0 / BPM
STEP = BEAT / 4          # a 16th note
SECONDS = BARS * 4 * BEAT
N = int(round(SECONDS * FS))
rng = np.random.default_rng(1970)

L = np.zeros(N)
R = np.zeros(N)


def put(buf, at, sig, gain=1.0):
    i = int(round(at * FS))
    if i >= N:
        return
    n = min(len(sig), N - i)
    buf[i:i + n] += sig[:n] * gain


def stereo(at, sig, gain=1.0, pan=0.5):
    """pan 0 = hard left, 1 = hard right, equal-power."""
    th = pan * np.pi / 2
    put(L, at, sig, gain * np.cos(th))
    put(R, at, sig, gain * np.sin(th))


def env_exp(n, rate):
    return np.exp(-np.arange(n) / FS * rate)


# ---- drums ------------------------------------------------------------------
def kick():
    n = int(0.45 * FS)
    t = np.arange(n) / FS
    f = 44 + 95 * np.exp(-t * 26)
    ph = 2 * np.pi * np.cumsum(f) / FS
    body = np.sin(ph) * env_exp(n, 7.5)
    click = rng.standard_normal(n) * env_exp(n, 700) * 0.12
    return np.tanh((body + click) * 1.4) * 0.9


def snare():
    n = int(0.3 * FS)
    t = np.arange(n) / FS
    noise = signal.sosfilt(signal.butter(2, [900, 7500], btype="band", fs=FS, output="sos"),
                           rng.standard_normal(n)) * env_exp(n, 16)
    tone = np.sin(2 * np.pi * 188 * t) * env_exp(n, 30) * 0.55
    return (noise * 0.9 + tone) * 0.8


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * FS)
    x = signal.sosfilt(signal.butter(3, 7000, btype="high", fs=FS, output="sos"), rng.standard_normal(n))
    return x * env_exp(n, 22 if open_ else 95) * 0.5


K, S, H, HO = kick(), snare(), hat(), hat(True)

for bar in range(BARS):
    b0 = bar * 4 * BEAT
    kicks = [0, 6, 10] if bar % 4 != 3 else [0, 6, 8, 11]
    snares = [4, 12] if bar % 4 != 3 else [4, 10, 12, 14]
    for s in kicks:
        stereo(b0 + s * STEP, K, 1.0, 0.5)
    for s in snares:
        stereo(b0 + s * STEP, S, 0.62, 0.5 + 0.06 * rng.standard_normal())
    for s in range(0, 16, 2):
        stereo(b0 + s * STEP, H, 0.32 if s % 4 == 0 else 0.22, 0.28 if (s // 2) % 2 == 0 else 0.72)
    if bar % 2 == 1:
        stereo(b0 + 14 * STEP, HO, 0.3, 0.7)

# ---- bass (mono, sub-heavy) -------------------------------------------------
ROOTS = [55.0, 43.654, 65.406, 49.0]   # A1 F1 C2 G1: Am7 Fmaj7 Cmaj7 G6


def bass_note(f, dur):
    n = int(dur * FS)
    t = np.arange(n) / FS
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    e = np.minimum(1, t / 0.012) * np.exp(-t * 2.2) * np.minimum(1, (dur - t) / 0.05)
    return np.tanh(x * e * 1.6) * 0.62


for bar in range(BARS):
    f = ROOTS[bar % 4]
    b0 = bar * 4 * BEAT
    for s, d, g in ((0, 5.2, 1.0), (6, 3.0, 0.8), (10, 4.0, 0.9), (14, 1.6, 0.6)):
        put(L, b0 + s * STEP, bass_note(f, d * STEP), g * 0.7071)
        put(R, b0 + s * STEP, bass_note(f, d * STEP), g * 0.7071)

# ---- pad (wide: each channel gets its own detune and phase) -------------------
CHORDS = [(220.0, 261.63, 329.63, 392.0), (174.61, 220.0, 261.63, 329.63),
          (130.81, 164.81, 196.0, 246.94), (196.0, 246.94, 293.66, 329.63)]
pad_l, pad_r = np.zeros(N), np.zeros(N)


def saw(f, n, phase):
    t = np.arange(n) / FS
    return 2 * ((f * t + phase) % 1.0) - 1


for bar in range(BARS):
    n = int((4 * BEAT + 0.9) * FS)
    at = bar * 4 * BEAT
    t = np.arange(n) / FS
    adsr = np.minimum(1, t / 0.45) * np.minimum(1, np.maximum(0, (4 * BEAT + 0.9 - t) / 0.8))
    for f in CHORDS[bar % 4]:
        for buf in (pad_l, pad_r):
            x = 0
            for cents in (-7, 0, 7):
                x = x + saw(f * 2 ** ((cents + rng.uniform(-3, 3)) / 1200), n, rng.uniform())
            put(buf, at, x / 3 * adsr, 0.11)
sos = signal.butter(2, 2600, btype="low", fs=FS, output="sos")
pad_l, pad_r = signal.sosfilt(sos, pad_l), signal.sosfilt(sos, pad_r)


def peaking(x, f0, gain_db, q):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / FS
    al = np.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w0), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w0), 1 - al / A]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


# ---- a plucked lead through a ping-pong delay ----------------------------------
MEL = {0: 440.0, 3: 523.25, 6: 659.25, 8: 587.33, 11: 523.25, 14: 440.0}   # A pentatonic-ish
lead_l, lead_r = np.zeros(N), np.zeros(N)
for bar in range(4, BARS):
    for s, f in MEL.items():
        if (bar + s) % 3 == 0:
            continue
        n = int(0.5 * FS)
        t = np.arange(n) / FS
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * env_exp(n, 7) * np.minimum(1, t / 0.004)
        at = bar * 4 * BEAT + s * STEP
        put(lead_l, at, x, 0.16)
        put(lead_r, at + 3 * STEP, x, 0.1)        # the first echo lands on the right
        put(lead_l, at + 6 * STEP, x, 0.06)       # the second on the left

# ---- the room: a short synthetic reverb on pad and lead ---------------------------
ir_n = int(0.9 * FS)
ir = rng.standard_normal(ir_n) * env_exp(ir_n, 5.5)
ir = signal.sosfilt(signal.butter(2, 5000, btype="low", fs=FS, output="sos"), ir)
ir /= np.sqrt(np.sum(ir ** 2))
wet_l = signal.fftconvolve(pad_l * 0.6 + lead_l, ir)[:N] * 0.34
ir2 = np.roll(ir, 37)
wet_r = signal.fftconvolve(pad_r * 0.6 + lead_r, ir2)[:N] * 0.34

L += pad_l + lead_l + wet_l
R += pad_r + lead_r + wet_r

# ---- the deliberate faults ----------------------------------------------------
# A low-mid bump around 300 Hz, broad. Mastering EQ is for exactly this.
BUMP_HZ, BUMP_DB = 300, 8.0
L = peaking(L, BUMP_HZ, BUMP_DB, 0.7)
R = peaking(R, BUMP_HZ, BUMP_DB, 0.7)


# ---- BS.1770 loudness, so "about -22 LUFS" is measured -----------------------------
def k_weight(x):
    # pre-filter: high shelf; then the RLB high-pass (BS.1770-4, bilinear at FS)
    def shelf(f0, G, Q):
        Kk = np.tan(np.pi * f0 / FS)
        Vh = 10 ** (G / 20)
        Vb = Vh ** 0.4996667741545416
        a0 = 1 + Kk / Q + Kk * Kk
        return ([(Vh + Vb * Kk / Q + Kk * Kk) / a0, 2 * (Kk * Kk - Vh) / a0, (Vh - Vb * Kk / Q + Kk * Kk) / a0],
                [1, 2 * (Kk * Kk - 1) / a0, (1 - Kk / Q + Kk * Kk) / a0])

    b, a = shelf(1681.974450955533, 3.999843853973347, 0.7071752369554196)
    x = signal.lfilter(b, a, x)
    Kk = np.tan(np.pi * 38.13547087602444 / FS)
    Q = 0.5003270373238773
    a0 = 1 + Kk / Q + Kk * Kk
    return signal.lfilter([1, -2, 1], [1, 2 * (Kk * Kk - 1) / a0, (1 - Kk / Q + Kk * Kk) / a0], x)


def lufs(l, r):
    zl, zr = k_weight(l), k_weight(r)
    blk, hop = int(0.4 * FS), int(0.1 * FS)
    ms = []
    for i in range(0, len(zl) - blk + 1, hop):
        ms.append(np.mean(zl[i:i + blk] ** 2) + np.mean(zr[i:i + blk] ** 2))
    ms = np.array(ms)
    loud = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    keep = ms[loud > -70]
    rel = -0.691 + 10 * np.log10(keep.mean()) - 10
    keep = ms[loud > rel]
    return -0.691 + 10 * np.log10(keep.mean())


TARGET = -22.0
now = lufs(L, R)
g = 10 ** ((TARGET - now) / 20)
L, R = L * g, R * g
final = lufs(L, R)
peak = max(np.abs(L).max(), np.abs(R).max())
assert peak < 0.9, f"peak {peak:.2f} — too hot for a quiet mix"


def write(path):
    pcm = np.empty(2 * N, dtype="<i2")
    pcm[0::2] = np.round(np.clip(L, -1, 1) * 32767)
    pcm[1::2] = np.round(np.clip(R, -1, 1) * 32767)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(FS)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "demo-song.wav"
    write(out)
    corr = float(np.corrcoef(L, R)[0, 1])
    print(f"{out}: {SECONDS:.1f} s, {final:.1f} LUFS (own meter), peak {20 * np.log10(peak):.1f} dBFS, L/R correlation {corr:.2f}")
