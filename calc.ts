/// <reference path="parsect.ts" /> 

var tok_number = map(parseFloat, regexp(/^\s*[-+]?\d+(\.\d+)?\s*/));
var tok_plus  = regexp(/^\s*\+\s*/);
var tok_minus = regexp(/^\s*\-\s*/);
var tok_div   = regexp(/^\s*\/\s*/);
var tok_mul   = regexp(/^\s*\*\s*/);
var tok_left  = regexp(/^\s*\(\s*/);
var tok_right = regexp(/^\s*\)\s*/);

// expr := term ("+" expr)?
var expr = seq((s)=>{
	var v = s(term);				// まず term がすくなくともあって、	
	s(option(v, or(
		seq((s)=>{			// 続けて + expr があるかもしれない。ないときのデフォルト値は v 
			var op = s(tok_plus);
			var e = s(expr);
			return v + e;			// + expr がある場合は ()=> v + e が評価されてその値が返る
		}),
		seq((s)=>{			// 続けて + expr があるかもしれない。ないときのデフォルト値は v 
			var op = s(tok_minus);
			var e = s(expr);
			return v - e;			// + expr がある場合は ()=> v + e が評価されてその値が返る
		})
	)));
});

// term := factor ("*" term)?
var term = seq((s)=>{
	var v = s(factor);
	s(option(v, or(
		seq((s)=>{
			var op = s(tok_mul);
			var t = s(term);
			return v * t;
		}),
		seq((s)=>{
			var op = s(tok_div);
			var t = s(term);
			return v / t;
		})
	)));
});

// factor = "(" expr ")"  |  number
var factor = choice((c)=>{		// choice は分岐。最初にマッチしたパーサの値を返す
	c(seq((s)=>{
		s(tok_left);				
		var v = s(expr);			// seq の途中のパーサの値が欲しいときは、
		s(tok_right);				// s の返り値を変数に束縛しておけば良い
		s(ret(()=>v));				// ret は何も消費せず引数の値をそのまま返す
	}));
	c(tok_number);					// ( expr ) にまマッチしなければ、number を試す
});




console.log("test div: 12/2= ");
console.log(expr.parse(new Source("12/2", 0)).value);


console.log("test expr: ");
console.log(expr.parse(new Source("(-1.5+1.5)*2", 0)).value);


console.log("test number: ");
console.log(many(number).parse(new Source("-123.56+34-33.3", 0)).value);




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