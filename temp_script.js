    /* ===== 상태 관리 =====*/
    // 상수 정의
    const CONFIG = {
      ROOMS: ['주중', '주말', '전체', '방문예정'],
      EMOJIS: ['👍', '😂', '😮', '😢', '😡', '❤️'],
      MAX_MESSAGE_LENGTH: 2000,
      MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
      SCROLL_THRESHOLD: 80
    };

    /* ===== Work Status System ===== */
    const WorkStatus = {
      ticketing: { 
        icon: '🎫', 
        text: '발권', 
        color: '#3B82F6'
      },
      checking: { 
        icon: '✅', 
        text: '검표', 
        color: '#10B981'
      },
      patrol: { 
        icon: '🚶', 
        text: '순찰', 
        color: '#F59E0B'
      },
      artshop: { 
        icon: '🎨', 
        text: '아트샵', 
        color: '#8B5CF6'
      },
      offline: { 
        icon: '⚪', 
        text: '오프라인', 
        color: '#6B7280'
      }
    };

    // Current work status
    let currentWorkStatus = 'offline';

    /* ===== 프로필 편집 모달 시스템 ===== */
    class ProfileEditModal {
      constructor() {
        this.modal = null;
        this.uppy = null;
        this.currentImage = null;
        this.isUploading = false;
        
        this.init();
      }

      init() {
        console.log('🛠️ ProfileEditModal 초기화 시작');
        
        // DOM 요소 바인딩
        this.bindElements();
        
        // 이벤트 리스너 설정
        this.bindEvents();
        
        // Uppy 초기화 (지연)
        this.initUppy();
        
        console.log('✅ ProfileEditModal 초기화 완료');
      }

      bindElements() {
        try {
          console.log('🔗 ProfileEditModal 요소 바인딩 시작');
          
          // 필수 요소들을 안전하게 바인딩
          const requiredElements = {
            modal: 'profileEditModal',
            currentProfileImg: 'currentProfileImg',
            changeImageBtn: 'changeImageBtn',
            imageUploadArea: 'imageUploadArea',
            editNickname: 'editNickname',
            editStatusMessage: 'editStatusMessage',
            nicknameCount: 'nicknameCount',
            statusCount: 'statusCount'
          };

          const missingElements = [];

          for (const [property, elementId] of Object.entries(requiredElements)) {
            const element = document.getElementById(elementId);
            this[property] = element;
            
            if (!element) {
              missingElements.push(elementId);
              console.warn(`⚠️ ProfileEditModal: ${elementId} 요소를 찾을 수 없습니다`);
            }
          }

          if (missingElements.length > 0) {
            throw new Error(`필수 요소들을 찾을 수 없습니다: ${missingElements.join(', ')}`);
          }

          console.log('✅ ProfileEditModal 요소 바인딩 완료');
        } catch (error) {
          console.error('❌ ProfileEditModal 요소 바인딩 실패:', error);
          throw error;
        }
      }

      bindEvents() {
        try {
          console.log('🎯 ProfileEditModal 이벤트 바인딩 시작');
          
          // 닉네임 글자 수 카운터 - null 체크 포함
          if (this.editNickname && this.nicknameCount) {
            this.editNickname.addEventListener('input', (e) => {
              const count = e.target.value.length;
              this.nicknameCount.textContent = count;
              if (count > 20) {
                e.target.value = e.target.value.substring(0, 20);
                this.nicknameCount.textContent = 20;
              }
            });
          } else {
            console.warn('⚠️ 닉네임 카운터 바인딩 실패');
          }

          // 상태 메시지 글자 수 카운터 - null 체크 포함
          if (this.editStatusMessage && this.statusCount) {
            this.editStatusMessage.addEventListener('input', (e) => {
              const count = e.target.value.length;
              this.statusCount.textContent = count;
              if (count > 50) {
                e.target.value = e.target.value.substring(0, 50);
                this.statusCount.textContent = 50;
              }
            });
          } else {
            console.warn('⚠️ 상태 메시지 카운터 바인딩 실패');
          }

          // 이미지 변경 버튼 - null 체크 포함
          if (this.changeImageBtn) {
            this.changeImageBtn.addEventListener('click', () => {
              try {
                this.toggleImageUpload();
              } catch (error) {
                console.error('🖼️ 이미지 토글 실패:', error);
              }
            });
          } else {
            console.warn('⚠️ 이미지 변경 버튼 바인딩 실패');
          }

          // 모달 외부 클릭 시 닫기 - null 체크 포함
          if (this.modal) {
            this.modal.addEventListener('click', (e) => {
              if (e.target === this.modal) {
                try {
                  this.close();
                } catch (error) {
                  console.error('❌ 모달 닫기 실패:', error);
                }
              }
            });
          } else {
            console.warn('⚠️ 모달 외부 클릭 바인딩 실패');
          }

          // ESC 키로 모달 닫기 - 전역 이벤트이므로 항상 바인딩
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
              try {
                this.close();
              } catch (error) {
                console.error('❌ ESC 키 모달 닫기 실패:', error);
              }
            }
          });

          console.log('✅ ProfileEditModal 이벤트 바인딩 완료');
        } catch (error) {
          console.error('❌ ProfileEditModal 이벤트 바인딩 실패:', error);
          throw error;
        }
      }

      initUppy() {
        if (typeof Uppy === 'undefined') {
          console.warn('⚠️ Uppy.js가 로드되지 않았습니다. 파일 업로드 기능이 제한됩니다.');
          return;
        }

        try {
          this.uppy = new Uppy.Core({
            restrictions: {
              maxFileSize: 5 * 1024 * 1024, // 5MB
              maxNumberOfFiles: 1,
              allowedFileTypes: ['image/*']
            },
            locale: {
              strings: {
                dropPasteImport: '이미지를 드래그하거나 붙여넣기하세요',
                browseFiles: '파일 선택',
                cancel: '취소',
                done: '완료'
              }
            }
          });

          this.uppy.use(Uppy.Dashboard, {
            target: '#uppyDashboard',
            inline: true,
            width: '100%',
            height: 200,
            showProgressDetails: true,
            hideUploadButton: false,
            hideRetryButton: true,
            hidePauseResumeButton: true,
            hideCancelButton: false,
            showRemoveButtonAfterComplete: true,
            note: 'JPG, PNG, GIF 파일만 업로드 가능 (최대 5MB)'
          });

          this.uppy.use(Uppy.ImageEditor, {
            target: Uppy.Dashboard,
            quality: 0.8
          });

          // XHRUpload 플러그인 설정 - 백엔드 업로드 엔드포인트 연결
          this.uppy.use(Uppy.XHRUpload, {
            endpoint: '/api/profile-upload',
            method: 'POST',
            formData: true,
            fieldName: 'image',
            getResponseData: (responseText) => {
              const response = JSON.parse(responseText);
              return {
                url: response.url,
                success: response.success
              };
            },
            addMetadata: true
          });

          // 업로드 시 userId 추가
          this.uppy.on('upload', () => {
            if (AppState.userId) {
              this.uppy.setMeta({ userId: AppState.userId });
            }
          });

          // 파일 선택 시 미리보기 업데이트
          this.uppy.on('file-added', (file) => {
            console.log('📁 파일 선택됨:', file.name);
            this.previewImage(file);
          });

          // 파일 제거 시 원본 이미지로 복원
          this.uppy.on('file-removed', (file) => {
            console.log('🗑️ 파일 제거됨:', file.name);
            this.resetImagePreview();
          });

          // 업로드 성공 시 처리
          this.uppy.on('upload-success', (file, response) => {
            console.log('✅ 파일 업로드 성공:', response);
            this.currentImage = response.uploadURL || response.body.url;
          });

          // 에러 처리
          this.uppy.on('upload-error', (file, error) => {
            console.error('❌ 파일 업로드 실패:', error);
            alert('파일 업로드에 실패했습니다. 다시 시도해주세요.');
          });

          console.log('✅ Uppy.js 초기화 완료');
        } catch (error) {
          console.error('❌ Uppy.js 초기화 실패:', error);
        }
      }

      open() {
        if (!this.modal) return;

        console.log('🔓 프로필 편집 모달 열기');
        
        // 현재 프로필 정보 로드
        this.loadCurrentProfile();
        
        // 모달 표시
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // 첫 번째 입력 필드에 포커스
        setTimeout(() => {
          this.editNickname.focus();
        }, 100);
      }

      close() {
        if (!this.modal) return;

        console.log('🔒 프로필 편집 모달 닫기');
        
        // 업로드 영역 숨기기
        this.hideImageUpload();
        
        // Uppy 리셋
        if (this.uppy) {
          this.uppy.reset();
        }
        
        // 모달 숨기기
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
      }

      isOpen() {
        return this.modal && this.modal.style.display === 'flex';
      }

      loadCurrentProfile() {
        // 현재 사용자 정보를 모달에 로드
        if (AppState.me) {
          this.editNickname.value = AppState.me.nickname || '';
          this.editStatusMessage.value = AppState.me.status || '';
          
          // 글자 수 카운터 업데이트
          this.nicknameCount.textContent = this.editNickname.value.length;
          this.statusCount.textContent = this.editStatusMessage.value.length;
          
          // 프로필 이미지 설정
          const profileImg = AppState.me.avatar || '/favicon.ico';
          this.currentProfileImg.src = profileImg;
          this.currentProfileImg.alt = `${AppState.me.nickname}님의 프로필`;
          
          this.currentImage = AppState.me.avatar;
        }
      }

      toggleImageUpload() {
        const isVisible = this.imageUploadArea.style.display !== 'none';
        
        if (isVisible) {
          this.hideImageUpload();
        } else {
          this.showImageUpload();
        }
      }

      showImageUpload() {
        this.imageUploadArea.style.display = 'block';
        
        // Uppy Dashboard 크기 조정
        if (this.uppy) {
          setTimeout(() => {
            this.uppy.getPlugin('Dashboard').requestCloseModal();
          }, 100);
        }
      }

      hideImageUpload() {
        this.imageUploadArea.style.display = 'none';
      }

      previewImage(file) {
        // File 객체를 이용해 미리보기 생성
        const reader = new FileReader();
        reader.onload = (e) => {
          this.currentProfileImg.src = e.target.result;
        };
        reader.readAsDataURL(file.data);
      }

      resetImagePreview() {
        // 원본 프로필 이미지로 복원
        if (AppState.me) {
          this.currentProfileImg.src = AppState.me.avatar || '/favicon.ico';
        }
        this.currentImage = AppState.me?.avatar || null;
      }

      async saveProfile() {
        if (this.isUploading) return;

        try {
          this.isUploading = true;
          console.log('💾 프로필 저장 시작');

          const saveBtn = document.querySelector('.btn-save');
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="spinner"></div> 저장 중...';
          }

          // 업데이트할 프로필 데이터
          const profileData = {
            nickname: this.editNickname.value.trim(),
            status: this.editStatusMessage.value.trim()
          };

          // 이미지 업로드가 있는 경우 먼저 업로드 처리
          if (this.uppy && this.uppy.getFiles().length > 0) {
            console.log('📤 이미지 업로드 중...');
            
            // Uppy를 이용한 파일 업로드
            const result = await this.uppy.upload();
            
            if (result.successful && result.successful.length > 0) {
              // 업로드 성공 시 response에서 URL 가져오기
              const uploadedFile = result.successful[0];
              const response = uploadedFile.response ? uploadedFile.response.body : null;
              
              if (response && response.url) {
                profileData.avatar = response.url;
                console.log('✅ 이미지 업로드 완료:', profileData.avatar);
                
                // 이미지가 업로드된 경우 AppState와 UI를 바로 업데이트
                AppState.me = { ...AppState.me, avatar: response.url };
              }
            } else if (result.failed && result.failed.length > 0) {
              throw new Error('이미지 업로드에 실패했습니다.');
            }
          } else if (this.currentImage !== AppState.me?.avatar) {
            // 이미지가 변경되었지만 새 파일이 없는 경우 (기존 이미지 유지 또는 제거)
            profileData.avatar = this.currentImage;
          }

          // 닉네임이나 상태메시지가 변경된 경우만 서버에 업데이트 요청
          const hasNicknameChange = profileData.nickname !== (AppState.me?.nickname || '');
          const hasStatusChange = profileData.status !== (AppState.me?.status || '');
          const hasAvatarChange = profileData.avatar !== AppState.me?.avatar;
          
          if (hasNicknameChange || hasStatusChange || (hasAvatarChange && !this.uppy?.getFiles().length)) {
            console.log('📝 프로필 정보 업데이트 중...');
            await this.updateProfile(profileData);
          } else {
            console.log('ℹ️ 변경된 프로필 정보가 없습니다.');
            // UI만 업데이트
            updateProfileUI();
          }
          
          // 성공적으로 저장되면 모달 닫기
          this.close();
          
          console.log('✅ 프로필 저장 완료');

        } catch (error) {
          console.error('❌ 프로필 저장 실패:', error);
          alert('프로필 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
          this.isUploading = false;
          
          const saveBtn = document.querySelector('.btn-save');
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '저장';
          }
        }
      }

      async updateProfile(profileData) {
        return new Promise((resolve, reject) => {
          // 기존 프로필 업데이트 로직 재사용
          if (!socket || !socket.connected) {
            reject(new Error('서버 연결이 끊어졌습니다.'));
            return;
          }

          // 소켓을 통한 프로필 업데이트
          socket.emit('updateProfile', {
            userId: AppState.userId,
            ...profileData
          });

          // 응답 대기
          const timeout = setTimeout(() => {
            reject(new Error('서버 응답 시간 초과'));
          }, 10000);

          const onProfileUpdated = (response) => {
            clearTimeout(timeout);
            socket.off('profileUpdated', onProfileUpdated);
            
            if (response.success) {
              // AppState 업데이트
              AppState.me = { ...AppState.me, ...profileData };
              
              // UI 업데이트
              updateProfileUI();
              
              resolve(response);
            } else {
              reject(new Error(response.message || '프로필 업데이트 실패'));
            }
          };

          socket.on('profileUpdated', onProfileUpdated);
        });
      }
    }

    // 전역 프로필 편집 모달 인스턴스
    let profileEditModal = null;

    // 모달 제어 함수들 (HTML에서 호출)
    function openProfileEditModal() {
      if (!profileEditModal) {
        profileEditModal = new ProfileEditModal();
      }
      profileEditModal.open();
      closeProfileDropdown(); // 드롭다운 닫기
    }

    function openProfileEdit() {
      openProfileEditModal();
    }

    function closeProfileEditModal() {
      if (profileEditModal) {
        profileEditModal.close();
      }
    }

    // Work Status Functions
    function openWorkStatusSelector() {
      const modal = document.getElementById('workStatusModal');
      if (modal) {
        modal.style.display = 'grid';
        // Update active status
        document.querySelectorAll('.status-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.status === currentWorkStatus);
        });
      }
      closeProfileDropdown();
    }

    function closeWorkStatusSelector() {
      const modal = document.getElementById('workStatusModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    function selectWorkStatus(status) {
      currentWorkStatus = status;
      updateWorkStatusDisplay();
      closeWorkStatusSelector();
      
      // Save to localStorage
      if (window.localStorage) {
        localStorage.setItem('workStatus', status);
      }
      
      // TODO: Send to server via Socket.IO
      if (window.socket && window.socket.connected) {
        socket.emit('updateWorkStatus', {
          status: status,
          timestamp: Date.now()
        });
      }
    }

    function updateWorkStatusDisplay() {
      const status = WorkStatus[currentWorkStatus] || WorkStatus.offline;
      
      // Update header work status
      const headerWorkStatus = document.getElementById('headerWorkStatus');
      if (headerWorkStatus) {
        headerWorkStatus.textContent = status.text;
      }
      
      // Update work status dot
      const headerStatusDot = document.getElementById('headerStatusDot');
      if (headerStatusDot) {
        headerStatusDot.className = 'work-status-dot ' + currentWorkStatus;
      }
      
      // Update dropdown status
      const dropdownStatus = document.getElementById('dropdownStatus');
      if (dropdownStatus) {
        dropdownStatus.textContent = status.text;
      }
      
      // Update sidebar work status
      const sidebarStatusIcon = document.getElementById('sidebarStatusIcon');
      const sidebarStatusText = document.getElementById('sidebarStatusText');
      if (sidebarStatusIcon) sidebarStatusIcon.textContent = status.icon;
      if (sidebarStatusText) sidebarStatusText.textContent = status.text;
      
      // Update status selector icon and text
      const statusIcon = document.getElementById('statusIcon');
      const statusText = document.getElementById('statusText');
      if (statusIcon) statusIcon.textContent = status.icon;
      if (statusText) statusText.textContent = `업무 상태: ${status.text}`;
    }

    // Profile Dropdown Functions
    function toggleProfileDropdown() {
      const dropdown = document.getElementById('profileDropdown');
      const trigger = document.getElementById('profileBtn');
      
      if (!dropdown || !trigger) return;
      
      const isOpen = dropdown.style.display !== 'none';
      
      if (isOpen) {
        closeProfileDropdown();
      } else {
        openProfileDropdown();
      }
    }

    function openProfileDropdown() {
      const dropdown = document.getElementById('profileDropdown');
      const trigger = document.getElementById('profileBtn');
      
      if (dropdown && trigger) {
        dropdown.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');
        
        // Update dropdown info
        updateDropdownInfo();
        
        // Close dropdown when clicking outside
        setTimeout(() => {
          document.addEventListener('click', closeDropdownOnOutsideClick);
        }, 0);
      }
    }

    function closeProfileDropdown() {
      const dropdown = document.getElementById('profileDropdown');
      const trigger = document.getElementById('profileBtn');
      
      if (dropdown && trigger) {
        dropdown.style.display = 'none';
        trigger.setAttribute('aria-expanded', 'false');
        
        document.removeEventListener('click', closeDropdownOnOutsideClick);
      }
    }

    function closeDropdownOnOutsideClick(event) {
      const dropdown = document.getElementById('profileDropdown');
      const section = document.querySelector('.profile-section');
      
      if (dropdown && section && !section.contains(event.target)) {
        closeProfileDropdown();
      }
    }

    function updateDropdownInfo() {
      // Update dropdown header with current user info
      if (window.AppState && window.AppState.me) {
        const dropdownName = document.getElementById('dropdownName');
        const dropdownAvatar = document.getElementById('dropdownAvatar');
        
        if (dropdownName) dropdownName.textContent = AppState.me.nickname || AppState.me.username || 'User';
        if (dropdownAvatar && AppState.me.profileImage) {
          dropdownAvatar.src = AppState.me.profileImage;
        }
      }
    }

    // Settings function placeholder
    function openSettings() {
      alert('설정 기능은 준비 중입니다.');
      closeProfileDropdown();
    }

    // Initialize work status from localStorage
    function initializeWorkStatus() {
      if (window.localStorage) {
        const savedStatus = localStorage.getItem('workStatus');
        if (savedStatus && WorkStatus[savedStatus]) {
          currentWorkStatus = savedStatus;
        }
      }
      updateWorkStatusDisplay();
    }

    function saveProfileChanges() {
      if (profileEditModal) {
        profileEditModal.saveProfile();
      }
    }

    // 프로필 UI 업데이트 함수
    function updateProfileUI() {
      if (!AppState.me) return;
      
      // 사이드바 닉네임 업데이트
      const nicknameView = document.getElementById('nicknameView');
      if (nicknameView) {
        nicknameView.textContent = AppState.me.nickname || 'User';
      }
      
      // 헤더 프로필 정보 업데이트
      const headerName = document.getElementById('headerName');
      if (headerName) {
        headerName.textContent = AppState.me.nickname || AppState.me.username || 'User';
      }
      
      // 헤더 아바타 업데이트
      const headerAvatar = document.getElementById('headerAvatar');
      if (headerAvatar) {
        if (AppState.me.profileImage && AppState.me.profileImage.trim()) {
          headerAvatar.src = AppState.me.profileImage;
        } else if (AppState.me.avatar && AppState.me.avatar.trim()) {
          headerAvatar.src = AppState.me.avatar;
        } else {
          headerAvatar.src = '/favicon.ico'; // Default avatar
        }
      }
      
      // 사이드바 아바타 이미지 업데이트
      const avatarImg = document.getElementById('avatarImg');
      if (avatarImg) {
        if (AppState.me.profileImage && AppState.me.profileImage.trim()) {
          avatarImg.src = AppState.me.profileImage;
          avatarImg.style.visibility = 'visible';
        } else if (AppState.me.avatar && AppState.me.avatar.trim()) {
          avatarImg.src = AppState.me.avatar;
          avatarImg.style.visibility = 'visible';
        } else {
          avatarImg.removeAttribute('src');
          avatarImg.style.visibility = 'hidden';
        }
      }
      
      // 상태 메시지 업데이트
      const statusView = document.getElementById('statusView');
      if (statusView) {
        statusView.textContent = AppState.me.status || '상태메시지…';
      }
      
      console.log('✅ 프로필 UI 업데이트 완료');
    }
    
    // 전역 상태
    const AppState = {
      currentRoom: '주중',
      userId: null,
      me: null,
      flags: {
        sending: false,
        uploading: false,
        switching: false  // 방 전환 중 플래그 추가
      },
      // 🔗 답글 상태 관리
      reply: {
        active: false,    // 답글 모드 활성화 여부
        targetMid: null,  // 답글 대상 메시지 ID
        targetNick: null  // 답글 대상 사용자명
      },
      cache: {
        renderedMids: { 
          '주중': new Map(), 
          '주말': new Map(), 
          '전체': new Map(), 
          '방문예정': new Map() 
        },
        lastTs: { '주중': 0, '주말': 0, '전체': 0, '방문예정': 0 },
        lastDayRendered: { '주중': '', '주말': '', '전체': '', '방문예정': '' },
        pagination: {},
        preloadedMessages: {}  // 🚀 프리로드된 메시지 캐시
      },
      connectedUsers: [], // 현재 접속자 목록
      // 🚀 방 방문 통계 및 프리로딩 설정
      roomStats: {
        visitCount: { '주중': 0, '주말': 0, '전체': 0, '방문예정': 0 },
        lastVisit: { '주중': 0, '주말': 0, '전체': 0, '방문예정': 0 },
        preloadThreshold: 3  // 3번 이상 방문한 방은 프리로드 대상
      },
      // 🔔 알림 시스템 상태
      notifications: {
        permission: 'default', // 'granted', 'denied', 'default'
        permissionRequested: false, // 권한 요청 여부 추적
        // 소리 설정 제거됨 - 기본값만 사용 (ding, 70% 볼륨)
        state: {
          isTabVisible: true,   // Page Visibility API 상태
          unreadCount: 0,       // 읽지 않은 메시지 수
          originalTitle: document.title, // 원래 타이틀 저장
          titleInterval: null   // 타이틀 깜빡임 인터벌
        }
      }
    };

    // Socket.io 연결 (지능형 Keep-Alive 설정)
    const socket = io({
      pingInterval: 25000,  // 25초마다 ping (Socket.IO v4 기본값)
      pingTimeout: 20000    // 20초 응답 타임아웃
    });

    /* ===== 🔔 NotificationQueue 클래스 ===== */
    class NotificationQueue {
      constructor() {
        this.activeNotifications = new Map();
        this.maxNotifications = 3; // 최대 동시 표시 가능한 알림 수
        this.cleanupInterval = null;
      }

      // 🔔 활성 알림 추가
      addNotification(tag, notificationRef) {
        this.activeNotifications.set(tag, {
          notification: notificationRef,
          timestamp: Date.now()
        });
        
        console.log(`📝 활성 알림 추가: ${tag} (총 ${this.activeNotifications.size}개)`);
        this.scheduleCleanup();
      }

      // 🔔 알림 제거
      removeNotification(tag) {
        if (this.activeNotifications.has(tag)) {
          this.activeNotifications.delete(tag);
          console.log(`🗑️ 활성 알림 제거: ${tag} (남은 ${this.activeNotifications.size}개)`);
        }
      }

      // 🔔 오래된 알림 자동 정리
      async cleanupOldNotifications() {
        const now = Date.now();
        const maxAge = 30000; // 30초 이상 된 알림 정리
        
        for (const [tag, data] of this.activeNotifications) {
          if (now - data.timestamp > maxAge) {
            try {
              if (data.notification && typeof data.notification.close === 'function') {
                data.notification.close();
              }
            } catch (error) {
              console.warn(`⚠️ 알림 정리 실패: ${tag}`, error);
            }
            this.removeNotification(tag);
          }
        }

        // 최대 개수 초과 시 오래된 것부터 제거
        if (this.activeNotifications.size > this.maxNotifications) {
          const sortedNotifications = Array.from(this.activeNotifications.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
          
          const toRemove = sortedNotifications.slice(0, this.activeNotifications.size - this.maxNotifications);
          
          for (const [tag, data] of toRemove) {
            try {
              if (data.notification && typeof data.notification.close === 'function') {
                data.notification.close();
              }
            } catch (error) {
              console.warn(`⚠️ 초과 알림 정리 실패: ${tag}`, error);
            }
            this.removeNotification(tag);
          }
        }
      }

      // 🔔 정리 작업 스케줄링
      scheduleCleanup() {
        if (this.cleanupInterval) {
          clearTimeout(this.cleanupInterval);
        }
        
        this.cleanupInterval = setTimeout(() => {
          this.cleanupOldNotifications();
        }, 5000);
      }

      // 🔔 모든 알림 정리
      clearAll() {
        for (const [tag, data] of this.activeNotifications) {
          try {
            if (data.notification && typeof data.notification.close === 'function') {
              data.notification.close();
            }
          } catch (error) {
            console.warn(`⚠️ 전체 알림 정리 실패: ${tag}`, error);
          }
        }
        this.activeNotifications.clear();
        console.log('🧹 모든 활성 알림 정리 완료');
      }
    }

    /* ===== 🔔 NotificationManager 클래스 ===== */
    class NotificationManager {
      constructor() {
        this.audioContext = null;
        this.soundBuffers = new Map();
        this.isInitialized = false;
        
        // 🔔 알림 큐 관리자
        this.notificationQueue = new NotificationQueue();
        
        // 🔔 Push 구독 관련 속성
        this.pushSupported = false;
        this.subscription = null;
        this.serviceWorkerRegistration = null;
        this.vapidPublicKey = 'BG3zVpPIzzIaAkcJNu8gPIns8VcZXxVR4F0F30_qGPFAhJLtKhcMPEGP9Vh-j8VQxcdRrawnYlLP3i3NfsUzMYc';
        
        // 기본 사운드 URL들 (Data URL로 임베드된 소리들)
        this.soundUrls = {
          ding: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEWAhqO2u7NfS0HLYnS9t2QQQ0PXrjs4ahWFQ1Bnt_y2mkzAhqO2u7NfS0HLYnS9t2QQQwPZLHl34RGAhqO2u7NfS0HLYnS9t2QQQwPZLHl34RHBAQR',
          pop: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEWAhqO2u7NfS0HLYnS9t2QQQ0PXrjs4ahWFQ1Bnt_y2mkzAhqO2u7NfS0HLYnS9t2QQQwPZLHl34RGAhqO2u7NfS0HLYnS9t2QQQwPZLHl34RHBAQR',
          chime: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEWAhqO2u7NfS0HLYnS9t2QQQ0PXrjs4ahWFQ1Bnt_y2mkzAhqO2u7NfS0HLYnS9t2QQQwPZLHl34RGAhqO2u7NfS0HLYnS9t2QQQwPZLHl34RHBAQR'
        };
      }

      // 🎵 Web Audio API 초기화 (사용자 제스처 후)
      async initializeAudio() {
        if (this.isInitialized) return true;
        
        try {
          // AudioContext 생성
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // 사운드 버퍼 로드
          await this.loadSounds();
          
          this.isInitialized = true;
          console.log('🎵 Web Audio API 초기화 완료');
          return true;
        } catch (error) {
          console.error('❌ Web Audio API 초기화 실패:', error);
          return false;
        }
      }

      // 🔊 사운드 파일 로드
      async loadSounds() {
        for (const [type, dataUrl] of Object.entries(this.soundUrls)) {
          try {
            const response = await fetch(dataUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(type, audioBuffer);
            console.log(`✅ ${type} 사운드 로드 성공`);
          } catch (error) {
            console.warn(`⚠️ ${type} 사운드 로드 실패:`, error.message || error);
            // 사운드 로드 실패해도 시스템은 계속 작동하도록 함
            this.soundBuffers.set(type, null);
          }
        }
        
        // 로드된 사운드 개수 로그
        const loadedCount = Array.from(this.soundBuffers.values()).filter(buffer => buffer !== null).length;
        const totalCount = Object.keys(this.soundUrls).length;
        console.log(`🎵 사운드 시스템: ${loadedCount}/${totalCount}개 로드 완료`);
      }

      // 🔔 알림 권한 요청
      async requestPermission() {
        if (!('Notification' in window)) {
          console.warn('⚠️ 이 브라우저는 알림을 지원하지 않습니다');
          return 'denied';
        }

        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        AppState.notifications.permission = permission;
        this.saveSettings();
        
        console.log(`🔔 알림 권한: ${permission}`);
        return permission;
      }

      // 🎵 사운드 재생
      playSound(type = null) {
        if (!this.isInitialized) return;
        
        const soundType = type || 'ding'; // 기본 소리
        const buffer = this.soundBuffers.get(soundType);
        
        if (!buffer || buffer === null) {
          console.debug(`🔇 ${soundType} 사운드 버퍼 없음 - 무음 재생`);
          return;
        }

        try {
          const source = this.audioContext.createBufferSource();
          const gainNode = this.audioContext.createGain();
          
          source.buffer = buffer;
          gainNode.gain.value = 0.7; // 기본 볼륨 70%
          
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          source.start();
        } catch (error) {
          console.error('❌ 사운드 재생 실패:', error);
        }
      }

      // 🏷️ 탭 제목 알림 (깜빡임 효과)
      updateTabTitle(unreadCount = 0) {
        // 탭 제목 알림 (항상 활성화)
        
        const state = AppState.notifications.state;
        
        // 원래 제목이 설정되지 않았다면 현재 제목을 저장
        if (!state.originalTitle || state.originalTitle === '') {
          state.originalTitle = 'Eastalk (Web)';
        }
        
        console.log(`📋 탭 제목 업데이트: ${unreadCount}개 메시지, 탭 표시: ${state.isTabVisible}`);
        
        // 기존 인터벌 클리어
        if (state.titleInterval) {
          clearInterval(state.titleInterval);
          state.titleInterval = null;
        }
        
        if (unreadCount > 0) {
          const newMessage = `(${unreadCount}) ${state.originalTitle}`;
          
          // 즉시 제목 변경
          document.title = newMessage;
          
          // 탭이 비활성화되어 있을 때만 깜빡임 효과
          if (!state.isTabVisible) {
            let isShowingCount = true;
            
            state.titleInterval = setInterval(() => {
              // 탭이 활성화되면 깜빡임 중지하고 원래 제목으로 복원
              if (AppState.notifications.state.isTabVisible) {
                clearInterval(state.titleInterval);
                state.titleInterval = null;
                document.title = state.originalTitle;
                AppState.notifications.state.unreadCount = 0;
                return;
              }
              
              // 깜빡임: 카운트 표시 ↔ 원래 제목
              document.title = isShowingCount ? newMessage : state.originalTitle;
              isShowingCount = !isShowingCount;
            }, 800); // 800ms 간격으로 깜빡임
          }
        } else {
          // 읽지 않은 메시지가 없으면 원래 제목으로 복원
          document.title = state.originalTitle;
          state.unreadCount = 0;
        }
      }

      // 🔔 브라우저 알림 표시 (Push API와 기존 API 통합)
      showNotification(title, options = {}) {
        // 📊 상세 로깅 시작
        console.group('🔔 알림 표시 요청');
        console.log('제목:', title);
        console.log('옵션:', options);
        console.log('권한 상태:', AppState.notifications.permission);
        console.log('탭 가시성:', AppState.notifications.state.isTabVisible);
        console.log('활성 알림 수:', this.notificationQueue.activeNotifications.size);
        
        if (AppState.notifications.permission !== 'granted') {
          console.warn('⚠️ 알림 권한이 없어 알림을 표시할 수 없습니다');
          console.groupEnd();
          return;
        }

        // 스마트 모드: 탭이 활성화되어 있으면 알림 표시 안 함 (항상 활성)
        if (AppState.notifications.state.isTabVisible) {
          console.log('📋 탭이 활성화되어 있어 알림을 표시하지 않습니다');
          console.groupEnd();
          return;
        }

        // 🔔 고유 태그 생성으로 중복 알림 차단 문제 해결
        const uniqueTag = `eastalk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const defaultOptions = {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: uniqueTag,
          renotify: true,  // 연속 알림 허용
          requireInteraction: false,
          silent: false,
          ...options
        };

        // Push API 지원 여부에 따라 처리 방식 결정
        console.log('🔧 Push API 지원:', this.pushSupported);
        console.log('🔧 Service Worker 등록:', !!this.serviceWorkerRegistration);
        
        if (this.pushSupported && this.serviceWorkerRegistration) {
          // Push API가 지원되는 경우: Service Worker를 통한 알림 표시
          console.log('📤 Service Worker를 통한 Push 알림 사용');
          this.showPushNotification(title, defaultOptions);
        } else {
          // 기존 방식: 직접 Notification API 사용
          console.log('📢 직접 Notification API 사용');
          this.showDirectNotification(title, defaultOptions);
        }
        
        console.groupEnd();
      }

      // 🔔 Service Worker를 통한 Push 알림 표시
      async showPushNotification(title, options) {
        try {
          if (!this.serviceWorkerRegistration) {
            console.warn('⚠️ Service Worker가 등록되지 않았습니다');
            this.showDirectNotification(title, options);
            return;
          }

          // 🔄 기존 알림 정리
          this.notificationQueue.cleanupOldNotifications();
          
          await this.serviceWorkerRegistration.showNotification(title, {
            ...options,
            renotify: true,  // 연속 알림 허용
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
            ],
            data: {
              timestamp: Date.now(),
              source: 'eastalk-web',
              tag: options.tag
            }
          });

          console.log(`✅ Push 알림 표시됨 (Service Worker, Tag: ${options.tag})`);

        } catch (error) {
          console.error('❌ Push 알림 표시 실패:', error);
          // Fallback: 기존 방식 사용
          this.showDirectNotification(title, options);
        }
      }

      // 🔔 직접 Notification API를 통한 알림 표시
      showDirectNotification(title, options) {
        try {
          // 🔄 기존 알림 정리 (큐 관리자 사용)
          this.notificationQueue.cleanupOldNotifications();
          
          const notification = new Notification(title, options);
          const tag = options.tag || `eastalk-${Date.now()}`;
          
          // 🔔 알림 큐에 추가
          this.notificationQueue.addNotification(tag, notification);
          
          // 알림 클릭 시 창 포커스 및 큐에서 제거
          notification.onclick = () => {
            window.focus();
            this.notificationQueue.removeNotification(tag);
            notification.close();
            console.log('👆 알림 클릭됨 - 창 포커스');
          };
          
          // 알림 닫기 시 큐에서 제거
          notification.onclose = () => {
            this.notificationQueue.removeNotification(tag);
            console.log('❌ 알림 닫힘 - 큐에서 제거');
          };
          
          // 알림 오류 시 큐에서 제거
          notification.onerror = (error) => {
            this.notificationQueue.removeNotification(tag);
            console.error('❌ 알림 오류:', error);
          };
          
          // 자동 닫기 (10초 후로 연장)
          setTimeout(() => {
            this.notificationQueue.removeNotification(tag);
            notification.close();
          }, 10000);

          console.log(`✅ 직접 알림 표시됨 (Tag: ${tag})`);

        } catch (error) {
          console.error('❌ 직접 알림 표시 실패:', error);
        }
      }

      // 📨 새 메시지 알림 처리
      handleNewMessage(message, room) {
        // 자신이 보낸 메시지는 알림 안 함
        if (message.userId === AppState.userId) return;
        
        // 현재 방의 메시지이고 탭이 활성화되어 있으면 사운드만
        const isCurrentRoom = room === AppState.currentRoom;
        const isTabVisible = AppState.notifications.state.isTabVisible;
        
        if (isCurrentRoom && isTabVisible) {
          // 현재 방이고 탭이 보이면 사운드만
          this.playSound();
          return;
        }
        
        // 읽지 않은 메시지 수 증가
        AppState.notifications.state.unreadCount++;
        
        // 탭 제목 업데이트
        this.updateTabTitle(AppState.notifications.state.unreadCount);
        
        // 사운드 재생
        this.playSound();
        
        // 브라우저 알림 표시
        const roomText = room !== AppState.currentRoom ? ` [${room}]` : '';
        this.showNotification(`${message.nickname || message.name || '익명'}${roomText}`, {
          body: message.text || '이미지를 보냈습니다',
          icon: message.avatar || '/favicon.ico'
        });
      }

      // 🔧 설정 저장
      saveSettings() {
        try {
          localStorage.setItem('eastalk_notification_settings', JSON.stringify({
            permission: AppState.notifications.permission
          }));
        } catch (error) {
          console.error('❌ 알림 설정 저장 실패:', error);
        }
      }

      // 📥 설정 로드
      loadSettings() {
        try {
          const saved = localStorage.getItem('eastalk_notification_settings');
          if (saved) {
            const settings = JSON.parse(saved);
            // settings 제거됨 - 기본값 사용
            AppState.notifications.permission = settings.permission || 'default';
          }
        } catch (error) {
          console.error('❌ 알림 설정 로드 실패:', error);
        }
      }

      // 🎯 탭 활성화/비활성화 처리
      handleVisibilityChange() {
        const isVisible = !document.hidden;
        AppState.notifications.state.isTabVisible = isVisible;
        
        if (isVisible) {
          // 탭 활성화 시 읽지 않은 메시지 수 초기화
          AppState.notifications.state.unreadCount = 0;
          this.updateTabTitle(0);
        }
      }

      // 🔔 Push 지원 확인
      checkPushSupport() {
        if (!('serviceWorker' in navigator)) {
          console.warn('⚠️ Service Worker 미지원');
          return false;
        }
        
        if (!('PushManager' in window)) {
          console.warn('⚠️ Push Manager 미지원');
          return false;
        }
        
        if (!('Notification' in window)) {
          console.warn('⚠️ Notification API 미지원');
          return false;
        }
        
        this.pushSupported = true;
        console.log('✅ Push API 지원됨');
        return true;
      }

      // 🔧 Service Worker 등록
      async registerServiceWorker() {
        if (!this.pushSupported) return null;
        
        try {
          // Context7 표준: Service Worker 등록 후 ready 상태 대기
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/' // 명시적 스코프 설정
          });
          console.log('✅ Service Worker 등록 성공:', registration.scope);
          
          // Service Worker가 완전히 활성화될 때까지 대기
          await navigator.serviceWorker.ready;
          console.log('✅ Service Worker 활성화 완료');
          
          // 기존 등록된 Service Worker 업데이트 확인
          if (registration.waiting) {
            console.log('🔄 Service Worker 업데이트 대기 중...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          this.serviceWorkerRegistration = registration;
          return registration;
        } catch (error) {
          console.error('❌ Service Worker 등록 실패:', error);
          
          // 구체적인 오류 진단
          if (error.name === 'SecurityError') {
            console.error('🚫 보안 오류: HTTPS 또는 localhost에서만 Service Worker 사용 가능');
          } else if (error.name === 'TypeError') {
            console.error('🚫 타입 오류: Service Worker 파일을 찾을 수 없음');
          }
          
          return null;
        }
      }

      // 📋 Base64 URL을 Uint8Array로 변환
      urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      // 📱 Push 구독 생성
      async subscribeToPush(retryCount = 0) {
        if (!this.serviceWorkerRegistration) {
          console.warn('⚠️ Service Worker가 등록되지 않았습니다');
          return null;
        }

        try {
          // VAPID 공개키를 Uint8Array로 변환
          const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
          
          console.log('📱 Push 구독 생성 시도...', retryCount > 0 ? `(재시도 ${retryCount}/3)` : '');
          
          // Push 구독 생성 (모바일 최적화)
          const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });

          console.log('✅ Push 구독 생성됨:', subscription);
          this.subscription = subscription;
          
          // 서버에 구독 정보 저장
          await this.sendSubscriptionToServer(subscription);
          
          return subscription;
        } catch (error) {
          console.error('❌ Push 구독 실패:', error);
          
          // 모바일에서 흔한 오류에 대한 재시도 로직
          if (retryCount < 3 && (
            error.name === 'NotSupportedError' ||
            error.name === 'NotAllowedError' ||
            error.message.includes('network')
          )) {
            console.log(`🔄 ${retryCount + 1}초 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
            return this.subscribeToPush(retryCount + 1);
          }
          
          // 구체적인 오류 메시지
          if (error.name === 'NotSupportedError') {
            console.error('🚫 이 브라우저는 Push 알림을 지원하지 않습니다');
          } else if (error.name === 'NotAllowedError') {
            console.error('🚫 Push 알림 권한이 거부되었습니다');
          } else if (error.name === 'InvalidStateError') {
            console.error('🚫 Service Worker가 올바르게 등록되지 않았습니다');
          }
          
          return null;
        }
      }

      // 🌐 서버에 구독 정보 전송
      async sendSubscriptionToServer(subscription) {
        try {
          const response = await fetch('/api/push-subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription: subscription,
              userId: AppState.userId || 'anonymous',
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            })
          });

          if (response.ok) {
            console.log('✅ 구독 정보 서버 전송 완료');
            return true;
          } else {
            console.error('❌ 구독 정보 서버 전송 실패:', response.status);
            return false;
          }
        } catch (error) {
          console.error('❌ 구독 정보 전송 오류:', error);
          return false;
        }
      }

      // 🔄 기존 구독 확인
      async checkExistingSubscription() {
        if (!this.serviceWorkerRegistration) return null;

        try {
          const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
          if (subscription) {
            console.log('✅ 기존 구독 발견:', subscription);
            this.subscription = subscription;
            return subscription;
          }
          return null;
        } catch (error) {
          console.error('❌ 기존 구독 확인 실패:', error);
          return null;
        }
      }

      // 🔔 Push 알림 초기화 (전체 프로세스)
      async initPushNotifications() {
        console.log('🚀 Push 알림 초기화 시작...');

        // 1. 브라우저 지원 확인
        if (!this.checkPushSupport()) {
          console.warn('⚠️ Push 알림 미지원, 기존 방식 사용');
          return false;
        }

        // 2. Service Worker 등록
        const registration = await this.registerServiceWorker();
        if (!registration) {
          console.error('❌ Service Worker 등록 실패');
          return false;
        }

        // 3. 알림 권한 요청
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          console.warn('⚠️ 알림 권한 거부됨');
          return false;
        }

        // 4. 기존 구독 확인
        let subscription = await this.checkExistingSubscription();
        
        // 5. 새 구독 생성 (기존 구독이 없는 경우)
        if (!subscription) {
          subscription = await this.subscribeToPush();
        } else {
          // 기존 구독을 서버에 다시 전송 (서버 재시작 등을 고려)
          await this.sendSubscriptionToServer(subscription);
        }

        if (subscription) {
          console.log('🎉 Push 알림 초기화 완료!');
          return true;
        } else {
          console.error('❌ Push 구독 실패');
          return false;
        }
      }

      // 🚀 초기화
      async init() {
        // 설정 로드
        this.loadSettings();
        
        // Page Visibility API 연동
        document.addEventListener('visibilitychange', () => {
          this.handleVisibilityChange();
        });
        
        // 🔔 페이지 종료 시 모든 알림 정리
        window.addEventListener('beforeunload', () => {
          this.notificationQueue.clearAll();
        });
        
        // 🔔 페이지 숨김 시 정리 작업
        window.addEventListener('pagehide', () => {
          this.notificationQueue.clearAll();
        });
        
        // 초기 상태 설정
        this.handleVisibilityChange();
        
        // Push 알림 초기화 (비동기)
        this.initPushNotifications().catch(error => {
          console.error('❌ Push 알림 초기화 실패:', error);
        });
        
        console.log('🔔 NotificationManager 초기화 완료');
      }
    }

    // 전역 NotificationManager 인스턴스
    const notificationManager = new NotificationManager();

    /* ===== 지능형 Keep-Alive 클라이언트 시스템 ===== */
    
    // 활성 탭 감지 시스템
    const TabActivityMonitor = {
      isActive: true,
      lastActiveTime: Date.now(),
      
      init() {
        // Page Visibility API 활용
        document.addEventListener('visibilitychange', () => {
          this.isActive = !document.hidden;
          if (this.isActive) {
            this.lastActiveTime = Date.now();
            console.log('🎯 탭 활성화 → Heartbeat 재개');
          } else {
            console.log('😴 탭 비활성화 → Heartbeat 일시중지');
          }
        });
        
        // Focus/Blur 이벤트
        window.addEventListener('focus', () => {
          this.isActive = true;
          this.lastActiveTime = Date.now();
        });
        
        window.addEventListener('blur', () => {
          this.isActive = false;
        });
        
        // 사용자 활동 감지 (마우스, 키보드)
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
          document.addEventListener(event, () => {
            if (this.isActive) {
              this.lastActiveTime = Date.now();
            }
          }, { passive: true });
        });
      },
      
      shouldSendHeartbeat() {
        // 탭이 활성화되어 있고, 최근 5분 내 활동이 있었다면
        const fiveMinutes = 5 * 60 * 1000;
        return this.isActive && (Date.now() - this.lastActiveTime < fiveMinutes);
      }
    };
    
    // Socket.IO 기반 지능형 Heartbeat 시스템
    const SmartHeartbeat = {
      intervalId: null,
      stats: {
        sent: 0,
        received: 0,
        lastPing: null,
        averageLatency: 0
      },
      
      start() {
        // 3분마다 heartbeat (Socket.IO 기본 ping보다 느리게)
        this.intervalId = setInterval(() => {
          if (TabActivityMonitor.shouldSendHeartbeat() && socket.connected) {
            this.sendHeartbeat();
          }
        }, 3 * 60 * 1000); // 3분 간격
        
        console.log('❤️ 지능형 Heartbeat 시스템 시작됨 (3분 간격)');
      },
      
      stop() {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
          console.log('💔 Heartbeat 시스템 중지됨');
        }
      },
      
      sendHeartbeat() {
        const startTime = Date.now();
        this.stats.lastPing = startTime;
        this.stats.sent++;
        
        // Socket.IO의 volatile emit 사용 (연결 끊어져도 버퍼링하지 않음)
        socket.volatile.emit('client-heartbeat', { timestamp: startTime }, (response) => {
          const latency = Date.now() - startTime;
          this.stats.received++;
          
          // 이동 평균으로 지연시간 계산
          if (this.stats.averageLatency === 0) {
            this.stats.averageLatency = latency;
          } else {
            this.stats.averageLatency = Math.round((this.stats.averageLatency * 0.8) + (latency * 0.2));
          }
          
          console.log(`💓 Heartbeat: ${latency}ms (avg: ${this.stats.averageLatency}ms)`);
        });
      }
    };
    
    // Socket.IO 연결 상태 모니터링
    socket.on('connect', () => {
      console.log('✅ Socket.IO 연결됨 - Keep-Alive 자동 활성화');
      SmartHeartbeat.start();
      
      // 🔔 앱 시작 시 알림 시스템 자동 초기화
      setTimeout(async () => {
        console.log('🔔 알림 시스템 초기화 시작...');
        
        // 기본 설정 로드
        notificationManager.loadSettings();
        
        // 기본 사운드 초기화
        await notificationManager.initializeAudio();
        
        // 브라우저 알림 권한 자동 요청 (사용자 인터랙션 시)
        if (Notification.permission === 'default') {
          console.log('🔔 알림 권한이 아직 요청되지 않음 - 사용자 상호작용 시 요청');
        } else if (Notification.permission === 'granted') {
          // 권한이 이미 허용된 경우 Push 알림 초기화
          console.log('🔔 알림 권한 허용됨 - Push 시스템 초기화');
          notificationManager.initializePush();
        } else {
          console.log('🔔 알림 권한 거부됨 - 기본 기능만 사용');
        }
        
        console.log('✅ 알림 시스템 초기화 완료');
      }, 1000);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO 연결 해제:', reason);
      SmartHeartbeat.stop();
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket.IO 재연결 성공 (시도: ${attemptNumber})`);
      SmartHeartbeat.start();
    });
    
    // ping/pong 이벤트 모니터링 (디버깅용)
    socket.io.on('ping', () => {
      console.log('🏓 Socket.IO ping 수신');
    });
    
    socket.io.on('pong', (latency) => {
      console.log(`🏓 Socket.IO pong 수신 (${latency}ms)`);
    });
    
    // 초기화
    TabActivityMonitor.init();
    
    /* ===== 도우미 함수들 ===== */
    // DOM 유틸리티 - 현대적인 에러 처리와 null 체크 적용
    const DOM = {
      el: (selector) => {
        try {
          const element = document.querySelector(selector);
          if (!element) {
            console.warn(`[DOM] 요소를 찾을 수 없습니다: ${selector}`);
          }
          return element;
        } catch (error) {
          console.error(`[DOM] 선택자 오류: ${selector}`, error);
          return null;
        }
      },
      elAll: (selector) => {
        try {
          return document.querySelectorAll(selector);
        } catch (error) {
          console.error(`[DOM] 선택자 오류: ${selector}`, error);
          return [];
        }
      },
      create: (tag, className) => {
        try {
          const el = document.createElement(tag);
          if (className) el.className = className;
          return el;
        } catch (error) {
          console.error(`[DOM] 요소 생성 오류: ${tag}`, error);
          return null;
        }
      },
      // 안전한 이벤트 바인딩 유틸리티
      safeAssign: (selector, property, value) => {
        const element = DOM.el(selector);
        if (element && property in element) {
          element[property] = value;
          return true;
        } else {
          console.warn(`[DOM] 안전 할당 실패: ${selector}.${property}`);
          return false;
        }
      }
    };
    
    // 레거시 지원을 위한 el 함수 복원 - DOM.el과 동일한 안전성 제공
    const el = (selector) => DOM.el(selector);
    
    // 캐시 도우미
    const messagesEl = DOM.el('#messages');
    
    // ID 및 시그니처 생성
    const Utils = {
      generateMessageId: () => `mid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      
      createReactionSignature: (reactions) => {
        if (!reactions || typeof reactions !== 'object') return '{}';
        
        const normalized = {};
        Object.keys(reactions)
          .sort((a, b) => a.localeCompare(b))
          .forEach(key => {
            normalized[key] = [...(reactions[key] || [])].sort();
          });
        return JSON.stringify(normalized);
      },
      
      setButtonLoading: (button, loading) => {
        if (!button) return;
        
        const spinner = button.querySelector('.spinner');
        const label = button.querySelector('.label-txt');
        
        if (loading) {
          if (spinner) spinner.style.display = 'inline-block';
          if (label) label.style.display = 'none';
          button.disabled = true;
        } else {
          if (spinner) spinner.style.display = 'none';
          if (label) label.style.display = '';
          button.disabled = false;
        }
      },
      
      sanitizeInput: (input, maxLength = CONFIG.MAX_MESSAGE_LENGTH) => {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, maxLength);
      }
    };

    /* ===== 날짜/시간 포매터 ===== */
    const DateUtils = {
      // 날짜 키 생성 (YYYY-M-D)
      getDateKey: (timestamp) => {
        const date = new Date(timestamp);
        return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
      },
      
      // 날짜 라벨 포매팅 (2024.01.01 (월))
      formatDateLabel: (timestamp) => {
        const date = new Date(timestamp);
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[date.getDay()];
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}.${month}.${day} (${weekday})`;
      },
      
      // 시간 라벨 포매팅 (오전 10:30)
      formatTimeLabel: (timestamp) => {
        return new Intl.DateTimeFormat('ko-KR', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(new Date(timestamp));
      }
    };

    /* ===== Win98 Toggle + Click Sound ===== */
    const applyTheme98 = (on)=>{
      document.body.classList.toggle('win98', !!on);
      localStorage.setItem('theme98',''+(on?1:0));
    };
    const restoreTheme98 = ()=> applyTheme98(localStorage.getItem('theme98')==='1');
    // 오디오 시스템 - 개선된 에러 처리와 폴백
    let audioCtx = null;
    let audioInitialized = false;
    
    function beep(){
      // 테마가 활성화되지 않았으면 조용히 반환
      if (!document.body.classList.contains('win98')) return;
      
      try {
        // AudioContext 초기화 (지연 초기화)
        if (!audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) {
            console.warn('[사운드] Web Audio API를 지원하지 않는 브라우저입니다');
            return;
          }
          
          audioCtx = new AudioContextClass();
          console.log('[사운드] AudioContext 초기화 완료');
        }

        // AudioContext 재개 (브라우저 정책으로 인한 suspend 상태 해결)
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(err => {
            console.warn('[사운드] AudioContext 재개 실패:', err);
          });
        }

        // 사운드 생성
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = 800;
        
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
        
        oscillator.connect(gainNode).connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.09);
        
        audioInitialized = true;

      } catch (error) {
        // 조용한 실패 - 사운드는 필수가 아니므로 로그만 남김
        if (!audioInitialized) {
          console.warn('[사운드] 오디오 시스템 초기화 실패:', error.message);
          audioInitialized = true; // 재시도 방지
        }
      }
    }
    function attachBeepTo(selector){
      document.addEventListener('click', (e)=>{
        if (e.target.closest(selector)) beep();
      });
    }

    /* ===== Responsive helpers ===== */
    const isCompact = () => window.innerWidth <= 480;

    /* ===== UI Base ===== */
    function enableUI(enable){
      ['nickname','status','avatar','clearAvatar','saveBtn','text','sendBtn','photoBtn'].forEach(id=>{
        const n = DOM.el('#'+id); if (n) n.disabled = !enable;
      });
      DOM.el('.wrap').setAttribute('aria-disabled', enable ? 'false' : 'true');
      // 헤더 로그아웃 버튼 토글
      DOM.el('#logoutBtn').style.display = enable ? 'inline-flex' : 'none';
      // 로그인 안내 문구 토글
      DOM.el('#loginNotice').style.display = enable ? 'none' : 'block';
    }
    function setAvatar(url){ const img=DOM.el('#avatarImg'); if(url&&url.trim()){ img.src=url; img.style.visibility='visible'; } else { img.removeAttribute('src'); img.style.visibility='hidden'; } }

    function labelFor(roomName){
      if (isCompact() && roomName.indexOf('방문예정')===0) return '방문예정';
      return roomName;
    }
    function setActiveTabUI() {
      document.querySelectorAll('.tab').forEach(t=>{
        t.classList.toggle('active', t.textContent.replace(/\s/g,'') === UI.labelFor(AppState.currentRoom).replace(/\s/g,''));
      });
    }
    // 🔗 답글 관리 매니저
    const ReplyManager = {
      // 답글 시작
      startReply: (targetMid, targetNick) => {
        AppState.reply.active = true;
        AppState.reply.targetMid = targetMid;
        AppState.reply.targetNick = targetNick;
        
        // UI 업데이트
        const replyIndicator = DOM.el('#replyIndicator');
        const replyTarget = DOM.el('#replyTarget');
        
        replyTarget.textContent = targetNick;
        replyIndicator.style.display = 'block';
        
        // 입력창에 포커스
        DOM.el('#text').focus();
        
        console.log(`[REPLY] 답글 시작: ${targetMid} (${targetNick})`);
      },
      
      // 답글 취소
      cancelReply: () => {
        AppState.reply.active = false;
        AppState.reply.targetMid = null;
        AppState.reply.targetNick = null;
        
        // UI 업데이트
        const replyIndicator = DOM.el('#replyIndicator');
        replyIndicator.style.display = 'none';
        
        console.log('[REPLY] 답글 모드 종료');
      }
    };

    // ===== 방 전환 관리 =====
    const RoomManager = {
      switchRoom: (nextRoom) => {
        if (nextRoom === AppState.currentRoom) return;
        
        // 방 전환 중이면 무시 (연속 클릭 방지)
        if (AppState.flags.switching) return;
        
        // 입력 검증
        if (!CONFIG.ROOMS.includes(nextRoom)) {
          console.warn('잘못된 방 이름:', nextRoom);
          return;
        }
        
        try {
          console.log(`[ROOM] 방 전환 시작: ${AppState.currentRoom} → ${nextRoom}`);
          
          // 🚀 즉시 UI 피드백 - 탭 상태를 먼저 업데이트
          const prevRoom = AppState.currentRoom;
          AppState.currentRoom = nextRoom;
          UI.drawTabs();
          UI.setActiveTabUI();
          
          // 방 전환 시작
          AppState.flags.switching = true;
          
          // 1. 이전 방에서 완전 이탈
          socket.emit('leaveRoom', prevRoom);
          
          // 2. UI 초기화 - 채팅 영역 클리어 및 로딩 표시
          messagesEl.innerHTML = '<div class="loading-skeleton">메시지를 불러오는 중...</div>';
          
          // 3. 캐시 초기화 (해당 방의 렌더링된 메시지 ID 초기화)
          AppState.cache.renderedMids[AppState.currentRoom].clear();
          AppState.cache.lastTs[AppState.currentRoom] = AppState.cache.lastTs[AppState.currentRoom] || 0;
          AppState.cache.lastDayRendered[AppState.currentRoom] = '';
          
          // 4. 새 방에 입장
          socket.emit('joinRoom', AppState.currentRoom);
          
          // 6. 🚀 프리로드 체크 및 데이터 로드
          setTimeout(() => {
            // 프리로드된 메시지가 있으면 즉시 사용
            const usedPreload = PreloadManager.usePreloadedIfAvailable(AppState.currentRoom);
            
            if (usedPreload) {
              // 프리로드된 메시지로 즉시 렌더링 후 최신 메시지만 추가 로드
              DataManager.fetchAndRender(true, false).finally(() => {
                AppState.flags.switching = false;
                MessageManager.onRoomSwitch();
                PreloadManager.updateRoomStats(AppState.currentRoom);
                console.log(`[ROOM] 방 전환 완료 (프리로드 사용): ${prevRoom} → ${nextRoom}`);
              });
            } else {
              // 일반적인 전체 로드
              DataManager.fetchAndRender(true, true).finally(() => {
                AppState.flags.switching = false;
                MessageManager.onRoomSwitch();
                PreloadManager.updateRoomStats(AppState.currentRoom);
                console.log(`[ROOM] 방 전환 완료: ${prevRoom} → ${nextRoom}`);
              });
            }
          }, 100); // Socket 이벤트 처리 시간 확보
          
          // 모바일 UI 정리
          document.body.classList.remove('profile-open');
        } catch (error) {
          console.error('방 전환 오류:', error);
          // 에러 시 이전 방으로 되돌리기 또는 사용자에게 알림
        }
      }
    };

    // 🚀 스크롤 관리 유틸리티
    const ScrollManager = {
      // 스크롤 컨테이너 가져오기 (개선된 구조)
      getScrollContainer() {
        return document.querySelector('.messages') || document.getElementById('messages');
      },
      
      // 현재 스크롤이 하단에 있는지 확인
      isAtBottom(threshold = 80) {
        const container = this.getScrollContainer();
        if (!container) return true;
        
        return Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < threshold;
      },
      
      // 부드럽게 하단으로 스크롤
      scrollToBottom(smooth = true) {
        const container = this.getScrollContainer();
        if (!container) return;
        
        if (smooth && 'scrollTo' in container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        } else {
          container.scrollTop = container.scrollHeight;
        }
      },
      
      // 스크롤 위치 저장
      saveScrollPosition() {
        const container = this.getScrollContainer();
        if (!container) return null;
        
        return {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight
        };
      },
      
      // 스크롤 위치 복원 (새 메시지 로드 후)
      restoreScrollPosition(savedPosition) {
        const container = this.getScrollContainer();
        if (!container || !savedPosition) return;
        
        const newScrollHeight = container.scrollHeight;
        const heightDifference = newScrollHeight - savedPosition.scrollHeight;
        
        container.scrollTop = savedPosition.scrollTop + heightDifference;
      },
      
      // 메시지 전송 후 자동 스크롤 (조건부)
      autoScrollAfterMessage() {
        if (this.isAtBottom()) {
          this.scrollToBottom(false); // 즉시 스크롤
        }
      },
      
      // 스크롤 상태 디버그 정보
      getScrollInfo() {
        const container = this.getScrollContainer();
        if (!container) return null;
        
        const maxScroll = container.scrollHeight - container.clientHeight;
        return {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          isAtBottom: this.isAtBottom(),
          scrollPercentage: maxScroll > 0 ? Math.round((container.scrollTop / maxScroll) * 100) : 100
        };
      },
      
      // 특정 메시지로 스크롤하고 하이라이트
      scrollToMessage(messageId, highlight = true) {
        const targetElement = document.querySelector(`[data-mid="${messageId}"]`);
        if (!targetElement) {
          console.warn(`메시지를 찾을 수 없습니다: ${messageId}`);
          return false;
        }
        
        const container = this.getScrollContainer();
        if (!container) return false;
        
        // 메시지 요소의 위치 계산
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        // 스크롤할 위치 계산 (메시지를 중앙에 배치)
        const scrollTop = container.scrollTop + targetRect.top - containerRect.top - (containerRect.height / 2) + (targetRect.height / 2);
        
        // 부드럽게 스크롤
        if ('scrollTo' in container) {
          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
          });
        } else {
          container.scrollTop = Math.max(0, scrollTop);
        }
        
        // 하이라이트 효과
        if (highlight) {
          targetElement.style.transition = 'background-color 0.3s ease';
          targetElement.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            targetElement.style.backgroundColor = '';
            setTimeout(() => {
              targetElement.style.transition = '';
            }, 300);
          }, 1000);
        }
        
        return true;
      }
    };

    // 🚀 백그라운드 프리로딩 매니저
    const PreloadManager = {
      // 방 방문 통계 업데이트
      updateRoomStats: (roomName) => {
        AppState.roomStats.visitCount[roomName] = (AppState.roomStats.visitCount[roomName] || 0) + 1;
        AppState.roomStats.lastVisit[roomName] = Date.now();
        
        // 자주 방문하는 방들의 메시지 백그라운드 프리로드
        setTimeout(() => PreloadManager.preloadFrequentRooms(), 2000);
      },
      
      // 자주 방문하는 방들 백그라운드 프리로드
      preloadFrequentRooms: async () => {
        if (!AppState.userId) return;
        
        const frequentRooms = CONFIG.ROOMS.filter(room => {
          const visitCount = AppState.roomStats.visitCount[room] || 0;
          return visitCount >= AppState.roomStats.preloadThreshold && room !== AppState.currentRoom;
        });
        
        for (const room of frequentRooms) {
          // 이미 프리로드됐거나 최근에 방문한 방은 스킵
          const lastPreload = AppState.cache.preloadedMessages[room]?.timestamp || 0;
          if (Date.now() - lastPreload < 5 * 60 * 1000) continue; // 5분 쿨다운
          
          try {
            console.log(`[PRELOAD] 백그라운드 프리로딩: ${room}`);
            const response = await apiCall('GET', `/api/messages/${room}?limit=20`);
            const messages = response?.messages || response || [];
            
            AppState.cache.preloadedMessages[room] = {
              messages: messages,
              timestamp: Date.now()
            };
          } catch (error) {
            console.warn(`방 ${room} 프리로드 실패:`, error);
          }
        }
      },
      
      // 프리로드된 메시지가 있으면 즉시 렌더링
      usePreloadedIfAvailable: (roomName) => {
        const preloaded = AppState.cache.preloadedMessages[roomName];
        if (preloaded && Date.now() - preloaded.timestamp < 10 * 60 * 1000) { // 10분 유효
          console.log(`[PRELOAD] 프리로드된 메시지 사용: ${roomName}`);
          preloaded.messages.forEach(addOrUpdateMsg);
          return true;
        }
        return false;
      }
    };

    // 🚀 이미지 지연 로딩 매니저
    const LazyImageManager = {
      observer: null,
      
      init: () => {
        if ('IntersectionObserver' in window) {
          LazyImageManager.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target;
                LazyImageManager.loadImage(img);
                LazyImageManager.observer.unobserve(img);
              }
            });
          }, {
            rootMargin: '50px', // 이미지가 화면에 보이기 50px 전부터 로딩 시작
            threshold: 0.01
          });
        }
      },
      
      loadImage: (img) => {
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc) {
          img.classList.add('loading');
          
          // 새로운 이미지 객체를 만들어 미리 로딩
          const imageLoader = new Image();
          imageLoader.onload = () => {
            img.src = dataSrc;
            img.classList.remove('loading');
            img.classList.add('loaded');
            img.removeAttribute('data-src');
          };
          imageLoader.onerror = () => {
            img.classList.remove('loading');
            img.alt = '이미지 로딩 실패';
            img.style.filter = 'grayscale(1)';
          };
          imageLoader.src = dataSrc;
        }
      },
      
      observeImages: () => {
        if (LazyImageManager.observer) {
          document.querySelectorAll('.lazy-image:not(.loaded):not(.loading)').forEach(img => {
            LazyImageManager.observer.observe(img);
          });
        }
      }
    };

    const UI = {
      drawTabs: () => {
        const tabs = DOM.el('#tabs'); tabs.innerHTML='';
        CONFIG.ROOMS.forEach(r=>{
          const b = DOM.create('div', 'tab');
          b.textContent = UI.labelFor(r);
          b.title = r; b.setAttribute('aria-label', r);
          b.onclick = () => RoomManager.switchRoom(r);
          tabs.appendChild(b);
        });
        UI.setActiveTabUI();
      },
      
      labelFor: (roomName) => {
        if (UI.isCompact() && roomName.indexOf('방문예정')===0) return '방문예정';
        return roomName;
      },
      
      setActiveTabUI: () => {
        document.querySelectorAll('.tab').forEach(t=>{
          t.classList.toggle('active', t.textContent.replace(/\s/g,'') === UI.labelFor(AppState.currentRoom).replace(/\s/g,''));
        });
      },
      
      isCompact: () => window.innerWidth <= 480
    };
    
    // Legacy support for drawTabs - now uses UI.drawTabs()
    function drawTabs(){
      return UI.drawTabs();
    }
    function setActiveTabUI(){
      return UI.setActiveTabUI();
    }
    function labelFor(roomName){
      return UI.labelFor(roomName);
    }
    function initialLetter(name){ const t=String(name||'').trim(); return t? t[0].toUpperCase() : 'U'; }

    /* ===== 접속자 관리 ===== */
    const ConnectedUsersUI = {
      // 접속자 목록 렌더링
      render: (users) => {
        const container = DOM.el('#usersGrid');
        const header = DOM.el('#connectedHeader');
        const section = DOM.el('#connectedUsers');
        
        if (!users || users.length === 0) {
          section.style.display = 'none';
          return;
        }
        
        // 헤더 업데이트
        header.textContent = `현재 접속자 (${users.length})`;
        
        // 아바타 그리드 렌더링
        container.innerHTML = users.map(user => {
          const safeInitial = initialLetter(user.nickname || '');
          if (user.avatar && user.avatar.trim()) {
            return `<div class="user-avatar" data-user-id="${user.userId}" data-nickname="${(user.nickname||'')}" data-avatar="${(user.avatar||'')}" data-status="${(user.status||'')}" title="${user.nickname || 'User'}">
                      <img src="${user.avatar}" onerror="this.remove();this.parentElement.textContent='${safeInitial}';" />
                    </div>`;
          } else {
            return `<div class="user-avatar" data-user-id="${user.userId}" data-nickname="${(user.nickname||'')}" data-avatar="" data-status="${(user.status||'')}" title="${user.nickname || 'User'}">
                      <span>${safeInitial}</span>
                    </div>`;
          }
        }).join('');
        
        // 클릭 이벤트 바인딩
        container.querySelectorAll('.user-avatar').forEach(avatar => {
          avatar.addEventListener('click', () => {
            const userId = avatar.getAttribute('data-user-id');
            const nickname = avatar.getAttribute('data-nickname') || 'User';
            const avatarUrl = avatar.getAttribute('data-avatar') || '';
            const status = avatar.getAttribute('data-status') || '';
            
            openProfile(userId, nickname, avatarUrl);
          });
        });
        
        // 섹션 표시
        section.style.display = 'block';
      },
      
      // 사용자 추가
      addUser: (user) => {
        const existingIndex = AppState.connectedUsers.findIndex(u => u.userId === user.userId);
        if (existingIndex >= 0) {
          // 기존 사용자 업데이트
          AppState.connectedUsers[existingIndex] = user;
        } else {
          // 새 사용자 추가
          AppState.connectedUsers.push(user);
        }
        ConnectedUsersUI.render(AppState.connectedUsers);
      },
      
      // 사용자 제거
      removeUser: (userId) => {
        AppState.connectedUsers = AppState.connectedUsers.filter(u => u.userId !== userId);
        ConnectedUsersUI.render(AppState.connectedUsers);
      },
      
      // 사용자 정보 업데이트
      updateUser: (user) => {
        const existingIndex = AppState.connectedUsers.findIndex(u => u.userId === user.userId);
        if (existingIndex >= 0) {
          AppState.connectedUsers[existingIndex] = { ...AppState.connectedUsers[existingIndex], ...user };
          ConnectedUsersUI.render(AppState.connectedUsers);
        }
      },
      
      // 전체 목록 설정
      setUsers: (users) => {
        AppState.connectedUsers = users || [];
        ConnectedUsersUI.render(AppState.connectedUsers);
      }
    };

    /* ===== API 호출 함수들 ===== */
    async function apiCall(method, url, body = null) {
      try {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };
        
        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'API 요청 실패');
        }
        
        return await response.json();
      } catch (error) {
        throw error;
      }
    }

    /* ===== Reactions ===== */
    function reactsToCounts(reactions){
      const counts = [];
      for (const k of Object.keys(reactions||{})){
        const arr = reactions[k]||[];
        if (arr.length) counts.push({emoji:k, count:arr.length, mine:(arr.indexOf(AppState.userId)>=0)});
      }
      counts.sort((a,b)=> b.count-a.count || CONFIG.EMOJIS.indexOf(a.emoji)-CONFIG.EMOJIS.indexOf(b.emoji));
      return counts;
    }
    function renderReactsHtml(m){
      const sig = Utils.createReactionSignature(m.reactions||{});
      const chips = reactsToCounts(m.reactions||{}).map(c=>`<span class="chip ${c.mine?'mine':''}" data-mid="${m.mid}" data-emoji="${c.emoji}">${c.emoji} ${c.count}</span>`).join('');
      const picker = CONFIG.EMOJIS.map(e=>`<button class="pick" data-mid="${m.mid}" data-emoji="${e}" title="반응 추가">${e}</button>`).join('');
      return `<div class="reacts" id="reacts-${m.mid}" data-sig='${sig}'>
        <div class="chips">${chips}</div>
        <button class="add-react" data-mid="${m.mid}" title="반응 추가">＋</button>
        <div class="picker hidden" id="picker-${m.mid}">${picker}</div>
      </div>`;
    }
    function bindReactionHandlers(mid){
      const root = document.getElementById('reacts-'+mid); if(!root) return;
      root.querySelectorAll('.chip').forEach(ch=>{
        ch.onclick = (e)=>{ e.stopPropagation(); reactToggle(mid, ch.getAttribute('data-emoji')); };
      });
      const addBtn = root.querySelector('.add-react');
      if (addBtn){
        addBtn.onclick = (e)=>{ e.stopPropagation(); const p=document.getElementById('picker-'+mid); if(p) p.classList.toggle('hidden'); };
      }
      root.querySelectorAll('.pick').forEach(b=>{
        b.onclick = (e)=>{ e.stopPropagation(); reactToggle(mid, b.getAttribute('data-emoji')); const p=document.getElementById('picker-'+mid); if(p) p.classList.add('hidden'); };
      });
    }
    function updateReactsView(m){
      const node = document.getElementById('reacts-'+m.mid);
      if (!node) return;
      const pickerOpen = !(node.querySelector('.picker')?.classList.contains('hidden'));
      const oldSig = node.dataset.sig || '';
      const newSig = Utils.createReactionSignature(m.reactions||{});
      if (pickerOpen || oldSig === newSig) return;
      node.outerHTML = renderReactsHtml(m);
      bindReactionHandlers(m.mid);
    }
    
    // 🔗 답글 버튼 이벤트 핸들러
    function bindReplyHandlers(mid){
      const replyBtn = document.querySelector(`[data-mid="${mid}"].reply-btn`);
      if (replyBtn) {
        replyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetMid = replyBtn.getAttribute('data-mid');
          const targetNick = replyBtn.getAttribute('data-nick');
          ReplyManager.startReply(targetMid, targetNick);
        });
      }
    }
    async function reactToggle(mid, emoji){
      try {
        const result = await apiCall('POST', '/api/reactions', { mid, userId: AppState.userId, emoji });
        updateReactsView(result);
        beep();
      } catch (error) {
        alert('반응 실패: ' + error.message);
      }
    }

    /* ===== Profile Modal ===== */
    function showProfileModal(nickname, avatar, status){
      DOM.el('#pname').textContent = nickname || 'User';
      DOM.el('#pstatus').textContent = status ? status : '상태메시지 없음';
      const img = DOM.el('#pimg');
      if (avatar && avatar.trim()){
        img.style.display='block';
        img.onerror = ()=>{ img.style.display='none'; img.removeAttribute('src'); };
        img.src = avatar;
      } else {
        img.removeAttribute('src');
        img.style.display='none';
      }
      DOM.el('#pmodal').classList.add('show');
      DOM.el('#pmodal').setAttribute('aria-hidden','false');
    }
    function hideProfileModal(){
      DOM.el('#pmodal').classList.remove('show');
      DOM.el('#pmodal').setAttribute('aria-hidden','true');
    }
    function bindProfileModalBasics(){
      DOM.el('#pback').addEventListener('click', hideProfileModal);
      DOM.el('#pclose').addEventListener('click', hideProfileModal);
      window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideProfileModal(); });
    }
    async function openProfile(uid, fallbackNick, fallbackAvatar){
      showProfileModal(fallbackNick, fallbackAvatar, '불러오는 중…');
      try {
        const profile = await apiCall('GET', `/api/profile/${uid}`);
        showProfileModal(profile.nickname || fallbackNick, profile.avatar || fallbackAvatar, profile.status || '');
      } catch (error) {
        showProfileModal(fallbackNick, fallbackAvatar, '');
      }
    }

    /* ===== 메시지 정보 조회 함수 ===== */
    async function fetchMessageInfo(messageId) {
      try {
        console.log(`🔍 서버에서 메시지 조회 시작: ${messageId}`);
        const response = await apiCall('GET', `/api/messages/single/${messageId}`);
        console.log(`✅ 서버에서 메시지 조회 성공:`, response);
        return response;
      } catch (error) {
        console.error(`❌ 서버에서 메시지 조회 실패 (${messageId}):`, error);
        throw error;
      }
    }

    /* ===== Messages ===== */
    function addOrUpdateMsg(m){
      if (document.getElementById('reacts-'+(m.mid||''))){ updateReactsView(m); return; }
      if (m.mid && AppState.cache.renderedMids[AppState.currentRoom].has(m.mid)) return;
      if (m.mid) AppState.cache.renderedMids[AppState.currentRoom].set(m.mid, m);

      const dayKey = DateUtils.getDateKey(m.ts);
      if (AppState.cache.lastDayRendered[AppState.currentRoom] !== dayKey){
        AppState.cache.lastDayRendered[AppState.currentRoom] = dayKey;
        const sep = document.createElement('div');
        sep.className = 'day-sep';
        sep.innerHTML = `<span class="day-chip">${DateUtils.formatDateLabel(m.ts)}</span>`;
        messagesEl.appendChild(sep);
      }

      const stayAtBottom = ScrollManager.isAtBottom();

      const row=document.createElement('div');
      const isMe = (m.userId === AppState.userId);
      row.className='msg-row '+(isMe?'me':'other');

      let avatarHtml='';
      if (!isMe){
        const safeInitial = initialLetter(m.nickname||'');
        if (m.avatar){
          avatarHtml = `<button type="button" class="avatar-sm p-open" data-uid="${m.userId}" data-nick="${(m.nickname||'')}" data-av="${(m.avatar||'')}">
                          <img src="${m.avatar}" onerror="this.remove();this.parentElement.textContent='${safeInitial}';" />
                        </button>`;
        } else {
          avatarHtml = `<button type="button" class="avatar-sm p-open" data-uid="${m.userId}" data-nick="${(m.nickname||'')}" data-av=""><span>${safeInitial}</span></button>`;
        }
      } else { avatarHtml = `<div class="avatar-sm" style="display:none;"></div>`; }

      let bubbleInner='';
      if (m.kind==='image' && m.mediaUrl){
        const key = m.mid || m.ts;
        // 🚀 이미지 지연 로딩 구현
        bubbleInner =
          `<div><img id="img-${key}" class="lazy-image" data-src="${m.mediaUrl}" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='200'%20height='100'%3E%3Crect%20fill='%23f3f4f6'%20width='200'%20height='100'/%3E%3Ctext%20fill='%23a3a3a3'%20x='50%25'%20y='50%25'%20text-anchor='middle'%20dy='.3em'%20font-size='12'%3E이미지 로딩 중...%3C/text%3E%3C/svg%3E" alt="${(m.fileName||'image')}" style="max-width:100%; border-radius:12px;" /></div>
           <div class="meta">${(m.nickname||'')} · ${DateUtils.formatTimeLabel(m.ts)}</div>`;
      } else {
        bubbleInner =
          `<div>${(m.text||'').replace(/\n/g,'<br/>')}</div>
           <div class="meta">${(m.nickname||'')} · ${DateUtils.formatTimeLabel(m.ts)}</div>`;
      }

      // 🔗 답글 대상 표시 HTML 생성
      let replyTargetHtml = '';
      if (m.replyTo) {
        // 답글인 경우 원본 메시지 정보 표시
        let targetName = m.replyToNickname;
        
        // 1차 fallback: 메시지 캐시에서 답글 대상 찾기
        if (!targetName || targetName === 'User') {
          const targetMessage = AppState.cache.renderedMids[AppState.currentRoom].get(m.replyTo);
          if (targetMessage && targetMessage.nickname) {
            targetName = targetMessage.nickname;
            console.log(`🔍 캐시에서 답글 대상 찾음: ${targetName}`);
          }
        }
        
        // 2차 fallback: DOM에서 답글 대상 메시지 찾기
        if (!targetName || targetName === 'User') {
          const targetElement = document.querySelector(`[data-mid="${m.replyTo}"] .meta`);
          if (targetElement) {
            const metaText = targetElement.textContent;
            const nickMatch = metaText.match(/^(.+?)\s+·/);
            if (nickMatch) {
              targetName = nickMatch[1];
              console.log(`🔍 DOM에서 답글 대상 찾음: ${targetName}`);
            }
          }
        }
        
        // 3차 fallback: 서버에서 메시지 정보 조회 (비동기)
        if (!targetName || targetName === 'User') {
          targetName = '답글 대상 조회 중...';
          // 비동기로 서버에서 메시지 정보 조회
          fetchMessageInfo(m.replyTo).then(messageInfo => {
            if (messageInfo && messageInfo.nickname) {
              // DOM 업데이트 - 카카오톡 스타일 미리보기로 변경
              const replyTargetEl = document.querySelector(`[data-mid="${m.mid}"] .reply-target`);
              if (replyTargetEl) {
                const originalContent = messageInfo.text || '메시지';
                replyTargetEl.innerHTML = `
                  <span class="original-user">${messageInfo.nickname}</span>
                  <span class="original-content">${originalContent}</span>
                `;
                replyTargetEl.setAttribute('data-reply-to', m.replyTo);
                replyTargetEl.setAttribute('onclick', `scrollToMessage('${m.replyTo}')`);
                console.log(`🔍 서버에서 답글 대상 찾음: ${messageInfo.nickname}`);
              }
            }
          }).catch(error => {
            console.warn(`⚠️ 서버에서 답글 대상 조회 실패:`, error);
            // 최후의 fallback
            const replyTargetEl = document.querySelector(`[data-mid="${m.mid}"] .reply-target`);
            if (replyTargetEl) {
              replyTargetEl.innerHTML = `
                <span class="original-user">알 수 없는 사용자</span>
                <span class="original-content">메시지</span>
              `;
            }
          });
        }
        
        // 원본 메시지 내용 가져오기
        let originalContent = m.replyToText || '';
        if (!originalContent) {
          // 캐시에서 원본 메시지 내용 찾기
          const targetMessage = AppState.cache.renderedMids[AppState.currentRoom].get(m.replyTo);
          if (targetMessage && targetMessage.text) {
            originalContent = targetMessage.text;
          } else {
            // DOM에서 원본 메시지 내용 찾기
            const targetElement = document.querySelector(`[data-mid="${m.replyTo}"] .bubble-text`);
            if (targetElement) {
              originalContent = targetElement.textContent;
            }
          }
        }
        
        // 카카오톡 스타일 미리보기 HTML 생성
        replyTargetHtml = `
          <div class="reply-target" data-reply-to="${m.replyTo}" onclick="scrollToMessage('${m.replyTo}')">
            <span class="original-user">${targetName}</span>
            <span class="original-content">${originalContent || '메시지'}</span>
          </div>
        `;
        row.classList.add('reply');
        // 스레드 연결선 표시
        if (!isMe) {
          bubbleInner = `<div class="thread-indicator"></div>${bubbleInner}`;
        }
      }
      
      // 🔗 답글 버튼 HTML
      const replyBtnHtml = `<button class="reply-btn" data-mid="${m.mid}" data-nick="${m.nickname || 'User'}" title="답글" aria-label="답글">↳</button>`;
      
      const reactsHtml = renderReactsHtml(m);
      
      // 메시지 컨테이너 구조 개선
      const messageContent = `${replyTargetHtml}<div>${(m.kind === 'image' && m.mediaUrl) ? 
        `<img id="img-${m.mid || m.ts}" class="lazy-image" data-src="${m.mediaUrl}" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='200'%20height='100'%3E%3Crect%20fill='%23f3f4f6'%20width='200'%20height='100'/%3E%3Ctext%20fill='%23a3a3a3'%20x='50%25'%20y='50%25'%20text-anchor='middle'%20dy='.3em'%20font-size='12'%3E이미지 로딩 중...%3C/text%3E%3C/svg%3E" alt="${m.fileName || 'image'}" style="max-width:100%; border-radius:12px;" />` 
        : (m.text || '').replace(/\n/g,'<br/>')}</div>
           <div class="meta">${(m.nickname||'')} · ${DateUtils.formatTimeLabel(m.ts)}</div>${reactsHtml}`;
      
      row.innerHTML = `${avatarHtml}<div class="message-container"><div class="bubble">${messageContent}</div>${replyBtnHtml}</div>`;
      messagesEl.appendChild(row);

      bindReactionHandlers(m.mid);
      bindReplyHandlers(m.mid);

      row.querySelectorAll('.p-open').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const uid = btn.getAttribute('data-uid');
          const nn  = btn.getAttribute('data-nick') || 'User';
          const av  = btn.getAttribute('data-av') || '';
          openProfile(uid, nn, av);
        });
      });

      const img = row.querySelector(m.kind==='image' ? `#img-${CSS.escape(m.mid||m.ts)}` : null);
      if (img && m.kind === 'image'){ 
        // base64 이미지는 직접 src로 설정되므로 일반적으로 오류가 발생하지 않음
        img.onerror = ()=>{ 
          console.error('이미지 로드 실패:', m.mediaUrl?.substring(0, 50) + '...');
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'padding:8px; text-align:center; color:#666; border:1px dashed #ccc; border-radius:8px;';
          errorDiv.textContent = '이미지를 불러올 수 없습니다';
          img.replaceWith(errorDiv);
        };
      }

      if (stayAtBottom) {
        ScrollManager.scrollToBottom(false);
      }
      
      // 🚀 새로 추가된 이미지 관찰 등록
      LazyImageManager.observeImages();
    }

    /* ===== 데이터 관리 ===== */
    const DataManager = {
      // 과거 메시지 로드 (무한 스크롤용)
      loadPastMessages: async () => {
        if (!AppState.userId) return false;
        
        const roomData = AppState.cache.pagination?.[AppState.currentRoom];
        if (!roomData || !roomData.hasMore || !roomData.oldestTimestamp) {
          console.log('더 이상 로드할 과거 메시지가 없습니다.');
          return false;
        }
        
        try {
          const response = await apiCall('GET', `/api/messages/${AppState.currentRoom}?before=${roomData.oldestTimestamp}&limit=100`);
          const messages = response?.messages || [];
          const hasMore = response?.hasMore || false;
          const oldestTs = response?.oldestTimestamp || null;
          
          if (messages && messages.length > 0) {
            // 스크롤 위치 보존을 위해 현재 상태 저장
            const savedPosition = ScrollManager.saveScrollPosition();
            
            // 메시지들을 맨 위에 추가 (시간 순서대로)
            messages.forEach(msg => {
              if (!AppState.cache.renderedMids[AppState.currentRoom].has(msg.mid)) {
                const messageDiv = UI.messageDiv(msg, false); // 스크롤 없이 추가
                messagesEl.insertBefore(messageDiv, messagesEl.firstChild);
                AppState.cache.renderedMids[AppState.currentRoom].set(msg.mid, msg);
              }
            });
            
            // 페이징 정보 업데이트
            AppState.cache.pagination[AppState.currentRoom] = {
              hasMore: hasMore,
              oldestTimestamp: oldestTs
            };
            
            // 스크롤 위치 복원 (새로 추가된 메시지만큼 아래로 이동)
            ScrollManager.restoreScrollPosition(savedPosition);
            
            // 🚀 새로 로드된 과거 이미지들 관찰 등록
            LazyImageManager.observeImages();
            
            console.log(`과거 메시지 ${messages.length}개 로드 완료`);
            return true;
          }
          return false;
        } catch (error) {
          console.error('과거 메시지 로드 실패:', error);
          return false;
        }
      },

      fetchAndRender: async (forceScroll, fullReload = false) => {
        if(!AppState.userId) return;
        
        try {
          // 방 전환 시에는 전체 메시지 다시 로드, 아니면 증분 로드
          const since = fullReload ? 0 : (AppState.cache.lastTs[AppState.currentRoom] || 0);
          const response = await apiCall('GET', `/api/messages/${AppState.currentRoom}?since=${since}`);
          
          // 새로운 API 응답 구조 처리
          const messages = response?.messages || response || []; // 하위 호환성 유지
          const hasMore = response?.hasMore || false;
          const oldestTs = response?.oldestTimestamp || null;
          
          // 🚀 로딩 스켈레톤 제거
          if (fullReload) {
            const loadingSkeleton = messagesEl.querySelector('.loading-skeleton');
            if (loadingSkeleton) {
              messagesEl.removeChild(loadingSkeleton);
            }
          }
          
          if(messages && messages.length){
            messages.forEach(addOrUpdateMsg);
            AppState.cache.lastTs[AppState.currentRoom] = Math.max(AppState.cache.lastTs[AppState.currentRoom]||0, messages[messages.length-1].ts||0);
            
            // 무한 스크롤 메타데이터 저장
            if (!AppState.cache.pagination) AppState.cache.pagination = {};
            AppState.cache.pagination[AppState.currentRoom] = {
              hasMore: hasMore,
              oldestTimestamp: oldestTs
            };
            
            if (forceScroll) {
              ScrollManager.scrollToBottom(false);
            }
          }
          
          // 더 보기 버튼 상태 업데이트
          MessageManager.updateLoadMoreButton();
          
          // 🚀 새로 로드된 이미지들 관찰 등록
          LazyImageManager.observeImages();
          
          const t = new Date().toLocaleTimeString();
          DOM.el('#topStatus').textContent = `연결됨 · ${t}`;
        } catch (error) {
          console.error(error);
          DOM.el('#topStatus').textContent = '연결 끊김';
        }
      }
    };

    /* ===== 메시지 관리자 ===== */
    const MessageManager = {
      observer: null,
      isLoading: false,

      // 더 보기 버튼 상태 업데이트
      updateLoadMoreButton: () => {
        const btn = DOM.el('#loadMoreBtn');
        const roomData = AppState.cache.pagination?.[AppState.currentRoom];
        
        if (roomData && roomData.hasMore) {
          btn.style.display = 'flex';
        } else {
          btn.style.display = 'none';
        }
      },

      // Intersection Observer 초기화
      initIntersectionObserver: () => {
        if (!window.IntersectionObserver) {
          console.warn('Intersection Observer를 지원하지 않는 브라우저입니다.');
          return;
        }

        const loadMoreBtn = DOM.el('#loadMoreBtn');
        
        MessageManager.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !MessageManager.isLoading) {
              const roomData = AppState.cache.pagination?.[AppState.currentRoom];
              if (roomData && roomData.hasMore) {
                MessageManager.loadPastMessagesAuto();
              }
            }
          });
        }, {
          root: DOM.el('#messages'),
          rootMargin: '20px',
          threshold: 0.1
        });

        if (loadMoreBtn) {
          MessageManager.observer.observe(loadMoreBtn);
        }
      },

      // 자동 로드 (Intersection Observer 용)
      loadPastMessagesAuto: async () => {
        if (MessageManager.isLoading) return;
        
        MessageManager.isLoading = true;
        console.log('[AUTO-LOAD] 과거 메시지 자동 로드 시작');

        try {
          const success = await DataManager.loadPastMessages();
          if (success) {
            MessageManager.updateLoadMoreButton();
          }
        } catch (error) {
          console.error('자동 로드 실패:', error);
        } finally {
          MessageManager.isLoading = false;
        }
      },

      // 방 전환 시 버튼 상태 초기화 및 Observer 재설정
      onRoomSwitch: () => {
        MessageManager.updateLoadMoreButton();
        
        // Observer 재설정 (새로운 버튼에 대해)
        if (MessageManager.observer) {
          MessageManager.observer.disconnect();
        }
        
        setTimeout(() => {
          MessageManager.initIntersectionObserver();
        }, 100); // DOM 업데이트 후 Observer 재설정
      }
    };
    
    // 레거시 지원
    async function fetchAndRender(forceScroll){
      return DataManager.fetchAndRender(forceScroll);
    }
    

    async function initMe(){
      try {
        const u = await apiCall('POST', `/api/user/${AppState.userId}`);
        AppState.me = u;
        DOM.el('#nickname').value = u.nickname || '';
        DOM.el('#status').value = u.status || '';
        DOM.el('#avatar').value = u.avatar || '';
        DOM.el('#clearAvatar').checked = false;
        DOM.el('#nicknameView').textContent = u.nickname || 'User';
        DOM.el('#statusView').textContent = u.status || '상태메시지…';
        DOM.el('#topStatus').textContent = (u.nickname || 'User') + (u.status ? ` — ${u.status}` : '');
        setAvatar(u.avatar || '');
        UI.drawTabs();
        
        // 🚀 이미지 지연 로딩 시스템 초기화
        LazyImageManager.init();
        
        DataManager.fetchAndRender(true);
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    }

    /* ===== Send / Upload ===== */
    async function sendText(){
      if(!AppState.userId || AppState.flags.sending) return;
      const t = DOM.el('#text');
      const v = Utils.sanitizeInput(t.value);
      if(!v) return;

      // 🔔 첫 메시지 전송 시 알림 권한 자동 요청
      if (Notification.permission === 'default' && !AppState.notifications.permissionRequested) {
        console.log('🔔 첫 메시지 전송 - 알림 권한 요청');
        AppState.notifications.permissionRequested = true;
        
        try {
          const permission = await notificationManager.requestPermission();
          if (permission === 'granted') {
            console.log('✅ 알림 권한 허용됨 - Push 시스템 초기화');
            notificationManager.initializePush();
          }
        } catch (error) {
          console.warn('⚠️ 알림 권한 요청 실패:', error);
        }
      }

      const sendRoom = AppState.currentRoom;
      AppState.flags.sending = true;
      Utils.setButtonLoading(DOM.el('#sendBtn'), true);
      const mid = Utils.generateMessageId();

      try {
        const requestBody = {
          room: sendRoom,
          userId: AppState.userId,
          text: v,
          mid
        };
        
        // 🔗 답글 정보 추가
        if (AppState.reply.active && AppState.reply.targetMid) {
          requestBody.replyTo = AppState.reply.targetMid;
        }
        
        const result = await apiCall('POST', '/api/messages', requestBody);
        
        AppState.flags.sending = false;
        Utils.setButtonLoading(DOM.el('#sendBtn'), false);
        t.value = '';
        
        // 🔗 답글 모드 종료
        if (AppState.reply.active) {
          ReplyManager.cancelReply();
        }
        
        AppState.cache.lastTs[sendRoom] = Math.max(AppState.cache.lastTs[sendRoom]||0, result.ts||0);
        if (AppState.currentRoom !== sendRoom) return;
        // 실시간으로 이미 받았을 수 있으므로 중복 체크 후 추가
        if (!AppState.cache.renderedMids[sendRoom].has(result.mid)) {
          addOrUpdateMsg(result);
        }
        beep();
      } catch (error) {
        AppState.flags.sending = false;
        Utils.setButtonLoading(DOM.el('#sendBtn'), false);
        alert('전송 실패: '+error.message);
      }
    }

    /* ===== Logout ===== */
    function doLogout(){
      socket.emit('leaveRoom', AppState.currentRoom);
      AppState.userId=null; AppState.me=null;
      messagesEl.innerHTML='';
      Object.keys(AppState.cache.renderedMids).forEach(room => AppState.cache.renderedMids[room].clear());
      Object.keys(AppState.cache.lastTs).forEach(k=> AppState.cache.lastTs[k]=0);
      Object.keys(AppState.cache.lastDayRendered).forEach(k=> AppState.cache.lastDayRendered[k]='');
      setAvatar('');
      ['nickname','status','avatar'].forEach(id=>{ const n=DOM.el('#'+id); if(n) n.value=''; });
      const ca = DOM.el('#clearAvatar'); if (ca) ca.checked = false;
      DOM.el('#nicknameView').textContent='User';
      DOM.el('#statusView').textContent='상태메시지…';
      DOM.el('#topStatus').textContent='—';
      enableUI(false);

      DOM.el('#loginName').value='';
      DOM.el('#loginBirth').value='';
      DOM.el('#auth').classList.remove('hidden');
      document.body.classList.add('auth-open');

      document.body.classList.remove('profile-open');
      hideProfileModal();
      
      // 접속자 목록 초기화
      ConnectedUsersUI.setUsers([]);
    }

    function bindUI(){
      console.log('[UI] bindUI 함수 시작 - 안전한 이벤트 바인딩 적용');
      
      try {
        // 안전한 이벤트 바인딩 - Fail Fast 원칙 적용
        if (!DOM.safeAssign('#sendBtn', 'onclick', sendText)) {
          console.error('[UI] sendBtn 바인딩 실패');
        }
        
        const textElement = DOM.el('#text');
        if (textElement) {
          textElement.addEventListener('keydown', e => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
              e.preventDefault(); 
              sendText(); 
            } 
          });
        } else {
          console.warn('[UI] text 입력 요소를 찾을 수 없습니다');
        }

        // 프로필 저장 - 안전한 바인딩과 에러 처리 강화
        const saveBtn = DOM.el('#saveBtn');
        if (saveBtn) {
          saveBtn.onclick = async () => {
            try {
              // Fail Fast 원칙: 조기 검증
              if (!AppState.userId) {
                console.warn('[프로필] 사용자 ID가 없습니다');
                return;
              }

              // 안전한 DOM 요소 접근
              const nicknameEl = DOM.el('#nickname');
              const statusEl = DOM.el('#status');
              const avatarEl = DOM.el('#avatar');
              const clearAvEl = DOM.el('#clearAvatar');
              
              if (!nicknameEl || !statusEl || !avatarEl || !clearAvEl) {
                throw new Error('프로필 폼 요소를 찾을 수 없습니다');
              }

              const nickname = nicknameEl.value;
              const status = statusEl.value;
              const avValue = (avatarEl.value || '').trim();
              const clearAv = clearAvEl.checked;

              const profile = { nickname, status };
              if (clearAv) profile.clearAvatar = true;   
              if (avValue) profile.avatar = avValue;     

              console.log('[프로필] 저장 시도:', profile);
              const u = await apiCall('PUT', `/api/profile/${AppState.userId}`, profile);
              
              // 안전한 UI 업데이트
              AppState.me = u;
              const nicknameView = DOM.el('#nicknameView');
              const statusView = DOM.el('#statusView');
              const topStatus = DOM.el('#topStatus');
              
              if (nicknameView) nicknameView.textContent = u.nickname || 'User';
              if (statusView) statusView.textContent = u.status || '상태메시지…';
              if (topStatus) topStatus.textContent = (u.nickname || 'User') + (u.status ? ` — ${u.status}` : '');
              
              setAvatar(u.avatar || '');
              if (avatarEl) avatarEl.value = u.avatar || '';
              if (clearAvEl) clearAvEl.checked = false;
              
              // 접속자 정보 업데이트 알림
              if (socket && socket.emit) {
                socket.emit('userProfileUpdated', {
                  userId: AppState.userId,
                  nickname: u.nickname,
                  avatar: u.avatar,
                  status: u.status
                });
              }
              
              console.log('[프로필] 저장 성공');
              beep();
            } catch (error) {
              console.error('[프로필] 저장 실패:', error);
              alert('저장 실패: ' + error.message);
            }
          };
        } else {
          console.warn('[UI] saveBtn 요소를 찾을 수 없습니다');
        }

        // 아바타 입력 시 "지우기" 자동 해제 - 안전한 바인딩
        const avatarInput = DOM.el('#avatar');
        const clearAvatarCheckbox = DOM.el('#clearAvatar');
        if (avatarInput && clearAvatarCheckbox) {
          avatarInput.addEventListener('input', () => {
            if ((avatarInput.value || '').trim()) {
              clearAvatarCheckbox.checked = false;
            }
          });
        } else {
          console.warn('[UI] 아바타 입력 요소를 찾을 수 없습니다');
        }

        // 사진 업로드 - 안전한 바인딩
        const photoBtn = DOM.el('#photoBtn');
        const imageInput = DOM.el('#image');
        
        if (photoBtn && imageInput) {
          photoBtn.onclick = () => { 
            if (AppState.userId) {
              imageInput.click(); 
            } else {
              console.warn('[업로드] 로그인이 필요합니다');
            }
          };
          
          imageInput.addEventListener('change', async () => {
            try {
              const f = imageInput.files[0];
              
              // Fail Fast 원칙: 조기 검증
              if (!AppState.userId || !f || AppState.flags.uploading) {
                console.log('[업로드] 업로드 조건 불충족');
                return;
              }
              
              if (f.size > 10 * 1024 * 1024) { 
                alert('10MB 이하만 업로드 가능합니다.'); 
                imageInput.value = ''; 
                return; 
              }

              const uploadRoom = AppState.currentRoom;
              AppState.flags.uploading = true;
              
              // 안전한 버튼 비활성화
              if (photoBtn) photoBtn.disabled = true;
              
              const mid = Utils.generateMessageId();
              console.log('[업로드] 파일 업로드 시작:', f.name);
          // 파일을 base64로 변환
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });

          const requestBody = {
            room: uploadRoom,
            userId: AppState.userId,
            mid: mid,
            imageData: base64Data,
            fileName: f.name,
            mimeType: f.type
          };

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '업로드 실패');
          }

              const result = await response.json();
              
              // 안전한 상태 복원
              AppState.flags.uploading = false;
              if (photoBtn) photoBtn.disabled = false;
              imageInput.value = '';
              
              AppState.cache.lastTs[uploadRoom] = Math.max(AppState.cache.lastTs[uploadRoom] || 0, result.ts || 0);
              if (AppState.currentRoom !== uploadRoom) return;
              if (!AppState.cache.renderedMids[uploadRoom].has(result.mid)) {
                addOrUpdateMsg(result);
              }
              
              console.log('[업로드] 업로드 성공:', result.mid);
              beep();
            } catch (error) {
              console.error('[업로드] 업로드 실패:', error);
              
              // 안전한 상태 복원
              AppState.flags.uploading = false;
              if (photoBtn) photoBtn.disabled = false;
              imageInput.value = '';
              
              alert('업로드 실패: ' + error.message);
            }
          });
        } else {
          console.warn('[UI] 사진 업로드 요소를 찾을 수 없습니다');
        }

        // 나머지 UI 바인딩 - 안전한 바인딩
        if (!DOM.safeAssign('#startBtn', 'onclick', doLogin)) {
          console.error('[UI] startBtn 바인딩 실패');
        }
        
        if (!DOM.safeAssign('#logoutBtn', 'onclick', doLogout)) {
          console.error('[UI] logoutBtn 바인딩 실패');
        }
        
        // 답글 취소 버튼
        const cancelReplyBtn = el('#cancelReply');
        if (cancelReplyBtn) {
          cancelReplyBtn.onclick = () => ReplyManager.cancelReply();
        } else {
          console.warn('[UI] cancelReply 버튼을 찾을 수 없습니다');
        }
        
        console.log('[UI] bindUI 함수 완료 - 모든 이벤트 바인딩 안전하게 처리됨');
        
      } catch (error) {
        console.error('[UI] bindUI 함수 오류:', error);
        throw error; // Re-throw to ensure caller knows about the error
      }
    }

      // 무한 스크롤 - 100개 더 보기 버튼
      el('#loadMoreBtn').onclick = async () => {
        const btn = DOM.el('#loadMoreBtn');
        const textSpan = DOM.el('.load-more-text');
        const spinnerSpan = DOM.el('.load-more-spinner');
        
        btn.disabled = true;
        textSpan.style.display = 'none';
        spinnerSpan.style.display = 'inline';
        
        try {
          const success = await DataManager.loadPastMessages();
          if (success) {
            MessageManager.updateLoadMoreButton();
          }
        } catch (error) {
          console.error('과거 메시지 로드 실패:', error);
        } finally {
          btn.disabled = false;
          textSpan.style.display = 'inline';
          spinnerSpan.style.display = 'none';
        }
      };

      // Retro toggle
      el('#toggle98').addEventListener('click', ()=>{ applyTheme98(!document.body.classList.contains('win98')); beep(); });

      // Profile button - Toggle dropdown menu
      el('#profileBtn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubble to document
        
        // 로그인 상태 확인
        if (!AppState.me || !AppState.userId) {
          alert('로그인 후 이용 가능합니다.');
          return;
        }
        
        // Toggle dropdown
        toggleProfileDropdown();
      });
      el('#scrim').addEventListener('click', ()=>{ document.body.classList.remove('profile-open'); });

      // 프로필 모달 기본 동작
      bindProfileModalBasics();

      // Dropdown logout button
      const dropdownLogoutBtn = el('#dropdownLogoutBtn');
      if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', () => {
          closeProfileDropdown();
          // Use existing logout function
          const logoutBtn = el('#logoutBtn');
          if (logoutBtn) logoutBtn.click();
        });
      }

      // 드래그 가능한 로그인 다이얼로그
      makeDialogDraggable('#dialogCard','#dlgDragHandle');

      // 리사이즈 시 탭 라벨/상태 갱신
      let lastCompact = UI.isCompact();
      window.addEventListener('resize', ()=>{
        const nowCompact = UI.isCompact();
        if (nowCompact !== lastCompact){
          UI.drawTabs(); UI.setActiveTabUI();
          lastCompact = nowCompact;
        }
      });
    }

    /* ===== Login - 현대적인 에러 처리와 상태 관리 ===== */
    async function doLogin(){
      console.log('[로그인] 로그인 프로세스 시작');
      
      try {
        // DOM 요소들을 안전하게 가져오기
        const loginBtn = DOM.el('#startBtn');
        const card = DOM.el('#dialogCard');
        const nameInput = DOM.el('#loginName');
        const birthInput = DOM.el('#loginBirth');
        const authDiv = DOM.el('#auth');

        // Fail Fast: 필수 요소 검증
        if (!loginBtn || !nameInput || !birthInput || !authDiv) {
          throw new Error('로그인 폼 요소를 찾을 수 없습니다');
        }

        // 로그인 버튼 비활성화
        loginBtn.disabled = true;
        loginBtn.textContent = '로그인 중...';

        // 입력값 검증
        const name = (nameInput.value || '').trim();
        const b4 = (birthInput.value || '').replace(/\D/g, '').slice(0, 4);
        
        if (!name || b4.length !== 4) { 
          console.warn('[로그인] 입력값 검증 실패:', { name: !!name, birth4Length: b4.length });
          
          // 시각적 피드백
          if (card) {
            card.classList.remove('shake'); 
            void card.offsetWidth; // Force reflow
            card.classList.add('shake'); 
          }
          
          // 상태 복원
          loginBtn.disabled = false;
          loginBtn.textContent = '시작하기';
          return; 
        }

        console.log('[로그인] API 호출 시작:', { name, birth4: b4 });
        const u = await apiCall('POST', '/api/login', { name, birth4: b4 });
        
        if (!u || !u.id) {
          throw new Error('서버에서 유효하지 않은 응답을 받았습니다');
        }

        // 로그인 성공 - 상태 업데이트
        console.log('[로그인] 로그인 성공:', { userId: u.id, name: u.nickname });
        AppState.userId = u.id;
        
        // UI 상태 변경
        authDiv.classList.add('hidden'); 
        document.body.classList.remove('auth-open');
        enableUI(true); 
        UI.drawTabs(); 
        
        // 사용자 정보 초기화
        await initMe();
        
        // 소켓 연결
        if (socket && socket.emit) {
          socket.emit('joinRoom', AppState.currentRoom);
          socket.emit('userLogin', { userId: AppState.userId });
        } else {
          console.warn('[로그인] 소켓이 연결되지 않았습니다');
        }
        
        console.log('[로그인] 로그인 프로세스 완료');
        beep();

      } catch (error) {
        console.error('[로그인] 로그인 실패:', error);
        
        // 사용자에게 명확한 에러 메시지 제공
        let userMessage = '로그인에 실패했습니다.';
        if (error.message.includes('네트워크')) {
          userMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('서버')) {
          userMessage = '서버와의 통신에 문제가 있습니다.';
        } else if (error.message.includes('유효하지 않은')) {
          userMessage = '로그인 정보가 올바르지 않습니다.';
        }
        
        alert(userMessage + '\n\n기술적 세부사항: ' + error.message);
        
      } finally {
        // 상태 복원 - 안전한 처리
        const loginBtn = DOM.el('#startBtn');
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = '시작하기';
        }
      }
    }

    // Dialog drag helper
    function makeDialogDraggable(cardSel, handleSel){
      const card = el(cardSel), handle = el(handleSel); if(!card||!handle) return;
      let sx=0, sy=0, ox=0, oy=0, dragging=false;
      const down=(e)=>{ dragging=true; const r=card.getBoundingClientRect(); ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY; handle.style.cursor='grabbing'; e.preventDefault(); };
      const move=(e)=>{ if(!dragging) return; const dx=e.clientX-sx, dy=e.clientY-sy; card.style.position='fixed'; card.style.left=(ox+dx)+'px'; card.style.top=(oy+dy)+'px'; };
      const up=()=>{ dragging=false; handle.style.cursor='grab'; };
      handle.addEventListener('mousedown',down); window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
    }

    // Socket.io 이벤트 핸들러 - 강화된 필터링 + 알림 통합
    socket.on('newMessage', (message) => {
      // 🔔 알림 처리 (모든 메시지에 대해)
      if (AppState.userId && message.room) {
        notificationManager.handleNewMessage(message, message.room);
      }
      
      // 강화된 방 검증: 현재 방과 완전히 일치하고 사용자가 로그인된 상태인 경우만 처리
      if (message.room === AppState.currentRoom && AppState.userId && !AppState.flags.switching) {
        addOrUpdateMsg(message);
        AppState.cache.lastTs[AppState.currentRoom] = Math.max(AppState.cache.lastTs[AppState.currentRoom] || 0, message.ts || 0);
      }
      // 다른 방 메시지나 방 전환 중인 메시지는 완전 무시
    });

    socket.on('reactionUpdate', (message) => {
      // 반응 업데이트도 동일한 검증 적용
      if (message.room === AppState.currentRoom && AppState.userId && !AppState.flags.switching) {
        updateReactsView(message);
      }
    });

    // ===== 접속자 관련 Socket 이벤트 =====
    socket.on('connectedUsersList', (data) => {
      ConnectedUsersUI.setUsers(data.users || []);
    });

    socket.on('userConnected', (user) => {
      ConnectedUsersUI.addUser(user);
    });

    socket.on('userDisconnected', (data) => {
      ConnectedUsersUI.removeUser(data.userId);
    });

    socket.on('userProfileUpdated', (user) => {
      ConnectedUsersUI.updateUser(user);
    });

    /* ===== iOS 주소창 높이 변동 대응용 --vh 세팅 ===== */
    (function setVhUnit(){
      const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      setVh();
      window.addEventListener('resize', setVh, {passive:true});
      window.addEventListener('orientationchange', setVh, {passive:true});
    })();

    // ===== Boot =====
    (function boot(){
      bindUI(); enableUI(false);
      // 로그인 자동완성 방지 + 항상 빈칸
      const ln=el('#loginName'), lb=el('#loginBirth');
      ln.name='n_'+Math.random().toString(36).slice(2); lb.name='b_'+Math.random().toString(36).slice(2);
      ln.value=''; lb.value='';
      restoreTheme98(); // 테마 복원
      attachBeepTo('.tab,.btn,.chip,.add-react,.pick');
      
      // 무한 스크롤 Intersection Observer 초기화
      MessageManager.initIntersectionObserver();
      
      // 🔔 NotificationManager 초기화
      notificationManager.init();
      setupNotificationUI();
    })();

    /* ===== 🔔 알림 설정 UI 핸들러 ===== */
    function setupNotificationUI() {
      const elements = {
        requestBtn: el('#requestNotificationBtn'),
        permissionRequestArea: el('#permissionRequestArea'),
        permissionDeniedArea: el('#permissionDeniedArea'),
        // 모든 UI 요소 제거됨 - 기본 알림만 사용
      };

      // UI 상태 업데이트
      function updateUI() {
        const { settings, permission } = AppState.notifications;
        
        // 권한 상태에 따른 UI 조정
        if (permission === 'denied' || !('Notification' in window)) {
          // 권한이 거부되었거나 지원되지 않는 경우
          elements.permissionRequestArea.style.display = 'none';
          elements.permissionDeniedArea.style.display = 'block';
          // 브라우저 알림 체크박스 제거됨
        } else if (permission === 'default') {
          // 권한이 아직 요청되지 않은 경우
          elements.permissionRequestArea.style.display = 'block';
          elements.permissionDeniedArea.style.display = 'none';
          // 브라우저 알림 체크박스 제거됨
        } else if (permission === 'granted') {
          // 권한이 허용된 경우
          elements.permissionRequestArea.style.display = 'none';
          elements.permissionDeniedArea.style.display = 'none';
          // 브라우저 알림 체크박스 제거됨
        }
        
        // 체크박스 제거됨 - 모든 알림 항상 활성
        
        // 소리 설정 UI 제거됨 - 기본값 사용
      }

      // 설정 저장 헬퍼
      function saveAndUpdate() {
        notificationManager.saveSettings();
        updateUI();
      }

      // 🔔 권한 요청
      elements.requestBtn?.addEventListener('click', async () => {
        elements.requestBtn.disabled = true;
        elements.requestBtn.innerHTML = '<span class="spinner"></span> 요청 중...';
        
        const permission = await notificationManager.requestPermission();
        
        // 권한 요청 결과에 따른 피드백
        if (permission === 'granted') {
          elements.requestBtn.innerHTML = '✅ 허용됨';
          // 오디오 초기화도 시도
          await notificationManager.initializeAudio();
          
          // 테스트 알림 표시
          setTimeout(() => {
            notificationManager.showNotification('알림 설정 완료! 🎉', {
              body: 'Eastalk에서 새 메시지 알림을 보내드릴 수 있어요',
              icon: '/favicon.ico'
            });
          }, 500);
        } else if (permission === 'denied') {
          elements.requestBtn.innerHTML = '❌ 거부됨';
        } else {
          elements.requestBtn.innerHTML = '⚠️ 취소됨';
        }
        
        // 1.5초 후 원래 텍스트로 복원
        setTimeout(() => {
          elements.requestBtn.disabled = false;
          elements.requestBtn.innerHTML = '🔔 브라우저 알림 허용하기';
          updateUI();
        }, 1500);
      });

      // 브라우저 알림 및 소리 알림 체크박스 제거됨 - 항상 활성

      // 탭 제목 및 스마트 모드 체크박스 제거됨 - 항상 활성

      // 소리 종류 선택 제거됨

      // 볼륨 조절 제거됨

      // 소리 테스트 제거됨

      // 초기 UI 상태 설정
      updateUI();
      
      // 프로필 모달이 열릴 때마다 UI 업데이트
      const pmodal = el('#pmodal');
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (pmodal.classList.contains('show')) {
              setTimeout(updateUI, 100); // 모달 애니메이션 후 업데이트
            }
          }
        });
      });
      
      if (pmodal) {
        observer.observe(pmodal, { attributes: true });
      }
      
      console.log('🔔 알림 설정 UI 초기화 완료');
    }

    // 🔗 전역 스크롤 네비게이션 함수
    window.scrollToMessage = function(messageId) {
      if (ScrollManager && ScrollManager.scrollToMessage) {
        return ScrollManager.scrollToMessage(messageId);
      } else {
        console.warn('ScrollManager가 아직 초기화되지 않았습니다.');
        return false;
      }
    };

    // ===== Initialize Modern Profile System =====
    // Initialize work status on page load
    document.addEventListener('DOMContentLoaded', function() {
      initializeWorkStatus();
      console.log('🔧 Modern Profile System initialized');
    });

    // Initialize work status when user logs in
    const originalUpdateProfile = window.updateProfileUI || updateProfileUI;
    window.updateProfileUI = function() {
      originalUpdateProfile.apply(this, arguments);
      initializeWorkStatus(); // Re-initialize work status on profile update
      updateDropdownInfo(); // Update dropdown info
    };
  </script>