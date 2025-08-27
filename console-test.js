const { chromium } = require('playwright');

async function testWithConsole() {
    console.log('🔍 브라우저 콘솔 로그 모니터링 테스트...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1500 });
    const page = await browser.newPage();
    
    // 모든 콘솔 메시지 수집
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        console.log(`[브라우저 ${type.toUpperCase()}] ${text}`);
    });
    
    try {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log('\n🎯 프로필 편집 모달 열기...');
        const profileBtn = page.locator('button:has-text("✏️ 프로필 편집")');
        await profileBtn.click({ force: true });
        await page.waitForTimeout(2000);
        
        console.log('\n🔘 변경 버튼 클릭...');
        const changeBtn = page.locator('button:has-text("변경")').first();
        await changeBtn.click({ force: true });
        await page.waitForTimeout(2000);
        
        console.log('\n🔄 한 번 더 클릭...');
        await changeBtn.click({ force: true });
        await page.waitForTimeout(2000);
        
        console.log('\n📸 5초 동안 대기 (수동 확인)...');
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await browser.close();
        console.log('\n🏁 콘솔 테스트 완료');
    }
}

testWithConsole().catch(console.error);