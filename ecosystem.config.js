module.exports = {
  apps: [
    {
      name: "pickl.digos.test",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      instances: 2,
      exec_mode: "cluster",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env_file: ".env",
      max_memory_restart: "600M", // Memory Safety: Restart an instance if it leaks and hits 600MB
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        NODE_OPTIONS: "--max-old-space-size=512", //Force Node to be more aggressive with memory cleanup
      },
    },
  ],
}
