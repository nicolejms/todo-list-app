extension radius

param environment string

@secure()
param mysqlPassword string

@secure()
param registryPassword string

@secure()
param registryUsername string

resource todoApp 'Radius.Core/applications@2025-08-01-preview' = {
  name: 'todo-list-app'
  properties: {
    environment: environment
  }
}

resource mysqlDb 'Radius.Data/mySqlDatabases@2025-08-01-preview' = {
  name: 'mysql'
  properties: {
    application: todoApp.id
    codeReference: 'src/persistence/mysql.js#L5'
    database: 'todos'
    environment: environment
    password: mysqlPassword
    username: 'myadmin'
    version: '8.0'
  }
}

resource mysqlClientCredentials 'Radius.Security/secrets@2025-08-01-preview' = {
  name: 'mysql-client-credentials'
  properties: {
    application: todoApp.id
    codeReference: 'src/persistence/mysql.js#L11'
    data: {
      password: {
        value: mysqlPassword
      }
    }
    environment: environment
  }
}

resource registryCreds 'Radius.Security/secrets@2025-08-01-preview' = {
  name: 'radius-ghcr-registry-creds'
  properties: {
    application: todoApp.id
    codeReference: '.radius/app.bicep#L48'
    data: {
      password: {
        value: registryPassword
      }
      username: {
        value: registryUsername
      }
    }
    environment: environment
  }
}

resource todoImage 'Radius.Compute/containerImages@2025-08-01-preview' = {
  name: 'todo-list-app-image'
  properties: {
    application: todoApp.id
    build: {
      platforms: [
        'linux/amd64'
      ]
      source: 'git::https://github.com/nicolejms/todo-list-app.git?ref=5a6fbf5caf982f1d928fe6c1c32aa74f1e95e063'
    }
    codeReference: 'Dockerfile'
    environment: environment
    tag: '5a6fbf5'
  }
  dependsOn: [
    registryCreds
  ]
}

resource todoContainer 'Radius.Compute/containers@2025-08-01-preview' = {
  name: 'todo-list-app'
  properties: {
    application: todoApp.id
    codeReference: 'src/index.js#L17'
    containers: {
      todo: {
        env: {
          MYSQL_DB: {
            value: 'todos'
          }
          MYSQL_HOST: {
            value: mysqlDb.properties.host
          }
          MYSQL_PASSWORD: {
            valueFrom: {
              secretKeyRef: {
                key: 'password'
                secretName: mysqlClientCredentials.name
              }
            }
          }
          MYSQL_USER: {
            value: 'myadmin'
          }
        }
        image: todoImage.properties.imageReference
        ports: {
          web: {
            containerPort: 3000
          }
        }
      }
    }
    environment: environment
  }
}
