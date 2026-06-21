#!/usr/bin/env bash
# Update local IP address in terraform.tfvars and apply to infrastructure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TFVARS_FILE="$PROJECT_ROOT/infra/terraform/terraform.tfvars"

echo "=== Updating IP Address in Terraform Config ==="

if [ ! -f "$TFVARS_FILE" ]; then
    echo "Error: $TFVARS_FILE not found!"
    exit 1
fi

echo "Detecting your current public IP address..."
CURRENT_IP=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
    echo "Error: Could not detect current IP address."
    exit 1
fi

echo "Current public IP: $CURRENT_IP"

# Check if IP is already in terraform.tfvars
CURRENT_TFVAR_IP=$(grep "my_ip_cidr" "$TFVARS_FILE" | cut -d'"' -f2 | cut -d'/' -f1)

if [ "$CURRENT_IP" = "$CURRENT_TFVAR_IP" ]; then
    echo "IP address is already up to date in terraform.tfvars"
    exit 0
fi

# Backup current terraform.tfvars
cp "$TFVARS_FILE" "$TFVARS_FILE.backup"
echo "Backed up current config to terraform.tfvars.backup"

# Update the my_ip_cidr value
sed -i.tmp "s|my_ip_cidr *= *\"[0-9.]*\/[0-9]*\"|my_ip_cidr = \"${CURRENT_IP}/32\"|g" "$TFVARS_FILE"
rm -f "$TFVARS_FILE.tmp"

echo "Updated terraform.tfvars: my_ip_cidr = \"${CURRENT_IP}/32\""

echo "Applying Terraform changes..."
cd "$PROJECT_ROOT/infra/terraform"
terraform apply -target=oci_core_security_list.portfolio_sl -auto-approve

echo "Infrastructure updated successfully!"
echo "Old IP: $CURRENT_TFVAR_IP"
echo "New IP: $CURRENT_IP"
