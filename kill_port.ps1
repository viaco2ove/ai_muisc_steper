# Force release port 8120
$tcp = Get-NetTCPConnection -LocalPort 8120 -ErrorAction SilentlyContinue
if ($tcp) {
    $pid = $tcp.OwningProcess
    Write-Host "Port 8120 owned by PID: $pid"
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Process: $($proc.ProcessName)"
        Stop-Process -Id $pid -Force
    } else {
        Write-Host "PID $pid not found in process table - zombie port"
    }
} else {
    Write-Host "Port 8120 is free"
}
