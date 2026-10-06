Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\Dosto\.gemini\antigravity\brain\01b2befe-fed7-47c2-ab6f-cd4f2682d9a7\.user_uploaded\media_1791300896227.png"
$src = [System.Drawing.Bitmap]::FromFile($imgPath)

$cropX = 768
$cropY = 157
$cropW = 217
$cropH = 222

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$avatar = $src.Clone($rect, $src.PixelFormat)

$outDir = "c:\Users\Dosto\Desktop\bolum-dizi\public\images"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir }
$avatar.Save("c:\Users\Dosto\Desktop\bolum-dizi\public\images\profile_avatar.png", [System.Drawing.Imaging.ImageFormat]::Png)

$avatar.Dispose()
$src.Dispose()
Write-Host "Avatar refined successfully!"
