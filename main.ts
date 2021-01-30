import { Application, Router, helpers, Context,
  isHttpError, httpErrors, Session, bold, yellow, hmac } from "./deps.ts";
import { HOST, PORT, TWITCONF } from "./config.ts";
import { ANY, TEMPLATE } from "./const.ts";
import { MESSAGE } from "./message.ts";
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
    if (c.response.status == 404)
      throw new httpErrors.NotFound();
  } catch(e) {
    if (isHttpError(e)){
      c.response.status = e.status;
      c.response.body = e.message;
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
  try {
    if (await c.state.session.get("auth") === undefined)
      await c.state.session.set("auth", false);
  } catch(e) {
    if (e.name === "SyntaxError") return;
    throw e;
  }
  await next();
});

app.use(async (c, next) => {
  c.state.template = undefined;
  c.state.templateData = {};
  await next();
  if (c.state.template === undefined) return;
  c.response.type = "html";
  c.state.templateData.template = c.state.template;
  c.state.templateData.session = {
    "auth": await c.state.session.get("auth"),
    "id": await c.state.session.get("id")
  };
  if (await c.state.session.get("auth") === true){
    c.state.templateData.user = await user.findOne({
      twitter_id: await c.state.session.get("id")
    });
  };
  c.state.templateData.page = c.state.template;
  c.state.templateData.Message = MESSAGE;
  // const template = TEMPLATE.get(c.state.template)
  // if (template === undefined) return;
  c.response.body = TEMPLATE.render(c.state.templateData);
});

console.log("Inited");

const router = new Router();
router
  .get("/", async (c) => {
    c.state.template = "main";
  })

  .get("/res/:name", async (c) => {
    const path = "./res/" + c.params.name
    try {
      const data = Deno.readFileSync(path);
      c.response.body = data;

      const temp = path.split(".");
      c.response.type = temp[temp.length - 1];
    } catch (e) {
      if (e.name !== "NotFound") throw e;
    }
  })

  .get("/profile/:id", async (c) => {
    const usr = await user.findOne({ url: c.params.id });
    if (usr === null) {
      return;
    }
    c.state.template = "profile"
    c.state.templateData = {
      "profile":usr
    };
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
      `https://twitter.com/oauth/authorize?response_type=code&client_id=${TWITCONF.consumer_id}&redirect_uri=${TWITCONF.callback}&scope=read:user&oauth_token=${tokens.get("oauth_token")}`
    );
  })

  .get("/callback", async (c) => {
    const q = helpers.getQuery(c);
    if (await c.state.session.get("auth") || q.denied) {
      c.response.redirect("/");
      return;
    }

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
    // const clientAuth = btoa(`${data.get("oauth_token")}:${data.get("oauth_token_secret")}`);
    const userData = await userResponse.json();

    const enc = (str:string) => {
      return encodeURIComponent(str).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16))
    };

    const nonce = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      let a="";
      for(var v of array){
        a += v<16 ? "0" : ""
        a += v.toString(16)
      };
      return a;
    };

    interface baseData{
      id:string;
    }

    const makeHeader = ():Array<any> => [
      {"key": "oauth_consumer_key", "value": TWITCONF.consumer_key || ""},
      {"key": "oauth_nonce", "value": nonce() || ""},
      {"key": "oauth_signature_method", "value": "HMAC-SHA1"},
      {"key": "oauth_timestamp", "value": Math.round(Date.now()/1000).toString() || ""},
      {"key": "oauth_token", "value": data.get("oauth_token") || ""},
      {"key": "oauth_version", "value": "1.0"}
    ];

    const getFollowData = async (isFollowers:boolean) => {
      const ftype = isFollowers ? "followers" : "following";

      const baseHeader = makeHeader();
      let header:string[] = [];
      for(const v of baseHeader)
        header.push(`${v.key}="${v.value}"`)

      const signatureBase = ["GET", enc(`https://api.twitter.com/2/users/${data.get("user_id")}/${ftype}`),
        enc(baseHeader.map(v => `${enc(v.key)}=${enc(v.value)}`).join("&"))].join("&");
      const signatureKey = `${TWITCONF.consumer_secret}&${data.get("oauth_token_secret")}`
      const signatureRaw = hmac("SHA1", signatureKey, signatureBase);
      let signaturePre = "";
      for(const v of signatureRaw)
        signaturePre += String.fromCharCode(v as number);

      const signature = btoa(signaturePre);
      const fdata = await fetch(`https://api.twitter.com/2/users/${data.get("user_id")}/${ftype}`, {
        method: "GET",
        headers: {
          Authorization: `OAuth ${header.join(", ")}, oauth_signature="${enc(signature)}"`
        }
        // body: new URLSearchParams({
        //   grant_type: "client_credentials"
        // })
      });

      return [...(await fdata.json()).data.map((v:baseData)=>parseInt(v.id))] as number[];
    }

    const followersData = await getFollowData(true);
    const followingData = await getFollowData(false);

    if (await user.count({ twitter_id: userData.id }) === 0)
      await user.insertOne({
        twitter_id: parseInt(userData.id_str),
        display_name: userData.name,
        display_id: userData.screen_name,
        profile: userData.profile_image_url_https.replace("_normal.jpg",".jpg"),
        created: new Date(userData.created_at),
        url: userData.id.toString(36),
        viewLevel: 0,
        askLevel: 0,
        followers: followersData,
        following: followingData,
        block: []
      });
    await c.state.session.set("auth", true);
    await c.state.session.set("id", userData.id);
    c.response.redirect("/");
  })

  .get("/logout", async (c) => {
    await c.state.session.set("auth");
    await c.state.session.set("id");
    c.response.redirect("/");
  });

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ hostname, port }) => {
  console.log(
    bold("Start listening on ") + yellow(`${hostname}:${port}`),
  );
});

await app.listen({ hostname: HOST, port: PORT });
console.log(bold("Finished."));