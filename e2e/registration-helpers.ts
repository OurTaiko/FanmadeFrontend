import { readFileSync } from 'node:fs'
import { expect, type APIRequestContext } from '@playwright/test'

export function mailboxCode(email: string): string {
  const path = process.env.FANMADE_TEST_MAILBOX
  if (!path) throw new Error('Run with the isolated backend browser fixture (FRONTEND_E2E=1).')
  const code = JSON.parse(readFileSync(path, 'utf8'))[email.toLowerCase()]
  expect(code).toMatch(/^[0-9]{6}$/)
  return code
}

export async function registerAccount(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  if (!process.env.FANMADE_TEST_MAILBOX) throw new Error('Use the isolated backend mail fixture.')
  const email = `${username}@example.test`
  const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'
  const sent = await request.post('/api/v1/auth/email-code', {
    headers: { Origin: origin },
    data: { email },
  })
  expect(sent.status()).toBe(200)
  const { verificationId } = await sent.json()
  const response = await request.post('/api/v1/auth/register', {
    headers: { Origin: origin },
    data: { username, password, email, verificationId, code: mailboxCode(email) },
  })
  expect(response.status()).toBe(200)
  return response.json()
}
