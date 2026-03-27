import os
import json
from typing import Dict, Any, Optional

class ConfigManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
            cls._instance._config_cache = {}
        return cls._instance
    
    def get_search_config(self) -> Dict[str, Any]:
        return self._load_config('search_config.json', {
            'keywords': ['AI', '人工智能', '机器学习', 'ChatGPT'],
            'maxVideos': 20,
            'maxCommentsPerVideo': 5,
            'searchIntervalMs': 2000
        })
    
    def get_llm_config(self) -> Dict[str, Any]:
        return self._load_config('llm_config.json', {
            'maxContextTokens': 4096,
            'temperature': 0.7,
            'model': 'gpt-3.5-turbo',
            'timeoutMs': 30000
        })
    
    def get_api_key(self, key: str) -> str:
        # 尝试从环境变量指定的文件读取
        env_var = f"{key.upper()}_API_KEY_FILE"
        key_file = os.environ.get(env_var) or f"data/{key.lower()}_api_key.txt"
        key_path = os.path.join(os.getcwd(), key_file)
        
        if os.path.exists(key_path):
            try:
                with open(key_path, 'r', encoding='utf-8') as f:
                    return f.read().strip()
            except Exception:
                pass
        
        # 尝试从环境变量读取（与 TypeScript 配置保持一致）
        env_key = f"{key.upper()}_API_KEY"
        if key == 'llm':
            # 兼容多种 LLM API Key 环境变量
            llm_env_vars = ['LLM_API_KEY', 'OPENAI_API_KEY', 'OPENCLAW_API_KEY', 'OPENCLAW_LLM_API_KEY']
            for var in llm_env_vars:
                if var in os.environ:
                    return os.environ[var]
        return os.environ.get(env_key, '')
    
    def _load_config(self, file_name: str, default_config: Dict[str, Any]) -> Dict[str, Any]:
        cache_key = f"config_{file_name}"
        if cache_key in self._config_cache:
            return self._config_cache[cache_key]
        
        config_path = os.path.join(os.getcwd(), 'data', file_name)
        config = default_config
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            except Exception as e:
                print(f"Failed to load config {file_name}, using default: {str(e)}")
        else:
            # 自动创建默认配置文件
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            try:
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(default_config, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Failed to create default config {file_name}: {str(e)}")
        
        self._config_cache[cache_key] = config
        return config
    
    def save_search_config(self, config: Dict[str, Any]) -> bool:
        """保存搜索配置"""
        try:
            config_path = os.path.join(os.getcwd(), 'data', 'search_config.json')
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            
            # 更新缓存
            cache_key = "config_search_config.json"
            self._config_cache[cache_key] = config
            return True
        except Exception as e:
            print(f"Failed to save search config: {str(e)}")
            return False
