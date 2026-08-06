const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const loginVersion = document.querySelector("#loginVersion");

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Anfrage fehlgeschlagen");
  }

  return response.json();
}

async function loadVersion() {
  try {
    const payload = await requestJson("/api/version");
    loginVersion.textContent = `Version ${payload.version}`;
  } catch (_error) {
    loginVersion.textContent = "Version unbekannt";
  }
}

async function redirectIfAuthenticated() {
  const payload = await requestJson("/api/auth/me");
  if (payload.authenticated) {
    window.location.href = "/";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const data = Object.fromEntries(new FormData(loginForm));

  try {
    await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: data.username,
        password: data.password,
        remember: data.remember === "on"
      })
    });

    window.location.href = "/";
  } catch (error) {
    loginError.textContent = error.message;
  }
});

loadVersion();
redirectIfAuthenticated().catch(() => {});
