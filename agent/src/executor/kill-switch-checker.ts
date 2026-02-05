import { Config } from '../config';
import { Logger } from '../logger';

interface KillSwitchResponse {
  global_active: boolean;
  connection_active: boolean;
  reason?: string;
}

export class KillSwitchChecker {
  private logger: Logger;
  private saasApiBaseUrl: string;

  constructor() {
    const config = new Config();
    this.logger = new Logger();
    this.saasApiBaseUrl = config.apiUrl;
  }

  async isKillSwitchActive(connectionId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.saasApiBaseUrl}/api/kill-switch?connection_id=${encodeURIComponent(connectionId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        this.logger.error(`Kill switch API returned status ${response.status}`);
        // FAIL-CLOSED: ถ้า API error → assume kill switch is active
        return true;
      }

      const data: KillSwitchResponse = await response.json();
      
      // Return true if either global or per-connection kill switch is active
      const isActive = data.global_active || data.connection_active;
      
      if (isActive) {
        this.logger.info(`Kill switch is active for connection ${connectionId}`, {
          global: data.global_active,
          connection: data.connection_active,
          reason: data.reason
        });
      }
      
      return isActive;

    } catch (error) {
      this.logger.error('Error calling kill switch API', error);
      // FAIL-CLOSED: ถ้าเรียก API ไม่ได้ → assume kill switch is active
      return true;
    }
  }
}