(function(u,y,a,w,l,d,b,s){"use strict";const{ScrollView:x,Text:F,View:S,TextInput:_,Button:f}=y.General,{FormRow:v,FormIcon:i,FormDivider:g,FormSwitchRow:m}=y.Forms,B=d.findByName("RowManager"),T=function(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")},E=function(){return JSON.parse(a.storage.rules||"[]").map(function(t){try{return t.find===""||t.replace.includes(t.find)?null:{re:new RegExp(t.regex?t.find:T(t.find),t.ci?"gi":"g"),to:t.replace}}catch{return null}}).filter(Boolean)};a.storage.rules??=JSON.stringify([{find:"old",replace:"new",regex:!1,ci:!1}]),a.storage.enabled??=!0,a.storage.showEditor??=!1,a.storage.defaultFind??="";let h=[];const U=function(){const t=d.findByStoreName("UserStore"),c=d.findByProps("put","del","post");h.push(b.before("generate",B.prototype,function([r]){try{const o=E();for(const e of o){// Apply ID redirect on author so cached rows get the right user data
if(r?.message?.author?.id){const newId=r.message.author.id.replace(e.re,e.to);if(newId!==r.message.author.id&&/^\d+$/.test(newId)){const target=t.getUser(newId);if(target){r.message.author=target}else{r.message.author.id=newId}}}r?.message?.content&&(r.message.content=r.message.content.replace(e.re,e.to)),r?.message?.author?.username&&(r.message.author.username=r.message.author.username.replace(e.re,e.to)),r?.message?.author?.globalName&&(r.message.author.globalName=r.message.author.globalName.replace(e.re,e.to)),r?.message?.author?.avatar&&(r.message.author.avatar=r.message.author.avatar.replace(e.re,e.to)),r?.message?.author?.primaryGuild?.tag&&(r.message.author.primaryGuild.tag=r.message.author.primaryGuild.tag.replace(e.re,e.to)),r?.message?.author?.primaryGuild?.badge&&(r.message.author.primaryGuild.badge=r.message.author.primaryGuild.badge.replace(e.re,e.to)),r?.message?.author?.primaryGuild?.identityGuildId&&(r.message.author.primaryGuild.identityGuildId=r.message.author.primaryGuild.identityGuildId.replace(e.re,e.to)),r?.message?.attachments?.length&&r.message.attachments.forEach(function(n){n.url?.match(e.re)&&(n.url=e.to,n.proxy_url=e.to)})}}catch{}}));async function R(r,o){o=o.toString().split("/")[1];try{await t.getUser(r)?console.log("cached"):(console.log("boutta request"),await c.get({url:`/users/${r}`}).then(function(e){console.log("success!"),s.FluxDispatcher.dispatch({type:"USER_UPDATE",user:e.body}),e.body.id=o,console.log(e.body),s.FluxDispatcher.dispatch({type:"USER_UPDATE",user:e.body})}),console.log("still goin"),s.FluxDispatcher.dispatch({type:"USER_PROFILE_FETCH_FAILURE",user:r}),s.FluxDispatcher.dispatch({type:"USER_PROFILE_FETCH_FAILURE",user:o}))}catch(e){console.log(e)}}const p=E();for(const r of p)R(r.to,r.re);h.push(b.before("getUser",t,function(r){try{const o=E();for(const e of o)for(let n=0;n<r.length;n++)r[n].match(e.re)&&(r[n]=e.to)}catch{}}));
// --- Long-press "Work" shortcut: sets find=DM recipient (old), replace=ID in message (new) ---
(function(){try{
function TT(m){try{alert(String(m));}catch(_){try{vendetta.ui.toasts.showToast(String(m),l.getAssetIDByName("ic_message_edit"));}catch(__){}}}
var ActionSheet=d.findByProps("openLazy","hideActionSheet");
var ChannelStore=d.findByStoreName("ChannelStore");
var ButtonRow=d.findByName("ButtonRow");
TT("[TR] setup AS="+!!ActionSheet+" BR="+!!ButtonRow);
if(!ActionSheet||!ButtonRow){TT("[TR] modules missing, aborting");return;}
function findInReactTree(node,filter,depth){depth=depth||0;if(node==null||depth>120)return null;if(filter(node))return node;if(Array.isArray(node)){for(var k=0;k<node.length;k++){var rr=findInReactTree(node[k],filter,depth+1);if(rr)return rr;}return null;}if(typeof node==="object"){var kids=(node.props&&node.props.children)!=null?node.props.children:node.children;if(kids!=null)return findInReactTree(kids,filter,depth+1);}return null;}
h.push(b.before("openLazy",ActionSheet,function(args){
  try{
    TT("[TR] sheet key: "+String(args[1]));
    if(args[1]!=="MessageLongPressActionSheet")return;
    var sheetProps=args[2]||{};var message=sheetProps.message;if(!message){TT("[TR] no message on sheet");return;}
    var idMatch=String(message.content||"").match(/\d{15,25}/);if(!idMatch){TT("[TR] no ID in message content");return;}
    var newId=idMatch[0];var comp=args[0];if(!comp||!comp.then){TT("[TR] comp not thenable");return;}
    TT("[TR] matched; new="+newId);
    comp.then(function(instance){
      var un=b.after("default",instance,function(_,res){
        un();
        try{
          var arr=findInReactTree(res,function(n){return Array.isArray(n)&&n.some(function(c){return c&&c.type===ButtonRow;});});
          if(!arr){TT("[TR] ButtonRow array NOT found in tree");return;}
          TT("[TR] Work button injected");
          arr.unshift(React.createElement(ButtonRow,{
            label:"Work",
            icon:l.getAssetIDByName("ic_message_edit"),
            onPress:function(){
              try{
                var ch=ChannelStore.getChannel(message.channel_id);
                var oldId=ch&&ch.recipients&&ch.recipients[0];
                if(!oldId){vendetta.ui.toasts.showToast("No DM recipient found",l.getAssetIDByName("ic_message_edit"));return;}
                var rules=JSON.parse(a.storage.rules||"[]");
                rules.push({find:oldId,replace:newId,regex:!1,ci:!1});
                a.storage.rules=JSON.stringify(rules);a.storage.enabled=!0;
                try{R(newId,new RegExp(T(oldId),"g"));}catch(e2){console.log("[TR] prefetch",e2);}
                vendetta.ui.toasts.showToast(oldId+" → "+newId,l.getAssetIDByName("ic_message_edit"));
                ActionSheet.hideActionSheet();
              }catch(e3){console.log("[TR] work press",e3);}
            }
          }));
        }catch(e4){console.log("[TR] inject",e4);}
      });
    });
  }catch(e5){console.log("[TR] openLazy",e5);}
}));
}catch(e6){console.log("[TR] long-press setup",e6);}})();
},A=function(){const t=JSON.parse(a.storage.rules||"[]"),c=function(o){a.storage.rules=JSON.stringify(o)},R=function(){return c([...t,{find:a.storage.defaultFind||"",replace:"",regex:!1,ci:!1}])},p=function(o){return c(t.filter(function(e,n){return n!==o}))},r=function(o,e){return c(t.map(function(n,D){return D===o?{...n,...e}:n}))};return React.createElement(x,{style:{paddingBottom:100}},React.createElement(F,{style:{margin:12,fontSize:16,fontWeight:"bold"}},"Replacement Rules"),t.map(function(o,e){return React.createElement(S,{key:e,style:{margin:8,padding:8,borderWidth:1,borderColor:"#666",borderRadius:6}},React.createElement(_,{placeholder:"Text to find",value:o.find,onChangeText:function(n){return r(e,{find:n})},style:{borderWidth:1,borderColor:"#888",padding:6,marginBottom:6,color:"#fff"}}),React.createElement(_,{placeholder:"Replace with",value:o.replace,onChangeText:function(n){return r(e,{replace:n})},style:{borderWidth:1,borderColor:"#888",padding:6,marginBottom:6,color:"#fff"}}),React.createElement(m,{label:"Case-insensitive",leading:React.createElement(i,{source:l.getAssetIDByName("ic_visibility_24px")}),value:o.ci,onValueChange:function(n){return r(e,{ci:n})}}),React.createElement(m,{label:"Regular expression",leading:React.createElement(i,{source:l.getAssetIDByName("ic_search_24px")}),value:o.regex,onValueChange:function(n){return r(e,{regex:n})}}),React.createElement(f,{title:"Delete rule",onPress:function(){return p(e)},color:"red"}),React.createElement(g,null))}),React.createElement(f,{title:"Add rule",onPress:R}))};var C={settings:function(){return w.useProxy(a.storage),React.createElement(x,null,React.createElement(m,{label:"Enable replacements",leading:React.createElement(i,{source:l.getAssetIDByName("ic_message_edit")}),value:a.storage.enabled,onValueChange:function(t){return a.storage.enabled=t}}),React.createElement(g,null),React.createElement(S,{style:{margin:8,padding:8,borderWidth:1,borderColor:"#444",borderRadius:6}},React.createElement(F,{style:{color:"#aaa",fontSize:13,marginBottom:4}},"Default \"Find\" text"),React.createElement(F,{style:{color:"#888",fontSize:11,marginBottom:6}},"New rules will be pre-filled with this value"),React.createElement(_,{placeholder:"e.g. 123456789",value:a.storage.defaultFind,onChangeText:function(t){return a.storage.defaultFind=t},style:{borderWidth:1,borderColor:"#888",padding:6,color:"#fff",borderRadius:4}})),React.createElement(g,null),React.createElement(v,{label:"Manage rules",subLabel:"Add, edit or delete replacement strings",leading:React.createElement(i,{source:l.getAssetIDByName("ic_settings_24px")}),trailing:v.Arrow,onPress:function(){return a.storage.showEditor=!a.storage.showEditor}}),a.storage.showEditor&&React.createElement(React.Fragment,null,React.createElement(g,null),React.createElement(A,null),React.createElement(f,{title:"Close editor",onPress:function(){return a.storage.showEditor=!1}})))},onLoad(){alert("[TR] NEW build loaded"),console.log("[TR] onLoad start"),setTimeout(function(){return U()},0)},onUnload(){console.log("[TR] onUnload"),h.forEach(function(t){return t?.()})}};return u.default=C,Object.defineProperty(u,"__esModule",{value:!0}),u})({},vendetta.ui.components,vendetta.plugin,vendetta.storage,vendetta.ui.assets,vendetta.metro,vendetta.patcher,vendetta.metro.common);
