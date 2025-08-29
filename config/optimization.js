/**
 * 성능 최적화 설정
 * 메모리, 캐시, 연결 관리 등
 */

module.exports = {
  // 메모리 관리
  memory: {
    // 메모리 임계값 (MB)
    maxHeapUsed: 512,
    // 가비지 컬렉션 주기 (ms)
    gcInterval: process.env.NODE_ENV === 'production' ? 60000 : 30000,
    // 메모리 경고 임계값 (%)
    warningThreshold: 85,
    // 메모리 리포트 주기 (ms)
    reportInterval: 300000 // 5분
  },

  // 캐시 설정
  cache: {
    // 메시지 캐시 최대 크기
    maxMessageCache: 1000,
    // 사용자 캐시 최대 크기
    maxUserCache: 500,
    // 캐시 TTL (ms)
    ttl: 3600000, // 1시간
    // 캐시 정리 주기 (ms)
    cleanupInterval: 600000 // 10분
  },

  // Socket.IO 최적화
  socketIO: {
    // 핑 인터벌 (ms)
    pingInterval: 15000,
    // 핑 타임아웃 (ms)
    pingTimeout: 10000,
    // 최대 HTTP 버퍼 크기
    maxHttpBufferSize: 1e6, // 1MB
    // 전송 압축
    perMessageDeflate: {
      threshold: 1024 // 1KB 이상만 압축
    },
    // 연결 상태 복구
    connectionStateRecovery: {
      maxDisconnectionDuration: 120000, // 2분
      skipMiddlewares: true
    }
  },

  // Rate Limiting
  rateLimit: {
    // 일반 API
    api: {
      windowMs: 15 * 60 * 1000, // 15분
      max: 100, // 최대 요청 수
      message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
    },
    // 메시지 전송
    message: {
      windowMs: 60 * 1000, // 1분
      max: 30, // 최대 30개 메시지
      message: '메시지 전송 한도를 초과했습니다.'
    },
    // 파일 업로드
    upload: {
      windowMs: 60 * 1000, // 1분
      max: 5, // 최대 5개 파일
      message: '파일 업로드 한도를 초과했습니다.'
    }
  },

  // 데이터베이스 최적화
  database: {
    // 연결 풀 크기
    poolSize: 10,
    // 연결 타임아웃 (ms)
    connectTimeoutMS: 10000,
    // 소켓 타임아웃 (ms)
    socketTimeoutMS: 30000,
    // 인덱스 자동 생성
    autoIndex: process.env.NODE_ENV !== 'production',
    // 쿼리 타임아웃 (ms)
    maxTimeMS: 5000
  },

  // 파일 업로드
  upload: {
    // 최대 파일 크기 (bytes)
    maxFileSize: 5 * 1024 * 1024, // 5MB
    // 허용 파일 타입
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    // 임시 디렉토리
    tempDir: './temp/uploads',
    // 업로드 디렉토리
    uploadDir: './public/uploads'
  },

  // 정리 작업
  cleanup: {
    // 오래된 메시지 삭제 (일)
    messageRetentionDays: 30,
    // 비활성 사용자 삭제 (일)
    inactiveUserDays: 90,
    // 정리 작업 실행 시간 (cron)
    schedule: '0 3 * * *' // 매일 새벽 3시
  },

  // 모니터링
  monitoring: {
    // 헬스체크 엔드포인트
    healthCheckPath: '/health',
    // 메트릭 수집 주기 (ms)
    metricsInterval: 60000,
    // 슬로우 쿼리 임계값 (ms)
    slowQueryThreshold: 1000,
    // 에러 알림 임계값
    errorAlertThreshold: 10
  }
};