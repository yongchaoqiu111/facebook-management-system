// 路由系统 - 实现页面头部复用

class Router {
    constructor() {
        this.currentPage = '';
        this.init();
    }

    init() {
        this.loadHeader();
        this.setupNavigation();
        this.handlePageLoad();
    }

    // 加载公共头部
    loadHeader() {
        const headerHTML = `
            <header>
                <h1>Facebook管理系统</h1>
                <nav>
                    <a href="index.html" class="${this.getCurrentPage() === 'index.html' ? 'active' : ''}">技能时间管理</a>
                    <a href="login.html" class="${this.getCurrentPage() === 'login.html' ? 'active' : ''}">账号登录</a>
                    <a href="api-key.html" class="${this.getCurrentPage() === 'api-key.html' ? 'active' : ''}">API Key设置</a>
                    <a href="prompt-editor.html" class="${this.getCurrentPage() === 'prompt-editor.html' ? 'active' : ''}">提示词编辑</a>
                    <a href="facebook-keywords.html" class="${this.getCurrentPage() === 'facebook-keywords.html' ? 'active' : ''}">Facebook关键词管理</a>
                    <a href="sixin-maintenance.html" class="${this.getCurrentPage() === 'sixin-maintenance.html' ? 'active' : ''}">私信维护</a>
                    <a href="image-generation.html" class="${this.getCurrentPage() === 'image-generation.html' ? 'active' : ''}">文生图</a>
                    <a href="llm-chat.html" class="${this.getCurrentPage() === 'llm-chat.html' ? 'active' : ''}">大模型交互</a>
                    <a href="comment-intercept.html" class="${this.getCurrentPage() === 'comment-intercept.html' ? 'active' : ''}">FB评论截流</a>
                    <a href="instagram-download.html" class="${this.getCurrentPage() === 'instagram-download.html' ? 'active' : ''}">Instagram下载</a>
                </nav>
            </header>
        `;
        document.getElementById('app-header').innerHTML = headerHTML;
    }

    // 设置导航点击事件
    setupNavigation() {
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.href) {
                const href = e.target.getAttribute('href');
                if (href && !href.startsWith('http')) {
                    e.preventDefault();
                    window.location.href = href;
                }
            }
        });
    }

    // 处理页面加载
    handlePageLoad() {
        window.addEventListener('load', () => {
            this.loadHeader();
        });
    }

    // 获取当前页面
    getCurrentPage() {
        const path = window.location.pathname;
        return path.split('/').pop() || 'index.html';
    }
}

// 初始化路由
document.addEventListener('DOMContentLoaded', () => {
    new Router();
});