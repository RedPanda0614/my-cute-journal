#!/bin/sh
# 下载原型用到的字体(都是 OFL 或 Apache,可商用,可打包)。放进同目录的 fonts/。
cd "$(dirname "$0")" && mkdir -p fonts && cd fonts
B=https://raw.githubusercontent.com/google/fonts/main
for p in ofl/longcang/LongCang-Regular.ttf ofl/zhimangxing/ZhiMangXing-Regular.ttf ofl/mashanzheng/MaShanZheng-Regular.ttf \
 ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf ofl/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf \
 ofl/greatvibes/GreatVibes-Regular.ttf ofl/pinyonscript/PinyonScript-Regular.ttf ofl/mrssaintdelafield/MrsSaintDelafield-Regular.ttf \
 ofl/allura/Allura-Regular.ttf ofl/reeniebeanie/ReenieBeanie.ttf apache/specialelite/SpecialElite-Regular.ttf \
 ofl/courierprime/CourierPrime-Regular.ttf ofl/shrikhand/Shrikhand-Regular.ttf ofl/abrilfatface/AbrilFatface-Regular.ttf \
 ofl/rubikmonoone/RubikMonoOne-Regular.ttf apache/homemadeapple/HomemadeApple-Regular.ttf; do curl -sSLO "$B/$p"; done
curl -sSL -o DancingScript.ttf "$B/ofl/dancingscript/DancingScript%5Bwght%5D.ttf"
curl -sSL -o Caveat.ttf "$B/ofl/caveat/Caveat%5Bwght%5D.ttf"
curl -sSL -o PlayfairDisplay.ttf "$B/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf"
# 霞鹜文楷:从 github.com/lxgw/LxgwWenKai 的 Releases 下载 LXGWWenKai-Regular.ttf 放进来(或复制 ~/Documents/TravelPlanner 里已有的)
echo done
