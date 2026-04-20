/**
 * Unified Delivery Service
 * Provides a single interface for all delivery provider operations
 */

import { createClient } from '@/lib/supabase/client';
import { DeliveryProviderFactory } from './factory';
import {
  DeliveryProviderCode,
  CreateOrderRequest,
  CreateOrderResponse,
  TrackingInfo,
  SyncStatusResponse,
  DeliveryShipment,
} from './types';

export class UnifiedDeliveryService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Get active provider credentials for the tenant
   */
  private async getProviderCredentials(
    providerCode: DeliveryProviderCode
  ) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('delivery_provider_credentials')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('provider_code', providerCode)
      .eq('is_enabled', true)
      .single();

    if (error) {
      console.error(`[Delivery] Error fetching ${providerCode} credentials:`, error);
      return null;
    }

    return data;
  }

  /**
   * Get the default provider for the tenant
   */
  private async getDefaultProvider() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('delivery_provider_credentials')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_enabled', true)
      .eq('is_default', true)
      .single();

    if (error) {
      console.error('[Delivery] Error fetching default provider:', error);
      return null;
    }

    return data;
  }

  /**
   * Send order to a specific delivery provider
   */
  async sendToDeliveryProvider(
    request: CreateOrderRequest,
    providerCode?: DeliveryProviderCode
  ): Promise<CreateOrderResponse & { shipment_id?: string }> {
    try {
      // Get provider credentials
      let credentials;
      if (providerCode) {
        credentials = await this.getProviderCredentials(providerCode);
      } else {
        credentials = await this.getDefaultProvider();
      }

      if (!credentials) {
        return {
          success: false,
          message: `Provider ${providerCode || 'default'} not configured or not enabled`,
        };
      }

      // Create provider instance
      const provider = DeliveryProviderFactory.create(credentials);

      // Validate credentials
      const isValid = await provider.validateCredentials();
      if (!isValid) {
        return {
          success: false,
          message: `Invalid credentials for provider ${credentials.provider_name}`,
        };
      }

      // Send order
      const response = await provider.sendOrder(request);

      // Save shipment record
      if (response.success && response.tracking_number) {
        const shipmentId = await this.createShipmentRecord(
          request,
          credentials.provider_code as DeliveryProviderCode,
          response
        );
        return { ...response, shipment_id: shipmentId ?? undefined };
      }

      return response;
    } catch (error) {
      console.error('[Delivery] Send order error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Track shipment with the provider
   */
  async trackShipment(
    tracking_number: string,
    providerCode?: DeliveryProviderCode
  ): Promise<TrackingInfo | null> {
    try {
      let credentials;
      if (providerCode) {
        credentials = await this.getProviderCredentials(providerCode);
      } else {
        // Try to find by tracking number in database
        const shipment = await this.getShipmentByTrackingNumber(tracking_number);
        if (shipment) {
          credentials = await this.getProviderCredentials(
            shipment.provider_code as DeliveryProviderCode
          );
        } else {
          credentials = await this.getDefaultProvider();
        }
      }

      if (!credentials) {
        console.error('[Delivery] Provider credentials not found');
        return null;
      }

      const provider = DeliveryProviderFactory.create(credentials);
      return await provider.trackShipment(tracking_number);
    } catch (error) {
      console.error('[Delivery] Track shipment error:', error);
      return null;
    }
  }

  /**
   * Sync shipment status with provider
   */
  async syncDeliveryStatus(
    tracking_number: string,
    providerCode?: DeliveryProviderCode
  ): Promise<SyncStatusResponse | null> {
    try {
      let credentials;
      if (providerCode) {
        credentials = await this.getProviderCredentials(providerCode);
      } else {
        const shipment = await this.getShipmentByTrackingNumber(tracking_number);
        if (shipment) {
          credentials = await this.getProviderCredentials(
            shipment.provider_code as DeliveryProviderCode
          );
        } else {
          credentials = await this.getDefaultProvider();
        }
      }

      if (!credentials) {
        console.error('[Delivery] Provider credentials not found');
        return null;
      }

      const provider = DeliveryProviderFactory.create(credentials);
      const syncResponse = await provider.syncStatus(tracking_number);

      // Update shipment record with new status
      await this.updateShipmentStatus(tracking_number, syncResponse.current_status);

      return syncResponse;
    } catch (error) {
      console.error('[Delivery] Sync status error:', error);
      return null;
    }
  }

  /**
   * Create shipment record in database
   */
  private async createShipmentRecord(
    request: CreateOrderRequest,
    providerCode: DeliveryProviderCode,
    response: CreateOrderResponse
  ): Promise<string | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('delivery_shipments')
        .insert({
          tenant_id: this.tenantId,
          order_id: request.order_id,
          order_number: request.order_number,
          provider_code: providerCode,
          customer_name: request.customer_name,
          customer_phone: request.customer_phone,
          customer_address: request.customer_address,
          customer_city: request.customer_city,
          customer_governorate: request.customer_governorate,
          customer_postal_code: request.customer_postal_code,
          delivery_type: request.delivery_type || 'standard',
          tracking_number: response.tracking_number,
          provider_shipment_id: response.provider_shipment_id,
          awb_number: response.awb_number,
          cod_amount: request.cod_amount || 0,
          status: 'sent',
          response_data: response.raw_response,
          exported_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Delivery] Error creating shipment record:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('[Delivery] Create shipment record error:', error);
      return null;
    }
  }

  /**
   * Get shipment by tracking number
   */
  private async getShipmentByTrackingNumber(
    tracking_number: string
  ): Promise<DeliveryShipment | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('delivery_shipments')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('tracking_number', tracking_number)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('[Delivery] Get shipment error:', error);
      return null;
    }
  }

  /**
   * Update shipment status
   */
  private async updateShipmentStatus(
    tracking_number: string,
    status: string
  ): Promise<void> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('delivery_shipments')
        .update({
          status,
          last_sync_at: new Date().toISOString(),
        })
        .eq('tenant_id', this.tenantId)
        .eq('tracking_number', tracking_number);

      if (error) {
        console.error('[Delivery] Error updating shipment status:', error);
      }
    } catch (error) {
      console.error('[Delivery] Update shipment status error:', error);
    }
  }

  /**
   * Get all shipments for tenant
   */
  async getAllShipments(): Promise<DeliveryShipment[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('delivery_shipments')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Delivery] Error fetching shipments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[Delivery] Get shipments error:', error);
      return [];
    }
  }

  /**
   * Get shipments by status
   */
  async getShipmentsByStatus(status: string): Promise<DeliveryShipment[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('delivery_shipments')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Delivery] Error fetching shipments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[Delivery] Get shipments by status error:', error);
      return [];
    }
  }
}

/**
 * Export factory function
 */
export function createDeliveryService(tenantId: string): UnifiedDeliveryService {
  return new UnifiedDeliveryService(tenantId);
}
