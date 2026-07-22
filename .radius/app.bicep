extension radius

param environment string

@secure()
param password string

resource todoApp 'Radius.Core/applications@2025-08-01-preview' = {
  name: 'todo-list-app'
  properties: {
    environment: environment
  }
}

resource mysqlDb 'Radius.Data/mySqlDatabases@2025-08-01-preview' = {
  name: 'mysql'
  properties: {
    environment: environment
    application: todoApp.id
    database: 'todos'
    version: '8.0'
    username: 'myadmin'
    password: password
    codeReference: 'src/persistence/mysql.js#L31'
  }
}

resource todoImage 'Radius.Compute/containerImages@2025-08-01-preview' = {
  name: 'todo-list-app-image'
  properties: {
    environment: environment
    application: todoApp.id
    build: {
      source: 'git::https://github.com/nicolejms/todo-list-app.git?ref=c1323135ad45acde70a9782038d98876e8eb128f'
    }
    codeReference: 'Dockerfile'
  }
}

resource todoContainer 'Radius.Compute/containers@2025-08-01-preview' = {
  name: 'todo-list-app'
  properties: {
    environment: environment
    application: todoApp.id
    containers: {
      todo: {
        image: todoImage.properties.imageReference
        ports: {
          web: {
            containerPort: 3000
          }
        }
        env: {
          MYSQL_HOST: {
            value: mysqlDb.properties.host
          }
          MYSQL_USER: {
            value: 'myadmin'
          }
          MYSQL_PASSWORD: {
            value: password
          }
          MYSQL_DB: {
            value: 'todos'
          }
        }
      }
    }
    codeReference: 'src/index.js#L17'
  }
}
