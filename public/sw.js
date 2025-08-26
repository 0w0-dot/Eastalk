// 🔔 Eastalk Service Worker - 모바일 푸시 알림용
// Version: 1.0

console.log('🚀 Service Worker 시작됨');

// 푸시 이벤트 처리
self.addEventListener('push', function(event) {
  console.log('📨 Push 이벤트 수신됨:', event);

  let notificationData = {
    title: 'Eastalk',
    body: '새 메시지가 있습니다',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'eastalk-message',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: '열기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };

  // 푸시 데이터 파싱
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('📋 Push 데이터 파싱됨:', pushData);
      
      notificationData.title = pushData.title || 'Eastalk';
      notificationData.body = pushData.body || pushData.message || '새 메시지가 있습니다';
      
      if (pushData.sender) {
        notificationData.body = `${pushData.sender}: ${notificationData.body}`;
      }
      
      if (pushData.room) {
        notificationData.data = {
          room: pushData.room,
          messageId: pushData.messageId,
          sender: pushData.sender
        };
      }
    } catch (error) {
      console.error('❌ Push 데이터 파싱 오류:', error);
      notificationData.body = event.data.text();
    }
  }

  // 알림 표시
  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data,
      vibrate: [200, 100, 200], // 진동 패턴 (모바일)
      timestamp: Date.now()
    }
  );

  event.waitUntil(notificationPromise);
  console.log('✅ 알림 표시 완료');
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ 알림 클릭됨:', event.notification.tag);
  console.log('📋 알림 데이터:', event.notification.data);

  // 알림 닫기
  event.notification.close();

  if (event.action === 'close') {
    console.log('❌ 사용자가 알림을 닫았습니다');
    return;
  }

  // 앱 창 열기 또는 포커스
  const urlToOpen = new URL('/', self.location.origin).href;
  
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(windowClients => {
    let matchingClient = null;

    // 이미 열린 Eastalk 탭 찾기
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes(self.location.origin)) {
        matchingClient = windowClient;
        break;
      }
    }

    // 이미 열린 탭이 있으면 포커스
    if (matchingClient) {
      console.log('🎯 기존 탭으로 포커스 이동');
      return matchingClient.focus();
    } else {
      // 새 탭 열기
      console.log('🆕 새 탭 열기');
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Service Worker 설치 이벤트
self.addEventListener('install', function(event) {
  console.log('⚡ Service Worker 설치됨');
  // 즉시 활성화
  self.skipWaiting();
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', function(event) {
  console.log('🔥 Service Worker 활성화됨');
  // 모든 클라이언트에서 즉시 제어
  event.waitUntil(self.clients.claim());
});

// Background Sync (선택사항 - 나중에 오프라인 메시지 지원시 사용)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background Sync 실행');
    // 나중에 오프라인 메시지 처리 로직 추가 가능
  }
});

console.log('✅ Service Worker 로드 완료');