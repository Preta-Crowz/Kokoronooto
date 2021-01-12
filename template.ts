export class Template{
  data?: string;
  filename: string;

  constructor(filename:string, noload:boolean=false){
    this.filename = filename;
    if(noload) return;
    this.load();
  }

  load(){
    if(this.data) return;
    this.data = Deno.readTextFileSync(this.filename);
  }

  render(data:any):string{
    if(!this.data) return "";
    let template = this.data;
    let noContinue:boolean = false;

    while(template.match(/%{(.+?)}/g) !== null && noContinue === false){
      const iter:Set<string> = new Set(template.match(/%{(.+?)}/g));
      noContinue = true;
      for(const v of iter){
        const key:string = v.substr(2,v.length-3);
        if(key.length === 0) continue;
        const include = new Template(key);
        if(include.data === undefined) continue;
        template = template.replaceAll(v, include.data);
        noContinue = false;
      }
    }

    noContinue = false;
    if(template.match(/\${(.+?)}/g) !== null && noContinue === false){
      const iter:Set<string> = new Set(template.match(/\${(.+?)}/g));
      noContinue = true;
      iloop:for(const v of iter){
        const key:string[] = v.substr(2,v.length-3).split(/[.?]/);
        let failsafe:any = null;
        if(v.indexOf("?") !== -1) failsafe = key.pop();
        if(key.length === 0) continue;
        let loop:any = data;
        for(let k of key){
          loop = loop[k];
          if(loop === undefined) break;
        }
        if(loop === undefined){
          if(failsafe !== null){
            template = template.replaceAll(v, failsafe.toString());
            noContinue = false;
          }
          continue;
        };
        if(typeof loop === "object") loop = JSON.stringify(loop);
        template = template.replaceAll(v, loop.toString());
        noContinue = false;
      }
    }

    return template;
  }
}