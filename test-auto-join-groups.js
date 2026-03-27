const { autoJoinFacebookGroups } = require('./skills/facebook/facebook-auto-join-groups');

async function testAutoJoinGroups() {
  console.log('开始测试Facebook自动加入小组技能...');
  
  try {
    const result = await autoJoinFacebookGroups({
      maxGroups: 2  // 最多加入2个小组
    });
    
    console.log('\n测试结果:');
    console.log(result);
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAutoJoinGroups();
