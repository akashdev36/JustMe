import DOMPurify from 'dompurify'
import type { AppError, GoogleUserInfo, DecodedGoogleUser } from '../types'
import { ValidationErrorClass } from '../types'
export { ValidationErrorClass }

// Security constants
export const MAX_TITLE_LENGTH = 255
export const MAX_CONTENT_LENGTH = 1000000 // 1MB of text
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Error codes
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

export class SecurityError extends Error {
  public readonly code: string
  public readonly timestamp: number
  public readonly details?: Record<string, unknown>

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'SecurityError'
    this.code = code
    this.timestamp = Date.now()
    this.details = details
  }
}

// Input validation and sanitization
export function sanitizeHtml(dirty: string): string {
  if (typeof dirty !== 'string') {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Input must be a string')
  }

  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['class', 'data-*'],
    KEEP_CONTENT: true,
  })

  if (clean.length !== dirty.length && dirty.includes('<')) {
    console.warn('Potential XSS attempt detected and sanitized', {
      original: dirty,
      sanitized: clean,
    })
  }

  return clean
}

export function validateNoteTitle(title: unknown): string {
  if (typeof title !== 'string') {
    throw new ValidationErrorClass(ERROR_CODES.VALIDATION_FAILED, 'Title must be a string', 'title', title)
  }

  const trimmed = title.trim()

  if (trimmed.length === 0) {
    return 'Untitled'
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new ValidationErrorClass(
      ERROR_CODES.VALIDATION_FAILED,
      `Title must be less than ${MAX_TITLE_LENGTH} characters`,
      'title',
      title
    )
  }

  return sanitizeHtml(trimmed)
}

export function validateNoteContent(content: unknown): any[] {
  if (!Array.isArray(content)) {
    throw new ValidationErrorClass(ERROR_CODES.VALIDATION_FAILED, 'Content must be an array', 'content', content)
  }

  if (JSON.stringify(content).length > MAX_CONTENT_LENGTH) {
    throw new ValidationErrorClass(
      ERROR_CODES.VALIDATION_FAILED,
      `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      'content',
      content
    )
  }

  return content.map((node, index) => {
    if (!node || typeof node !== 'object') {
      throw new ValidationErrorClass(
        ERROR_CODES.VALIDATION_FAILED,
        `Invalid content node at index ${index}`,
        `content[${index}]`,
        node
      )
    }

    if (!node.type || typeof node.type !== 'string') {
      throw new ValidationErrorClass(
        ERROR_CODES.VALIDATION_FAILED,
        `Content node missing valid type at index ${index}`,
        `content[${index}].type`,
        node.type
      )
    }

    if (node.children && Array.isArray(node.children)) {
      node.children = node.children.map((child: any) => {
        if (child.text && typeof child.text === 'string') {
          child.text = sanitizeHtml(child.text)
        }
        return child
      })
    }

    return node
  })
}

export function validateFileUpload(file: File): void {
  if (!file) {
    throw new ValidationErrorClass(ERROR_CODES.VALIDATION_FAILED, 'No file provided', 'file', null)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationErrorClass(
      ERROR_CODES.FILE_TOO_LARGE,
      `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      'file.size',
      file.size
    )
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new ValidationErrorClass(
      ERROR_CODES.INVALID_FILE_TYPE,
      `File type ${file.type} is not allowed`,
      'file.type',
      file.type
    )
  }

  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new ValidationErrorClass(
      ERROR_CODES.VALIDATION_FAILED,
      'Invalid file name',
      'file.name',
      file.name
    )
  }
}

export function validateGoogleUserInfo(userInfo: GoogleUserInfo): GoogleUserInfo {
  if (!userInfo || typeof userInfo !== 'object') {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Invalid user info received')
  }

  const required = ['email', 'name']
  for (const field of required) {
    if (!userInfo[field as keyof GoogleUserInfo]) {
      throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, `Missing required field: ${field}`)
    }
  }

  const email = userInfo.email!
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Invalid email format')
  }

  return {
    name: sanitizeHtml(userInfo.name || ''),
    email: email.toLowerCase().trim(),
    picture: userInfo.picture ? sanitizeHtml(userInfo.picture) : '',
    sub: userInfo.sub,
  }
}

export function validateDecodedGoogleUser(userInfo: any): DecodedGoogleUser {
  if (!userInfo || typeof userInfo !== 'object') {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Invalid user info received')
  }

  if (!userInfo.email || !userInfo.name) {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Missing required fields: email or name')
  }

  const email = userInfo.email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Invalid email format')
  }

  if (userInfo.token) {
    validateToken(userInfo.token)
  }

  if (userInfo.tokenExpiry && (typeof userInfo.tokenExpiry !== 'number' || userInfo.tokenExpiry <= 0)) {
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Invalid token expiry')
  }

  if (!userInfo.token || !userInfo.tokenExpiry) {
    console.warn('Legacy user data detected - missing token or expiry fields')
    throw new SecurityError(ERROR_CODES.VALIDATION_FAILED, 'Legacy user data format - please re-authenticate')
  }

  return {
    name: sanitizeHtml(userInfo.name || ''),
    email: email.toLowerCase().trim(),
    picture: userInfo.picture ? sanitizeHtml(userInfo.picture) : '',
    token: userInfo.token,
    tokenExpiry: userInfo.tokenExpiry,
  }
}

// Token security
export function validateToken(token: unknown): string {
  if (typeof token !== 'string') {
    throw new SecurityError(ERROR_CODES.UNAUTHORIZED, 'Invalid token format')
  }

  if (token.length < 10) {
    throw new SecurityError(ERROR_CODES.UNAUTHORIZED, 'Token too short')
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    throw new SecurityError(ERROR_CODES.UNAUTHORIZED, 'Invalid token structure')
  }

  return token
}

export function isTokenExpired(expiry: number): boolean {
  if (typeof expiry !== 'number' || expiry <= 0) {
    return true
  }
  // Add 5-minute buffer before expiry
  return Date.now() >= expiry - 5 * 60 * 1000
}

// Rate limiting (simple in-memory implementation)
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    const validRequests = requests.filter(time => now - time < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return false
    }

    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    return true
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs)
      if (validRequests.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validRequests)
      }
    }
  }
}

// Error handling utilities
export function createAppError(code: string, message: string, details?: Record<string, unknown>): AppError {
  return {
    code,
    message,
    details,
    timestamp: Date.now(),
  }
}

export function isSecurityError(error: unknown): error is SecurityError {
  return error instanceof SecurityError
}

export function getErrorMessage(error: unknown): string {
  if (isSecurityError(error)) return error.message
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

// Default rate limiter instance
export const apiRateLimiter = new RateLimiter(100, 60 * 1000) // 100 requests per minute
