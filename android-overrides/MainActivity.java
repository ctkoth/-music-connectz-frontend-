package net.musicconnectz.app;

import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebStorage;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

// Copied over Capacitor's generated MainActivity by the APK workflow.
//
// The APK loads the live site, and when that page never draws, the member is
// left on the shell's own background with no address bar, no error and no way
// out. The page's own watchdog (index.html) cannot help when the page itself
// is what failed, so this one lives on the native side: it asks the WebView
// what state it is in, and if nothing has rendered, says what it found and
// offers a reload, or a reset that clears the app's stored web data.
public class MainActivity extends BridgeActivity {
    private static final long FIRST_CHECK_MS = 12_000;
    private static final long ANSWER_MS = 4_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean answered;
    private AlertDialog dialog;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        arm();
    }

    private void arm() {
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::check, FIRST_CHECK_MS);
    }

    private WebView webView() {
        return getBridge() == null ? null : getBridge().getWebView();
    }

    private void check() {
        WebView wv = webView();
        if (wv == null || isFinishing()) return;
        answered = false;
        String probe = "(function(){var r=document.getElementById('root');"
            + "return [document.readyState, r ? r.childElementCount : -1,"
            + " document.body ? document.body.innerHTML.length : -1,"
            + " navigator.onLine, location.href].join('|');})()";
        wv.evaluateJavascript(probe, value -> {
            answered = true;
            String v = value == null ? "" : value.replaceAll("^\"|\"$", "");
            String[] f = v.split("\\|", 5);
            int root = -1;
            try { root = Integer.parseInt(f.length > 1 ? f[1] : "-1"); } catch (NumberFormatException ignored) { }
            if (root > 0) return;
            showStuck("The app's page loaded, but nothing appeared on it.", v);
        });
        handler.postDelayed(() -> {
            if (!answered) showStuck("The app's page is frozen and isn't responding.", "no answer from the page");
        }, ANSWER_MS);
    }

    private void showStuck(String what, String detail) {
        if (isFinishing() || (dialog != null && dialog.isShowing())) return;
        dialog = new AlertDialog.Builder(this)
            .setTitle("Music ConnectZ didn't load")
            .setMessage(what + "\n\nReset clears the app's saved data and signs you out of the app"
                + " (your account is untouched).\n\nDetails: " + detail)
            .setCancelable(true)
            .setPositiveButton("Reload", (d, w) -> reload(false))
            .setNegativeButton("Reset & reload", (d, w) -> reload(true))
            .setNeutralButton("Wait", (d, w) -> arm())
            .show();
    }

    private void reload(boolean reset) {
        WebView wv = webView();
        if (wv == null) return;
        if (reset) {
            WebStorage.getInstance().deleteAllData();
            wv.clearCache(true);
        }
        wv.loadUrl(getBridge().getAppUrl());
        arm();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
