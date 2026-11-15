package vn.gdqpan.app;

import android.content.Context;
import android.os.Build;
import android.util.Base64;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.*;
import java.io.*;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

@CapacitorPlugin(name="GdqAccount")
public class GdqAccountPlugin extends Plugin {
    private static final String ALIAS="gdqpan-account-session";
    private static javax.crypto.SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(ALIAS)){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}
        return (javax.crypto.SecretKey)store.getKey(ALIAS,null);
    }
    private static void checkUrl(String value) throws Exception {
        URL u=new URL(value);
        if(u.getUserInfo()!=null||u.getQuery()!=null||u.getRef()!=null||!u.getPath().isEmpty())throw new IOException("Địa chỉ máy chủ không hợp lệ");
        boolean dev=BuildConfig.DEBUG&&u.getProtocol().equals("http")&&(u.getHost().equals("10.0.2.2")||u.getHost().equals("127.0.0.1")||u.getHost().equals("localhost"));
        if(!u.getProtocol().equals("https")&&!dev)throw new IOException("Máy chủ cần HTTPS");
    }
    static boolean hasSavedSession(Context c) {
        return !c.getSharedPreferences("gdqpan-account", Context.MODE_PRIVATE).getString("session", "").isEmpty();
    }
    static JSONObject session(Context c) throws Exception {
        String raw=c.getSharedPreferences("gdqpan-account",Context.MODE_PRIVATE).getString("session","");
        if(raw.isEmpty())throw new IOException("Chưa đăng nhập tài khoản");
        String[] p=raw.split(":");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p[0],Base64.NO_WRAP)));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(p[1],Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));
    }
    @PluginMethod public void restore(PluginCall call){
        try {
            if(!hasSavedSession(getContext())){
                call.resolve(new JSObject());return;
            }
            JSONObject saved=session(getContext());
            JSObject result=new JSObject();result.put("url",saved.getString("url"));result.put("token",saved.getString("token"));call.resolve(result);
        } catch(Exception e){call.reject("Không khôi phục được phiên đăng nhập",e);}
    }
    @PluginMethod public void configure(PluginCall call){
        try{
            String token=call.getString("token","");
            if(token.isEmpty()){getContext().getSharedPreferences("gdqpan-account",Context.MODE_PRIVATE).edit().clear().commit();RuntimePolicy.configure(getContext(),false,RuntimePolicy.prefs(getContext()).getBoolean("background",true));getContext().stopService(new android.content.Intent(getContext(),AlarmPlaybackService.class));AlarmStore.replace(getContext(),new org.json.JSONArray(),new JSONObject());call.resolve();return;}
            String url=call.getString("url","");checkUrl(url);
            JSONObject s=new JSONObject();s.put("url",url);s.put("token",token);s.put("revision",call.getInt("revision",0));
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());byte[] bytes=cipher.doFinal(s.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            getContext().getSharedPreferences("gdqpan-account",Context.MODE_PRIVATE).edit().putString("session",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(bytes,Base64.NO_WRAP)).commit();call.resolve();
        }catch(Exception e){call.reject("Không lưu được phiên đăng nhập",e);}
    }
    static boolean authorize(Context c,String id){
        HttpURLConnection conn=null;
        try{
            JSONObject s=session(c);String base=s.getString("url");checkUrl(base);
            conn=(HttpURLConnection)new URL(base+"/api/authorize").openConnection();conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(8000);conn.setReadTimeout(8000);conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");conn.setRequestProperty("Authorization","Bearer "+s.getString("token"));
            JSONObject b=new JSONObject();b.put("scheduleId",id);b.put("revision",s.getInt("revision"));
            try(OutputStream out=conn.getOutputStream()){out.write(b.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));}
            if(conn.getResponseCode()!=200)throw new IOException("Tài khoản/lịch không hợp lệ hoặc cần đồng bộ lại");return true;
        }catch(Exception e){AlarmStore.log(c,"Bỏ qua lịch phát",e.getMessage());return false;}
        finally{if(conn!=null)conn.disconnect();}
    }
    @PluginMethod public void upload(PluginCall call){
        getBridge().execute(()->{
            HttpURLConnection conn=null;
            try{
                String base=call.getString("url","");checkUrl(base);byte[] bytes=Base64.decode(call.getString("data",""),Base64.DEFAULT);if(bytes.length>100*1024*1024)throw new IOException("Tệp vượt 100 MB");
                conn=(HttpURLConnection)new URL(base+"/api/files").openConnection();conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(8000);conn.setReadTimeout(120000);conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setFixedLengthStreamingMode(bytes.length);conn.setRequestProperty("Authorization","Bearer "+call.getString("token",""));conn.setRequestProperty("Content-Type",call.getString("mime","audio/mpeg"));conn.setRequestProperty("X-File-Name",java.net.URLEncoder.encode(call.getString("name","audio"),"UTF-8"));
                try(OutputStream out=conn.getOutputStream()){out.write(bytes);}if(conn.getResponseCode()!=201)throw new IOException("Máy chủ từ chối tải âm thanh");
                String text;try(InputStream in=conn.getInputStream()){text=new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}JSObject result=new JSObject(text);result.put("name",call.getString("name","audio"));call.resolve(result);
            }catch(Exception e){call.reject("Không tải được âm thanh",e);}finally{if(conn!=null)conn.disconnect();}
        });
    }
    @PluginMethod public void check(PluginCall call){getBridge().execute(()->{JSObject result=new JSObject();result.put("allowed",authorize(getContext(),call.getString("scheduleId",null)));call.resolve(result);});}
}
