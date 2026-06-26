$ErrorActionPreference = 'Stop'

if (-not (Test-Path '.harness/stack.env')) {
  Write-Error 'ERROR: missing .harness/stack.env'
  exit 1
}

Get-Content '.harness/stack.env' | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    Set-Variable -Name $matches[1].Trim() -Value $matches[2].Trim() -Scope Script
  }
}

if ($RUN_NODE_CHECKS -ne 'true') {
  Write-Host 'STACK CHECK PASSED'
  exit 0
}

if (-not (Test-Path 'package.json')) {
  Write-Error 'ERROR: RUN_NODE_CHECKS=true but package.json is missing'
  exit 1
}

Write-Host 'Running Node checks (PowerShell)...'

npm ci

if ($REQUIRE_LINT -eq 'true') {
  npm run lint
}

if ($REQUIRE_TYPECHECK -eq 'true') {
  npm run typecheck
}

if ($REQUIRE_TEST -eq 'true') {
  npm test
}

if ($REQUIRE_BUILD -eq 'true') {
  npm run build
}

Write-Host 'STACK CHECK PASSED'
