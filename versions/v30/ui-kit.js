/* 统一的界面组件(v30)。规范见 根目录 开发规则.md 的「界面规范」。
   新加控件先用这里的组件,不要另写一种样子。 */
(function(){
 const PRESETS=()=>typeof INKS!=='undefined'?INKS:['#3b3226','#2b3550','#b8453a','#c8644b','#d39a2e','#6f8f6f','#6f8fb5','#d98e8a','#fffaf0'];
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 const okHex=v=>/^#[0-9a-f]{6}$/i.test(v);
 /* 取色器:标签 + 取色方块 + 色号 + 一排预设色。和「文字 → 颜色」一模一样 */
 function colorField({value='#3b3226',label='颜色',id='',presets=PRESETS()}={}){const v=okHex(value)?value:'#3b3226';
  return `<div class="f tcolor cf"${id?` data-cf="${id}"`:''}><span class="tc-lbl">${esc(label)}</span><input type="color" class="cf-pick"${id?` id="${id}"`:''} value="${v}" title="自己选颜色"><input class="txt cf-hex" value="${esc(value)}" maxlength="7" spellcheck="false" title="也可以直接输入色号"><div class="tc-pre">${presets.map(c=>`<span class="swatch ${c===value?'on':''}" data-c="${c}" style="background:${c}" title="${c}"></span>`).join('')}</div></div>`}
 // onChange(颜色, 来源 'pick'|'hex'|'pre', 是否拖动中)
 function bindColor(root,onChange){if(!root)return;const pick=root.querySelector('.cf-pick'),hex=root.querySelector('.cf-hex');
  const paint=v=>{if(okHex(v))pick.value=v;if(document.activeElement!==hex)hex.value=v;root.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('on',s.dataset.c.toLowerCase()===String(v).toLowerCase()))};
  pick.oninput=()=>{paint(pick.value);onChange(pick.value,'pick',true)};pick.onchange=()=>{paint(pick.value);onChange(pick.value,'pick',false)};
  hex.onchange=()=>{let v=hex.value.trim();if(!v.startsWith('#'))v='#'+v;if(okHex(v)){paint(v);onChange(v,'hex',false)}else hex.value=pick.value};
  root.querySelectorAll('.swatch').forEach(s=>s.onclick=()=>{paint(s.dataset.c);onChange(s.dataset.c,'pre',false)});
  root.paint=paint;return root}
 /* 档位效果:一个完整的下拉框。第一项是效果名,选项写「效果 · 档位」,选了就执行 */
 function levelSelect({fx,label,levels=[['thin','细'],['mid','中'],['thick','粗']]}){return `<select class="sel fx-pick" data-fx="${fx}" aria-label="${esc(label)}"><option value="">${esc(label)}</option>${levels.map(([v,n])=>`<option value="${v}">${esc(label)} · ${n}</option>`).join('')}</select>`}
 window.UIKit={colorField,bindColor,levelSelect,okHex};
})();
