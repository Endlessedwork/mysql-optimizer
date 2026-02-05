// Basic auth utilities
export function validateAuth(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD

  if (!expectedUsername || !expectedPassword) return false
  return username === expectedUsername && password === expectedPassword
}
