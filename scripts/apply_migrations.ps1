$envFile = '.env.local'
if (-Not (Test-Path $envFile)) {
  Write-Error ".env.local not found in project root. Aborting."
  exit 1
}

Write-Host "Loading environment variables from $envFile"
$lines = Get-Content $envFile -Raw
$lines -split "\r?\n" | ForEach-Object {
  if ($_ -match '^[\s#]*([^=\s]+)=(.*)$') {
    $k = $matches[1].Trim()
    $v = $matches[2].Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1,$v.Length-2) }
    [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
  }
}

Write-Host "Environment variables set. Applying migrations..."

# Apply pending migrations non-interactively
npx prisma migrate deploy --schema=prisma/schema.prisma
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { Write-Error "prisma migrate deploy failed with exit code $exitCode"; exit $exitCode }

Write-Host "Migrations applied. Generating Prisma Client..."
npx prisma generate
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { Write-Error "prisma generate failed with exit code $exitCode"; exit $exitCode }

Write-Host "Done."
