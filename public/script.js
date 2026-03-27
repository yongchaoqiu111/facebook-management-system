// 技能任务管理功能
if (document.getElementById('addTaskForm')) {
    // 平台技能映射
    const platformSkills = {
        'general': [
            { value: 'hot-search-explorer', label: '热搜词探索' },
            { value: 'hot-search-interact', label: '热搜词二次交互' }
        ],
        'facebook': [
            { value: 'facebook-auto-post', label: 'Facebook自动发帖' },
            { value: 'facebook-comment-intercept', label: 'Facebook评论截流' },
            { value: 'facebook-join-groups', label: 'Facebook加入小组' },
            { value: 'facebook-auto-comment', label: 'Facebook自动评论' },
            { value: 'facebook-auto-like', label: 'Facebook自动点赞' },
            { value: 'facebook-auto-message', label: 'Facebook自动私信' }
        ],
        'instagram': [
            { value: 'instagram-auto-post', label: 'Instagram自动发帖' },
            { value: 'instagram-download-media', label: 'Instagram媒体下载' }
        ]
    };

    // 加载任务列表
    async function loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            
            if (data.success) {
                renderTasks(data.tasks);
            } else {
                showMessage('加载任务失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请稍后重试', 'error');
            console.error('加载任务失败:', error);
        }
    }

    // 渲染任务列表
    function renderTasks(tasks) {
        const tasksList = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            tasksList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">暂无任务</p>';
            return;
        }

        tasksList.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-skill">${getSkillName(task.skill)}</div>
                    <div class="task-time">
                        执行时间: ${task.time}
                        ${task.status?.status ? ` | 状态: ${getStatusText(task.status.status)}` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-danger" onclick="deleteTask('${task.id}')">删除</button>
                </div>
            </div>
        `).join('');
    }

    // 获取技能名称
    function getSkillName(skillId) {
        const skillMap = {
            'hot-search-explorer': '热搜词探索',
            'hot-search-interact': '热搜词二次交互',
            'facebook-auto-post': 'Facebook自动发帖',
            'instagram-auto-post': 'Instagram自动发帖',
            'instagram-download-media': 'Instagram媒体下载',
            'facebook-comment-intercept': 'Facebook评论截流',
            'facebook-join-groups': 'Facebook加入小组',
            'facebook-auto-comment': 'Facebook自动评论',
            'facebook-auto-like': 'Facebook自动点赞',
            'facebook-auto-message': 'Facebook自动私信'
        };
        return skillMap[skillId] || skillId;
    }

    // 更新技能选择列表
    function updateSkillSelect(platform) {
        const skillSelect = document.getElementById('skillSelect');
        skillSelect.innerHTML = '';
        
        if (!platform) {
            skillSelect.innerHTML = '<option value="">请先选择平台</option>';
            return;
        }

        const skills = platformSkills[platform] || [];
        
        if (skills.length === 0) {
            skillSelect.innerHTML = '<option value="">该平台暂无技能</option>';
            return;
        }

        skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill.value;
            option.textContent = skill.label;
            skillSelect.appendChild(option);
        });
    }

    // 平台选择事件监听
    document.getElementById('platformSelect').addEventListener('change', function() {
        const platform = this.value;
        updateSkillSelect(platform);
    });

    // 获取状态文本
    function getStatusText(status) {
        const statusMap = {
            'scheduled': '已调度',
            'running': '运行中',
            'success': '成功',
            'failed': '失败'
        };
        return statusMap[status] || status;
    }

    // 删除任务
    window.deleteTask = async function(taskId) {
        if (!confirm('确定要删除这个任务吗？')) {
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                showMessage('任务删除成功', 'success');
                loadTasks();
            } else {
                showMessage('删除任务失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请稍后重试', 'error');
            console.error('删除任务失败:', error);
        }
    };

    // 添加任务表单提交
    document.getElementById('addTaskForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const skill = document.getElementById('skillSelect').value;
        const time = document.getElementById('timeInput').value;

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ skill, time })
            });
            const data = await response.json();
            
            if (data.success) {
                showMessage('任务添加成功', 'success');
                document.getElementById('addTaskForm').reset();
                loadTasks();
            } else {
                showMessage(data.message || '添加任务失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请稍后重试', 'error');
            console.error('添加任务失败:', error);
        }
    });

    // 页面加载时加载任务列表
    document.addEventListener('DOMContentLoaded', loadTasks);
}

// API Key管理功能
if (document.getElementById('apiKeyForm')) {
    // 加载API Key状态
    async function loadApiKeyStatus() {
        try {
            const response = await fetch('/api/api-key/status');
            const data = await response.json();
            
            if (data.success) {
                renderApiKeyStatus(data.data);
            } else {
                showMessage('加载API Key状态失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请稍后重试', 'error');
            console.error('加载API Key状态失败:', error);
        }
    }

    // 渲染API Key状态
    function renderApiKeyStatus(data) {
        const statusContainer = document.getElementById('apiKeyStatus');
        
        statusContainer.innerHTML = `
            <div class="status-item">
                <span class="status-label">API Key状态:</span>
                <span class="status-value ${data.hasApiKey ? '' : 'error'}">
                    ${data.hasApiKey ? '已配置' : '未配置'}
                </span>
            </div>
            ${data.apiKeyFile ? `
            <div class="status-item">
                <span class="status-label">存储文件:</span>
                <span class="status-value">${data.apiKeyFile}</span>
            </div>
            ` : ''}
            ${data.lastModified ? `
            <div class="status-item">
                <span class="status-label">最后修改:</span>
                <span class="status-value">${new Date(data.lastModified).toLocaleString()}</span>
            </div>
            ` : ''}
        `;
    }

    // 保存API Key
    document.getElementById('apiKeyForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('apiKeyInput').value.trim();

        try {
            const response = await fetch('/api/api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey })
            });
            const data = await response.json();
            
            if (data.success) {
                showMessage('API Key保存成功', 'success');
                document.getElementById('apiKeyForm').reset();
                loadApiKeyStatus();
            } else {
                showMessage(data.message || '保存API Key失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请稍后重试', 'error');
            console.error('保存API Key失败:', error);
        }
    });

    // 页面加载时加载API Key状态
    document.addEventListener('DOMContentLoaded', loadApiKeyStatus);
}

// 显示消息
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // 将消息添加到main元素的开头
    const main = document.querySelector('main');
    main.insertBefore(messageDiv, main.firstChild);
    
    // 3秒后自动移除消息
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}