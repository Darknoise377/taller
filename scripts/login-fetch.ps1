$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email='admin@taller-ar.com'; password='Admin2026Secure!' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $s -ErrorAction Stop
  Write-Output "LOGIN_OK"
  $orders = Invoke-RestMethod -Uri 'http://localhost:3000/api/orders' -WebSession $s -ErrorAction Stop
  Write-Output "ORDERS:"
  $orders | ConvertTo-Json -Depth 10
  $users = Invoke-RestMethod -Uri 'http://localhost:3000/api/users' -WebSession $s -ErrorAction Stop
  Write-Output "USERS:"
  $users | ConvertTo-Json -Depth 10
} catch {
  Write-Output "ERROR"
  $_ | Format-List * -Force
}
