locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "infrastructure-team"
  }

  name_prefix = "${var.project_name}-${var.environment}"
}
