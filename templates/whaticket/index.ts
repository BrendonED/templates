import { Output, randomPassword, Services } from "~templates-utils";
import { Input } from "./meta";

export function generate(input: Input): Output {
    const services: Services = [];
    const databasePassword = input.databasePassword || randomPassword();
    const redisPassword = input.redisPassword || randomPassword();
    const jwtSecret = input.jwtSecret || randomPassword();
    const jwtRefreshSecret = input.jwtRefreshSecret || randomPassword();

    const dbServiceName = `${input.appServiceName}-db`;
    const redisServiceName = `${input.appServiceName}-redis`;
    const backendServiceName = `${input.appServiceName}-backend`;
    const frontendServiceName = `${input.appServiceName}-frontend`;

    // 1. MySQL Database
    services.push({
        type: "mariadb",
        data: {
            serviceName: dbServiceName,
            image: "mariadb:10.6",
            password: databasePassword,
            deploy: {
                command: "--character-set-server=utf8mb4 --collation-server=utf8mb4_bin"
            }
        },
    });

    // 2. Redis
    services.push({
        type: "redis",
        data: {
            serviceName: redisServiceName,
            image: "redis:latest",
            password: redisPassword,
        },
    });

    // 3. Backend (API)
    services.push({
        type: "app",
        data: {
            serviceName: backendServiceName,
            source: {
                type: "git",
                repo: "https://github.com/BrendonED/whaticket-teste",
                branch: "master",
                root: "backend",
            },
            build: {
                type: "dockerfile",
                dockerfile: "Dockerfile",
            },
            env: [
                `NODE_ENV=production`,
                `DB_DIALECT=mysql`,
                `DB_HOST=$(PROJECT_NAME)_${dbServiceName}`,
                `DB_USER=mariadb`,
                `DB_PASS=${databasePassword}`,
                `DB_NAME=$(PROJECT_NAME)`,
                `DB_PORT=3306`,
                `JWT_SECRET=${jwtSecret}`,
                `JWT_REFRESH_SECRET=${jwtRefreshSecret}`,
                `REDIS_URI=redis://:${redisPassword}@$(PROJECT_NAME)_${redisServiceName}:6379`,
                `REDIS_OPT_LIMITER_MAX=1`,
                `BACKEND_URL=https://${input.backendDomain}`,
                `FRONTEND_URL=https://${input.frontendDomain}`,
                `PROXY_PORT=8080`,
                `PORT=3000`,
            ].join("\n"),
            domains: [
                {
                    host: input.backendDomain,
                    port: 3000,
                    https: true,
                },
            ],
        },
    });

    // 4. Frontend (App)
    services.push({
        type: "app",
        data: {
            serviceName: frontendServiceName,
            source: {
                type: "git",
                repo: "https://github.com/BrendonED/whaticket-teste",
                branch: "master",
                root: "frontend",
            },
            build: {
                type: "dockerfile",
                dockerfile: "Dockerfile",
            },
            env: [
                `URL_BACKEND=$(PROJECT_NAME)_${backendServiceName}:3000`,
                `REACT_APP_BACKEND_URL=https://${input.backendDomain}/`,
            ].join("\n"),
            domains: [
                {
                    host: input.frontendDomain,
                    port: 80,
                    https: true,
                },
            ],
        },
    });

    return { services };
}
