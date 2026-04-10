#!/usr/bin/python
# coding:utf-8

import sys
import os

# 添加DouyinLiveWebFetcher目录到Python路径
douyin_dir = os.path.join(os.path.dirname(__file__), 'DouyinLiveWebFetcher')
sys.path.append(douyin_dir)

# 切换工作目录到DouyinLiveWebFetcher目录，以便找到sign.js
os.chdir(douyin_dir)

from liveMan import DouyinLiveWebFetcher

if __name__ == "__main__":
    room_id = "132504527770"
    print(f"开始测试直播间: {room_id}")
    
    try:
        room = DouyinLiveWebFetcher(room_id)
        room.start()
    except Exception as e:
        print(f"测试失败: {e}")
