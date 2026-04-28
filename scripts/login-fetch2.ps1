$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = 'admin@taller-ar.com'; password='Admin2026Secure!' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $s -ErrorAction Stop
  Write-Output "LOGIN OK"
  $orders = Invoke-RestMethod -Uri 'http://localhost:3000/api/orders' -WebSession $s -ErrorAction Stop
  Write-Output ("ORDERS TYPE: " + $orders.GetType().FullName)
  if ($orders -is [System.Array]) { Write-Output ("ORDERS COUNT: " + $orders.Length) } else { Write-Output ("ORDERS NON-ARRAY: " + ($orders | ConvertTo-Json -Depth 5)) }
  $users = Invoke-RestMethod -Uri 'http://localhost:3000/api/users' -WebSession $s -ErrorAction Stop
  Write-Output ("USERS TYPE: " + $users.GetType().FullName)
  if ($users -is [System.Array]) { Write-Output ("USERS COUNT: " + $users.Length) } else { Write-Output ("USERS NON-ARRAY: " + ($users | ConvertTo-Json -Depth 5)) }
} catch {
  Write-Output "ERROR"
  $_ | Format-List * -Force
}
