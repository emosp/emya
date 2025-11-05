module.exports = {
  apps: [
    {
      name: 'emya',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      log_file: 'logs/combined.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_date_format: 'YYYY-MM-DD',
      merge_logs: false,
      min_uptime: '10s',
      max_restarts: 10,
      max_memory_restart: '512M',
      watch: false,
      autorestart: true,
    },
  ],
}
