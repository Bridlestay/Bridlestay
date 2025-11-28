import { test, expect } from "@playwright/test";

/**
 * Happy Path E2E Test: Complete booking flow
 *
 * Prerequisites:
 * - Supabase database seeded with test data
 * - Test host and guest accounts created
 * - At least one property listed
 * - Stripe test keys configured
 */

test.describe("Booking Flow", () => {
  test.skip("complete booking flow - guest request and host accept", async ({
    page,
  }) => {
    // NOTE: This test requires proper Supabase and Stripe test setup
    // It's marked as .skip() by default - configure your test environment and remove .skip()

    // 1. Guest signs in
    await page.goto("/auth/sign-in");
    await page.fill('input[type="email"]', "guest@test.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Search for properties
    await page.goto("/");
    await page.fill('input[placeholder*="Cotswolds"]', "Cotswolds");
    await page.click('button:has-text("Search")');
    await expect(page).toHaveURL(/.*search/);

    // 3. Select first property
    const firstProperty = page.locator("article").first();
    await expect(firstProperty).toBeVisible();
    await firstProperty.click();
    await expect(page).toHaveURL(/.*property/);

    // 4. Fill booking dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 8);

    const checkInDate = tomorrow.toISOString().split("T")[0];
    const checkOutDate = nextWeek.toISOString().split("T")[0];

    await page.fill("#checkIn", checkInDate);
    await page.fill("#checkOut", checkOutDate);

    // 5. Verify price breakdown is shown
    await expect(page.locator("text=Service fee")).toBeVisible();
    await expect(page.locator("text=Total")).toBeVisible();

    // 6. Request to book
    await page.click('button:has-text("Request to Book")');

    // 7. Fill payment details (Stripe test card)
    await page.waitForSelector('[placeholder*="Card number"]');
    await page.fill('[placeholder*="Card number"]', "4242424242424242");
    await page.fill('[placeholder*="MM"]', "12");
    await page.fill('[placeholder*="YY"]', "25");
    await page.fill('[placeholder*="CVC"]', "123");
    await page.fill('[placeholder*="ZIP"]', "12345");

    // 8. Confirm booking
    await page.click('button:has-text("Confirm")');
    await page.waitForURL(/.*dashboard/);

    // 9. Verify booking appears in guest dashboard
    await expect(page.locator("text=requested")).toBeVisible();

    // 10. Sign out and sign in as host
    await page.goto("/auth/sign-in");
    await page.fill('input[type="email"]', "host@test.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // 11. View booking requests
    await expect(page.locator("text=Booking Requests")).toBeVisible();

    // 12. Accept booking
    await page.click('button:has-text("Accept")');
    await expect(page.locator("text=accepted")).toBeVisible();

    // Test passes if we reach this point
    expect(true).toBe(true);
  });

  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Equestrian");
    await expect(page.locator('input[placeholder*="Cotswolds"]')).toBeVisible();
  });

  test("search page is accessible", async ({ page }) => {
    await page.goto("/search?location=Cotswolds");
    await expect(page.locator("h1")).toContainText("Find Your Perfect Stay");
  });

  test("routes page displays correctly", async ({ page }) => {
    await page.goto("/routes");
    await expect(page.locator("h1")).toContainText("Riding Routes");
  });

  test("host page shows benefits", async ({ page }) => {
    await page.goto("/host");
    await expect(page.locator("h1")).toContainText("Share Your Property");
    await expect(page.locator("text=2.5% Host Fee")).toBeVisible();
  });
});



