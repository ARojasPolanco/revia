param(
  [int[]]$Ports = @(3000, 3001, 4000)
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoPattern = [regex]::Escape($repoRoot)
$stopped = New-Object System.Collections.Generic.List[string]
$killed = @{}

function Get-RepoProcessRoot {
  param([int]$ProcessId)

  $current = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  $match = $null
  $depth = 0

  while ($current -and $depth -lt 12) {
    if ($current.CommandLine -and $current.CommandLine -match $repoPattern) {
      $match = $current
    }

    if (-not $current.ParentProcessId -or $current.ParentProcessId -eq 0) {
      break
    }

    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($current.ParentProcessId)" -ErrorAction SilentlyContinue
    $depth++
  }

  return $match
}

foreach ($port in $Ports) {
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue

  if (-not $listeners) {
    Write-Output "Puerto $port libre."
    continue
  }

  foreach ($listener in $listeners) {
    $target = Get-RepoProcessRoot -ProcessId $listener.OwningProcess

    if (-not $target) {
      Write-Warning "Puerto $port ocupado por un proceso ajeno al proyecto. No se tocó."
      continue
    }

    if ($killed.ContainsKey($target.ProcessId)) {
      continue
    }

    $killed[$target.ProcessId] = $true
    taskkill /PID $target.ProcessId /T /F | Out-Null

    if ($LASTEXITCODE -eq 0) {
      $stopped.Add("$port (PID $($target.ProcessId))")
    } else {
      Write-Warning "No se pudo detener el proceso del puerto $port (PID $($target.ProcessId))."
    }
  }
}

if ($stopped.Count -gt 0) {
  Write-Output "Puertos liberados: $($stopped -join ', ')"
} else {
  Write-Output 'No había procesos del proyecto escuchando en los puertos.'
}

$nextDir = Join-Path $repoRoot 'apps/web/.next'

if (Test-Path -LiteralPath $nextDir) {
  Remove-Item -LiteralPath $nextDir -Recurse -Force
  Write-Output 'Cache .next eliminada.'
}
