# AsforceS Voice v2 - Deployment Script (PowerShell + plink)
# This script automates deployment to a remote Linux server using plink (PuTTY Link)

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$ServerHost = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "deploy",
    
    [Parameter(Mandatory=$false)]
    [string]$ServerPort = "22",
    
    [Parameter(Mandatory=$false)]
    [string]$DeployPath = "/var/www/asforces",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipMigrations = $false
)

# Colors for output
$ErrorColor = "Red"
$WarningColor = "Yellow"
$SuccessColor = "Green"
$InfoColor = "Cyan"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "`n===> $Message" $InfoColor
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" $SuccessColor
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" $ErrorColor
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" $WarningColor
}

# Load environment variables
function Load-EnvironmentVariables {
    $envFile = ".env.$Environment"
    if (Test-Path $envFile) {
        Write-Step "Loading environment variables from $envFile"
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
        Write-Success "Environment variables loaded"
    } else {
        Write-Warning "Environment file $envFile not found, using defaults"
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Checking prerequisites"
    
    # Check if plink is available
    if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
        Write-Error "plink not found. Please install PuTTY"
        exit 1
    }
    
    # Check if pscp is available
    if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
        Write-Error "pscp not found. Please install PuTTY"
        exit 1
    }
    
    # Check if docker-compose is available locally (for build)
    if (-not $SkipBuild -and -not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "docker-compose not found"
        exit 1
    }
    
    Write-Success "All prerequisites met"
}

# Execute remote command
function Invoke-RemoteCommand {
    param([string]$Command)
    
    $plinkArgs = @(
        "-ssh",
        "-P", $ServerPort,
        "-l", $ServerUser,
        "-batch",
        $ServerHost,
        $Command
    )
    
    $output = & plink $plinkArgs 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        Write-Error "Remote command failed with exit code $exitCode"
        Write-Host $output
        return $false
    }
    
    return $true
}

# Copy file to remote server
function Copy-ToRemote {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    Write-Host "Copying $LocalPath to ${ServerUser}@${ServerHost}:${RemotePath}"
    
    $pscpArgs = @(
        "-P", $ServerPort,
        "-batch",
        "-r",
        $LocalPath,
        "${ServerUser}@${ServerHost}:${RemotePath}"
    )
    
    & pscp $pscpArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "File copy failed"
        return $false
    }
    
    return $true
}

# Build Docker images
function Build-DockerImages {
    if ($SkipBuild) {
        Write-Warning "Skipping build"
        return $true
    }
    
    Write-Step "Building Docker images"
    
    try {
        docker-compose build --no-cache
        Write-Success "Docker images built successfully"
        return $true
    } catch {
        Write-Error "Docker build failed: $_"
        return $false
    }
}

# Create backup on remote server
function New-RemoteBackup {
    if ($SkipBackup) {
        Write-Warning "Skipping backup"
        return $true
    }
    
    Write-Step "Creating backup on remote server"
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$DeployPath/backups/backup_$timestamp"
    
    $commands = @(
        "mkdir -p $DeployPath/backups",
        "if [ -d $DeployPath/current ]; then cp -r $DeployPath/current $backupPath; fi",
        "echo 'Backup created at $backupPath'"
    )
    
    foreach ($cmd in $commands) {
        if (-not (Invoke-RemoteCommand $cmd)) {
            Write-Error "Backup failed"
            return $false
        }
    }
    
    Write-Success "Backup created: $backupPath"
    return $true
}

# Deploy files to remote server
function Deploy-Files {
    Write-Step "Deploying files to remote server"
    
    # Create deploy directory structure
    $commands = @(
        "mkdir -p $DeployPath/current",
        "mkdir -p $DeployPath/releases",
        "mkdir -p $DeployPath/backups"
    )
    
    foreach ($cmd in $commands) {
        if (-not (Invoke-RemoteCommand $cmd)) {
            return $false
        }
    }
    
    # Copy docker-compose and config files
    $filesToCopy = @(
        "docker-compose.yml",
        "nginx",
        "coturn",
        ".env.$Environment"
    )
    
    foreach ($file in $filesToCopy) {
        if (Test-Path $file) {
            if (-not (Copy-ToRemote $file "$DeployPath/current/")) {
                return $false
            }
        }
    }
    
    # Rename env file
    Invoke-RemoteCommand "mv $DeployPath/current/.env.$Environment $DeployPath/current/.env"
    
    Write-Success "Files deployed successfully"
    return $true
}

# Run database migrations
function Invoke-DatabaseMigrations {
    if ($SkipMigrations) {
        Write-Warning "Skipping migrations"
        return $true
    }
    
    Write-Step "Running database migrations"
    
    $cmd = "cd $DeployPath/current && docker-compose run --rm api pnpm prisma:migrate:deploy"
    
    if (Invoke-RemoteCommand $cmd) {
        Write-Success "Migrations completed"
        return $true
    } else {
        Write-Error "Migrations failed"
        return $false
    }
}

# Start/Restart services
function Start-Services {
    Write-Step "Starting services"
    
    $commands = @(
        "cd $DeployPath/current",
        "docker-compose pull",
        "docker-compose up -d --remove-orphans",
        "docker-compose ps"
    )
    
    foreach ($cmd in $commands) {
        if (-not (Invoke-RemoteCommand $cmd)) {
            Write-Error "Failed to start services"
            return $false
        }
    }
    
    Write-Success "Services started successfully"
    return $true
}

# Health check
function Test-Deployment {
    Write-Step "Running health checks"
    
    Start-Sleep -Seconds 10
    
    $cmd = "curl -f http://localhost:3000/health || echo 'Health check failed'"
    
    if (Invoke-RemoteCommand $cmd) {
        Write-Success "Health check passed"
        return $true
    } else {
        Write-Warning "Health check failed - check logs"
        return $false
    }
}

# Rollback deployment
function Invoke-Rollback {
    Write-Warning "Rolling back deployment"
    
    $cmd = "cd $DeployPath && ls -t backups/ | head -1"
    $latestBackup = Invoke-RemoteCommand $cmd
    
    if ($latestBackup) {
        $commands = @(
            "rm -rf $DeployPath/current",
            "cp -r $DeployPath/backups/$latestBackup $DeployPath/current",
            "cd $DeployPath/current && docker-compose up -d"
        )
        
        foreach ($cmd in $commands) {
            Invoke-RemoteCommand $cmd
        }
        
        Write-Success "Rolled back to $latestBackup"
    } else {
        Write-Error "No backup found for rollback"
    }
}

# Main deployment flow
function Start-Deployment {
    Write-ColorOutput "`n╔════════════════════════════════════════╗" $InfoColor
    Write-ColorOutput "║   AsforceS Voice v2 - Deployment      ║" $InfoColor
    Write-ColorOutput "║   Environment: $Environment            ║" $InfoColor
    Write-ColorOutput "╚════════════════════════════════════════╝`n" $InfoColor
    
    # Validate required parameters
    if (-not $ServerHost) {
        Write-Error "ServerHost parameter is required"
        exit 1
    }
    
    # Load environment variables
    Load-EnvironmentVariables
    
    # Check prerequisites
    Test-Prerequisites
    
    # Build images (optional)
    if (-not (Build-DockerImages)) {
        exit 1
    }
    
    # Create backup
    if (-not (New-RemoteBackup)) {
        Write-Warning "Backup failed, but continuing deployment"
    }
    
    # Deploy files
    if (-not (Deploy-Files)) {
        Write-Error "Deployment failed"
        exit 1
    }
    
    # Run migrations
    if (-not (Invoke-DatabaseMigrations)) {
        Write-Error "Migrations failed - consider rollback"
        $response = Read-Host "Rollback? (y/n)"
        if ($response -eq 'y') {
            Invoke-Rollback
        }
        exit 1
    }
    
    # Start services
    if (-not (Start-Services)) {
        Write-Error "Failed to start services - rolling back"
        Invoke-Rollback
        exit 1
    }
    
    # Health check
    if (-not (Test-Deployment)) {
        Write-Warning "Health check failed, but deployment completed"
    }
    
    Write-ColorOutput "`n╔════════════════════════════════════════╗" $SuccessColor
    Write-ColorOutput "║   Deployment completed successfully!   ║" $SuccessColor
    Write-ColorOutput "╚════════════════════════════════════════╝`n" $SuccessColor
}

# Run deployment
Start-Deployment


