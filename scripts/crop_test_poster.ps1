Add-Type -AssemblyName System.Drawing

$imgPath = "C:\Users\Dosto\.gemini\antigravity\brain\01b2befe-fed7-47c2-ab6f-cd4f2682d9a7\.user_uploaded\media_1791300896227.png"
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

# Let's crop Row 1 Col 1 entire card or poster:
# x=34, y=234, w=115, h=215
$rect = New-Object System.Drawing.Rectangle(34, 234, 115, 215)
$crop = $img.Clone($rect, $img.PixelFormat)
$crop.Save("public\images\posters\card1_full.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$img.Dispose()
Write-Host "Card 1 cropped"
