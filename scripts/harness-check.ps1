$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host 'Running SellGenius harness check...'
Write-Host

function Invoke-BashCheck {
  param([string]$Script)
  bash "./scripts/$Script"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  Write-Host
}

Invoke-BashCheck 'docs-check'
Invoke-BashCheck 'architecture-check'
Invoke-BashCheck 'plans-check'
Invoke-BashCheck 'tasks-check'

& "$PSScriptRoot/stack-check-node.ps1"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host
Write-Host 'HARNESS CHECK PASSED'
