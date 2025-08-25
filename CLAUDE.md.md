너는 MCP를 자유롭게 쓸 수 있어 필요하면 언제든 MCP를 사용해

우리는 현재 "C:\Users\skdnc\mysite" 에 명시된 프로젝트를 진행중이야. 처음 대화 시작할 때 진행 상황을 꼭 파악해

GIT MCP 사용법 

.gitignore 설정 : 먼저 .gitignore 파일을 프로젝트 루트에 만들고(있으면 다시 만들지 않아도 괜찬아) IDE 설정 파일, 빌드 산출물, 로그, node_modules/, vendor/ 등 불필요한 항목을 명시합니다


- 초기화 & 커밋
{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path":    "C:\Users\skdnc\mysite",
    "command": "cmd",
    "args": [
      "/c",
      "git init && " +
      "echo IDE/.vs/ > .gitignore && " +
      "git add . && " +
      "git commit -m \"chore: initial project baseline\""
    ]
  }
}


- . WriteFile+diff 커밋 플로우
{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path":    "C:\Users\skdnc\mysite",
    "command": "cmd",
    "args": [
      "/c",
      "git add SHORTS_REAL/script_result.php && " +
      "git commit -m \"feat: change button label\""
    ]
  }
}


- 목록 조회

{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path":    "C:/project",
    "command": "cmd",
    "args": [
      "/c",
      "dir /S"
    ]
  }
}


- 패턴 검색

{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path":    "C:/project",
    "command": "cmd",
    "args": [
      "/c",
      "findstr /S /I /R \"console\\.log\" *.js"
    ]
  }
}

- 테스트 실행 후 자동 커밋

{
  "tool": "git",
  "parameters": {
    "subtool": "RunCommand",
    "path":    "C:/project",
    "command": "cmd",
    "args": [
      "/c",
      "npm test -- --verbose && " +
      "git add . && " +
      "git commit -m \"test: auto commit\""
    ]
  }
}


- 생성 + 커밋

{ 
  "tool": "git",
  "parameters": {
    "subtool":"RunCommand",
    "path":"C:\Users\skdnc\mysite",
    "command":"cmd",
    "args":[
      "/c",
      "echo DB_HOST=... > .env.example && " +
      "git add .env.example && " +
      "git commit -m \"chore: add env template\""
    ]
  }
}


- 삭제 + 커밋

{ 
  "tool":"git",
  "parameters": {
    "subtool":"RunCommand",
    "path":"C:\Users\skdnc\mysite",
    "command":"cmd",
    "args":[
      "/c",
      "git rm debug.log && " +
      "git commit -m \"build: drop debug log\""
    ]
  }
}

- 읽기

{ 
  "tool":"git",
  "parameters": {
    "subtool":"RunCommand",
    "path":"C:\Users\skdnc\mysite",
    "command":"cmd",
    "args":[
      "/c",
      "git show HEAD:SHORTS_REAL/script_result.php"
    ]
  }
}

Node.js & Git
{ "tool": "terminal", "parameters": { "cmd": "npm install express" } }
{ "tool": "terminal", "parameters": { "cmd": "node server.js" } }
{ "tool": "terminal", "parameters": { "cmd": "git clone https://github.com/0w0-dot/Eastalk.git" } }



다음 지침을 지켜줘.

- 폴더 및 파일 생성 및 수정은 C:\Users\skdnc\mysite 폴더에 대해 진행해줘.
- C:\Users\skdnc\mysite은 다음 웹사이트에 대한 루트 폴더야:  http://localhost
- 작업이 진행될 때마다, 그에 맞게 docs/project_plan.md 파일을 업데이트해줘.
- /mnt/c/Users/skdnc/mysite 폴더는 http://localhost를 가리켜. 따라서 http://localhost/site 말고 http://localhost로 접속해야 해.
- mysite 폴더에는 이미 생성된 파일들이 있어. 기존에 존재하는 파일들 확인하여 작업 진행해야 해. 
- 소스들이 많아 꼭 필요한 파일들만 읽은 후, 편집 또는 추가로 진행해줘. 긴 파일은 2개나 3개로 나누어서 작업해줘.
- 각 파일이 18kb를 초과하지 않도록 긴 내용은 미리 여러 개의 파일로 기획하여 진행해줘.
- docs 폴더에 파일을 업데이트하거나 생성할 때, 꼭 필요한 내용만 넣어서 용량을 줄여줘.
- project_plan.md 파일에는 프로젝트 중요 사항 및 완료된 일, 해야할 일이 기록되어야 해.
- 테스트 진행할 때는 MCP 도구를 이용해 진행해줘. localhost로 브라우저를 띄우고 각 메뉴도 클릭하고 하나씩 눌러보면서 진행해줘.
- 이미 개발된 내용의 규모를 키우지 않고, 테스트 및 오류 수정, 코드 완성도 높이기 작업에 집중할 거야. 이에 맞게끔 기능별 테스트 진행을 하고 오류 발견시 에러를 없애줘.
- 웹 자료 검색 시, google search를 한 후, 이에 기반해 playwright 브라우징을 해줘.
- DB는 Mysql이야. 필요하면 직접 접속해서 확인해.
- 쿼리 실행 등 DB 연결을 위해 mysql 쓸 때는 다음처럼 해봐.
{ args: [ -u, root, -e, \"SHOW DATABASES;\" ], command: mysql }
(중요한 점으로, "SHOW DATABASES;" 이 문구는 양 옆에 따옴표 있어야 해. 필수야)

- C:\Users\skdnc\mysite 폴더는 http://localhost를 가리켜. 따라서 http://localhost 접속시 C:\Users\skdnc\mysite 폴더의 인덱스 파일이 뜨게 돼. 
- 로그 정보가 C:\Users\skdnc\mysite\logs 이곳에 쌓이도록 개발을 진행해야 해. 그리고 너는 logs 폴더의 내용을 통해 오류 확인해야 해.
- 로그 정보는 C:\Users\skdnc\mysite\logs 이곳에 있어. 그래서 실행 오류는 이곳에 쌓이도록 코딩해야 해.
- 웹에서 필요한 로그인 및 인증 정보는 "C:\Users\skdnc\mysite\.gitignore\login.txt"에서 찾아서 쓸 것 (없으면 만들고 로그인에 필요한 정보가 새로 들어오면 항사 추가할 것)
- 자바스크립트 작성 시, 이벤트마다 콘솔에 로그를 남겨야 해. 그래야 에러 발생시 원인을 찾을 수 있어. 
- 디버깅 시, 콘솔의 로그를 찾아봐.
- 작업을 임의로 진행하지 말고, 작업 전에 반드시 동의를 받아야 해.
- Mysql 접속 계정은 다음과 같아.
   HOST: localhost
   아이디: root
   패스워드
- 너는 하라고 한 구체적인 사항은 진행하고 무조건 대기해야 해. 명시적으로 시킨것만 해줘.
- .git 이 존재하지 않으면 Git 저장소 초기화할 것  ( git init )]
- 파일 생성 또는 수정한 후, git add와 commit 수행할 것
- 파일 삭제시 git rm 및 commit 사용할 것
- 파일 작업 완료후 pull request 실행할 것
- 테스트 브랜치(test)에서 충분히 검증 후 PR 머지하여 master 에 병합
- github 저장소 URL은 다음과 같아: https://github.com/0w0-dot/kkyung
  지시하면, 로컬의 main 브랜치를 github에 올려야 해.
  로컬의 main 브랜치와 github의 main 브랜치는 서로 동기화되어야 해.
  github 저장소 최초 연결 후, 동기화 작업 진행해 주고, gitignore 작업도 해줘.
- github 푸쉬를 위해 다음 정보 사용:
  GIT HUB의 Personal Access Token: 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
- https://cli.github.com 에서  github CLI 설치했어. 그래서 gh 명령어 사용 가능해. 이걸로 github 처리해줘.
- 원격 저장소에 푸시할 때, 먼저 HTTP 버퍼 크기를 늘리고 조금 씩 나누어 푸시할 것. 에러 시 작은 변경사항만 포함하는 새커밋을 만들어 푸시할 것
- 특별한 지시가 없는 경우라면, 자동 Agent 모드가 아닌, 한번에 하나의 작업만 진행하고 이후 지침을 기다릴 것. 하지만,특별한 지시가 있으면 그에 따라 행동할 것
- 파일을 한번이라도 수정하면 소스가 바껴서 라인번호도 바껴. 따라서 각각의 edit_file_lines 전에 반드시 소스 위치 재확인할 것
- 매우 중요사항: edit_file_lines 수정 작업 할 때마다, 그 전에, 항상 작업할 파일의 편집하려는 부분 근처를 확인하고 진행할 것
- 매우 중요사항: edit_file_lines 수정 작업 진행시, 항상 반드시 "dryRun": true로 설정할 것

## 클로드 코드에서의 mcp-installer를 사용한 MCP (Model Context Protocol) 설치 및 설정 가이드 
공통 주의사항
1. 현재 사용 환경을 확인할 것. 모르면 사용자에게 물어볼 것. 
2. OS(윈도우,리눅스,맥) 및 환경들(WSL,파워셀,명령프롬프트등)을 파악해서 그에 맞게 세팅할 것. 모르면 사용자에게 물어볼 것.
3. mcp-installer을 이용해 필요한 MCP들을 설치할 것
   (user 스코프로 설치 및 적용할것)
4. 특정 MCP 설치시, 바로 설치하지 말고, WebSearch 도구로 해당 MCP의 공식 사이트 확인하고 현재 OS 및 환경 매치하여, 공식 설치법부터 확인할 것
5. 공식 사이트 확인 후에는 context7 MCP 존재하는 경우, context7으로 다시 한번 확인할 것
6. MCP 설치 후, task를 통해 디버그 모드로 서브 에이전트 구동한 후, /mcp 를 통해 실제 작동여부를 반드시 확인할 것 
7. 설정 시, API KEY 환경 변수 설정이 필요한 경우, 가상의 API 키로 디폴트로 설치 및 설정 후, 올바른 API 키 정보를 입력해야 함을 사용자에게 알릴 것
8. Mysql MCP와 같이 특정 서버가 구동중 상태여만 정상 작동한 것은 에러가 나도 재설치하지 말고, 정상 구동을 위한 조건을 사용자에게 알릴 것
9. 현재 클로드 코드가 실행되는 환경이야.
10. 설치 요청 받은 MCP만 설치하면 돼. 혹시 이미 설치된 다른 MCP 에러 있어도, 그냥 둘 것
11. 일단, 터미널에서 설치하려는 MCP 작동 성공한 경우, 성공 시의 인자 및 환경 변수 이름을 활용해, 올바른 위치의 json 파일에 MCP 설정을 직접할 것

*윈도우에서의 주의사항*
1. 설정 파일 직접 세팅시, Windows 경로 구분자는 백슬래시(\)이며, JSON 내에서는 반드시 이스케이프 처리(\\\\)해야 해.
** OS 공통 주의사항**
1. Node.js가 %PATH%에 등록되어 있는지, 버전이 최소 v18 이상인지 확인할 것
2. npx -y 옵션을 추가하면 버전 호환성 문제를 줄일 수 있음

### MCP 서버 설치 순서

1. 기본 설치
	mcp-installer를 사용해 설치할 것

2. 설치 후 정상 설치 여부 확인하기	
	claude mcp list 으로 설치 목록에 포함되는지 내용 확인한 후,
	task를 통해 디버그 모드로 서브 에이전트 구동한 후 (claude --debug), 최대 2분 동안 관찰한 후, 그 동안의 디버그 메시지(에러 시 관련 내용이 출력됨)를 확인하고 /mcp 를 통해(Bash(echo "/mcp" | claude --debug)) 실제 작동여부를 반드시 확인할 것

3. 문제 있을때 다음을 통해 직접 설치할 것

	*User 스코프로 claude mcp add 명령어를 통한 설정 파일 세팅 예시*
	예시1:
	claude mcp add --scope user youtube-mcp \
	  -e YOUTUBE_API_KEY=$YOUR_YT_API_KEY \

	  -e YOUTUBE_TRANSCRIPT_LANG=ko \
	  -- npx -y youtube-data-mcp-server


4. 정상 설치 여부 확인 하기
	claude mcp list 으로 설치 목록에 포함되는지 내용 확인한 후,
	task를 통해 디버그 모드로 서브 에이전트 구동한 후 (claude --debug), 최대 2분 동안 관찰한 후, 그 동안의 디버그 메시지(에러 시 관련 내용이 출력됨)를 확인하고, /mcp 를 통해(Bash(echo "/mcp" | claude --debug)) 실제 작동여부를 반드시 확인할 것


5. 문제 있을때 공식 사이트 다시 확인후 권장되는 방법으로 설치 및 설정할 것
	(npm/npx 패키지를 찾을 수 없는 경우) pm 전역 설치 경로 확인 : npm config get prefix
	권장되는 방법을 확인한 후, npm, pip, uvx, pip 등으로 직접 설치할 것

	#### uvx 명령어를 찾을 수 없는 경우
	# uv 설치 (Python 패키지 관리자)
	curl -LsSf https://astral.sh/uv/install.sh | sh

	#### npm/npx 패키지를 찾을 수 없는 경우
	# npm 전역 설치 경로 확인
	npm config get prefix


	#### uvx 명령어를 찾을 수 없는 경우
	# uv 설치 (Python 패키지 관리자)
	curl -LsSf https://astral.sh/uv/install.sh | sh


	## 설치 후 터미널 상에서 작동 여부 점검할 것 ##
	
	## 위 방법으로, 터미널에서 작동 성공한 경우, 성공 시의 인자 및 환경 변수 이름을 활용해서, 클로드 코드의 올바른 위치의 json 설정 파일에 MCP를 직접 설정할 것 ##


	설정 예시
		(설정 파일 위치)
		**리눅스, macOS 또는 윈도우 WSL 기반의 클로드 코드인 경우**
		- **User 설정**: `~/.claude/` 디렉토리
		- **Project 설정**: 프로젝트 루트/.claude

		**윈도우 네이티브 클로드 코드인 경우**
		- **User 설정**: `C:\Users\skdnc\.claude` 디렉토리
		- *User 설정파일*  C:\Users\skdnc\.claude.json
		- **Project 설정**: 프로젝트 루트\.claude

		1. npx 사용

		{
		  "youtube-mcp": {
		    "type": "stdio",
		    "command": "npx",
		    "args": ["-y", "youtube-data-mcp-server"],
		    "env": {
		      "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE",
		      "YOUTUBE_TRANSCRIPT_LANG": "ko"
		    }
		  }
		}


		2. cmd.exe 래퍼 + 자동 동의)
		{
		  "mcpServers": {
		    "mcp-installer": {
		      "command": "cmd.exe",
		      "args": ["/c", "npx", "-y", "@anaisbetts/mcp-installer"],
		      "type": "stdio"
		    }
		  }
		}

		3. 파워셀예시
		{
		  "command": "powershell.exe",
		  "args": [
		    "-NoLogo", "-NoProfile",
		    "-Command", "npx -y @anaisbetts/mcp-installer"
		  ]
		}

		4. npx 대신 node 지정
		{
		  "command": "node",
		  "args": [
		    "%APPDATA%\\npm\\node_modules\\@anaisbetts\\mcp-installer\\dist\\index.js"
		  ]
		}

		5. args 배열 설계 시 체크리스트
		토큰 단위 분리: "args": ["/c","npx","-y","pkg"] 와
			"args": ["/c","npx -y pkg"] 는 동일해보여도 cmd.exe 내부에서 따옴표 처리 방식이 달라질 수 있음. 분리가 안전.
		경로 포함 시: JSON에서는 \\ 두 번. 예) "C:\\tools\\mcp\\server.js".
		환경변수 전달:
			"env": { "UV_DEPS_CACHE": "%TEMP%\\uvcache" }
		타임아웃 조정: 느린 PC라면 MCP_TIMEOUT 환경변수로 부팅 최대 시간을 늘릴 수 있음 (예: 10000 = 10 초) 

**중요사항**
	윈도우 네이티브 환경이고 MCP 설정에 어려움이 있는데 npx 환경이라면, cmd나 node 등으로 다음과 같이 대체해 볼것:
	{
	"mcpServers": {
	      "context7": {
		 "command": "cmd",
		 "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]
	      }
	   }
	}

	claude mcp add-json context7 -s user '{"type":"stdio","command":"cmd","args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]}'

(설치 및 설정한 후는 항상 아래 내용으로 검증할 것)
	claude mcp list 으로 설치 목록에 포함되는지 내용 확인한 후,
	task를 통해 디버그 모드로 서브 에이전트 구동한 후 (claude --debug), 최대 2분 동안 관찰한 후, 그 동안의 디버그 메시지(에러 시 관련 내용이 출력됨)를 확인하고 /mcp 를 통해 실제 작동여부를 반드시 확인할 것

ㅊㅇ 
		
** MCP 서버 제거가 필요할 때 예시: **
claude mcp remove youtube-mcp


## 윈도우 네이티브 클로드 코드에서 클로드 데스크탑의 MCP 가져오는 방법 ###
"C:\Users\skdnc\AppData\Roaming\Claude\claude_desktop_config.json" 이 파일이 존재한다면 클로드 데스크탑이 설치된 상태야.
이 파일의 mcpServers 내용을 클로드 코드 설정 파일(C:\Users\skdnc\.claude.json)의 user 스코프 위치(projects 항목에 속하지 않은 mcpServers가 user 스코프에 해당)로 그대로 가지고 오면 돼.
가지고 온 후, task를 통해 디버그 모드로 서브 에이전트 구동하여 (claude --debug) 클로드 코드에 문제가 없는지 확인할 것

### 문제해결 사례 (2025-07-20) ###
**문제:** 잘못된 사용자명으로 클로드 데스크탑 설정 파일을 찾지 못함
**해결방법:** whoami 명령어로 실제 사용자명 확인 후 올바른 경로 사용 (nawoochang → skdnc로 수정)
**결과:** 클로드 데스크탑 MCP 설정을 성공적으로 클로드 코드로 복사 완료

