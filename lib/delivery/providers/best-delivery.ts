/**
 * Best Delivery Provider Implementation
 * Wraps existing Best Delivery API integration
 */

import {
  BaseDeliveryProvider,
  CreateOrderRequest,
  CreateOrderResponse,
  TrackingInfo,
  SyncStatusResponse,
  DeliveryProviderCredentials,
} from '../types';

export class BestDeliveryProvider extends BaseDeliveryProvider {
  constructor(credentials: DeliveryProviderCredentials) {
    super(credentials);
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.api_key}`,
      'Content-Type': 'application/json',
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.credentials.api_key || !this.credentials.api_secret) {
        console.error('[BestDelivery] Missing required credentials: api_key or api_secret');
        return false;
      }

      // Validate by checking API connectivity
      const response = await this.makeRequest<any>(
        'GET',
        '/v1/test'
      ).catch(() => null);

      return response !== null;
    } catch (error) {
      console.error('[BestDelivery] Validation error:', error);
      return false;
    }
  }

  async sendOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const payload = {
        api_key: this.credentials.api_key,
        api_secret: this.credentials.api_secret,
        shipment: {
          reference: request.order_number,
          shipper: {
            name: this.credentials.extra_config?.shipper_name || 'KifShop',
            phone: this.credentials.extra_config?.shipper_phone || '',
            address: this.credentials.extra_config?.shipper_address || '',
          },
          consignee: {
            name: request.customer_name,
            phone: request.customer_phone,
            address: request.customer_address,
            city: request.customer_city,
            state: request.customer_governorate,
            postal_code: request.customer_postal_code,
          },
          parcel: {
            weight: request.total_weight || 1,
            description: request.items_description || 'Order items',
          },
          service_type: request.delivery_type === 'express' ? 'EXPRESS' : 'STANDARD',
          cod_amount: request.cod_amount || 0,
        },
      };

      const response = await this.makeRequest<any>(
        'POST',
        '/v1/shipments/create',
        payload
      );

      if (response.success && response.shipment) {
        return {
          success: true,
          tracking_number: response.shipment.tracking_number,
          provider_shipment_id: response.shipment.id,
          message: 'Order sent successfully',
          raw_response: response,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to send order',
        raw_response: response,
      };
    } catch (error) {
      console.error('[BestDelivery] Send order error:', error);
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
        `/v1/shipments/${tracking_number}/tracking`
      );

      return {
        tracking_number,
        status: response.status || response.current_status || 'unknown',
        last_update: new Date(response.last_update || Date.now()),
        location: response.location || response.current_location,
        events: response.events?.map((event: any) => ({
          timestamp: new Date(event.timestamp),
          status: event.status,
          location: event.location,
          notes: event.notes || event.description,
        })),
      };
    } catch (error) {
      console.error('[BestDelivery] Track shipment error:', error);
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
      console.error('[BestDelivery] Sync status error:', error);
      throw error;
    }
  }
}
