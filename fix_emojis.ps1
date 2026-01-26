[System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes("C:\tmp\MusicConnectZ_Fixed.html")) | ForEach-Object {
    $_ = $_ -replace 'ðŸŽ', '🎤'
    $_ = $_ -replace 'ðŸŽ¯', '🎯'
    $_ = $_ -replace 'ðŸŽµ', '🎵'
    $_ = $_ -replace 'ðŸ"', '🖼️'
    $_ = $_ -replace 'ðŸŽ™', '🎙️'
    $_ = $_ -replace 'ðŸŽ›', '🎛️'
    $_ = $_ -replace 'ðŸŽ¨', '🎨'
    $_ = $_ -replace 'ðŸŽ¬', '🎬'
    $_
} | Set-Content "C:\tmp\MusicConnectZ_Fixed.html" -Encoding UTF8
