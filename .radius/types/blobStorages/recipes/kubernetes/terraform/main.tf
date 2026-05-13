terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# context is the recipe context object injected by Radius.
variable "context" {
  description = "Radius recipe context"
  type        = any
}

locals {
  name       = var.context.resource.name
  namespace  = var.context.runtime.kubernetes.namespace
  unique     = substr(sha256(var.context.resource.id), 0, 8)
  full_name  = "${local.name}-${local.unique}"
  service_dn = "${local.full_name}-svc.${local.namespace}.svc.cluster.local"
}

resource "random_password" "minio_secret" {
  length  = 32
  special = false
}

resource "kubernetes_deployment" "minio" {
  metadata {
    name      = local.full_name
    namespace = local.namespace
    labels = {
      "radius.dev/resource" = local.name
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = local.full_name
      }
    }

    template {
      metadata {
        labels = {
          app = local.full_name
        }
      }

      spec {
        container {
          name  = "minio"
          image = "minio/minio:RELEASE.2024-10-13T13-34-11Z"
          args  = ["server", "/data", "--address", ":9000"]

          port {
            container_port = 9000
            name           = "s3"
          }

          env {
            name  = "MINIO_ROOT_USER"
            value = "radius"
          }

          env {
            name  = "MINIO_ROOT_PASSWORD"
            value = random_password.minio_secret.result
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          volume_mount {
            name       = "data"
            mount_path = "/data"
          }
        }

        volume {
          name = "data"
          empty_dir {}
        }
      }
    }
  }
}

resource "kubernetes_service" "minio" {
  metadata {
    name      = "${local.full_name}-svc"
    namespace = local.namespace
  }

  spec {
    selector = {
      app = local.full_name
    }

    port {
      name        = "s3"
      port        = 9000
      target_port = 9000
    }
  }
}
