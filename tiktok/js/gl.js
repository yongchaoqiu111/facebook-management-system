const fs = require('fs');
const path = require('path');

const filePath = path.join(path.dirname(__dirname), "json", "全部评论.json");

const keywordsConfigPath = path.join(path.dirname(__dirname), "json", "keywords.json");
let keywords = [];

console.log('🔍 正在读取关键词配置文件...');

try {
  const keywordsConfig = JSON.parse(fs.readFileSync(keywordsConfigPath, 'utf8'));
  keywords = keywordsConfig.keywords || [];
  console.log('✅ 已成功加载关键词：', keywords);
  
  if (keywords.length === 0) {
    console.error('❌ 关键词列表为空，请先在网页中添加关键词');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ 读取关键词配置文件失败：', error);
  console.error('请确保 keywords.json 文件存在且格式正确');
  process.exit(1);
}

console.log('🔍 正在读取评论数据文件...');

try {
  const data = fs.readFileSync(filePath, 'utf8');
  const comments = JSON.parse(data);
  
  console.log('✅ 评论数据读取成功，总数：', comments.length);
  
  // 多关键词过滤
  console.log('🔍 开始执行关键词过滤...');
  const result = comments.filter(item => {
    if (!item.text) return false;
    // 只要包含任意一个关键词就留下
    return keywords.some(word => item.text.includes(word));
  });

  console.log('✅ 过滤完成');
  console.log('原总数：', comments.length);
  console.log('符合条件：', result.length);
  console.log('\n筛选结果：', result);

  // 保存结果
  console.log('💾 正在保存筛选结果...');
  fs.writeFileSync(path.join(path.dirname(__dirname), "json", "筛选结果.json"), JSON.stringify(result, null, 2));
  console.log('\n✅ 已成功保存到：json/筛选结果.json');
  
} catch (err) {
  console.error('❌ 处理失败：', err);
  process.exit(1);
}