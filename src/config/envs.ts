import 'dotenv/config';
import * as joi from 'joi';
interface EnvVars {
  PORT: number;
  MERCADO_PAGO_WEBHOOK_SECRET: string;
  MERCADO_PAGO_ACCESS_TOKEN: string;
  BASE_URL_WEBHOOK: string;
  NATS_SERVERS: string[];
}
const envsSchema: joi.ObjectSchema = joi.object({
  PORT: joi.number().required(),
  MERCADO_PAGO_WEBHOOK_SECRET: joi.string().required(),
  MERCADO_PAGO_ACCESS_TOKEN: joi.string().required(),
  BASE_URL_WEBHOOK: joi.string().required(),
  NATS_SERVERS: joi.array().items(joi.string()).required(),
}).unknown(true);
// TODO: NATS MODIFICAMOS VARIABLES PARA PODER TOMAR LOS ELEMENTOS DE LA VARAIBLE DE ENTORNO
const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});
if(error) {
    throw new Error(`Config validation error: ${error.message}`);
}
const envVars: EnvVars = value;
export const envs = {
    port: envVars.PORT,
    mercadoPagoWebhookSecret: envVars.MERCADO_PAGO_WEBHOOK_SECRET,
    mercadoPagoAccessToken: envVars.MERCADO_PAGO_ACCESS_TOKEN,
    baseUrlWebhook: envVars.BASE_URL_WEBHOOK,
    natsServers: envVars.NATS_SERVERS,
}