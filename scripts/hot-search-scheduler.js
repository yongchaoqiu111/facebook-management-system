const { exploreHotSearch } = require('../skills/hot-search/hot-search-explorer');
const schedule = require('node-schedule');

const MODULE = 'HotSearchScheduler';

function log(message) {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

async function runHotSearchTask() {
  log('开始执行热搜词探索任务');
  
  try {
    const input = {
      skillId: 'mcp-hot-search-explorer',
      traceId: `hot-search-${Date.now()}`
    };
    
    const result = await exploreHotSearch(input);
    
    if (result.code === 0) {
      log(`任务执行成功: 搜索关键词 "${result.data.searchKeyword}"，找到 ${result.data.newsCount} 条新闻`);
      log(`是否更新关键词库: ${result.data.updatedKeywords}`);
    } else {
      log(`任务执行失败: ${result.data.generatedPost}`);
    }
  } catch (error) {
    log(`任务执行异常: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 每天10点执行
const job = schedule.scheduleJob('0 10 * * *', function() {
  log('定时任务触发: 执行热搜词探索');
  runHotSearchTask();
});

log('热搜词探索定时任务已启动，每天10点执行');

// 立即执行一次，用于测试
log('立即执行一次热搜词探索任务，用于测试');
runHotSearchTask();
