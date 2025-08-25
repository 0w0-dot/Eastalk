# 🚀 Eastalk 프로젝트 개발 지침서

## 📋 프로젝트 개요

- **프로젝트**: Eastalk Web Version (실시간 채팅 애플리케이션)
- **루트 디렉토리**: `C:\Users\skdnc\mysite`
- **로컬 URL**: http://localhost:3000
- **기술 스택**: Node.js, Express, Socket.IO, MongoDB, Vanilla JS
- **배포**: Render (브랜치별 환경 분리)
- **저장소**: https://github.com/0w0-dot/Eastalk

## 🎯 핵심 개발 원칙

### 1. 안전한 브랜치 기반 개발
```
develop 브랜치 → 스테이징 환경 (자동 배포)
main 브랜치 → 프로덕션 환경 (수동 배포)
```

### 2. 테스트 우선 접근
- 기능 추가보다 **기존 기능 안정성** 우선
- 오류 발견 시 즉시 수정
- 코드 완성도 향상에 집중

### 3. MCP 도구 적극 활용
- **Context7**: 기술 문서 및 패턴 참조
- **Playwright**: 브라우저 자동 테스트 실행
- **Sequential**: 복잡한 문제 분석
- **Google Search**: 외부 자료 검색

## 📁 프로젝트 구조 및 규칙

### 디렉토리 구조
```
C:\Users\skdnc\mysite/
├── server.js                 # 메인 서버 파일
├── package.json              # 의존성 및 스크립트
├── public/
│   └── index.html           # 프론트엔드 (SPA)
├── docs/                    # 프로젝트 문서
│   ├── project_plan.md      # 프로젝트 진행 상황
│   └── error.md            # 오류 분석 문서
├── logs/                    # 로그 파일 저장소
├── render.yaml              # 프로덕션 배포 설정
├── render-staging.yaml      # 스테이징 배포 설정
└── .gitignore              # Git 제외 파일 목록
```

### 파일 관리 규칙
- **18KB 초과 금지**: 긴 내용은 여러 파일로 분할
- **docs 폴더 최적화**: 필수 내용만 포함하여 용량 최소화
- **project_plan.md 필수 업데이트**: 모든 작업 완료 후 진행 상황 기록

## 🔧 개발 환경 설정

### 필수 환경변수
```bash
# 로컬 개발
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/eastalk  # 또는 MongoDB Atlas URI

# 스테이징
NODE_ENV=staging
MONGODB_URI=[스테이징 DB URI]

# 프로덕션
NODE_ENV=production
MONGODB_URI=[프로덕션 DB URI]
```

### NPM 스크립트
```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "start:staging": "NODE_ENV=staging node server.js",
  "start:production": "NODE_ENV=production node server.js",
  "test": "echo 'Running tests...' && exit 0"
}
```

### 포트 관리
- **기본 포트**: 3000 (로컬), 환경변수 PORT (배포)
- **충돌 시 해결**: `taskkill /PID [PID번호] /F`

## 📝 코딩 표준 및 규칙

### JavaScript 개발 규칙
1. **이벤트 로깅 필수**: 모든 이벤트에 콘솔 로그 추가
```javascript
// 좋은 예시
function loginUser(username, birthday) {
    console.log('[LOGIN] Attempting login:', username);
    // 로직 구현
    console.log('[LOGIN] Login successful');
}
```

2. **에러 처리**: try-catch 블록으로 모든 예외 처리
```javascript
try {
    // 위험한 작업
} catch (error) {
    console.error('[ERROR] 작업 실패:', error.message);
    // 로그 파일에 기록
}
```

3. **전역 상태 관리**: AppState 객체 활용
```javascript
const AppState = {
    userId: null,
    currentRoom: '주중',
    cache: {
        renderedMids: {}
    }
};
```

### 로그 시스템 규칙
- **로그 저장소**: `C:\Users\skdnc\mysite\logs`
- **로그 레벨**: ERROR, WARN, INFO, DEBUG
- **파일명 규칙**: `YYYY-MM-DD.log`
- **실행 오류**: 반드시 logs 폴더에 기록

## 🔄 Git 워크플로

### 브랜치 전략
1. **Feature 개발**:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/새기능명
# 개발 진행
git add .
git commit -m "feat: 새기능 설명"
git push origin feature/새기능명
```

2. **Develop 병합**:
```bash
git checkout develop
git merge feature/새기능명
git push origin develop  # 자동으로 스테이징 배포
```

3. **프로덕션 배포**:
```bash
git checkout main
git merge develop
git push origin main  # Render에서 수동 배포 실행
```

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정  
docs: 문서 업데이트
refactor: 코드 리팩토링
test: 테스트 추가
style: 코딩 스타일 변경
chore: 빌드 관련 작업
```

### MCP Git 사용법 (Windows 최적화)
```javascript
// 파일 생성 + 커밋
{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path": "C:\\Users\\skdnc\\mysite",
    "command": "cmd",
    "args": [
      "/c",
      "echo 내용 > 파일명.txt && " +
      "git add 파일명.txt && " +
      "git commit -m \"feat: 파일 추가\""
    ]
  }
}

// 수정 + 커밋
{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path": "C:\\Users\\skdnc\\mysite",
    "command": "cmd",
    "args": [
      "/c",
      "git add server.js && " +
      "git commit -m \"fix: 서버 오류 수정\""
    ]
  }
}
```

## 🧪 테스트 및 품질 관리

### MCP Playwright 브라우저 테스트
```javascript
// 기본 테스트 시나리오
1. http://localhost:3000 접속
2. 로그인 (이름: 테스트유저, 생일: 0101)
3. 메시지 전송 테스트
4. 방 전환 테스트 (주중 → 주말 → 전체 → 방문예정)
5. 이모지 반응 테스트
6. 이미지 업로드 테스트
7. 모바일 반응형 확인
```

### 테스트 체크리스트
- [ ] **로그인 기능**: 이름 + 생일 4자리 인증
- [ ] **실시간 채팅**: 메시지 송수신 정상
- [ ] **4개 채팅방**: 주중/주말/전체/방문예정 전환
- [ ] **이모지 반응**: 좋아요/하트/웃음/놀람 추가
- [ ] **이미지 업로드**: 파일 선택 및 미리보기
- [ ] **반응형 디자인**: 모바일/태블릿/데스크톱 대응
- [ ] **프로필 관리**: 사용자 정보 모달

### 디버깅 프로세스
1. **콘솔 로그 확인**: 브라우저 개발자 도구
2. **서버 로그 확인**: `C:\Users\skdnc\mysite\logs` 폴더
3. **네트워크 탭**: API 요청/응답 상태 확인
4. **MongoDB 쿼리**: 데이터베이스 직접 확인 필요시

## 🗄️ 데이터베이스 관리

### MongoDB 연결
```javascript
// 환경별 연결 설정
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eastalk';

// 연결 테스트
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB 연결 성공'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));
```

### 스키마 구조
```javascript
// User 스키마
{
  username: String,
  birthday: String,
  profileImage: String,
  joinDate: Date
}

// Message 스키마
{
  room: String,
  sender: String,
  content: String,
  type: String, // 'text' | 'image'
  reactions: Map,
  timestamp: Date
}
```

### MySQL 대안 사용 시
```javascript
// MySQL 접속 (필요한 경우)
{
  args: ["-u", "root", "-e", "SHOW DATABASES;"],
  command: "mysql"
}
```

## 🚀 배포 및 환경 관리

### Render 배포 환경
```yaml
# render-staging.yaml (develop 브랜치)
services:
  - type: web
    name: eastalk-staging
    branch: develop
    autoDeploy: true
    plan: free

# render.yaml (main 브랜치)  
services:
  - type: web
    name: eastalk-web
    branch: main
    autoDeploy: false  # 수동 배포
    plan: starter
```

### 환경변수 관리
- **Render Dashboard**: Environment 탭에서 설정
- **로컬 .env**: `.gitignore`에 포함하여 보안 유지
- **인증 정보**: `C:\Users\skdnc\mysite\.gitignore\login.txt`에 별도 관리

### 배포 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 로그 시스템 정상 작동
- [ ] 환경변수 올바른 설정
- [ ] Git 커밋 메시지 명확
- [ ] project_plan.md 업데이트

## 🔧 MCP 설치 및 관리

### 기본 MCP 설치
```bash
# Context7 (기술 문서)
claude mcp add-json context7 -s user '{"type":"stdio","command":"cmd","args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]}'

# Playwright (브라우저 테스트)
claude mcp add-json playwright -s user '{"type":"stdio","command":"cmd","args": ["/c", "npx", "-y", "playwright-mcp@latest"]}'
```

### 설치 후 검증
```bash
# MCP 목록 확인
claude mcp list

# 디버그 모드로 작동 확인
claude --debug
# /mcp 명령어로 실제 작동 테스트
```

### Windows 환경 최적화
```json
// Windows 경로 주의사항
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "패키지명"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

## 🚦 작업 진행 규칙

### 작업 전 필수 확인
1. **프로젝트 상황 파악**: `docs/project_plan.md` 읽기
2. **Git 상태 확인**: `git status`, `git branch` 확인
3. **서버 상태 확인**: 포트 충돌 여부, 로그 확인

### 작업 중 준수사항
1. **한 번에 하나씩**: 특별한 지시 없는 한 한 작업만 진행 후 대기
2. **수정 전 확인**: `edit_file_lines` 사용 전 반드시 해당 부분 재확인
3. **드라이런 필수**: `"dryRun": true`로 미리 확인
4. **작업 승인**: 임의 진행 금지, 구체적 지시사항만 수행

### 작업 후 필수 작업
1. **Git 커밋**: 파일 수정/생성 후 즉시 커밾
2. **문서 업데이트**: `docs/project_plan.md` 진행 상황 기록
3. **테스트 실행**: 변경사항 검증
4. **로그 확인**: 오류 발생 여부 점검

## 🔍 문제 해결 가이드

### 일반적인 문제들
1. **포트 충돌**: `netstat -ano | findstr :3000` → `taskkill /PID [번호] /F`
2. **MongoDB 연결 실패**: 인증정보/IP 화이트리스트 확인
3. **Render 배포 실패**: 환경변수 설정, 로그 확인
4. **프록시 오류**: `app.set('trust proxy', 1)` 추가

### 로그 기반 디버깅
```javascript
// 로그 레벨별 처리
console.log('[INFO] 일반 정보');
console.warn('[WARN] 경고 사항');  
console.error('[ERROR] 오류 발생');
console.debug('[DEBUG] 디버그 정보');
```

### MCP 문제 해결
1. **설치 실패**: 공식 사이트 확인 → Context7으로 재확인
2. **작동 불가**: 터미널에서 직접 테스트 후 JSON 설정
3. **권한 문제**: User 스코프 설정 확인
4. **환경변수**: API 키 등 필수 설정 누락 확인

## 📚 참고 자료 및 리소스

### 프로젝트 문서
- `docs/project_plan.md`: 진행 상황 및 완료 내역
- `docs/error.md`: 오류 분석 및 해결 과정
- `DEPLOY-STAGING.md`: 브랜치별 배포 가이드
- `DEPLOY.md`: 기본 배포 가이드

### 기술 스택 문서
- **Node.js**: https://nodejs.org/docs
- **Express**: https://expressjs.com
- **Socket.IO**: https://socket.io/docs
- **MongoDB**: https://www.mongodb.com/docs
- **Render**: https://render.com/docs

### GitHub 리소스
- **저장소**: https://github.com/0w0-dot/Eastalk
- **이슈 트래킹**: GitHub Issues 활용
- **PR 워크플로**: develop → main 방향

## 🎯 성공 지표

### 개발 품질 기준
- **버그 제로**: 새로운 기능보다 기존 오류 해결 우선
- **테스트 커버리지**: 모든 주요 기능 브라우저 테스트 완료
- **문서화**: 모든 변경사항 project_plan.md 반영
- **로그 완성도**: 모든 에러 상황 로그 파일 기록

### 배포 안정성
- **스테이징 검증**: develop 브랜치 완전 테스트 후 main 병합
- **롤백 준비**: 문제 시 즉시 이전 버전 복구 가능
- **모니터링**: 실시간 오류 감지 및 대응

---

**📅 최종 업데이트**: 2025-08-25  
**📝 작성자**: Claude Code Assistant  
**🔄 버전**: v1.0 (Eastalk 프로젝트 전용)

> **중요**: 이 지침은 Eastalk 프로젝트의 현재 상태와 환경에 최적화되었습니다. 프로젝트 진행에 따라 지속적으로 업데이트하여 최신 상태를 유지하시기 바랍니다.