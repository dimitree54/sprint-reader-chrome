export interface Env {
    KINDE_DOMAIN: string; // This will be a secret
  }
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, restrict this to your frontend's domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  
  function handleOptions(request: Request) {
    if (
      request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null
    ) {
      // Handle CORS preflight requests.
      return new Response(null, {
        headers: corsHeaders,
      });
    } else {
      // Handle standard OPTIONS request.
      return new Response(null, {
        headers: {
          Allow: 'POST, OPTIONS',
        },
      });
    }
  }
  
  export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      if (request.method === 'OPTIONS') {
        return handleOptions(request);
      }
      if (request.method !== 'POST') {
          return new Response(JSON.stringify({ message: 'Error: Expected POST request.' }), { status: 405, headers: corsHeaders });
      }
  
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ message: 'Error: Missing or invalid Authorization header.' }), { status: 401, headers: corsHeaders });
      }
      const accessToken = authHeader.split(' ')[1];
  
      const issuer = env.KINDE_DOMAIN.startsWith('http') ? env.KINDE_DOMAIN : `https://${env.KINDE_DOMAIN}`;
      const entitlementsUrl = new URL('/account_api/v1/entitlements', issuer);
  
      try {
        const res = await fetch(entitlementsUrl.href, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
  
        const responseData = await res.json();
        console.log("Full kinde answer json:", JSON.stringify(responseData, null, 2));
  
        if (!res.ok) {
          return new Response(JSON.stringify({ message: `Error: Kinde API returned status ${res.status}.` }), { status: res.status, headers: corsHeaders });
        }
  
        const entitlements = responseData.data?.entitlements ?? [];
        const hasPermission = entitlements.some(e => e.feature_key === 'ai_preprocessing');
  
        if (hasPermission) {
          return new Response(JSON.stringify({ success: true, message: "Success" }), { status: 200, headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ success: false, message: "Error: Permission 'ai_preprocessing' not found." }), { status: 403, headers: corsHeaders });
        }
      } catch (error) {
        console.error("Error in Cloudflare Worker:", error);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), { status: 500, headers: corsHeaders });
      }
    },
  };