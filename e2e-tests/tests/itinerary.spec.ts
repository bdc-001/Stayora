import { test, expect, Page } from "@playwright/test";
const initial = () => ({
  _id: "507f1f77bcf86cd799439011",
  revision: 1,
  status: "review",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  quoteExpiresAt: "2027-12-31T00:00:00Z",
  messages: [
    { role: "user", content: "Goa for two, June 1–3, ₹80,000 budget" },
    {
      role: "assistant",
      content: "Here is your London escape. Review the stays and suggestions.",
    },
  ],
  proposal: {
    title: "A little London escape",
    summary: "Two nights, riverside walks and time to explore.",
    question: "",
    adults: 2,
    children: 0,
    budget: 800,
    items: [
      {
        id: "hotel",
        kind: "hotel",
        title: "The Garden House",
        city: "London",
        date: "2027-06-01",
        endDate: "2027-06-03",
        description: "A restful base for your city break.",
        hotelId: "507f1f77bcf86cd799439012",
        amount: 28000,
        status: "quoted",
        terms: "Free cancellation until seven days before arrival.",
      },
      {
        id: "walk",
        kind: "activity",
        title: "An afternoon along the Thames",
        city: "London",
        date: "2027-06-02",
        description: "Explore at your own pace.",
        amount: 0,
        status: "unavailable",
        terms: "No connected booking provider.",
      },
    ],
  },
});
async function setup(page: Page, signedIn = true) {
  let trip: any = null;
  if (signedIn)
    await page.addInitScript(() => {
      localStorage.setItem("session_id", "itinerary-test");
      localStorage.setItem("user_id", "user-a");
    });
  // Every API response is a fixture; these tests never reach real accounts or Stripe.
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const body = route.request().postDataJSON();
    let data: any = {};
    if (path.includes("validate-token")) data = { userId: "user-a" };
    else if (path === "/api/users/me")
      data = {
        firstName: "Test",
        lastName: "Traveller",
        email: "test@example.test",
        role: "user",
      };
    else if (path === "/api/trips" && method === "GET")
      data = trip ? [trip] : [];
    else if (path === "/api/trips" && method === "POST") {
      trip = initial();
      data = trip;
    } else if (path.endsWith("/approve")) {
      trip = {
        ...trip,
        status: "approved",
        approvedRevision: trip.revision,
        approvedTotal: 28000,
        approvedAt: new Date().toISOString(),
      };
      data = trip;
    } else if (path.endsWith("/messages")) {
      trip = {
        ...trip,
        revision: trip.revision + 1,
        status: "review",
        approvedRevision: undefined,
        messages: [
          ...trip.messages,
          { role: "user", content: body.message },
          { role: "assistant", content: "I have adjusted your plan." },
        ],
      };
      data = trip;
    } else if (path.endsWith("/remove")) {
      trip = {
        ...trip,
        revision: trip.revision + 1,
        status: "review",
        approvedRevision: undefined,
        proposal: {
          ...trip.proposal,
          items: trip.proposal.items.filter((i: any) => i.id !== body.itemId),
        },
      };
      data = trip;
    } else if (path.startsWith("/api/trips/")) data = trip;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}
test("guest can explore starters and keeps draft before sign in", async ({
  page,
}) => {
  await setup(page, false);
  await page.goto("/plan-trip");
  await page
    .getByRole("button", { name: "BEACH & UNWIND A slower kind of escape" })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Describe your trip or request a change",
    }),
  ).toHaveValue(/Goa/);
  await expect(
    page.getByRole("link", { name: "Sign in to plan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve itinerary" }),
  ).toHaveCount(0);
});
test("plan, approve, edit, remove, and resume with explicit unavailable items", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/plan-trip");
  await page
    .getByRole("textbox", { name: "Describe your trip or request a change" })
    .fill("Goa for two, June 1–3, ₹80,000 budget");
  await page.getByRole("button", { name: "Send trip request" }).click();
  await expect(
    page.getByRole("heading", { name: "A little London escape" }),
  ).toBeVisible();
  await expect(
    page.getByText("Arrange separately", { exact: true }),
  ).toBeVisible();
  const approval = page.getByRole("button", { name: "Approve itinerary" });
  await expect(approval).toBeDisabled();
  await page.getByRole("checkbox").check();
  await approval.click();
  await expect(
    page.getByText("Approved by you", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Describe your trip or request a change" })
    .fill("Make the second day more relaxed");
  await page.getByRole("button", { name: "Send trip request" }).click();
  await expect(page.getByText("Version 2", { exact: true })).toBeVisible();
  await expect(approval).toBeDisabled();
  await page
    .getByRole("button", { name: "Remove An afternoon along the Thames" })
    .click();
  await expect(
    page.getByRole("heading", { name: "An afternoon along the Thames" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Version 3", { exact: true })).toBeVisible();
  const widths = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.width);
});
test("agent errors keep the request editable", async ({ page }) => {
  await setup(page);
  await page.route("**/api/trips", async (route) => {
    if (route.request().method() === "POST")
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Agent temporarily unavailable. Please retry.",
        }),
      });
    return route.fallback();
  });
  await page.goto("/plan-trip");
  await page.getByRole("textbox").fill("Plan a London trip");
  await page.getByRole("button", { name: "Send trip request" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Agent temporarily unavailable",
  );
  await expect(page.getByRole("textbox")).toHaveValue("Plan a London trip");
  await expect(
    page.getByRole("button", { name: "Send trip request" }),
  ).toBeEnabled();
});
