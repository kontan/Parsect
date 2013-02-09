// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

/// <reference path="parsect.ts" /> 
/// <reference path="parser.ts" /> 

var exprInput:any = document.querySelector("#expression");
var resultSpan:any = document.querySelector("#result");
var update = ()=>{
	setTimeout(()=>{
		try{
			var exprText = exprInput.value;
			resultSpan.innerHTML = expr.parse(new Source(exprText, 0)).value;
		}catch(ex){
			resultSpan.innerHTML = "?";
			throw ex;
		}
	}, 1);
};
exprInput.addEventListener("change", update);
exprInput.addEventListener("keydown", update);