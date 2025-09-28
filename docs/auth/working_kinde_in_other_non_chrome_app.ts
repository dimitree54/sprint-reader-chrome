import "./style.css";
import createKindeClient from "@kinde-oss/kinde-auth-pkce-js";


const loggedInViews = document.getElementsByClassName("js-logged-in-view");
const loggedOutViews = document.getElementsByClassName("js-logged-out-view");

const switchViews = (a, b) => {
  [...a].forEach((v) => v.removeAttribute("hidden"));
  [...b].forEach((v) => v.setAttribute("hidden", true));
};

const renderLoggedInView = (user) => {
  const namePlaceholder = document.querySelector(".js-user-name");
  const avatarPlaceholder = document.querySelector(".js-user-avatar");
  const avatarPicturePlaceholder = document.querySelector(
    ".js-user-avatar-picture"
  );
  namePlaceholder.textContent = `${user.given_name} ${user?.family_name || ""}`;

  if (`${user.picture}` != "") {
    avatarPicturePlaceholder.src = `${user.picture}`;
    avatarPicturePlaceholder.removeAttribute("hidden");
  } else {
    avatarPlaceholder.textContent = `${user.given_name[0]}${
      user?.family_name?.[0] || user.given_name[1]
    }`;
    avatarPlaceholder.removeAttribute("hidden");
  }

  switchViews(loggedInViews, loggedOutViews);
};

const renderLoggedOutView = () => {
  const loggedInViews = document.getElementsByClassName("js-logged-in-view");
  const loggedOutViews = document.getElementsByClassName("js-logged-out-view");
  switchViews(loggedOutViews, loggedInViews);
};

const render = async (user) => {
  if (user) {
    renderLoggedInView(user);
  } else {
    renderLoggedOutView();
  }
};

const kinde = await createKindeClient({
  client_id: import.meta.env.VITE_KINDE_CLIENT_ID,
  domain: import.meta.env.VITE_KINDE_DOMAIN,
  redirect_uri: import.meta.env.VITE_KINDE_REDIRECT_URL,
});

const addKindeEvent = (id) => {
  document.getElementById(id).addEventListener("click", async () => {
    await kinde[id]();
  });
};

["login", "register", "logout"].forEach(addKindeEvent);

const domain = import.meta.env.VITE_KINDE_DOMAIN;
const issuer = domain.startsWith('http') ? domain : `https://${domain}`;

// Handle portal link
document.getElementById("portal")?.addEventListener("click", async () => {
  try {
    const isAuthenticated = await kinde.isAuthenticated();
    if (!isAuthenticated) {
      console.error("User not authenticated");
      return;
    }

    // Get user's access token
    const accessToken = await kinde.getToken();
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    const portalLinkUrl = new URL('/account_api/v1/portal_link', issuer);
    portalLinkUrl.searchParams.set('return_url', window.location.origin);

    // Use Kinde's Account API to get portal link (frontend-only approach)
    const response = await fetch(portalLinkUrl.href, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Redirect to the portal URL returned by Kinde
      window.location.href = data.url;
    } else {
      console.error("Failed to get portal link:", response.status, response.statusText);
      // Check if it's a CORS issue
      if (response.status === 0) {
        console.error("CORS error: Make sure your domain is added to Allowed Origins in Kinde dashboard");
      }
    }
  } catch (error) {
    console.error("Error getting portal link:", error);
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      console.error("CORS error: Add your domain to Allowed Origins in Kinde dashboard settings");
    }
  }
});

// Handle page load
const user = await kinde.getUser();
render(user);

document.getElementById("check-permission")?.addEventListener("click", async () => {
  const resultElement = document.getElementById("permission-result");
  if (!resultElement) return;

  resultElement.textContent = "Calling Cloudflare Worker...";

  // IMPORTANT: Replace with your actual worker URL from the 'wrangler deploy' command
  const workerUrl = 'https://kinde-permission-gateway.path2dream.workers.dev';

  try {
    const accessToken = await kinde.getToken();
    if (!accessToken) {
        resultElement.textContent = "Error: Could not get access token.";
        return;
    }

    const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const response = await res.json();

    if (res.ok) {
        resultElement.textContent = `Worker response: ${response.message}`;
    } else {
        resultElement.textContent = `Worker error: ${response.message || res.statusText}`;
    }

  } catch (error) {
    console.error("Error calling Cloudflare Worker:", error);
    resultElement.textContent = "An unexpected error occurred while calling the worker.";
  }
});

document.getElementById("start-stream")?.addEventListener("click", async () => {
  const streamResultElement = document.getElementById("stream-result");
  if (!streamResultElement) return;

  streamResultElement.textContent = "Starting stream...";

  // IMPORTANT: Replace with your actual OpenAI worker URL
  const workerUrl = 'https://kinde-gated-openai-responses-api.path2dream.workers.dev';

  try {
    const accessToken = await kinde.getToken();
    if (!accessToken) {
      streamResultElement.textContent = "Error: Could not get access token.";
      return;
    }

    const openAIRequestPayload = {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Tell me a short story about a robot who dreams of being a chef." }],
      stream: true,
    };

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIRequestPayload),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      streamResultElement.textContent = `Error: ${response.status} ${response.statusText}\n${errorText}`;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    streamResultElement.textContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6);
          if (dataStr.trim() === '[DONE]') {
            return; // Stream finished
          }
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices[0]?.delta?.content;
            if (content) {
              streamResultElement.textContent += content;
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON chunks
          }
        }
      }
    }
  } catch (error) {
    console.error("Error calling OpenAI stream worker:", error);
    streamResultElement.textContent = "An unexpected error occurred while calling the worker.";
  }
});
