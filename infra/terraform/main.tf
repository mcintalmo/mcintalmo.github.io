terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 8.1.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# 1. Networking (VCN, Subnet, Security List)
resource "oci_core_vcn" "portfolio_vcn" {
  cidr_block     = "10.1.0.0/16"
  compartment_id = var.compartment_ocid
  display_name   = "${local.name_prefix}-vcn"
  freeform_tags  = local.common_tags
}

resource "oci_core_internet_gateway" "portfolio_ig" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.portfolio_vcn.id
  display_name   = "${local.name_prefix}-ig"
  freeform_tags  = local.common_tags
}

resource "oci_core_route_table" "portfolio_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.portfolio_vcn.id
  display_name   = "${local.name_prefix}-rt"
  freeform_tags  = local.common_tags
  
  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.portfolio_ig.id
  }
}

resource "oci_core_security_list" "portfolio_sl" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.portfolio_vcn.id
  display_name   = "${local.name_prefix}-security-list"
  freeform_tags  = local.common_tags

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # Allow SSH
  ingress_security_rules {
    protocol = "6" # TCP
    source   = var.my_ip_cidr
    tcp_options {
      min = 22
      max = 22
    }
  }

  # Allow HTTP/HTTPS
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }
  
  # Allow LiveKit signaling ports (7880, 7881)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 7880
      max = 7881
    }
  }

  # Allow LiveKit media transport UDP port range (7882 and 50000:60000)
  ingress_security_rules {
    protocol = "17" # UDP
    source   = "0.0.0.0/0"
    udp_options {
      min = 7882
      max = 7882
    }
  }
  ingress_security_rules {
    protocol = "17" # UDP
    source   = "0.0.0.0/0"
    udp_options {
      min = 50000
      max = 60000
    }
  }
}

resource "oci_core_subnet" "portfolio_subnet" {
  cidr_block        = "10.1.1.0/24"
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.portfolio_vcn.id
  route_table_id    = oci_core_route_table.portfolio_rt.id
  security_list_ids = [oci_core_security_list.portfolio_sl.id]
  display_name      = "${local.name_prefix}-subnet"
  freeform_tags     = local.common_tags
}

# 2. Get the Latest Ubuntu ARM Image
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# 3. Get Availability Domain
data "oci_identity_availability_domain" "ad" {
  compartment_id = var.tenancy_ocid
  ad_number      = var.ad_number
}

# 4. Compute Instance (The VPS)
resource "oci_core_instance" "portfolio_server" {
  availability_domain = data.oci_identity_availability_domain.ad.name
  compartment_id      = var.compartment_ocid
  display_name        = "${local.name_prefix}-server"
  shape               = var.instance_shape
  freeform_tags       = merge(local.common_tags, {
    Name        = "Portfolio Server"
    Application = "portfolio-backend"
  })

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.portfolio_subnet.id
    assign_public_ip = true
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_arm.images[0].id
  }

  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }

  lifecycle {
    ignore_changes = [
      metadata,
      source_details[0].source_id
    ]
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("./cloud-init.yaml"))
  }
}
