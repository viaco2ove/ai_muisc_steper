"""验证 review.md 5 项修复"""
import asyncio
import sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:5183", wait_until="networkidle")
        await page.wait_for_timeout(3000)

        await page.screenshot(path="verify_1_initial.png", full_page=True)

        # 1. 选择"走在"工程
        try:
            sel = page.locator("select").first
            await sel.wait_for(timeout=5000)
            options = await sel.inner_text()
            print(f"工程列表: {options}")
            await sel.select_option(label="走在")
            await page.wait_for_timeout(2000)
            print("[OK] 1. selected project")
        except Exception as e:
            print(f"[FAIL] 1. select failed: {e}")

        await page.screenshot(path="verify_2_project_selected.png", full_page=True)

        # 2. 切换到分轨 Tab
        try:
            tab = page.locator("button:has-text('分轨')").first
            await tab.click()
            await page.wait_for_timeout(2000)
            print("[OK] 2. clicked tracks tab")
        except Exception as e:
            print(f"[FAIL] 2. click failed: {e}")

        await page.screenshot(path="verify_3_tracks_tab.png", full_page=True)

        # 3. 找轨道 lane
        try:
            lanes = page.locator("div.flex.border-b.cursor-pointer")
            count = await lanes.count()
            print(f"  track lanes: {count}")
            if count > 0:
                # 取第一个 lane 的名字
                first_name = await lanes.first.locator(".font-medium").first.inner_text()
                print(f"  clicking first lane: {first_name}")
                await lanes.first.click()
                await page.wait_for_timeout(3000)
                # 检查 TrackSubView 文本
                ts = await page.locator("text=无混音元数据").count()
                print(f"  无混音元数据 出现次数: {ts}")
                ts2 = await page.locator("text=点击左侧任意轨道").count()
                print(f"  点击左侧任意轨道 出现次数: {ts2}")
                print("[OK] 3. clicked first lane")
        except Exception as e:
            print(f"[FAIL] 3. click failed: {e}")

        await page.screenshot(path="verify_4_lane_clicked.png", full_page=True)

        content = await page.content()
        checks = [
            ("ChatPanel", "AI" in content or "对话" in content),
            ("MixView", "混音台" in content),
            ("TrackSubView OK", "无混音元数据" not in content),
            ("TrackEditor", "MD编辑器" in content),
            ("NoteEditor", "音符检查器" in content),
            ("Singer", "歌手" in content),
            ("Lyrics", "歌词" in content),
            ("AI修改", "AI 修改" in content),
            ("音符卷帘", "音符卷帘" in content),
        ]

        sys.stdout.reconfigure(encoding='utf-8')
        print("\n=== UI status ===")
        for k, v in checks:
            status = "OK" if v else "FAIL"
            print(f"{status} {k}")

        await browser.close()

asyncio.run(main())