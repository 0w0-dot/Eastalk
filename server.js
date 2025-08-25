const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

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
app.use('/uploads', express.static('uploads'));

// 🚀 Render Health Check 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// MongoDB 연결 (Render 최적화)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eastalk';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // 연결 풀 최적화
  serverSelectionTimeoutMS: 5000, // 빠른 타임아웃
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB 연결 성공');
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
})
.catch(err => {
  console.error('❌ MongoDB 연결 실패:', err);
  // Render에서 재시작하도록 프로세스 종료
  if (isProduction) {
    process.exit(1);
  }
});

// MongoDB 연결 상태 모니터링
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB 연결 끊김');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB 재연결됨');
});

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

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// 상수
const ROOMS = ['주중', '주말', '전체', '방문예정'];
const SCAN_LIMIT = 1000;

// 헬퍼 함수들
const normBirth4 = (x) => String(x == null ? '' : x).replace(/\D/g, '').slice(-4).padStart(4, '0');
const nowIso = () => new Date().toISOString();

// 🎨 Render용 업로드 설정 (임시 디렉토리 사용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// API 라우트들

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 프로필 관련 API
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ id: userId });
    
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
    
    let user = await User.findOne({ id: userId });
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

// 로그인 API
app.post('/api/login', async (req, res) => {
  try {
    const { name, birth4 } = req.body;
    const nm = String(name || '').trim();
    const b4 = normBirth4(birth4);
    
    if (!nm) {
      return res.status(400).json({ error: '이름을 입력하세요.' });
    }
    if (b4.length !== 4) {
      return res.status(400).json({ error: '생일 4자리를 정확히 입력하세요.(MMDD)' });
    }
    
    // 기존 사용자 찾기
    const users = await User.find({
      name: { $regex: new RegExp('^' + nm + '$', 'i') },
      birth4: b4
    }).sort({ lastSeen: -1 });
    
    let user;
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

// 메시지 관련 API
app.post('/api/messages', async (req, res) => {
  try {
    const { room, userId, text, mid } = req.body;
    
    if (!ROOMS.includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    
    // 중복 메시지 체크
    const existingMsg = await Message.findOne({ mid });
    if (existingMsg) {
      const user = await User.findOne({ id: existingMsg.userId });
      return res.json({
        ...existingMsg.toObject(),
        avatar: user ? user.avatar : ''
      });
    }
    
    const cleaned = String(text || '').trim().slice(0, 2000);
    if (!cleaned) {
      return res.status(400).json({ error: '빈 메시지' });
    }
    
    const user = await User.findOne({ id: userId });
    const nickname = user ? user.nickname : ('User-' + userId.slice(-5));
    
    const ts = Date.now();
    const message = new Message({
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
    });
    
    await message.save();
    
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
    
    let query = { room };
    if (since) {
      query.ts = { $gt: Number(since) };
    }
    
    const messages = await Message.find(query)
      .sort({ ts: -1 })
      .limit(SCAN_LIMIT);
    
    // 최근 50개만 가져오기
    const recentMessages = messages.reverse().slice(-50);
    
    // 사용자 정보와 합치기
    const userIds = [...new Set(recentMessages.map(m => m.userId))];
    const users = await User.find({ id: { $in: userIds } });
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = { nickname: u.nickname, avatar: u.avatar };
    });
    
    const result = recentMessages.map(m => ({
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

// 이미지 업로드 API (Render 최적화)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const { room, userId, mid } = req.body;
    
    if (!ROOMS.includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    
    // 중복 메시지 체크
    const existingMsg = await Message.findOne({ mid });
    if (existingMsg) {
      const user = await User.findOne({ id: existingMsg.userId });
      return res.json({
        ...existingMsg.toObject(),
        avatar: user ? user.avatar : ''
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: '이미지가 없습니다.' });
    }
    
    const user = await User.findOne({ id: userId });
    const nickname = user ? user.nickname : ('User-' + userId.slice(-5));
    
    // Render에서는 /uploads 경로로 직접 제공
    const mediaUrl = `/uploads/${req.file.filename}`;
    const ts = Date.now();
    
    const message = new Message({
      ts,
      room,
      userId,
      nickname,
      text: '',
      kind: 'image',
      mediaUrl,
      mime: req.file.mimetype,
      fileName: req.file.originalname,
      mid: mid || uuidv4(),
      reactions: {}
    });
    
    await message.save();
    
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
    
    const message = await Message.findOne({ mid });
    if (!message) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
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
    await message.save();
    
    const user = await User.findOne({ id: message.userId });
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

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log('👤 사용자 연결:', socket.id);
  
  socket.on('joinRoom', (room) => {
    if (ROOMS.includes(room)) {
      socket.join(room);
      console.log(`📱 ${socket.id}이 ${room} 방에 입장`);
    }
  });
  
  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`📱 ${socket.id}이 ${room} 방에서 퇴장`);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 사용자 연결 해제:', socket.id);
  });
});

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('서버 오류:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기가 10MB를 초과했습니다.' });
    }
  }
  
  res.status(500).json({ 
    error: isProduction ? '서버 오류가 발생했습니다.' : error.message 
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