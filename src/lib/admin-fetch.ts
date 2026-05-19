/**
 * Admin API fetch utility — automatically includes Bearer token from localStorage
 * Use this instead of raw fetch() for all admin API calls
 */

const AUTH_KEY = 'goalzone_admin_token'

export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY) : null

    const headers = new Headers(options.headers || {})

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    // Auto-set Content-Type for JSON bodies if not already set
    if (
        options.body &&
        typeof options.body === 'string' &&
        !headers.has('Content-Type')
    ) {
        headers.set('Content-Type', 'application/json')
    }

    return fetch(url, { ...options, headers })
}

/**
 * Get the current admin auth token
 */
export function getAdminToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_KEY)
}
