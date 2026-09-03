extension radius

param environment string

@secure()
param mysqlPassword string

@secure()
param registryPassword string

@secure()
param registryUsername string

resource todoListApp 'Radius.Core/applications@2025-08-01-preview' = {
  name: 'todo-list-app'
  properties: {
    environment: environment
  }
}

resource mysqlDb 'Radius.Data/mySqlDatabases@2025-08-01-preview' = {
  name: 'mysql'
  properties: {
    environment: environment
    application: todoListApp.id
    codeReference: 'src/persistence/mysql.js#L31'
    database: 'todos'
    password: mysqlPassword
    username: 'myadmin'
    version: '8.0'
  }
}

resource mysqlClientCredentials 'Radius.Security/secrets@2025-08-01-preview' = {
  name: 'mysql-client-credentials'
  properties: {
    environment: environment
    application: todoListApp.id
    codeReference: 'src/persistence/mysql.js#L10'
    data: {
      password: {
        value: mysqlPassword
      }
    }
  }
}

resource registryCredentials 'Radius.Security/secrets@2025-08-01-preview' = {
  name: 'radius-ghcr-registry-creds'
  properties: {
    environment: environment
    application: todoListApp.id
    codeReference: '.github/workflows/run-rad-commands-azure.yml#L220'
    data: {
      password: {
        value: registryPassword
      }
      username: {
        value: registryUsername
      }
    }
  }
}

resource todoListImage 'Radius.Compute/containerImages@2025-08-01-preview' = {
  name: 'todo-list-app-image'
  properties: {
    environment: environment
    application: todoListApp.id
    codeReference: 'Dockerfile#L1'
    tag: 'a44aab7317e0'
    build: {
      source: 'git::https://github.com/nicolejms/todo-list-app.git?ref=a44aab7317e09f80c7a3fea040fb3aa0f523ef1b'
      platforms: [
        'linux/amd64'
      ]
    }
  }
  dependsOn: [
    registryCredentials
  ]
}

resource todoListContainer 'Radius.Compute/containers@2025-08-01-preview' = {
  name: 'todo-list-app'
  properties: {
    environment: environment
    application: todoListApp.id
    codeReference: 'src/index.js#L17'
    containers: {
      todoList: {
        image: todoListImage.properties.imageReference
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
                secretName: mysqlClientCredentials.name
                key: 'password'
              }
            }
          }
          MYSQL_USER: {
            value: 'myadmin'
          }
        }
        ports: {
          web: {
            containerPort: 3000
          }
        }
      }
    }
  }
}
