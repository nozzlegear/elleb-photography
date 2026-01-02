#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <development|production>"
  echo ""
  echo "Examples:"
  echo "  $0 development    # Generate dev.yaml"
  echo "  $0 production     # Generate prod.yaml and {instanceName}-prod.kube"
  exit 1
fi

ENV=$1

case $ENV in
  development)
    echo "Generating development configuration..."
    pkl eval -f yaml dev.pkl -o dev.yaml
    echo "✓ Generated dev.yaml"
    ;;

  production)
    echo "Generating production configuration..."
    pkl eval -f yaml prod.pkl -o prod.yaml

    # Extract instance name from prod-kube.pkl
    INSTANCE_NAME=$(grep "local instanceName:" prod-kube.pkl | sed 's/.*"\(.*\)"/\1/')
    pkl eval prod-kube.pkl -o "${INSTANCE_NAME}-prod.kube"

    echo "✓ Generated prod.yaml"
    echo "✓ Generated ${INSTANCE_NAME}-prod.kube"
    ;;

  *)
    echo "Error: Invalid environment. Use 'development' or 'production'"
    exit 1
    ;;
esac
