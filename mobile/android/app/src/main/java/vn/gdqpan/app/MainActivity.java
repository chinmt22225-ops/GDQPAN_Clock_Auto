package vn.gdqpan.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends BridgeActivity {
    private static java.lang.ref.WeakReference<MainActivity> instance=new java.lang.ref.WeakReference<>(null);
    static MainActivity current(){return instance.get();}
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if(hasFocus) getWindow().getDecorView().post(() -> {
            androidx.core.view.WindowInsetsControllerCompat bars =
                androidx.core.view.WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView());
            getWindow().getDecorView().setBackgroundColor(android.graphics.Color.rgb(7,54,43));
            bars.setAppearanceLightStatusBars(false);
            bars.setAppearanceLightNavigationBars(false);
        });
    }
    @Override public void onCreate(Bundle savedInstanceState) {
        instance=new java.lang.ref.WeakReference<>(this);RuntimePolicy.install(getApplication());
        registerPlugin(GdqAlarmPlugin.class);
        registerPlugin(GdqSpeechPlugin.class);
        registerPlugin(GdqAccountPlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
            @Override public void handleOnBackPressed(){
                getBridge().getWebView().evaluateJavascript("(function(){var dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return true;}if(window.GdqMobile&&(window.GdqMobile.getPage()!=='home'||document.querySelector('#modal-overlay.active'))){window.GdqMobile.back();return true;}return false;})()",result->{
                    if(!"true".equals(result)){setEnabled(false);getOnBackPressedDispatcher().onBackPressed();setEnabled(true);}
                });
            }
        });
    }
}
