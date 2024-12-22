import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";



export class PayerDto {
  name: string;
  surname: string;
  phone: PhoneDto;
  address: AddressDto;
}




export class BackUrlsDto {
  success: string;
  failure: string;
  pending: string;
}

export class PreferenceItemDto {

  @IsString()
  id: string
  

  @IsString()
  title: string;

  @IsString()
  currency_id: string;

  @IsString()
  picture_url: string;

  @IsString()
  description: string;

  @IsString()
  category_id: string;

  @IsNumber()
  quantity: number;
  
  @IsNumber()
  unit_price: number;
}


export class PhoneDto {
  area_code: string;
  number: string;
}

export class AddressDto {
  street_number: string;
}

export class CustomPreferenceDto {

  @IsString()
  orderId?: string

  @IsArray()  
  @ArrayMinSize(1)
  @ValidateNested({ each: true })   
  @Type(() => PreferenceItemDto)
  items: PreferenceItemDto[];

  // Permitir que ciertos campos sean opcionales
  @IsOptional()
  @IsString()
  external_reference?: string;

  @IsOptional()
  @IsString()
  notification_url: string;

  @IsOptional()
  @IsObject()
  metadata?: { [key: string]: string };

  @IsOptional()
  @Type(() => PayerDto)
  payer?: PayerDto;

  @IsOptional()
  @Type(() => BackUrlsDto)
  back_urls?: BackUrlsDto;

  @IsOptional()
  @IsString()
  auto_return?: string;
}

