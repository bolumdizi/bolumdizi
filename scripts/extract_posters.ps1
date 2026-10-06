Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\Dosto\.gemini\antigravity\brain\01b2befe-fed7-47c2-ab6f-cd4f2682d9a7\.user_uploaded\media_1791300896227.png"
$src = [System.Drawing.Bitmap]::FromFile($imgPath)

$outDir = "c:\Users\Dosto\Desktop\bolum-dizi\public\images\profile_posters"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir }

$row1Y = 289
$row2Y = 573
$posterW = 114
$posterH = 163

$xs = @(34, 176, 319, 463, 606)

$names = @(
  "person-of-interest",
  "the-bear",
  "hajime-no-ippo",
  "regular-show",
  "severance",
  "daredevil",
  "the-good-doctor",
  "avatar",
  "modern-family",
  "seinfeld"
)

for ($i = 0; $i -lt 5; $i++) {
  $rect1 = New-Object System.Drawing.Rectangle($xs[$i], $row1Y, $posterW, $posterH)
  $p1 = $src.Clone($rect1, $src.PixelFormat)
  $p1.Save("$outDir\$($names[$i]).png", [System.Drawing.Imaging.ImageFormat]::Png)
  $p1.Dispose()

  $rect2 = New-Object System.Drawing.Rectangle($xs[$i], $row2Y, $posterW, $posterH)
  $p2 = $src.Clone($rect2, $src.PixelFormat)
  $p2.Save("$outDir\$($names[$i+5]).png", [System.Drawing.Imaging.ImageFormat]::Png)
  $p2.Dispose()
}

$src.Dispose()
Write-Host "Posters perfectly cropped at height 163!"
