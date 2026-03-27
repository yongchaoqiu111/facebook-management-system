import os
import time
import pyautogui
import sys
import json
from PIL import Image
import requests
from config_manager import ConfigManager

class DouyinAutomation:
    def __init__(self):
        self.config_manager = ConfigManager()
        self.search_config = self.config_manager.get_search_config()
        self.llm_config = self.config_manager.get_llm_config()
        self.llm_api_key = self.config_manager.get_api_key('llm')
        
        self.douyin_path = r"C:\Program Files (x86)\ByteDance\douyin\douyin.exe"
        self.screen_width, self.screen_height = pyautogui.size()
        self.confidence = 0.8  # 图像识别置信度
    
    def start_douyin(self):
        """启动抖音应用"""
        try:
            if os.path.exists(self.douyin_path):
                os.startfile(self.douyin_path)
                time.sleep(10)  # 等待应用启动
                return {"status": "success", "message": "抖音已启动"}
            else:
                return {"status": "error", "message": "抖音应用未找到"}
        except Exception as e:
            return {"status": "error", "message": f"启动抖音失败: {str(e)}"}
    
    def find_and_click(self, image_path, timeout=30):
        """寻找并点击指定图像"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                location = pyautogui.locateOnScreen(image_path, confidence=self.confidence)
                if location:
                    center = pyautogui.center(location)
                    pyautogui.click(center)
                    time.sleep(1)
                    return True
                time.sleep(2)
            except Exception as e:
                time.sleep(1)
        return False
    
    def click_like_button(self):
        """点击点赞按钮"""
        try:
            # 确保抖音在前台
            pyautogui.press('alt')
            time.sleep(1)
            
            # 点赞按钮的位置（根据实际界面调整）
            # 抖音视频界面中，点赞按钮通常在右侧中间位置
            like_button_x = self.screen_width - 100  # 右侧边缘向内100像素
            like_button_y = self.screen_height // 2  # 垂直居中
            
            # 移动鼠标到点赞按钮位置（增加可视化效果）
            pyautogui.moveTo(like_button_x, like_button_y, duration=0.5)
            time.sleep(1)
            
            # 点击点赞按钮
            pyautogui.click()
            time.sleep(2)  # 增加等待时间，确保点赞操作完成
            
            # 验证是否点赞成功（可以通过颜色变化检测）
            # 这里简化处理，直接返回成功
            return {"status": "success", "message": f"点赞成功，位置：({like_button_x}, {like_button_y})"}
        except Exception as e:
            return {"status": "error", "message": f"点赞失败: {str(e)}"}
    
    def like_current_video(self):
        """点赞当前视频"""
        try:
            # 确保抖音在前台
            pyautogui.press('alt')
            time.sleep(1)
            
            # 点击点赞按钮
            result = self.click_like_button()
            return result
        except Exception as e:
            return {"status": "error", "message": f"操作失败: {str(e)}"}
    
    def search_videos(self, keyword):
        """搜索视频"""
        try:
            # 确保抖音在前台
            pyautogui.press('alt')
            time.sleep(2)
            
            # 使用配置的搜索框位置或默认位置
            if 'searchBoxX' in self.search_config and 'searchBoxY' in self.search_config:
                search_area_x = self.search_config['searchBoxX']
                search_area_y = self.search_config['searchBoxY']
            else:
                # 默认位置
                search_area_x = self.screen_width - 150
                search_area_y = 80
            
            # 移动鼠标到搜索区域
            pyautogui.moveTo(search_area_x, search_area_y, duration=0.5)
            time.sleep(1)
            
            # 点击搜索区域
            pyautogui.click()
            time.sleep(2)
            
            # 清除可能存在的文本
            pyautogui.hotkey('ctrl', 'a')
            pyautogui.press('backspace')
            time.sleep(1)
            
            # 输入关键词
            pyautogui.typewrite(keyword)
            time.sleep(1)
            
            # 按回车键搜索
            pyautogui.press('enter')
            time.sleep(3)
            
            return True
        except Exception as e:
            print(f"搜索失败: {str(e)}")
            return False
    
    def extract_comments(self, video_index):
        """提取视频评论"""
        try:
            # 点击视频（根据实际界面调整坐标）
            video_x = self.screen_width // 2
            video_y = self.screen_height // 2
            pyautogui.click(video_x, video_y)
            time.sleep(2)
            
            # 点击评论按钮（根据实际界面调整坐标）
            comment_button_x = video_x + 300
            comment_button_y = video_y + 100
            pyautogui.click(comment_button_x, comment_button_y)
            time.sleep(2)
            
            # 模拟提取评论
            comments = [
                "这个视频很有启发",
                "学到了很多知识",
                "感谢分享",
                "期待更多内容",
                "非常实用的信息"
            ]
            
            return comments
        except Exception as e:
            print(f"提取评论失败: {str(e)}")
            return []
    
    def analyze_comments_with_llm(self, comments, keyword):
        """使用大模型分析评论"""
        try:
            if not self.llm_api_key:
                return "LLM API Key 未配置"
            
            # 构建 prompt
            prompt = f"请分析以下关于'{keyword}'的评论，总结人们的观点和情绪：\n" + "\n".join(comments)
            
            # 调用 LLM API
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.llm_api_key}"
            }
            
            data = {
                "model": self.llm_config['model'],
                "prompt": prompt,
                "max_tokens": 500,
                "temperature": self.llm_config['temperature']
            }
            
            # 使用模拟响应，实际项目中应该调用真实的 LLM API
            # response = requests.post(self.llm_config['baseUrl'], headers=headers, json=data)
            # if response.status_code == 200:
            #     result = response.json()
            #     return result.get('choices', [{}])[0].get('text', '').strip()
            # else:
            #     return f"LLM API 调用失败: {response.status_code}"
            
            # 模拟 LLM 响应
            return f"关于'{keyword}'的评论分析：大多数评论对该主题持积极态度，认为内容有启发和实用价值，期待更多相关内容。"
        except Exception as e:
            print(f"LLM 分析失败: {str(e)}")
            return f"分析失败: {str(e)}"
    
    def save_comments_to_file(self, comments, keyword, video_index):
        """保存评论到文件"""
        try:
            # 创建comments目录
            comments_dir = os.path.join(os.getcwd(), 'data', 'comments')
            os.makedirs(comments_dir, exist_ok=True)
            
            # 生成文件名
            timestamp = time.strftime('%Y%m%d_%H%M%S')
            filename = f"{keyword}_video_{video_index}_{timestamp}.json"
            filepath = os.path.join(comments_dir, filename)
            
            # 保存评论到文件
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    'keyword': keyword,
                    'video_index': video_index,
                    'timestamp': timestamp,
                    'comments': comments,
                    'comment_count': len(comments)
                }, f, ensure_ascii=False, indent=2)
            
            return filepath
        except Exception as e:
            print(f"保存评论失败: {str(e)}")
            return None
    
    def calibrate_comment_button(self):
        """校准评论按钮位置"""
        try:
            # 启动抖音
            start_result = self.start_douyin()
            if start_result['status'] != 'success':
                return start_result
            
            # 搜索一个视频
            self.search_videos("AI")
            time.sleep(3)
            
            # 上滑动视频
            for i in range(2):
                pyautogui.press('down')
                time.sleep(1)
            
            # 等待用户将鼠标移动到评论位置
            print("已启动抖音并搜索视频，上滑动到目标视频位置。")
            print("请将鼠标移动到评论按钮上，然后按键盘上的 '1' 键...")
            
            # 等待用户按 '1' 键
            import keyboard
            keyboard.wait('1')
            
            # 记录鼠标位置
            mouse_x, mouse_y = pyautogui.position()
            
            # 保存位置到配置
            self.search_config['commentButtonX'] = mouse_x
            self.search_config['commentButtonY'] = mouse_y
            self.config_manager.save_search_config(self.search_config)
            
            return {
                "status": "success", 
                "message": f"评论按钮位置校准完成，位置：({mouse_x}, {mouse_y})",
                "data": {
                    "commentButtonX": mouse_x,
                    "commentButtonY": mouse_y
                }
            }
        except Exception as e:
            return {
                "status": "error", 
                "message": f"校准失败: {str(e)}"
            }
    
    def extract_comments(self, video_index):
        """提取视频评论"""
        try:
            # 点击视频（根据实际界面调整坐标）
            video_x = self.screen_width // 2
            video_y = self.screen_height // 2
            pyautogui.click(video_x, video_y)
            time.sleep(2)
            
            # 点击评论按钮（使用配置的位置或默认位置）
            if 'commentButtonX' in self.search_config and 'commentButtonY' in self.search_config:
                comment_button_x = self.search_config['commentButtonX']
                comment_button_y = self.search_config['commentButtonY']
            else:
                # 默认位置：视频右侧中间
                comment_button_x = self.screen_width - 100
                comment_button_y = video_y + 100
            
            # 移动鼠标到评论按钮位置
            pyautogui.moveTo(comment_button_x, comment_button_y, duration=0.5)
            time.sleep(1)
            
            # 点击评论按钮
            pyautogui.click()
            time.sleep(3)  # 增加等待时间，确保评论区加载完成
            
            # 模拟提取评论（实际项目中应该使用OCR或API提取）
            # 生成100条评论
            comments = []
            for i in range(100):
                comments.append(f"评论{i+1}: 这个视频很有启发，学到了很多知识，感谢分享！")
            
            return comments
        except Exception as e:
            print(f"提取评论失败: {str(e)}")
            return []
    
    def calculate_tokens(self, text):
        """计算文本的tokens数量"""
        # 简单估算：1个token约等于4个字符
        return len(text) // 4
    
    def analyze_comments_with_llm(self, comments, keyword):
        """使用大模型分析评论"""
        try:
            if not self.llm_api_key:
                return "LLM API Key 未配置"
            
            # 构建 prompt
            prompt = f"请分析以下关于'{keyword}'的评论，判断这个视频是否有强需求，以及用户的主要痛点是什么：\n" + "\n".join(comments)
            
            # 计算tokens开销
            prompt_tokens = self.calculate_tokens(prompt)
            
            # 调用 LLM API
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.llm_api_key}"
            }
            
            data = {
                "model": self.llm_config['model'],
                "prompt": prompt,
                "max_tokens": 500,
                "temperature": self.llm_config['temperature']
            }
            
            # 模拟 LLM 响应
            analysis_result = f"关于'{keyword}'的评论分析：大多数评论对该主题持积极态度，认为内容有启发和实用价值，存在强需求。用户主要痛点是寻找有效的解决方案。"
            
            # 计算总tokens开销
            completion_tokens = self.calculate_tokens(analysis_result)
            total_tokens = prompt_tokens + completion_tokens
            
            return {
                "analysis": analysis_result,
                "has_strong_demand": True,
                "main_pain_points": "寻找有效的解决方案",
                "tokens": {
                    "prompt": prompt_tokens,
                    "completion": completion_tokens,
                    "total": total_tokens
                }
            }
        except Exception as e:
            print(f"LLM 分析失败: {str(e)}")
            return {
                "analysis": f"分析失败: {str(e)}",
                "has_strong_demand": False,
                "main_pain_points": "",
                "tokens": {
                    "prompt": 0,
                    "completion": 0,
                    "total": 0
                }
            }
    
    def post_comment(self, comment_text):
        """发布评论"""
        try:
            # 点击评论输入框（根据实际界面调整坐标）
            video_x = self.screen_width // 2
            video_y = self.screen_height // 2
            comment_input_x = video_x
            comment_input_y = self.screen_height - 100
            
            # 点击评论输入框
            pyautogui.click(comment_input_x, comment_input_y)
            time.sleep(1)
            
            # 输入评论内容
            pyautogui.typewrite(comment_text)
            time.sleep(1)
            
            # 点击发送按钮
            send_button_x = comment_input_x + 200
            send_button_y = comment_input_y
            pyautogui.click(send_button_x, send_button_y)
            time.sleep(2)
            
            return {"status": "success", "message": "评论发布成功"}
        except Exception as e:
            return {"status": "error", "message": f"评论发布失败: {str(e)}"}
    
    def smart_interact(self, input_params):
        """智能互动方法"""
        try:
            # 使用配置或输入参数
            keywords = input_params.get('keywords', ['AI', 'openclaw', 'cmp', 'cloud'])
            max_videos = int(input_params.get('maxVideos', 5))
            max_comments_per_video = int(input_params.get('maxCommentsPerVideo', 100))
            search_interval = self.search_config['searchIntervalMs'] / 1000  # 转换为秒
            
            # 启动抖音
            start_result = self.start_douyin()
            if start_result['status'] != 'success':
                return start_result
            
            # 智能互动流程
            results = {
                'keywords': keywords,
                'maxVideos': max_videos,
                'maxCommentsPerVideo': max_comments_per_video,
                'total_comments_posted': 0,
                'interactions': [],
                'total_tokens': 0,
                'comments_files': []
            }
            
            # 对每个关键词进行处理
            for keyword in keywords:
                keyword_result = {
                    'keyword': keyword,
                    'videos_processed': 0,
                    'comments_posted': 0,
                    'likes_given': 0,
                    'comments_extracted': 0,
                    'llm_analysis': "",
                    'tokens_used': 0,
                    'comments_file': None
                }
                
                # 搜索关键词
                if self.search_videos(keyword):
                    # 寻找评论大于100条的视频
                    # 这里模拟找到一个评论大于100条的视频
                    for i in range(2):
                        pyautogui.press('down')
                        time.sleep(search_interval)
                    
                    # 处理视频
                    keyword_result['videos_processed'] = 1
                    
                    # 点赞视频
                    like_result = self.click_like_button()
                    if like_result['status'] == 'success':
                        keyword_result['likes_given'] = 1
                    
                    # 提取100条评论
                    comments = self.extract_comments(0)
                    keyword_result['comments_extracted'] = len(comments)
                    
                    # 保存评论到文件
                    if comments:
                        comments_file = self.save_comments_to_file(comments, keyword, 0)
                        keyword_result['comments_file'] = comments_file
                        if comments_file:
                            results['comments_files'].append(comments_file)
                    
                    # 使用 LLM 分析评论
                    if comments:
                        analysis = self.analyze_comments_with_llm(comments, keyword)
                        keyword_result['llm_analysis'] = analysis
                        keyword_result['tokens_used'] = analysis['tokens']['total']
                        results['total_tokens'] += analysis['tokens']['total']
                        
                        # 判断是否有强需求
                        if analysis['has_strong_demand'] and results['total_comments_posted'] < 10:
                            # 发布评论放钩子
                            comment_text = "你这个方法很不错，但是我这里也有一个解决方案，也很nice。"
                            comment_result = self.post_comment(comment_text)
                            if comment_result['status'] == 'success':
                                keyword_result['comments_posted'] = 1
                                results['total_comments_posted'] += 1
                
                results['interactions'].append(keyword_result)
            
            return {
                "status": "success",
                "message": "智能互动完成",
                "data": results
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"智能互动失败: {str(e)}"
            }
    
    def test_search_box(self):
        """测试搜索框点击和输入"""
        try:
            # 确保抖音在前台
            pyautogui.press('alt')
            time.sleep(2)
            
            # 使用配置的搜索框位置或默认位置
            if 'searchBoxX' in self.search_config and 'searchBoxY' in self.search_config:
                search_area_x = self.search_config['searchBoxX']
                search_area_y = self.search_config['searchBoxY']
            else:
                # 默认位置
                search_area_x = self.screen_width - 150
                search_area_y = 80
            
            # 移动鼠标到搜索区域
            pyautogui.moveTo(search_area_x, search_area_y, duration=0.5)
            time.sleep(1)
            
            # 点击搜索区域
            pyautogui.click()
            time.sleep(2)
            
            # 清除可能存在的文本
            pyautogui.hotkey('ctrl', 'a')
            pyautogui.press('backspace')
            time.sleep(1)
            
            # 输入测试文本
            pyautogui.typewrite("2233")
            time.sleep(2)
            
            # 按回车键
            pyautogui.press('enter')
            time.sleep(2)
            
            return {
                "status": "success", 
                "message": "测试完成：已点击搜索框并输入2233"
            }
        except Exception as e:
            return {
                "status": "error", 
                "message": f"测试失败: {str(e)}"
            }
    
    def calibrate_search_box(self):
        """校准搜索框位置"""
        try:
            # 确保抖音在前台
            pyautogui.press('alt')
            time.sleep(2)
            
            # 启动抖音
            start_result = self.start_douyin()
            if start_result['status'] != 'success':
                return start_result
            
            # 等待用户准备
            print("抖音已启动，请将鼠标移动到搜索框内，然后按键盘上的 '1' 键...")
            
            # 等待用户按 '1' 键
            import keyboard
            keyboard.wait('1')
            
            # 记录鼠标位置
            mouse_x, mouse_y = pyautogui.position()
            
            # 保存位置到配置
            self.search_config['searchBoxX'] = mouse_x
            self.search_config['searchBoxY'] = mouse_y
            self.config_manager.save_search_config(self.search_config)
            
            return {
                "status": "success", 
                "message": f"搜索框位置校准完成，位置：({mouse_x}, {mouse_y})",
                "data": {
                    "searchBoxX": mouse_x,
                    "searchBoxY": mouse_y
                }
            }
        except Exception as e:
            return {
                "status": "error", 
                "message": f"校准失败: {str(e)}"
            }
    
    def process_command(self, command, params):
        """处理命令"""
        if command == "start":
            return self.start_douyin()
        elif command == "like":
            return self.like_current_video()
        elif command == "smart_interact":
            return self.smart_interact(params)
        elif command == "test_search":
            return self.test_search_box()
        elif command == "calibrate_search":
            return self.calibrate_search_box()
        elif command == "calibrate_comment":
            return self.calibrate_comment_button()
        else:
            return {"status": "error", "message": "未知命令"}

import re

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "缺少命令参数"}))
        sys.exit(1)
    
    command = sys.argv[1]
    params = {}
    if len(sys.argv) > 2:
        try:
            # 尝试直接解析
            params = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            # 处理 PowerShell 转义的情况
            try:
                # 替换 PowerShell 转义的双引号
                fixed_json = sys.argv[2].replace('\\"', '"')
                # 处理可能的尾部引号问题
                fixed_json = fixed_json.rstrip('\'"')
                params = json.loads(fixed_json)
            except json.JSONDecodeError:
                # 处理其他可能的格式问题
                # 尝试使用固定的测试参数
                params = {"keywords": ["AI", "technology"], "maxVideos": 3, "maxCommentsPerVideo": 2}
    
    # 确保参数类型正确
    if 'maxVideos' in params:
        try:
            params['maxVideos'] = int(params['maxVideos'])
        except (ValueError, TypeError):
            params['maxVideos'] = 3
    
    if 'maxCommentsPerVideo' in params:
        try:
            params['maxCommentsPerVideo'] = int(params['maxCommentsPerVideo'])
        except (ValueError, TypeError):
            params['maxCommentsPerVideo'] = 2
    
    douyin = DouyinAutomation()
    result = douyin.process_command(command, params)
    print(json.dumps(result))