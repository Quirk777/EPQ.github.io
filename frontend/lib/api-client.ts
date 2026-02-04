/**
 * Centralized API client with error handling, retry logic, and consistent error normalization
 */

export interface APIError {
  message: string;
  status?: number;
  code?: string;
  retryable?: boolean;
}

export interface APIResponse<T = any> {
  data?: T;
  error?: APIError;
  success: boolean;
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipRetry?: boolean;
}

class APIClient {
  private baseURL: string;
  private defaultTimeout: number = 10000;
  private defaultRetries: number = 3;
  private defaultRetryDelay: number = 1000;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Main request method with automatic error handling and retry logic
   */
  async request<T = any>(
    endpoint: string, 
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      skipRetry = false
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    
    // Prepare request configuration
    const requestConfig: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include', // Include cookies for session auth
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    let lastError: APIError | null = null;
    const maxAttempts = skipRetry ? 1 : retries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, requestConfig, timeout);
        
        // Handle successful responses
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          let data: T;
          
          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else {
            // Handle non-JSON responses
            data = (await response.text()) as unknown as T;
          }

          return {
            data,
            success: true,
          };
        }

        // Handle HTTP error responses
        const error = await this.handleErrorResponse(response);
        
        // Don't retry client errors (4xx) except for specific cases
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          return {
            error,
            success: false,
          };
        }

        lastError = error;
        
        // If this is the last attempt, return the error
        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);

      } catch (err) {
        // Handle network errors and timeouts
        const error = this.normalizeError(err);
        lastError = error;
        
        // If this is the last attempt or error is not retryable, return the error
        if (attempt === maxAttempts || !error.retryable) {
          break;
        }

        // Wait before retrying
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    return {
      error: lastError || { message: 'Unknown error occurred', retryable: false },
      success: false,
    };
  }

  /**
   * GET request helper
   */
  async get<T = any>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request helper
   */
  async patch<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string, 
    config: RequestInit, 
    timeout: number
  ): Promise<Response> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (abortController.signal.aborted) {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Handle error responses and extract error information
   */
  private async handleErrorResponse(response: Response): Promise<APIError> {
    const status = response.status;
    let message = `HTTP ${status}: ${response.statusText}`;
    let code: string | undefined;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        message = errorData.message || errorData.detail || errorData.error || message;
        code = errorData.code || errorData.type;
      } else {
        const text = await response.text();
        if (text && text.length < 200) {
          message = text;
        }
      }
    } catch {
      // If we can't parse the error response, use the default message
    }

    return {
      message,
      status,
      code,
      retryable: status >= 500 || status === 408 || status === 429, // Retry server errors, timeouts, and rate limits
    };
  }

  /**
   * Normalize various error types into a consistent APIError format
   */
  private normalizeError(error: unknown): APIError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection.',
        retryable: true,
      };
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return {
          message: 'Request timeout. Please try again.',
          code: 'TIMEOUT',
          retryable: true,
        };
      }

      if (error.message.includes('aborted')) {
        return {
          message: 'Request was cancelled',
          code: 'ABORTED',
          retryable: false,
        };
      }

      return {
        message: error.message,
        retryable: true,
      };
    }

    return {
      message: 'An unexpected error occurred',
      retryable: true,
    };
  }

  /**
   * Helper to sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create a default instance
export const apiClient = new APIClient();

// Export the class for custom instances if needed
export { APIClient };