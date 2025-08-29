/**
 * 성능 모니터링 및 메모리 관리 유틸리티
 */

const { createLogger } = require('./logger');
const config = require('../config/optimization');

const logger = createLogger('Performance');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      connections: 0,
      memoryUsage: {},
      lastCleanup: Date.now()
    };
    
    this.init();
  }

  init() {
    // 메모리 모니터링 시작
    this.startMemoryMonitoring();
    
    // 가비지 컬렉션 설정
    this.setupGarbageCollection();
    
    // 헬스체크 메트릭 초기화
    this.updateMemoryMetrics();
  }

  // 메모리 사용량 업데이트
  updateMemoryMetrics() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      timestamp: Date.now()
    };
    
    return this.metrics.memoryUsage;
  }

  // 메모리 모니터링 시작
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = this.updateMemoryMetrics();
      
      // 메모리 사용량이 임계값을 초과하면 경고
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
      if (heapUsedPercent > config.memory.warningThreshold) {
        logger.warn('높은 메모리 사용량 감지', {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          percentage: Math.round(heapUsedPercent)
        });
        
        // 강제 가비지 컬렉션 실행
        this.forceGarbageCollection();
      }
      
      // 주기적으로 메모리 리포트
      if (process.env.NODE_ENV === 'development') {
        logger.debug('메모리 사용량', usage);
      }
    }, config.memory.reportInterval);
  }

  // 가비지 컬렉션 설정
  setupGarbageCollection() {
    if (global.gc) {
      logger.info('가비지 컬렉션 시스템 활성화');
      
      setInterval(() => {
        this.forceGarbageCollection();
      }, config.memory.gcInterval);
    } else {
      logger.warn('가비지 컬렉션 비활성화 - Node.js --expose-gc 플래그가 필요합니다');
    }
  }

  // 강제 가비지 컬렉션 실행
  forceGarbageCollection() {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = Math.round((before - after) / 1024 / 1024);
      
      if (freed > 0) {
        logger.debug(`가비지 컬렉션 완료: ${freed}MB 해제`);
      }
      
      return freed;
    }
    return 0;
  }

  // 요청 카운터 증가
  incrementRequests() {
    this.metrics.requests++;
  }

  // 에러 카운터 증가
  incrementErrors() {
    this.metrics.errors++;
  }

  // 연결 수 업데이트
  updateConnections(count) {
    this.metrics.connections = count;
  }

  // 성능 메트릭 가져오기
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // 헬스체크 수행
  async healthCheck() {
    const metrics = this.getMetrics();
    const memoryUsage = metrics.memoryUsage;
    
    // 헬스체크 상태 판단
    const isHealthy = 
      memoryUsage.heapUsed < config.memory.maxHeapUsed &&
      (memoryUsage.heapUsed / memoryUsage.heapTotal) < (config.memory.warningThreshold / 100);
    
    return {
      status: isHealthy ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      metrics: metrics,
      checks: {
        memory: {
          status: isHealthy ? 'ok' : 'warning',
          heapUsed: memoryUsage.heapUsed,
          maxAllowed: config.memory.maxHeapUsed
        }
      }
    };
  }

  // 성능 최적화 제안
  getOptimizationSuggestions() {
    const metrics = this.getMetrics();
    const suggestions = [];
    
    // 메모리 사용량 체크
    if (metrics.memoryUsage.heapUsed > config.memory.maxHeapUsed * 0.8) {
      suggestions.push({
        type: 'memory',
        severity: 'high',
        message: '메모리 사용량이 높습니다. 캐시 정리나 가비지 컬렉션을 고려하세요.'
      });
    }
    
    // 에러율 체크
    const errorRate = metrics.errors / Math.max(metrics.requests, 1);
    if (errorRate > 0.05) { // 5% 이상
      suggestions.push({
        type: 'error',
        severity: 'high',
        message: `에러율이 높습니다 (${Math.round(errorRate * 100)}%). 로그를 확인하세요.`
      });
    }
    
    return suggestions;
  }
}

// 싱글톤 인스턴스
const monitor = new PerformanceMonitor();

module.exports = {
  monitor,
  PerformanceMonitor
};