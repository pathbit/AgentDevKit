param(
    [switch]$RuntimeOnly,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$SetupArguments = @()
)
# Bootstrap local para Windows; nao altera instalacoes globais ou PATH persistente.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$stage = $null
$backup = $null
$target = $null

function Test-Node([string]$Candidate) {
    if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) { return $false }
    try {
        & $Candidate -e "if(process.versions.bun || Number(process.versions.node.split('.')[0]) < 24) process.exit(1)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
}
function Test-Npm([string]$Node, [string]$Npm, [bool]$JavaScript) {
    try {
        if ($JavaScript) { $version = & $Node $Npm --version 2>$null }
        else { $version = & $Npm --version 2>$null }
        return $LASTEXITCODE -eq 0 -and (($version -join "`n").Trim() -match '^\d+\.\d+\.\d+(?:-[\w.-]+)?$')
    } catch { return $false }
}
function Invoke-Setup([string]$Node) {
    Write-Output "node=$Node"
    if ($RuntimeOnly) { exit 0 }
    $previousPath = $env:PATH
    try {
        $env:PATH = (Split-Path -Parent $Node) + [IO.Path]::PathSeparator + $previousPath
        & $Node $manager setup @SetupArguments
        $code = $LASTEXITCODE
    } finally { $env:PATH = $previousPath }
    exit $code
}
function Assert-Directory([string]$Directory) {
    $item = Get-Item -LiteralPath $Directory -Force -ErrorAction SilentlyContinue
    if ($null -ne $item -and ((($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) -or -not $item.PSIsContainer)) {
        throw "Cache deve ser diretorio real, sem links: $Directory"
    }
}
function Get-OfficialFile([string]$Uri, [string]$Destination) {
    Invoke-WebRequest -Uri $Uri -OutFile $Destination -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 300
}

try {
    if ($RuntimeOnly -and $SetupArguments.Count -gt 0) { throw '-RuntimeOnly nao aceita selecao ou outros argumentos.' }
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Use BOOTSTRAP.sh no macOS ou Linux.' }
    $project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
    $manager = Join-Path $PSScriptRoot 'SCRIPT.mjs'
    if (-not (Test-Path -LiteralPath $manager -PathType Leaf)) { throw "SCRIPT.mjs ausente: $manager" }
    $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $npmCommand = Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $nodeCommand -and $null -ne $npmCommand -and (Test-Node $nodeCommand.Source) -and (Test-Npm $nodeCommand.Source $npmCommand.Source $false)) {
        $node = (& $nodeCommand.Source -p 'process.execPath').Trim()
        Invoke-Setup $node
    }

    $architecture = $env:PROCESSOR_ARCHITECTURE
    if ($env:PROCESSOR_ARCHITEW6432) { $architecture = $env:PROCESSOR_ARCHITEW6432 }
    switch ($architecture.ToUpperInvariant()) {
        'AMD64' { $platform = 'win-x64' }
        'ARM64' { $platform = 'win-arm64' }
        default { throw 'Arquitetura Windows suportada: x64 ou arm64.' }
    }
    $cache = Join-Path $project '.pbai4devs/tools/.cache/runtime/node'
    foreach ($relative in @('.pbai4devs', '.pbai4devs/tools', '.pbai4devs/tools/.cache', '.pbai4devs/tools/.cache/runtime', '.pbai4devs/tools/.cache/runtime/node', ".pbai4devs/tools/.cache/runtime/node/$platform")) {
        Assert-Directory (Join-Path $project $relative)
    }
    $platformCache = Join-Path $cache $platform
    if (Test-Path -LiteralPath $platformCache) {
        foreach ($installation in @(Get-ChildItem -LiteralPath $platformCache -Directory -Filter 'v24.*')) {
            if (($installation.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
            $node = Join-Path $installation.FullName 'node.exe'
            if ((Test-Node $node) -and (Test-Npm $node (Join-Path $installation.FullName 'node_modules/npm/bin/npm-cli.js') $true)) { Invoke-Setup $node }
        }
    }
    foreach ($command in @('Invoke-WebRequest', 'Get-FileHash', 'Expand-Archive')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "PowerShell 5.1+ necessario: $command ausente." }
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    New-Item -ItemType Directory -Path $platformCache -Force | Out-Null
    $stage = Join-Path $platformCache ('.stage.' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $manifest = Join-Path $stage 'SHASUMS256.txt'
    Get-OfficialFile 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' $manifest
    $releaseRows = @(foreach ($line in Get-Content -LiteralPath $manifest) {
        if ($line -match '^([0-9a-fA-F]{64})\s+(node-v24\.\d+\.\d+-[^\s]+)\s*$') {
            $checksum = $Matches[1]; $filename = $Matches[2]
            if ($filename -match ('^node-v24\.\d+\.\d+-' + [regex]::Escape($platform) + '\.zip$')) {
                [PSCustomObject]@{ Checksum = $checksum; Filename = $filename }
            }
        }
    })
    if ($releaseRows.Count -ne 1) { throw "Distribuicao oficial Node 24 indisponivel para $platform." }
    $filename = $releaseRows[0].Filename
    $top = $filename.Substring(0, $filename.Length - 4)
    $version = $top.Substring(5, $top.Length - 5 - $platform.Length - 1)
    $archive = Join-Path $stage $filename
    Get-OfficialFile "https://nodejs.org/dist/$version/$filename" $archive
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $releaseRows[0].Checksum) { throw 'SHA-256 divergente; arquivo recusado.' }
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
        if ($zip.Entries.Count -eq 0) { throw 'Arquivo ZIP vazio.' }
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName
            if ($name -ne "$top/" -and -not $name.StartsWith("$top/", [StringComparison]::Ordinal)) { throw 'ZIP contem caminhos fora da distribuicao.' }
            if ($name.Contains('\') -or (($name -split '/') -contains '..') -or ($name -match ':') -or (($entry.ExternalAttributes -shr 16 -band 0xF000) -eq 0xA000)) { throw 'ZIP contem caminho ou link inseguro.' }
        }
    } finally { $zip.Dispose() }
    $unpack = Join-Path $stage 'unpack'
    Expand-Archive -LiteralPath $archive -DestinationPath $unpack
    $installation = Join-Path $unpack $top
    $node = Join-Path $installation 'node.exe'
    if (-not (Test-Node $node) -or -not (Test-Npm $node (Join-Path $installation 'node_modules/npm/bin/npm-cli.js') $true)) { throw 'Node/npm extraidos falharam na verificacao.' }
    $target = Join-Path $platformCache $version
    Assert-Directory $target
    if (Test-Path -LiteralPath $target) {
        $backup = Join-Path $stage 'previous'
        [IO.Directory]::Move($target, $backup)
    }
    [IO.Directory]::Move($installation, $target)
    $node = Join-Path $target 'node.exe'
    if ($null -ne $stage) { Remove-Item -LiteralPath $stage -Recurse -Force; $stage = $null }
    Invoke-Setup $node
} catch {
    Write-Error "bootstrap: $($_.Exception.Message)" -ErrorAction Continue
    exit 1
} finally {
    if ($backup -and (Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $target)) { [IO.Directory]::Move($backup, $target) }
    if ($stage -and (Test-Path -LiteralPath $stage)) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
