package app.renew90.journal;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Switch from the splash screen theme to the real app theme before the window
        // is drawn. Without this, the activity retains AppTheme.NoActionBarLaunch
        // (parent: Theme.SplashScreen) which allows Samsung to render a native action
        // bar with the app name and icon over the WebView content.
        setTheme(R.style.AppTheme_NoActionBar);
        // Enable edge-to-edge display (required for targetSdk 35+).
        // Our web layer already handles safe-area-inset-* via CSS and viewport-fit=cover.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
