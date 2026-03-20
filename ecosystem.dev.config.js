module.exports = {
    apps: [
        {
            name: 'dongle.server.dev',
            script: 'dist/main.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '128M',
            node_args: '--max-old-space-size=128',
            env: {
                NODE_ENV: 'development',
                PORT: 5001,
            },
        },
    ],
};
