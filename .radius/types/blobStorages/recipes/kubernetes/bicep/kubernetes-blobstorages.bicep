import kubernetes as k8s {
  kubeConfig: ''
  namespace: context.runtime.kubernetes.namespace
}

@description('The Recipe context object passed by Radius.')
param context object

var name = context.resource.name
var namespace = context.runtime.kubernetes.namespace
var uniqueName = '${name}-${uniqueString(context.resource.id)}'
var secretKey = uniqueString(context.resource.id, 'minio-secret')

resource deployment 'apps/Deployment@v1' = {
  metadata: {
    name: uniqueName
    namespace: namespace
    labels: {
      'radius.dev/resource': name
    }
  }
  spec: {
    replicas: 1
    selector: {
      matchLabels: {
        app: uniqueName
      }
    }
    template: {
      metadata: {
        labels: {
          app: uniqueName
        }
      }
      spec: {
        containers: [
          {
            name: 'minio'
            image: 'minio/minio:RELEASE.2024-10-13T13-34-11Z'
            args: [
              'server'
              '/data'
              '--address'
              ':9000'
            ]
            ports: [
              {
                containerPort: 9000
                name: 's3'
              }
            ]
            env: [
              {
                name: 'MINIO_ROOT_USER'
                value: 'radius'
              }
              {
                name: 'MINIO_ROOT_PASSWORD'
                value: secretKey
              }
            ]
            resources: {
              requests: {
                cpu: '100m'
                memory: '128Mi'
              }
              limits: {
                cpu: '500m'
                memory: '512Mi'
              }
            }
            volumeMounts: [
              {
                name: 'data'
                mountPath: '/data'
              }
            ]
          }
        ]
        volumes: [
          {
            name: 'data'
            emptyDir: {}
          }
        ]
      }
    }
  }
}

resource service 'core/Service@v1' = {
  metadata: {
    name: '${uniqueName}-svc'
    namespace: namespace
  }
  spec: {
    selector: {
      app: uniqueName
    }
    ports: [
      {
        port: 9000
        targetPort: 9000
        name: 's3'
      }
    ]
  }
}

output result object = {
  properties: {
    endpoint: 'http://${uniqueName}-svc.${namespace}.svc.cluster.local:9000'
    key: secretKey
  }
}
