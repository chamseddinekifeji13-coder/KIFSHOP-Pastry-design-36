/**
 * POS80 API Client
 * Handles all communication with the POS80 system
 */

export interface POS80Config {
  apiUrl: string
  apiKey: string
  merchantId: string
  terminalId?: string
  authType: 'bearer' | 'basic' | 'api_key'
}

export interface POS80Transaction {
  id: string
  timestamp: string
  amount: number
  currency: string
  merchantId: string
  terminalId: string
  paymentMethod: string
  items?: POS80Item[]
  receiptNumber?: string
  status: 'success' | 'failed' | 'pending'
  description?: string
}

export interface POS80Item {
  sku: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
}

export class POS80ApiClient {
  private config: POS80Config
  private responseTimeMs: number = 0

  constructor(config: POS80Config) {
    this.config = config
  }

  /**
   * Get response time of last API call
   */
  getLastResponseTime(): number {
    return this.responseTimeMs
  }

  /**
   * Build authorization headers based on auth type
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    switch (this.config.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
        break
      case 'api_key':
        headers['X-API-Key'] = this.config.apiKey
        break
      case 'basic':
        const encoded = Buffer.from(`${this.config.merchantId}:${this.config.apiKey}`).toString('base64')
        headers['Authorization'] = `Basic ${encoded}`
        break
    }

    return headers
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      const startTime = Date.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      this.responseTimeMs = Date.now() - startTime

      if (response.ok) {
        return { success: true, message: 'Connexion réussie', responseTime: this.responseTimeMs }
      }
      return { success: false, message: `Erreur HTTP ${response.status}` }
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      }
    }
  }

  /**
   * Fetch recent transactions from POS80
   * @param limit Number of transactions to fetch (default: 100)
   * @param since Timestamp to fetch transactions since (ISO string or Unix timestamp)
   */
  async fetchTransactions(limit: number = 100, since?: string): Promise<POS80Transaction[]> {
    try {
      const startTime = Date.now()
      const params = new URLSearchParams({
        limit: limit.toString(),
        merchantId: this.config.merchantId,
      })

      if (this.config.terminalId) {
        params.append('terminalId', this.config.terminalId)
      }

      if (since) {
        params.append('since', since)
      }

      const url = `${this.config.apiUrl}/transactions?${params.toString()}`

      const ctrl1 = new AbortController()
      const tid1 = setTimeout(() => ctrl1.abort(), 30000)
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: ctrl1.signal,
      })
      clearTimeout(tid1)

      this.responseTimeMs = Date.now() - startTime

      if (!response.ok) {
        console.error(`[v0] POS80 API Error: ${response.status} ${response.statusText}`)
        return []
      }

      const data = await response.json()
      return this.normalizePOS80Transactions(data)
    } catch (error) {
      console.error('[v0] Error fetching POS80 transactions:', error)
      return []
    }
  }

  /**
   * Fetch daily sales report
   */
  async fetchDailySalesReport(date: string): Promise<{
    totalRevenue: number
    transactionCount: number
    transactions: POS80Transaction[]
  } | null> {
    try {
      const startTime = Date.now()
      const params = new URLSearchParams({
        date,
        merchantId: this.config.merchantId,
      })

      if (this.config.terminalId) {
        params.append('terminalId', this.config.terminalId)
      }

      const url = `${this.config.apiUrl}/reports/daily?${params.toString()}`

      const ctrl2 = new AbortController()
      const tid2 = setTimeout(() => ctrl2.abort(), 30000)
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: ctrl2.signal,
      })
      clearTimeout(tid2)

      this.responseTimeMs = Date.now() - startTime

      if (!response.ok) {
        console.error(`[v0] POS80 Daily Report Error: ${response.status}`)
        return null
      }

      const data = await response.json()
      return {
        totalRevenue: data.totalRevenue || 0,
        transactionCount: data.transactionCount || 0,
        transactions: this.normalizePOS80Transactions(data.transactions || []),
      }
    } catch (error) {
      console.error('[v0] Error fetching POS80 daily report:', error)
      return null
    }
  }

  /**
   * Normalize POS80 API response to our Transaction format
   */
  private normalizePOS80Transactions(data: any): POS80Transaction[] {
    if (!Array.isArray(data)) return []

    return data.map((tx: any) => ({
      id: tx.id || tx.transactionId,
      timestamp: tx.timestamp || tx.createdAt || new Date().toISOString(),
      amount: Number(tx.amount || 0),
      currency: tx.currency || 'TND',
      merchantId: tx.merchantId || this.config.merchantId,
      terminalId: tx.terminalId || this.config.terminalId || '',
      paymentMethod: tx.paymentMethod || 'cash',
      items: tx.items || [],
      receiptNumber: tx.receiptNumber,
      status: tx.status || 'success',
      description: tx.description,
    }))
  }
}

/**
 * Create POS80 client from config stored in database
 */
export async function createPOS80Client(config: POS80Config): Promise<POS80ApiClient> {
  return new POS80ApiClient(config)
}
