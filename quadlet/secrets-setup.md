# Setting up Podman Secrets

The Ghost container requires database credentials stored as Podman secrets.

## Method 1: Create from environment file

1. Create a secrets file (don't commit this to git!):

```bash
cat > /tmp/ghost-secrets.env << 'EOF'
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_ROOT_PASSWORD=your_mysql_root_password_here
EOF
```

2. Create the Podman secret:

```bash
podman secret create elleb_photos_secrets /tmp/ghost-secrets.env
```

3. Clean up the temporary file:

```bash
rm /tmp/ghost-secrets.env
```

## Method 2: Create from stdin

```bash
podman secret create elleb_photos_secrets - << 'EOF'
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_ROOT_PASSWORD=your_mysql_root_password_here
EOF
```

## Verify secrets exist

```bash
podman secret ls
```

You should see `elleb_photos_secrets` in the list.

## Update secrets

To update secrets, you need to remove and recreate them:

```bash
# Remove existing secret
podman secret rm elleb_photos_secrets

# Recreate with new values
podman secret create elleb_photos_secrets - << 'EOF'
MYSQL_PASSWORD=new_password
MYSQL_ROOT_PASSWORD=new_root_password
EOF
```

## For Production

On the production server, secrets are likely already set up. If not, use the same method but ensure you:

1. Use strong, unique passwords
2. Store the passwords securely (password manager)
3. Never commit secrets to version control
