import { beforeEach, describe, expect, it, mock } from "bun:test";

const input = {
  customer_phone: "07000000000",
  address: "عنوان الاختبار",
  notes: null,
  vehicle_type: "taxi",
  customer_lat: 32.3255,
  customer_lng: 44.9177,
};
const areaId = "7dc84546-e0a9-4a5b-8409-4edba4975599";
let adminTokens;
let driverError;
let sends;
const db = {
  rpc: async () => ({ data: areaId }),
  from(table) {
    let action = "select";
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      in(key, value) { filters[key] = value; return query; },
      insert() { action = "insert"; return query; },
      delete() { action = "delete"; return query; },
      single() { return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (table === "taxi_requests" && action === "insert") return { data: { id: "taxi-request-id", local_ref: "TX-1" } };
          if (table === "taxi_drivers") return { data: [{ user_id: "driver-user", phone: null }] };
          if (table === "device_tokens" && action === "select") {
            return filters.role === "admin"
              ? { data: adminTokens.map((token) => ({ token })), error: null }
              : { data: [{ token: "taxi-device" }] };
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
  sendFcmToTokens: async (tokens, message) => {
    sends.push({ tokens, message });
    if (message.data.route === "/taxi-orders" && driverError) throw driverError;
    return { sent: tokens.length, failed: 0, invalidTokens: [] };
  },
}));
const { placeTaxiRequest } = await import("./taxi.functions");

beforeEach(() => {
  adminTokens = ["owner-device-1", "owner-device-2", "owner-device-1"];
  driverError = null;
  sends = [];
});

describe("taxi request admin push", () => {
  it("sends once to each registered admin device with the same title and body as the driver push", async () => {
    await placeTaxiRequest({ data: input });
    const admin = sends.filter((s) => s.message.data.route === "/admin");
    const drivers = sends.filter((s) => s.message.data.route === "/taxi-orders");
    expect(admin).toHaveLength(1);
    expect(admin[0].tokens).toEqual(["owner-device-1", "owner-device-2"]);
    expect(drivers).toHaveLength(1);
    expect(drivers[0].tokens).toEqual(["taxi-device"]);
    expect(admin[0].message.title).toBe(drivers[0].message.title);
    expect(admin[0].message.body).toBe(drivers[0].message.body);
    expect(admin[0].message.data).toMatchObject({ order_id: "taxi-request-id", kind: "taxi_request" });
  });

  it("still sends the admin push if the driver fan-out fails", async () => {
    driverError = new Error("Driver FCM failed");
    expect((await placeTaxiRequest({ data: input })).ok).toBe(true);
    expect(sends.filter((s) => s.message.data.route === "/admin")).toHaveLength(1);
  });

  it("does not send an admin push when no admin device is registered", async () => {
    adminTokens = [];
    expect((await placeTaxiRequest({ data: input })).ok).toBe(true);
    expect(sends.map((s) => s.message.data.route)).toEqual(["/taxi-orders"]);
  });
});
