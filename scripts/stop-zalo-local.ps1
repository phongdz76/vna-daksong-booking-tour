param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot 'tmp\zalo-local\session.json'
$envPath = Join-Path $projectRoot 'frontend\.env.local'
$utf8 = New-Object System.Text.UTF8Encoding($false)
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'No local test session to stop.'; exit 0 }
$session = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json

# Match the recorded start time as well as PID to avoid stopping an unrelated process.
foreach ($record in @($session.tunnel, $session.backend)) {
    if (-not $record) { continue }
    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if ($process -and ($process.StartTime.ToUniversalTime().ToString('o') -eq $record.startedUtc)) {
        Stop-Process -Id $process.Id
    }
}

if ($session.envChanged -and (Test-Path -LiteralPath $envPath)) {
    $text = [IO.File]::ReadAllText($envPath)
    $pattern = '(?m)^[ \t]*(?:export[ \t]+)?VITE_API_BASE_URL[ \t]*=[^\r\n]*'
    $match = [regex]::Match($text, $pattern)
    if ($match.Success -and ($match.Value.Trim() -eq "VITE_API_BASE_URL=$($session.url)")) {
        if ($null -ne $session.previousApiLine) {
            $text = $text.Remove($match.Index, $match.Length).Insert($match.Index, [string]$session.previousApiLine)
        } else {
            $text = [regex]::Replace($text, '(?m)^[ \t]*(?:export[ \t]+)?VITE_API_BASE_URL[ \t]*=[^\r\n]*(?:\r?\n)?', '')
        }
        if (-not $session.envExisted -and -not $text.Trim()) { Remove-Item -LiteralPath $envPath }
        else { [IO.File]::WriteAllText($envPath, $text, $utf8) }
    }
}
Remove-Item -LiteralPath $statePath
Write-Output 'Stopped the local backend and HTTPS tunnel; restored the previous local API setting.'
