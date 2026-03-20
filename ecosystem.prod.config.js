module.exports = {
    apps: [
        {
            name: 'dongle.server.prod',
            script: 'dist/main.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
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
