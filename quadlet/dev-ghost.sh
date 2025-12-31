#!/bin/bash
# Helper script for managing Ghost development container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YAML_FILE="$SCRIPT_DIR/dev.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 {start|stop|restart|logs|status|regenerate|regenerate-prod}"
    echo ""
    echo "Commands:"
    echo "  start           - Start the Ghost development container"
    echo "  stop            - Stop the Ghost development container"
    echo "  restart         - Restart the Ghost development container"
    echo "  logs            - Show logs from the Ghost container"
    echo "  status          - Show container status"
    echo "  regenerate      - Regenerate dev.yaml from dev.pkl"
    echo "  regenerate-prod - Regenerate production files from Pkl"
    exit 1
}

check_secrets() {
    echo "Checking for required secrets..."

    if ! podman secret ls --format '{{.Name}}' | grep -q "^elleb_photos_secrets$"; then
        echo -e "${RED}Error: Secret 'elleb_photos_secrets' not found${NC}"
        echo ""
        echo "Create it with:"
        echo "  podman secret create elleb_photos_secrets --from-file=/path/to/secrets/file"
        echo ""
        echo "The secrets file should contain:"
        echo "  MYSQL_PASSWORD=<your_password>"
        echo "  MYSQL_ROOT_PASSWORD=<your_root_password>"
        exit 1
    fi

    echo -e "${GREEN}✓ Secrets found${NC}"
}

check_volumes() {
    echo "Checking for required volumes..."

    for volume in ellebphotos_db ellebphotos_ghost; do
        if ! podman volume ls --format '{{.Name}}' | grep -q "^$volume$"; then
            echo -e "${YELLOW}Volume '$volume' not found, creating...${NC}"
            podman volume create "$volume"
        fi
    done

    echo -e "${GREEN}✓ Volumes ready${NC}"
}

start_container() {
    echo "Starting Ghost development container..."
    check_secrets
    check_volumes

    cd "$SCRIPT_DIR"
    podman play kube "$YAML_FILE"

    echo -e "${GREEN}✓ Ghost started successfully${NC}"
    echo ""
    echo "Access Ghost at: http://localhost:3050"
    echo "Admin interface: http://localhost:3050/ghost"
}

stop_container() {
    echo "Stopping Ghost development container..."
    cd "$SCRIPT_DIR"
    podman play kube --down "$YAML_FILE" || true
    echo -e "${GREEN}✓ Ghost stopped${NC}"
}

restart_container() {
    stop_container
    echo ""
    start_container
}

show_logs() {
    echo "Showing Ghost container logs..."
    podman logs -f ellebphotos-site 2>&1 || {
        echo -e "${YELLOW}Note: Container may not be running${NC}"
        podman pod ps -a --filter name=ellebphotos
    }
}

show_status() {
    echo "Container status:"
    podman pod ps -a --filter name=ellebphotos
    echo ""
    echo "Containers in pod:"
    podman ps -a --filter pod=ellebphotos
}

regenerate_yaml() {
    echo "Regenerating dev.yaml from dev.pkl..."
    cd "$SCRIPT_DIR"
    pkl eval -f yaml dev.pkl -o dev.yaml
    echo -e "${GREEN}✓ dev.yaml regenerated${NC}"
}

regenerate_prod() {
    echo "Regenerating production files from Pkl..."
    cd "$SCRIPT_DIR"
    pkl eval -f yaml prod.pkl -o prod.yaml
    pkl eval prod-kube.pkl -o ellebphotos-prod.kube
    echo -e "${GREEN}✓ Production files regenerated:${NC}"
    echo "  - prod.yaml"
    echo "  - ellebphotos-prod.kube"
}

# Main command processing
case "${1:-}" in
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    regenerate)
        regenerate_yaml
        ;;
    regenerate-prod)
        regenerate_prod
        ;;
    *)
        print_usage
        ;;
esac
