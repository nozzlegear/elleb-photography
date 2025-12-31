# Ghost Development Environment Setup Notes

## What Was Configured

This setup allows you to run Ghost locally for development with your theme files mounted directly from your repository.

**Migration from Bitnami**: This configuration uses official Docker images (`docker.io/library/mysql` and `docker.io/library/ghost`) instead of Bitnami images, as Bitnami is no longer publishing hardened containers. Legacy Bitnami configuration files are kept for reference but updated to use official images.

### Key Components

1. **Pkl Configuration Files** - Environment-specific configurations
   - `base.pkl` - Shared configuration
   - `dev.pkl` - Development settings (theme volume mount enabled)
   - `prod.pkl` - Production settings (theme in Ghost volume)

2. **Podman Machine Volume Mount**
   - Created systemd mount unit for `/Users/nozzlegear/Repos` in the Podman VM
   - Mount persists across machine restarts
   - Location: `/etc/systemd/system/Users-nozzlegear-Repos.mount` inside the VM

3. **Theme Volume Mount**
   - Host: `/Users/nozzlegear/Repos/elleb-photos-ghost`
   - Container: `/var/lib/ghost/content/themes/elleb-photos`
   - Changes to theme files on your Mac are immediately visible in the container

### How It Works

In development mode:
- Ghost runs in a Podman pod with MySQL database
- Your theme directory is mounted directly into the container
- Edit theme files locally, see changes in Ghost (may need refresh/restart)
- Port 3050 on localhost maps to Ghost's port 2368

## Usage

### Start Ghost Dev Environment
```bash
cd quadlet
./dev-ghost.sh start
```

Access:
- Site: http://localhost:3050
- Admin: http://localhost:3050/ghost

### Other Commands
```bash
./dev-ghost.sh stop       # Stop the container
./dev-ghost.sh restart    # Restart
./dev-ghost.sh logs       # View logs
./dev-ghost.sh status     # Check status
./dev-ghost.sh regenerate # Rebuild YAML from Pkl
```

### Making Configuration Changes

1. Edit the relevant `.pkl` file
2. Regenerate YAML: `./dev-ghost.sh regenerate`
3. Restart: `./dev-ghost.sh restart`

## Theme Development Workflow

1. Start Ghost: `./dev-ghost.sh start`
2. Edit theme files in your editor
3. Refresh browser to see changes (CSS/template changes)
4. Restart Ghost for JavaScript changes: `./dev-ghost.sh restart`
5. Test thoroughly before deploying to production

## Troubleshooting

### Volume mount not working
If the theme directory doesn't appear:
```bash
# Check if mount is active in Podman VM
podman machine ssh podracing "systemctl status Users-nozzlegear-Repos.mount"

# If not active, restart the mount
podman machine ssh podracing "sudo systemctl restart Users-nozzlegear-Repos.mount"
```

### Database issues
The database persists in a Podman volume. To reset:
```bash
./dev-ghost.sh stop
podman volume rm ellebphotos_db ellebphotos_ghost
./dev-ghost.sh start  # Will recreate volumes
```

### Port conflicts
If port 3050 is in use, edit `dev.pkl` and change `hostPort`, then regenerate and restart.

## Production Deployment

Production uses `prod.yaml` which doesn't have the theme volume mount. The theme should be:
1. Built and zipped on dev machine
2. Uploaded through Ghost admin, or
3. Included in the `ellebphotos_ghost` volume

Production deployment uses the Quadlet systemd integration rather than the dev script.
