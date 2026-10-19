package net.musicconnectz.app;

import android.app.AlertDialog;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebStorage;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.WebViewListener;
import java.util.ArrayList;
import java.util.List;

// Copied over Capacitor's generated MainActivity by the APK workflow.
//
// The APK loads the live site, and when that page never draws, the member is
// left on the shell's own background with no error and no way out. The
// page's own watchdog (index.html) cannot help when the page is what failed,
// so this one is native: it records what the WebView did, asks the page what
// it rendered, and offers a reload or a reset of the app's stored web data.
//
// The report shows only when the page fails to draw (nothing rendered by the
// check). It was shown on every launch while the blank-APK cause was hunted.
public class MainActivity extends BridgeActivity {
    private static final boolean ALWAYS_REPORT = false;
    private static final long FIRST_CHECK_MS = 12_000;
    private static final long ANSWER_MS = 4_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<String> events = new ArrayList<>();
    private boolean answered;
    private AlertDialog dialog;

    private void note(String s) {
        synchronized (events) {
            events.add(s.length() > 160 ? s.substring(0, 160) + "…" : s);
            if (events.size() > 14) events.remove(0);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() == null) return;
        getBridge().addWebViewListener(new WebViewListener() {
            @Override public void onPageStarted(WebView v) { note("start " + v.getUrl()); }
            @Override public void onPageLoaded(WebView v) { note("loaded " + v.getUrl()); }
            @Override public void onReceivedError(WebView v) { note("NET ERROR on " + v.getUrl()); }
            @Override public void onReceivedHttpError(WebView v) { note("HTTP ERROR on " + v.getUrl()); }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                note("RENDERER GONE crashed=" + (d != null && d.didCrash()));
                return false;
            }
        });
        WebView wv = webView();
        if (wv != null) {
            wv.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override public boolean onConsoleMessage(ConsoleMessage m) {
                    if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR
                        || m.messageLevel() == ConsoleMessage.MessageLevel.WARNING) {
                        note("console " + m.messageLevel() + ": " + m.message()
                            + " @" + m.sourceId() + ":" + m.lineNumber());
                    }
                    return super.onConsoleMessage(m);
                }
            });
        }
        arm();
    }

    private void arm() {
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::check, FIRST_CHECK_MS);
    }

    private WebView webView() {
        return getBridge() == null ? null : getBridge().getWebView();
    }

    private String nativeFacts(WebView wv) {
        String pkg = "?";
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && WebView.getCurrentWebViewPackage() != null) {
                pkg = WebView.getCurrentWebViewPackage().packageName + " " + WebView.getCurrentWebViewPackage().versionName;
            }
        } catch (Exception ignored) { }
        return "Android " + Build.VERSION.RELEASE + " (SDK " + Build.VERSION.SDK_INT + "), " + Build.MODEL
            + "\nWebView " + pkg
            + "\nview " + wv.getWidth() + "x" + wv.getHeight() + " visible=" + (wv.getVisibility() == 0)
            + " alpha=" + wv.getAlpha() + " shown=" + wv.isShown()
            + "\nurl " + wv.getUrl() + " progress " + wv.getProgress() + "%";
    }

    private void check() {
        WebView wv = webView();
        if (wv == null || isFinishing()) return;
        answered = false;
        String probe = "(function(){var r=document.getElementById('root');"
            + "var b=document.body;var cs=b?getComputedStyle(b):null;"
            + "return [document.readyState, r ? r.childElementCount : -1,"
            + " b ? b.innerHTML.length : -1, navigator.onLine,"
            + " cs ? cs.backgroundImage.slice(0,30) : '-', (r && r.innerText||'').slice(0,60).replace(/\\s+/g,' '),"
            + " location.href].join(' | ');})()";
        wv.evaluateJavascript(probe, value -> {
            answered = true;
            String v = value == null ? "" : value.replaceAll("^\"|\"$", "");
            String[] f = v.split(" \\| ");
            int root = -1;
            try { root = Integer.parseInt(f.length > 1 ? f[1].trim() : "-1"); } catch (NumberFormatException ignored) { }
            if (root > 0 && !ALWAYS_REPORT) return;
            report(root > 0 ? "The page rendered (report shown for diagnosis)." : "The app's page loaded, but nothing appeared on it.",
                "page: state | root children | body length | online | body background | text | url\n" + v);
        });
        handler.postDelayed(() -> {
            if (!answered) report("The app's page is frozen and isn't responding.", "page: no answer");
        }, ANSWER_MS);
    }

    private void report(String what, String page) {
        WebView wv = webView();
        if (wv == null || isFinishing() || (dialog != null && dialog.isShowing())) return;
        StringBuilder ev = new StringBuilder();
        synchronized (events) { for (String e : events) ev.append("• ").append(e).append('\n'); }
        dialog = new AlertDialog.Builder(this)
            .setTitle("Music ConnectZ diagnostics")
            .setMessage(what + "\n\nScreenshot this for support. Reset clears the app's saved data and signs you"
                + " out of the app (your account is untouched).\n\n" + page + "\n\n" + nativeFacts(wv)
                + "\n\nevents:\n" + (ev.length() == 0 ? "(none)\n" : ev))
            .setCancelable(true)
            .setPositiveButton("Reload", (d, w) -> reload(false))
            .setNegativeButton("Reset & reload", (d, w) -> reload(true))
            .setNeutralButton("Close", null)
            .show();
    }

    private void reload(boolean reset) {
        WebView wv = webView();
        if (wv == null) return;
        if (reset) {
            WebStorage.getInstance().deleteAllData();
            wv.clearCache(true);
        }
        note(reset ? "reset + reload" : "reload");
        wv.loadUrl(getBridge().getAppUrl());
        arm();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
