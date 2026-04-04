/**
 * First Delivery Provider Implementation
 */

import {
  BaseDeliveryProvider,
  CreateOrderRequest,
  CreateOrderResponse,
  TrackingInfo,
  SyncStatusResponse,
  DeliveryProviderCredentials,
} from '../types';

export class FirstDeliveryProvider extends BaseDeliveryProvider {
  constructor(credentials: DeliveryProviderCredentials) {
    super(credentials);
  }

  protected getHeaders(): Record<string, string> {
    return {
      'X-API-Key': this.credentials.api_key || '',
      'Content-Type': 'application/json',
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.credentials.api_key) {
        console.error('[FirstDelivery] Missing API key');
        return false;
      }

      const response = await this.makeRequest<any>(
        'GET',
        '/api/health'
      ).catch(() => null);

      return response !== null;
    } catch (error) {
      console.error('[FirstDelivery] Validation error:', error);
      return false;
    }
  }

  async sendOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const payload = {
        order_reference: request.order_number,
        recipient: {
          name: request.customer_name,
          phone: request.customer_phone,
          address: request.customer_address,
          city: request.customer_city,
          region: request.customer_governorate,
          postal_code: request.customer_postal_code,
        },
        package: {
          weight: request.total_weight || 1,
          description: request.items_description || 'Order items',
          value: request.cod_amount || 0,
          is_fragile: false,
        },
        service: request.delivery_type === 'express' ? 'EXPRESS' : 'STANDARD',
        cod_amount: request.cod_amount || 0,
        notes: '',
      };

      const response = await this.makeRequest<any>(
        'POST',
        '/api/orders',
        payload
      );

      if (response.success && response.tracking_number) {
        return {
          success: true,
          tracking_number: response.tracking_number,
          provider_shipment_id: response.order_id,
          message: 'Order created successfully',
          raw_response: response,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to create order',
        raw_response: response,
      };
    } catch (error) {
      console.error('[FirstDelivery] Send order error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async trackShipment(tracking_number: string): Promise<TrackingInfo> {
    try {
      const response = await this.makeRequest<any>(
        'GET',
        `/api/tracking/${tracking_number}`
      );

      return {
        tracking_number,
        status: response.current_status || response.status || 'unknown',
        last_update: new Date(response.last_update || Date.now()),
        location: response.current_location || response.location,
        events: response.status_history?.map((event: any) => ({
          timestamp: new Date(event.timestamp),
          status: event.status,
          location: event.location,
          notes: event.description,
        })),
      };
    } catch (error) {
      console.error('[FirstDelivery] Track shipment error:', error);
      throw error;
    }
  }

  async syncStatus(tracking_number: string): Promise<SyncStatusResponse> {
    try {
      const trackingInfo = await this.trackShipment(tracking_number);

      return {
        tracking_number,
        current_status: trackingInfo.status,
        updated_at: new Date(),
        tracking_info: trackingInfo,
      };
    } catch (error) {
      console.error('[FirstDelivery] Sync status error:', error);
      throw error;
    }
  }
}
