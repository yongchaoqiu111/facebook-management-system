import os
import re

# 定义目录映射
DIR_MAPPING = {
    '.js': 'js',
    '.ts': 'ts',
    '.py': 'py',
    '.log': 'logs',
    '.json': 'config',
    '.env': 'config',
    '.ps1': 'scripts',
    '.sh': 'scripts',
    '.bat': 'scripts',
    '.cmd': 'scripts',
    '.exe': 'installers'
}

# 要忽略的目录
IGNORE_DIRS = ['node_modules', '.chrome-user-data', '__pycache__']

# 要更新的文件类型
UPDATE_FILES = ['.js', '.ts', '.py', '.json']

def update_paths_in_file(file_path):
    """更新文件中的路径引用"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 查找并更新路径引用
        for ext, dir_name in DIR_MAPPING.items():
            # 匹配相对路径引用
            pattern = r'(["\'])(?!(?:https?:\/\/|\\))([^"\'\\]+?)\' + re.escape(ext) + r'\1'
            replacement = r'\1' + dir_name + r'/\2' + ext + r'\1'
            content = re.sub(pattern, replacement, content)
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated paths in: {file_path}")
    except Exception as e:
        print(f"Error updating {file_path}: {e}")

def traverse_directory(directory):
    """遍历目录并更新文件中的路径"""
    for root, dirs, files in os.walk(directory):
        # 忽略指定目录
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            
            if ext in UPDATE_FILES:
                update_paths_in_file(file_path)

def create_dev_document():
    """创建开发文档"""
    doc_content = "# 开发文档\n\n## 文件放置标准\n\n为了保持代码库的整洁和可维护性，所有文件必须按照以下标准放置：\n\n"    
    for ext, dir_name in sorted(DIR_MAPPING.items()):
        doc_content += f"- **{ext}** 文件：放置在 `{dir_name}/` 目录\n"
    
    doc_content += "\n## 其他文件\n\n- **配置文件**：放置在 `config/` 目录\n- **脚本文件**：放置在 `scripts/` 目录\n- **日志文件**：放置在 `logs/` 目录\n- **安装程序**：放置在 `installers/` 目录\n- **数据库文件**：保持在根目录\n- **README.md**：保持在根目录\n- **.env.example**：保持在根目录\n- **.gitignore**：保持在根目录\n\n## 路径引用规范\n\n在代码中引用其他文件时，应使用相对路径，并遵循以下格式：\n\n```
// 正确示例
import module from './js/module.js';
const config = require('./config/config.json');

// 错误示例
import module from './module.js'; // 应使用 ./js/module.js
const config = require('./config.json'); // 应使用 ./config/config.json
```
"
    
    with open('D:\\weibo\\DEVELOPMENT.md', 'w', encoding='utf-8') as f:
        f.write(doc_content)
    
    print("Created development document: DEVELOPMENT.md")

if __name__ == "__main__":
    print("Updating paths in files...")
    traverse_directory('D:\\weibo')
    print("Creating development document...")
    create_dev_document()
    print("Done!")
