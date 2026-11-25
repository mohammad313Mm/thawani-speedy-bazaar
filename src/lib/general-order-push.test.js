import { beforeEach, describe, expect, it, mock } from "bun:test";

const input = {
  store_id: "85b29389-a554-4558-97d7-e65b50d5eae5",
  customer_name: "اختبار",
  customer_phone: "07000000000",
  address: "عنوان الاختبار",
  details: "اختبار إشعارات فقط",
  customer_lat: 32.3255,
  customer_lng: 44.9177,
};
const areaId = "7dc84546-e0a9-4a5b-8409-4edba4975599";
let adminTokens;
let merchantError;
let tokenLookupError;
let sends;
let writes;
let adminResult;
const db = {
  rpc: async () => ({ data: areaId }),
  from(table) {
    let action = "select";
    let values;
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      in(key, value) { filters[key] = value; return query; },
      insert(value) { action = "insert"; values = value; return query; },
      update(value) { action = "update"; values = value; return query; },
      delete() { action = "delete"; return query; },
      single() { return query; },
      maybeSingle() { return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (action !== "select") writes.push({ table, action, values, filters });
          if (table === "stores") return { data: {
            id: input.store_id, name: "متجر العامة", owner_id: "merchant-user",
            is_general: true, status: "active", is_open: true,
            latitude: 32.3255, longitude: 44.9177,
          }};
          if (table === "general_store_areas") return { data: { area_id: areaId } };
          if (table === "customer_orders" && action === "insert") return {
            data: { id: "general-order-id", local_order_id: values.local_order_id },
          };
          if (table === "device_tokens" && action === "select") {
            if (filters.role === "admin") return {
              data: adminTokens.map((token) => ({ token })), error: tokenLookupError,
            };
            return { data: [{ token: "merchant-device" }] };
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
    const builder = {
      inputValidator: () => builder,
      middleware: () => builder,
      handler: (fn) => fn,
    };
    return builder;
  },
}));
mock.module("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
mock.module("./fcm.server", () => ({
  sendFcmToTokens: async (tokens, message) => {
    sends.push({ tokens, message });
    if (message.data.route === "/merchant/dashboard" && merchantError) throw merchantError;
    return message.data.route === "/admin"
      ? adminResult
      : { sent: tokens.length, failed: 0, invalidTokens: [] };
  },
}));
const { placeGeneralOrder } = await import("./general.functions");

beforeEach(() => {
  adminTokens = ["owner-device-1", "owner-device-2"];
  merchantError = null;
  tokenLookupError = null;
  sends = [];
  writes = [];
  adminResult = { sent: 2, failed: 0, invalidTokens: [] };
});

describe("general order admin push", () => {
  it("sends once to each registered admin device at creation with the real order reference", async () => {
    adminTokens.push("owner-device-1");
    const result = await placeGeneralOrder({ data: input });
    const adminSends = sends.filter((s) => s.message.data.route === "/admin");
    expect(adminSends).toHaveLength(1);
    expect(adminSends[0].tokens).toEqual(["owner-device-1", "owner-device-2"]);
    expect(adminSends[0].message.data).toMatchObject({
      order_id: "general-order-id", kind: "general_order", area_id: areaId,
      order_num: result.local_order_id.slice(-6).toUpperCase(),
    });
    expect(adminSends[0].message.tag).toBe("order-general-order-id");
    expect(writes.find((w) => w.table === "customer_orders" && w.action === "insert").values.status).toBe("pending");
    expect(sends.filter((s) => s.message.data.route === "/merchant/dashboard")).toHaveLength(1);
  });

  it("still sends the admin push if merchant FCM fails", async () => {
    merchantError = new Error("Merchant FCM failed");
    expect((await placeGeneralOrder({ data: input })).ok).toBe(true);
    expect(sends.filter((s) => s.message.data.route === "/admin")).toHaveLength(1);
  });

  it("preserves merchant sending and order placement if admin token lookup fails", async () => {
    tokenLookupError = { message: "Lookup failed" };
    expect((await placeGeneralOrder({ data: input })).ok).toBe(true);
    expect(sends.map((s) => s.message.data.route)).toEqual(["/merchant/dashboard"]);
  });

  it("does not claim an admin send when no admin device is registered", async () => {
    adminTokens = [];
    expect((await placeGeneralOrder({ data: input })).ok).toBe(true);
    expect(sends.map((s) => s.message.data.route)).toEqual(["/merchant/dashboard"]);
  });

  it("prunes only invalid admin devices and leaves existing order escalation unchanged", async () => {
    adminResult = { sent: 1, failed: 1, invalidTokens: ["owner-device-2"] };
    await placeGeneralOrder({ data: input });
    const removal = writes.find((w) => w.table === "device_tokens" && w.action === "delete");
    expect(removal.filters.token).toEqual(["owner-device-2"]);
    const update = writes.find((w) => w.table === "customer_orders" && w.action === "update");
    expect(Date.parse(update.values.escalation_due_at) - Date.parse(update.values.notified_at)).toBe(5 * 60 * 1000);
  });
});