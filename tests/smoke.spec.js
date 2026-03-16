const { test, expect } = require("@playwright/test");

test("loads diner app and toggles open/closed", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/I Miss My Diner/i);

  const power = page.getByRole("button", { name: "Open for Business" });
  await power.click();
  await expect(page.getByRole("button", { name: "Closed" })).toBeVisible();

  await page.getByRole("button", { name: "Closed" }).click();
  await expect(page.getByRole("button", { name: "Open for Business" })).toBeVisible();
});

test("persists channel slider to localStorage across reload", async ({ page }) => {
  await page.goto("/");

  const grill = page.getByRole("slider", { name: "Flat Top Grill volume" });
  await grill.fill("77");
  await expect(grill).toHaveValue("77");

  await page.reload();
  await expect(page.getByRole("slider", { name: "Flat Top Grill volume" })).toHaveValue("77");
});
