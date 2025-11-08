# AsforceS Voice v2 - Production Deployment to 5.133.102.49
# PLINK ile dosya transferi ve deployment

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$FirstTime = $false
)

$ServerHost = "5.133.102.49"
$ServerUser = "root"
$ServerPort = "22"
$Domain = "asforces.com"
$DeployPath = "/var/www/asforces"

# Colors
$ErrorColor = "Red"
$WarningColor = "Yellow"
$SuccessColor = "Green"
$InfoColor = "Cyan"

function Write-Step {
    param([string]$Message)
    Write-Host "`n===> $Message" -ForegroundColor $InfoColor
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $SuccessColor
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $ErrorColor
}

# Check prerequisites
Write-Step "Checking prerequisites"
if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Error-Message "plink not found. Please install PuTTY"
    exit 1
}

if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
    Write-Error-Message "pscp not found. Please install PuTTY"
    exit 1
}

Write-Success "Prerequisites OK"

# First time setup
if ($FirstTime) {
    Write-Step "First time setup - Installing Docker and dependencies"
    
    $setupCommands = @"
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-`$(uname -s)-`$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Certbot
apt-get install -y certbot

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp
ufw --force enable

# Create deployment directory
mkdir -p $DeployPath
"@

    Write-Host "Executing setup commands on server..." -ForegroundColor Yellow
    $setupCommands | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Server setup completed"
    } else {
        Write-Error-Message "Server setup failed"
        exit 1
    }
}

# Build locally (optional)
if (-not $SkipBuild) {
    Write-Step "Building project locally"
    
    try {
        # Clean
        Write-Host "Cleaning previous builds..."
        if (Test-Path "dist") { Remove-Item -Recurse -Force dist }
        
        # Install dependencies
        Write-Host "Installing dependencies..."
        pnpm install --frozen-lockfile
        
        Write-Success "Build completed"
    } catch {
        Write-Error-Message "Build failed: $_"
        exit 1
    }
}

# Create deployment package
Write-Step "Creating deployment package"

$tempDir = "deploy-temp"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy necessary files
$filesToCopy = @(
    "docker-compose.yml",
    ".env.production",
    "nginx",
    "coturn",
    "apps/api",
    "apps/web",
    "packages",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json"
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        $dest = Join-Path $tempDir $file
        $destDir = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $file -Destination $dest -Recurse -Force
    }
}

Write-Success "Deployment package created"

# Transfer files to server
Write-Step "Transferring files to server (this may take a few minutes)"

pscp -P $ServerPort -r -batch "$tempDir\*" "${ServerUser}@${ServerHost}:${DeployPath}/"

if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "File transfer failed"
    Remove-Item -Recurse -Force $tempDir
    exit 1
}

Write-Success "Files transferred successfully"

# Cleanup local temp
Remove-Item -Recurse -Force $tempDir

# Rename .env file on server
Write-Step "Configuring environment"
plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost "cd $DeployPath && mv .env.production .env"

# Update nginx configuration for domain
Write-Step "Updating Nginx configuration for $Domain"

$nginxUpdate = @"
cd $DeployPath/nginx/conf.d
sed -i 's/yourdomain.com/$Domain/g' asforce.conf
"@

$nginxUpdate | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost

# Obtain SSL certificate
Write-Step "Obtaining SSL certificate for $Domain"

Write-Host "Make sure DNS is pointing to this server!" -ForegroundColor Yellow
$response = Read-Host "Continue with SSL certificate? (y/n)"

if ($response -eq 'y') {
    $certCommand = @"
certbot certonly --standalone -d $Domain -d www.$Domain --non-interactive --agree-tos --email admin@$Domain
"@
    
    $certCommand | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSL certificate obtained"
    } else {
        Write-Warning "SSL certificate failed - will use self-signed or manual setup"
    }
}

# Start services
Write-Step "Starting Docker services"

$startCommands = @"
cd $DeployPath
docker-compose down
docker-compose pull
docker-compose up -d --build
sleep 10
docker-compose ps
"@

$startCommands | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost

if ($LASTEXITCODE -eq 0) {
    Write-Success "Services started successfully"
} else {
    Write-Error-Message "Failed to start services"
    exit 1
}

# Run migrations
Write-Step "Running database migrations"

$migrateCommand = @"
cd $DeployPath
docker-compose exec -T api sh -c "cd apps/api && pnpm prisma migrate deploy"
"@

$migrateCommand | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost

# Health check
Write-Step "Running health check"
Start-Sleep -Seconds 5

$healthCommand = "curl -f http://localhost:3000/health"
$healthCommand | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost

if ($LASTEXITCODE -eq 0) {
    Write-Success "Health check passed"
} else {
    Write-Warning "Health check failed - check logs with: docker-compose logs"
}

# Show logs
Write-Step "Recent logs:"
"cd $DeployPath && docker-compose logs --tail=50" | plink -ssh -P $ServerPort -l $ServerUser -batch $ServerHost

# Final summary
Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Deployment Completed Successfully! 🎉          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nDeployment Information:" -ForegroundColor Cyan
Write-Host "- Server: $ServerHost" -ForegroundColor White
Write-Host "- Domain: https://$Domain" -ForegroundColor White
Write-Host "- API: https://$Domain/api" -ForegroundColor White
Write-Host "- WebSocket: wss://$Domain" -ForegroundColor White
Write-Host "`nUseful Commands:" -ForegroundColor Yellow
Write-Host "- View logs: plink -ssh -P $ServerPort -l $ServerUser $ServerHost 'cd $DeployPath && docker-compose logs -f'" -ForegroundColor Gray
Write-Host "- Restart: plink -ssh -P $ServerPort -l $ServerUser $ServerHost 'cd $DeployPath && docker-compose restart'" -ForegroundColor Gray
Write-Host "- Stop: plink -ssh -P $ServerPort -l $ServerUser $ServerHost 'cd $DeployPath && docker-compose down'" -ForegroundColor Gray
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Point your DNS A records to $ServerHost" -ForegroundColor White
Write-Host "2. Configure your email SMTP settings in .env" -ForegroundColor White
Write-Host "3. Enable CAPTCHA (optional) with Cloudflare Turnstile" -ForegroundColor White
Write-Host "4. Test the application at https://$Domain" -ForegroundColor White
