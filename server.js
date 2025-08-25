const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🎯 Render 최적화 설정
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

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
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB 연결 성공');
    console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
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
  mid: { type: String, unique: true, required: true },
  reactions: { type: Object, default: {} }
}, { timestamps: true });

// 데이터베이스 모델 (메모리 모드가 아니면)
let User, Message;
if (!USE_MEMORY_DB) {
  User = mongoose.model('User', UserSchema);
  Message = mongoose.model('Message', MessageSchema);
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
    
    let user = await User.findOne({ id: userId });
    const now = nowIso();
    
    if (user) {
      const prevNick = user.nickname || '';
      const prevStatus = user.status || '';
      const prevAvatar = user.avatar || '';
      
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
    const { room, userId, text, mid } = req.body;
    
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
      text: message.text,
      kind: message.kind,
      mid: message.mid,
      avatar: user ? user.avatar : '',
      reactions: message.reactions
    };
    
    // Socket.io로 실시간 전송
    io.to(room).emit('newMessage', result);
    
    res.json(result);
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const { since } = req.query;
    
    if (!ROOMS.includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    
    let messages;
    if (USE_MEMORY_DB) {
      const allMessages = await MemoryDB.findMessages({ room });
      const sinceNum = since ? Number(since) : 0;
      messages = allMessages.filter(m => m.ts > sinceNum).slice(-50);
    } else {
      let query = { room };
      if (since) {
        query.ts = { $gt: Number(since) };
      }
      
      const foundMessages = await Message.find(query)
        .sort({ ts: -1 })
        .limit(SCAN_LIMIT);
      
      // 최근 50개만 가져오기
      messages = foundMessages.reverse().slice(-50);
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
      reactions: m.reactions
    }));
    
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
    
    // Socket.io로 실시간 전송
    io.to(room).emit('newMessage', result);
    
    res.json(result);
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: error.message });
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
          status: user.status || ''
        });
        
        // 전체에게 새 접속자 알림
        io.emit('userConnected', {
          userId: userData.userId,
          nickname: userData.nickname,
          avatar: userData.avatar,
          status: userData.status
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

// 🚀 Render 최적화된 서버 시작
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Eastalk 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB: ${MONGODB_URI ? '연결됨' : '로컬 사용'}`);
  console.log(`⏰ 시작 시간: ${new Date().toISOString()}`);
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