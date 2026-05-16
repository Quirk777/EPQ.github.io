module.exports = {
  apps: [
    {
      name: "epq-frontend",
      cwd: "/opt/epq/frontend",
      script: "/usr/bin/npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        BACKEND_URL: "http://127.0.0.1:8001",
      },
      max_restarts: 10,
      restart_delay: 5000,
      time: true,
    },
  ],
};
