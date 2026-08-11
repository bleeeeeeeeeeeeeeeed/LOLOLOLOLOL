(function (exports, uiComponents, plugin, storageMod, assets, metro, patcher, common) {
  "use strict";

  const { ScrollView, Text, View, TextInput, Button } = uiComponents.General;
  const { FormRow, FormIcon, FormDivider, FormSwitchRow } = uiComponents.Forms;
  const { useProxy } = storageMod;
  const { getAssetIDByName } = assets;
  const { findByName, findByProps, findByStoreName } = metro;
  const { FluxDispatcher } = common;
  const { before } = patcher;
  const storage = plugin.storage;

  const RowManager = findByName("RowManager");
  const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
  const SelectedChannelStore = findByStoreName("SelectedChannelStore");
  const ChannelStore = findByStoreName("ChannelStore");

  let ActionSheetRow = null;
  try {
    const m = findByProps("ActionSheetRow");
    ActionSheetRow = m?.ActionSheetRow || m?.default?.ActionSheetRow || null;
  } catch {}
  if (!ActionSheetRow) {
    try {
      const m = findByProps("ActionSheet", "ActionSheetRow");
      ActionSheetRow = m?.ActionSheetRow;
    } catch {}
  }
  console.log("[TR] ActionSheetRow found:", !!ActionSheetRow);

  const escapeRegex = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function compileRules() {
    return JSON.parse(storage.rules || "[]").map(t => {
      try {
        if (t.find === "" || t.replace.includes(t.find)) return null;
        return { re: new RegExp(t.regex ? t.find : escapeRegex(t.find), t.ci ? "gi" : "g"), to: t.replace };
      } catch { return null; }
    }).filter(Boolean);
  }

  storage.rules       ??= JSON.stringify([{ find: "old", replace: "new", regex: false, ci: false }]);
  storage.enabled     ??= true;
  storage.showEditor  ??= false;
  storage.defaultFind ??= "";

  let patches = [];
  let UserStore, restClient;

  function getCurrentDMUserId() {
    try {
      const chanId = SelectedChannelStore?.getChannelId?.();
      if (!chanId) return null;
      const chan = ChannelStore?.getChannel?.(chanId);
      if (!chan) return null;
      if (chan.type === 1 && chan.recipients?.length > 0) return chan.recipients[0];
      return null;
    } catch { return null; }
  }

  async function fetchAndSwap(newId, oldId) {
    if (!UserStore || !restClient) return;
    try {
      if (await UserStore.getUser(newId)) {
        console.log("[TR] user cached:", newId);
      } else {
        console.log("[TR] fetching user:", newId);
        await restClient.get({ url: `/users/${newId}` }).then(resp => {
          FluxDispatcher.dispatch({ type: "USER_UPDATE", user: resp.body });
          resp.body.id = oldId;
          FluxDispatcher.dispatch({ type: "USER_UPDATE", user: resp.body });
        });
        FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_FAILURE", user: newId });
        FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_FAILURE", user: oldId });
      }
    } catch (e) { console.log("[TR] fetchAndSwap error:", e); }
  }

  function addRule(findId, replaceId) {
    const rules = JSON.parse(storage.rules || "[]");
    if (rules.some(r => r.find === findId && r.replace === replaceId)) {
      console.log("[TR] rule already exists");
      return false;
    }
    rules.push({ find: findId, replace: replaceId, regex: false, ci: false });
    storage.rules = JSON.stringify(rules);
    fetchAndSwap(replaceId, findId);
    return true;
  }

  function buildWorkRow(dmUserId, newId) {
    const onPress = () => {
      try {
        const added = addRule(dmUserId, newId);
        console.log("[TR] Work pressed, rule added:", added);
      } catch (e) { console.log("[TR] Work onPress error:", e); }
      try { LazyActionSheet.hideActionSheet(); } catch {}
    };
    const label = "Work";
    const subLabel = `Swap ${dmUserId} \u2192 ${newId}`;

    if (ActionSheetRow) {
      try { return React.createElement(ActionSheetRow, { label, subLabel, onPress }); }
      catch (e) { console.log("[TR] ActionSheetRow build failed:", e); }
    }
    if (FormRow) {
      try { return React.createElement(FormRow, { label, subLabel, onPress }); }
      catch (e) { console.log("[TR] FormRow build failed:", e); }
    }
    if (View && Button) {
      return React.createElement(View, { style: { padding: 8 } },
        React.createElement(Button, { title: `Work: ${dmUserId} \u2192 ${newId}`, onPress })
      );
    }
    return null;
  }

  function appendChild(tree, newChild) {
    if (!tree || !newChild) return tree;
    try {
      const kids = tree.props?.children;
      let newKids;
      if (kids == null) newKids = [newChild];
      else if (Array.isArray(kids)) newKids = [...kids, newChild];
      else newKids = [kids, newChild];
      return React.cloneElement(tree, {}, ...newKids);
    } catch (e) {
      console.log("[TR] appendChild failed:", e);
      return tree;
    }
  }

  function RulesEditor() {
    const rules = JSON.parse(storage.rules || "[]");
    const save = r => (storage.rules = JSON.stringify(r));
    const add  = () => save([...rules, { find: storage.defaultFind || "", replace: "", regex: false, ci: false }]);
    const del  = i => save(rules.filter((_, idx) => idx !== i));
    const upd  = (i, patch) => save(rules.map((r, idx) => idx === i ? { ...r, ...patch } : r));

    return React.createElement(ScrollView, { style: { paddingBottom: 100 } },
      React.createElement(Text, { style: { margin: 12, fontSize: 16, fontWeight: "bold" } }, "Replacement Rules"),
      rules.map((rule, i) =>
        React.createElement(View, { key: i, style: { margin: 8, padding: 8, borderWidth: 1, borderColor: "#666", borderRadius: 6 } },
          React.createElement(TextInput, { placeholder: "Text to find", value: rule.find, onChangeText: t => upd(i, { find: t }), style: { borderWidth: 1, borderColor: "#888", padding: 6, marginBottom: 6, color: "#fff" } }),
          React.createElement(TextInput, { placeholder: "Replace with", value: rule.replace, onChangeText: t => upd(i, { replace: t }), style: { borderWidth: 1, borderColor: "#888", padding: 6, marginBottom: 6, color: "#fff" } }),
          React.createElement(FormSwitchRow, {
            label: "Case-insensitive",
            leading: FormIcon ? React.createElement(FormIcon, { source: getAssetIDByName("ic_visibility_24px") }) : null,
            value: rule.ci,
            onValueChange: v => upd(i, { ci: v })
          }),
          React.createElement(FormSwitchRow, {
            label: "Regular expression",
            leading: FormIcon ? React.createElement(FormIcon, { source: getAssetIDByName("ic_search_24px") }) : null,
            value: rule.regex,
            onValueChange: v => upd(i, { regex: v })
          }),
          React.createElement(Button, { title: "Delete rule", onPress: () => del(i), color: "red" }),
          FormDivider ? React.createElement(FormDivider, null) : null
        )
      ),
      React.createElement(Button, { title: "Add rule", onPress: add })
    );
  }

  function Settings() {
    useProxy(storage);
    return React.createElement(ScrollView, null,
      React.createElement(FormSwitchRow, {
        label: "Enable replacements",
        leading: FormIcon ? React.createElement(FormIcon, { source: getAssetIDByName("ic_message_edit") }) : null,
        value: storage.enabled,
        onValueChange: v => storage.enabled = v
      }),
      FormDivider ? React.createElement(FormDivider, null) : null,
      React.createElement(View, { style: { margin: 8, padding: 8, borderWidth: 1, borderColor: "#444", borderRadius: 6 } },
        React.createElement(Text, { style: { color: "#aaa", fontSize: 13, marginBottom: 4 } }, "Default \"Find\" text"),
        React.createElement(Text, { style: { color: "#888", fontSize: 11, marginBottom: 6 } }, "New rules will be pre-filled with this value"),
        React.createElement(TextInput, { placeholder: "e.g. 123456789", value: storage.defaultFind, onChangeText: t => storage.defaultFind = t, style: { borderWidth: 1, borderColor: "#888", padding: 6, color: "#fff", borderRadius: 4 } })
      ),
      FormDivider ? React.createElement(FormDivider, null) : null,
      React.createElement(FormRow, {
        label: "Manage rules",
        subLabel: "Add, edit or delete replacement strings",
        leading: FormIcon ? React.createElement(FormIcon, { source: getAssetIDByName("ic_settings_24px") }) : null,
        trailing: FormRow.Arrow,
        onPress: () => storage.showEditor = !storage.showEditor
      }),
      storage.showEditor && React.createElement(React.Fragment, null,
        FormDivider ? React.createElement(FormDivider, null) : null,
        React.createElement(RulesEditor, null),
        React.createElement(Button, { title: "Close editor", onPress: () => storage.showEditor = false })
      )
    );
  }

  const pluginObj = {
    settings: Settings,

    onLoad() {
      console.log("[TR] onLoad start");
      setTimeout(() => {
        UserStore  = findByStoreName("UserStore");
        restClient = findByProps("put", "del", "post");

        patches.push(before("generate", RowManager.prototype, ([row]) => {
          try {
            if (!storage.enabled) return;
            const rules = compileRules();
            for (const rule of rules) {
              if (row?.message?.author?.id) {
                const newId = row.message.author.id.replace(rule.re, rule.to);
                if (newId !== row.message.author.id && /^\d+$/.test(newId)) {
                  const target = UserStore.getUser(newId);
                  if (target) row.message.author = target;
                  else row.message.author.id = newId;
                }
              }
              if (row?.message?.content) row.message.content = row.message.content.replace(rule.re, rule.to);
              if (row?.message?.author?.username) row.message.author.username = row.message.author.username.replace(rule.re, rule.to);
              if (row?.message?.author?.globalName) row.message.author.globalName = row.message.author.globalName.replace(rule.re, rule.to);
              if (row?.message?.author?.avatar) row.message.author.avatar = row.message.author.avatar.replace(rule.re, rule.to);
              if (row?.message?.author?.primaryGuild?.tag) row.message.author.primaryGuild.tag = row.message.author.primaryGuild.tag.replace(rule.re, rule.to);
              if (row?.message?.author?.primaryGuild?.badge) row.message.author.primaryGuild.badge = row.message.author.primaryGuild.badge.replace(rule.re, rule.to);
              if (row?.message?.author?.primaryGuild?.identityGuildId) row.message.author.primaryGuild.identityGuildId = row.message.author.primaryGuild.identityGuildId.replace(rule.re, rule.to);
              if (row?.message?.attachments?.length) {
                row.message.attachments.forEach(a => {
                  if (a.url?.match(rule.re)) { a.url = rule.to; a.proxy_url = rule.to; }
                });
              }
            }
          } catch {}
        }));

        const raw = JSON.parse(storage.rules || "[]");
        for (const r of raw) if (r.find && r.replace) fetchAndSwap(r.replace, r.find);

        patches.push(before("getUser", UserStore, args => {
          try {
            const rules = compileRules();
            for (const rule of rules) {
              for (let i = 0; i < args.length; i++) {
                if (typeof args[i] === "string" && args[i].match(rule.re)) args[i] = rule.to;
              }
            }
          } catch {}
        }));

        if (LazyActionSheet) {
          patches.push(before("openLazy", LazyActionSheet, args => {
            try {
              const [component, sheetName, sheetProps] = args;
              if (sheetName !== "MessageLongPressActionSheet") return;

              const message = sheetProps?.message;
              if (!message?.content) return;

              const ids = message.content.match(/\b\d{17,20}\b/g);
              if (!ids || !ids.length) return;

              const dmUserId = getCurrentDMUserId();
              if (!dmUserId) return;

              const newId = ids.find(id => id !== dmUserId);
              if (!newId) return;

              console.log("[TR] Work eligible: dm=" + dmUserId + " new=" + newId);

              args[0] = component.then(mod => {
                const OrigDefault = mod?.default;
                if (typeof OrigDefault !== "function") return mod;

                const PatchedDefault = function (props) {
                  let tree;
                  try { tree = OrigDefault(props); }
                  catch (e) { console.log("[TR] OrigDefault threw:", e); return null; }
                  try {
                    const workRow = buildWorkRow(dmUserId, newId);
                    if (!workRow) { console.log("[TR] buildWorkRow returned null"); return tree; }
                    return appendChild(tree, workRow);
                  } catch (e) {
                    console.log("[TR] injection failed, returning original tree:", e);
                    return tree;
                  }
                };

                const clone = {};
                for (const k in mod) clone[k] = mod[k];
                clone.default = PatchedDefault;
                return clone;
              });
            } catch (e) {
              console.log("[TR] openLazy patch error:", e);
            }
          }));
          console.log("[TR] openLazy patch installed");
        } else {
          console.log("[TR] LazyActionSheet not found");
        }
      }, 0);
    },

    onUnload() {
      console.log("[TR] onUnload");
      patches.forEach(p => p?.());
      patches = [];
    }
  };

  exports.default = pluginObj;
  Object.defineProperty(exports, "__esModule", { value: true });
  return exports;
})({}, vendetta.ui.components, vendetta.plugin, vendetta.storage, vendetta.ui.assets, vendetta.metro, vendetta.patcher, vendetta.metro.common);
