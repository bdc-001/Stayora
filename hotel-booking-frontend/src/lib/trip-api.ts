import { getApiBaseUrl } from "./api-client";
import { Trip } from "../../../shared/itinerary";

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/trips${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("session_id") || ""}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(100000),
    });
  } catch {
    throw new Error(
      "Unable to reach the booking API. Check that the backend is running and VITE_API_BASE_URL is correct.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Please sign in again to use Plan Trip.");
    }
    if (response.status === 404) {
      throw new Error(
        "Plan Trip isn’t on this API yet. Point VITE_API_BASE_URL at the Stayora backend (local http://localhost:5001) with the itinerary agent on :8001.",
      );
    }
    throw new Error(
      (data as { message?: string }).message ||
        "Unable to reach the travel agent. Please retry.",
    );
  }
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
