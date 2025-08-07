import { DefaultBodyType, DelayMode, HttpResponse, StrictRequest, delay, http } from 'msw';
import superjson from 'superjson';

import { mockBaseUrl } from '@ad/src/server/mock/environment';
import { jsonRpcErrorResponse, jsonRpcSuccessResponse } from '@ad/src/server/mock/requests';
import { RouterInputs, RouterOutputs } from '@ad/src/utils/trpc';

/**
 * Mocks a TRPC endpoint and returns a msw handler for Storybook.
 * Only supports routes with two levels.
 * The path and response is fully typed and infers the type from your routes file.
 * @todo make it accept multiple endpoints
 * @param endpoint.path - path to the endpoint ex. ["post", "create"]
 * @param endpoint.response - response to return ex. {id: 1}
 * @param endpoint.type - specific type of the endpoint ex. "query" or "mutation" (defaults to "query")
 * @returns - msw endpoint
 * @example
 * Page.parameters = {
    msw: {
      handlers: [
        getTRPCMock({
          path: ["post", "getMany"],
          type: "query",
          response: [
            { id: 0, title: "test" },
            { id: 1, title: "test" },
          ],
        }),
      ],
    },
  };
 */
export const getTRPCMock = <
  K1 extends keyof RouterInputs & string,
  O extends RouterOutputs[K1], // all its keys
>(endpoint: {
  path: [K1];
  response: O | Error | ((request: StrictRequest<DefaultBodyType>, params: RouterInputs[K1]) => O | Error); // Ideally `response` should satisfies `O` instead of extending to avoid mistake when merging objects with wrong properties but there is no solution for now (ref: https://github.com/microsoft/TypeScript/issues/51556)
  type?: 'query' | 'mutation' | 'subscription';
  delayHook?: (request: StrictRequest<DefaultBodyType>, params: RouterInputs[K1]) => number | DelayMode | null;
}) => {
  const fn = endpoint.type === 'mutation' || endpoint.type === 'subscription' ? http.post : http.get;

  const route = `${mockBaseUrl}/api/trpc/${endpoint.path[0]}`;

  return fn(route, async (info) => {
    let params: RouterInputs[K1];
    if (endpoint.type === 'query') {
      params = extractParamsFromQuery(info.request) as RouterInputs[K1];
    } else {
      params = info.params as RouterInputs[K1];
    }

    // Depending on the mock we correctly retrieve the response
    const response = typeof endpoint.response === 'function' ? endpoint.response(info.request, params) : endpoint.response;

    const isResponseAnError = response instanceof Error;

    let rpcResponse: DefaultBodyType;
    if (isResponseAnError) {
      rpcResponse = jsonRpcErrorResponse(response as Error);
    } else {
      // In the real app we use the `superjson` transformer to encode/decode complex response objects, so we have to mimic the server behavior
      const transformedResponse = superjson.serialize(response);

      rpcResponse = jsonRpcSuccessResponse(transformedResponse);
    }

    if (!!endpoint.delayHook) {
      const delayToAdd = endpoint.delayHook(info.request, params);

      if (delayToAdd !== null && delayToAdd !== 0) {
        await delay(delayToAdd);
      }
    }

    // Note we use `httpLink` and not `httpBatchLink` when mocking, so no need to wrap the response into an array
    return HttpResponse.json(rpcResponse);
  });
};

export function extractParamsFromQuery(request: StrictRequest<DefaultBodyType>): object {
  const url = new URL(request.url);

  const inputQueryParam = url.searchParams.get('input');
  if (inputQueryParam) {
    const params = JSON.parse(inputQueryParam)[0];

    return params;
  }

  return {};
}
