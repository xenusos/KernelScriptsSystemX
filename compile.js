const fs = require("fs");
const util = require("util");
const dec =  require("./parse.js");

var out = [];

// parse 
const functions = JSON.parse(fs.readFileSync("functions.json", 'utf8'));
Object.keys(functions).forEach((key) => {
	out.push({"file": key, "symbols":  functions[key].map(dec)});
});
fs.writeFileSync("functions_compiled.json", JSON.stringify(out, 0, 4));


// osapi headers to be used in the common root
var osAll = "";
out.forEach((obj) => {
	var allBuf = "";
	obj.symbols.forEach((symbol) => {
		allBuf += util.format("XENUS_IMPORT %s %s(%s);\n", symbol.returnType.xenus, symbol.name, symbol.parameters.map((parameter) => {return (parameter.usrPtr ? "user_addr_t" : parameter.xenus) + " " + parameter.name}).join(", "));
	});
	
	fs.writeFileSync("osapi/os_" + obj.file + ".h", allBuf);
	
	osAll += "#include \"";
	osAll += "os_" + obj.file + ".h";
	osAll += "\"\n";
	
});
fs.writeFileSync("osapi/os_generated.h", osAll);


// macro files to be used within the kernel source
var allBuf = "";
out.forEach((obj) => {
	allBuf += util.format("// %s start. \n", obj.file);
	obj.symbols.forEach((symbol) => {
		allBuf += util.format("ADD_FUNCTION_%i(%s)\n", symbol.parameters.length, symbol.name);
	});
});

fs.writeFileSync("kernel/sys_functions_all.macros", allBuf);

module.exports = out;