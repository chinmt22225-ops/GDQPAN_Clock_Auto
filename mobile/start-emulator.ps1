param([ValidateSet('swiftshader','host','auto')][string]$Gpu = 'swiftshader')
$ErrorActionPreference = 'Stop'
$env:ANDROID_HOME = 'D:\GDQPAN\android-build-tools\android-sdk'
$env:ANDROID_AVD_HOME = 'D:\GDQPAN\android-build-tools\avd'
$emulator = Join-Path $env:ANDROID_HOME 'emulator\emulator.exe'
$process = Start-Process -FilePath $emulator -ArgumentList @('-avd','GDQPAN_QA','-port','5554','-no-window','-no-snapshot','-gpu',$Gpu,'-no-audio','-no-boot-anim','-memory','2048') -WindowStyle Hidden -PassThru -RedirectStandardOutput 'D:\GDQPAN\android-build-tools\emulator.log' -RedirectStandardError 'D:\GDQPAN\android-build-tools\emulator-error.log'
Write-Output "Emulator process: $($process.Id)"
