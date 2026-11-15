package vn.gdqpan.app;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.graphics.Color;
import android.webkit.*;
import android.widget.*;
import java.lang.ref.WeakReference;

public class VtvActivity extends Activity {
    private static WeakReference<VtvActivity> instance=new WeakReference<>(null);
    private WebView web;
    private VideoView video;
    static boolean isOpen(){VtvActivity a=instance.get();return a!=null&&!a.isFinishing()&&!a.isDestroyed();}
    @Override public void onCreate(Bundle state){
        super.onCreate(state);instance=new WeakReference<>(this);
        String url=getIntent().getStringExtra("url");
        if(url==null||!"https".equals(Uri.parse(url).getScheme())){finish();return;}
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(7,54,43));root.setFitsSystemWindows(true);
        Button back=new Button(this);back.setText("‹ Quay lại GDQPAN");back.setAllCaps(false);back.setTextSize(16);back.setTextColor(Color.WHITE);back.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(7,54,43)));back.setOnClickListener(v->finish());root.addView(back,new LinearLayout.LayoutParams(-1,Math.round(56*getResources().getDisplayMetrics().density)));
        if(url.toLowerCase().contains(".m3u8")||url.toLowerCase().matches(".*\\.(mp4|m4v)(\\?.*)?$")){
            video=new VideoView(this);MediaController controls=new MediaController(this);controls.setAnchorView(video);video.setMediaController(controls);root.addView(video,new LinearLayout.LayoutParams(-1,0,1));video.setVideoURI(Uri.parse(url));video.setOnPreparedListener(mp->video.start());video.setOnErrorListener((mp,what,extra)->{Toast.makeText(this,"Không thể phát kênh này. Kiểm tra đường dẫn và kết nối mạng.",Toast.LENGTH_LONG).show();return true;});
        }else{
            web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setMediaPlaybackRequiresUserGesture(false);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
            web.setWebChromeClient(new WebChromeClient());web.setWebViewClient(new WebViewClient(){
                @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !"https".equals(request.getUrl().getScheme());}
            });root.addView(web,new LinearLayout.LayoutParams(-1,0,1));web.loadUrl(url);
        }
        setContentView(root);
    }
    static void control(String action){VtvActivity a=instance.get();if(a==null)return;a.runOnUiThread(()->{
        if("close".equals(action)){a.finish();return;}boolean resume="resume".equals(action);
        if(a.video!=null){if(resume)a.video.start();else a.video.pause();}
        if(a.web!=null)a.web.evaluateJavascript("document.querySelectorAll('video,audio').forEach(function(v){v."+(resume?"play()":"pause()")+";})",null);
    });}
    @Override protected void onDestroy(){instance=new WeakReference<>(null);if(video!=null)video.stopPlayback();if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
