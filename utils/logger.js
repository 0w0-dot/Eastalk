/**
 * 로거 유틸리티
 * 환경에 따라 로그 레벨을 자동 조정
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// 로그 레벨 정의
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 현재 로그 레벨 설정
const currentLogLevel = isProduction ? LogLevel.WARN : LogLevel.DEBUG;

// 색상 코드 (개발 환경용)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

class Logger {
  constructor(module = 'Server') {
    this.module = module;
  }

  // 타임스탬프 생성
  getTimestamp() {
    return new Date().toISOString();
  }

  // 로그 포맷팅
  formatMessage(level, message, data) {
    const timestamp = this.getTimestamp();
    const prefix = `[${timestamp}] [${level}] [${this.module}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  // 컬러 로그 (개발 환경)
  colorLog(color, level, message, data) {
    if (isDevelopment) {
      console.log(color + this.formatMessage(level, message, data) + colors.reset);
    } else {
      console.log(this.formatMessage(level, message, data));
    }
  }

  // 에러 로그
  error(message, error) {
    if (currentLogLevel >= LogLevel.ERROR) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        ...error
      } : undefined;
      this.colorLog(colors.red, 'ERROR', message, errorData);
    }
  }

  // 경고 로그
  warn(message, data) {
    if (currentLogLevel >= LogLevel.WARN) {
      this.colorLog(colors.yellow, 'WARN', message, data);
    }
  }

  // 정보 로그
  info(message, data) {
    if (currentLogLevel >= LogLevel.INFO) {
      this.colorLog(colors.green, 'INFO', message, data);
    }
  }

  // 디버그 로그
  debug(message, data) {
    if (currentLogLevel >= LogLevel.DEBUG) {
      this.colorLog(colors.gray, 'DEBUG', message, data);
    }
  }

  // 성능 측정용 타이머
  startTimer(label) {
    if (isDevelopment) {
      console.time(`[PERF] ${label}`);
    }
  }

  endTimer(label) {
    if (isDevelopment) {
      console.timeEnd(`[PERF] ${label}`);
    }
  }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

// 모듈별 로거 생성 함수
function createLogger(moduleName) {
  return new Logger(moduleName);
}

module.exports = {
  logger,
  createLogger,
  LogLevel
};