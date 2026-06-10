// E2E スモーク（RF-02 — BP-1 の検証装置）
// BT-1〜BT-5 の 1 周（作成 → 一覧 → 編集 → トグル → 削除）+ BT-7（/api/health 200）。
// スイートは意図的に薄く保つ（網羅は unit テスト群と分担 — モック境界で捕捉不能な統合不具合に限定）。
// 既存の data-testid を locator として使用する（RF-02 受入基準）。
import { expect, test } from "@playwright/test";

test.describe("TODO smoke (BT-1〜5 + BT-7)", () => {
	test("BT-7: /api/health returns 200 ok (BR-013 誤拒否の回帰検知点)", async ({ request }) => {
		const res = await request.get("/api/health");
		expect(res.status()).toBe(200);
		expect(await res.json()).toEqual({ status: "ok" });
	});

	test("BT-1〜5: create → list → edit → toggle → delete の 1 周", async ({ page }) => {
		// 単一共有リスト（A-2）のため、衝突しない一意なタイトルで自分のアイテムだけを追跡する
		const title = `E2E smoke ${Date.now()}`;
		const editedTitle = `${title} (edited)`;

		await page.goto("/");
		await expect(page.getByTestId("app-title")).toBeVisible();

		// BT-1: 作成
		await page.getByTestId("todo-form-title-input").fill(title);
		await page.getByTestId("todo-form-description-input").fill("E2E smoke description");
		await page.getByTestId("todo-form-submit-button").click();

		// BT-2: 一覧に表示される
		const item = page.locator('[data-testid^="todo-item-"]', { hasText: title }).first();
		await expect(item).toBeVisible();
		const itemTestId = await item.getAttribute("data-testid");
		expect(itemTestId).not.toBeNull();
		const id = (itemTestId as string).replace("todo-item-", "");

		// BT-3: インライン編集
		await page.getByTestId(`todo-item-${id}-edit-button`).click();
		await page.getByTestId(`todo-item-${id}-edit-title`).fill(editedTitle);
		await page.getByTestId(`todo-item-${id}-save-button`).click();
		await expect(page.getByTestId(`todo-item-${id}`)).toContainText(editedTitle);

		// BT-4: 完了トグル
		const toggle = page.getByTestId(`todo-item-${id}-toggle`);
		await expect(toggle).not.toBeChecked();
		await toggle.click();
		await expect(toggle).toBeChecked();

		// BT-5: 削除
		await page.getByTestId(`todo-item-${id}-delete-button`).click();
		await expect(page.getByTestId(`todo-item-${id}`)).toHaveCount(0);
	});
});
