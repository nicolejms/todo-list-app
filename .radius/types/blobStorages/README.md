# Radius.Storage/blobStorages

Portable blob (object) storage resource type for Radius applications.

## Recipes

| Recipe                | Target     | Backend                          | Notes |
|-----------------------|------------|----------------------------------|-------|
| `kubernetes-blobstorages` | Kubernetes | MinIO Deployment + Service      | Local / dev |
| `aws-blobstorages`        | AWS        | `AWS.S3/Bucket` via Radius AWS provider | Production / EKS |

## Properties

### Inputs

| Name          | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `environment` | string | yes      | Radius environment ID |
| `application` | string | no       | Radius application ID |

### Outputs (`readOnly`)

| Name       | Type   | Description |
|------------|--------|-------------|
| `endpoint` | string | S3-compatible API base URL |
| `key`      | string | Secret access key |

## Connection contract

When a `Radius.Compute/containers` resource declares a connection to a
`blobStorages`, Radius injects:

- `CONNECTION_<NAME>_ENDPOINT`
- `CONNECTION_<NAME>_KEY`

Apps use these with the AWS SDK and `forcePathStyle: true`. The fixed
access key id is `radius` (recipes use this convention so a single SDK
config works against MinIO and S3).

## Registration

```bash
# Register the type in the local control plane
rad resource-type create Radius.Storage/blobStorages \
  --from-file .radius/types/blobStorages/blobStorages.yaml

# Publish a recipe to a registry
rad bicep publish \
  --file .radius/types/blobStorages/recipes/kubernetes/bicep/kubernetes-blobstorages.bicep \
  --target br:ghcr.io/<owner>/recipes/blobstorages-kubernetes:<tag>

# Register the recipe with an environment
rad recipe register default \
  --resource-type Radius.Storage/blobStorages \
  --template-kind bicep \
  --template-path "ghcr.io/<owner>/recipes/blobstorages-kubernetes:<tag>" \
  --environment <env> --group default
```

## Trade-offs

- The schema fixes the access key id to the convention `radius` (apps hardcode it
  in their SDK config). Only the secret key flows through the connection.
- The AWS recipe creates an `AWS.IAM/AccessKey` paired with the bucket. If your
  Radius AWS provider config doesn't allow IAM key creation, swap to using the
  pod's IRSA role and have the app skip the key (left as a future enhancement).
