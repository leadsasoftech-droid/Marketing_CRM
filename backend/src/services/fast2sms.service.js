const env = require("../config/env");
const ApiError = require("../utils/apiError");

function getHeaders() {
    if (!env.fast2smsApiKey) {
        throw new ApiError(500, "Fast2SMS API Key is not configured.");
    }
    return {
        authorization: env.fast2smsApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

async function handleResponse(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new ApiError(
            response.status,
            payload?.message || "Fast2SMS API request failed"
        );
        error.metaResponse = payload;
        throw error;
    }
    return payload;
}

async function getWalletBalance() {
    const endpoint = new URL("https://www.fast2sms.com/dev/wallet");
    if (env.fast2smsApiKey) {
        endpoint.searchParams.set("authorization", env.fast2smsApiKey);
    }
    const response = await fetch(endpoint, {
        method: "GET",
    });
    return handleResponse(response);
}

async function getBlockedUsers() {
    const endpoint = new URL("https://www.fast2sms.com/dev/whatsapp-session/block");
    const response = await fetch(endpoint, {
        method: "GET",
        headers: getHeaders(),
    });
    return handleResponse(response);
}

async function blockUser(number) {
    const endpoint = new URL("https://www.fast2sms.com/dev/whatsapp-session/block");
    // usually it's either { contact_number }, { number }, or { numbers: [...] }
    // Since we don't have exact payload schema, let's try a common one, or pass a flexible object
    const response = await fetch(endpoint, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ number, numbers: [number], contact_number: number }),
    });
    return handleResponse(response);
}

async function unblockUser(number) {
    const endpoint = new URL("https://www.fast2sms.com/dev/whatsapp-session/block");
    // Some APIs use DELETE /block/:number or pass in the body.
    const response = await fetch(endpoint, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ number, numbers: [number], contact_number: number }),
    });
    return handleResponse(response);
}

module.exports = {
    getWalletBalance,
    getBlockedUsers,
    blockUser,
    unblockUser,
};
