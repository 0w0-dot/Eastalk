# 🤖 UptimeRobot 설정 가이드 - Render Sleep 방지

## 📋 **개요**
UptimeRobot을 사용하여 Render 무료 계정의 15분 sleep 모드를 방지하는 설정 가이드입니다.

## 🎯 **목표**
- Render 서버 24/7 가동 (무료 750시간 한도 내)
- 외부 모니터링을 통한 안정적인 Keep-Alive
- 자체 node-cron 시스템과 이중화 구성

## 🚀 **단계별 설정**

### 1단계: UptimeRobot 계정 생성
1. [uptimerobot.com](https://uptimerobot.com) 접속
2. **Sign Up for Free** 클릭
3. 이메일 주소로 가입 (무료 계정)
4. 이메일 인증 완료

### 2단계: 모니터 생성
1. **Dashboard** → **Add New Monitor** 클릭
2. 다음 정보 입력:

```
Monitor Type: HTTP(s)
Friendly Name: Eastalk Main Server Keep-Alive
URL: https://eastalk.onrender.com/health
Monitoring Interval: 5 minutes
HTTP Method: GET
Alert When: Down
```

**테스트 서버용 모니터 추가 (선택사항):**
```
Monitor Type: HTTP(s)
Friendly Name: Eastalk Staging Server Keep-Alive  
URL: https://eastalk-staging.onrender.com/health
Monitoring Interval: 5 minutes
HTTP Method: GET
Alert When: Down
```

### 3단계: 알림 설정 (선택사항)
1. **Alert Contacts** 섹션에서 이메일 추가
2. 서버 다운시 즉시 알림 받기
3. **Up/Down Notifications** 모두 활성화

### 4단계: 고급 설정
```
Timeout: 30 seconds
HTTP Status Codes to Track: 200, 301, 302
HTTP Headers: User-Agent: UptimeRobot/2.0
Keyword Monitoring: "healthy" (선택사항)
```

### 5단계: 설정 확인
- 모니터 상태가 **Up** 상태인지 확인
- 응답 시간이 정상 범위(100-1000ms)인지 확인
- **Statistics** 탭에서 가동률 확인

## 📊 **모니터링 대시보드**

### **UptimeRobot에서 확인**
- **Uptime %**: 99% 이상 유지 목표
- **Response Time**: 평균 응답 시간 추적
- **Down Events**: 다운타임 발생 기록

### **Eastalk 자체 API**
```bash
# 메인 서버 Keep-Alive 통계 확인
curl https://eastalk.onrender.com/api/keepalive-stats

# 테스트 서버 Keep-Alive 통계 확인
curl https://eastalk-staging.onrender.com/api/keepalive-stats
```

**응답 예시:**
```json
{
  "totalAttempts": 48,
  "successCount": 47,
  "failureCount": 1,
  "successRate": "98%",
  "averageResponseTime": 234,
  "lastSuccess": "2025-08-25T12:30:00.000Z",
  "uptimeDuration": "11h 42m 15s",
  "status": "healthy"
}
```

## ⚡ **최적화 팁**

### **1. 이중 보안 시스템**
- **UptimeRobot**: 5분마다 외부 ping (메인)
- **자체 node-cron**: 14분마다 자가 ping (백업)
- 둘 중 하나라도 작동하면 sleep 방지 효과

### **2. 모니터링 간격 조정**
```
권장: 5분 간격 (UptimeRobot 무료 최소 간격)
대안: 1분 간격 (유료 계정 시)
주의: 너무 자주하면 Render 리소스 소모
```

### **3. 장애 대응**
1. **UptimeRobot 다운**: 자체 cron이 백업으로 작동
2. **서버 다운**: 이메일 알림으로 즉시 확인
3. **네트워크 이슈**: 응답 시간 증가로 조기 감지

## 🔧 **트러블슈팅**

### **문제: 모니터가 Down 상태**
**해결책:**
1. URL 확인: 
   - 메인: `https://eastalk.onrender.com/health`
   - 테스트: `https://eastalk-staging.onrender.com/health`
2. Render 서비스 상태 확인
3. 직접 브라우저에서 URL 접속 테스트

### **문제: 응답 시간이 너무 느림 (>3초)**
**해결책:**
1. Render가 sleep에서 깨어나는 중일 수 있음
2. 5-10분 후 다시 확인
3. 지속되면 서버 로그 확인

### **문제: 성공률이 95% 미만**
**해결책:**
1. Keep-Alive 통계 API 확인
2. 자체 cron 작동 상태 점검
3. Render 계정 사용량 확인 (750시간 한도)

## 📈 **예상 효과**

### **적용 전**
- 15분 비활성화 후 sleep
- 2-3분 wake-up 시간
- 사용자 경험 저하

### **적용 후**
- 24/7 지속 가동
- 즉시 응답 (<1초)
- 안정적인 실시간 채팅

## 💰 **비용 분석**

### **완전 무료 구성**
- UptimeRobot 무료: 50개 모니터, 5분 간격
- Render 무료: 월 750시간 (31.25일)
- node-cron: 서버 내장, 추가 비용 없음

### **월 비용: $0**
- 모든 구성 요소 무료
- 추가 유료 서비스 불필요
- 소규모 서비스에 최적화

## ✅ **체크리스트**

- [ ] UptimeRobot 계정 생성 완료
- [ ] 모니터 설정 완료 (5분 간격)
- [ ] 알림 이메일 등록 완료
- [ ] 첫 24시간 모니터링 확인
- [ ] Keep-Alive 통계 API 테스트
- [ ] 서비스 정상 작동 확인

---

**최종 업데이트**: 2025-08-25  
**담당**: Claude Code SuperClaude  
**문의**: FEATURE_STATUS.md 참조