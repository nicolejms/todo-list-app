output "result" {
  value = {
    properties = {
      endpoint = azurerm_storage_account.this.primary_blob_endpoint
      key      = azurerm_storage_account.this.primary_access_key
    }
  }
  sensitive = true
}
