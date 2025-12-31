# Ghost Container Configuration

This directory contains Pkl configuration files for deploying the Ghost blog in different environments.

## Files

### Active Configuration (Pkl-based)
- `base.pkl` - Base configuration with shared settings
- `dev.pkl` - Development environment configuration
- `prod.pkl` - Production environment configuration
- `dev.yaml` - Generated k8s YAML for development (auto-generated)
- `prod.yaml` - Generated k8s YAML for production (auto-generated)

### Legacy Files (Reference Only)
These files were from the original Bitnami-based setup and are kept for reference:
- `ellebphotos.yaml` - Original production YAML (updated to use official images)
- `ellebphotos.kube` - Original Quadlet systemd file (now points to prod.yaml)
- `db.container` - Original database Quadlet file (updated to use official MySQL)
- `site.container` - Original Ghost Quadlet file
- `*.volume` - Original volume definitions

## Key Differences

### Development (`dev.yaml`)
- NODE_ENV: development
- URL: https://nozzlegear.ngrok.io (configurable)
- **Theme volume**: Mounts `/Users/nozzlegear/Repos/elleb-photos-ghost` directly into the container at `/var/lib/ghost/content/themes/elleb-photos`
  - This allows live editing of theme files without rebuilding
- **Config file**: Mounts `ghost-config.development.json` from repo root into the container at `/var/lib/ghost/config.development.json`
  - Allows customizing Ghost settings (mail, logging, etc.) that persist across container restarts
  - This file is in `.gitignore` so you can customize it locally without committing

### Production (`prod.yaml`)
- NODE_ENV: production
- URL: https://www.elleb.photography
- No theme volume mount (theme is part of the ghost volume)
- No config file mount (uses environment variables only)

## Usage

### Generate Configuration Files

Regenerate the environment-specific configuration files:

```bash
# Generate dev configuration
pkl eval -f yaml dev.pkl -o dev.yaml

# Generate prod configuration (k8s YAML + Quadlet files)
pkl eval -f yaml prod.pkl -o prod.yaml
pkl eval prod-kube.pkl -o ellebphotos-prod.kube

# Generate all at once
pkl eval -f yaml dev.pkl -o dev.yaml && \
pkl eval -f yaml prod.pkl -o prod.yaml && \
pkl eval prod-kube.pkl -o ellebphotos-prod.kube
```

### Run in development

```bash
# Create secrets if they don't exist
podman secret create elleb_photos_secrets --from-file=MYSQL_PASSWORD=<(echo "your_password")
podman secret create elleb_photos_secrets --from-file=MYSQL_ROOT_PASSWORD=<(echo "your_root_password")

# Create volumes if they don't exist
podman volume create ellebphotos_db
podman volume create ellebphotos_ghost

# Run the pod
podman play kube dev.yaml

# Stop the pod
podman play kube --down dev.yaml
```

### Run in production

For production deployment on your VPS using Podman Quadlet, see **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** for detailed instructions.

Quick overview:
```bash
# On VPS - copy Quadlet files to systemd directory
mkdir -p ~/.config/containers/systemd
cp prod.yaml ellebphotos-prod.kube *.volume ~/.config/containers/systemd/

# Create secrets
podman secret create elleb_photos_secrets /path/to/secrets/file

# Enable and start service
systemctl --user daemon-reload
systemctl --user enable ellebphotos-prod.service
systemctl --user start ellebphotos-prod.service
```

## Modifying Configuration

To change configuration values:

1. Edit the relevant `.pkl` file (dev.pkl or prod.pkl for environment-specific, base.pkl for shared)
2. Regenerate the YAML: `pkl eval -f yaml dev.pkl -o dev.yaml`
3. Restart the container with the new configuration

## Theme Development

In development mode, the theme directory is mounted directly from your host machine. Any changes you make to files in this repository will be immediately reflected in the running Ghost container (after refreshing the page or restarting Ghost if needed).

The theme is mounted at: `/var/lib/ghost/content/themes/elleb-photos`

## Ghost Configuration File

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
  "url": "https://nozzlegear.ngrok.io",
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
