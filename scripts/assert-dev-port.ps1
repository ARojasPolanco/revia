param(
  [Parameter(Mandatory = $true)]
  [int]$Port
)

$connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $connection) {
  exit 0
}

$process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
$command = if ($process) { $process.CommandLine } else { 'proceso desconocido' }

Write-Host "El puerto $Port ya esta en uso (PID $($connection.OwningProcess))." -ForegroundColor Red
Write-Host "No se inicio el servidor para evitar un puerto duplicado." -ForegroundColor Red
Write-Host "Usa 'npm run dev:free' para liberar los puertos o 'npm run dev:all' para levantar API y web juntos." -ForegroundColor Yellow
Write-Host "Proceso: $command" -ForegroundColor DarkGray
exit 1
