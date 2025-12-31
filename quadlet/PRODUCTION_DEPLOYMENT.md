# Production Deployment Guide

This guide covers deploying the Ghost blog to your VPS using Podman Quadlet (systemd integration).

## Prerequisites

On your VPS:
- Podman installed (version 4.4+)
- Systemd available
- Port 3050 available (or configure a reverse proxy)

## Deployment Steps

### 1. Copy Files to VPS

Transfer the necessary files to your VPS:

```bash
# On your local machine
scp quadlet/prod.yaml your-vps:/home/user/quadlet/
scp quadlet/ellebphotos-prod.kube your-vps:/home/user/quadlet/
scp quadlet/ellebphotos_db.volume your-vps:/home/user/quadlet/
scp quadlet/ellebphotos_ghost.volume your-vps:/home/user/quadlet/
```

Or clone the repository on the VPS and regenerate:

```bash
# On VPS
git clone <repo-url>
cd elleb-photos-ghost/quadlet
pkl eval -f yaml prod.pkl -o prod.yaml
pkl eval prod-kube.pkl -o ellebphotos-prod.kube
```

### 2. Set Up Quadlet Directory

Quadlet looks for unit files in specific directories:

```bash
# On VPS - create user quadlet directory
mkdir -p ~/.config/containers/systemd

# Copy files to quadlet directory
cp prod.yaml ~/.config/containers/systemd/
cp ellebphotos-prod.kube ~/.config/containers/systemd/
cp ellebphotos_db.volume ~/.config/containers/systemd/
cp ellebphotos_ghost.volume ~/.config/containers/systemd/
```

### 3. Create Secrets

Create Podman secrets for database credentials:

```bash
# On VPS
podman secret create elleb_photos_secrets - << 'EOF'
MYSQL_PASSWORD=your_secure_mysql_password_here
MYSQL_ROOT_PASSWORD=your_secure_root_password_here
EOF
```

**Important**: Use strong, unique passwords and store them securely (password manager).

### 4. Reload Systemd and Start Service

```bash
# Reload systemd to pick up new quadlet files
systemctl --user daemon-reload

# Enable and start the service
systemctl --user enable ellebphotos-prod.service
systemctl --user start ellebphotos-prod.service

# Check status
systemctl --user status ellebphotos-prod.service
```

### 5. Verify Deployment

```bash
# Check pod status
podman pod ps

# Check containers in the pod
podman ps --filter pod=ellebphotos

# View logs
podman logs ellebphotos-site
podman logs ellebphotos-db

# Test Ghost is responding
curl http://localhost:3050
```

### 6. Configure Reverse Proxy (Recommended)

Set up nginx or Caddy to proxy to Ghost on port 3050:

**Nginx example:**
```nginx
server {
    listen 80;
    server_name www.elleb.photography;

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
www.elleb.photography {
    reverse_proxy localhost:3050
}
```

## Updating the Deployment

### Update Configuration

1. Edit `prod.pkl` or `base.pkl` locally
2. Regenerate files:
   ```bash
   pkl eval -f yaml prod.pkl -o prod.yaml
   pkl eval prod-kube.pkl -o ellebphotos-prod.kube
   ```
3. Copy updated files to VPS
4. Restart service:
   ```bash
   systemctl --user restart ellebphotos-prod.service
   ```

### Update Images

Quadlet is configured with `AutoUpdate=registry`:

```bash
# On VPS - pull latest images
podman auto-update

# Or manually
systemctl --user restart ellebphotos-prod.service
```

## Troubleshooting

### Service won't start
```bash
# Check systemd status
systemctl --user status ellebphotos-prod.service

# Check journal logs
journalctl --user -u ellebphotos-prod.service -n 50
```

### Database connection issues
```bash
# Check database container logs
podman logs ellebphotos-db

# Verify secrets exist
podman secret ls
```

### Port already in use
```bash
# Check what's using port 3050
ss -tlnp | grep 3050

# Or change hostPort in prod.pkl and regenerate
```

## Backup and Restore

### Backup Volumes

```bash
# Backup database
podman volume export ellebphotos_db -o ellebphotos_db_backup.tar

# Backup Ghost content
podman volume export ellebphotos_ghost -o ellebphotos_ghost_backup.tar
```

### Restore Volumes

```bash
# Stop service first
systemctl --user stop ellebphotos-prod.service

# Restore volumes
podman volume import ellebphotos_db ellebphotos_db_backup.tar
podman volume import ellebphotos_ghost ellebphotos_ghost_backup.tar

# Restart service
systemctl --user start ellebphotos-prod.service
```

## Monitoring

Enable user lingering so services run without being logged in:

```bash
loginctl enable-linger $USER
```

Check auto-update timer:

```bash
systemctl --user list-timers
```
