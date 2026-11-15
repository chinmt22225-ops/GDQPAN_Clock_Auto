param([string]$ApkPath, [string]$ManifestPath)
$ErrorActionPreference = 'Stop'
if (-not $ManifestPath) {
    if ($ApkPath) { $ManifestPath = "$ApkPath.verification.json" }
    else {
        $reports = @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.apk.verification.json' -File)
        if ($reports.Count -ne 1) { throw 'Specify -ApkPath and -ManifestPath for the release being checked.' }
        $ManifestPath = $reports[0].FullName
    }
}
$ManifestPath = (Resolve-Path -LiteralPath $ManifestPath).Path
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if (-not $ApkPath) { $ApkPath = Join-Path (Split-Path -Parent $ManifestPath) $manifest.file }
$file = Get-Item -LiteralPath $ApkPath
if ($file.Length -ne [long]$manifest.bytes) {
    throw "INCOMPLETE / WRONG APK: expected $($manifest.bytes) bytes, received $($file.Length). Copy or download again."
}
$sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
if ($sha256 -ne $manifest.sha256) { throw 'WRONG / DAMAGED APK: SHA-256 does not match the verified release. Copy or download again.' }
Write-Output "PASS: $($file.Name), $($file.Length) bytes"
Write-Output "SHA-256: $sha256"
Write-Output "This file matches verified GDQPAN $($manifest.version). Install over the existing app to preserve data."
