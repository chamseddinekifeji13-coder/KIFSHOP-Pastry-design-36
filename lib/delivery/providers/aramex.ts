/**
 * Aramex Delivery Provider Implementation
 */

import {
  BaseDeliveryProvider,
  CreateOrderRequest,
  CreateOrderResponse,
  TrackingInfo,
  SyncStatusResponse,
  DeliveryProviderCredentials,
} from '../types';

export class AramexProvider extends BaseDeliveryProvider {
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
      if (!this.credentials.api_key || !this.credentials.account_number) {
        console.error('[Aramex] Missing required credentials: api_key or account_number');
        return false;
      }

      // Test basic connectivity with a simple request
      const response = await this.makeRequest<any>(
        'GET',
        '/api/validate'
      ).catch(() => null);

      return response !== null;
    } catch (error) {
      console.error('[Aramex] Validation error:', error);
      return false;
    }
  }

  async sendOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const payload = {
        account_number: this.credentials.account_number,
        account_pin: this.credentials.account_pin,
        shipments: [
          {
            reference: request.order_number,
            shipper: {
              name: 'KifShop',
              phone: this.credentials.extra_config?.shipper_phone || '',
              address: this.credentials.extra_config?.shipper_address || '',
              city: this.credentials.extra_config?.shipper_city || 'Tunis',
            },
            consignee: {
              name: request.customer_name,
              phone: request.customer_phone,
              address: request.customer_address,
              city: request.customer_city,
              state: request.customer_governorate,
              postal_code: request.customer_postal_code,
            },
            commodity: [
              {
                weight: {
                  value: request.total_weight || 1,
                  unit: 'KG',
                },
                description: request.items_description || 'Order items',
              },
            ],
            service_type: request.delivery_type === 'express' ? 'EXPRESS' : 'STANDARD',
            cash_amount: request.cod_amount || 0,
          },
        ],
      };

      const response = await this.makeRequest<any>(
        'POST',
        '/api/shipments',
        payload
      );

      if (response.shipments && response.shipments.length > 0) {
        const shipment = response.shipments[0];
        return {
          success: true,
          tracking_number: shipment.tracking_number || shipment.reference,
          awb_number: shipment.awb_number,
          provider_shipment_id: shipment.id,
          message: 'Order sent successfully',
          raw_response: response,
        };
      }

      return {
        success: false,
        message: 'No shipment in response',
        raw_response: response,
      };
    } catch (error) {
      console.error('[Aramex] Send order error:', error);
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
        status: response.status || 'unknown',
        last_update: new Date(response.last_update || Date.now()),
        location: response.location,
        events: response.events?.map((event: any) => ({
          timestamp: new Date(event.timestamp),
          status: event.status,
          location: event.location,
          notes: event.notes,
        })),
      };
    } catch (error) {
      console.error('[Aramex] Track shipment error:', error);
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
      console.error('[Aramex] Sync status error:', error);
      throw error;
    }
  }
}
