import { Application, Router, helpers, Context, isHttpError } from "https://deno.land/x/oak/mod.ts";
import { Session } from "https://deno.land/x/session@1.1.0/mod.ts";
import {
  bold,
  cyan,
  green,
  yellow,
} from "https://deno.land/std@0.82.0/fmt/colors.ts";
import { HOST, PORT, TWITCONF } from "./config.ts";
import { ANY } from "./const.ts";
import { TWITTER } from "./twitter.ts";
import user from "./schema/user.ts";

const app:Application = new Application();
const session = new Session({
    framework: "oak",
    store: "redis",
    hostname: "127.0.0.1",
    port: 6379,
});
await session.init();

app.use(session.use()(session));

app.use(async (c, next) => {
  try {
    await next();
  } catch(e) {
    if (isHttpError(e)){
      c.response.body = e.status;
      return;
    }
    console.log(e);
  }
});

function formatter (c:Context):string {
  const req = c.request.serverRequest;

  const time = new Date().toISOString();
  const addr = req.conn.localAddr as Deno.NetAddr;
  const host = req.headers.has("X-Forwarded-For") ? req.headers.get("X-Forwarded-For") : `${addr.hostname}:${addr.port}`;
  const method = c.request.method;
  const url = req.url || "/";

  return `${time} ${host} ${method} ${url}`;
};

app.use(async (c, next) => {
  console.log(`${formatter(c)}`);
  await next();
});

app.use(async (c, next) => {
  if (await c.state.session.get("auth") === undefined)
    await c.state.session.set("auth", false);
  await next();
});

console.log("Inited");

const router = new Router();
router
  .get("/", async (c) => {
    c.response.body = "Project:心の音 / 페이지에는 아직 아무것도 없지만, 고양이는 있습니다.\n"
      + "AUTHED : " + await c.state.session.get("auth")
      + "\nID : " + await c.state.session.get("id");
  })
  
  .post("/", async (c) => {
    c.response.body = await c.request.body;
  })

  .get("/login", async (c) => {
    if (await c.state.session.get("auth")) {
      c.response.redirect("/");
      return;
    }

    const req = await fetch("https://api.twitter.com/oauth/request_token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TWITCONF.bearer}`
      },
      body: new URLSearchParams({
        oauth_callback: TWITCONF.callback,
        oauth_consumer_key: TWITCONF.consumer_key
      })
    });
    const tokens = new URLSearchParams(await req.text());
    if(!tokens.has("oauth_token")){
      c.response.body = "ERROR";
      return;
    }
    c.response.redirect(
      TWITTER.code.getAuthorizationUri().toString() + "&oauth_token=" + tokens.get("oauth_token")
    );
  })

  .get("/callback", async (c) => {
    if (await c.state.session.get("auth")) {
      c.response.redirect("/");
      return;
    }

    const q = helpers.getQuery(c);
    const req = await fetch("https://api.twitter.com/oauth/access_token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TWITCONF.bearer}`
      },
      body: new URLSearchParams({
        oauth_consumer_key: TWITCONF.consumer_key,
        oauth_token: q.oauth_token,
        oauth_verifier: q.oauth_verifier
      })
    });
    const data = new URLSearchParams(await req.text());
    if(!data.has("user_id")){
      c.response.body = "ERROR";
      return;
    }
    const userResponse = await fetch(`https://api.twitter.com/1.1/users/show.json?user_id=${data.get("user_id")}`, {
      headers: {
        Authorization: `Bearer ${TWITCONF.bearer}`
      }
    });
    const userData = await userResponse.json();
    if (await user.count({ twitter_id: userData.id }) === 0)
      await user.insertOne({
        twitter_id: userData.id,
        display_name: userData.name,
        display_id: userData.screen_name,
        profile: userData.profile_image_url_https.replace("_normal.jpg",".jpg")
      });
    await c.state.session.set("auth", true);
    await c.state.session.set("id", userData.id);
    c.response.redirect("/");
  })

  .get("/logout", async (c) => {
    await c.state.session.set("auth");
    await c.state.session.set("id");
    c.response.redirect("/");
  })

  // .get("/test/insert", async (c) => {
  //   await test.insertMany([
  //     {
  //       cat: "cat",
  //       lang: "en",
  //     },
  //     {
  //       cat: "ねこ",
  //       lang: "ja",
  //     },
  //     {
  //       cat: "고양이",
  //       lang: "ko"
  //     }
  //   ]);
  //   return "Inserted!";
  // })

  .get("/test/count", async (c) => {
    if (!await c.state.session.get("auth")) {
      c.response.redirect("/");
      return;
    }
    c.response.body = await user.count({ twitter_id: ANY });
  })

  .get("/test/findall", async (c) => {
    if (!await c.state.session.get("auth")) {
      c.response.redirect("/");
      return;
    }
    c.response.body = await user.find({ twitter_id: ANY });
  })

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ hostname, port }) => {
  console.log(
    bold("Start listening on ") + yellow(`${hostname}:${port}`),
  );
});

await app.listen({ hostname: HOST, port: PORT });
console.log(bold("Finished."));