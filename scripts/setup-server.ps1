# AsforceS Voice v2 - Server Setup Script
# This script sets up a fresh Linux server for AsforceS Voice deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerHost,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$ServerPort = "22",
    
    [Parameter(Mandatory=$false)]
    [string]$DeployUser = "deploy",
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = ""
)

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
    
    & plink $plinkArgs
}

Write-Host "Setting up server: $ServerHost" -ForegroundColor Cyan

# Update system
Write-Host "`n===> Updating system packages" -ForegroundColor Cyan
Invoke-RemoteCommand "apt-get update && apt-get upgrade -y"

# Install Docker
Write-Host "`n===> Installing Docker" -ForegroundColor Cyan
$dockerInstall = @"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
rm get-docker.sh
"@

Invoke-RemoteCommand $dockerInstall

# Install Docker Compose
Write-Host "`n===> Installing Docker Compose" -ForegroundColor Cyan
Invoke-RemoteCommand "curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"

# Create deploy user
Write-Host "`n===> Creating deploy user" -ForegroundColor Cyan
Invoke-RemoteCommand "useradd -m -s /bin/bash $DeployUser && usermod -aG docker $DeployUser"

# Setup firewall
Write-Host "`n===> Configuring firewall" -ForegroundColor Cyan
$firewallRules = @"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp
ufw --force enable
"@

Invoke-RemoteCommand $firewallRules

# Install Certbot
if ($Domain) {
    Write-Host "`n===> Installing Certbot" -ForegroundColor Cyan
    Invoke-RemoteCommand "apt-get install -y certbot"
    
    Write-Host "`n===> Obtaining SSL certificate for $Domain" -ForegroundColor Cyan
    Invoke-RemoteCommand "certbot certonly --standalone -d $Domain --non-interactive --agree-tos --email admin@$Domain"
}

# Create deployment directory
Write-Host "`n===> Creating deployment directory" -ForegroundColor Cyan
Invoke-RemoteCommand "mkdir -p /var/www/asforces && chown -R $DeployUser:$DeployUser /var/www/asforces"

Write-Host "`n✓ Server setup completed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Copy your SSH key to the deploy user: ssh-copy-id $DeployUser@$ServerHost"
Write-Host "2. Run the deployment script: .\scripts\deploy.ps1 -ServerHost $ServerHost -ServerUser $DeployUser"


