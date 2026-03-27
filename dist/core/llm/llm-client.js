"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmClient = exports.LLMSlient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const ws_1 = __importDefault(require("ws"));
const MODULE = 'LLMClient';
function log(message) {
    console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}
function sanitizeLLMText(raw) {
    // 移除 <think> 标签及其内容，确保匹配跨行内容
    let sanitized = raw
        .replace(/<think>[\s\S]*?<\/think>/gis, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim();
    // 移除可能的思考过程文本
    sanitized = sanitized.replace(/好的，我需要.*?/s, '');
    sanitized = sanitized.replace(/首先，我得.*?/s, '');
    sanitized = sanitized.replace(/接下来，我要.*?/s, '');
    sanitized = sanitized.replace(/然后，核心.*?/s, '');
    sanitized = sanitized.replace(/添加个人观点时.*?/s, '');
    return sanitized.trim();
}
class LLMSlient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.pendingRequests = new Map();
        this.cache = new Map();
        // 延迟连接WebSocket，给服务器启动时间
        setTimeout(() => {
            this.initializeWebSocket();
        }, 1000);
    }
    initializeWebSocket() {
        try {
            const wsUrl = 'ws://127.0.0.1:3000';
            log(`尝试连接 WebSocket: ${wsUrl}`);
            this.ws = new ws_1.default(wsUrl);
            this.ws.on('open', () => {
                log('✅ WebSocket 连接成功');
                this.isConnected = true;
            });
            this.ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    const { requestId, code, msg, data: responseData } = response;
                    const pending = this.pendingRequests.get(requestId);
                    if (pending) {
                        // 200 <= status_code< 300：成功（包含 202）
                        if (code >= 200 && code < 300) {
                            if (code === 200) {
                                // 200：请求完成，返回结果
                                pending.resolve(responseData);
                                this.pendingRequests.delete(requestId);
                            }
                            else if (code === 202) {
                                // 202：处理中，打印进度提示，继续等待
                                log(`[${requestId}] 处理中：${msg}`);
                                // 不删除pending请求，继续等待后续的200响应
                            }
                            else {
                                // 其他2xx状态码，视为成功
                                pending.resolve(responseData);
                                this.pendingRequests.delete(requestId);
                            }
                        }
                        // 400 <= status_code < 600：错误
                        else if (code >= 400 && code < 600) {
                            pending.reject(new Error(msg || `HTTP ${code} 错误`));
                            this.pendingRequests.delete(requestId);
                        }
                        // 其他：未知状态码，兼容处理
                        else {
                            log(`[${requestId}] 收到未知状态码: ${code}`);
                            pending.reject(new Error(`未知状态码: ${code}`));
                            this.pendingRequests.delete(requestId);
                        }
                    }
                }
                catch (err) {
                    log(`解析 WebSocket 消息失败: ${err instanceof Error ? err.message : String(err)}`);
                    // 不中断连接，继续处理后续消息
                }
            });
            this.ws.on('close', () => {
                log('❌ WebSocket 连接关闭');
                this.isConnected = false;
                this.ws = null;
                // 清理所有待处理请求
                this.pendingRequests.forEach((pending) => {
                    pending.reject(new Error('WebSocket 连接已关闭'));
                });
                this.pendingRequests.clear();
            });
            this.ws.on('error', (error) => {
                log(`WebSocket 连接错误: ${error.message}`);
                this.isConnected = false;
            });
        }
        catch (error) {
            log(`WebSocket 初始化失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async sendWebSocketRequest(action, params) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.ws) {
                reject(new Error('WebSocket 未连接'));
                return;
            }
            const requestId = Math.random().toString(36).substr(2, 9);
            this.pendingRequests.set(requestId, { resolve, reject });
            const request = {
                requestId,
                action,
                params
            };
            this.ws.send(JSON.stringify(request));
            log(`📤 通过 WebSocket 发送请求 [${requestId}]：${action}`);
        });
    }
    async generate(input) {
        const cacheKey = this.generateCacheKey(input);
        const cached = this.getCached(cacheKey);
        if (cached) {
            log(`Cache hit for skill=${input.skillId}`);
            return cached;
        }
        const startTime = Date.now();
        try {
            const llmConfig = config_1.config.llm;
            if (!llmConfig.baseUrl || !llmConfig.apiKey) {
                return {
                    ok: false,
                    code: 400,
                    message: 'LLM 配置未完成',
                    traceId: input.traceId,
                    durationMs: Date.now() - startTime
                };
            }
            // 优先使用 WebSocket 调用
            if (this.isConnected && this.ws) {
                log(`使用 WebSocket 调用大模型，skill=${input.skillId}`);
                const wsParams = {
                    prompt: input.prompt,
                    model: llmConfig.model,
                    temperature: input.parameters?.temperature ?? 0.7,
                    maxTokens: input.parameters?.maxTokens ?? 800,
                    topP: input.parameters?.topP ?? 0.95
                };
                const wsResponse = await this.sendWebSocketRequest('call_llm', wsParams);
                const output = {
                    ok: true,
                    code: 0,
                    message: '成功',
                    data: {
                        content: wsResponse.content,
                        tokens: wsResponse.tokens
                    },
                    traceId: input.traceId,
                    durationMs: Date.now() - startTime
                };
                this.cacheResult(cacheKey, input, output);
                return output;
            }
            else {
                // 回退到 HTTP 调用
                log(`WebSocket 未连接，使用 HTTP 调用大模型，skill=${input.skillId}`);
                const requestData = this.prepareRequest(input);
                const response = await this.sendRequest(requestData);
                const output = this.processResponse(response, input.traceId, startTime);
                this.cacheResult(cacheKey, input, output);
                return output;
            }
        }
        catch (error) {
            log(`LLM 调用失败: ${error instanceof Error ? error.message : String(error)}`);
            return {
                ok: false,
                code: 500,
                message: `LLM 调用失败: ${error instanceof Error ? error.message : String(error)}`,
                traceId: input.traceId,
                durationMs: Date.now() - startTime
            };
        }
    }
    generateCacheKey(input) {
        return `${input.prompt}_${JSON.stringify(input.parameters || {})}_${JSON.stringify(input.context || [])}`;
    }
    getCached(cacheKey) {
        const cache = this.cache.get(cacheKey);
        if (!cache)
            return null;
        if (Date.now() > cache.expiry) {
            this.cache.delete(cacheKey);
            return null;
        }
        return cache.output;
    }
    cacheResult(cacheKey, input, output) {
        const cache = {
            key: cacheKey,
            input,
            output,
            timestamp: Date.now(),
            expiry: Date.now() + 3600000 // 1小时过期
        };
        this.cache.set(cacheKey, cache);
        // 限制缓存大小
        if (this.cache.size > 100) {
            const oldestKey = Array.from(this.cache.keys())[0];
            this.cache.delete(oldestKey);
        }
    }
    prepareRequest(input) {
        const llmConfig = config_1.config.llm;
        const temperature = input.parameters?.temperature ?? 0.7;
        const maxTokens = input.parameters?.maxTokens ?? 800;
        const topP = input.parameters?.topP ?? 0.95;
        // 适配OpenAI Chat Completions接口格式（千问兼容）
        return {
            model: llmConfig.model,
            messages: [
                {
                    role: 'user',
                    content: input.prompt
                }
            ],
            max_tokens: maxTokens, // 生成长度
            temperature: temperature, // 随机性
            top_p: topP, // 千问推荐值
            stop: input.parameters?.stop || [], // 停止词（可选）
        };
    }
    async sendRequest(requestData) {
        const llmConfig = config_1.config.llm;
        const headers = {
            Authorization: `Bearer ${llmConfig.apiKey}`,
            'Content-Type': 'application/json'
        };
        const normalizedBase = llmConfig.baseUrl.replace(/\/+$/, '');
        // 核心修改：使用 /chat/completions（千问兼容的聊天接口）
        log(`发送请求到: ${normalizedBase}/chat/completions，模型: ${requestData.model}`);
        const chatResp = await axios_1.default.post(`${normalizedBase}/chat/completions`, requestData, {
            headers,
            timeout: llmConfig.timeoutMs || 120000 // 增加超时时间到120秒
        });
        return chatResp.data;
    }
    processResponse(response, traceId, startTime) {
        let content = '';
        let tokens = undefined;
        // 千问Chat Completions接口返回格式：{ id, object, created, model, choices: [{ message: { content }, finish_reason }], usage }
        if (response.choices && response.choices.length > 0) {
            if (response.choices[0].message?.content) {
                content = sanitizeLLMText(response.choices[0].message.content.trim());
            }
            else if (response.choices[0].text) {
                // 兼容completions格式（备用）
                content = sanitizeLLMText(response.choices[0].text.trim());
            }
        }
        if (response.usage) {
            tokens = {
                prompt: response.usage.prompt_tokens || 0,
                completion: response.usage.completion_tokens || 0,
                total: response.usage.total_tokens || 0
            };
        }
        if (!content) {
            return {
                ok: false,
                code: 404,
                message: 'LLM 未返回内容',
                traceId,
                durationMs: Date.now() - startTime
            };
        }
        return {
            ok: true,
            code: 0,
            message: '成功',
            data: {
                content,
                tokens
            },
            traceId,
            durationMs: Date.now() - startTime
        };
    }
    async analyzeDocument(documentContent, task, skillId, traceId) {
        const prompt = `
文档内容：
${documentContent}

任务：${task}

请根据文档内容完成上述任务，提供详细、准确的分析结果。
`;
        const input = {
            prompt,
            skillId,
            traceId
        };
        return this.generate(input);
    }
}
exports.LLMSlient = LLMSlient;
exports.llmClient = new LLMSlient();
