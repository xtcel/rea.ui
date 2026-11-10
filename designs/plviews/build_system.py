"""Build the pinned PLViews ReaUI design systems with canonical hashes."""

import copy
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).parent


def system(name: str, identifier: str, colors: dict) -> dict:
    value = {
        "format": "reaui-design-system",
        "schemaVersion": 1,
        "id": identifier,
        "revision": 1,
        "name": name,
        "description": "PLViews 桌面端工作区；借鉴 monday.com 的分组工作区和清晰状态标签。",
        "tokens": {
            "color": colors,
            "typography": {
                "family": '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
                "body": {"size": 14, "lineHeight": 1.5, "weight": 400},
                "heading": {"size": 28, "lineHeight": 1.25, "weight": 600},
                "caption": {"size": 12, "lineHeight": 1.5, "weight": 400},
            },
            "space": {"unit": 8, "scale": [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]},
            "radius": {"sm": 4, "md": 8, "lg": 12},
            "shadow": {"popup": "0 12px 32px rgba(27, 35, 55, 0.16)"},
        },
        "components": [
            {"key": "app-shell", "name": "工作区外壳", "description": "固定 232px 导航与 64px 顶栏，内容区域保持平面。", "tokens": {"background": "color.background", "text": "color.text", "border": "color.border"}, "states": ["default"]},
            {"key": "primary-button", "name": "主按钮", "description": "页面只保留一个主操作。", "tokens": {"background": "color.primary", "text": "color.onPrimary", "radius": "radius.md"}, "states": ["default", "disabled", "loading"]},
            {"key": "secondary-button", "name": "次按钮", "description": "白底细边；用于筛选、导出和保存草稿。", "tokens": {"background": "color.surface", "text": "color.text", "border": "color.border", "radius": "radius.md"}, "states": ["default", "disabled"]},
            {"key": "board-table", "name": "分组数据表", "description": "列对齐，项目分组；行高 56px，表头 40px。", "tokens": {"background": "color.surface", "text": "color.text", "border": "color.border"}, "states": ["default", "selected", "empty"]},
            {"key": "status-label", "name": "状态标签", "description": "状态同时使用颜色与文字，数据不足单独使用紫色与虚线。", "tokens": {"radius": "radius.sm"}, "states": ["default"]},
            {"key": "progress-node", "name": "进度节点", "description": "只读流程节点展示编号、名称、状态和齐套率。", "tokens": {"background": "color.surface", "border": "color.border", "radius": "radius.md"}, "states": ["default", "selected", "disabled"]},
            {"key": "evidence-panel", "name": "判定依据侧栏", "description": "展示命中文件、缺失项、规则版本和人工修正入口。", "tokens": {"background": "color.surface", "border": "color.border"}, "states": ["default", "empty"]},
            {"key": "input", "name": "字段", "description": "示例型占位文字；错误只在提交失败后出现。", "tokens": {"background": "color.surface", "text": "color.text", "border": "color.border", "radius": "radius.md"}, "states": ["default", "focus", "error", "disabled"]},
        ],
        "guidelines": "浅色为主稿，深色为扩展。导航借鉴 monday.com 的工作区与分组表格，但 PLViews 的只读判定语义优先。项目进度=已完成/可识别节点；数据不足不计入分母，始终单独标注。异常和数据陈旧不能静默隐藏。单项目 DAG 只读，模板 DAG 可编辑。任务与甘特入口置灰并标注即将上线。所有示例项目与数值均为设计演示数据。",
    }
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    value["hash"] = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    return value


LIGHT = {
    "primary": "#5B55D6", "primaryHover": "#4841C5", "onPrimary": "#FFFFFF",
    "background": "#F7F8FB", "surface": "#FFFFFF", "text": "#253047", "muted": "#59677A", "border": "#E2E6EE", "selected": "#EFEEFF", "hover": "#F1F3F8",
    "success": "#147D60", "warning": "#9B6100", "danger": "#B83C4C",
    "sidebar": "#F0F2F7", "header": "#FFFFFF", "subtle": "#F7F8FA", "line": "#D6DDE8",
    "done": "#147D60", "doneBg": "#E4F5ED", "ready": "#087477", "readyBg": "#DFF4F4",
    "missing": "#9B6100", "missingBg": "#FFF1D7", "waiting": "#5E6E82", "waitingBg": "#EAEFF4",
    "abnormal": "#B83C4C", "abnormalBg": "#FCE8EB", "insufficient": "#7751B8", "insufficientBg": "#F1EAFB",
    "notStarted": "#5D6D82", "notStartedBg": "#EDF0F4",
    "darkSurface": "#1C2632", "darkText": "#EAF0F7", "darkMuted": "#A4B2C3", "darkAccent": "#A29CFF",
}

DARK = copy.deepcopy(LIGHT)
DARK.update({
    "primary": "#A29CFF", "primaryHover": "#BBB6FF", "onPrimary": "#18152E",
    "background": "#121923", "surface": "#1C2632", "text": "#EAF0F7", "muted": "#A4B2C3", "border": "#334253", "selected": "#2D2B52", "hover": "#263343",
    "sidebar": "#17212C", "header": "#1C2632", "subtle": "#212E3B", "line": "#43556A",
    "done": "#4CC38A", "doneBg": "#183C32", "ready": "#3EC9C0", "readyBg": "#183B3D",
    "missing": "#F5A742", "missingBg": "#45351E", "waiting": "#A6B3C2", "waitingBg": "#2D3B48",
    "abnormal": "#F0656A", "abnormalBg": "#482A35", "insufficient": "#B397F4", "insufficientBg": "#382F50",
    "notStarted": "#A4B2C3", "notStartedBg": "#334253",
})


for filename, data in [
    ("plviews-light.system.json", system("PLViews · 浅色", "plviews-light", LIGHT)),
    ("plviews-dark.system.json", system("PLViews · 深色扩展", "plviews-dark", DARK)),
]:
    (ROOT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{filename}: {data['hash']}")
