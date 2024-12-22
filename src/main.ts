import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config/envs';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Pyaments-ms');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // TODO: INHERIT APP CONFIG ESTO ES PARA QUE HEREDE LA CONFIGURACION DE APP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
     servers: envs.natsServers,
    },
  },{
    inheritAppConfig: true
  }

)

  await app.startAllMicroservices()
  await app.listen(envs.port)

  logger.log(`Payments microservice is running on: ${envs.port}`);
}
bootstrap();
