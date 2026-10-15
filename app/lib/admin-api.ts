import { CreateResult, ExtendResult, LicenseKey, ResetResult, SystemType, request } from "./types"

/**
 * Calls only pages under app/(admin) may make. Every one lands on
 * /api/admin/*, which requires a session and attaches the admin secret
 * server-side. Nothing here is importable from a customer page without the
 * import showing up in review.
 */
export const adminApi = {
  list: () => request<LicenseKey[]>("/api/admin/list"),

  create: (days: number, note: string, system_type: SystemType) =>
    request<CreateResult>("/api/admin/create", {
      method: "POST",
      body: JSON.stringify({ days, note, system_type }),
    }),

  revoke: (key: string) =>
    request<{ revoked: boolean; key: string }>("/api/admin/revoke", {
      method: "PATCH",
      body: JSON.stringify({ key }),
    }),

  /** Renewal - the customer keeps the key they already pasted into the program. */
  extend: (key: string, days: number) =>
    request<ExtendResult>("/api/admin/extend", {
      method: "PATCH",
      body: JSON.stringify({ key, days }),
    }),

  /** Override of the customer's daily limit. */
  resetHwid: (key: string, reason: string) =>
    request<ResetResult>("/api/admin/reset-hwid", {
      method: "PATCH",
      body: JSON.stringify({ key, reason }),
    }),
}
