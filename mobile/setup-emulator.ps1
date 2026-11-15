$ErrorActionPreference = 'Stop'
$toolRoot = 'D:\GDQPAN\android-build-tools'
$env:JAVA_HOME = (Get-ChildItem -LiteralPath (Join-Path $toolRoot 'jdk') -Directory | Select-Object -First 1).FullName
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = Join-Path $toolRoot 'android-sdk'
$env:ANDROID_AVD_HOME = Join-Path $toolRoot 'avd'
New-Item -ItemType Directory -Path $env:ANDROID_AVD_HOME -Force | Out-Null
$manager = Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin\sdkmanager.bat'
$env:SDKMANAGER_OPTS = '-Dsun.net.client.defaultReadTimeout=600000 -Dsun.net.client.defaultConnectTimeout=60000'
& $manager --verbose --sdk_root=$env:ANDROID_HOME 'emulator' 'system-images;android-35;google_apis;x86_64'
if ($LASTEXITCODE -ne 0) { throw 'Emulator SDK installation failed' }
if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_AVD_HOME 'GDQPAN_QA.avd'))) {
    'no' | & (Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin\avdmanager.bat') create avd --name GDQPAN_QA --package 'system-images;android-35;google_apis;x86_64' --device 'pixel_5' --force
    if ($LASTEXITCODE -ne 0) { throw 'AVD creation failed' }
}
& (Join-Path $env:ANDROID_HOME 'emulator\emulator.exe') -accel-check
Write-Output 'GDQPAN_QA emulator prepared'
