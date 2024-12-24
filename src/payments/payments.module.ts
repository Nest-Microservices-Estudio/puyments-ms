import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  // TODO: USO DE NATSMODULE
  // si usamos nats aqui debo importarlo
  imports: [
    NatsModule
  ]
})
export class PaymentsModule {}
