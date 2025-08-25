# 🚀 Eastalk Render 배포 가이드

## 📋 배포 준비 완료 상태 ✅

현재 프로젝트는 **즉시 Render에 배포 가능**합니다!

### 🎯 준비 완료된 요소들

- ✅ **서버 설정**: PORT 환경변수, 0.0.0.0 바인딩
- ✅ **MongoDB Atlas**: 연결 정보 확보
- ✅ **Health Check**: `/health` 및 `/api/status` 엔드포인트
- ✅ **파일 업로드**: 프로덕션 환경 최적화
- ✅ **Graceful Shutdown**: 안전한 서버 종료
- ✅ **GitHub 저장소**: https://github.com/0w0-dot/Eastalk

## 🌐 Render 배포 단계

### 1단계: Render 서비스 생성
1. [Render Dashboard](https://dashboard.render.com) 접속
2. **New +** → **Web Service** 선택
3. **Connect a repository** → GitHub 선택
4. `0w0-dot/Eastalk` 저장소 선택
5. **Connect** 클릭

### 2단계: 서비스 설정
```yaml
Name: eastalk-web
Region: Oregon (US West)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### 3단계: 환경변수 설정
**Environment Variables** 섹션에서 추가:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://skdnckd:s11780178S!@eastalk.dstmx07.mongodb.net/?retryWrites=true&w=majority&appName=Eastalk` |
| `NODE_ENV` | `production` |

> **보안 중요**: MONGODB_URI는 **Secret**으로 설정하세요!

### 4단계: 배포 실행
- **Plan**: Free (테스트용) 또는 Starter ($7/월, 권장)
- **Create Web Service** 클릭!

## 🔍 배포 후 확인사항

### Health Check URLs
- **Main**: https://your-app.onrender.com
- **Health**: https://your-app.onrender.com/health  
- **Status**: https://your-app.onrender.com/api/status

### 기능 테스트 체크리스트
- [ ] 페이지 로드 확인
- [ ] 로그인 (이름 + 생일 4자리)
- [ ] 메시지 전송/수신
- [ ] 이모지 반응 추가
- [ ] 이미지 업로드
- [ ] 4개 방 전환 (주중, 주말, 전체, 방문예정)
- [ ] 모바일 반응형 확인

## 🎨 배포 후 옵션

### Free vs Starter 플랜
- **Free**: 15분 후 Sleep 모드, 테스트용
- **Starter** ($7/월): 24시간 가동, 실제 사용 권장

### 도메인 연결 (선택사항)
1. **Settings** → **Custom Domains**
2. 도메인 추가 및 DNS 설정

## 🛠️ 문제해결

### 일반적인 문제
1. **빌드 실패**: package.json의 engines 확인
2. **MongoDB 연결 실패**: 환경변수 MONGODB_URI 확인
3. **500 에러**: `/health` 엔드포인트로 상태 확인

### 로그 확인
- Render Dashboard → **Logs** 탭에서 실시간 로그 확인

## ✨ 배포 완료!

배포가 성공하면:
1. **Live URL**에서 서비스 접속 가능
2. **자동 배포**: main 브랜치 push 시 자동 재배포
3. **24시간 서비스**: Starter 플랜 선택 시

**🎉 축하합니다! Eastalk이 성공적으로 배포되었습니다!**