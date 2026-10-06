const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPlugin() {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../plugins/withTabayyanAndroidShare.js"), "utf8"), {
    module,
    require(name) {
      if (name === "expo/config-plugins") return {
        withAndroidManifest: (config, mod) => mod(config),
        withDangerousMod: (config, mod) => { config.androidWrite = mod[1]; return config; },
      };
      return require(name);
    },
  });
  return module.exports;
}

test("Android share receiver is exported and registration is idempotent", () => {
  const plugin = loadPlugin();
  const config = { android: { package: "com.roolxi.tabayyan" },
    modResults: { manifest: { application: [{ activity: [] }] } } };
  plugin(config);
  plugin(config);
  const activity = config.modResults.manifest.application[0].activity;
  assert.equal(activity.length, 1);
  assert.equal(activity[0].$["android:exported"], "true");
  assert.equal(activity[0]["intent-filter"][0].action[0].$["android:name"], "android.intent.action.SEND");
  assert.equal(activity[0]["intent-filter"][0].data[0].$["android:mimeType"], "text/plain");
});

test("Shared text routes to the existing app with encoded query parameters", () => {
  const source = loadPlugin().shareActivitySource("com.roolxi.tabayyan");
  assert.match(source, /package com\.roolxi\.tabayyan;/);
  assert.match(source, /appendQueryParameter\("url"/);
  assert.match(source, /appendQueryParameter\("q"/);
  assert.match(source, /Intent\.FLAG_ACTIVITY_CLEAR_TOP \| Intent\.FLAG_ACTIVITY_SINGLE_TOP/);
  assert.match(source, /java\.util\.UUID\.randomUUID/);
  assert.match(source, /startActivity\(open\);\s+finish\(\);/);
  assert.ok(source.includes('https?://[^\\\\s<>'));
});
