const fs = require("node:fs");
const path = require("node:path");
const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

function shareActivitySource(packageName) {
  return `package ${packageName};

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Converts Android text sharing into the app's standard deep-link route. */
public class TabayyanShareActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    Intent incoming = getIntent();
    CharSequence shared = incoming.getCharSequenceExtra(Intent.EXTRA_TEXT);
    Uri.Builder route = new Uri.Builder().scheme("tabayyan").authority("handle-share");
    String text = shared == null ? "" : shared.toString().trim();
    java.util.regex.Matcher match = java.util.regex.Pattern
      .compile("https?://[^\\\\s<>\\\"']+", java.util.regex.Pattern.CASE_INSENSITIVE)
      .matcher(text);
    if (match.find()) {
      route.appendQueryParameter("url", match.group().replaceAll("[),،؛]+$", ""));
    } else if (!text.isEmpty()) {
      route.appendQueryParameter("q", text);
    }
    route.appendQueryParameter("source", "android-share");
    // A unique ID makes sharing the same link twice a distinct navigation event.
    route.appendQueryParameter("id", java.util.UUID.randomUUID().toString());
    Intent open = new Intent(Intent.ACTION_VIEW, route.build());
    open.setClassName(getPackageName(), getPackageName() + ".MainActivity");
    open.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    startActivity(open);
    finish();
  }
}
`;
}

function withTabayyanAndroidShare(config) {
  config = withAndroidManifest(config, config => {
    const application = config.modResults.manifest.application[0];
    application.activity = application.activity || [];
    const name = ".TabayyanShareActivity";
    application.activity = application.activity.filter(a => a.$["android:name"] !== name);
    application.activity.push({
      $: { "android:name": name, "android:exported": "true",
        "android:label": "تبيّن", "android:theme": "@android:style/Theme.NoDisplay" },
      "intent-filter": [{
        action: [{ $: { "android:name": "android.intent.action.SEND" } }],
        category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
        data: [{ $: { "android:mimeType": "text/plain" } }],
      }],
    });
    return config;
  });
  return withDangerousMod(config, ["android", async config => {
    const packageName = config.android.package;
    if (!/^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)+$/.test(packageName)) {
      throw new Error("A valid Android package is required for text sharing.");
    }
    const directory = path.join(config.modRequest.platformProjectRoot,
      "app/src/main/java", ...packageName.split("."));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "TabayyanShareActivity.java"), shareActivitySource(packageName));
    return config;
  }]);
}

module.exports = withTabayyanAndroidShare;
module.exports.shareActivitySource = shareActivitySource;
