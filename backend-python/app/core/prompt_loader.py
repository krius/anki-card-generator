import os
import json
from pathlib import Path
from typing import Dict, Any
from jinja2 import Environment, FileSystemLoader, Template


class PromptLoader:
    """动态加载和管理提示词的类"""

    def __init__(self, prompts_dir: str = None):
        """
        初始化 PromptLoader

        Args:
            prompts_dir: prompts 目录路径，默认为 app/prompts
        """
        if prompts_dir is None:
            # 首先尝试从配置中获取
            from .config import settings
            if settings.prompts_dir:
                self.prompts_dir = Path(settings.prompts_dir)
            else:
                # 获取当前文件的路径，然后向上找到 app 目录
                current_dir = Path(__file__).parent
                self.prompts_dir = current_dir.parent / "prompts"
        else:
            self.prompts_dir = Path(prompts_dir)
        self.prompts_dir.mkdir(parents=True, exist_ok=True)

        # 加载配置文件
        config_path = self.prompts_dir / "prompts_config.json"
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                self.prompts_config = json.load(f)
        else:
            self.prompts_config = {}

        # 初始化 Jinja2 环境
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.prompts_dir)),
            trim_blocks=True,
            lstrip_blocks=True
        )

        # 缓存已加载的模板
        self._template_cache: Dict[str, Template] = {}

    def get_prompt(self, category: str, prompt_name: str, **kwargs) -> str:
        """
        获取提示词

        Args:
            category: 提示词类别（如：card_generation, quality_check, improvement）
            prompt_name: 提示词名称（如：system, generate_answer）
            **kwargs: 模板变量

        Returns:
            渲染后的提示词

        Raises:
            FileNotFoundError: 提示词文件不存在
            ValueError: 模板渲染失败（参数不匹配等）
        """
        try:
            # 获取提示词文件路径
            prompt_path = self._get_prompt_path(category, prompt_name)

            # 检查文件是否存在
            full_path = self.prompts_dir / prompt_path
            if not full_path.exists():
                raise FileNotFoundError(f"Prompt file not found: {full_path}")

            # 使用缓存
            cache_key = f"{category}/{prompt_name}"
            if cache_key not in self._template_cache:
                template = self.jinja_env.get_template(prompt_path)
                self._template_cache[cache_key] = template
            else:
                template = self._template_cache[cache_key]

            # 渲染模板
            if kwargs:
                try:
                    return template.render(**kwargs)
                except Exception as e:
                    # 提取模板中使用的变量
                    from jinja2 import meta
                    template_source = template.environment.loader.get_source(template.environment, template.name)[0]
                    parsed_content = template.environment.parse(template_source)
                    required_vars = meta.find_undeclared_variables(parsed_content)

                    # 检查缺失的变量
                    missing_vars = required_vars - set(kwargs.keys())
                    if missing_vars:
                        raise ValueError(
                            f"Missing required variables for template '{category}/{prompt_name}': "
                            f"{missing_vars}. Provided: {list(kwargs.keys())}"
                        )
                    else:
                        raise ValueError(
                            f"Error rendering template '{category}/{prompt_name}': {str(e)}"
                        )
            else:
                # 直接读取文件内容
                with open(full_path, 'r', encoding='utf-8') as f:
                    return f.read()

        except Exception as e:
            # 记录错误并重新抛出
            print(f"Error loading prompt '{category}/{prompt_name}': {str(e)}")
            raise

    def _get_prompt_path(self, category: str, prompt_name: str) -> str:
        """获取提示词文件路径"""
        if category in self.prompts_config and prompt_name in self.prompts_config[category]:
            return self.prompts_config[category][prompt_name]

        # 默认路径规则
        return f"{category}/{prompt_name}.txt"

    def reload_config(self):
        """重新加载配置文件"""
        config_path = self.prompts_dir / "prompts_config.json"
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                self.prompts_config = json.load(f)

        # 清空模板缓存
        self._template_cache.clear()

    def list_prompts(self) -> Dict[str, Dict[str, str]]:
        """列出所有可用的提示词"""
        prompts = {}

        # 遍历配置文件中的提示词
        for category, prompt_files in self.prompts_config.items():
            prompts[category] = {}
            for name, path in prompt_files.items():
                full_path = self.prompts_dir / path
                if full_path.exists():
                    prompts[category][name] = str(full_path)

        # 扫描目录中的所有 .txt 文件（配置文件中未列出的）
        for category_dir in self.prompts_dir.iterdir():
            if category_dir.is_dir():
                category_name = category_dir.name
                if category_name not in prompts:
                    prompts[category_name] = {}

                for prompt_file in category_dir.glob("*.txt"):
                    prompt_name = prompt_file.stem
                    if prompt_name not in prompts[category_name]:
                        prompts[category_name][prompt_name] = str(prompt_file)

        return prompts


# 创建全局实例
prompt_loader = PromptLoader()