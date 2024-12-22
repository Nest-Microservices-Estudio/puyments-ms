import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  Param,
  HttpStatus,
  HttpException,
  BadRequestException,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CustomPreferenceDto } from './dto/custom-preference.dto';
import { MessagePattern } from '@nestjs/microservices';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // TODO: LLAMAR A ORDEN EN EL SERVICIO
  // @Post('create-preference')
  @MessagePattern('create.preference')
  createPreference(@Body() customPreferenceDto: CustomPreferenceDto) {
    return this.paymentsService.createPreference(customPreferenceDto);
  }

  @Get('success')
  sucess() {
    return {
      ok: true,
      message: 'Payment Succesfull',
    };
  }
  @Get('cancel')
  cancel() {
    return {
      ok: true,
      message: 'Payment Cancelled',
    };
  }

  @Get('get-payment/:id')
  getPayment(@Param('id') id: string) {
    return this.paymentsService.getPayment(id);
  }
  @Get('get-preference/:id')
  getPreferenceByPreferenceId(@Param('id') id: string) {
    return this.paymentsService.getPreferenceByPreferenceId(id);
  }

  @Get('get-payment-by-reference/:reference')
  getPaymentByReference(@Param('reference') reference: string) {
    return this.paymentsService.getPaymentByReference(reference);
  }

  // TODO: LLAMAR A ORDEN EN EL SERVICIO

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers('x-request-id') xRequestId: string,
    @Headers('x-signature') xSignature: string,
  ) {
    console.log('Received webhook body:', body);

    try {
      if (!body || !body.data || !body.data.id) {
        return new BadRequestException('Invalid webhook payload');
      }

      const paymentId = body.data.id;
      const orderId = body.data.metadata;
      console.log('Payment ID desde CONTROLLER:', paymentId);
      console.log('Payment ID desde CONTROLLER:', orderId);
      if (!paymentId) {
        console.error('Body does not contain payment ID');
        return new BadRequestException('Body does not contain payment ID');
      }

      console.log('Payment ID:', paymentId);
      console.log('Request ID:', xRequestId);
      console.log('Signature:', xSignature);

      // Extract and validate signature
      const isValid = this.paymentsService.validateSignature(
        xRequestId,
        xSignature,
        paymentId,
      );

      if (!isValid) {
        console.error('Invalid signature');
        throw new HttpException('Not Authorized', HttpStatus.UNAUTHORIZED);
      }

      console.log('Signature validation successful');

      // Fetch payment data and handle accordingly
      const result = await this.paymentsService.processPayment(paymentId);

      return result;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
