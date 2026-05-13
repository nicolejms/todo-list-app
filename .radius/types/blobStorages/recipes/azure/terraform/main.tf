terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "context" {
  description = "Radius recipe context"
  type        = any
}

locals {
  name           = var.context.resource.name
  unique         = substr(replace(sha256(var.context.resource.id), "-", ""), 0, 8)
  account_name   = lower(substr("rad${replace(local.name, "-", "")}${local.unique}", 0, 24))
  resource_group = var.context.azure.resourceGroup.name
  location       = var.context.azure.resourceGroup.location
}

resource "azurerm_storage_account" "this" {
  name                            = local.account_name
  resource_group_name             = local.resource_group
  location                        = local.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  account_kind                    = "StorageV2"
  access_tier                     = "Hot"
  enable_https_traffic_only       = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  tags = {
    "radius.dev/resource" = local.name
  }
}

resource "azurerm_storage_container" "attachments" {
  name                  = "attachments"
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "private"
}
