param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root 'src\Taller.Web'
$database = 'TallerAutomotriz_Test_' + [Guid]::NewGuid().ToString('N')
$artifacts = Join-Path $root '.artifacts'
New-Item -ItemType Directory -Path $artifacts -Force | Out-Null
$previousConnection = $env:ConnectionStrings__Taller
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
$previousDataDirectory = $env:Taller__DataDirectory
try {
    $env:ConnectionStrings__Taller = "Server=(localdb)\MSSQLLocalDB;Database=$database;Trusted_Connection=True;TrustServerCertificate=True"
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:Taller__DataDirectory = Join-Path $project "App_Data\Tests\$database"
    $process = Start-Process -FilePath 'dotnet' -ArgumentList @('bin\Debug\net8.0\Taller.Web.dll', '--urls', 'http://localhost:5181') -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $artifacts 'integration-server.log') -RedirectStandardError (Join-Path $artifacts 'integration-server-error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($process.HasExited) { throw 'El servidor de pruebas terminó. Revisa .artifacts/integration-server-error.log.' }
        try { $null = Invoke-WebRequest 'http://localhost:5181/api/auth/session' -UseBasicParsing; $ready = $true; break } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw 'El servidor de pruebas no respondió.' }
    & $Python (Join-Path $root 'tests\integration.py')
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de integración.' }
    Write-Output "Pruebas correctas. Base aislada: $database"
} finally {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    $env:ConnectionStrings__Taller = $previousConnection
    $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment
    $env:Taller__DataDirectory = $previousDataDirectory
    # Keep the isolated database for inspection; never drop a database automatically.
}
