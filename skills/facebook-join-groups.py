import os
import random
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class FacebookJoinGroups:
    def __init__(self):
        self.driver = None
        self.keywords_file = "facebook_group_keywords.txt"
        self.keywords = self.load_keywords()
        self.joined_groups = []
    
    def load_keywords(self):
        """加载关键词列表"""
        keywords = []
        if os.path.exists(self.keywords_file):
            with open(self.keywords_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        keywords.append(line)
        else:
            # 默认关键词
            default_keywords = ["AI 运用", "openclaw", "notebook", "人工智能", "机器学习", "数据科学", "编程", "技术交流", "创业", "科技"]
            with open(self.keywords_file, 'w', encoding='utf-8') as f:
                for keyword in default_keywords:
                    f.write(keyword + '\n')
            keywords = default_keywords
        return keywords
    
    def start_driver(self):
        """启动浏览器"""
        options = webdriver.ChromeOptions()
        options.add_argument("--disable-notifications")
        options.add_argument("--start-maximized")
        self.driver = webdriver.Chrome(options=options)
    
    def open_facebook(self):
        """打开Facebook主页"""
        self.driver.get("https://www.facebook.com")
        time.sleep(5)  # 等待页面加载
    
    def login(self, email, password):
        """登录Facebook"""
        try:
            email_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "email"))
            )
            password_input = self.driver.find_element(By.ID, "pass")
            login_button = self.driver.find_element(By.NAME, "login")
            
            email_input.send_keys(email)
            password_input.send_keys(password)
            login_button.click()
            
            time.sleep(10)  # 等待登录完成
            return True
        except Exception as e:
            print(f"登录失败: {e}")
            return False
    
    def go_to_groups(self):
        """进入小组页面"""
        try:
            # 点击小组图标
            groups_icon = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//a[contains(@href, '/groups')]"))
            )
            groups_icon.click()
            time.sleep(5)
            return True
        except Exception as e:
            print(f"进入小组页面失败: {e}")
            return False
    
    def search_group(self, keyword):
        """搜索小组"""
        try:
            search_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='搜索']"))
            )
            search_input.clear()
            search_input.send_keys(keyword)
            search_input.send_keys(Keys.RETURN)
            time.sleep(5)
            return True
        except Exception as e:
            print(f"搜索小组失败: {e}")
            return False
    
    def select_group(self):
        """选择一个小组"""
        try:
            # 找到所有小组卡片
            group_cards = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.XPATH, "//div[@role='article']"))
            )
            
            for card in group_cards:
                try:
                    # 检查是否可以加入
                    join_button = card.find_element(By.XPATH, ".//button[contains(text(), '加入') or contains(text(), 'Join')]")
                    group_name = card.find_element(By.XPATH, ".//span[@dir='auto']").text
                    
                    if group_name not in self.joined_groups:
                        join_button.click()
                        time.sleep(3)
                        return group_name
                except NoSuchElementException:
                    continue
            return None
        except Exception as e:
            print(f"选择小组失败: {e}")
            return None
    
    def handle_questions(self, group_name):
        """处理加入小组的问答"""
        try:
            # 检查是否有问答对话框
            question_dialog = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@aria-label, '加入小组')]"))
            )
            
            # 找到所有问题
            questions = question_dialog.find_elements(By.XPATH, ".//div[contains(@role, 'textbox')]")
            
            for question in questions:
                try:
                    # 生成回答
                    answer = self.generate_answer(group_name)
                    question.send_keys(answer)
                    time.sleep(2)
                except Exception as e:
                    print(f"回答问题失败: {e}")
            
            # 提交回答
            submit_button = question_dialog.find_element(By.XPATH, ".//button[contains(text(), '提交') or contains(text(), 'Submit')]")
            submit_button.click()
            time.sleep(5)
            return True
        except TimeoutException:
            # 没有问答，直接加入成功
            return True
        except Exception as e:
            print(f"处理问答失败: {e}")
            return False
    
    def generate_answer(self, group_name):
        """生成加入小组的理由"""
        answers = [
            f"我对{group_name}非常感兴趣，希望能加入小组与大家交流学习。",
            f"听说这个小组很活跃，想加入一起讨论相关话题。",
            f"我在相关领域有一些经验，希望能为小组贡献自己的知识。",
            f"一直在寻找相关的社区，希望能在这里找到志同道合的朋友。",
            f"对这个主题很感兴趣，想加入小组学习更多知识。"
        ]
        return random.choice(answers)
    
    def join_group(self):
        """加入一个小组"""
        if not self.keywords:
            print("没有关键词可以搜索")
            return False
        
        # 随机选择一个关键词
        keyword = random.choice(self.keywords)
        print(f"正在搜索关键词: {keyword}")
        
        if not self.search_group(keyword):
            return False
        
        group_name = self.select_group()
        if not group_name:
            print("没有找到可加入的小组")
            return False
        
        print(f"正在加入小组: {group_name}")
        
        if not self.handle_questions(group_name):
            print("处理问答失败")
            return False
        
        self.joined_groups.append(group_name)
        print(f"成功加入小组: {group_name}")
        return True
    
    def run(self, email, password, max_groups=1):
        """运行加入小组流程"""
        try:
            self.start_driver()
            self.open_facebook()
            
            if not self.login(email, password):
                return
            
            if not self.go_to_groups():
                return
            
            joined_count = 0
            while joined_count < max_groups:
                if self.join_group():
                    joined_count += 1
                    # 控制加入频率，避免账号被降权
                    print(f"已加入 {joined_count} 个小组，等待 60 秒再继续...")
                    time.sleep(60)
                else:
                    # 如果失败，等待 30 秒再重试
                    print("加入失败，等待 30 秒再重试...")
                    time.sleep(30)
        finally:
            if self.driver:
                self.driver.quit()

if __name__ == "__main__":
    # 示例用法
    facebook_bot = FacebookJoinGroups()
    # 请替换为实际的账号密码
    facebook_bot.run("your_email@example.com", "your_password", max_groups=1)
