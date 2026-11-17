"""A real test of mcz-vsthost against a real VST3 plugin (Steinberg's AGain sample, built from the same
SDK in CI). Writes a 440 Hz tone, renders it through the plugin at its default gain and at 0.25, and
checks the levels — and that the saved settings come back. Exits non-zero on any failure, so a broken
host fails the Windows build instead of shipping. Run: python test_host.py <path to mcz-vsthost>"""
import json, math, os, struct, subprocess, sys, tempfile

exe = sys.argv[1]
d = tempfile.mkdtemp()
rate = 44100
src = os.path.join(d, "in.wav")
frames = [int(0.25 * 32767 * math.sin(2 * math.pi * 440 * i / rate)) for i in range(rate)]
data = b"".join(struct.pack("<hh", v, v) for v in frames)
with open(src, "wb") as f:
    f.write(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 2, rate, rate * 4, 4, 16) + b"data" + struct.pack("<I", len(data)) + data)

p = subprocess.Popen([exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
def ask(*f):
    p.stdin.write("\t".join(f) + "\n"); p.stdin.flush()
    return json.loads(p.stdout.readline())
assert json.loads(p.stdout.readline()).get("ready"), "host did not start"

def rms(path):
    b = open(path, "rb").read()
    n = (len(b) - 44) // 8
    s = struct.unpack("<%df" % (n * 2), b[44:44 + n * 8])[0::2]
    return (sum(x * x for x in s) / n) ** 0.5

plugs = ask("scan")["plugins"]
print("scanned", len(plugs), [x["name"] for x in plugs])
g = next(x for x in plugs if x["name"].startswith("AGain"))
want = 0.25 / math.sqrt(2)
r = ask("render", g["path"], g["uid"], src, os.path.join(d, "a.wav")); assert r["ok"], r
assert abs(rms(os.path.join(d, "a.wav")) - want) < 0.002, rms(os.path.join(d, "a.wav"))
r = ask("render", g["path"], g["uid"], src, os.path.join(d, "b.wav"), "-", os.path.join(d, "g.state"), "1=0.25"); assert r["ok"], r
assert abs(rms(os.path.join(d, "b.wav")) - want / 4) < 0.001, rms(os.path.join(d, "b.wav"))
pr = ask("params", g["path"], g["uid"], os.path.join(d, "g.state"))
assert any(x["title"] == "Gain" and abs(x["value"] - 0.25) < 1e-6 for x in pr["params"]), pr
assert not ask("render", g["path"], g["uid"], os.path.join(d, "nope.wav"), os.path.join(d, "o.wav"))["ok"]
p.stdin.write("quit\n"); p.stdin.flush(); p.wait(10)
print("mcz-vsthost: real VST3 render, gain and saved settings all check out")
