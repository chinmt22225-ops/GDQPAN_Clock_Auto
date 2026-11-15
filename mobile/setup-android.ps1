$ErrorActionPreference = 'Stop'
$toolRoot = 'D:\GDQPAN\android-build-tools'
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
$jdkZip = Join-Path $toolRoot 'jdk21.zip'
if (-not (Test-Path -LiteralPath (Join-Path $toolRoot 'jdk'))) {
    Invoke-WebRequest -Uri 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip' -OutFile $jdkZip
    Expand-Archive -LiteralPath $jdkZip -DestinationPath (Join-Path $toolRoot 'jdk') -Force
}
$asciiJdk = 'D:\GDQPAN\android-build-tools\jdk'
if (-not (Test-Path -LiteralPath $asciiJdk)) { New-Item -ItemType Directory -Path 'D:\GDQPAN\android-build-tools' -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $toolRoot 'jdk') -Destination $asciiJdk -Recurse }
$env:JAVA_HOME = (Get-ChildItem -LiteralPath $asciiJdk -Directory | Select-Object -First 1).FullName
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$sdkRoot = Join-Path $toolRoot 'android-sdk'
$sdkTools = Join-Path $sdkRoot 'cmdline-tools\latest'
if (-not (Test-Path -LiteralPath (Join-Path $sdkTools 'bin\sdkmanager.bat'))) {
    $sdkZip = Join-Path $toolRoot 'commandline-tools.zip'
    Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkZip
    if ((Get-FileHash -LiteralPath $sdkZip -Algorithm SHA256).Hash.ToLower() -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a') { throw 'Android SDK checksum mismatch' }
    $extractPath = Join-Path $toolRoot 'sdk-extract'
    Expand-Archive -LiteralPath $sdkZip -DestinationPath $extractPath -Force
    New-Item -ItemType Directory -Path $sdkTools -Force | Out-Null
    Copy-Item -Path (Join-Path $extractPath 'cmdline-tools\*') -Destination $sdkTools -Recurse -Force
}
$env:ANDROID_HOME = $sdkRoot
$sdkManager = Join-Path $sdkTools 'bin\sdkmanager.bat'
$licenseAnswers = 1..100 | ForEach-Object { 'y' }
$licenseAnswers | & $sdkManager --sdk_root=$sdkRoot --licenses
if ($LASTEXITCODE -ne 0) { throw 'SDK license setup failed' }
& $sdkManager --sdk_root=$sdkRoot 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'SDK installation failed' }
if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-36\android.jar'))) { throw 'Android platform was not installed' }
$sdkProperty = $sdkRoot.Replace('\','/').Replace(':','\:')
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'android\local.properties'), "sdk.dir=$sdkProperty`n", [Text.UTF8Encoding]::new($false))
Write-Output "Android SDK ready at $sdkRoot"
