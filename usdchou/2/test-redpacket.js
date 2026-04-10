const axios = require('axios');

async function testRedPacket() {
  try {
    console.log('开始测试红包领取功能...');

    const redPacketId = 'test-redpacket-1';
    const userId = 'user-1';
    const groupId = 'test-group-1';

    console.log('测试1：领取红包');
    const response = await axios.post('http://localhost:3000/api/redpackets/test-redpacket-1/open', {
      userId: userId,
      groupId: groupId
    });
    
    console.log('领取红包结果:', response.data);

    console.log('\n测试2：获取群组信息');
    const groupResponse = await axios.get(`http://localhost:3000/api/redpackets/group/${groupId}`);
    console.log('群组信息:', JSON.stringify(groupResponse.data, null, 2));

    console.log('\n测试3：多次领取红包');
    for (let i = 0; i< 5; i++) {
      const multiResponse = await axios.post('http://localhost:3000/api/redpackets/test-redpacket-1/open', {
        userId: userId,
        groupId: groupId
      });
      console.log(`第${i + 1}次领取结果:`, multiResponse.data);
    }

    console.log('\n测试4：再次获取群组信息');
    const finalGroupResponse = await axios.get(`http://localhost:3000/api/redpackets/group/${groupId}`);
    console.log('最终群组信息:', JSON.stringify(finalGroupResponse.data, null, 2));

  } catch (error) {
    console.error('测试失败:', error.response ? error.response.data : error.message);
  }
}

testRedPacket();