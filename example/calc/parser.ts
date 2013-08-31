/// <reference path="../../src/parsect.ts" /> 

//var tok_number = map(parseFloat, regexp(/\s*[-+]?\d+(\.\d+)?\s*/g));
//var tok_plus  = regexp(/\s*\+\s*/g);
//var tok_minus = regexp(/\s*\-\s*/g);
//var tok_div   = regexp(/\s*\/\s*/g);
//var tok_mul   = regexp(/\s*\*\s*/g);
//var tok_left  = regexp(/\s*\(\s*/g);
//var tok_right = regexp(/\s*\)\s*/g);
/*
// expr := term ("+" expr | "-" expr)?
var expr = seq((s)=>{
	var v = s(term);
	s(option(v, or(
		seq((s)=>{	
			s(tok_plus);
			var e = s(expr);
			if(s.success()){
				v = v + e;
			}
		}),
		seq((s)=>{
			s(tok_minus);
			var e = s(expr);
			if(s.success()){
				v = v - e;
			}
		})
	)));
	return v;
});

// term := factor ("*" term | "/" term)?
var term = seq((s)=>{
	var v = s(factor);
	s(option(v, or(
		seq((s)=>{
			s(tok_mul);
			var t = s(term);
			if(s.success()){
				v = v * t;
			}
		}),
		seq((s)=>{
			s(tok_div);
			var t = s(term);
			if(s.success()){
				v = v / t;
			}
		})
	)));
	return v;
});

// factor = "(" expr ")"  |  number
var factor = or(between(tok_left, expr, tok_right), tok_number);

*/