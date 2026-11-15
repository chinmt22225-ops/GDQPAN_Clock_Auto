param([ValidateSet('official','test','demo','both')][string]$Channel = 'both', [ValidateRange(15,2147483647)][int]$VersionCode = 20, [string]$ReferenceApk, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = (Get-ChildItem -LiteralPath 'D:\GDQPAN\android-build-tools\jdk' -Directory | Select-Object -First 1).FullName
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = 'D:\GDQPAN\android-build-tools\android-sdk'
$env:GRADLE_USER_HOME = 'D:\GDQPAN\android-build-tools\gradle-cache'
Push-Location $PSScriptRoot
try {
    if ($ReferenceApk) { $ReferenceApk = (Resolve-Path -LiteralPath $ReferenceApk).Path }
    $releaseVersion = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
    & node build-web.js
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
    & .\node_modules\.bin\cap.cmd sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
    # Windows Java command-line tools cannot consistently resolve accented paths.
    $buildRoot = 'D:\GDQPAN\android-build-tools\project'
    New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $buildRoot 'android') -Force | Out-Null
    Copy-Item -Path (Join-Path $PSScriptRoot 'android\*') -Destination (Join-Path $buildRoot 'android') -Recurse -Force
    foreach ($dependency in @('@capacitor/android','@capacitor/filesystem','@capacitor/local-notifications','@capacitor-community/keep-awake','@capacitor-community/text-to-speech')) {
        $dependencyTarget = Join-Path $buildRoot "node_modules/$dependency"
        New-Item -ItemType Directory -Path $dependencyTarget -Force | Out-Null
        Copy-Item -Path (Join-Path $PSScriptRoot "node_modules/$dependency/*") -Destination $dependencyTarget -Recurse -Force
    }
    Push-Location (Join-Path $buildRoot 'android')
    try {
        $variants = if ($Channel -eq 'both') { @('official','test') } else { @($Channel) }
        foreach ($variant in $variants) {
            $versionName = if ($variant -eq 'test') { "$releaseVersion-test" } elseif ($variant -eq 'demo') { "$releaseVersion-demo" } else { $releaseVersion }
            $gradleArgs = @('assembleDebug', '--no-daemon', "-PgdqVersionCode=$VersionCode", "-PgdqVersionName=$versionName")
            if ($Offline) { $gradleArgs += '--offline' }
            & (Join-Path $env:JAVA_HOME 'bin\java.exe') -classpath (Join-Path $buildRoot 'android\gradle\wrapper\gradle-wrapper.jar') org.gradle.wrapper.GradleWrapperMain @gradleArgs
            if ($LASTEXITCODE -ne 0) { throw "Android $variant build failed" }
            $stageRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('.apk-staging-' + [guid]::NewGuid().ToString('N'))))
            if (-not $stageRoot.StartsWith([IO.Path]::GetFullPath($PSScriptRoot) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid APK staging directory' }
            New-Item -ItemType Directory -Path $stageRoot | Out-Null
            try {
                $fileName = "GDQPAN-$versionName.apk"
                $stagedApk = Join-Path $stageRoot $fileName
                Copy-Item -LiteralPath (Join-Path $buildRoot 'android\app\build\outputs\apk\debug\app-debug.apk') -Destination $stagedApk
                $verifyArgs = @((Join-Path $PSScriptRoot 'verify-apk.cjs'), '--apk', $stagedApk, '--version', $versionName, '--code', "$VersionCode", '--require-v1', '--output', "$stagedApk.verification.json")
                if ($ReferenceApk) { $verifyArgs += @('--reference', $ReferenceApk) }
                & node @verifyArgs
                if ($LASTEXITCODE -ne 0) { throw 'APK verification failed; no distributable was published' }
                $verified = Get-Content -LiteralPath "$stagedApk.verification.json" -Raw | ConvertFrom-Json
                [IO.File]::WriteAllText("$stagedApk.sha256", "$($verified.sha256)  $fileName`n", [Text.UTF8Encoding]::new($false))
                # Publish only complete, verified bytes; users never receive a partial copy.
                foreach ($name in @($fileName, "$fileName.sha256", "$fileName.verification.json")) {
                    Move-Item -LiteralPath (Join-Path $stageRoot $name) -Destination (Join-Path $PSScriptRoot $name) -Force
                }
                Write-Output "Verified APK: $fileName ($($verified.bytes) bytes, SHA-256 $($verified.sha256))"
            } finally { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
        }
    }
    finally { Pop-Location }
} finally { Pop-Location }
