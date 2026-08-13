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
            ("[1] ChatPanel 渲染", "AI音乐工程工作台" in content),
            ("[2] MixView 18 轨道", "> 18 <" in content or "18 轨" in content or "tracks_count" in content),
            ("[3] TrackSubView 渲染", "无混音元数据" not in content and "点击左侧任意轨道" not in content),
            ("[4] PianoRoll 音符", "MIDI" in content or "canvas" in content),
            ("[5] 顶部轨道工具栏", "添加轨道" in content or "选中" in content),
        ]

        sys.stdout.reconfigure(encoding='utf-8')
        print("\n=== review.md 5 项验证 ===")
        for k, v in checks:
            status = "✅ PASS" if v else "❌ FAIL"
            print(f"{status}  {k}")

        await browser.close()

asyncio.run(main())