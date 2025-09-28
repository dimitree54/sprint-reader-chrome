Integrating Kinde Authentication in a Chrome Extension

Integrating Kinde (an auth & billing platform) with a Chrome extension is possible, but it requires using the correct OAuth flow and Chrome extension APIs to overcome CORS and redirect limitations. Below we break down the challenges and the solutions.

Challenges with Direct Integration

Cross-Origin Requests (CORS): By default, web pages (and extension content scripts) cannot call APIs on other domains due to browser CORS policy. If your extension tries to fetch data from yourapp.kinde.com or embed Kinde’s sign-in page, you may see “blocked by CORS policy” errors or the content not loading. Chrome extensions have special capabilities to bypass these restrictions when configured properly ￼ ￼.

Redirect URI Limitations: Kinde’s OAuth requires specifying allowed callback URLs (redirect URIs) in its settings ￼. However, Chrome extension pages use the chrome-extension://<ID> URL scheme, which Kinde (like most OAuth providers) does not accept as a valid callback (only HTTP/HTTPS are allowed). This means you cannot directly redirect back to an extension page after login using a chrome-extension:// URI. A workaround is needed to handle the OAuth redirect.

Embedding Kinde’s UI: Trying to show Kinde’s hosted sign-in or subscription page inside the extension popup (e.g. via an iframe) is not viable. Kinde’s pages likely send headers to prevent being iframed for security, or the extension’s popup might not support loading an external domain directly due to its limited context.

Solution Overview

Despite these challenges, you can implement a smooth sign-in and subscription flow in your extension by leveraging Chrome’s identity API and background scripts. The high-level approach is:
	1.	Initiate Kinde’s OAuth flow in a separate browser window (or popup) rather than directly in the extension UI. Use Chrome’s identity.launchWebAuthFlow or similar to open Kinde’s hosted login page.
	2.	Use a special redirect URL that Chrome can capture (avoiding an in-extension redirect). Chrome extensions can use a generated HTTPS URL of the form https://<extension-id>.chromiumapp.org/ as the OAuth callback. Kinde must be configured to accept this URL as an allowed callback.
	3.	Capture the token or authorization code when Kinde redirects to the callback URL. Chrome will intercept the final redirect to the chromiumapp.org URL and return it to your extension code ￼. This contains the authorization code or token.
	4.	Exchange code for token (if needed) using the extension’s background script. With appropriate host permissions, the extension can call Kinde’s token endpoint via fetch (bypassing CORS restrictions) to get the JWT tokens.
	5.	Store the token (e.g. in extension storage) for future use. The token can be used to authenticate API calls to Kinde to check subscription status.
	6.	Periodic subscription checks: The extension’s background script (or popup on load) can call Kinde’s API endpoint to retrieve the user’s current subscription details, using the stored token in an Authorization header.

Below, we detail these steps and alternatives:

1. Using Chrome’s OAuth Flow (Launch WebAuthFlow)

Chrome provides a built-in API for extensions to perform OAuth with third-party providers. The chrome.identity.launchWebAuthFlow method opens a browser window to the specified URL and waits for a redirect to a special URL that contains the extension’s ID ￼. When the OAuth provider (Kinde) redirects to this URL, Chrome closes the window and gives that final URL back to the extension.
	•	Configure Kinde’s Callback: In your Kinde application settings, add an Allowed Callback URL that matches the pattern https://<your-extension-id>.chromiumapp.org/*. For example, if your extension ID is abcdefghijklmno, use https://abcdefghijklmno.chromiumapp.org/ as a callback. This is a trick to use a Chromium-provided domain which will route back to your extension. (Kinde expects an HTTPS URL ￼, and fortunately chromiumapp.org is HTTPS.) Ensure the callback exactly matches what you’ll use in code to avoid “Invalid callback URL” errors.
	•	Launch the Auth Flow: From your extension (perhaps when the user clicks the “Sign In” button in the popup), call chrome.identity.launchWebAuthFlow({ url: KINDER_AUTH_URL, interactive: true }, callback). Here, KINDER_AUTH_URL is the authorization URL from Kinde for your app. This URL includes your Kinde domain and client ID, plus parameters like redirect_uri (set to the chromiumapp URL) and scopes. For example, it might look like:
https://<your_subdomain>.kinde.com/oauth2/auth?client_id=<ID>&redirect_uri=https://<ext-id>.chromiumapp.org/&scope=openid profile email&response_type=code&code_challenge=<...>&code_challenge_method=S256 (exact format depends on Kinde’s implementation).
	•	User Login in Popup Window: Chrome opens a temporary window showing Kinde’s hosted sign-in page. The user can log in or sign up as usual. Kinde will then redirect to the callback URL (chromiumapp.org).
	•	Capture the Redirect: As soon as the window navigates to the callback URL, Chrome intercepts it. According to Chrome’s docs, “when the provider redirects to a URL matching the pattern https://<app-id>.chromiumapp.org/*, the window will close, and the final redirect URL will be passed to the callback” ￼. Your extension’s callback function receives this URL, which contains the auth response.
	•	If Kinde is using an authorization code flow (likely with PKCE for public clients), the URL will have a ?code=... parameter. In this case, proceed to step 2 (token exchange).
	•	If Kinde provided an implicit token (e.g. #access_token=... in the URL fragment), you can parse the token directly and skip the code exchange. (Modern OAuth setups generally use code flow for security, so assume code flow unless documentation says otherwise.)

2. Exchanging the Code for a Token (Handling CORS in Extension)

If you received an auth code, the extension now needs to call Kinde’s token endpoint to get the actual JWT access token (and possibly refresh token). Normally, a web page calling another domain’s token endpoint would run into CORS issues (the Kinde server might not allow a chrome-extension://... origin). However, Chrome extensions can perform such cross-origin requests in background scripts or extension pages when proper permissions are declared.

Manifest Host Permissions: In your manifest.json, include Kinde’s domain under "host_permissions". For example:

"host_permissions": [
  "https://<your_subdomain>.kinde.com/*"
]

This grants your extension the right to bypass same-origin restrictions when communicating with that host ￼. With this in place, your background script (or popup script) can use fetch or XHR to Kinde’s endpoints without the usual browser CORS checks blocking it. (Content scripts cannot do this, but background or extension pages can ￼.)

Perform the Token Request: Use a background script (or the callback of launchWebAuthFlow) to send a POST request to Kinde’s token endpoint (e.g. https://<your_subdomain>.kinde.com/oauth2/token). Include the authorization code and the same redirect_uri and code_verifier (if using PKCE) in the request body. Typically this is a form-encoded request. For example:

await fetch("https://<your_subdomain>.kinde.com/oauth2/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: redirectUrl,        // your chromiumapp.org URL
    client_id: KINDER_CLIENT_ID,
    code_verifier: pkceVerifier      // if PKCE was used
  })
});

Because of the host permission, the extension should receive the response containing the access_token, id_token, etc., even if Kinde’s response doesn’t include a normal Access-Control-Allow-Origin header. In an extension context, this direct communication is allowed (no need for a proxy server).

Note: Ensure this fetch is done in the extension background or popup script, not a content script. Background scripts in Manifest V3 are service workers, so you might perform this in the launchWebAuthFlow callback which runs in the extension process. If needed, you can use chrome.runtime.sendMessage to hand off the code to the background for exchange.

3. Storing the User Token

Once you have the token JSON from Kinde (which includes the access token JWT, and possibly a refresh token if offline access is enabled), store it safely. Good options are Chrome’s storage.local or sessionStorage in the extension (if you only need it per session). Avoid exposing it to content scripts or web pages. Kinde’s SDK by default keeps tokens in memory for security ￼, so you should similarly keep the token scoped to the extension.

If Kinde provided a refresh token, you can store that as well (perhaps encrypted, or use Chrome’s built-in storage which is extension-only) to refresh the session as needed. Alternatively, you might rely on Kinde’s session cookie via the hosted pages – but since your extension context can’t easily use that cookie, it’s simpler to manage tokens yourself.

Kinde Pro-Tip: Without a custom domain, Kinde’s JS SDK only stores tokens in memory (or local storage in dev mode) ￼. In an extension, treat it similarly: plan for the user needing to log in again if the extension or browser is restarted (unless you implement refresh token logic).

4. User Subscription Management via Kinde

Once authenticated, you have two ways for the user to manage their subscription:
	•	Directing to Kinde’s Portal: Kinde offers a self-service portal for users to manage account and payment details ￼ ￼. You could simply open a new tab (via chrome.tabs.create) to your Kinde business’s portal URL (for example, https://<your_subdomain>.kinde.com/portal). If the user is already logged in via Kinde (session cookie set from the earlier auth flow), this page will recognize them and allow subscription management. This offloads all subscription UI to Kinde. However, since this is outside the extension, you won’t automatically get feedback in the extension when changes occur. The user can manage their plan and close the tab when done.
	•	Using Kinde’s APIs: Kinde likely provides APIs (or token claims) to check a user’s plan/status. For instance, after login you might call a Kinde endpoint (with the access token) to retrieve the current subscription or feature entitlements for the user. With your stored access_token, you can do something like:

const res = await fetch("https://<your_subdomain>.kinde.com/api/v1/subscription", {
  headers: { "Authorization": "Bearer " + accessToken }
});
const subscriptionInfo = await res.json();

Ensure the token has the correct scopes/audience for this API if needed. Again, your extension’s host permission for *.kinde.com allows this cross-origin request to succeed.
You mentioned periodically checking the subscription “on extension load” – this is feasible. For example, each time the extension starts (or the popup is opened), the background script can silently call Kinde’s API to verify the user’s subscription tier and then enable/disable features in the extension accordingly.

5. Do You Need a Proxy Server?

Given the above solutions, a dedicated server to proxy requests is not strictly necessary. Chrome extensions can directly handle OAuth and API calls if configured properly. The CORS limitation is overcome by declaring the Kinde domain in the manifest and using background scripts ￼. The redirect issue is solved by using Chrome’s chromiumapp.org mechanism rather than a custom proxy page.

However, there are scenarios where a small bridge server might be used as an alternative:
	•	If Kinde’s OAuth flow cannot be configured to use the chromiumapp.org callback (e.g., some providers only allow certain domains or do not support public client flows), you could host a minimal web page that is an allowed callback. That page would receive the code/token and then forward it to the extension (via postMessage or by storing in Chrome storage via an API call). This is more complex and usually not needed for Kinde, which is designed to integrate with custom frontends.
	•	A backend could also securely handle token refresh or provide an API for the extension to get subscription data without calling Kinde directly. But again, this adds complexity and latency.

In summary, it is absolutely possible to implement your described use case without an external proxy, using the techniques above. Many developers have successfully connected OAuth providers to extensions using Chrome’s built-in flow (similar to how you’d integrate Auth0, Firebase, etc. in an extension).

Key Takeaways
	•	Use Chrome’s OAuth capabilities: Leverage launchWebAuthFlow with a valid redirect URI to handle the Kinde sign-in through a popup. This avoids embedding foreign iframes in the extension.
	•	Configure Kinde properly: Add the Chrome extension’s callback URL (via chromiumapp.org) in your Kinde app settings so that Kinde redirects back correctly after login ￼. Without this, Kinde will reject the login attempt with an “Invalid callback URL” error.
	•	Bypass CORS with extension permissions: Declare Kinde’s domain in your manifest. Perform API calls (token exchange, subscription checks) in the extension background/page context, not in a web page context, so they are not blocked ￼. This means you don’t need to disable CORS on Kinde’s side or use hacks – the extension runtime handles it.
	•	Token persistence: Store the received token in a safe place (extension storage). Recognize that without a persistent login (unless you implement refresh tokens), the user might need to log in again if the token expires or on browser restart, similar to how Kinde’s SDK behaves without a custom domain ￼.
	•	Subscription management: You can simply send the user to Kinde’s hosted portal for managing their subscription, or use Kinde’s APIs to integrate those details into your extension’s UI. Either way, your extension can check the subscription status when it loads (e.g. verify the token’s claims or call an endpoint) and adjust functionality accordingly.

Conclusion

It is not “100% impossible” to connect a Chrome extension with Kinde – you do not necessarily need a proxy server or bridge if you use the extension’s capabilities. By carefully handling the OAuth redirect and declaring the proper permissions, the extension can authenticate the user via Kinde and obtain a token. From there it can directly communicate with Kinde (or your own backend) to query the user’s subscription status as needed. This approach has been used in practice for many OAuth providers and should work with Kinde as well, given Kinde supports standard OAuth2/OIDC flows.

Ultimately, if for some reason the direct method ran into issues (e.g., hypothetically if Kinde’s flow or APIs had constraints), a minimal bridge server could be introduced – but based on Kinde’s standard OAuth behavior, that extra layer shouldn’t be necessary. With the outlined setup, you can have a sign-in button in your extension that launches Kinde’s secure login page, returns an auth token to the extension, and enables the extension to function according to the user’s subscription level. 🚀

Sources:
	•	Chrome Developers – Using chrome.identity for non-Google OAuth (capture redirect to chromiumapp.org) ￼
	•	Stack Overflow – Chrome extension cross-origin fetch (host_permissions to bypass CORS) ￼ ￼
	•	Kinde Documentation – Setting allowed redirect URIs and auth flow behavior ￼ ￼
	•	Kinde Documentation – Token storage and security considerations (in-memory vs cookies) ￼