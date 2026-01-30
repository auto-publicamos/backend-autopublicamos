import { INestApplication } from "@nestjs/common";

export function setupCors(app: INestApplication) {
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
}
