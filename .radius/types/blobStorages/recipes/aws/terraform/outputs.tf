output "result" {
  value = {
    properties = {
      endpoint = "https://s3.${var.region}.amazonaws.com"
      key      = aws_iam_access_key.this.secret
    }
  }
  sensitive = true
}
