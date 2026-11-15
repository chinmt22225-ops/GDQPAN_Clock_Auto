package vn.gdqpan.app;

import android.app.*;
import android.content.*;
import android.os.*;
import java.util.HashSet;

/** Local device policy; no shared account data or OS force-stop. */
final class RuntimePolicy {
    private static final HashSet<Activity> resumed=new HashSet<>();
    private static boolean installed=false;
    private static final Handler handler=new Handler(Looper.getMainLooper());
    static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("gdqpan-runtime",Context.MODE_PRIVATE);}
    static boolean authenticated(Context c){return prefs(c).getBoolean("authenticated",false);}
    static boolean foreground(Context c){return !resumed.isEmpty()&&((PowerManager)c.getSystemService(Context.POWER_SERVICE)).isInteractive()&&!((KeyguardManager)c.getSystemService(Context.KEYGUARD_SERVICE)).isKeyguardLocked();}
    static boolean allowed(Context c){return authenticated(c)&&(prefs(c).getBoolean("background",true)||foreground(c));}
    static boolean alarmAllowed(Context c) {
        return GdqAccountPlugin.hasSavedSession(c) && (prefs(c).getBoolean("background", true) || foreground(c));
    }
    static synchronized void configure(Context c,boolean auth,boolean background){
        prefs(c).edit().putBoolean("authenticated",auth).putBoolean("background",background).commit();
        if(!allowed(c))suspend(c);
    }
    static synchronized void suspend(Context c){
        if(!alarmAllowed(c)){
            AlarmStore.cancelAll(c);
            c.stopService(new Intent(c,AlarmPlaybackService.class));
        }
        VtvActivity.control("close");
        MainActivity a=MainActivity.current();
        if(a!=null&&a.getBridge()!=null){
            com.getcapacitor.PluginHandle tts=a.getBridge().getPlugin("TextToSpeech");
            if(tts!=null&&tts.getInstance() instanceof com.getcapacitor.community.tts.TextToSpeechPlugin){
                // A native lifecycle stop must work even when WebView JavaScript is paused.
                com.getcapacitor.PluginCall silent=new com.getcapacitor.PluginCall(null,"TextToSpeech","-1","stop",new com.getcapacitor.JSObject()){
                    @Override public void resolve(){}
                    @Override public void reject(String message,String code,Exception error,com.getcapacitor.JSObject data){}
                };
                ((com.getcapacitor.community.tts.TextToSpeechPlugin)tts.getInstance()).stop(silent);
            }
            a.runOnUiThread(()->a.getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
        }
        if(a!=null&&a.getBridge()!=null)a.runOnUiThread(()->a.getBridge().getWebView().evaluateJavascript("window.GdqRuntime?.suspend()",null));
    }
    static void install(Application app){
        if(installed)return;installed=true;
        app.registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks(){
            private void changed(){handler.post(()->{if(!allowed(app))suspend(app);if(alarmAllowed(app))AlarmStore.armAll(app);MainActivity a=MainActivity.current();if(a!=null&&a.getBridge()!=null)a.getBridge().getWebView().evaluateJavascript("document.dispatchEvent(new CustomEvent('gdqpan-native-foreground',{detail:"+foreground(app)+"}))",null);});}
            public void onActivityResumed(Activity a){resumed.add(a);changed();}
            public void onActivityPaused(Activity a){resumed.remove(a);changed();}
            public void onActivityDestroyed(Activity a){resumed.remove(a);changed();}
            public void onActivityCreated(Activity a,Bundle b){}public void onActivityStarted(Activity a){}public void onActivityStopped(Activity a){}public void onActivitySaveInstanceState(Activity a,Bundle b){}
        });
    }
}
