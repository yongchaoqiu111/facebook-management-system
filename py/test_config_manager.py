import sys
import os

# 添加当前目录到 Python 路径
sys.path.append(os.getcwd())

from config_manager import ConfigManager

def test_config_manager():
    print("测试配置管理器...")
    
    # 获取配置管理器实例
    config_manager = ConfigManager()
    
    # 测试搜索配置
    search_config = config_manager.get_search_config()
    print("搜索配置:")
    print(f"  关键词: {search_config['keywords']}")
    print(f"  最大视频数: {search_config['maxVideos']}")
    print(f"  每个视频最大评论数: {search_config['maxCommentsPerVideo']}")
    print(f"  搜索间隔: {search_config['searchIntervalMs']}ms")
    
    # 测试 LLM 配置
    llm_config = config_manager.get_llm_config()
    print("\nLLM 配置:")
    print(f"  最大上下文 tokens: {llm_config['maxContextTokens']}")
    print(f"  温度参数: {llm_config['temperature']}")
    print(f"  模型: {llm_config['model']}")
    print(f"  超时: {llm_config['timeoutMs']}ms")
    
    # 测试 API Key 获取
    llm_api_key = config_manager.get_api_key('llm')
    print("\nLLM API Key:")
    print(f"  长度: {len(llm_api_key)} 字符")
    print(f"  前5个字符: {llm_api_key[:5]}..." if llm_api_key else "  未配置")
    
    print("\n测试完成!")

if __name__ == "__main__":
    test_config_manager()
