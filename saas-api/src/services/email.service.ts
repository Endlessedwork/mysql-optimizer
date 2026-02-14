import nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;
  private isConfigured: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@mysql-optimizer.com';

    this.isConfigured = !!(host && user && pass);

    if (this.isConfigured) {
      const config: SmtpConfig = {
        host: host!,
        port,
        secure: port === 465,
        auth: { user: user!, pass: pass! },
      };
      this.transporter = nodemailer.createTransport(config);
    }
  }

  /**
   * Send password reset email with reset link
   */
  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    fullName: string
  ): Promise<void> {
    const subject = 'Reset Your Password - MySQL Optimizer';

    const html = this.buildResetEmailHtml(resetUrl, fullName);
    const text = this.buildResetEmailText(resetUrl, fullName);

    if (!this.isConfigured || !this.transporter) {
      // Dev fallback: log to console
      console.log('========================================');
      console.log('PASSWORD RESET EMAIL (dev mode)');
      console.log(`To: ${to}`);
      console.log(`Name: ${fullName}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('========================================');
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html,
      text,
    });
  }

  private buildResetEmailHtml(resetUrl: string, fullName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#0d9488;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">MySQL Optimizer</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">Reset Your Password</h2>
              <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
                Hi ${fullName},
              </p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
                We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color:#0d9488;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildResetEmailText(resetUrl: string, fullName: string): string {
    return [
      `Hi ${fullName},`,
      '',
      'We received a request to reset your password for MySQL Optimizer.',
      '',
      'Click the link below to reset your password (expires in 1 hour):',
      resetUrl,
      '',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n');
  }
}

// Singleton instance
export const emailService = new EmailService();
