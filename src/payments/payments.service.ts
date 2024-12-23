import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { envs } from 'src/config/envs';
import * as crypto from 'crypto';
import { CustomPreferenceDto } from './dto/custom-preference.dto';

@Injectable()
export class PaymentsService {
  private readonly client: MercadoPagoConfig;

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: envs.mercadoPagoAccessToken,
      options: { timeout: 5000, idempotencyKey: 'abc' },
    });
  }

  // TODO: CREAR PREFERENCIA
  //   TODO: Implementar el método createPreference
  //   este servicio deberia llamarlo un boton en el front
  //   TODO: AQUI YA DEBERIAMOS TENER LA ORDEN QUE LLEGO CON EL OBJETO DE ITEMS
  // POR LO QUE LO USAREMOS EL ID DE LA ORDEN PARA GUARDARLA EN EL EXTERNAL REFERENCE Y LUEGO EN EL WEBHOOK BUSCAR LA ORDEN Y ACTUALIZARLA
  async createPreference(customPreferenceDto: CustomPreferenceDto) {
    const {
      orderId,
      items,
      payer,
    } = customPreferenceDto;

    const preference = new Preference(this.client);

    console.log('Items desde createPreference:', orderId);

    const bodyCustomPreference: CustomPreferenceDto = {
      items: items,
      external_reference: orderId,
      notification_url: `${envs.baseUrlWebhook}/payments/webhook`,
      metadata: { orderId: orderId },
      payer: payer,
      back_urls: {
        success: `${envs.baseUrlWebhook}/payments/success`,
        failure: `${envs.baseUrlWebhook}/payments/cancel`,
        pending: `${envs.baseUrlWebhook}/payments/pending`,
      },
      auto_return: 'approved',
    };

    // TODO: FLUJO PAGO ORDEN DE COMPRA CREACION DE PREFERENCIA

    const response = await preference.create({
      body: bodyCustomPreference,
    });

    // 0 EL USUARIO DEBE ESTAR LOGUEADO
    // 0.1 CREAR CAMPO DE EXTERNAL REFERENCE Y ID DE PREFERENCIA EN LA ORDEN ANTES DE TODO
    // 1. EN EL FRONT SE CREA UNA ORDEN DE COMPRA
    // 2. SE ENVIA EL ID DE LA ORDEN AL BACKEND
    // 3. BUSCAMOS LA ORDEN POR EL ID
    // 4. ENCONTRAMOS LA ORDEN Y TOMAMOS LA DATA QUE NECESITAMOS PARA LLENAR LOS CAMPOS QUE NECEISTA LA CREACION DE LA PREFERENCIA
    // 5. SI LA CREACION ES EXITOSA GUARDAMOS EL ID DE LA PREFERENCIA EN LA ORDEN Y EL EXTERNAL REFERMNCE QUE SERA EL ID DE LA ORDEN
    // 6. GUARADAMOS LA ORDEN O DEVOLVEMOS LA ORDEN PARA GUARDARLA EN EL FRONT APUNTANDO A LA ORDEN EN BD
    // 7. PAID STATUS ESTA EN FALSO AUN
    // 8. SI EL USUARIO ESPERA EL WEBHOOK O SE DIRIGE AUTOMATICAMENTE DEBE ESPERAR A QUE EL PAGO SE REALICE Y SE ACTUALICE EL ESTADO DE LA ORDEN

    // 9. EN EL FRONT SI POR ALGUNA RAZON DE DESCONEXION O SE SALIO SIMPLEEMNTE Y NO ESPERO EL WEBHOOK NO SE ACTUALIZARA EL ESTADO DE LA ORDEN
    // 10. DEBEMOS DETECTAR ORDENES CREADAS Y MOSTRARLAS EN EL HISTORIAL DE ORDENES YA SEA PARA COMPLETAR EL PAGO SI PAID ESTA EN FALSO O VERIFICIAR CON EL EXTERNAL REFERENCE SI SE PAGO O NO
    // 11. EJEMPLO: NO ENTRE AL WEBHOOK Y NO SE ACTUALIZO EL ESTADO DE LA ORDEN, DEBO PODER VER LA ORDEN Y VER EL ESTADO DE LA ORDEN Y PODER PAGARLA O VERIFICAR SI SE PAGO O NO
    // 12. AL PICNCHAR UNA ORDEN CON STATUS PAID EN FALSO TOMO EL EXTERNAL REFERENCE LLAMO AL PAYMENT CON GETPAYMENTBYREFERENCE, Y SI DEVUELVE ERROR ES POR QUE NO SE HA PAGADO PORQUE NOHAY PAYMENT,
    // 13. SI DEVUELVE EL PAYMENT ES POR QUE SE INTENTO PAGAR, CHEQUEAR EL STATUS,
    // 14. SI EL ESTATUS ES APROBADO SE ACTUALIZA EL STATUS DE LA ORDEN A PAGADO Y SE GUARDA EL PAYMENT ID EN LA ORDEN
    // 15 SI EL STATUS PENDING O RECHAZADO PODEMOS ELEGIR PAGAR LA ORDEN TOMANDO EL PREFERENCE ID PREVIAMENTE GUARDADO EN LA ORDEN CUANDO SE CREO EL PREFERENCE EN CREATEPREFERENCE Y LLAMANDO AL ENDPOINT DE OBTENCION DE PREFERENCIA
    // GETPREFERENCEBYID
    // 16. Y VOLVER AL FLUJO DE PAGO DE LA ORDEN
    // 17. EN CAMBIO SI YA NO ES POSIBLE PAGAR UNA ORDEN POR QUE LA PREFERENCIA  EXPIRO SE DEBE ELIMINAR LA ORDEN
    // 17. POR LO TANTO EN WEBHOOK CON O SN WEBHOOK O CHEKEANDO SI ESTA PAGADA , LA ORDEN UNA VEZ CREADA SIEMPRE SE ACTUALIZA POR MEDIO DE ESTE FLUJO
    // 18. O SE ELIMINA SI ES QUE LA PREFERENCIA YA ESTSA OBSOLETA O CAUCADA

    // TODO: GUARDAR PREFERENCE ID POR SI EL PAGO QUEDO EN STAND BY Y PAYMENT ID PARA VALIDAR PAGO EN BD
    return {
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      metadata: response.metadata,
      preferenceId: response.id,
      external_reference: response.external_reference,
      baseUrl: response.back_urls,
      notitication_url: response.notification_url,
    };
  }

  //  TODO: VALIDAR FIRMA DE WEBHOOK
  validateSignature(
    xRequestId: string,
    xSignature: string,
    paymentId: string,
  ): boolean {
    const [tsPart, sigPart] = xSignature.split(',');
    const ts = tsPart.split('=')[1];
    const signature = sigPart.split('=')[1];

    const signatureTemplate = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;

    const cyphedSignature = crypto
      .createHmac('sha256', envs.mercadoPagoWebhookSecret!)
      .update(signatureTemplate)
      .digest('hex');

    return cyphedSignature === signature;
  }

  //  TODO: PROCESAR PAGO
  async processPayment(paymentId: string) {
    console.log('Payment ID: desde Process Payment', paymentId);

    const payment = await this.getPayment(paymentId);

    console.log('Payment desde validate:', payment);
    try {
      //   const { mensaje } = payment.metadata;

      switch (payment.status_detail) {
        case 'cc_rejected_insufficient_amount':
          return new HttpException(
            'Saldo insuficiente',
            HttpStatus.BAD_REQUEST,
          );

        case 'cc_rejected_bad_filled_other':
          return new HttpException('Error inesperado', HttpStatus.BAD_REQUEST);

        case 'cc_rejected_bad_filled_security_code':
          return new HttpException(
            'Código de seguridad incorrecto',
            HttpStatus.BAD_REQUEST,
          );

        case 'cc_rejected_bad_filled_date':
          return new HttpException(
            'Fecha de vencimiento incorrecta',
            HttpStatus.BAD_REQUEST,
          );

        case 'cc_rejected_bad_filled_card_number':
          return new HttpException(
            'Número de tarjeta incorrecto',
            HttpStatus.BAD_REQUEST,
          );

        case 'cc_rejected_other_reason':
          return new HttpException(
            'Pago rechazado por un motivo desconocido. Por favor, intenta nuevamente.',
            HttpStatus.BAD_REQUEST,
          );

        case 'cc_rejected_blacklist':
          return new HttpException(
            'Tarjeta rechazada. Por favor, contacta con tu banco.',
            HttpStatus.FORBIDDEN,
          );

        case 'cc_rejected_call_for_authorize':
          return new HttpException(
            'Debes contactar con tu banco para autorizar la transacción.',
            HttpStatus.PRECONDITION_REQUIRED,
          );

        case 'cc_rejected_card_disabled':
          return new HttpException(
            'La tarjeta está deshabilitada. Por favor, contacta con tu banco.',
            HttpStatus.FORBIDDEN,
          );

        case 'cc_rejected_max_attempts':
          return new HttpException(
            'Has alcanzado el límite de intentos permitidos. Intenta nuevamente más tarde.',
            HttpStatus.TOO_MANY_REQUESTS,
          );

        case 'cc_rejected_duplicated_payment':
          return new HttpException(
            'El pago ya fue realizado anteriormente.',
            HttpStatus.CONFLICT,
          );

        case 'cc_rejected_high_risk':
          return new HttpException(
            'El pago fue rechazado por medidas de seguridad. Intenta con otro método de pago.',
            HttpStatus.FORBIDDEN,
          );
      }

      //   TODO: PUEDO HACER ESSTO O TOMARLO DEL EXTERNAL REFERENCE QQUE SERA LA EL ID DE ORDEN
      const orderId = payment.external_reference;
      console.log('Order ID desde validate:', orderId);

      //   const existingPayment = await prismadb.donacion.findFirst({
      //     where: { paymentId: payment.id?.toString() },
      //   });

      //   if (existingPayment) {
      //     return { message: 'Payment already exists, no new record created' };
      //   }

      //   const newPaymentRecord = await prismadb.donacion.create({
      //     data: {
      //       monto: payment.transaction_amount!.toString(),
      //       mensaje: mensaje,
      //       paymentId: payment.id?.toString()!,
      //       statusPayment: payment.status!,
      //     },
      //   });

      console.log('Payment processed successfully:', payment);

      return { message: 'Payment processed successfully' };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new HttpException(
        'Error processing payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPayment(paymentId: string) {
    console.log('Payment ID desde getPayment:', paymentId);

    try {
      const payment = await new Payment(this.client).get({ id: paymentId });
      return payment;
    } catch (error) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }
  }

  //   TODO: OBTENER PREFERENCIA POR ID

  //   ESTE ENDPOINT LLAMAMOS SI SE SALIO DE WEBHOOK O SE CAYO LA PAGINA
  //   PERO QUE SE REALIZO EL PAGO Y NO SE ACTUALIZO EL STATUS DE LA ORDEN
  //   SI NO ESTA PAGADO LLAMAMOS ESTE ENDPOINT Y LE PASAMOS EL ID DE LA PREFERENCIA
  //   SI DEVUELVE QUE EXPIRO DEBERIAMOS ELIMINAR LA ORDEN
  async getPreferenceByPreferenceId(preferenceId: string) {
    try {
      const preference = await new Preference(this.client).get({
        preferenceId,
        requestOptions: {},
      });

      if (!preference) {
        throw new HttpException('Preference not found', HttpStatus.NOT_FOUND);
      }

      //   TODO: ELIMINAR ORDEN SI LA PRFERENCIA EXPIRO
      //   ELIMINAR ORDEN SI LA PREFERENCIA YA NO ESTA ACTIVA
      if (preference.expires) {
        return new HttpException(
          'La orden ya no está activa, vuelve a comprar',
          HttpStatus.NOT_FOUND,
        );
      } else {
        return preference;
      }
    } catch (error) {
      throw new HttpException('Preference not found', HttpStatus.NOT_FOUND);
    }
  }

  // TODO: BUSCAR PAGO POR REFERENCIA

  // CUANDO CREO LA PREFERENCIA PUEDO DARLE UN EXTERNAL REFERENCIA PUEDE SER EL ID DE LA ORDEN POR EJEM
  // si se sale o se desconecta o cualquier cosa, se puede buscar por el external reference
  // en el front decidir si el status es aprobado o no y si no esta aprobado se puede volver a pagar llamando al endopoint de la preferencia
  // este dato deberia guardarse en la orden
  // entonces el usuario deberia tener acceso a la orden donde estaran el external reference y el preference id
  // en caso de que este pagada en la orden deberiamos guardar el payment id
  // en caso de que no este pagada deberiamos tomar el id de la preferencia y llamar al endpoint que levanta la preferencia para que pague
  // osea que el usuaio deberia tener acceso a un historial de ordenes y poder ver el estado de la orden

  // este endpoint llamaremos si el usuario ve que pago una orden per no sale como aprobada por que no espero el webhook o se salio o se corto la luz
  // entonces el usuario podra ver la orden tomar el external reference y llamar a este endpoint para ver si se pago o no

  // si el payment esta pero no esta pagado osea que es distinto de aprovved el status, podra tomar el preference id y llamar al endpoint de la preferencia para pagar
  async getPaymentByReference(externalReference: string) {
    console.log(
      'External Reference desde getPaymentByExternalReference:',
      externalReference,
    );

    try {
      const payment = await new Payment(this.client).search({
        options: {
          external_reference: externalReference,
        },
      });

      if (!payment.results.length) {
        return new HttpException(
          'El pago aun no esta realizado',
          HttpStatus.NOT_FOUND,
        );
      }

      const id = payment.results[0].id;

      const paymentSearch = await this.getPayment(id);

      //   si el status esta aprobaado aqui debneriamos llamar a la orden y actualizar el status de la orden a pagado y guardar el payment id en la orden

      return {
        status: paymentSearch.status,
        payment_id: paymentSearch.id,
        id: id,
      };
    } catch (error) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }
  }
}

// async processPayment(paymentId: string) {
//     console.log('Payment ID desde Process Payment:', paymentId);

//     try {
//       // Esperar 3 segundos antes de consultar el pago
//       await new Promise((resolve) => setTimeout(resolve, 3000));

//       const payment = await new Payment(this.client).get({ id: paymentId });

//       console.log('Payment desde validate:', payment);

//       if (!payment) {
//         throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
//       }

//       // Procesar el pago normalmente
//       console.log('Payment processed successfully:', payment);
//       return { message: 'Payment processed successfully' };
//     } catch (error) {
//       console.error('Error processing payment:', error);
//       throw new HttpException(
//         'Error processing payment',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
// }
