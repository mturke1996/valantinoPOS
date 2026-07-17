# Build Valentino POS desktop app with Pake
# Requires: Node 22+, Rust (rustup), Visual Studio C++ Build Tools
# Docs: https://github.com/tw93/Pake

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

# Ensure rustup cargo is on PATH (common after fresh install / new shell)
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) {
  $env:Path = "$cargoBin;$env:Path"
}

Write-Host "==> Valentino POS desktop build (Pake)" -ForegroundColor Cyan
Write-Host "    URL: https://valantino-pos.vercel.app"

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Write-Host @"

Rust غير مثبت. اختر أحد الخيارين:
  1) البناء عبر GitHub Actions (موصى به): Actions → Build Desktop App (Pake)
  2) تثبيت Rust من https://rustup.rs ثم Visual Studio Build Tools (Desktop C++)

"@ -ForegroundColor Yellow
  exit 1
}

# Short paths avoid MSVC C1083 / ring build failures on deep OneDrive + pnpm-cache paths
$outRoot = "C:\pake-out"
New-Item -ItemType Directory -Force -Path "$outRoot\tmp" | Out-Null
$env:CARGO_TARGET_DIR = "$outRoot\target"
$env:TMP = "$outRoot\tmp"
$env:TEMP = "$outRoot\tmp"

pnpm dlx pake-cli --config desktop/pake.json --targets x64
Write-Host "==> Done. ابحث عن ملف ValentinoPOS_*.msi (أو تحت $outRoot)" -ForegroundColor Green
