"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginToFacebook = loginToFacebook;
exports.postToFacebook = postToFacebook;
exports.interactFacebook = interactFacebook;
exports.searchFacebook = searchFacebook;
const config_1 = require("../../core/config");
const MODULE = 'FacebookSkills';
function log(message) {
    console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}
function randomDelay() {
    const minDelay = Math.max(0, config_1.config.skillMock.minDelayMs);
    const maxDelay = Math.max(minDelay, config_1.config.skillMock.maxDelayMs);
    const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
    return new Promise((resolve) => setTimeout(resolve, delay));
}
function maybeThrowFacebookError() {
    const fail = Math.random() < config_1.config.skillMock.failureRate;
    if (!fail) {
        return;
    }
    const errors = [
        new Error('FACEBOOK_TOKEN_EXPIRED: token expired'),
        new Error('FACEBOOK_ACCOUNT_DISABLED: account frozen'),
        new Error('FACEBOOK_CAPTCHA_REQUIRED: captcha required'),
        new Error('FACEBOOK_RATE_LIMIT: too many requests')
    ];
    const selected = errors[Math.floor(Math.random() * errors.length)];
    throw selected;
}
/**
 * Facebook 登录。
 * @param input 输入参数。
 * @returns 登录结果。
 */
async function loginToFacebook(input) {
    await randomDelay();
    maybeThrowFacebookError();
    const timeout = input.timeoutSeconds || 180;
    log(`loginToFacebook timeout=${timeout}s`);
    return {
        code: 0,
        data: {
            status: 'success',
            cookiePath: './user-config/accounts/.facebook-cookies.json'
        }
    };
}
/**
 * Facebook 发帖。
 * @param input 输入参数。
 * @returns 发帖结果。
 */
async function postToFacebook(input) {
    await randomDelay();
    maybeThrowFacebookError();
    const publish = input.publish ?? false;
    log(`postToFacebook publish=${publish} images=${input.imagePaths?.length || 0}`);
    return {
        code: 0,
        data: {
            postId: `fb_${Date.now()}`,
            status: publish ? 'success' : 'draft'
        }
    };
}
/**
 * Facebook 互动。
 * @param input 输入参数。
 * @returns 互动结果。
 */
async function interactFacebook(input) {
    await randomDelay();
    maybeThrowFacebookError();
    log(`interactFacebook action=${input.action} postId=${input.postId}`);
    return {
        code: 0,
        data: { status: 'success' }
    };
}
/**
 * Facebook 搜索。
 * @param input 输入参数。
 * @returns 搜索结果。
 */
async function searchFacebook(input) {
    await randomDelay();
    maybeThrowFacebookError();
    const maxPosts = Math.max(1, Math.min(20, input.maxPosts ?? 10));
    log(`searchFacebook keywords=${input.keywords.join(',')} maxPosts=${maxPosts}`);
    const results = Array.from({ length: maxPosts }).map((_, i) => ({
        postId: `fb_post_${Date.now()}_${i}`,
        text: `关于 ${input.keywords[0]} 的帖子 ${i + 1}`,
        url: `https://facebook.com/posts/${i + 1}`,
        author: `User ${i + 1}`
    }));
    return {
        code: 0,
        data: results
    };
}
