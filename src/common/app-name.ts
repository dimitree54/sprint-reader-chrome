import { browserApi } from '../core/browser-api.service'

const TEMPLATE_TOKEN = '{{appName}}'

export function getExtensionName (): string {
  const manifest = browserApi.runtime.getManifest()
  const name = manifest?.name
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Extension manifest name is empty')
  }
  return name
}

function renderTemplate (template: string, name: string): string {
  return template.split(TEMPLATE_TOKEN).join(name)
}

export function applyExtensionName (root: ParentNode | null = typeof document !== 'undefined' ? document : null): void {
  if (!root) {
    return
  }

  const appName = getExtensionName()

  root.querySelectorAll<HTMLElement>('[data-app-name]').forEach((element) => {
    element.textContent = appName
  })

  root.querySelectorAll<HTMLElement>('[data-app-name-template]').forEach((element) => {
    const template = element.getAttribute('data-app-name-template')
    if (!template) {
      return
    }
    const value = renderTemplate(template, appName)
    element.textContent = value
    if (element instanceof HTMLTitleElement && typeof document !== 'undefined') {
      document.title = value
    }
  })

  root.querySelectorAll<HTMLElement>('[data-app-name-attr]').forEach((element) => {
    const attribute = element.getAttribute('data-app-name-attr')
    if (!attribute) {
      return
    }
    const template = element.getAttribute('data-app-name-template') ?? TEMPLATE_TOKEN
    const value = renderTemplate(template, appName)
    element.setAttribute(attribute, value)
  })
}
