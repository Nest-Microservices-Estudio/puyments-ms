import MercadoPagoConfig from "mercadopago";
import { envs } from "./envs";

export const client = new MercadoPagoConfig({
    accessToken: envs.mercadoPagoAccessToken,
        
});