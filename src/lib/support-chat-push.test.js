import { beforeEach, describe, expect, it, mock } from "bun:test";

const CUSTOMER = "customer-user";
const ADMIN = "admin-user";
const MSG_ID = "11111111-1111-4111-8111-111111111111";
let message;
let devices;
let sends;
let callerIsAdmin;

const db = {
  from(table) {
    let action = "select";
    let patch = null;
    const eq = {};
    const neq = {};
    let onlyUnclaimed = false;
    const query = {
      select() { return query; },
      update(v) { action = "update"; patch = v; return query; },
      delete() { action = "delete"; return query; },
      eq(k, v) { eq[k] = v; return query; },
      neq(k, v) { neq[k] = v; return query; },
      in() { return query; },
      is() { onlyUnclaimed = true; return query; },
      maybeSingle() { return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (table === "support_chat_messages" && action === "select") return { data: message };
          if (table === "support_chat_messages" && action === "update") {
            if (onlyUnclaimed && message.push_sent_at) return { data: [] };
            message.push_sent_at = patch.push_sent_at;
            return { data: [{ id: message.id }] };
          }
          if (table === "profiles") return { data: { full_name: "علي", phone: "07000000000" } };
          if (table === "device_tokens" && action === "select") {
            const rows = devices.filter(
              (d) =>
                Object.entries(eq).every(([k, v]) => d[k] === v) &&
                Object.entries(neq).every(([k, v]) => d[k] !== v),
            );
            return { data: rows.map((d) => ({ token: d.token })), error: null };
          }
          return { data: null, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  },
};

mock.module("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { inputValidator: () => builder, middleware: () => builder, handler: (fn) => fn };
    return builder;
  },
}));
mock.module("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
mock.module("./fcm.server", () => ({
  sendFcmToTokens: async (tokens, msg) => {
    sends.push({ tokens, msg });
    return { sent: tokens.length, failed: 0, invalidTokens: [] };
  },
}));
const { notifySupportMessage } = await import("./support.functions");

const call = (userId) =>
  notifySupportMessage({
    data: { message_id: MSG_ID },
    context: { userId, supabase: { rpc: async () => ({ data: callerIsAdmin }) } },
  });

beforeEach(() => {
  sends = [];
  callerIsAdmin = false;
  message = { id: MSG_ID, user_id: CUSTOMER, sender: "user", body: "أحتاج مساعدة", push_sent_at: null };
  devices = [
    { token: "admin-phone", user_id: ADMIN, role: "admin" },
    { token: "customer-phone", user_id: CUSTOMER, role: "customer" },
    { token: "other-driver", user_id: "driver-user", role: "driver" },
  ];
});

describe("support chat push", () => {
  it("sends a customer's message to the admin devices only", async () => {
    await call(CUSTOMER);
    expect(sends).toHaveLength(1);
    expect(sends[0].tokens).toEqual(["admin-phone"]);
    expect(sends[0].msg.title).toBe("رسالة دعم جديدة");
    expect(sends[0].msg.body).toBe("علي: أحتاج مساعدة");
  });

  it("sends the admin's reply to that customer only and opens the support page", async () => {
    message.sender = "admin";
    callerIsAdmin = true;
    await call(ADMIN);
    expect(sends).toHaveLength(1);
    expect(sends[0].tokens).toEqual(["customer-phone"]);
    expect(sends[0].msg.title).toBe("لديك رد جديد من دعم ثواني");
    expect(sends[0].msg.data.route).toBe("/support");
  });

  it("sends one push per message even when called twice", async () => {
    await call(CUSTOMER);
    await call(CUSTOMER);
    expect(sends).toHaveLength(1);
  });

  it("never notifies the author of the message", async () => {
    devices.push({ token: "customer-admin-phone", user_id: CUSTOMER, role: "admin" });
    await call(CUSTOMER);
    expect(sends[0].tokens).toEqual(["admin-phone"]);
  });

  it("rejects a caller who is not the sender", async () => {
    await expect(call("someone-else")).rejects.toThrow("Forbidden");
    message.sender = "admin";
    await expect(call(CUSTOMER)).rejects.toThrow("Forbidden");
    expect(sends).toHaveLength(0);
  });
});
