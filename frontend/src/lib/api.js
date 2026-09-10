/**
 * Vortiqen API Client
 *
 * The single source of truth for frontend-to-backend network communication.
 * Connects to the Vortiqen API to submit enquiries and verify service status.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
      ? 'http://localhost:8000'
      : ''

const REQUEST_TIMEOUT_MS = 15000

/**
 * Custom API error carrying status and human-friendly user message.
 */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * Submit an enquiry to POST /api/contact.
 *
 * @param {Object} payload
 * @param {string} payload.name - Visitor name (min 2, max 120 chars)
 * @param {string} payload.email - Work email address
 * @param {string} [payload.company] - Company name
 * @param {string} [payload.service] - Service category slug
 * @param {string} payload.message - Enquiry description (min 20, max 4000 chars)
 * @param {string} [payload.company_website] - Honeypot field (must remain empty)
 * @returns {Promise<{success: boolean, message: string, reference: string, timestamp: string}>}
 */
export async function submitContact(payload) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const url = `${API_BASE_URL}/api/contact`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(
          data?.detail ||
            "You've submitted several enquiries recently. Please wait a few minutes before trying again.",
          429
        )
      }

      if (response.status === 422) {
        // FastAPI / Pydantic validation error
        const firstError = data?.detail?.[0]?.msg || 'Please check your inputs and try again.'
        throw new ApiError(firstError, 422, data?.detail)
      }

      if (response.status >= 500) {
        throw new ApiError(
          data?.detail ||
            'Something went wrong while processing your enquiry. Please try again shortly.',
          response.status
        )
      }

      throw new ApiError(
        data?.detail || `Submission failed with status code ${response.status}`,
        response.status
      )
    }

    return data
  } catch (err) {
    clearTimeout(timeoutId)

    if (err.name === 'AbortError') {
      throw new ApiError(
        'The request timed out. Please check your network connection and try again.',
        408
      )
    }

    if (err instanceof ApiError) {
      throw err
    }

    throw new ApiError(
      'Unable to connect to the Vortiqen service. Please verify your internet connection.',
      0
    )
  }
}

/**
 * Check backend service health status.
 */
export async function checkHealth() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) return null
    return await response.json()
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}
