param([switch]$RestartBackend)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot 'tmp\zalo-local'
$statePath = Join-Path $runtimeDir 'session.json'
$backendDir = Join-Path $projectRoot 'backend'
$envPath = Join-Path $projectRoot 'frontend\.env.local'
$cloudflared = Join-Path $runtimeDir 'cloudflared.exe'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-ProcessRecord($process) {
    $process.Refresh()
    return @{ pid = $process.Id; startedUtc = $process.StartTime.ToUniversalTime().ToString('o') }
}

function Test-RecordedProcess($record) {
    if (-not $record) { return $false }
    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    return $process -and ($process.StartTime.ToUniversalTime().ToString('o') -eq $record.startedUtc)
}

function Save-State {
    [IO.File]::WriteAllText($statePath, ($script:session | ConvertTo-Json -Depth 4), $utf8)
}

function Read-ActiveLog($path) {
    $stream = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    $reader = New-Object IO.StreamReader($stream)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Start-Backend {
    # The local credential file is authoritative; keep mock login disabled.
    $overrides = @{ NODE_ENV = 'production'; ALLOW_MOCK_LOGIN = 'false'; PORT = '8000'; VERCEL = $null; ZALO_APP_SECRET = $null; ZALO_APP_ID = $null }
    $previous = @{}
    try {
        foreach ($name in $overrides.Keys) {
            $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
            [Environment]::SetEnvironmentVariable($name, $overrides[$name], 'Process')
        }
        $node = (Get-Command node.exe -ErrorAction Stop).Source
        $backend = Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'backend.out.log') -RedirectStandardError (Join-Path $runtimeDir 'backend.err.log') -PassThru
        $script:session.backend = Get-ProcessRecord $backend
        Save-State
    } finally {
        foreach ($name in $overrides.Keys) {
            [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
        }
    }
}

function Wait-Backend {
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (-not (Test-RecordedProcess $script:session.backend)) { throw 'Backend exited. Check tmp/zalo-local/backend.err.log.' }
        try {
            Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/tours?limit=1' -TimeoutSec 5 | Out-Null
            Write-Output 'Local API and database are ready. Mock login is disabled.'
            return
        } catch { Start-Sleep -Seconds 1 }
    }
    throw 'Backend/database did not become ready. Check tmp/zalo-local/backend.err.log.'
}

function Set-LocalApi($url) {
    $text = if (Test-Path -LiteralPath $envPath) { [IO.File]::ReadAllText($envPath) } else { '' }
    $pattern = '(?m)^[ \t]*(?:export[ \t]+)?VITE_API_BASE_URL[ \t]*=[^\r\n]*'
    $matches = [regex]::Matches($text, $pattern)
    if ($matches.Count -gt 1) { throw 'frontend/.env.local has multiple VITE_API_BASE_URL entries.' }
    $script:session.envExisted = Test-Path -LiteralPath $envPath
    $script:session.previousApiLine = if ($matches.Count) { $matches[0].Value } else { $null }
    $line = "VITE_API_BASE_URL=$url"
    if ($matches.Count) { $text = [regex]::Replace($text, $pattern, $line) }
    else {
        if ($text.Length -and -not $text.EndsWith("`n")) { $text += "`r`n" }
        $text += "$line`r`n"
    }
    # Save the previous API setting before changing the ignored local file.
    $script:session.envChanged = $true
    Save-State
    [IO.File]::WriteAllText($envPath, $text, $utf8)
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
if (Test-Path -LiteralPath $statePath) {
    $old = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($RestartBackend) {
        if (-not (Test-RecordedProcess $old.tunnel) -or -not $old.url) {
            throw 'The HTTPS tunnel is stopped. Start a new local session without -RestartBackend.'
        }
        if (Test-RecordedProcess $old.backend) {
            Stop-Process -Id $old.backend.pid
            Wait-Process -Id $old.backend.pid -Timeout 10 -ErrorAction SilentlyContinue
        }
        $script:session = $old
        $script:session.backend = $null
        Save-State
        Start-Backend
        Wait-Backend
        Write-Output "Backend restarted with the saved .env. HTTPS URL unchanged: $($old.url)"
        exit 0
    }
    if ((Test-RecordedProcess $old.backend) -and (Test-RecordedProcess $old.tunnel) -and $old.url) {
        Write-Output "Already running: $($old.url)"
        exit 0
    }
    & (Join-Path $PSScriptRoot 'stop-zalo-local.ps1')
}
if ($RestartBackend) { throw 'There is no local test session to restart.' }

if (-not (Test-Path -LiteralPath (Join-Path $backendDir '.env'))) {
    throw 'Configure backend/.env first. Do not put secrets in the frontend.'
}
if (-not (Test-Path -LiteralPath (Join-Path $backendDir 'node_modules'))) {
    throw 'Install backend dependencies with npm.cmd ci first.'
}
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 8000 is already in use. Its process was left running.'
}
if (-not (Test-Path -LiteralPath $cloudflared)) {
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflared -UseBasicParsing -TimeoutSec 60
}

$script:session = @{ backend = $null; tunnel = $null; url = $null; envChanged = $false }
Save-State
try {
    Start-Backend
    Wait-Backend

    $tunnelLog = Join-Path $runtimeDir 'tunnel.err.log'
    $tunnel = Start-Process -FilePath $cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:8000') -WorkingDirectory $runtimeDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'tunnel.out.log') -RedirectStandardError $tunnelLog -PassThru
    $script:session.tunnel = Get-ProcessRecord $tunnel
    Save-State
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (-not (Test-RecordedProcess $script:session.tunnel)) { throw 'Tunnel exited. Check tmp/zalo-local/tunnel.err.log.' }
        if (Test-Path -LiteralPath $tunnelLog) {
            $match = [regex]::Match((Read-ActiveLog $tunnelLog), 'https://[a-z0-9-]+\.trycloudflare\.com')
            if ($match.Success) { $script:session.url = $match.Value; Save-State; break }
        }
        Start-Sleep -Seconds 1
    }
    if (-not $script:session.url) { throw 'No HTTPS URL was returned. Check tmp/zalo-local/tunnel.err.log.' }

    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    $ready = $false
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $result = Invoke-RestMethod -Uri "$($script:session.url)/" -TimeoutSec 5
            if ($result.service -eq 'VNA Dak Song Booking API') { $ready = $true; break }
        } catch { Start-Sleep -Seconds 2 }
    }
    if (-not $ready) { throw 'The public HTTPS API did not respond. Check tmp/zalo-local/tunnel.err.log.' }
    Set-LocalApi $script:session.url
    Write-Output "HTTPS API: $($script:session.url)"
    Write-Output 'Saved frontend/.env.local. Build with npm.cmd run build:zalo in frontend, then deploy Development.'
    Write-Output 'Keep this computer online. Stop with powershell -ExecutionPolicy Bypass -File scripts/stop-zalo-local.ps1.'
} catch {
    & (Join-Path $PSScriptRoot 'stop-zalo-local.ps1')
    throw
}
