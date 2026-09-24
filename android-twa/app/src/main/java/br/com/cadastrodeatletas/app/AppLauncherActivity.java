package br.com.cadastrodeatletas.app;

import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.browser.customtabs.CustomTabsIntent;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class AppLauncherActivity extends LauncherActivity {
    private static final String TAG = "CadastroAtletas";
    private static final Uri START_URI =
            Uri.parse("https://cadastrodeatletas.com.br/?app=1&build=77");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable error) {
            Log.e(TAG, "TWA launch failed; opening safe Custom Tab fallback.", error);
            openSafeFallback();
        }
    }

    private void openSafeFallback() {
        try {
            CustomTabsIntent intent = new CustomTabsIntent.Builder()
                    .setShowTitle(false)
                    .build();
            intent.launchUrl(this, START_URI);
        } catch (Throwable fallbackError) {
            Log.e(TAG, "Custom Tab fallback failed.", fallbackError);
        } finally {
            finish();
        }
    }
}
