module.exports = {
    apps: [
        {
            name: 'dongle.server.prod',
            script: 'dist/main.js',
            cwd: __dirname,
            instances: 2,
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '192M',
            node_args: '--max-old-space-size=192',
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
        },
    ],
};
