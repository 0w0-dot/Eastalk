const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const webpush = require('web-push');
const multer = require('multer');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // 성능 최적화 설정
  pingInterval: 15000,  // 기본 25초 → 15초로 단축
  pingTimeout: 10000,   // 기본 20초 → 10초로 단축
  // Connection State Recovery 활성화
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2분간 상태 보존
    skipMiddlewares: true
  }
});

// 🎯 Render 최적화 설정
const PORT = process.env.PORT || 3000; // 포트를 3000으로 복원
const isProduction = process.env.NODE_ENV === 'production';

// 🔔 VAPID 키 설정 (Web Push)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BG3zVpPIzzIaAkcJNu8gPIns8VcZXxVR4F0F30_qGPFAhJLtKhcMPEGP9Vh-j8VQxcdRrawnYlLP3i3NfsUzMYc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '65iALnW23Qkhie9XUANTnv7ShJLQ_lkjOLiEQDwdYu0';

// 환경별 VAPID Subject 설정 (Safari 호환성 개선)
function getVapidSubject() {
  const currentEnv = process.env.NODE_ENV || 'development';
  
  switch (currentEnv) {
    case 'production':
      return 'mailto:admin@eastalk.onrender.com'; // 프로덕션 도메인
    case 'staging':
      return 'mailto:admin@eastalk-staging.onrender.com'; // 스테이징 도메인
    default:
      return 'mailto:admin@localhost.dev'; // 로컬 개발용 (Safari 호환)
  }
}

const VAPID_EMAIL = process.env.VAPID_EMAIL || getVapidSubject();

// Web Push 설정
webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

console.log(`🔔 VAPID Subject 설정: ${VAPID_EMAIL}`);

// 🧹 메모리 최적화: 가비지 컬렉션 강화
if (global.gc) {
  console.log('🧹 가비지 컬렉션 시스템 활성화');
  // 20초마다 강제 가비지 컬렉션 실행
  setInterval(() => {
    const used = process.memoryUsage();
    global.gc();
    const afterGC = process.memoryUsage();
    console.log(`🧹 메모리 정리: ${Math.round((used.heapUsed - afterGC.heapUsed) / 1024 / 1024)}MB 회수`);
  }, 20000);
} else {
  console.log('⚠️ 가비지 컬렉션 비활성화 (--expose-gc 플래그 필요)');
}

// 캐시 관리: 임시 데이터 자동 정리
const cache = new Map();
setInterval(() => {
  const size = cache.size;
  cache.clear();
  if (size > 0) {
    console.log(`🧹 캐시 정리: ${size}개 항목 제거`);
  }
}, 300000); // 5분마다

// Render 프록시 신뢰 설정 (Rate Limiter 오류 해결)
app.set('trust proxy', 1);

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false // Render에서 필요
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Render용 Rate limiting (더 관대하게)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: isProduction ? 500 : 1000 // 프로덕션에서는 더 제한적
});
app.use(limiter);

// 정적 파일 제공
app.use(express.static('public'));

// 🔍 API 요청 로깅 미들웨어 (메모리 효율 개선)
app.use('/api', (req, res, next) => {
  const startTime = Date.now();
  
  // 프로덕션에서는 상세 로깅 축소
  if (!isProduction) {
    console.log(`🔍 API 요청: ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('📦 요청 본문:', JSON.stringify(req.body).slice(0, 200) + '...');
    }
  }
  
  // 응답 완료 시 성능 측정
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 1000) { // 1초 이상 걸린 요청만 로깅
      console.log(`⚠️ 느린 API: ${req.method} ${req.path} (${duration}ms)`);
    }
  });
  
  next();
});

// 🚨 글로벌 에러 핸들러 (강화)
app.use((err, req, res, next) => {
  console.error('🚨 서버 오류:', err.stack);
  
  // 메모리 누수 방지를 위한 에러 객체 정리
  const errorResponse = {
    error: isProduction ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString()
  };
  
  res.status(500).json(errorResponse);
});

// Service Worker 파일에 올바른 Content-Type 설정
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// PWA 매니페스트 파일에 올바른 Content-Type 설정
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// 🚀 Render Health Check 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// 데이터베이스 연결 (메모리/MongoDB 지원)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eastalk';
const USE_MEMORY_DB = MONGODB_URI.startsWith('memory://');

// In-Memory 데이터 저장소 (테스트용)
let memoryUsers = new Map();
let memoryMessages = new Map();
let messageCounter = 1;

// 전역 접속자 관리 저장소
let connectedUsers = new Map(); // socketId → userInfo

if (USE_MEMORY_DB) {
  console.log('🧪 테스트 모드: In-Memory 데이터베이스 사용');
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
} else {
  mongoose.connect(MONGODB_URI, {
    maxPoolSize: 2,        // 10 → 2로 대폭 감소 (메모리 절약)
    bufferMaxEntries: 0,   // 버퍼링 비활성화
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000   // 유휴 연결 빠른 해제
  })
  .then(async () => {
    console.log('✅ MongoDB 연결 성공');
    console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
    
    // 인덱스 상태 확인 및 로깅
    try {
      const messageIndexes = await Message.collection.getIndexes();
      console.log('📊 Message 컬렉션 인덱스:', Object.keys(messageIndexes));
    } catch (error) {
      console.log('⚠️ 인덱스 정보 조회 실패 (정상적일 수 있음):', error.message);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB 연결 실패:', err);
    if (isProduction) {
      process.exit(1);
    }
  });
}

// MongoDB 연결 상태 모니터링 (매모리 모드가 아니면)
if (!USE_MEMORY_DB) {
  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB 연결 끊김');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB 재연결됨');
  });
}

// 스키마 정의
const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  nickname: String,
  status: String,
  avatar: String,
  lastSeen: String,
  name: String,
  birth4: String
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  ts: { type: Number, required: true },
  room: { type: String, required: true },
  userId: { type: String, required: true },
  nickname: String,
  text: String,
  kind: { type: String, default: 'text' },
  mediaUrl: String,
  mime: String,
  fileName: String,
  mid: { type: String, required: true },
  reactions: { type: Object, default: {} },
  // 🔗 대댓글/스레드 지원
  replyTo: { type: String, default: null }, // 답글 대상 메시지 ID
  replyToNickname: { type: String, default: null }, // 답글 대상 사용자 닉네임
  replyToText: { type: String, default: null }, // 답글 대상 메시지 내용 미리보기
  thread: { type: String, default: null }   // 스레드 그룹 ID (최상위 메시지 ID)
}, { timestamps: true });

// 성능 최적화 인덱스 생성
MessageSchema.index({ room: 1, ts: -1 }); // 방별 시간순 정렬 (메인 쿼리)
MessageSchema.index({ room: 1, ts: 1 });  // 방별 시간 오름차순 (과거 메시지 조회용)
MessageSchema.index({ mid: 1 }, { unique: true });          // 메시지 ID 조회 (중복 방지용)
MessageSchema.index({ userId: 1, ts: -1 }); // 사용자별 메시지 조회용
// 🔗 스레드/답글 관련 인덱스 추가
MessageSchema.index({ thread: 1, ts: 1 }); // 스레드별 시간순 정렬 (답글 조회용)
MessageSchema.index({ replyTo: 1 });       // 특정 메시지의 답글 조회용

// 🔔 Push 구독 스키마 정의
const PushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: String,
  isActive: { type: Boolean, default: true },
  lastUsed: { type: Date, default: Date.now }
}, { timestamps: true });

// 중복 방지를 위한 인덱스 설정
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

// 데이터베이스 모델 (메모리 모드가 아니면)
let User, Message, PushSubscription;
if (!USE_MEMORY_DB) {
  User = mongoose.model('User', UserSchema);
  Message = mongoose.model('Message', MessageSchema);
  PushSubscription = mongoose.model('PushSubscription', PushSubscriptionSchema);
}

// 상수
const ROOMS = ['주중', '주말', '전체', '방문예정'];
const SCAN_LIMIT = 1000;

// ===== 헬퍼 함수들 =====
const normBirth4 = (x) => {
  if (x == null) return '0000';
  return String(x).replace(/\D/g, '').slice(-4).padStart(4, '0');
};

// ===== 메모리 데이터베이스 헬퍼 함수들 =====
const MemoryDB = {
  // 사용자 관리
  async findUser(query) {
    if (query.id) {
      return memoryUsers.get(query.id) || null;
    }
    if (query.name && query.birth4) {
      for (const [id, user] of memoryUsers) {
        if (user.name === query.name && user.birth4 === query.birth4) {
          return user;
        }
      }
    }
    return null;
  },
  
  async createUser(userData) {
    const id = userData.id || `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const user = { id, ...userData, createdAt: new Date(), updatedAt: new Date() };
    memoryUsers.set(id, user);
    return user;
  },
  
  async updateUser(id, updates) {
    const user = memoryUsers.get(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date() });
      memoryUsers.set(id, user);
      return user;
    }
    return null;
  },
  
  // 메시지 관리
  async findMessages(query) {
    const messages = Array.from(memoryMessages.values());
    if (query.room) {
      return messages.filter(m => m.room === query.room).sort((a, b) => a.ts - b.ts);
    }
    return messages.sort((a, b) => a.ts - b.ts);
  },
  
  async createMessage(messageData) {
    const mid = messageData.mid || `msg_${messageCounter++}`;
    const message = { mid, ...messageData, createdAt: new Date(), updatedAt: new Date() };
    memoryMessages.set(mid, message);
    return message;
  },
  
  async updateMessage(mid, updates) {
    const message = memoryMessages.get(mid);
    if (message) {
      Object.assign(message, updates, { updatedAt: new Date() });
      memoryMessages.set(mid, message);
      return message;
    }
    return null;
  }
};

const nowIso = () => new Date().toISOString();

// ===== 접속자 관리 헬퍼 함수들 =====
const ConnectedUsersManager = {
  // 접속자 추가
  addUser: (socketId, userInfo) => {
    const userData = {
      socketId,
      userId: userInfo.userId,
      nickname: userInfo.nickname || 'User',
      avatar: userInfo.avatar || '',
      status: userInfo.status || '',
      workStatus: userInfo.workStatus || 'offline',  // 업무 상태 추가
      connectedAt: nowIso()
    };
    connectedUsers.set(socketId, userData);
    console.log(`👤 접속자 추가: ${userData.nickname} (${connectedUsers.size}명)`);
    return userData;
  },
  
  // 접속자 제거
  removeUser: (socketId) => {
    const userData = connectedUsers.get(socketId);
    if (userData) {
      connectedUsers.delete(socketId);
      console.log(`👤 접속자 제거: ${userData.nickname} (${connectedUsers.size}명)`);
      return userData;
    }
    return null;
  },
  
  // 접속자 정보 업데이트
  updateUser: (socketId, updates) => {
    const userData = connectedUsers.get(socketId);
    if (userData) {
      Object.assign(userData, updates);
      connectedUsers.set(socketId, userData);
      console.log(`👤 접속자 정보 업데이트: ${userData.nickname}`);
      return userData;
    }
    return null;
  },
  
  // userId로 접속자 찾기
  findByUserId: (userId) => {
    for (const [socketId, userData] of connectedUsers) {
      if (userData.userId === userId) {
        return { socketId, userData };
      }
    }
    return null;
  },
  
  // 전체 접속자 목록 반환
  getAllUsers: () => {
    return Array.from(connectedUsers.values()).map(user => ({
      userId: user.userId,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      workStatus: user.workStatus || 'offline',  // 업무 상태 추가
      connectedAt: user.connectedAt
    }));
  },
  
  // 접속자 수 반환
  getCount: () => connectedUsers.size
};

// 입력 검증 헬퍼
const validateRoom = (room) => ROOMS.includes(room);
const sanitizeText = (text, maxLength = 2000) => {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
};
const isValidUserId = (userId) => {
  return userId && typeof userId === 'string' && userId.length > 0;
};

// ===== 이미지 검증 헬퍼 함수 =====
const validateImageType = (mimeType) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  return allowedTypes.includes(mimeType?.toLowerCase());
};

const isValidBase64Image = (data) => {
  if (!data || typeof data !== 'string') return false;
  return data.startsWith('data:image/') && data.includes('base64,');
};

// API 라우트들

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 프로필 관련 API
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let user;
    
    if (USE_MEMORY_DB) {
      user = await MemoryDB.findUser({ id: userId });
    } else {
      user = await User.findOne({ id: userId });
    }
    
    if (user) {
      res.json({
        id: user.id,
        nickname: user.nickname || '',
        status: user.status || '',
        avatar: user.avatar || '',
        lastSeen: user.lastSeen || ''
      });
    } else {
      res.json({
        id: userId,
        nickname: 'User-' + userId.slice(-5),
        status: '',
        avatar: '',
        lastSeen: ''
      });
    }
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let user;
    if (USE_MEMORY_DB) {
      user = await MemoryDB.findUser({ id: userId });
      if (user) {
        user = await MemoryDB.updateUser(userId, { lastSeen: nowIso() });
      } else {
        user = await MemoryDB.createUser({
          id: userId,
          nickname: 'User-' + userId.slice(-5),
          status: '',
          avatar: '',
          lastSeen: nowIso(),
          name: '',
          birth4: ''
        });
      }
    } else {
      user = await User.findOne({ id: userId });
      if (user) {
        user.lastSeen = nowIso();
        await user.save();
      } else {
        user = new User({
          id: userId,
          nickname: 'User-' + userId.slice(-5),
          status: '',
          avatar: '',
          lastSeen: nowIso(),
          name: '',
          birth4: ''
        });
        await user.save();
      }
    }
    
    res.json({
      id: user.id,
      nickname: user.nickname,
      status: user.status,
      avatar: user.avatar,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('사용자 생성/조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { nickname, status, avatar, clearAvatar } = req.body;
    
    let user;
    const now = nowIso();
    
    // 환경에 따른 데이터베이스 업데이트
    if (USE_MEMORY_DB) {
      user = await MemoryDB.findUser({ id: userId });
      if (user) {
        const prevNick = user.nickname || '';
        const prevStatus = user.status || '';
        
        user.nickname = (nickname && nickname.trim()) || prevNick || ('User-' + userId.slice(-5));
        user.status = (status !== undefined) ? status.trim() : prevStatus;
        
        if (clearAvatar) {
          user.avatar = '';
        } else if (avatar && avatar.trim()) {
          user.avatar = avatar.trim();
        }
        
        user.lastSeen = now;
        user = await MemoryDB.updateUser(userId, user);
      } else {
        user = await MemoryDB.createUser({
          id: userId,
          nickname: (nickname && nickname.trim()) || ('User-' + userId.slice(-5)),
          status: (status !== undefined) ? status.trim() : '',
          avatar: (clearAvatar) ? '' : ((avatar && avatar.trim()) || ''),
          lastSeen: now,
          name: '',
          birth4: ''
        });
      }
    } else {
      user = await User.findOne({ id: userId });
      if (user) {
        const prevNick = user.nickname || '';
        const prevStatus = user.status || '';
        
        user.nickname = (nickname && nickname.trim()) || prevNick || ('User-' + userId.slice(-5));
        user.status = (status !== undefined) ? status.trim() : prevStatus;
        
        if (clearAvatar) {
          user.avatar = '';
        } else if (avatar && avatar.trim()) {
          user.avatar = avatar.trim();
        }
        
        user.lastSeen = now;
        await user.save();
      } else {
        user = new User({
          id: userId,
          nickname: (nickname && nickname.trim()) || ('User-' + userId.slice(-5)),
          status: (status !== undefined) ? status.trim() : '',
          avatar: (clearAvatar) ? '' : ((avatar && avatar.trim()) || ''),
          lastSeen: now,
          name: '',
          birth4: ''
        });
        await user.save();
      }
    }
    
    // 접속자 정보도 업데이트
    ConnectedUsersManager.updateUser(
      ConnectedUsersManager.findByUserId(userId)?.socketId,
      {
        nickname: user.nickname,
        status: user.status,
        avatar: user.avatar
      }
    );
    
    // 다른 클라이언트들에게 프로필 변경 알림 (실시간 동기화)
    io.emit('userProfileUpdated', {
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status
    });
    
    console.log(`🔔 API를 통한 프로필 업데이트 알림 전송: ${user.nickname}`);
    
    res.json({
      id: user.id,
      nickname: user.nickname,
      status: user.status,
      avatar: user.avatar,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('프로필 저장 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 로그인 API =====
app.post('/api/login', async (req, res) => {
  try {
    const { name, birth4 } = req.body;
    
    // 입력 검증 및 정규화
    const nm = sanitizeText(name, 50);
    const b4 = normBirth4(birth4);
    
    // 유효성 검사
    if (!nm || nm.length < 2) {
      return res.status(400).json({ 
        error: '이름은 2자 이상 입력하세요.',
        field: 'name'
      });
    }
    if (b4.length !== 4 || b4 === '0000') {
      return res.status(400).json({ 
        error: '생일 4자리를 정확히 입력하세요.(MMDD)',
        field: 'birth4'
      });
    }
    
    let user;
    if (USE_MEMORY_DB) {
      // 메모리 데이터베이스에서 기존 사용자 찾기
      user = await MemoryDB.findUser({ name: nm, birth4: b4 });
      if (user) {
        user = await MemoryDB.updateUser(user.id, { lastSeen: nowIso() });
      } else {
        const userIdNew = 'uid-' + uuidv4().replace(/-/g, '').slice(-12);
        user = await MemoryDB.createUser({
          id: userIdNew,
          nickname: nm,
          status: '',
          avatar: '',
          lastSeen: nowIso(),
          name: nm,
          birth4: b4
        });
      }
    } else {
      // MongoDB에서 기존 사용자 찾기
      const users = await User.find({
        name: { $regex: new RegExp('^' + nm + '$', 'i') },
        birth4: b4
      }).sort({ lastSeen: -1 });
      
      if (users.length > 0) {
        user = users[0];
        user.lastSeen = nowIso();
        await user.save();
      } else {
        const userIdNew = 'uid-' + uuidv4().replace(/-/g, '').slice(-12);
        user = new User({
          id: userIdNew,
          nickname: nm,
          status: '',
          avatar: '',
          lastSeen: nowIso(),
          name: nm,
          birth4: b4
        });
        await user.save();
      }
    }
    
    res.json({
      id: user.id,
      nickname: user.nickname,
      status: user.status,
      avatar: user.avatar,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 메시지 관련 API =====
app.post('/api/messages', async (req, res) => {
  try {
    const { room, userId, text, mid, replyTo } = req.body;
    
    // 입력 검증
    if (!validateRoom(room)) {
      return res.status(400).json({ 
        error: '잘못된 방 이름입니다.',
        field: 'room'
      });
    }
    
    if (!isValidUserId(userId)) {
      return res.status(400).json({ 
        error: '유효하지 않은 사용자 ID입니다.',
        field: 'userId'
      });
    }
    
    // 중복 메시지 체크
    if (mid) {
      let existingMsg;
      if (USE_MEMORY_DB) {
        existingMsg = memoryMessages.get(mid);
      } else {
        existingMsg = await Message.findOne({ mid });
      }
      
      if (existingMsg) {
        let user;
        if (USE_MEMORY_DB) {
          user = memoryUsers.get(existingMsg.userId);
        } else {
          user = await User.findOne({ id: existingMsg.userId });
        }
        return res.json({
          ...(USE_MEMORY_DB ? existingMsg : existingMsg.toObject()),
          avatar: user ? user.avatar : ''
        });
      }
    }
    
    const cleaned = sanitizeText(text);
    if (!cleaned) {
      return res.status(400).json({ 
        error: '메시지 내용을 입력하세요.',
        field: 'text'
      });
    }
    
    let user;
    if (USE_MEMORY_DB) {
      user = memoryUsers.get(userId);
    } else {
      user = await User.findOne({ id: userId });
    }
    const nickname = user ? user.nickname : ('User-' + userId.slice(-5));
    
    const ts = Date.now();
    
    // 🔗 답글 처리 로직
    let threadId = null;
    let replyToNickname = null;
    let replyToText = null;
    if (replyTo) {
      let parentMessage;
      if (USE_MEMORY_DB) {
        parentMessage = memoryMessages.get(replyTo);
      } else {
        parentMessage = await Message.findOne({ mid: replyTo });
      }
      
      if (parentMessage) {
        // 부모 메시지에 thread가 있으면 사용, 없으면 부모 메시지 ID를 thread로 설정
        threadId = parentMessage.thread || parentMessage.mid;
        // 답글 대상의 닉네임과 텍스트 내용 저장
        replyToNickname = parentMessage.nickname;
        replyToText = parentMessage.text || '파일'; // 텍스트가 없으면 '파일'로 표시
      }
    }
    
    const messageData = {
      ts,
      room,
      userId,
      nickname,
      text: cleaned,
      kind: 'text',
      mediaUrl: '',
      mime: '',
      fileName: '',
      mid: mid || uuidv4(),
      reactions: {},
      replyTo: replyTo || null,
      replyToNickname: replyToNickname,
      replyToText: replyToText,
      thread: threadId
    };
    
    let message;
    if (USE_MEMORY_DB) {
      message = await MemoryDB.createMessage(messageData);
    } else {
      message = new Message(messageData);
      await message.save();
    }
    
    const result = {
      ts: message.ts,
      room: message.room,
      userId: message.userId,
      nickname: message.nickname,
      text: message.text,
      kind: message.kind,
      mid: message.mid,
      avatar: user ? user.avatar : '',
      reactions: message.reactions,
      replyTo: message.replyTo,
      replyToNickname: message.replyToNickname,
      replyToText: message.replyToText,
      thread: message.thread
    };
    
    // Socket.io로 실시간 전송
    io.to(room).emit('newMessage', result);
    
    // 🔔 Push 알림 전송 (비동기)
    sendPushNotifications({
      userId: userId,
      nickname: result.nickname,
      text: result.text,
      room: room,
      mid: result.mid,
      ts: result.ts
    }).catch(error => {
      console.error('Push 알림 전송 오류:', error);
    });
    
    res.json(result);
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const { since, before, limit = '100', page = '1' } = req.query;
    
    if (!ROOMS.includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    
    const limitNum = Math.min(Number(limit), 100); // 최대 100개로 제한
    const pageNum = Math.max(Number(page), 1);
    
    let messages, hasMore = false, oldestTimestamp = null;
    
    if (USE_MEMORY_DB) {
      const allMessages = await MemoryDB.findMessages({ room });
      
      if (since) {
        // 증분 로드 (기존 로직)
        const sinceNum = Number(since);
        messages = allMessages.filter(m => m.ts > sinceNum).slice(-50);
      } else if (before) {
        // 과거 메시지 로드 (무한 스크롤용)
        const beforeNum = Number(before);
        const filteredMessages = allMessages
          .filter(m => m.ts < beforeNum)
          .sort((a, b) => b.ts - a.ts)
          .slice(0, limitNum);
        
        messages = filteredMessages.reverse();
        hasMore = filteredMessages.length === limitNum;
        oldestTimestamp = messages[0]?.ts || null;
      } else {
        // 최초 로드 (최신 메시지)
        const latestMessages = allMessages
          .sort((a, b) => b.ts - a.ts)
          .slice(0, limitNum);
        
        messages = latestMessages.reverse();
        hasMore = allMessages.length > limitNum;
        oldestTimestamp = messages[0]?.ts || null;
      }
    } else {
      let query = { room };
      
      if (since) {
        // 증분 로드 (기존 로직)
        query.ts = { $gt: Number(since) };
        const foundMessages = await Message.find(query)
          .sort({ ts: -1 })
          .limit(SCAN_LIMIT);
        
        messages = foundMessages.reverse().slice(-50);
      } else if (before) {
        // 과거 메시지 로드 (무한 스크롤용)
        query.ts = { $lt: Number(before) };
        const foundMessages = await Message.find(query)
          .sort({ ts: -1 })
          .limit(limitNum);
        
        messages = foundMessages.reverse();
        hasMore = foundMessages.length === limitNum;
        oldestTimestamp = messages[0]?.ts || null;
      } else {
        // 최초 로드 (최신 메시지)
        const foundMessages = await Message.find(query)
          .sort({ ts: -1 })
          .limit(limitNum);
        
        messages = foundMessages.reverse();
        
        // hasMore 계산: limitNum개를 가져왔다면 더 있을 수 있음
        const totalCount = await Message.countDocuments(query);
        hasMore = totalCount > limitNum;
        oldestTimestamp = messages[0]?.ts || null;
      }
    }
    
    // 사용자 정보와 합치기
    const userIds = [...new Set(messages.map(m => m.userId))];
    let users;
    if (USE_MEMORY_DB) {
      users = Array.from(memoryUsers.values()).filter(u => userIds.includes(u.id));
    } else {
      users = await User.find({ id: { $in: userIds } });
    }
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = { nickname: u.nickname, avatar: u.avatar };
    });
    
    const result = messages.map(m => ({
      ts: m.ts,
      room: m.room,
      userId: m.userId,
      nickname: userMap[m.userId] ? userMap[m.userId].nickname : m.nickname,
      text: m.text,
      kind: m.kind,
      mediaUrl: m.mediaUrl,
      mime: m.mime,
      fileName: m.fileName,
      mid: m.mid,
      avatar: userMap[m.userId] ? userMap[m.userId].avatar : '',
      reactions: m.reactions,
      replyTo: m.replyTo,
      replyToNickname: m.replyToNickname,
      replyToText: m.replyToText,
      thread: m.thread
    }));
    
    // 페이징 메타데이터와 함께 응답
    res.json({
      messages: result,
      hasMore: hasMore || false,
      oldestTimestamp: oldestTimestamp
    });
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 특정 메시지 조회 API 
app.get('/api/messages/single/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: '유효하지 않은 메시지 ID입니다.' });
    }
    
    let message;
    if (USE_MEMORY_DB) {
      message = memoryMessages.get(messageId);
      if (!message) {
        return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
      }
    } else {
      message = await Message.findOne({ mid: messageId });
      if (!message) {
        return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
      }
    }
    
    // 사용자 정보 조회
    let user;
    if (USE_MEMORY_DB) {
      user = await MemoryDB.findUser({ id: message.userId });
    } else {
      user = await User.findOne({ id: message.userId });
    }
    
    // 응답 데이터 구성
    const result = {
      ts: message.ts,
      room: message.room,
      userId: message.userId,
      nickname: user ? user.nickname : 'User',
      text: message.text,
      kind: message.kind,
      mediaUrl: message.mediaUrl,
      fileName: message.fileName,
      mid: message.mid,
      avatar: user ? user.avatar : '',
      reactions: message.reactions,
      replyTo: message.replyTo,
      replyToNickname: message.replyToNickname,
      replyToText: message.replyToText,
      thread: message.thread
    };
    
    console.log(`✅ 메시지 조회 성공: ${messageId} → ${result.nickname}`);
    res.json(result);
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 이미지 업로드 API (base64 저장 방식)
app.post('/api/upload', async (req, res) => {
  try {
    const { room, userId, mid, imageData, fileName, mimeType } = req.body;
    
    // 입력 검증 추가
    if (!isValidUserId(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
    }
    
    if (!ROOMS.includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    
    if (!mid || typeof mid !== 'string') {
      return res.status(400).json({ error: '유효하지 않은 메시지 ID입니다.' });
    }
    
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }
    
    // base64 이미지 데이터 검증
    if (!isValidBase64Image(imageData)) {
      return res.status(400).json({ error: '올바른 이미지 형식이 아닙니다.' });
    }
    
    // MIME 타입 검증
    if (mimeType && !validateImageType(mimeType)) {
      return res.status(400).json({ error: '지원하지 않는 이미지 형식입니다.' });
    }
    
    // base64 데이터 크기 검증 (대략 10MB 제한)
    const base64Size = imageData.length * 0.75; // base64는 원본의 약 1.33배
    if (base64Size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: '이미지 크기가 10MB를 초과했습니다.' });
    }
    
    // 중복 메시지 체크
    let existingMsg;
    if (USE_MEMORY_DB) {
      existingMsg = memoryMessages.get(mid);
    } else {
      existingMsg = await Message.findOne({ mid });
    }
    
    if (existingMsg) {
      let user;
      if (USE_MEMORY_DB) {
        user = memoryUsers.get(existingMsg.userId);
      } else {
        user = await User.findOne({ id: existingMsg.userId });
      }
      return res.json({
        ...(USE_MEMORY_DB ? existingMsg : existingMsg.toObject()),
        avatar: user ? user.avatar : ''
      });
    }
    
    let user;
    if (USE_MEMORY_DB) {
      user = memoryUsers.get(userId);
    } else {
      user = await User.findOne({ id: userId });
    }
    const nickname = user ? user.nickname : ('User-' + userId.slice(-5));
    
    const ts = Date.now();
    
    const messageData = {
      ts,
      room,
      userId,
      nickname,
      text: '',
      kind: 'image',
      mediaUrl: imageData, // base64 데이터를 직접 저장
      mime: mimeType || 'image/jpeg',
      fileName: fileName || 'image.jpg',
      mid: mid || uuidv4(),
      reactions: {}
    };
    
    let message;
    if (USE_MEMORY_DB) {
      message = await MemoryDB.createMessage(messageData);
    } else {
      message = new Message(messageData);
      await message.save();
    }
    
    const result = {
      ts: message.ts,
      room: message.room,
      userId: message.userId,
      nickname: message.nickname,
      kind: message.kind,
      mediaUrl: message.mediaUrl,
      mime: message.mime,
      fileName: message.fileName,
      mid: message.mid,
      avatar: user ? user.avatar : '',
      reactions: message.reactions
    };
    
    // Socket.io로 실시간 전송 (성능 최적화: 이미지 메시지는 binary 허용)
    io.to(room).emit('newMessage', result);
    
    // 🔔 Push 알림 전송 (이미지 메시지)
    sendPushNotifications({
      userId: userId,
      nickname: result.nickname,
      text: '📷 이미지를 전송했습니다',
      room: room,
      mid: result.mid,
      ts: result.ts
    }).catch(error => {
      console.error('Push 알림 전송 오류:', error);
    });
    
    res.json(result);
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 프로필 이미지 업로드를 위한 Multer 설정
const storage = multer.memoryStorage();
const profileUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 🔧 Multer 없는 임시 프로필 업로드 엔드포인트 (base64 방식)
console.log('🔧 임시 프로필 이미지 업로드 API 등록 중...');
app.post('/api/profile-upload-temp', async (req, res) => {
  try {
    console.log('📤 임시 프로필 이미지 업로드 요청 받음');
    
    const { userId, imageData } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: '이미지 데이터가 필요합니다.'
      });
    }
    
    // 임시로 성공 응답만 반환
    return res.json({
      success: true,
      url: imageData, // 클라이언트에서 보낸 base64 데이터를 그대로 반환
      message: '임시 업로드 성공 (Multer 대신 base64 처리)'
    });
    
  } catch (error) {
    console.error('❌ 임시 프로필 업로드 오류:', error);
    return res.status(500).json({
      success: false,
      error: '임시 업로드 처리 중 오류가 발생했습니다.'
    });
  }
});

// 프로필 이미지 업로드 API
console.log('🔧 프로필 이미지 업로드 API 라우트 등록 중...');
app.post('/api/profile-upload', profileUpload.single('image'), async (req, res) => {
  try {
    console.log('📤 프로필 이미지 업로드 요청 받음');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '업로드할 파일이 없습니다.' 
      });
    }

    const { userId } = req.body;
    
    // 사용자 ID 검증
    if (!isValidUserId(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 사용자 ID입니다.' 
      });
    }

    // 파일 정보 로그
    console.log('📁 업로드된 파일:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // 이미지를 base64로 변환
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    // 사용자 정보 업데이트 (메모리 DB 또는 MongoDB)
    let user;
    if (USE_MEMORY_DB) {
      user = memoryUsers.get(userId);
      if (user) {
        user.avatar = base64Image;
        user.updatedAt = new Date();
        memoryUsers.set(userId, user);
        console.log(`✅ 메모리 DB에서 사용자 ${userId} 프로필 이미지 업데이트 완료`);
      } else {
        return res.status(404).json({ 
          success: false, 
          error: '사용자를 찾을 수 없습니다.' 
        });
      }
    } else {
      user = await User.findOneAndUpdate(
        { id: userId }, // userId 대신 id 필드 사용
        { 
          avatar: base64Image,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: '사용자를 찾을 수 없습니다.' 
        });
      }
      
      console.log(`✅ MongoDB에서 사용자 ${userId} 프로필 이미지 업데이트 완료`);
    }

    // 접속자 정보도 업데이트
    const connectedUserInfo = ConnectedUsersManager.findByUserId(userId);
    if (connectedUserInfo) {
      ConnectedUsersManager.updateUser(connectedUserInfo.socketId, {
        avatar: user.avatar
      });
    }

    // 성공 응답
    res.json({
      success: true,
      message: '프로필 이미지 업로드가 완료되었습니다.',
      url: base64Image,
      user: {
        userId: user.id || userId,
        nickname: user.nickname,
        avatar: user.avatar,
        status: user.status
      }
    });

    // 다른 클라이언트들에게 프로필 업데이트 알림 (실시간 동기화)
    io.emit('userProfileUpdated', {
      userId: user.id || userId,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status
    });

    console.log(`🔔 프로필 이미지 업데이트 알림 전송: ${user.nickname}`);

  } catch (error) {
    console.error('❌ 프로필 이미지 업로드 오류:', error);
    
    // Multer 에러 처리
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: '파일 크기가 5MB를 초과했습니다.' 
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        error: '한 번에 하나의 파일만 업로드 가능합니다.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: error.message || '프로필 이미지 업로드에 실패했습니다.' 
    });
  }
});

// 반응 토글 API
app.post('/api/reactions', async (req, res) => {
  try {
    const { mid, userId, emoji } = req.body;
    
    // 입력 검증 추가
    if (!isValidUserId(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
    }
    
    if (!mid || typeof mid !== 'string') {
      return res.status(400).json({ error: '유효하지 않은 메시지 ID입니다.' });
    }
    
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: '유효하지 않은 이모지입니다.' });
    }
    
    let message;
    if (USE_MEMORY_DB) {
      message = memoryMessages.get(mid);
      if (!message) {
        return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
      }
    } else {
      message = await Message.findOne({ mid });
      if (!message) {
        return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
      }
    }
    
    const reactions = message.reactions || {};
    const arr = reactions[emoji] || [];
    const idx = arr.indexOf(userId);
    
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(userId);
    }
    
    reactions[emoji] = arr;
    message.reactions = reactions;
    
    if (USE_MEMORY_DB) {
      memoryMessages.set(mid, message);
    } else {
      await message.save();
    }
    
    let user;
    if (USE_MEMORY_DB) {
      user = memoryUsers.get(message.userId);
    } else {
      user = await User.findOne({ id: message.userId });
    }
    
    const result = {
      ts: message.ts,
      room: message.room,
      userId: message.userId,
      nickname: message.nickname,
      text: message.text,
      kind: message.kind,
      mediaUrl: message.mediaUrl,
      mime: message.mime,
      fileName: message.fileName,
      mid: message.mid,
      avatar: user ? user.avatar : '',
      reactions: message.reactions
    };
    
    // Socket.io로 실시간 전송
    io.to(message.room).emit('reactionUpdate', result);
    
    res.json(result);
  } catch (error) {
    console.error('반응 토글 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ping API (헬스체크)
app.get('/api/ping', (req, res) => {
  res.json({ 
    message: 'pong', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ===== Socket.IO 연결 처리 =====
io.on('connection', (socket) => {
  console.log('👤 사용자 연결:', socket.id);
  
  // 사용자 로그인 처리 (접속자 목록에 추가)
  socket.on('userLogin', async (data) => {
    try {
      const { userId } = data;
      if (!userId) return;
      
      // 기존 연결이 있는지 확인
      const existingConnection = ConnectedUsersManager.findByUserId(userId);
      if (existingConnection) {
        // 기존 소켓 연결 해제
        const existingSocket = io.sockets.sockets.get(existingConnection.socketId);
        if (existingSocket) {
          existingSocket.disconnect();
        }
        ConnectedUsersManager.removeUser(existingConnection.socketId);
      }
      
      // 사용자 정보 가져오기
      let user;
      if (USE_MEMORY_DB) {
        user = memoryUsers.get(userId);
      } else {
        user = await User.findOne({ id: userId });
      }
      
      if (user) {
        // 접속자 목록에 추가
        const userData = ConnectedUsersManager.addUser(socket.id, {
          userId: user.id,
          nickname: user.nickname || 'User',
          avatar: user.avatar || '',
          status: user.status || '',
          workStatus: user.workStatus || 'offline'  // 업무 상태 추가
        });
        
        // 전체에게 새 접속자 알림
        io.emit('userConnected', {
          userId: userData.userId,
          nickname: userData.nickname,
          avatar: userData.avatar,
          status: userData.status,
          workStatus: userData.workStatus  // 업무 상태 추가
        });
        
        // 현재 접속자 목록 전송
        socket.emit('connectedUsersList', {
          users: ConnectedUsersManager.getAllUsers(),
          count: ConnectedUsersManager.getCount()
        });
      }
    } catch (error) {
      console.error('사용자 로그인 처리 오류:', error);
    }
  });
  
  // 프로필 편집 저장 처리
  socket.on('updateProfile', async (data) => {
    try {
      const { userId, nickname, status, avatar } = data;
      console.log(`📝 프로필 업데이트 요청: ${userId}`, { nickname, status, avatar: avatar ? 'avatar updated' : 'no avatar' });
      
      if (!userId) {
        socket.emit('profileUpdateResponse', { 
          success: false, 
          error: '사용자 ID가 필요합니다.' 
        });
        return;
      }

      let user;
      
      // 환경에 따른 데이터베이스 업데이트
      if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
        // 메모리 DB 사용 (로컬 개발 환경)
        user = memoryUsers.get(userId);
        if (user) {
          if (nickname) user.nickname = nickname;
          if (status) user.status = status;
          if (avatar) user.avatar = avatar;
          user.updatedAt = new Date();
          memoryUsers.set(userId, user);
          console.log(`✅ 메모리 DB에서 사용자 ${userId} 프로필 업데이트 완료`);
        } else {
          socket.emit('profileUpdateResponse', { 
            success: false, 
            error: '사용자를 찾을 수 없습니다.' 
          });
          return;
        }
      } else {
        // MongoDB 사용
        const updateData = {};
        if (nickname) updateData.nickname = nickname;
        if (status) updateData.status = status;
        if (avatar) updateData.avatar = avatar;
        updateData.updatedAt = new Date();
        
        user = await User.findOneAndUpdate(
          { id: userId },
          updateData,
          { new: true }
        );
        
        if (!user) {
          socket.emit('profileUpdateResponse', { 
            success: false, 
            error: '사용자를 찾을 수 없습니다.' 
          });
          return;
        }
        
        console.log(`✅ MongoDB에서 사용자 ${userId} 프로필 업데이트 완료`);
      }
      
      // 접속자 정보도 업데이트
      const updatedUser = ConnectedUsersManager.updateUser(socket.id, {
        nickname: user.nickname,
        status: user.status,
        avatar: user.avatar
      });
      
      // 성공 응답 전송
      socket.emit('profileUpdateResponse', {
        success: true,
        message: '프로필이 성공적으로 업데이트되었습니다.',
        user: {
          userId: user.id || user.userId || userId,
          nickname: user.nickname,
          status: user.status,
          avatar: user.avatar
        }
      });
      
      // 다른 클라이언트들에게 프로필 변경 알림 (본인 제외)
      socket.broadcast.emit('userProfileUpdated', {
        userId: user.id || user.userId || userId,
        nickname: user.nickname,
        avatar: user.avatar,
        status: user.status
      });
      
      console.log('🔔 다른 클라이언트들에게 프로필 업데이트 알림 전송');
      
    } catch (error) {
      console.error('❌ 프로필 업데이트 오류:', error);
      socket.emit('profileUpdateResponse', { 
        success: false, 
        error: '프로필 업데이트 중 오류가 발생했습니다.' 
      });
    }
  });
  
  // 업무 상태 변경 처리
  socket.on('updateWorkStatus', async (data) => {
    try {
      const { status, timestamp } = data;
      console.log(`🔄 업무 상태 변경 요청: ${status}`);
      
      // 접속자 정보에서 현재 사용자 찾기
      const userData = connectedUsers.get(socket.id);
      if (!userData) {
        console.warn('❌ 접속자 정보를 찾을 수 없습니다:', socket.id);
        return;
      }
      
      const userId = userData.userId;
      
      // 데이터베이스 업데이트 (workStatus 필드에 업무 상태 저장, status는 프로필 상태메시지용)
      let user;
      if (USE_MEMORY_DB) {
        user = await MemoryDB.findUser({ id: userId });
        if (user) {
          user = await MemoryDB.updateUser(userId, { 
            workStatus: status,
            lastSeen: nowIso()
          });
        }
      } else {
        user = await User.findOneAndUpdate(
          { id: userId },
          { 
            workStatus: status,
            lastSeen: nowIso()
          },
          { new: true }
        );
      }
      
      if (user) {
        // 접속자 정보도 업데이트 (workStatus 필드로 업무 상태 저장)
        ConnectedUsersManager.updateUser(socket.id, {
          workStatus: status
        });
        
        // 다른 모든 클라이언트에게 업무 상태 변경 알림
        socket.broadcast.emit('userWorkStatusUpdated', {
          userId: userId,
          status: status,
          nickname: user.nickname,
          timestamp: timestamp
        });
        
        console.log(`✅ 업무 상태 변경 완료: ${user.nickname} → ${status}`);
      } else {
        console.warn('❌ 사용자를 찾을 수 없습니다:', userId);
      }
      
    } catch (error) {
      console.error('❌ 업무 상태 변경 처리 오류:', error);
    }
  });
  
  // 사용자 프로필 업데이트 처리
  socket.on('userProfileUpdated', (data) => {
    try {
      const { userId, nickname, avatar, status } = data;
      
      // 접속자 정보 업데이트
      const updatedUser = ConnectedUsersManager.updateUser(socket.id, {
        nickname: nickname || 'User',
        avatar: avatar || '',
        status: status || ''
      });
      
      if (updatedUser) {
        // 전체에게 프로필 변경 알림
        io.emit('userProfileUpdated', {
          userId: updatedUser.userId,
          nickname: updatedUser.nickname,
          avatar: updatedUser.avatar,
          status: updatedUser.status
        });
      }
    } catch (error) {
      console.error('프로필 업데이트 처리 오류:', error);
    }
  });
  
  // 방 입장 처리
  socket.on('joinRoom', (room) => {
    try {
      if (!validateRoom(room)) {
        socket.emit('error', { message: '잘못된 방 이름입니다.' });
        return;
      }
      
      socket.join(room);
      console.log(`📱 ${socket.id} -> ${room} 방 입장`);
    } catch (error) {
      console.error('방 입장 오류:', error);
      socket.emit('error', { message: '방 입장에 실패했습니다.' });
    }
  });
  
  // 방 퇴장 처리
  socket.on('leaveRoom', (room) => {
    try {
      socket.leave(room);
      console.log(`📱 ${socket.id} <- ${room} 방 퇴장`);
    } catch (error) {
      console.error('방 퇴장 오류:', error);
    }
  });
  
  // 연결 해제 처리
  // 클라이언트 heartbeat 처리 (지능형 Keep-Alive 지원)
  socket.on('client-heartbeat', (data, callback) => {
    const currentTime = Date.now();
    const clientTime = data.timestamp;
    const networkLatency = currentTime - clientTime;
    
    // 응답 콜백 (클라이언트가 지연시간 측정용)
    if (typeof callback === 'function') {
      callback({
        serverTime: currentTime,
        clientTime: clientTime,
        latency: networkLatency
      });
    }
    
    console.log(`💓 클라이언트 Heartbeat 수신: ${socket.id} (지연: ${networkLatency}ms)`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`👤 사용자 연결 해제: ${socket.id} (${reason})`);
    
    // 접속자 목록에서 제거
    const removedUser = ConnectedUsersManager.removeUser(socket.id);
    if (removedUser) {
      // 전체에게 접속 해제 알림
      io.emit('userDisconnected', {
        userId: removedUser.userId,
        nickname: removedUser.nickname
      });
    }
  });
  
  // 에러 처리
  socket.on('error', (error) => {
    console.error('Socket 에러:', error);
  });
});

// ===== 에러 핸들러 =====
app.use((error, req, res, next) => {
  // 에러 로깅 개선
  console.error('서버 에러:', {
    message: error.message,
    stack: isProduction ? null : error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  
  // 일반 에러 처리
  const statusCode = error.status || error.statusCode || 500;
  res.status(statusCode).json({ 
    error: isProduction 
      ? '서버 오류가 발생했습니다.' 
      : error.message,
    code: error.code || 'INTERNAL_ERROR',
    ...(isProduction ? {} : { stack: error.stack })
  });
});

// 404 처리
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ===== 지능형 Keep-Alive 시스템 (접속자 기반 Sleep 방지) =====
function initSmartKeepAliveSystem() {
  // 환경별 서버 URL 자동 감지
  const getServerURL = () => {
    // 환경 변수로 직접 지정된 경우 우선 사용
    if (process.env.KEEP_ALIVE_URL) {
      console.log(`🔧 Keep-Alive URL (환경변수): ${process.env.KEEP_ALIVE_URL}`);
      return process.env.KEEP_ALIVE_URL;
    }
    
    // Render 환경 변수에서 현재 서비스 URL 가져오기 (가장 정확)
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`🔧 Keep-Alive URL (Render): ${process.env.RENDER_EXTERNAL_URL}`);
      return process.env.RENDER_EXTERNAL_URL;
    }
    
    // NODE_ENV에 따른 기본 URL 설정
    if (process.env.NODE_ENV === 'staging') {
      const url = 'https://eastalk-staging.onrender.com';
      console.log(`🔧 Keep-Alive URL (Staging): ${url}`);
      return url;
    } else if (process.env.NODE_ENV === 'production') {
      const url = 'https://eastalk.onrender.com';
      console.log(`🔧 Keep-Alive URL (Production): ${url}`);
      return url;
    }
    
    // 개발 환경 (로컬)
    const url = `http://localhost:${PORT}`;
    console.log(`🔧 Keep-Alive URL (Development): ${url}`);
    return url;
  };

  const KEEP_ALIVE_URL = getServerURL();
  
  console.log('🧠 지능형 Keep-Alive 시스템 활성화');
  console.log(`🎯 Target URL: ${KEEP_ALIVE_URL}/health`);
  console.log('💡 전략: 접속자 있음 → Socket.IO 자연 유지, 접속자 없음 → 선택적 백업');
  
  // 지능형 Keep-Alive 로직 (접속자 기반)
  const smartKeepAliveJob = cron.schedule('*/14 * * * *', async () => {
    const connectedCount = ConnectedUsersManager.getCount();
    const currentTime = new Date().toISOString();
    
    console.log(`🔍 Keep-Alive 체크: 현재 접속자 ${connectedCount}명 (${currentTime})`);
    
    // 💡 지능형 전략: 접속자가 있으면 Socket.IO가 자연스럽게 Keep-Alive 역할
    if (connectedCount > 0) {
      console.log('✨ 접속자 존재 → Socket.IO 연결이 자연적으로 Sleep 방지');
      console.log('🛡️ 백업 ping은 생략하여 리소스 절약');
      
      // 통계만 업데이트 (실제 ping 없이)
      keepAliveStats.totalAttempts++;
      keepAliveStats.successCount++;
      keepAliveStats.consecutiveFailures = 0;
      keepAliveStats.lastSuccess = currentTime;
      keepAliveStats.lastPingTime = currentTime;
      
      return; // 실제 ping 실행하지 않음
    }
    
    // 접속자가 없을 때만 백업 ping 실행
    console.log('😴 접속자 없음 → 백업 Keep-Alive ping 실행');
    
    try {
      const fetch = (await import('node-fetch')).default;
      const start = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      const response = await fetch(`${KEEP_ALIVE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Eastalk-KeepAlive/1.0',
          'X-Keep-Alive': 'true',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 백업 Keep-Alive 성공: ${response.status} (${duration}ms) - Environment: ${data.environment || 'unknown'}`);
        updateKeepAliveStats(true, duration);
      } else {
        console.log(`⚠️ 백업 Keep-Alive 경고: ${response.status} (${duration}ms) - Response not OK`);
        updateKeepAliveStats(false, duration);
      }
      
    } catch (error) {
      const errorType = error.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
      console.log(`❌ 백업 Keep-Alive 실패 (${errorType}): ${error.message} - ${new Date().toISOString()}`);
      updateKeepAliveStats(false, 0);
      
      // 연속 실패 시 경고 (접속자 없을 때만 중요함)
      if (keepAliveStats.consecutiveFailures >= 3) {
        console.log('⚠️ Keep-Alive 연속 실패 감지, 다음 시도에서 재초기화');
      }
    }
  });
  
  // 서버 시작 후 5분 뒤부터 시작 (초기화 시간 확보)
  setTimeout(() => {
    smartKeepAliveJob.start();
    console.log('🚀 지능형 Keep-Alive 스케줄러 시작됨 (14분 간격)');
    console.log('💡 Socket.IO ping 간격: 25초, 타임아웃: 20초 (자동 연결 유지)');
  }, 5 * 60 * 1000); // 5분 지연
}

// Keep-Alive 통계 관리
let keepAliveStats = {
  totalAttempts: 0,
  successCount: 0,
  failureCount: 0,
  consecutiveFailures: 0,
  lastSuccess: null,
  lastFailure: null,
  averageResponseTime: 0,
  maxResponseTime: 0,
  minResponseTime: 0,
  uptimeStart: Date.now(),
  lastPingTime: null
};

function updateKeepAliveStats(success, responseTime) {
  keepAliveStats.totalAttempts++;
  keepAliveStats.lastPingTime = new Date().toISOString();
  
  if (success) {
    keepAliveStats.successCount++;
    keepAliveStats.consecutiveFailures = 0; // 연속 실패 초기화
    keepAliveStats.lastSuccess = new Date().toISOString();
    
    // 응답 시간 통계 업데이트
    if (responseTime > 0) {
      if (keepAliveStats.averageResponseTime === 0) {
        keepAliveStats.averageResponseTime = responseTime;
        keepAliveStats.minResponseTime = responseTime;
        keepAliveStats.maxResponseTime = responseTime;
      } else {
        // 이동 평균 계산
        keepAliveStats.averageResponseTime = Math.round((keepAliveStats.averageResponseTime * 0.8) + (responseTime * 0.2));
        keepAliveStats.minResponseTime = Math.min(keepAliveStats.minResponseTime, responseTime);
        keepAliveStats.maxResponseTime = Math.max(keepAliveStats.maxResponseTime, responseTime);
      }
    }
  } else {
    keepAliveStats.failureCount++;
    keepAliveStats.consecutiveFailures++;
    keepAliveStats.lastFailure = new Date().toISOString();
  }
}

// 지능형 Keep-Alive 통계 조회 API
app.get('/api/keepalive-stats', (req, res) => {
  const uptime = Math.floor((Date.now() - keepAliveStats.uptimeStart) / 1000);
  const successRate = keepAliveStats.totalAttempts > 0 
    ? Math.round((keepAliveStats.successCount / keepAliveStats.totalAttempts) * 100)
    : 0;
  
  // 현재 접속자 수 추가
  const connectedCount = ConnectedUsersManager.getCount();
  
  // 상태 결정 로직 개선
  let healthStatus = 'healthy';
  if (keepAliveStats.consecutiveFailures >= 3) {
    healthStatus = 'critical';
  } else if (successRate < 80) {
    healthStatus = 'degraded';
  } else if (keepAliveStats.failureCount > 0) {
    healthStatus = 'warning';
  }
  
  res.json({
    // 기본 통계
    totalAttempts: keepAliveStats.totalAttempts,
    successCount: keepAliveStats.successCount,
    failureCount: keepAliveStats.failureCount,
    consecutiveFailures: keepAliveStats.consecutiveFailures,
    
    // 시간 정보
    lastSuccess: keepAliveStats.lastSuccess,
    lastFailure: keepAliveStats.lastFailure,
    lastPingTime: keepAliveStats.lastPingTime,
    uptimeSeconds: uptime,
    uptimeDuration: formatDuration(uptime),
    
    // 성능 통계
    averageResponseTime: keepAliveStats.averageResponseTime,
    minResponseTime: keepAliveStats.minResponseTime,
    maxResponseTime: keepAliveStats.maxResponseTime,
    
    // 상태 정보
    successRate: `${successRate}%`,
    status: healthStatus,
    
    // 🧠 지능형 Keep-Alive 시스템 정보
    intelligentSystem: {
      connectedUsers: connectedCount,
      strategy: connectedCount > 0 ? 'Socket.IO 자연 유지' : '백업 ping 활성',
      nextCheck: '14분 간격',
      socketIOPing: '25초 간격 (자동)',
      resourceSaving: connectedCount > 0 ? '활성' : '대기'
    },
    
    // 환경 정보
    environment: process.env.NODE_ENV || 'development',
    keepAliveEnabled: isProduction || process.env.NODE_ENV === 'staging'
  });
});

// 시간 포맷팅 헬퍼
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// 🚨 404 오류 처리 미들웨어 (모든 라우트 뒤에 위치)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.error(`❌ 404 오류 - API 엔드포인트를 찾을 수 없음: ${req.method} ${req.path}`);
    console.error('📋 사용 가능한 API:', [
      'POST /api/profile-upload',
      'POST /api/upload', 
      'GET /api/messages/single/:messageId'
    ]);
    return res.status(404).json({ 
      success: false, 
      error: `API 엔드포인트를 찾을 수 없습니다: ${req.method} ${req.path}` 
    });
  }
  next();
});

// 🚀 Render 최적화된 서버 시작
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Eastalk 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB: ${MONGODB_URI ? '연결됨' : '로컬 사용'}`);
  console.log(`⏰ 시작 시간: ${new Date().toISOString()}`);
  console.log('📋 등록된 API 라우트:');
  console.log('  - POST /api/profile-upload (프로필 이미지 업로드)');
  console.log('  - POST /api/upload (메시지 이미지 업로드)');
  console.log('  - GET /api/messages/single/:messageId (단일 메시지 조회)');
  
  // 😴 Keep-Alive 시스템 초기화 (Sleep 방지)
  const shouldUseKeepAlive = isProduction || process.env.NODE_ENV === 'staging';
  if (shouldUseKeepAlive) {
    initSmartKeepAliveSystem();
  } else {
    console.log('🧪 개발 모드: Keep-Alive 시스템 비활성화');
  }
});

// 🛡️ Graceful shutdown for Render
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM 받음, 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버 종료 완료');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB 연결 종료');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT 받음, 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버 종료 완료');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB 연결 종료');
      process.exit(0);
    });
  });
});

// 🔔 Push 구독 저장 API
app.post('/api/push-subscribe', async (req, res) => {
  try {
    const { subscription, userId, userAgent } = req.body;

    // 입력 검증
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: '구독 정보가 올바르지 않습니다' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: '사용자 ID가 필요합니다' });
    }

    console.log(`🔔 Push 구독 저장 요청 - 사용자: ${userId}`);

    if (!USE_MEMORY_DB) {
      // MongoDB에 구독 정보 저장 (중복 시 업데이트)
      await PushSubscription.findOneAndUpdate(
        { 
          userId: userId,
          endpoint: subscription.endpoint 
        },
        {
          userId: userId,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          },
          userAgent: userAgent || 'Unknown',
          isActive: true,
          lastUsed: new Date()
        },
        { 
          upsert: true, 
          new: true 
        }
      );

      console.log(`✅ Push 구독 저장됨 - 사용자: ${userId}`);
    } else {
      // 메모리 모드에서는 간단히 로그만
      console.log(`📋 메모리 모드 - Push 구독 기록: ${userId}`);
    }

    res.json({ 
      success: true, 
      message: 'Push 구독이 저장되었습니다' 
    });

  } catch (error) {
    console.error('❌ Push 구독 저장 오류:', error);
    
    if (error.code === 11000) {
      // 중복 키 오류 - 이미 존재하는 구독
      res.json({ 
        success: true, 
        message: '이미 구독된 사용자입니다' 
      });
    } else {
      res.status(500).json({ 
        error: 'Push 구독 저장 실패',
        details: error.message 
      });
    }
  }
});

// 🔔 Push 구독 해제 API
app.post('/api/push-unsubscribe', async (req, res) => {
  try {
    const { userId, endpoint } = req.body;

    if (!userId || !endpoint) {
      return res.status(400).json({ error: '사용자 ID와 endpoint가 필요합니다' });
    }

    if (!USE_MEMORY_DB) {
      await PushSubscription.findOneAndUpdate(
        { userId: userId, endpoint: endpoint },
        { isActive: false },
        { new: true }
      );
    }

    console.log(`🔕 Push 구독 해제됨 - 사용자: ${userId}`);
    res.json({ 
      success: true, 
      message: 'Push 구독이 해제되었습니다' 
    });

  } catch (error) {
    console.error('❌ Push 구독 해제 오류:', error);
    res.status(500).json({ 
      error: 'Push 구독 해제 실패',
      details: error.message 
    });
  }
});

// 🔔 Push 알림 전송 함수
async function sendPushNotifications(messageData) {
  if (USE_MEMORY_DB) {
    console.log('📋 메모리 모드 - Push 알림 전송 스킵');
    return;
  }

  try {
    // 해당 방의 모든 활성 구독자 조회 (메시지 발송자 제외)
    const subscriptions = await PushSubscription.find({
      isActive: true
    }).select('userId endpoint keys userAgent');

    if (subscriptions.length === 0) {
      console.log('📭 Push 구독자가 없습니다');
      return;
    }

    console.log(`📤 ${subscriptions.length}명에게 Push 알림 전송 중...`);

    const pushPromises = subscriptions.map(async (sub) => {
      // 자신에게는 푸시 알림을 보내지 않음
      if (sub.userId === messageData.userId) {
        return null;
      }

      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        };

        const payload = JSON.stringify({
          title: 'Eastalk',
          body: messageData.text || '새 메시지',
          sender: messageData.nickname,
          room: messageData.room,
          messageId: messageData.mid,
          timestamp: messageData.ts
        });

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`✅ Push 전송 성공 - 사용자: ${sub.userId}`);

        // 마지막 사용 시간 업데이트
        await PushSubscription.findByIdAndUpdate(sub._id, {
          lastUsed: new Date()
        });

        return { success: true, userId: sub.userId };

      } catch (error) {
        console.error(`❌ Push 전송 실패 - 사용자: ${sub.userId}:`, error);

        // 410 Gone - 구독이 더 이상 유효하지 않음
        if (error.statusCode === 410) {
          console.log(`🗑️ 만료된 구독 제거 - 사용자: ${sub.userId}`);
          await PushSubscription.findByIdAndUpdate(sub._id, {
            isActive: false
          });
        }

        return { success: false, userId: sub.userId, error: error.message };
      }
    });

    const results = await Promise.all(pushPromises);
    const successful = results.filter(r => r && r.success).length;
    const failed = results.filter(r => r && !r.success).length;

    console.log(`📊 Push 전송 결과: 성공 ${successful}개, 실패 ${failed}개`);

  } catch (error) {
    console.error('❌ Push 알림 전송 오류:', error);
  }
}

// 🔍 Render 배포 상태 체크 엔드포인트
app.get('/api/status', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      server: 'running',
      database: dbStates[dbStatus],
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      server: 'error',
      error: error.message
    });
  }
});

module.exports = app;