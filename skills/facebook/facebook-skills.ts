import axios from 'axios';
import { config } from '../../core/config';

const MODULE = 'FacebookSkills';

/**
 * Facebook 登录输入参数。
 */
export interface FacebookLoginInput {
  username?: string;
  password?: string;
  timeoutSeconds?: number;
}

/**
 * Facebook 登录输出结果。
 */
export interface FacebookLoginOutput {
  code: number;
  data: { status: 'success'; cookiePath?: string };
}

/**
 * Facebook 发帖输入参数。
 */
export interface FacebookPostInput {
  text: string;
  imagePaths?: string[];
  videoPath?: string;
  publish?: boolean;
  loginTimeoutSeconds?: number;
}

/**
 * Facebook 发帖输出结果。
 */
export interface FacebookPostOutput {
  code: number;
  data: { postId: string; status: 'success' | 'draft' };
}

/**
 * Facebook 互动输入参数。
 */
export interface FacebookInteractInput {
  action: 'like' | 'comment' | 'share';
  postId: string;
  content?: string;
  loginTimeoutSeconds?: number;
}

/**
 * Facebook 互动输出结果。
 */
export interface FacebookInteractOutput {
  code: number;
  data: { status: 'success' };
}

/**
 * Facebook 搜索输入参数。
 */
export interface FacebookSearchInput {
  keywords: string[];
  maxPosts?: number;
  loginTimeoutSeconds?: number;
}

/**
 * Facebook 搜索输出结果。
 */
export interface FacebookSearchOutput {
  code: number;
  data: Array<{ postId: string; text: string; url: string; author: string }>;
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function randomDelay(): Promise<void> {
  const minDelay = Math.max(0, config.skillMock.minDelayMs);
  const maxDelay = Math.max(minDelay, config.skillMock.maxDelayMs);
  const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function maybeThrowFacebookError(): void {
  const fail = Math.random() < config.skillMock.failureRate;
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
export async function loginToFacebook(input: FacebookLoginInput): Promise<FacebookLoginOutput> {
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
export async function postToFacebook(input: FacebookPostInput): Promise<FacebookPostOutput> {
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
export async function interactFacebook(input: FacebookInteractInput): Promise<FacebookInteractOutput> {
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
export async function searchFacebook(input: FacebookSearchInput): Promise<FacebookSearchOutput> {
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