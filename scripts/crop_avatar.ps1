Add-Type -AssemblyName System.Drawing

$imgPath = "C:\Users\Dosto\.gemini\antigravity\brain\01b2befe-fed7-47c2-ab6f-cd4f2682d9a7\.user_uploaded\media_1791300896227.png"
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$x = 768
$y = 184
$w = 219
$h = 191

$rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
$crop = $img.Clone($rect, $img.PixelFormat)

if (-not (Test-Path "public\images")) {
    New-Item -ItemType Directory -Path "public\images" -Force
}

$crop.Save("public\images\avatar_marshall.png", [System.Drawing.Imaging.ImageFormat]::Png)

$crop.Dispose()
$img.Dispose()

Write-Host "Perfect avatar crop saved!"
