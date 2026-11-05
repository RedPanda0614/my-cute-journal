# 手帐字体 skill · 设计稿

2026-11-04。结论:能做,而且不用生图。原型已经跑通,样张见 `sheet.jpg`。

## 思路

不靠 AI 画字,靠「开源字体 + 代码效果」。
- 字形来自开源字体(OFL / Apache,可商用、可打包)。中文钢笔、毛笔、花体英文都有现成的好字体。
- 效果用 SVG 做:描边、双线、投影、错位、墨迹纹理、手抖、印章斑驳、剪报底块。
- 用浏览器(Chromium)渲染成透明底 PNG。以后也能输出 SVG,方便在工作台里继续改。

好处:字一定写对(生图常把中文写错),每次结果一样,可以离线跑,工作台能直接调用。

## 原型里已有的 17 种风格

| 类 | 风格 | 用的字体 |
|---|---|---|
| 手写中文 | 钢笔字 pen | 龙藏体 Long Cang |
| | 楷书手写 kai | 霞鹜文楷 |
| | 毛笔 brush | 马善政楷书 Ma Shan Zheng |
| | 铅笔 pencil | 龙藏体 + 铅笔颗粒 |
| 花体英文 | 花体 script | Great Vibes |
| | 签名花体 signature | Mrs Saint Delafield |
| | 铜版花体 copperplate | Pinyon Script |
| | 手写英文 handwrite | Caveat |
| 空心 | 空心字 outline | 站酷庆科黄油体 / Rubik Mono One |
| | 双线空心 double-outline | 同上,三层描边 |
| | 手绘抖动空心 wobbly-outline | 站酷快乐体 / Shrikhand + 抖动滤镜 |
| 装饰 | 白边贴纸字 sticker | 站酷快乐体 / Shrikhand |
| | 错位印刷 riso | 两色错位叠印 |
| | 复古投影 shadow | 实色偏移投影 |
| 标签 | 打字机标签 typewriter | Special Elite + 纸条底 |
| | 印章 stamp | 马善政 / Special Elite + 斑驳 |
| | 剪报拼字 ransom | 每个字随机字体、底色、角度 |

用法:
```
sh fetch_fonts.sh                       # 第一次:下载字体
python3 lettering.py --text "芝加哥慢游" --style double-outline --out a.png
python3 lettering.py --sheet sheet.jpg  # 所有风格样张
```
依赖:python3、playwright(Chromium)、Pillow。

## 做成正式 skill 还要补的

1. **参数**:颜色(按色板选)、粗细、倾斜、字距、竖排、多行、对齐。
2. **输出 SVG**:用 fontTools 把字转成路径,带透明底,工作台里可以再改色。
3. **手写感更真**:
   - 每个字轻微随机大小、旋转、基线起伏(现在只有剪报有)。
   - 钢笔墨水深浅变化、起笔收笔加重。
4. **更多风格**:
   - 金箔烫金
   - 粉笔黑板
   - 霓虹灯管(Cheer Up Mart 用过,别重复)
   - 刺绣
   - 贴纸字母一个个剪开
   - 拱形、波浪排字(文字沿路径)
5. **中英混排**:中文字体配英文字体的推荐组合。
6. **字体清单和授权表**:每款字体的来源和协议写进 skill,只收 OFL / Apache。
7. **工作台接入**:工具箱「艺术字」抽屉直接调用,选风格,输入文字,出贴纸放到画布。

## 要注意

- 字体只用开源的(OFL / Apache)。不用「免费下载」但授权不明的中文手写字体。
- 生僻字可能缺字,要检查。缺了就换霞鹜文楷补。
- 中文花体、空心字的好字体比英文少。龙藏、站酷、马善政是目前最稳的几款。

## 工作台第一版用哪些(已定)

只用本地能跑的,不接生图:
- 抠图:xiaowu89/skill-matting(本地 BiRefNet)或 samehdoush/bg-remover-skill(rembg)
- 白边贴纸:dtj0108/sticker-skill
- 色键抠图:flybirp/smart-color-remover
- 字体:自己做的这个手帐字体 skill
