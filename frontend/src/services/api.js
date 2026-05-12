const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

export const storageKeys = {
  token: "crm_auth_token",
};

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

export async function request(path, options = {}) {
  const {
    body,
    headers,
    token,
    method = "GET",
    ...restOptions
  } = options;
  const isFormData = body instanceof FormData;

  let response;

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: {
        ...(isFormData ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      ...restOptions,
    });
  } catch (error) {
    const normalizedError = new Error(
      "Unable to reach the CRM server right now. Please check the backend connection and try again.",
    );
    normalizedError.cause = error;
    throw normalizedError;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed.");
    error.status = response.status;
    error.errors = payload?.errors || [];
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const authApi = {
  login(credentials) {
    return request("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
  },
  me(token) {
    return request("/api/auth/me", { token });
  },
  updateOwnPassword(payload, token) {
    return request("/api/auth/me/password", {
      method: "PATCH",
      body: payload,
      token,
    });
  },
  listUsers(token) {
    return request("/api/auth/users", { token });
  },
  createAdmin(payload, token) {
    return request("/api/auth/admins", {
      method: "POST",
      body: payload,
      token,
    });
  },
  deleteAdmin(userId, token) {
    return request(`/api/auth/admins/${userId}`, {
      method: "DELETE",
      token,
    });
  },
  resetAdminPassword(userId, payload, token) {
    return request(`/api/auth/admins/${userId}/password`, {
      method: "PATCH",
      body: payload,
      token,
    });
  },
};

export const messageApi = {
  sendSingle(payload, token) {
    return request("/api/messages/send", {
      method: "POST",
      body: payload,
      token,
    });
  },
  sendBulk(formData, token) {
    return request("/api/messages/bulk", {
      method: "POST",
      body: formData,
      token,
    });
  },
  parseBulk(formData, token) {
    return request("/api/messages/bulk/parse", {
      method: "POST",
      body: formData,
      token,
    });
  },
  sendBulkSingle(payload, token) {
    return request("/api/messages/bulk/send-one", {
      method: "POST",
      body: payload,
      token,
    });
  },
  clearQueued(token) {
    return request("/api/messages/queued", {
      method: "DELETE",
      token,
    });
  },
  getHistory(params, token) {
    return request(`/api/messages/history${toQueryString(params)}`, { token });
  },
  getHistoryById(historyId, token) {
    return request(`/api/messages/history/${historyId}`, { token });
  },
};

export const providerApi = {
  getWalletBalance(token) {
    return request("/api/provider/fast2sms/wallet", { token });
  },
  getWhatsappWebhook(token) {
    return request("/api/provider/fast2sms/webhook", { token });
  },
  syncWhatsappWebhook(payload, token) {
    return request("/api/provider/fast2sms/webhook", {
      method: "POST",
      body: payload,
      token,
    });
  },
  getBlockedUsers(token) {
    return request("/api/provider/fast2sms/block", { token });
  },
  blockUser(number, token) {
    return request("/api/provider/fast2sms/block", {
      method: "POST",
      body: { number },
      token,
    });
  },
  unblockUser(number, token) {
    return request(`/api/provider/fast2sms/block/${number}`, {
      method: "DELETE",
      token,
    });
  },
};
