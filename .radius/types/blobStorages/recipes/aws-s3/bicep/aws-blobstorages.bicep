import aws as aws

@description('The Recipe context object passed by Radius.')
param context object

@description('AWS region for the S3 bucket. Defaults to the env-provided region.')
param region string = 'us-east-1'

var name = context.resource.name
var bucketName = toLower('rad-${name}-${uniqueString(context.resource.id)}')

resource bucket 'AWS.S3/Bucket@default' = {
  alias: bucketName
  properties: {
    BucketName: bucketName
  }
}

resource user 'AWS.IAM/User@default' = {
  alias: '${bucketName}-user'
  properties: {
    UserName: '${bucketName}-user'
    Policies: [
      {
        PolicyName: 'bucket-rw'
        PolicyDocument: {
          Version: '2012-10-17'
          Statement: [
            {
              Effect: 'Allow'
              Action: [
                's3:GetObject'
                's3:PutObject'
                's3:DeleteObject'
                's3:ListBucket'
              ]
              Resource: [
                'arn:aws:s3:::${bucketName}'
                'arn:aws:s3:::${bucketName}/*'
              ]
            }
          ]
        }
      }
    ]
  }
}

resource accessKey 'AWS.IAM/AccessKey@default' = {
  alias: '${bucketName}-key'
  properties: {
    UserName: user.properties.UserName
  }
}

output result object = {
  properties: {
    endpoint: 'https://s3.${region}.amazonaws.com'
    key: accessKey.properties.SecretAccessKey
  }
}
