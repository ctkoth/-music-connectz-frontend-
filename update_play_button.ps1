$content = Get-Content "C:\tmp\MusicConnectZ_Fixed.html" -Raw

# Replace the post-actions line with Edit button to include Play button
$oldPattern = '<div class="post-actions"><button class="btn btn-secondary btn-small" onclick="editExample\(\$\{idx\}\)">.*?Edit.*?</button></div>'
$newAction = '<div class="post-actions"><button class="btn btn-secondary btn-small" onclick="playMedia(${idx})">▶️ Play</button><button class="btn btn-secondary btn-small" onclick="editExample(${idx})">✏️ Edit</button></div>'

$newContent = $content -replace $oldPattern, $newAction
$newContent | Set-Content "C:\tmp\MusicConnectZ_Fixed.html" -Encoding UTF8
Write-Host "Play button added successfully"
