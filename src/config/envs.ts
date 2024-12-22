import 'dotenv/config';
import * as joi from 'joi';
interface EnvVars {
  PORT: number;
  MERCADO_PAGO_WEBHOOK_SECRET: string;
  MERCADO_PAGO_ACCESS_TOKEN: string;
  BASE_URL_WEBHOOK: string;
}
const envsSchema: joi.ObjectSchema = joi.object({
  PORT: joi.number().required(),
  MERCADO_PAGO_WEBHOOK_SECRET: joi.string().required(),
  MERCADO_PAGO_ACCESS_TOKEN: joi.string().required(),
  BASE_URL_WEBHOOK: joi.string().required(),
}).unknown(true);
const { error, value } = envsSchema.validate(process.env);
if(error) {
    throw new Error(`Config validation error: ${error.message}`);
}
const envVars: EnvVars = value;
export const envs = {
    port: envVars.PORT,
    mercadoPagoWebhookSecret: envVars.MERCADO_PAGO_WEBHOOK_SECRET,
    mercadoPagoAccessToken: envVars.MERCADO_PAGO_ACCESS_TOKEN,
    baseUrlWebhook: envVars.BASE_URL_WEBHOOK,
}