import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BrowserApiService } from './browser-api.service'

declare const global: any

describe('BrowserApiService (chrome adapter)', () => {
  let originalChrome: any
  let originalBrowser: any

  beforeEach(() => {
    BrowserApiService.__resetForTests()
    originalChrome = global.chrome
    originalBrowser = global.browser
    delete global.browser
  })

  afterEach(() => {
    if (typeof originalChrome !== 'undefined') {
      global.chrome = originalChrome
    } else {
      delete global.chrome
    }
    if (typeof originalBrowser !== 'undefined') {
      global.browser = originalBrowser
    } else {
      delete global.browser
    }
    // Reset singleton internals by reloading module between tests if needed.
  })

  it('wraps chrome.runtime.sendMessage into a promise and resolves', async () => {
    const responses: unknown[] = []
    global.chrome = {
      runtime: {
        lastError: undefined,
        sendMessage: (...args: any[]) => {
          const message = args[0]
          const cb = args[args.length - 1]
          responses.push(message)
          if (typeof cb === 'function') cb({ ok: true })
        },
        getURL: (p: string) => p,
        getManifest: () => ({}) as any,
        onMessage: {},
        onInstalled: {}
      },
      storage: { local: { get: () => {}, set: () => {} } },
      windows: { create: () => {}, update: () => {}, onRemoved: {} },
      tabs: { create: () => {}, query: () => {}, sendMessage: () => {} },
      contextMenus: { removeAll: (cb: () => void) => cb(), create: () => {}, onClicked: {} },
      commands: {}
    }

    const service = BrowserApiService.getInstance()
    const result = await service.sendMessage({ hello: 'world' })
    expect(result).toEqual({ ok: true })
    expect(responses[0]).toEqual({ hello: 'world' })
  })

  it('rejects when chrome.runtime.lastError is set after sendMessage', async () => {
    global.chrome = {
      runtime: {
        lastError: undefined as any,
        sendMessage: (...args: any[]) => {
          const cb = args[args.length - 1]
          ;(global.chrome.runtime as any).lastError = { message: 'boom' }
          if (typeof cb === 'function') cb(undefined)
        },
        getURL: (p: string) => p,
        getManifest: () => ({}) as any,
        onMessage: {},
        onInstalled: {}
      },
      storage: { local: { get: () => {}, set: () => {} } },
      windows: { create: () => {}, update: () => {}, onRemoved: {} },
      tabs: { create: () => {}, query: () => {}, sendMessage: () => {} },
      contextMenus: { removeAll: (cb: () => void) => cb(), create: () => {}, onClicked: {} },
      commands: {}
    }

    const service = BrowserApiService.getInstance()
    await expect(service.sendMessage({})).rejects.toThrow(/boom/)
  })
})
