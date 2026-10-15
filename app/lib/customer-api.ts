import { ResetResult, SystemType, request } from "./types"

/**
 * The only call a customer page makes. It goes to /api/public/reset-hwid,
 * which carries no admin secret: the licence API endpoint behind it is public
 * and enforces one reset per Bangkok day in the database. A secret here would
 * hand every visitor a way past that limit.
 */
export const customerApi = {
  selfReset: (key: string, system_type: SystemType) =>
    request<ResetResult>("/api/public/reset-hwid", {
      method: "POST",
      body: JSON.stringify({ key, system_type }),
    }),
}
