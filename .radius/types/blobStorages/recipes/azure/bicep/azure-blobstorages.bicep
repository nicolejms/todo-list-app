// ---------------------------------------------------------------------------
// Recipe: Radius.Data/blobStorages -> Azure Storage Account
//
// Provisions an Azure Storage Account with an 'attachments' blob container
// and outputs the blob endpoint URL and primary access key.
// ---------------------------------------------------------------------------

@description('The Recipe context object passed by Radius.')
param context object

var name = context.resource.name
var uniqueName = replace('${name}${uniqueString(context.resource.id)}', '-', '')
var accountName = length(uniqueName) > 24 ? substring(uniqueName, 0, 24) : uniqueName
var location = context.azure.resourceGroup.location

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: accountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource attachmentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'attachments'
  properties: {
    publicAccess: 'None'
  }
}

output result object = {
  properties: {
    endpoint: storageAccount.properties.primaryEndpoints.blob
    key: storageAccount.listKeys().keys[0].value
  }
}
