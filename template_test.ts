import { Webview } from "https://deno.land/x/webview@0.5.5/mod.ts";
import { Template } from "./template.ts"

const html = new Template("./template/test.html").render({"a":1234,"b":5678,"c":{"d":3141}});

const webview = new Webview(
  { url: `data:text/html,${encodeURIComponent(html)}` },
);
await webview.run();