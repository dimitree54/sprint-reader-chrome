
import { browserApi } from '../../core/browser-api.service';
import type { AuthStatus } from '../../common/messages';

export function initCtaButton(): void {
  const ctaButton = document.getElementById('ctaButton') as HTMLButtonElement | null;
  if (!ctaButton) return;

  browserApi.runtime.sendMessage({ target: 'background', type: 'getAuthStatus' }, (response: { authStatus: AuthStatus }) => {
    if (browserApi.runtime.lastError) {
      console.error('Failed to get auth status:', browserApi.runtime.lastError);
      return;
    }

    const { authStatus } = response;
    if (authStatus.subscriptionStatus === 'pro') {
      return;
    }

    ctaButton.hidden = false;

    if (!authStatus.isAuthenticated) {
      ctaButton.addEventListener('click', () => {
        browserApi.runtime.sendMessage({ target: 'background', type: 'triggerAuthFlow', flow: 'register' });
      });
    } else if (authStatus.planSelectionUrl) {
      ctaButton.addEventListener('click', () => {
        browserApi.createTab({ url: authStatus.planSelectionUrl });
        window.close();
      });
    }
  });
}
