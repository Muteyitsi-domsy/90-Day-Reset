package app.renew90.journal;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Enable edge-to-edge display (required for targetSdk 35+).
        // Our web layer already handles safe-area-inset-* via CSS and viewport-fit=cover.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
