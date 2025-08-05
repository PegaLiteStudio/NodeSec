module.exports = {
    apps: [{
        name: 'NodeSec',
        script: 'dist/server.js',
        instances: 'max',
        autoRestart: true,
        watch: false,
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'DD-MM-YYYY HH:mm:ss',
        env: {
            NODE_ENV: 'production'
        }
    }]
}
