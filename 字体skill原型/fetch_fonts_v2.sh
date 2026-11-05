#!/bin/sh
# v2 标题字额外用到的字体(OFL / Apache)。先跑 fetch_fonts.sh,再跑这个。
cd "$(dirname "$0")" && mkdir -p fonts && cd fonts
B=https://raw.githubusercontent.com/google/fonts/main
for p in ofl/pacifico/Pacifico-Regular.ttf ofl/sacramento/Sacramento-Regular.ttf ofl/bagelfatone/BagelFatOne-Regular.ttf ofl/amaticsc/AmaticSC-Bold.ttf \
 ofl/gaegu/Gaegu-Bold.ttf ofl/nanumpenscript/NanumPenScript-Regular.ttf ofl/gochihand/GochiHand-Regular.ttf ofl/shadowsintolight/ShadowsIntoLight.ttf \
 ofl/caveatbrush/CaveatBrush-Regular.ttf; do curl -sSLO "$B/$p"; done
curl -sSLO https://github.com/lxgw/yozai-font/releases/latest/download/Yozai-Regular.ttf   # 悠哉字体
curl -sSLO https://github.com/lxgw/kose-font/releases/latest/download/Xiaolai-Regular.ttf  # 小赖字体
echo done
