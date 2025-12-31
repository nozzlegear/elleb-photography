# Ghost Container Configuration

This directory contains Pkl configuration files for deploying the Ghost blog in different environments.

## Files

- `base.pkl` - Base configuration with shared settings
- `dev.pkl` - Development environment configuration
- `prod.pkl` - Production environment configuration
- `dev.yaml` - Generated k8s YAML for development (auto-generated)
- `prod.yaml` - Generated k8s YAML for production (auto-generated)
- `ellebphotos.kube` - Quadlet kube file for systemd integration

## Key Differences

### Development (`dev.yaml`)
- NODE_ENV: development
- URL: http://localhost:3050
- **Theme volume**: Mounts `/Users/nozzlegear/Repos/elleb-photos-ghost` directly into the container at `/var/lib/ghost/content/themes/elleb-photos`
  - This allows live editing of theme files without rebuilding

### Production (`prod.yaml`)
- NODE_ENV: production
- URL: https://www.elleb.photography
- No theme volume mount (theme is part of the ghost volume)

## Usage

### Generate YAML files

Regenerate the environment-specific YAML files:

```bash
# Generate dev configuration
pkl eval -f yaml dev.pkl -o dev.yaml

# Generate prod configuration
pkl eval -f yaml prod.pkl -o prod.yaml

# Generate both
pkl eval -f yaml dev.pkl -o dev.yaml && pkl eval -f yaml prod.pkl -o prod.yaml
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

```bash
# Use the Quadlet systemd integration
systemctl --user enable ellebphotos.service
systemctl --user start ellebphotos.service
```

## Modifying Configuration

To change configuration values:

1. Edit the relevant `.pkl` file (dev.pkl or prod.pkl for environment-specific, base.pkl for shared)
2. Regenerate the YAML: `pkl eval -f yaml dev.pkl -o dev.yaml`
3. Restart the container with the new configuration

## Theme Development

In development mode, the theme directory is mounted directly from your host machine. Any changes you make to files in this repository will be immediately reflected in the running Ghost container (after refreshing the page or restarting Ghost if needed).

The theme is mounted at: `/var/lib/ghost/content/themes/elleb-photos`
