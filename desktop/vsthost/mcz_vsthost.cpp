// mcz-vsthost — the Music ConnectZ desktop app's VST3 host.
//
// A small native program the Electron shell starts and talks to over stdin/stdout, one command per
// line, one JSON answer per line. It exists because a web page cannot load a native plugin; the
// DAWs run in the page and hand audio here to go through a member's own installed VST3 plugins.
//
//   scan                                             -> {"ok":true,"plugins":[{path,uid,name,vendor,sub}]}
//   params <path> <uid> [stateIn]                    -> {"ok":true,"params":[{id,title,units,value,steps}]}
//   render <path> <uid> <in.wav> <out.wav> [stateIn|-] [stateOut|-] [id=value,id=value…]
//                                                    -> {"ok":true,"frames":N,"tail":T}
//   editor <path> <uid> [stateIn|-] <stateOut>       -> opens the plugin's own window (Windows), saves
//                                                       its settings to stateOut when it is closed
//   quit
//
// Fields are TAB-separated so paths may hold spaces. Effects only for now (an instrument needs MIDI
// in, a later step). Built on Steinberg's VST3 SDK (MIT licence; notice shipped with the app).
#include "public.sdk/source/vst/hosting/hostclasses.h"
#include "public.sdk/source/vst/hosting/module.h"
#include "public.sdk/source/vst/hosting/parameterchanges.h"
#include "public.sdk/source/vst/hosting/plugprovider.h"
#include "public.sdk/source/vst/hosting/processdata.h"
#include "public.sdk/source/vst/utility/memoryibstream.h"
#include "pluginterfaces/vst/ivstaudioprocessor.h"
#include "pluginterfaces/vst/ivstprocesscontext.h"
#include "pluginterfaces/vst/ivsteditcontroller.h"
#include "pluginterfaces/vst/ivstcomponent.h"
#include "pluginterfaces/gui/iplugview.h"

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#endif

using namespace Steinberg;
using namespace Steinberg::Vst;

// ---- tiny JSON writing ---------------------------------------------------------------------------
static std::string esc(const std::string& s) {
  std::string o;
  for (unsigned char c : s) {
    if (c == '"' || c == '\\') { o += '\\'; o += (char)c; }
    else if (c == '\n') o += "\\n";
    else if (c < 0x20) { char b[8]; std::snprintf(b, sizeof b, "\\u%04x", c); o += b; }
    else o += (char)c;
  }
  return o;
}
static void reply(const std::string& json) { std::cout << json << "\n" << std::flush; }
static void fail(const std::string& why) { reply("{\"ok\":false,\"error\":\"" + esc(why) + "\"}"); }

static std::string utf8(const String128 s) {
  std::string o;
  for (int i = 0; i < 128 && s[i]; i++) {
    char16 c = s[i];
    if (c < 0x80) o += (char)c;
    else if (c < 0x800) { o += (char)(0xC0 | (c >> 6)); o += (char)(0x80 | (c & 0x3F)); }
    else { o += (char)(0xE0 | (c >> 12)); o += (char)(0x80 | ((c >> 6) & 0x3F)); o += (char)(0x80 | (c & 0x3F)); }
  }
  return o;
}

// ---- WAV in and out: PCM 16/24/32 and float 32 in; float 32 out ------------------------------------
struct Audio { int rate = 48000; std::vector<std::vector<float>> ch; size_t frames() const { return ch.empty() ? 0 : ch[0].size(); } };

static bool readWav(const std::string& path, Audio& a, std::string& err) {
  std::ifstream f(path, std::ios::binary);
  if (!f) { err = "can't open " + path; return false; }
  std::vector<char> d((std::istreambuf_iterator<char>(f)), {});
  auto u32 = [&](size_t i) { return (uint32_t)(uint8_t)d[i] | ((uint32_t)(uint8_t)d[i + 1] << 8) | ((uint32_t)(uint8_t)d[i + 2] << 16) | ((uint32_t)(uint8_t)d[i + 3] << 24); };
  auto u16 = [&](size_t i) { return (uint16_t)((uint8_t)d[i] | ((uint8_t)d[i + 1] << 8)); };
  if (d.size() < 44 || std::memcmp(d.data(), "RIFF", 4) || std::memcmp(d.data() + 8, "WAVE", 4)) { err = "not a WAV file"; return false; }
  size_t p = 12; int fmt = 0, chans = 0, bits = 0;
  while (p + 8 <= d.size()) {
    uint32_t len = u32(p + 4);
    if (!std::memcmp(d.data() + p, "fmt ", 4)) {
      fmt = u16(p + 8); chans = u16(p + 10); a.rate = (int)u32(p + 12); bits = u16(p + 22);
      if (fmt == 0xFFFE && len >= 26) fmt = u16(p + 32);   // WAVE_FORMAT_EXTENSIBLE: the sub-format
    } else if (!std::memcmp(d.data() + p, "data", 4)) {
      if (!chans || !bits) { err = "WAV has no format"; return false; }
      size_t bps = bits / 8, n = std::min<size_t>(len, d.size() - p - 8) / (bps * chans);
      a.ch.assign(chans, std::vector<float>(n));
      const char* q = d.data() + p + 8;
      for (size_t i = 0; i < n; i++) for (int c = 0; c < chans; c++, q += bps) {
        float v;
        if (fmt == 3 && bits == 32) { std::memcpy(&v, q, 4); }
        else if (bits == 16) v = (int16_t)((uint8_t)q[0] | ((uint8_t)q[1] << 8)) / 32768.f;
        else if (bits == 24) { int32_t s = ((uint8_t)q[0] | ((uint8_t)q[1] << 8) | ((int8_t)q[2] << 16)); v = s / 8388608.f; }
        else if (bits == 32) { int32_t s; std::memcpy(&s, q, 4); v = s / 2147483648.f; }
        else { err = "unsupported WAV sample size"; return false; }
        a.ch[c][i] = v;
      }
      return true;
    }
    p += 8 + len + (len & 1);
  }
  err = "WAV has no data"; return false;
}

static bool writeWav(const std::string& path, const Audio& a) {
  std::ofstream f(path, std::ios::binary);
  if (!f) return false;
  uint32_t chans = (uint32_t)a.ch.size(), n = (uint32_t)a.frames(), data = n * chans * 4;
  auto w32 = [&](uint32_t v) { f.write((const char*)&v, 4); };
  auto w16 = [&](uint16_t v) { f.write((const char*)&v, 2); };
  f.write("RIFF", 4); w32(36 + data); f.write("WAVE", 4);
  f.write("fmt ", 4); w32(16); w16(3); w16((uint16_t)chans); w32((uint32_t)a.rate); w32((uint32_t)a.rate * chans * 4); w16((uint16_t)(chans * 4)); w16(32);
  f.write("data", 4); w32(data);
  for (uint32_t i = 0; i < n; i++) for (uint32_t c = 0; c < chans; c++) f.write((const char*)&a.ch[c][i], 4);
  return (bool)f;
}

static std::vector<char> readFile(const std::string& p) { std::ifstream f(p, std::ios::binary); return std::vector<char>((std::istreambuf_iterator<char>(f)), {}); }
static void writeFile(const std::string& p, const void* d, size_t n) { std::ofstream f(p, std::ios::binary); f.write((const char*)d, (std::streamsize)n); }

// ---- loading a plugin -----------------------------------------------------------------------------
struct Loaded {
  VST3::Hosting::Module::Ptr module;
  std::unique_ptr<PlugProvider> provider;
  IPtr<IComponent> component;
  IPtr<IEditController> controller;
  FUnknownPtr<IAudioProcessor> processor;
};

static HostApplication gHost;

static bool load(const std::string& path, const std::string& uid, Loaded& L, std::string& err) {
  L.module = VST3::Hosting::Module::create(path, err);
  if (!L.module) { if (err.empty()) err = "couldn't load " + path; return false; }
  auto factory = L.module->getFactory();
  for (auto& info : factory.classInfos()) {
    if (info.category() != kVstAudioEffectClass) continue;
    if (!uid.empty() && info.ID().toString() != uid) continue;
    PluginContextFactory::instance().setPluginContext(&gHost);
    L.provider = std::make_unique<PlugProvider>(factory, info, true);
    if (!L.provider->initialize()) { err = "the plugin wouldn't start"; return false; }
    L.component = L.provider->getComponentPtr();
    L.controller = L.provider->getControllerPtr();
    L.processor = FUnknownPtr<IAudioProcessor>(L.component);
    if (!L.processor) { err = "that plugin doesn't process audio"; return false; }
    return true;
  }
  err = "no audio plugin with that id in " + path;
  return false;
}

static void loadState(Loaded& L, const std::string& file) {
  if (file.empty() || file == "-") return;
  auto bytes = readFile(file);
  if (bytes.empty()) return;
  // Our state file: 4-byte length of the component state, the component state, then the controller's.
  uint32_t n = 0;
  if (bytes.size() < 4) return;
  std::memcpy(&n, bytes.data(), 4);
  if (4 + n > bytes.size()) return;
  ResizableMemoryIBStream comp, ctrl;
  int32 w = 0;
  comp.write(bytes.data() + 4, (int32)n, &w); comp.seek(0, IBStream::kIBSeekSet, nullptr);
  L.component->setState(&comp);
  comp.seek(0, IBStream::kIBSeekSet, nullptr);
  if (L.controller) {
    L.controller->setComponentState(&comp);
    if (bytes.size() > 4 + n) {
      ctrl.write(bytes.data() + 4 + n, (int32)(bytes.size() - 4 - n), &w); ctrl.seek(0, IBStream::kIBSeekSet, nullptr);
      L.controller->setState(&ctrl);
    }
  }
}

static void saveState(Loaded& L, const std::string& file) {
  if (file.empty() || file == "-") return;
  ResizableMemoryIBStream comp, ctrl;
  L.component->getState(&comp);
  if (L.controller) L.controller->getState(&ctrl);
  uint32_t n = (uint32_t)comp.getCursor();
  std::vector<char> out(4 + n + ctrl.getCursor());
  std::memcpy(out.data(), &n, 4);
  std::memcpy(out.data() + 4, comp.getData(), n);
  if (ctrl.getCursor()) std::memcpy(out.data() + 4 + n, ctrl.getData(), ctrl.getCursor());
  writeFile(file, out.data(), out.size());
}

// ---- commands ---------------------------------------------------------------------------------------
static void cmdScan() {
  std::ostringstream o;
  o << "{\"ok\":true,\"plugins\":[";
  bool first = true;
  for (auto& path : VST3::Hosting::Module::getModulePaths()) {
    std::string err;
    auto m = VST3::Hosting::Module::create(path, err);
    if (!m) continue;
    for (auto& info : m->getFactory().classInfos()) {
      if (info.category() != kVstAudioEffectClass) continue;
      o << (first ? "" : ",") << "{\"path\":\"" << esc(path) << "\",\"uid\":\"" << info.ID().toString()
        << "\",\"name\":\"" << esc(info.name()) << "\",\"vendor\":\"" << esc(info.vendor())
        << "\",\"sub\":\"" << esc(info.subCategoriesString()) << "\"}";
      first = false;
    }
  }
  o << "]}";
  reply(o.str());
}

static void cmdParams(const std::vector<std::string>& a) {
  if (a.size() < 3) return fail("params needs a path and an id");
  Loaded L; std::string err;
  if (!load(a[1], a[2], L, err)) return fail(err);
  loadState(L, a.size() > 3 ? a[3] : "");
  if (!L.controller) return reply("{\"ok\":true,\"params\":[]}");
  std::ostringstream o;
  o << "{\"ok\":true,\"params\":[";
  int32 n = L.controller->getParameterCount();
  bool first = true;
  for (int32 i = 0; i < n; i++) {
    ParameterInfo p{};
    if (L.controller->getParameterInfo(i, p) != kResultOk) continue;
    if (p.flags & (ParameterInfo::kIsReadOnly | ParameterInfo::kIsHidden)) continue;
    o << (first ? "" : ",") << "{\"id\":" << p.id << ",\"title\":\"" << esc(utf8(p.title)) << "\",\"units\":\"" << esc(utf8(p.units))
      << "\",\"value\":" << L.controller->getParamNormalized(p.id) << ",\"steps\":" << p.stepCount << "}";
    first = false;
  }
  o << "]}";
  reply(o.str());
}

static void cmdRender(const std::vector<std::string>& a) {
  if (a.size() < 5) return fail("render needs a path, an id, an input and an output");
  Audio in; std::string err;
  if (!readWav(a[3], in, err)) return fail(err);
  Loaded L;
  if (!load(a[1], a[2], L, err)) return fail(err);
  loadState(L, a.size() > 5 ? a[5] : "");

  // Parameter values to set before rendering: "id=normalized,id=normalized".
  std::map<ParamID, ParamValue> set;
  if (a.size() > 7) {
    std::stringstream ss(a[7]); std::string kv;
    while (std::getline(ss, kv, ',')) { auto e = kv.find('='); if (e != std::string::npos) set[(ParamID)std::stoul(kv.substr(0, e))] = std::stod(kv.substr(e + 1)); }
  }
  for (auto& [id, v] : set) if (L.controller) L.controller->setParamNormalized(id, v);
  // A host tells the processor every parameter's current value when processing starts — the
  // controller's view (defaults, the saved state, and what was just set). Without it a processor that
  // starts its values at 0 (Steinberg's own AGain does) renders silence.
  std::map<ParamID, ParamValue> start;
  if (L.controller) {
    int32 count = L.controller->getParameterCount();
    for (int32 i = 0; i < count; i++) {
      ParameterInfo p{};
      if (L.controller->getParameterInfo(i, p) != kResultOk || (p.flags & ParameterInfo::kIsReadOnly)) continue;
      start[p.id] = L.controller->getParamNormalized(p.id);
    }
  }
  for (auto& [id, v] : set) start[id] = v;

  const int32 block = 512;
  // Stereo in, stereo out: the shape nearly every effect accepts. A mono take is fed to both sides.
  SpeakerArrangement st = SpeakerArr::kStereo;
  L.processor->setBusArrangements(&st, 1, &st, 1);
  ProcessSetup setup{kOffline, kSample32, block, (SampleRate)in.rate};
  if (L.processor->setupProcessing(setup) != kResultOk) return fail("the plugin refused the sample rate or block size");
  L.component->activateBus(kAudio, kInput, 0, true);
  L.component->activateBus(kAudio, kOutput, 0, true);
  L.component->setActive(true);
  L.processor->setProcessing(true);

  HostProcessData pd;
  if (!pd.prepare(*L.component, block, kSample32)) return fail("couldn't make the plugin's buffers");
  pd.processMode = kOffline;
  ParameterChanges changes, outChanges;
  pd.inputParameterChanges = &changes;
  pd.outputParameterChanges = &outChanges;
  ProcessContext ctx{}; ctx.sampleRate = in.rate; ctx.tempo = 120; ctx.state = ProcessContext::kPlaying | ProcessContext::kTempoValid;
  pd.processContext = &ctx;

  // A tail so a delay's or reverb's echo is not cut off: two seconds, trimmed of silence afterwards.
  const size_t tail = (size_t)in.rate * 2, total = in.frames() + tail;
  Audio out; out.rate = in.rate; out.ch.assign(2, std::vector<float>(total));
  auto src = [&](int c, size_t i) -> float { if (i >= in.frames()) return 0.f; return in.ch[std::min<size_t>(c, in.ch.size() - 1)][i]; };
  bool first = true;
  for (size_t pos = 0; pos < total; pos += block) {
    int32 n = (int32)std::min<size_t>(block, total - pos);
    pd.numSamples = n;
    changes.clearQueue();
    if (first) { for (auto& [id, v] : start) { int32 qi = 0, pi = 0; if (auto* q = changes.addParameterData(id, qi)) q->addPoint(0, v, pi); } first = false; }
    for (int c = 0; c < 2 && pd.numInputs > 0 && pd.inputs[0].numChannels > c; c++)
      for (int32 i = 0; i < n; i++) pd.inputs[0].channelBuffers32[c][i] = src(c, pos + i);
    ctx.projectTimeSamples = (int64)pos;
    if (L.processor->process(pd) != kResultOk) { pd.unprepare(); return fail("the plugin stopped while rendering"); }
    for (int c = 0; c < 2 && pd.numOutputs > 0 && pd.outputs[0].numChannels > c; c++)
      for (int32 i = 0; i < n; i++) out.ch[c][pos + i] = pd.outputs[0].channelBuffers32[c][i];
  }
  L.processor->setProcessing(false);
  L.component->setActive(false);
  pd.unprepare();

  size_t end = total;
  while (end > in.frames() && std::fabs(out.ch[0][end - 1]) < 1e-5f && std::fabs(out.ch[1][end - 1]) < 1e-5f) end--;
  for (auto& c : out.ch) c.resize(end);
  if (!writeWav(a[4], out)) return fail("couldn't write " + a[4]);
  saveState(L, a.size() > 6 ? a[6] : "");
  reply("{\"ok\":true,\"frames\":" + std::to_string(end) + ",\"tail\":" + std::to_string(end - in.frames()) + "}");
}

#ifdef _WIN32
// The plugin's own window: a plain Win32 window the plugin's view attaches to. Settings are saved when
// it is closed.
static LRESULT CALLBACK wndProc(HWND h, UINT m, WPARAM w, LPARAM l) {
  if (m == WM_CLOSE) { DestroyWindow(h); return 0; }
  if (m == WM_DESTROY) { PostQuitMessage(0); return 0; }
  return DefWindowProcW(h, m, w, l);
}
static void cmdEditor(const std::vector<std::string>& a) {
  if (a.size() < 5) return fail("editor needs a path, an id, a state in and a state out");
  Loaded L; std::string err;
  if (!load(a[1], a[2], L, err)) return fail(err);
  loadState(L, a[3]);
  if (!L.controller) return fail("that plugin has no settings window");
  IPtr<IPlugView> view = owned(L.controller->createView(ViewType::kEditor));
  if (!view || view->isPlatformTypeSupported(kPlatformTypeHWND) != kResultTrue) return fail("that plugin has no window of its own — use its settings list instead");
  ViewRect r{}; view->getSize(&r);
  WNDCLASSW wc{}; wc.lpfnWndProc = wndProc; wc.hInstance = GetModuleHandleW(nullptr); wc.lpszClassName = L"MCZVstEditor"; RegisterClassW(&wc);
  RECT wr{0, 0, r.getWidth(), r.getHeight()}; AdjustWindowRect(&wr, WS_OVERLAPPEDWINDOW, FALSE);
  HWND hwnd = CreateWindowW(L"MCZVstEditor", L"Music ConnectZ — plugin", WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME & ~WS_MAXIMIZEBOX,
                            CW_USEDEFAULT, CW_USEDEFAULT, wr.right - wr.left, wr.bottom - wr.top, nullptr, nullptr, wc.hInstance, nullptr);
  view->attached(hwnd, kPlatformTypeHWND);
  ShowWindow(hwnd, SW_SHOW);
  SetForegroundWindow(hwnd);
  MSG msg;
  while (GetMessageW(&msg, nullptr, 0, 0) > 0) { TranslateMessage(&msg); DispatchMessageW(&msg); }
  view->removed();
  saveState(L, a[4]);
  reply("{\"ok\":true}");
}
#else
static void cmdEditor(const std::vector<std::string>&) { fail("a plugin's own window opens in the Windows app"); }
#endif

int main() {
  std::ios::sync_with_stdio(false);
  reply("{\"ok\":true,\"ready\":\"mcz-vsthost 1\"}");
  std::string line;
  while (std::getline(std::cin, line)) {
    if (!line.empty() && line.back() == '\r') line.pop_back();
    std::vector<std::string> a; std::stringstream ss(line); std::string f;
    while (std::getline(ss, f, '\t')) a.push_back(f);
    if (a.empty()) continue;
    try {
      if (a[0] == "scan") cmdScan();
      else if (a[0] == "params") cmdParams(a);
      else if (a[0] == "render") cmdRender(a);
      else if (a[0] == "editor") cmdEditor(a);
      else if (a[0] == "quit") break;
      else fail("unknown command: " + a[0]);
    } catch (const std::exception& e) { fail(e.what()); }
    catch (...) { fail("the plugin crashed the request"); }
  }
  return 0;
}
