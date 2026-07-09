import { expect, test } from "@playwright/test";

test("reviews an activation opportunity and inspects evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Turn intent into a decision/ })).toBeVisible();
  await page.getByRole("button", { name: /Restocked demand has not been activated/ }).click();
  await expect(page.getByText("Cached example run")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Inspect evidence/ }).click();
  await expect(page.getByRole("heading", { name: /Every recommendation must point/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/intent-commerce-workbench.png", fullPage: true });
});

test("has no horizontal overflow on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: "/tmp/intent-commerce-mobile.png", fullPage: true });
});
