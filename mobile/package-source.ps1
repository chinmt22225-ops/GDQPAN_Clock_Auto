$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$destination = Join-Path $sourceRoot 'GDQPAN-1.2-source.zip'
$sourceFiles = @(
    'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html', 'vtv_player.html',
    'THAM_DINH_MOBILE_2026-10-09.md', '.github/workflows/build-android-apk.yml',
    'assets/hls.min.js', 'assets/logo_gdqpan.png', 'assets/banner_campus.jpg', 'assets/huong-dan-lay-link.png',
    'config/settings.json', 'config/vtv-stream.json'
)
$files = @($sourceFiles | ForEach-Object { Get-Item -LiteralPath (Join-Path $sourceRoot $_) })
$files += Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Where-Object {
    $relative = $_.FullName.Substring($PSScriptRoot.Length + 1).Replace('\','/')
    $relative -notmatch '(^|/)(node_modules|build|\.gradle|\.build-tools|qa|\.idea)/' -and
    $relative -notmatch '^android/app/src/main/assets/public/' -and
    $relative -notmatch '\.(apk|jks|keystore)$' -and
    $relative -notmatch '(^|/)(local\.properties|index\.before-desktop-ui\.html|startup\.before-desktop\.test\.js)$'
}
$stream = [IO.File]::Open($destination,[IO.FileMode]::Create)
$archive = New-Object IO.Compression.ZipArchive($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $entryName = $file.FullName.Substring($sourceRoot.Length+1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$entryName,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $stream.Dispose() }
Get-Item -LiteralPath $destination | Select-Object FullName,Length
