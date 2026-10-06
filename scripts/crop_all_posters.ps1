Add-Type -AssemblyName System.Drawing

$imgPath = "C:\Users\Dosto\.gemini\antigravity\brain\01b2befe-fed7-47c2-ab6f-cd4f2682d9a7\.user_uploaded\media_1791300896227.png"
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$outDir = "public\images\posters"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force
}

$cols = @(34, 176, 319, 462, 605)
$pw = 114
$ph = 152

# Row 1 (y=286)
$row1Names = @("person-of-interest.png", "the-bear.png", "hajime-no-ippo.png", "regular-show.png", "severance.png")
for ($i = 0; $i -lt 5; $i++) {
    $rect = New-Object System.Drawing.Rectangle($cols[$i], 286, $pw, $ph)
    $crop = $img.Clone($rect, $img.PixelFormat)
    $crop.Save("$outDir\$($row1Names[$i])", [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Host "Saved $($row1Names[$i])"
}

# Row 2 (y=542)
$row2Names = @("daredevil-born-again.png", "the-good-doctor.png", "avatar-the-last-airbender.png", "modern-family.png", "seinfeld.png")
for ($i = 0; $i -lt 5; $i++) {
    $rect = New-Object System.Drawing.Rectangle($cols[$i], 542, $pw, $ph)
    $crop = $img.Clone($rect, $img.PixelFormat)
    $crop.Save("$outDir\$($row2Names[$i])", [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Host "Saved $($row2Names[$i])"
}

$img.Dispose()
Write-Host "All 10 posters cropped with exact bounds!"
