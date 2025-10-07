declare namespace NodeJS {
  interface ProcessEnv {
    APP_NAME: string
    APP_LOG: string
    APP_AUTH_NUMBER?: number

    SERVER_HOST: string
    SERVER_PORT: number

    DB_CONNECTION: 'pool' | 'client'
    DB_HOST: string
    DB_PORT: number
    DB_DATABASE: string
    DB_USERNAME: string
    DB_PASSWORD: string
    DB_SOCKET_PATH?: string
    DB_CONNECTION_LIMIT: number

    API_KEY?: string
    API_EXTERNAL?: string

    SEARCH_DEFAULT_LIST: string

    EMBY_VERSION: string
    EMBY_ID: string
  }
}
