import { execute } from './facebook-join-groups';

async function testFacebookJoinGroups() {
  console.log('开始测试Facebook加入小组技能...');

  try {
    // 使用账号文件中的登录信息（第一个是手机号码）
    const input = {
      email: '85255717289',
      password: '13142520qq',
      maxGroups: 1,
      traceId: `test-${Date.now()}`,
      taskId: `task-${Date.now()}`
    };

    console.log('执行加入小组操作...');
    const result = await execute(input);

    console.log('执行结果:', JSON.stringify(result, null, 2));

    if (result.ok) {
      console.log('测试成功！');
      console.log('成功加入的小组:', result.data?.joinedGroups || []);
    } else {
      console.log('测试失败:', result.message);
    }
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
testFacebookJoinGroups();
