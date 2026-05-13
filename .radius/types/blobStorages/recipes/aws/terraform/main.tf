terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "context" {
  description = "Radius recipe context"
  type        = any
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

provider "aws" {
  region = var.region
}

locals {
  name        = var.context.resource.name
  unique      = substr(sha256(var.context.resource.id), 0, 8)
  bucket_name = lower("rad-${local.name}-${local.unique}")
}

resource "aws_s3_bucket" "this" {
  bucket        = local.bucket_name
  force_destroy = true

  tags = {
    "radius.dev/resource" = local.name
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_user" "this" {
  name = "${local.bucket_name}-user"
}

resource "aws_iam_user_policy" "this" {
  name = "bucket-rw"
  user = aws_iam_user.this.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.this.arn,
          "${aws_s3_bucket.this.arn}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_access_key" "this" {
  user = aws_iam_user.this.name
}
