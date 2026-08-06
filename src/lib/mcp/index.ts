import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStores from "./tools/list-stores";
import listProducts from "./tools/list-products";
import listMyOrders from "./tools/list-my-orders";
import getOrder from "./tools/get-order";
import updateOrderStatus from "./tools/update-order-status";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "thawani-hub",
  title: "Thawani Hub",
  version: "0.1.0",
  instructions:
    "Tools for Thawani Hub, an Iraqi shopping and delivery app. Browse active stores and their products, and read or update orders the signed-in user is allowed to see (their own orders as a customer, their store's orders as a merchant, or their deliveries as a driver). Prices are in Iraqi Dinar (IQD) and product names are in Arabic.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listStores, listProducts, listMyOrders, getOrder, updateOrderStatus],
});
