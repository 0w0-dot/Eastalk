const { chromium } = require('playwright');

async function runFinalTest() {
    console.log('🚀 Eastalk 최종 기능 테스트 시작...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 2000,
    });
    
    const page = await browser.newPage();
    
    // 콘솔 로그 모니터링 (에러와 중요 로그만)
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('프로필') || msg.text().includes('답글') || msg.text().includes('스크롤') || msg.text().includes('토글')) {
            console.log(`[브라우저] ${msg.type()}: ${msg.text()}`);
        }
    });
    
    try {
        // 페이지 접속
        console.log('\n1️⃣ 사이트 접속 중...');
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log('\n🧪 테스트 1: 프로필 편집 변경 버튼 테스트');
        
        // 프로필 편집 버튼 클릭 (정확한 선택자 사용)
        const profileEditBtn = page.locator('button:has-text("✏️ 프로필 편집")');
        
        console.log('📊 프로필 편집 버튼 상태 확인...');
        const isVisible = await profileEditBtn.isVisible();
        const isEnabled = await profileEditBtn.isEnabled();
        console.log(`- 보임: ${isVisible}, 활성: ${isEnabled}`);
        
        if (isVisible && isEnabled) {
            console.log('✅ 프로필 편집 버튼 클릭 시도...');
            
            await profileEditBtn.click();
            console.log('✅ 프로필 편집 버튼 클릭 성공');
            
            // 모달 로딩 대기
            await page.waitForTimeout(2000);
            
            // 변경 버튼 찾기 (정확한 위치의 변경 버튼)
            const changeBtn = page.locator('button#changeImageBtn, button:has-text("변경")').first();
            const changeBtnVisible = await changeBtn.isVisible();
            console.log(`📊 변경 버튼 보임: ${changeBtnVisible}`);
            
            if (changeBtnVisible) {
                console.log('🎯 변경 버튼 클릭 테스트 시작...');
                
                // 이미지 업로드 영역 초기 상태 (정확한 선택자)
                const uploadArea = page.locator('#imageUploadArea');
                const beforeVisible = await uploadArea.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                }).catch(() => false);
                console.log(`📊 클릭 전 업로드 영역 표시: ${beforeVisible}`);
                
                // 변경 버튼 클릭
                await changeBtn.click();
                console.log('✅ 변경 버튼 클릭 완료');
                
                await page.waitForTimeout(1000);
                
                // 클릭 후 상태
                const afterVisible = await uploadArea.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                }).catch(() => false);
                console.log(`📊 클릭 후 업로드 영역 표시: ${afterVisible}`);
                
                // 결과 판정
                if (beforeVisible !== afterVisible) {
                    console.log('🎉 테스트 1 결과: ✅ 이미지 업로드 영역 토글 기능 정상 작동!');
                    console.log(`   변화: ${beforeVisible ? '보임' : '숨김'} → ${afterVisible ? '보임' : '숨김'}`);
                } else {
                    console.log('⚠️ 테스트 1 결과: 토글 변화가 감지되지 않음');
                }
                
                // 추가로 한 번 더 클릭해서 토글 확인
                console.log('🔄 토글 기능 재확인을 위해 한 번 더 클릭...');
                await changeBtn.click();
                await page.waitForTimeout(500);
                
                const finalVisible = await uploadArea.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                }).catch(() => false);
                console.log(`📊 두 번째 클릭 후 상태: ${finalVisible}`);
                
                if (afterVisible !== finalVisible) {
                    console.log('🎉 토글 기능 완전 확인: 정상 작동 중!');
                } else {
                    console.log('⚠️ 토글 기능에 문제가 있을 수 있음');
                }
            } else {
                console.log('❌ 변경 버튼을 찾을 수 없음');
            }
            
            // 모달 닫기 (ESC 키 사용)
            console.log('🔒 모달 닫기...');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        } else {
            console.log('❌ 프로필 편집 버튼을 클릭할 수 없음');
        }
        
        console.log('\n🧪 테스트 2: 답글 라벨 클릭 메시지 이동 기능 테스트');
        
        // 채팅 영역에서 답글 찾기
        const replyElements = await page.locator('.reply-preview, .reply-label, [class*="reply"]').all();
        console.log(`📊 발견된 답글 요소 수: ${replyElements.length}`);
        
        if (replyElements.length > 0) {
            console.log('✅ 답글 요소 발견, 클릭 테스트 시작...');
            
            // 채팅 컨테이너 찾기
            const chatContainer = page.locator('.messages-container, .chat-messages, .chat-area').first();
            
            // 클릭 전 스크롤 위치
            const beforeScroll = await chatContainer.evaluate(el => el.scrollTop).catch(async () => 
                await page.evaluate(() => window.scrollY)
            );
            console.log(`📊 클릭 전 스크롤 위치: ${beforeScroll}`);
            
            // 첫 번째 답글 요소 클릭
            await replyElements[0].click();
            console.log('✅ 답글 요소 클릭 완료');
            
            // 스크롤 애니메이션 대기
            await page.waitForTimeout(2000);
            
            // 클릭 후 스크롤 위치
            const afterScroll = await chatContainer.evaluate(el => el.scrollTop).catch(async () => 
                await page.evaluate(() => window.scrollY)
            );
            console.log(`📊 클릭 후 스크롤 위치: ${afterScroll}`);
            
            // 하이라이트 효과 확인 (여러 선택자 시도)
            const highlightSelectors = [
                '.highlighted',
                '.highlight',
                '[class*="highlight"]',
                '[style*="background-color: rgb(255, 243, 205)"]',
                '[style*="background-color:#fff3cd"]'
            ];
            
            let highlightFound = false;
            for (const selector of highlightSelectors) {
                const highlighted = await page.locator(selector).isVisible().catch(() => false);
                if (highlighted) {
                    highlightFound = true;
                    console.log(`📊 하이라이트 효과 발견: ${selector}`);
                    break;
                }
            }
            
            // 결과 판정
            if (Math.abs(beforeScroll - afterScroll) > 10 || highlightFound) {
                console.log('🎉 테스트 2 결과: ✅ 답글 라벨 클릭 기능 정상 작동!');
                if (Math.abs(beforeScroll - afterScroll) > 10) {
                    console.log(`   스크롤 이동: ${Math.abs(beforeScroll - afterScroll)}px`);
                }
                if (highlightFound) {
                    console.log('   하이라이트 효과: 확인됨');
                }
            } else {
                console.log('⚠️ 테스트 2 결과: 스크롤 이동 또는 하이라이트 효과 미확인');
            }
        } else {
            console.log('⚠️ 테스트 2 결과: 답글이 있는 메시지를 찾을 수 없음');
            
            // 테스트용 답글 생성 시도
            console.log('📝 테스트용 메시지 작성 시도...');
            const messageInput = page.locator('input[placeholder*="메시지"]').first();
            if (await messageInput.isVisible()) {
                await messageInput.fill('테스트 메시지입니다');
                await messageInput.press('Enter');
                console.log('✅ 테스트 메시지 작성 완료');
            }
        }
        
        console.log('\n📊 모든 테스트 완료 - 5초 후 브라우저 종료');
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error('❌ 테스트 오류:', error.message);
        
        // 오류 스크린샷
        await page.screenshot({ path: 'test-final-error.png', fullPage: true });
        console.log('📸 오류 스크린샷 저장: test-final-error.png');
    } finally {
        await browser.close();
        console.log('🏁 최종 테스트 완료');
    }
}

runFinalTest().catch(console.error);