const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/usdchou').then(async () => {
  const Group = require('./models/Group');
  
  const groupId = '69d4ac8de8e03b8ae3397bb7';
  
  console.log('检查群组 ID:', groupId);
  console.log('='.repeat(60));
  
  const group = await Group.findById(groupId);
  
  if (!group) {
    console.log('❌ 群组不存在！');
    process.exit();
  }
  
  console.log('✅ 群组存在');
  console.log('群名称:', group.name);
  console.log('是否公共群:', group.isPublic);
  console.log('成员数:', group.members.length);
  console.log('');
  console.log('接龙群配置:');
  console.log('  isChainRedPacket:', group.settings.isChainRedPacket);
  console.log('  ticketAmount:', group.settings.ticketAmount);
  console.log('  firstRedPacketAmount:', group.settings.firstRedPacketAmount);
  console.log('  redPacketCount:', group.settings.redPacketCount);
  console.log('  kickThreshold:', group.settings.kickThreshold);
  console.log('  waitHours:', group.settings.waitHours);
  console.log('');
  
  // 检查当前用户（从token中解析的用户ID）
  const userId = '69d4b0dd082c65cf20f260c8';
  const existingMember = group.members.find(m => m.userId.toString() === userId);
  
  console.log('当前用户状态:');
  console.log('  用户ID:', userId);
  console.log('  是否是成员:', !!existingMember);
  
  if (existingMember) {
    console.log('  角色:', existingMember.role);
    console.log('  是否被踢出:', existingMember.kickedOut);
    console.log('  已缴门票:', existingMember.ticketPaid);
    console.log('  已发首包:', existingMember.firstRedPacketSent);
    console.log('  累计领取:', existingMember.totalReceived);
  }
  
  console.log('');
  console.log('='.repeat(60));
  
  // 如果不是接龙群，提供修复选项
  if (!group.settings.isChainRedPacket) {
    console.log('⚠️  该群组不是接龙群！');
    console.log('');
    console.log('是否要将其转换为接龙群？(y/n)');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        group.settings.isChainRedPacket = true;
        group.settings.ticketAmount = 10;
        group.settings.firstRedPacketAmount = 300;
        group.settings.redPacketCount = 30;
        group.settings.redPacketPerAmount = 10;
        group.settings.kickThreshold = 380;
        group.settings.waitHours = 3;
        await group.save();
        console.log('✅ 已转换为接龙群！');
      } else {
        console.log('取消操作');
      }
      rl.close();
      process.exit();
    });
  } else {
    console.log('✅ 该群组是接龙群，配置正确');
    process.exit();
  }
});
