/**
 * Delivery Provider Factory
 * Creates and manages delivery provider instances based on provider code
 */

import {
  DeliveryProviderCode,
  DeliveryProviderCredentials,
  BaseDeliveryProvider,
} from './types';
import { BestDeliveryProvider } from './providers/best-delivery';
import { AramexProvider } from './providers/aramex';
import { FirstDeliveryProvider } from './providers/first-delivery';

export class DeliveryProviderFactory {
  private static providers: Map<
    DeliveryProviderCode,
    new (credentials: DeliveryProviderCredentials) => BaseDeliveryProvider
  > = new Map<DeliveryProviderCode, new (credentials: DeliveryProviderCredentials) => BaseDeliveryProvider>([
    ['best_delivery', BestDeliveryProvider],
    ['aramex', AramexProvider],
    ['first_delivery', FirstDeliveryProvider],
  ]);

  /**
   * Create a delivery provider instance
   */
  static create(
    credentials: DeliveryProviderCredentials
  ): BaseDeliveryProvider {
    const ProviderClass = this.providers.get(credentials.provider_code);

    if (!ProviderClass) {
      throw new Error(
        `Unknown delivery provider: ${credentials.provider_code}`
      );
    }

    return new ProviderClass(credentials);
  }

  /**
   * Register a custom provider
   */
  static register(
    code: DeliveryProviderCode,
    providerClass: new (
      credentials: DeliveryProviderCredentials
    ) => BaseDeliveryProvider
  ) {
    this.providers.set(code, providerClass);
  }

  /**
   * Get all registered provider codes
   */
  static getAvailableProviders(): DeliveryProviderCode[] {
    return Array.from(this.providers.keys());
  }
}
