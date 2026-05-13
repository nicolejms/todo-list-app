output "result" {
  value = {
    properties = {
      endpoint = "http://${local.service_dn}:9000"
      key      = random_password.minio_secret.result
    }
  }
  sensitive = true
}
