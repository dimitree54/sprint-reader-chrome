import { getAuthConfig } from './config/auth.config'
import { storageService } from '../core/storage.service'

function normalizeIssuer (): { origin: string; orgCode: string } {
  const config = getAuthConfig()
  const rawDomain = (config.kinde.domain || '').trim()
  const rawOrgCode = (config.kinde.orgCode || '').trim()

  if (!rawDomain) {
    throw new Error('VITE_KINDE_DOMAIN is not set')
  }

  if (!rawOrgCode) {
    throw new Error('VITE_KINDE_ORG_CODE is not set')
  }

  let origin: string
  try {
    origin = new URL(rawDomain.includes('://') ? rawDomain : `https://${rawDomain}`).origin
  } catch (error) {
    throw new Error(`Invalid VITE_KINDE_DOMAIN value: ${rawDomain}`)
  }

  return { origin, orgCode: rawOrgCode }
}

export function buildManageSubscriptionUrl (): string {
  const { origin, orgCode } = normalizeIssuer()
  return `${origin}/account/cx/_:nav&m:account::_:submenu&s:plan_selection&org_code:${orgCode}`
}

export async function resolveManageSubscriptionUrl (options?: { returnUrl?: string }): Promise<string> {
  const token = await storageService.readAuthToken()
  if (!token) {
    throw new Error('User is not authenticated')
  }

  const { origin, orgCode } = normalizeIssuer()

  const portalLinkUrl = new URL('/account_api/v1/portal_link', origin)
  if (options?.returnUrl) {
    portalLinkUrl.searchParams.set('return_url', options.returnUrl)
  }

  const response = await fetch(portalLinkUrl.href, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`Failed to prime subscription portal (status ${response.status})`)
  }
  else {
    const data = await response.json();
    await fetch(data.url);
    return "https://reader10x.kinde.com/account/cx/_:nav&m:account::_:submenu&s:plan_selection&org_code:org_85512d1caec"
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    // Consume body to avoid unhandled promise rejections; response content is not used otherwise.
    await response.json().catch(() => {})
  }

  //return `${origin}/account/cx/_:nav&m:account::_:submenu&s:plan_selection&org_code:${orgCode}`

}
