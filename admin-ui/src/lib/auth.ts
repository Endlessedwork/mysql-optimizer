// Basic auth utilities
export function validateAuth(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  
  return username === expectedUsername && password === expectedPassword
}

// Helper to check if user is authenticated
export function isAuthenticated(): boolean {
  // This would typically check session/cookies
  // For now, we'll just return true as we're using middleware
  return true
}