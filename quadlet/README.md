# Ghost Container Configuration

This directory contains Pkl configuration files for deploying the Ghost blog in different environments using Podman.

**Note:** The default configuration uses "ellebphotos" as the instance name. To customize for your own deployment, see the [Customizing Instance Names](#customizing-instance-names) section.

## Table of Contents

- [Files](#files)
- [Configuration](#configuration)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Modifying Configuration](#modifying-configuration)
- [Theme Development](#theme-development)
- [Troubleshooting](#troubleshooting)
- [Backup and Restore](#backup-and-restore)

## Files

### Active Configuration (Pkl-based)
- `base.pkl` - Base configuration with shared settings
- `dev.pkl` - Development environment configuration
- `prod.pkl` - Production environment configuration
- `prod-kube.pkl` - Production Quadlet systemd unit file generator
- `quadlet.pkl` - Quadlet configuration utilities
- `dev.yaml` - Generated k8s YAML for development (auto-generated)
- `prod.yaml` - Generated k8s YAML for production (auto-generated)
- `generate.sh` - Script to generate configuration files

### Scripts
- `dev-ghost.sh` - Development helper script (start, stop, restart, logs, etc.)
- `generate.sh` - Generate Pkl configuration files

## Configuration

The configuration uses official Docker images (`docker.io/library/mysql` and `docker.io/library/ghost`).

### Development vs Production

#### Development (`dev.yaml`)
- NODE_ENV: development
- URL: Configurable (e.g., ngrok tunnel)
- **Theme volume**: Mounts theme directory directly into container for live editing
- **Config file**: Mounts `ghost-config.development.json` for persistent settings
- Port: 3050 (configurable)

#### Production (`prod.yaml`)
- NODE_ENV: production
- URL: Your production domain
- No theme volume mount (theme is part of the ghost volume)
- No config file mount (uses environment variables only)
- Port: 3050 (configurable)

### Customizing Instance Names

The configuration uses "ellebphotos" as the default instance name. To customize for your own deployment:

1. Edit `dev.pkl` and/or `prod.pkl` and uncomment the override section:
   ```pkl
   instanceName = "myghostinstance"
   secretName = "myghostinstance_secrets"
   mysqlUser = "myghostuser"
   mysqlDatabase = "myghostinstance_db"
   ```

2. If deploying to production, also update `prod-kube.pkl` to match:
   ```pkl
   local instanceName: String = "myghostinstance"
   ```

3. Create secrets using your configured secret name (see [Secrets Setup](#secrets-setup))

4. Regenerate configuration files:
   ```bash
   ./generate.sh development
   ./generate.sh production
   ```

### Generating Configuration Files

Use the provided script to regenerate configuration files:

```bash
# Generate dev configuration
./generate.sh development

# Generate prod configuration (k8s YAML + Quadlet files)
./generate.sh production
```

Or run the Pkl commands directly:

```bash
# Generate dev configuration
pkl eval -f yaml dev.pkl -o dev.yaml

# Generate prod configuration
pkl eval -f yaml prod.pkl -o prod.yaml
pkl eval prod-kube.pkl -o {instanceName}-prod.kube
```

## Development Setup

### Prerequisites

- Podman installed (with Podman Machine on macOS)
- Pkl CLI installed
- Port 3050 available

### Secrets Setup

The Ghost container requires database credentials stored as Podman secrets.

**Note:** The examples below use "myghostinstance_secrets" as the secret name. The default configuration uses "elleb_photos_secrets". Use your configured secret name.

#### Method 1: Create from environment file

```bash
# Create a secrets file (don't commit this to git!)
cat > /tmp/ghost-secrets.env << 'EOF'
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_ROOT_PASSWORD=your_mysql_root_password_here
EOF

# Create the Podman secret
podman secret create myghostinstance_secrets /tmp/ghost-secrets.env

# Clean up the temporary file
rm /tmp/ghost-secrets.env
```

#### Method 2: Create from stdin

```bash
podman secret create myghostinstance_secrets - << 'EOF'
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_ROOT_PASSWORD=your_mysql_root_password_here
EOF
```

#### Verify secrets exist

```bash
podman secret ls
```

You should see `myghostinstance_secrets` (or your configured name) in the list.

#### Update secrets

To update secrets, you need to remove and recreate them:

```bash
# Remove existing secret
podman secret rm myghostinstance_secrets

# Recreate with new values
podman secret create myghostinstance_secrets - << 'EOF'
MYSQL_PASSWORD=new_password
MYSQL_ROOT_PASSWORD=new_root_password
EOF
```

### Podman Machine Volume Mount (macOS)

If you're on macOS and want to mount your theme directory, you need to set up a systemd mount unit in the Podman VM:

1. Create the mount unit inside the Podman VM
2. The mount should persist across machine restarts
3. Location: `/etc/systemd/system/path-to-repos.mount` inside the VM

### Running Ghost in Development

#### Using the dev-ghost.sh script

```bash
cd quadlet

# Start Ghost
./dev-ghost.sh start

# Stop Ghost
./dev-ghost.sh stop

# Restart Ghost
./dev-ghost.sh restart

# View logs
./dev-ghost.sh logs

# Check status
./dev-ghost.sh status

# Regenerate configuration
./dev-ghost.sh regenerate
```

Access Ghost:
- Site: http://localhost:3050
- Admin: http://localhost:3050/ghost

#### Manual Commands

```bash
# Create secrets if they don't exist (see Secrets Setup above)

# Create volumes if they don't exist
podman volume create myghostinstance_db
podman volume create myghostinstance_ghost

# Run the pod
podman play kube dev.yaml

# Stop the pod
podman play kube --down dev.yaml
```

## Production Deployment

This section covers deploying Ghost to your VPS using Podman Quadlet (systemd integration).

**Note:** The examples use "myghostinstance" as the instance name. The default configuration uses "ellebphotos". If you've customized the instance name in your Pkl files, replace "myghostinstance" with your configured name.

### Prerequisites

On your VPS:
- Podman installed (version 4.4+)
- Systemd available
- Port 3050 available (or configure a reverse proxy)

### Deployment Steps

#### 1. Copy Files to VPS

Transfer the necessary files to your VPS:

```bash
# On your local machine
scp prod.yaml your-vps:/home/user/quadlet/
scp myghostinstance-prod.kube your-vps:/home/user/quadlet/
scp myghostinstance_db.volume your-vps:/home/user/quadlet/
scp myghostinstance_ghost.volume your-vps:/home/user/quadlet/
```

Or clone the repository on the VPS and regenerate:

```bash
# On VPS
git clone <repo-url>
cd your-ghost-repo/quadlet
./generate.sh production
```

#### 2. Set Up Quadlet Directory

Quadlet looks for unit files in specific directories:

```bash
# On VPS - create user quadlet directory
mkdir -p ~/.config/containers/systemd

# Copy files to quadlet directory
cp prod.yaml ~/.config/containers/systemd/
cp myghostinstance-prod.kube ~/.config/containers/systemd/
cp myghostinstance_db.volume ~/.config/containers/systemd/
cp myghostinstance_ghost.volume ~/.config/containers/systemd/
```

#### 3. Create Secrets

Create Podman secrets for database credentials:

```bash
# On VPS
podman secret create myghostinstance_secrets - << 'EOF'
MYSQL_PASSWORD=your_secure_mysql_password_here
MYSQL_ROOT_PASSWORD=your_secure_root_password_here
EOF
```

**Important**: Use strong, unique passwords and store them securely (password manager).

#### 4. Reload Systemd and Start Service

```bash
# Reload systemd to pick up new quadlet files
systemctl --user daemon-reload

# Enable and start the service
systemctl --user enable myghostinstance-prod.service
systemctl --user start myghostinstance-prod.service

# Check status
systemctl --user status myghostinstance-prod.service
```

#### 5. Verify Deployment

```bash
# Check pod status
podman pod ps

# Check containers in the pod
podman ps --filter pod=myghostinstance

# View logs
podman logs myghostinstance-site
podman logs myghostinstance-db

# Test Ghost is responding
curl http://localhost:3050
```

#### 6. Configure Reverse Proxy (Recommended)

Set up nginx or Caddy to proxy to Ghost on port 3050:

**Nginx example:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy example:**
```
yourdomain.com {
    reverse_proxy localhost:3050
}
```

### Updating the Production Deployment

#### Update Configuration

1. Edit `prod.pkl` or `base.pkl` locally
2. Regenerate files:
   ```bash
   ./generate.sh production
   ```
3. Copy updated files to VPS
4. Restart service:
   ```bash
   systemctl --user restart myghostinstance-prod.service
   ```

#### Update Images

Quadlet is configured with `AutoUpdate=registry`:

```bash
# On VPS - pull latest images
podman auto-update

# Or manually
systemctl --user restart myghostinstance-prod.service
```

### Production Monitoring

Enable user lingering so services run without being logged in:

```bash
loginctl enable-linger $USER
```

Check auto-update timer:

```bash
systemctl --user list-timers
```

## Modifying Configuration

To change configuration values:

1. Edit the relevant `.pkl` file (dev.pkl or prod.pkl for environment-specific, base.pkl for shared)
2. Regenerate the configuration: `./generate.sh development` (or `./generate.sh production`)
3. Restart the container with the new configuration

## Theme Development

In development mode, the theme directory is mounted directly from your host machine. Any changes you make to files in your repository will be immediately reflected in the running Ghost container.

**Theme Development Workflow:**

1. Start Ghost: `./dev-ghost.sh start`
2. Edit theme files in your editor
3. Refresh browser to see changes (CSS/template changes)
4. Restart Ghost for JavaScript changes: `./dev-ghost.sh restart`
5. Test thoroughly before deploying to production

The theme is mounted at: `/var/lib/ghost/content/themes/your-theme-name`

### Ghost Configuration File

The `ghost-config.development.json` file in the repo root is mounted into the dev container as `/var/lib/ghost/config.development.json`. This allows you to customize Ghost settings that persist across container restarts.

**What settings can I configure?**
- **URL**: The site URL (also set via environment variable, but config file takes precedence)
- **Mail**: SMTP settings for sending emails (password resets, member notifications)
- **Logging**: Log levels and transports
- **Storage**: Custom storage adapters (S3, Google Cloud Storage, etc.)
- **Database**: Connection settings (already configured via environment variables)

**Example mail configuration:**
```json
{
  "url": "https://yourdomain.ngrok.io",
  "mail": {
    "transport": "SMTP",
    "options": {
      "service": "Gmail",
      "auth": {
        "user": "your-email@gmail.com",
        "pass": "your-app-password"
      }
    }
  }
}
```

**Important notes:**
- The config file is in `.gitignore` - your local settings won't be committed
- Settings in the config file override environment variables
- Database settings (user, password, host) configured in admin panel are stored in the database volume and persist automatically

## Troubleshooting

### Volume mount not working (macOS)

If the theme directory doesn't appear:
```bash
# Check if mount is active in Podman VM
podman machine ssh <machine-name> "systemctl status path-to-repos.mount"

# If not active, restart the mount
podman machine ssh <machine-name> "sudo systemctl restart path-to-repos.mount"
```

### Database issues

The database persists in a Podman volume. To reset:
```bash
./dev-ghost.sh stop
podman volume rm myghostinstance_db myghostinstance_ghost
./dev-ghost.sh start  # Will recreate volumes
```

### Port conflicts

If port 3050 is in use, edit `dev.pkl` or `prod.pkl` and change `hostPort`, then regenerate and restart.

### Service won't start (Production)

```bash
# Check systemd status
systemctl --user status myghostinstance-prod.service

# Check journal logs
journalctl --user -u myghostinstance-prod.service -n 50
```

### Database connection issues (Production)

```bash
# Check database container logs
podman logs myghostinstance-db

# Verify secrets exist
podman secret ls
```

### Port already in use (Production)

```bash
# Check what's using port 3050
ss -tlnp | grep 3050

# Or change hostPort in prod.pkl and regenerate
```

## Backup and Restore

### Backup Volumes

```bash
# Backup database
podman volume export myghostinstance_db -o myghostinstance_db_backup.tar

# Backup Ghost content
podman volume export myghostinstance_ghost -o myghostinstance_ghost_backup.tar
```

### Restore Volumes

```bash
# Stop service first
systemctl --user stop myghostinstance-prod.service

# Restore volumes
podman volume import myghostinstance_db myghostinstance_db_backup.tar
podman volume import myghostinstance_ghost myghostinstance_ghost_backup.tar

# Restart service
systemctl --user start myghostinstance-prod.service
```
