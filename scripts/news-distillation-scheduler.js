const { newsDistillationSkill } = require('../dist/skills/news-distillation/news-distillation');
const { postToFacebook } = require('../dist/skills/facebook-skills');
const schedule = require('node-schedule');

const MODULE = 'NewsDistillationScheduler';

function log(message) {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

async function runNewsDistillationTask() {
  log('开始执行新闻蒸馏任务');
  
  try {
    const traceId = `news-distillation-${Date.now()}`;
    const result = await newsDistillationSkill.execute(traceId);
    
    if (result.ok) {
      log(`新闻蒸馏任务执行成功: 生成了 ${result.data.articleCount} 篇新闻`);
      
      // 获取生成的新闻内容
      const newsContent = result.data.formattedNews;
      log('准备发布到Facebook');
      
      // 发布到Facebook
      const postParams = {
        text: newsContent,
        publish: true
      };
      
      // 如果有选中的图片，添加到发布参数中
      if (result.data.selectedImage) {
        postParams.imagePaths = [result.data.selectedImage];
        log(`包含图片: ${result.data.selectedImage}`);
      }
      
      const postResult = await postToFacebook(postParams);
      
      if (postResult.code === 0) {
        log(`Facebook 发贴成功: ${postResult.data.postId}`);
      } else {
        log(`Facebook 发贴失败: ${postResult.data}`);
      }
    } else {
      log(`新闻蒸馏任务执行失败: ${result.message}`);
    }
  } catch (error) {
    log(`任务执行异常: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 每天8点执行
const job = schedule.scheduleJob('0 8 * * *', function() {
  log('定时任务触发: 执行新闻蒸馏并发布到Facebook');
  runNewsDistillationTask();
});

log('新闻蒸馏定时任务已启动，每天8点执行');

// 立即执行一次，用于测试
log('立即执行一次新闻蒸馏任务，用于测试');
runNewsDistillationTask();
