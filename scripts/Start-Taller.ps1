param([int]$Port = 5180, [switch]$UiTest)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$previousConnection = $env:ConnectionStrings__Taller
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
$previousUrl = $env:Taller__PublicBaseUrl
$previousDataDirectory = $env:Taller__DataDirectory
try {
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:Taller__PublicBaseUrl = "http://localhost:$Port"
    if ($UiTest) {
        $database = 'TallerAutomotriz_UiTest_' + [Guid]::NewGuid().ToString('N')
        $env:ConnectionStrings__Taller = "Server=(localdb)\MSSQLLocalDB;Database=$database;Trusted_Connection=True;TrustServerCertificate=True"
        $env:Taller__DataDirectory = Join-Path $root "src\Taller.Web\App_Data\Tests\$database"
        Write-Output "Base aislada de revisión: $database"
    }
    Push-Location (Join-Path $root 'src\Taller.Web')
    try { & dotnet 'bin\Debug\net8.0\Taller.Web.dll' --urls "http://localhost:$Port" }
    finally { Pop-Location }
} finally {
    $env:ConnectionStrings__Taller = $previousConnection
    $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment
    $env:Taller__PublicBaseUrl = $previousUrl
    $env:Taller__DataDirectory = $previousDataDirectory
}
