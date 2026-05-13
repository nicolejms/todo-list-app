# Radius.Data/blobStorages

Portable blob (object) storage resource type for Radius applications. Used by
the todo-list-app to store file attachments uploaded against todo items.

## Recipes

| Recipe                        | Platform   | Template kind | Backend                                |
|-------------------------------|------------|---------------|----------------------------------------|
| `kubernetes-blobstorages`     | Kubernetes | bicep         | MinIO `Deployment` + `Service`         |
| `kubernetes-blobstorages-tf`  | Kubernetes | terraform     | MinIO via `kubernetes_deployment`      |
| `aws-blobstorages`            | AWS        | bicep         | `AWS.S3/Bucket` + `AWS.IAM/AccessKey`  |
| `aws-blobstorages-tf`         | AWS        | terraform     | `aws_s3_bucket` + `aws_iam_access_key` |
| `azure-blobstorages`          | Azure      | bicep         | `Microsoft.Storage/storageAccounts`    |
| `azure-blobstorages-tf`       | Azure      | terraform     | `azurerm_storage_account`              |

## Properties

### Inputs

| Name          | Type   | Required | Description           |
|---------------|--------|----------|-----------------------|
| `environment` | string | yes      | Radius environment ID |
| `application` | string | no       | Radius application ID |

### Outputs (`readOnly`)

| Name       | Type   | Description                              |
|------------|--------|------------------------------------------|
| `endpoint` | string | Object-storage endpoint URL              |
| `key`      | string | Secret access key for the endpoint       |

## Connection contract

When a `Radius.Compute/containers` declares a connection named e.g.
`attachments` to a `blobStorages`, Radius injects:

- `CONNECTION_ATTACHMENTS_ENDPOINT`
- `CONNECTION_ATTACHMENTS_KEY`

### S3-compatible recipes (kubernetes, aws)

Apps use these with `@aws-sdk/client-s3`:

```js
new S3Client({
  endpoint: process.env.CONNECTION_ATTACHMENTS_ENDPOINT,
  region: process.env.AWS_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'radius', secretAccessKey: process.env.CONNECTION_ATTACHMENTS_KEY },
});
```

The access key id is fixed by convention to the literal `radius` so a single
SDK config works against both MinIO and AWS S3.

### Azure recipe

The Azure recipe outputs the storage account's blob endpoint
(`https://<account>.blob.core.windows.net/`) and primary access key, which are
**not** S3-compatible. To use the Azure recipe with this app, swap in an
`@azure/storage-blob` adapter that recognises a `*.blob.core.windows.net`
endpoint. The Azure recipe is provided so the resource type is portable
across all three target platforms even if the reference app only ships an S3
adapter.

## Registration

```bash
# Register the type in the local control plane
rad resource-type create Radius.Data/blobStorages \
  --from-file .radius/types/blobStorages/blobStorages.yaml

# Publish a Bicep recipe
rad bicep publish \
  --file .radius/types/blobStorages/recipes/kubernetes/bicep/kubernetes-blobstorages.bicep \
  --target br:ghcr.io/<owner>/recipes/blobstorages-kubernetes:<tag>

# Register a Bicep recipe with an environment
rad recipe register kubernetes-blobstorages \
  --resource-type Radius.Data/blobStorages \
  --template-kind bicep \
  --template-path "ghcr.io/<owner>/recipes/blobstorages-kubernetes:<tag>" \
  --environment <env> --group default

# Register a Terraform recipe with an environment (template-path is a module ref)
rad recipe register kubernetes-blobstorages-tf \
  --resource-type Radius.Data/blobStorages \
  --template-kind terraform \
  --template-path "git::https://github.com/<owner>/<repo>//.radius/types/blobStorages/recipes/kubernetes/terraform" \
  --environment <env> --group default
```

## Notes

- The S3 recipes fix the access key id to the literal `radius`; only the
  secret key flows through the connection. Apps must hardcode the id in their
  SDK config.
- The AWS Bicep recipe creates an `AWS.IAM/User` + `AWS.IAM/AccessKey`. If your
  Radius AWS provider config disallows IAM-key creation, switch to IRSA and
  have the app skip the credential.
- The Azure recipe issues a long-lived storage-account key. For production,
  prefer SAS tokens or managed identity (left as a follow-up enhancement).
