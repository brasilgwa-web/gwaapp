Add-Type -AssemblyName System.Drawing

$files = @(
    @{ Source = "C:/Users/camil/.gemini/antigravity/brain/848e5e59-882b-4db9-a605-3e7bb97804c9/pwa_icon_512_png_1765671233532.png"; Dest = "c:\Users\camil\OneDrive\Documentos\Andre\projetos\WGA Brasil\public\pwa-512x512.png" },
    @{ Source = "C:/Users/camil/.gemini/antigravity/brain/848e5e59-882b-4db9-a605-3e7bb97804c9/screenshot_mobile_png_1765671248519.png"; Dest = "c:\Users\camil\OneDrive\Documentos\Andre\projetos\WGA Brasil\public\screenshot-mobile.png" },
    @{ Source = "C:/Users/camil/.gemini/antigravity/brain/848e5e59-882b-4db9-a605-3e7bb97804c9/screenshot_desktop_png_1765671265237.png"; Dest = "c:\Users\camil\OneDrive\Documentos\Andre\projetos\WGA Brasil\public\screenshot-desktop.png" }
)

foreach ($file in $files) {
    Write-Host "Converting $($file.Source) to $($file.Dest)"
    $img = [System.Drawing.Image]::FromFile($file.Source)
    $img.Save($file.Dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host "Done."
}

# Special case for resizing 512 to 192 and converting
Write-Host "Creating pwa-192x192.png from 512 source..."
$source512 = "C:/Users/camil/.gemini/antigravity/brain/848e5e59-882b-4db9-a605-3e7bb97804c9/pwa_icon_512_png_1765671233532.png"
$dest192 = "c:\Users\camil\OneDrive\Documentos\Andre\projetos\WGA Brasil\public\pwa-192x192.png"
$imgFull = [System.Drawing.Image]::FromFile($source512)
$img192 = new-object System.Drawing.Bitmap($imgFull, 192, 192)
$img192.Save($dest192, [System.Drawing.Imaging.ImageFormat]::Png)
$img192.Dispose()
$imgFull.Dispose()
Write-Host "All conversions complete."
