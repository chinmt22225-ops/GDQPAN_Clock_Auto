$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$destination = Join-Path $sourceRoot 'GDQPAN-accounts-source.zip'
$entries = @{}
foreach ($name in @('main.js','preload.js','tts_server.js','tts_service.py','chay_dich_vu_giong_doc.bat','package.json','package-lock.json','HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html','vtv_player.html','manifest.json','sw.js','TAI_KHOAN_VA_QUAN_TRI.md','NGAN_SACH_DU_TRU_GDQPAN.md','THAM_DINH_MOBILE_2026-10-09.md')) {
    $file = Get-Item -LiteralPath (Join-Path $sourceRoot $name)
    $entries[$name] = $file.FullName
}
foreach ($folder in @('assets','config','server','mobile')) {
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $sourceRoot $folder) -Recurse -File) {
        $relative = $file.FullName.Substring($sourceRoot.Length + 1).Replace('\','/')
        if ($relative -match '(^|/)(node_modules|build|\.gradle|\.build-tools|qa|\.idea|data|__pycache__)/' -or $relative -match '^mobile/android/app/src/main/assets/public/' -or $relative -match '\.(apk|jks|keystore|pyc)$' -or $relative -match '(^|/)(\.env|local\.properties|index\.before-desktop-ui\.html|startup\.before-desktop\.test\.js)$') { continue }
        $entries[$relative] = $file.FullName
    }
}
# Include the same bundled audio as the mobile app at desktop paths as well.
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'www/Sound') -Recurse -File) {
    $relative = $file.FullName.Substring((Join-Path $PSScriptRoot 'www').Length + 1).Replace('\','/')
    $entries[$relative] = $file.FullName
}
$stream = [IO.File]::Open($destination,[IO.FileMode]::Create)
$archive = New-Object IO.Compression.ZipArchive($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($name in $entries.Keys) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$entries[$name],$name,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $stream.Dispose() }
Get-Item -LiteralPath $destination | Select-Object FullName,Length
