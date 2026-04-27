import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { providerApi } from "../services/api";
import { toast } from "react-hot-toast";
import { motion as Motion } from "framer-motion";

function normalizeWalletInfo(result) {
  return result?.data || result || null;
}

function normalizeWebhookInfo(result) {
  return result?.data || result || null;
}

function normalizeBlockedUsers(result) {
  const data = result?.data || result || {};
  const users =
    data.blocked_users ||
    data.blocking_users ||
    data.users ||
    data.contacts ||
    data.data ||
    [];

  return Array.isArray(users) ? users : [];
}

function getWebhookStatusStyles(webhookInfo) {
  if (webhookInfo?.webhook_status === "enable") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function ProviderSettingsPage() {
  const { token } = useAuth();
  const [walletInfo, setWalletInfo] = useState(null);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockInput, setBlockInput] = useState("");
  const [webhookInput, setWebhookInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);

    try {
      const [walletResult, webhookResult, blockedUsersResult] = await Promise.allSettled([
        providerApi.getWalletBalance(token),
        providerApi.getWhatsappWebhook(token),
        providerApi.getBlockedUsers(token),
      ]);

      const failedSections = [];

      if (walletResult.status === "fulfilled") {
        setWalletInfo(normalizeWalletInfo(walletResult.value.data));
      } else {
        failedSections.push("wallet");
      }

      if (webhookResult.status === "fulfilled") {
        setWebhookInfo(normalizeWebhookInfo(webhookResult.value.data));
      } else {
        failedSections.push("webhook");
      }

      if (blockedUsersResult.status === "fulfilled") {
        setBlockedUsers(normalizeBlockedUsers(blockedUsersResult.value.data));
      } else {
        failedSections.push("blocklist");
      }

      if (failedSections.length > 0) {
        toast.error(`Some provider data could not be loaded: ${failedSections.join(", ")}.`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData, token]);

  const handleBlock = async (event) => {
    event.preventDefault();
    if (!blockInput.trim()) {
      return;
    }

    try {
      const payload = await providerApi.blockUser(blockInput.trim(), token);
      toast.success(payload.message || "User blocked successfully.");
      setBlockInput("");
      await fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to block the WhatsApp user.");
    }
  };

  const handleUnblock = async (number) => {
    try {
      const payload = await providerApi.unblockUser(number, token);
      toast.success(payload.message || "User unblocked successfully.");
      await fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to unblock the WhatsApp user.");
    }
  };

  const handleSyncWebhook = async (event) => {
    event.preventDefault();
    setIsSyncingWebhook(true);

    try {
      const payload = await providerApi.syncWhatsappWebhook(
        webhookInput.trim() ? { webhookUrl: webhookInput.trim() } : {},
        token,
      );

      setWebhookInfo(payload.data?.config || null);
      toast.success(payload.message || "Delivery webhook enabled successfully.");
    } catch (error) {
      toast.error(error.message || "Unable to enable the Fast2SMS delivery webhook.");
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h2
          className="text-[32px] font-bold text-on-surface leading-[40px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          Provider Settings (Fast2SMS)
        </h2>
        <p className="text-base text-on-surface-variant mt-2">
          Manage your WhatsApp provider health, delivery webhook, and recipient blocklist.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">
                account_balance_wallet
              </span>
              Wallet Balance & Health
            </h3>
            {isLoading && !walletInfo ? (
              <p className="text-sm text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Loading...
              </p>
            ) : (
              <div className="flex items-center gap-4 bg-surface rounded-lg p-4 border border-outline-variant">
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Current Balance
                  </p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    ₹{Number(walletInfo?.wallet || 0).toFixed(2)}
                  </p>
                </div>
                <div className="ml-auto flex items-center px-3 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                  <span className="material-symbols-outlined text-[18px] mr-1">check_circle</span>
                  <span className="text-sm font-medium">Provider Reachable</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    webhook
                  </span>
                  Delivery Webhook
                </h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  Fast2SMS can send delivery callbacks back to this CRM so final provider failures
                  and delivery updates are recorded automatically.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getWebhookStatusStyles(webhookInfo)}`}
              >
                <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                {webhookInfo?.webhook_status === "enable" ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-outline-variant bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Current Fast2SMS Callback URL
              </p>
              <p className="mt-2 break-all text-sm text-on-surface">
                {webhookInfo?.webhook_url || "Not configured yet"}
              </p>
            </div>

            <form onSubmit={handleSyncWebhook} className="mt-5 flex flex-col gap-3">
              <label className="text-xs font-semibold text-on-surface-variant">
                Public Webhook URL Override (Optional)
              </label>
              <input
                type="url"
                value={webhookInput}
                onChange={(event) => setWebhookInput(event.target.value)}
                placeholder="https://your-backend-domain.com/api/messages/webhook"
                className="w-full border border-outline-variant rounded-lg px-4 py-2 bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSyncingWebhook}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  {isSyncingWebhook ? "Syncing..." : "Enable Delivery Webhook"}
                </button>
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-on-surface hover:bg-surface transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Refresh Status
                </button>
              </div>
            </form>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-error">block</span>
              WhatsApp Blocklist
            </h3>

            <form onSubmit={handleBlock} className="flex gap-3 mb-6">
              <input
                type="text"
                value={blockInput}
                onChange={(event) => setBlockInput(event.target.value)}
                placeholder="Enter phone number (e.g. 919999999999)"
                className="flex-1 border border-outline-variant rounded-lg px-4 py-2 bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-error text-on-error text-sm font-semibold hover:bg-error/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Block
              </button>
            </form>

            <div className="border border-outline-variant rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm text-on-surface">
                <thead className="bg-surface text-on-surface-variant text-xs uppercase font-semibold border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-3">Phone Number</th>
                    <th className="px-4 py-3 w-[120px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedUsers.length > 0 ? (
                    blockedUsers.map((user, index) => {
                      const number =
                        typeof user === "string"
                          ? user
                          : user.number || user.contact_number || user.wa_id || user.phone;

                      return (
                        <tr
                          key={`${number || "blocked-user"}-${index}`}
                          className="border-b border-outline-variant last:border-b-0 hover:bg-surface/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{number || "Unknown number"}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleUnblock(number)}
                              disabled={!number}
                              className="text-xs font-semibold px-3 py-1 rounded bg-surface border border-outline-variant hover:bg-surface-container-highest transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                how_to_reg
                              </span>
                              Unblock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-8 text-center text-on-surface-variant italic"
                      >
                        No users currently blocked.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 h-fit">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
            Integration Notes
          </p>
          <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
            <li>Wallet deductions happen when Fast2SMS accepts a WhatsApp send request.</li>
            <li>Provider wallet debits are controlled by Fast2SMS. CRM can sync failed statuses, but it cannot reverse external charges.</li>
            <li>Delivery webhooks help sync final provider outcomes back into CRM history.</li>
            <li>Use a public backend URL for webhook sync. Localhost URLs cannot receive Fast2SMS callbacks.</li>
          </ul>
        </aside>
      </div>
    </Motion.div>
  );
}
