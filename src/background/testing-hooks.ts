import { authService } from '../auth'
import { useAuthStore } from '../auth/state/auth.store'
import type { RuntimeMessage } from '../common/messages'
import { handleBackgroundMessage } from './message-handler'
import { openReaderWindowSetup } from './reader-window'

type GlobalTestShim = typeof globalThis & {
  openReaderWindowSetup?: typeof openReaderWindowSetup;
  receiveMessage?: (message: RuntimeMessage, sender?: unknown, sendResponse?: (value?: unknown) => void) => Promise<boolean | undefined>;
  authService?: typeof authService;
  useAuthStore?: typeof useAuthStore;
}

export function exposeTestingHooks (): void {
  const scope = globalThis as GlobalTestShim
  scope.openReaderWindowSetup = openReaderWindowSetup
  scope.receiveMessage = async (message: RuntimeMessage, sender?: unknown, sendResponse?: (value?: unknown) => void) => {
    return await handleBackgroundMessage(message, sender ?? {}, sendResponse ?? (() => undefined))
  }
  scope.authService = authService
  scope.useAuthStore = useAuthStore
}
