import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export class GoogleOAuthService {
  private client: OAuth2Client;
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

    if (!this.clientId || !clientSecret || !this.redirectUri) {
      throw new Error(
        'Google OAuth requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI'
      );
    }

    this.client = new OAuth2Client(this.clientId, clientSecret, this.redirectUri);
  }

  getAuthorizationUrl(state: string): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'consent',
    });
  }

  async verifyAndGetProfile(code: string): Promise<GoogleProfile> {
    const { tokens } = await this.client.getToken(code);

    if (!tokens.id_token) {
      throw new Error('AUTH_010: No ID token received from Google');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('AUTH_010: Invalid Google ID token payload');
    }

    if (!payload.email || !payload.email.includes('@')) {
      throw new Error('AUTH_010: No valid email received from Google');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      fullName: payload.name || payload.email,
      avatarUrl: payload.picture || null,
      emailVerified: payload.email_verified ?? false,
    };
  }
}
