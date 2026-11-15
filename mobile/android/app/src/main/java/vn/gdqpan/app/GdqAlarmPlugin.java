package vn.gdqpan.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name="GdqAlarm", permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class GdqAlarmPlugin extends Plugin {
    @PluginMethod public void runtime(PluginCall call){
        RuntimePolicy.configure(getContext(),call.getBoolean("authenticated",false),call.getBoolean("backgroundEnabled",true));
        if(RuntimePolicy.alarmAllowed(getContext()))AlarmStore.armAll(getContext());
        JSObject state=new JSObject();state.put("foreground",RuntimePolicy.foreground(getContext()));call.resolve(state);
    }
    @PluginMethod public void sync(PluginCall call) {
        try {
            if(!RuntimePolicy.authenticated(getContext())){call.reject("Đăng nhập trước khi đồng bộ báo thức");return;}
            String token=call.getString("accountToken","");
            if(!token.equals(GdqAccountPlugin.session(getContext()).getString("token"))){call.reject("Phiên đồng bộ báo thức đã thay đổi");return;}
            JSArray schedules=call.getArray("schedules",new JSArray());
            JSObject settings=call.getObject("settings",new JSObject());
            int count=AlarmStore.replace(getContext(),schedules,settings);
            JSObject result=new JSObject();result.put("count",count);result.put("exact",AlarmStore.canSchedule(getContext()));result.put("fullScreen",canShowAlarm());result.put("notifications",notificationsEnabled());call.resolve(result);
        } catch(Exception e){call.reject("Không thể đồng bộ báo thức",e);}
    }
    @PluginMethod public void saveAudio(PluginCall call) {
        try {
            String id=call.getString("id","");
            File directory=new File(getContext().getFilesDir(),"schedule-audio");directory.mkdirs();
            String safe=java.util.UUID.nameUUIDFromBytes(id.getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            File file=new File(directory,safe+".audio");
            try(FileOutputStream stream=new FileOutputStream(file)){stream.write(Base64.decode(call.getString("data",""),Base64.DEFAULT));}
            JSObject result=new JSObject();result.put("path",file.getAbsolutePath());call.resolve(result);
        }catch(Exception e){call.reject("Không thể lưu âm thanh chạy nền",e);}
    }
    @PluginMethod public void stop(PluginCall call){getContext().stopService(new Intent(getContext(),AlarmPlaybackService.class));call.resolve();}
    @PluginMethod public void openVtv(PluginCall call){
        String url=call.getString("url","");Uri parsed=Uri.parse(url);
        if(!"https".equals(parsed.getScheme()) || parsed.getHost()==null){call.reject("Vui lòng dùng đường dẫn video HTTPS hợp lệ.");return;}
        getActivity().startActivity(new Intent(getActivity(),VtvActivity.class).putExtra("url",url));call.resolve();
    }
    @PluginMethod public void closeVtv(PluginCall call){VtvActivity.control("close");call.resolve();}
    @PluginMethod public void controlVtv(PluginCall call){VtvActivity.control(call.getString("action","pause"));call.resolve();}
    @PluginMethod public void status(PluginCall call){
        JSObject result=new JSObject();result.put("playing",AlarmPlaybackService.playing);result.put("title",AlarmPlaybackService.currentTitle);
        result.put("vtvOpen",VtvActivity.isOpen());
        result.put("exact",AlarmStore.canSchedule(getContext()));result.put("logs",AlarmStore.takeLogs(getContext()));call.resolve(result);
    }
    @PluginMethod public void saveDownload(PluginCall call){
        try{
            String name=call.getString("name","GDQPAN.json").replaceAll("[\\\\/:*?\"<>|]","_");
            String mime=call.getString("mime","application/octet-stream");
            if (Build.VERSION.SDK_INT < 29 && Boolean.TRUE.equals(call.getBoolean("chooseLocationOnLegacy", false))) {
                Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType(mime).putExtra(Intent.EXTRA_TITLE, name);
                startActivityForResult(call, create, "downloadDocumentResult");
                return;
            }
            byte[] data=Base64.decode(call.getString("data",""),Base64.DEFAULT);String location;
            if(Build.VERSION.SDK_INT>=29){
                android.content.ContentValues values=new android.content.ContentValues();values.put(android.provider.MediaStore.Downloads.DISPLAY_NAME,name);values.put(android.provider.MediaStore.Downloads.MIME_TYPE,mime);values.put(android.provider.MediaStore.Downloads.RELATIVE_PATH,android.os.Environment.DIRECTORY_DOWNLOADS);values.put(android.provider.MediaStore.Downloads.IS_PENDING,1);
                Uri uri=getContext().getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
                if(uri==null)throw new java.io.IOException("Không thể tạo tệp tải xuống");
                try {
                    writeDownload(uri, data);
                    values.clear();
                    values.put(android.provider.MediaStore.Downloads.IS_PENDING, 0);
                    if (getContext().getContentResolver().update(uri, values, null, null) != 1) {
                        throw new java.io.IOException("Không thể hoàn tất tệp tải xuống");
                    }
                } catch (Exception e) {
                    try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception cleanup) {
                        e.addSuppressed(cleanup);
                    }
                    throw e;
                }
                location="Tải xuống / "+name;
            }else{
                File directory=getContext().getExternalFilesDir(android.os.Environment.DIRECTORY_DOCUMENTS);if(directory==null)throw new java.io.IOException("Bộ nhớ chưa sẵn sàng");directory.mkdirs();File file=new File(directory,name);
                try(java.io.OutputStream stream=new FileOutputStream(file)){stream.write(data);}location=file.getAbsolutePath();
            }
            JSObject result=new JSObject();result.put("location",location);call.resolve(result);
        }catch(Exception e){call.reject("Không thể lưu tệp",e);}
    }
    @ActivityCallback private void downloadDocumentResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        try {
            if (uri == null) throw new java.io.IOException("Không nhận được vị trí lưu tệp");
            writeDownload(uri, Base64.decode(call.getString("data", ""), Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) {
            call.reject("Không thể lưu tệp", e);
        }
    }
    private void writeDownload(Uri uri, byte[] data) throws java.io.IOException {
        try (java.io.OutputStream stream = getContext().getContentResolver().openOutputStream(uri)) {
            if (stream == null) throw new java.io.IOException("Không thể mở tệp");
            stream.write(data);
        }
    }
    @PluginMethod public void permissions(PluginCall call){
        if(Build.VERSION.SDK_INT>=33 && getPermissionState("notifications")!=com.getcapacitor.PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"notificationResult");return;}
        openExactPermission(call);
    }
    @PermissionCallback private void notificationResult(PluginCall call){openExactPermission(call);}
    private boolean notificationsEnabled(){return getContext().getSystemService(android.app.NotificationManager.class).areNotificationsEnabled();}
    private boolean canShowAlarm(){return Build.VERSION.SDK_INT<34 || getContext().getSystemService(android.app.NotificationManager.class).canUseFullScreenIntent();}
    @PluginMethod public void fullScreenPermission(PluginCall call){
        if(Build.VERSION.SDK_INT>=34&&!canShowAlarm())getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getContext().getPackageName())));
        call.resolve();
    }
    private void openExactPermission(PluginCall call){
        if(Build.VERSION.SDK_INT>=31 && !AlarmStore.canSchedule(getContext())) {
            Intent intent=new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getContext().getPackageName()));getActivity().startActivity(intent);
        }
        call.resolve();
    }
}
