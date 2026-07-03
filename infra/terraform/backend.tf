terraform {
  backend "s3" {
    bucket   = "terraform-state"
    key      = "portfolio/terraform.tfstate"
    region   = "us-chicago-1"
    endpoint = "https://axanqkwufjvo.compat.objectstorage.us-chicago-1.oraclecloud.com"

    # S3 compatibility requirements for OCI Object Storage
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_credentials_validation = true
    force_path_style            = true
  }
}
