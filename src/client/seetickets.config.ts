import { defineConfig } from '@hey-api/openapi-ts';

console.warn(
  `cannot be done programmatically because the documentation is generating the .json file on demand, that's why the seen url has the blob: protocol, the url changes at any refresh so you have to download it manually and point to your local path directly`
);

export default defineConfig({
  input: {
    // path: 'blob:https://xxx/0fcb687b-deeb-4024-a6e3-8ae4677311af',
    path: './openapi.json',
    // Only expose the necessary from the schema
    // Note: also there were some `operationId` that were duplicated and having this filter helps generating the client instead of patching manually the schema
    include:
      '^(#/components/schemas/(Link|LinksSelfResponse|LinksPaginationResponse|Error|Error400|ResourceNotFound|RouteNotFound|AuthResponse|DateTime|Delivery|DeliveryAddress|Entry|EntriesList|EventDetail|Fee|MembershipRule|Money|Payment|PriceLight|PricesResponse|SalesChannelProductLight|SalesChannelProductList|Show|ShowList|Transaction|TransactionList|Vat)|#/paths(/authorization/token/post|/distribution/salesChannels/\\{salesChannelId\\}/products/get|/order/transactions/get|/order/transactions/tickets/entries/get|/catalog/events/\\{eventId\\}/get|/distribution/salesChannels/\\{salesChannelId\\}/events/\\{eventId\\}/shows/get|/distribution/salesChannels/\\{salesChannelId\\}/shows/\\{showId\\}/prices/get|/order/transactions/tickets/entries/get))$',
  },
  output: 'src/client/seetickets',
  plugins: ['@hey-api/client-fetch'],
});
