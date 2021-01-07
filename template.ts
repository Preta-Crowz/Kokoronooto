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
    if(template.match(/\${(.+?)}/g) === null) return template;
    const iter:Set<string> = new Set(template.match(/\${(.+?)}/g));
    iloop:for(const v of iter){
      let key:string[] = v.substr(2,v.length-3).split(".");
      if(key.length === 0) continue;
      let loop:any = data;
      for(let k of key){
        if(loop[k] === undefined) continue iloop;
        loop = loop[k]
      }
      if(loop === undefined) continue;
      template = template.replaceAll(v, loop.toString())
    }
    return template;
  }
}