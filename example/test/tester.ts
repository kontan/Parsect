/// <reference path="parsect.ts" />

class Tester{
	succeed:string[] = [];
	failed:string[] = [];

	constructor(){}

	assert(name:string, f:()=>bool):void{
		(f() ? this.succeed : this.failed).push(name);
	}

	parse(name:string, p:Parsect.Parser, input:string, pos:number, ret?:any, success?:bool):void{
		var state = p.parse(new Source(input, 0));
		
		var fs = "";

		if(state.source.position !== pos){
			fs += " unexpected position " + state.source.position + " (expected " + pos + "),";
		}

		if(ret !== undefined && state.value != ret){
			fs += " unexpected value " + state.value + " (expected " + ret + "),";
		}

		if(success !== undefined && state.success != success){
			fs += " unexpected success " + state.success + " (expected " + success + "),";	
		}

		if(fs.length > 0){
			this.failed.push(name + ": " + fs);
		}else{
			this.succeed.push(name);
		}
	}



	report():string{
		var result = "success: " + this.succeed.length + ", failed: " + this.failed.length + "";
		this.failed.forEach((s)=>{ result += "<div>" + s + "</div>"; });
		return result;
	}
}

