import { getApiBaseUrl } from "./api-client";
import { Trip } from "../../../shared/itinerary";
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api/trips${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session_id") || ""}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(100000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.message || "Unable to reach the travel agent. Please retry.",
    );
  return data as T;
}
export const tripsApi = {
  list: () => request<Trip[]>(""),
  get: (id: string) => request<Trip>(`/${id}`),
  create: (message: string) => request<Trip>("", { message }),
  update: (trip: Trip, action: string, body: Record<string, unknown> = {}) =>
    request<Trip>(`/${trip._id}/${action}`, {
      revision: trip.revision,
      ...body,
    }),
  checkout: (trip: Trip, itemId: string) =>
    request<{ clientSecret: string; paymentIntentId: string; amount: number }>(
      `/${trip._id}/checkout`,
      { revision: trip.revision, itemId },
    ),
};
