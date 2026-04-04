/**
 * Delivery Provider Types and Interfaces
 * Defines the contract for all delivery provider integrations
 */

export type DeliveryProviderCode = 'best_delivery' | 'aramex' | 'first_delivery';

export interface DeliveryProviderCredentials {
  id: string;
  tenant_id: string;
  provider_code: DeliveryProviderCode;
  provider_name: string;
  api_key?: string;
  api_secret?: string;
  account_number?: string;
  account_pin?: string;
  username?: string;
  password?: string;
  base_url?: string;
  webhook_url?: string;
  extra_config?: Record<string, any>;
  is_enabled: boolean;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderRequest {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_governorate: string;
  customer_postal_code?: string;
  cod_amount?: number;
  delivery_type?: 'standard' | 'express' | 'same_day';
  items_description?: string;
  total_weight?: number;
}

export interface CreateOrderResponse {
  success: boolean;
  tracking_number?: string;
  provider_shipment_id?: string;
  awb_number?: string;
  message?: string;
  raw_response?: any;
}

export interface TrackingInfo {
  tracking_number: string;
  status: string;
  last_update: Date;
  location?: string;
  events?: Array<{
    timestamp: Date;
    status: string;
    location?: string;
    notes?: string;
  }>;
}

export interface SyncStatusResponse {
  tracking_number: string;
  current_status: string;
  updated_at: Date;
  tracking_info?: TrackingInfo;
}

export abstract class BaseDeliveryProvider {
  protected credentials: DeliveryProviderCredentials;

  constructor(credentials: DeliveryProviderCredentials) {
    this.credentials = credentials;
  }

  abstract sendOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;
  abstract trackShipment(tracking_number: string): Promise<TrackingInfo>;
  abstract syncStatus(tracking_number: string): Promise<SyncStatusResponse>;
  abstract validateCredentials(): Promise<boolean>;

  protected getBaseUrl(): string {
    return this.credentials.base_url || '';
  }

  protected getHeaders(): Record<string, string> {
    return {};
  }

  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

export interface DeliveryShipment {
  id: string;
  tenant_id: string;
  order_id: string;
  order_number: string;
  provider_code: DeliveryProviderCode;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_governorate: string;
  customer_postal_code?: string;
  delivery_type: string;
  tracking_number?: string;
  provider_shipment_id?: string;
  awb_number?: string;
  cod_amount: number;
  shipping_cost: number;
  status: string;
  status_history: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
  }>;
  notes?: string;
  exported_at?: Date;
  last_sync_at?: Date;
  response_data?: any;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}
