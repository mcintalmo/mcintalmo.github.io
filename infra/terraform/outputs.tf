output "server_public_ip" {
  description = "Public IP address of the Portfolio server"
  value       = oci_core_instance.portfolio_server.public_ip
}

output "server_private_ip" {
  description = "Private IP address of the Portfolio server"
  value       = oci_core_instance.portfolio_server.private_ip
}

output "server_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.portfolio_server.id
}

output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.portfolio_vcn.id
}

output "subnet_id" {
  description = "OCID of the subnet"
  value       = oci_core_subnet.portfolio_subnet.id
}

output "ssh_connection_string" {
  description = "SSH connection string"
  value       = "ssh ubuntu@${oci_core_instance.portfolio_server.public_ip}"
}

output "next_steps" {
  description = "Next steps after deployment"
  value       = <<-EOT
  
  ═══════════════════════════════════════════════════════════════
  🎉 Portfolio Infrastructure deployed successfully!
  ═══════════════════════════════════════════════════════════════
  
  Server IP: ${oci_core_instance.portfolio_server.public_ip}
  
  Next steps:
  
  1. SSH into the server:
     ssh ubuntu@${oci_core_instance.portfolio_server.public_ip}
  
  2. Wait for cloud-init to complete (may take 2-5 minutes):
     tail -f /var/log/cloud-init-output.log
  
  3. Update your DNS:
     Add A records in your DNS provider:
       api.alexandermcintosh.com      → ${oci_core_instance.portfolio_server.public_ip}
       livekit.alexandermcintosh.com  → ${oci_core_instance.portfolio_server.public_ip}
  
  4. Run setup script:
     Navigate to project root and run setup script to deploy the stack.
  
  ═══════════════════════════════════════════════════════════════
  EOT
}
