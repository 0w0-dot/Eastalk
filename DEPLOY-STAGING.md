# 🚀 Eastalk 안전한 브랜치별 배포 가이드

## 📋 환경 분리 구조

```
🔧 develop 브랜치 → 🧪 스테이징 환경 (자동 배포)
🏢 main 브랜치 → 🚀 프로덕션 환경 (수동 배포)
```

## 🎯 브랜치별 역할

### develop 브랜치 (스테이징)
- **목적**: 새로운 기능 개발 및 테스트
- **배포**: 자동 배포 (push 시 즉시)
- **환경**: `NODE_ENV=staging`
- **플랜**: Free (테스트용)
- **URL**: `https://eastalk-staging.onrender.com`

### main 브랜치 (프로덕션)  
- **목적**: 안정된 버전 서비스
- **배포**: 수동 배포 (승인 후)
- **환경**: `NODE_ENV=production`
- **플랜**: Starter ($7/월)
- **URL**: `https://eastalk-web.onrender.com`

## 🛠️ 환경 설정

### 1단계: 스테이징 환경 생성

1. [Render Dashboard](https://dashboard.render.com) 접속
2. **New +** → **Web Service** 선택
3. **Connect a repository** → GitHub 선택
4. `0w0-dot/Eastalk` 저장소 선택

**스테이징 서비스 설정:**
```yaml
Name: eastalk-staging
Branch: develop
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free
Auto-Deploy: Yes
```

**환경변수 설정:**
| Key | Value |
|-----|-------|
| `NODE_ENV` | `staging` |
| `MONGODB_URI` | `[스테이징용 MongoDB URI]` |

### 2단계: 프로덕션 환경 설정

**기존 서비스 수정:**
- **Auto-Deploy**: `No` (수동 배포로 변경)
- **Branch**: `main` (유지)
- **Plan**: `Starter` (권장)

## 🔄 개발 워크플로

### 새 기능 개발 시:

1. **feature 브랜치 생성**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/새기능이름
   ```

2. **개발 & 로컬 테스트**
   ```bash
   npm run dev  # 로컬 개발 서버
   ```

3. **develop 브랜치로 merge**
   ```bash
   git checkout develop
   git merge feature/새기능이름
   git push origin develop
   ```

4. **스테이징 환경 자동 배포** ⚡
   - develop push 시 자동으로 스테이징 환경에 배포됨

5. **스테이징 테스트**
   - https://eastalk-staging.onrender.com 에서 실제 테스트
   - 모든 기능 동작 확인
   - 다양한 브라우저/기기에서 테스트

6. **프로덕션 배포 (문제없으면)**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

7. **수동 배포 실행**
   - Render Dashboard → eastalk-web → **Manual Deploy** 클릭

## 📊 테스트 체크리스트

### 스테이징 환경 테스트
- [ ] 페이지 로드 정상
- [ ] 로그인 기능 (이름 + 생일)
- [ ] 실시간 채팅 송수신
- [ ] 이모지 반응 추가
- [ ] 이미지 업로드
- [ ] 4개 방 전환 기능
- [ ] 모바일 반응형 확인
- [ ] 새로 수정된 기능 동작 확인

### 프로덕션 배포 전 최종 확인
- [ ] 스테이징에서 모든 테스트 통과
- [ ] 데이터베이스 백업 완료
- [ ] 롤백 계획 준비
- [ ] 사용자 공지 (필요시)

## 🚨 롤백 계획

### 문제 발생 시 즉시 대응:

1. **Render Dashboard 접속**
2. **eastalk-web** 서비스 선택
3. **Deployments** 탭 → 이전 안정 버전 선택
4. **Redeploy** 클릭

또는 Git으로:
```bash
git checkout main
git revert HEAD  # 최근 커밋 되돌리기
git push origin main
# Render에서 수동 배포 실행
```

## 🎯 배포 명령어 치트시트

```bash
# 개발 시작
git checkout develop
git pull origin develop
git checkout -b feature/기능명

# 스테이징 배포 (자동)
git checkout develop
git merge feature/기능명
git push origin develop  # → 자동으로 스테이징에 배포

# 프로덕션 배포 (수동)
git checkout main  
git merge develop
git push origin main  # → Render에서 수동 배포 실행 필요
```

## ✅ 장점

- **안전성**: 스테이징에서 먼저 테스트
- **자동화**: develop → staging 자동 배포
- **제어**: main → production 수동 배포
- **비용 효율**: 스테이징은 무료, 프로덕션만 유료
- **빠른 롤백**: 문제 시 즉시 이전 버전으로 복구

**🎉 이제 안전하게 배포할 수 있습니다!**