var primativeTypes = 
					[	
						{linux: 'unsigned int',       xenus: 'l_unsigned_int'}, 
						{linux: 'unsigned long',      xenus: 'l_unsigned_long'},
						{linux: 'unsigned long long', xenus: 'l_unsigned_long_long'},
						{linux: 'unsigned short',     xenus: 'l_unsigned_short'},
						
						{linux: 'int',       xenus: 'l_int'}, 
						{linux: 'long',      xenus: 'l_long'},
						{linux: 'long long', xenus: 'l_long_long'},
						{linux: 'short',     xenus: 'l_short'}, 
						
						{linux: 'unsigned', xenus: 'l_unsigned'},
						{linux: 'signed',   xenus: 'l_signed'},
						
						{linux: 'u8',  xenus: 'uint8_t'},
						{linux: 'u16', xenus: 'uint16_t'},
						{linux: 'u32', xenus: 'uint32_t'},
						{linux: 'u64', xenus: 'uint64_t'},

						{linux: 's8',  xenus: 'int8_t'},
						{linux: 's16', xenus: 'int16_t'},
						{linux: 's32', xenus: 'int32_t'},
						{linux: 's64', xenus: 'int64_t'},

,
						{linux: 'struct task_struct *', xenus: 'task_k'},
						{linux: 'const struct task_struct *', xenus: 'task_k'}					
					];
						
function checkReplace(str, x, y) {
	if (str.indexOf(x) != -1) 
		return str.split(x).join(y);
	return undefined;
}

function convertAsterisksToXenus(gccType) {
	var asterisks = "";
	for (var i = 0; i < gccType.split("*").length - 2; i++)
		asterisks += '*';
	return asterisks;
}

function translatePortableTypes(gccType) {
	var name;
	var isConst;
	var asterisks;
	
	if ((gccType.indexOf("struct") == -1) && (gccType.indexOf("const struct") == -1))
		return undefined;
	
	if (gccType.lastIndexOf("*") != gccType.length - 1) 
		return "ILLEGAL_STRUCT_TYPE";
	
	asterisks	= convertAsterisksToXenus(gccType);
	isConst		= gccType.indexOf("const struct") == 0; ;
	name		= gccType.split(" ")[isConst ? 2 : 1] + "_k";
	
	return  (isConst ? "const " : "") + name + (asterisks.length != 0 ? " " + asterisks : "");
}

function translatePrimativeTypes(gccType) {
	var ret;
	
	for (var i in primativeTypes) {
		var obj = primativeTypes[i];
		if (ret = checkReplace(gccType, obj.linux, obj.xenus))
			return ret;
	}
	
	return undefined;
}

function translateType(gccType) {
	var ret;
	
	if (ret = translatePrimativeTypes(gccType))
		return ret;
	
	if (ret = translatePortableTypes(gccType))
		return ret;
	
	return gccType;
}

function readType(str, name) {
	var gccType = str;
	
	if (gccType.indexOf('__user') != -1)
		gccType = gccType.split('__user ').join('').split('__user').join('');
		
	return {
		usrPtr: str.indexOf("__user") != -1,
		name: name,
		linux: gccType,
		xenus: translateType(gccType)
	}
}

function spliceNameType(str) {
	var type;
	var name;
	var obj = {};
	
	if (str.lastIndexOf('*') != -1) {
		type = str.substring(0, str.lastIndexOf('*') + 1);
		name = str.substring(str.lastIndexOf('*') + 1);
		
		var i_a = type.indexOf('*');
		if (type.charAt(i_a - 1) != ' ')
			type = type.substring(0, i_a) + " " + type.substring(i_a);
	} else {
		type = str.substring(0, str.lastIndexOf(' '));
		name = str.substring(str.lastIndexOf(' ') + 1);
	}
	
	if (type.indexOf(" ") == 0)
		type = type.substring(1);
		
	if (name.indexOf(" ") == 0) 
		name = name.substring(1);
	
	type = type.split("__sched ").join("");
	type = type.split("__sched").join("");
	type = type.split("notrace ").join("");
	type = type.split("notrace").join("");
	type = type.split("  ").join(" ");
   
	obj['type'] = type;
	obj['name'] = name;
	return obj;
}

function readParameter(full) {
	if (full == "void")
		return undefined;
	var obj = spliceNameType(full);
	return readType(obj.type, obj.name);
}

function readParameters(full) {
	return full.split(",").map(readParameter).filter((x) => {return x;});
}

function readSymbol(str) {
	var parameters	= str.substring(str.indexOf('(') + 1, str.length - 1);
	var preparams	= spliceNameType(str.substring(0, str.indexOf('(')));
	return {
		name: 		preparams.name,
		returnType: readType(preparams.type),
		parameters: readParameters(parameters)
	};
}

function unfuckType(obj) {
	obj.linux = obj.linux || "";
	obj.xenus = obj.xenus || translateType(obj.linux);
	obj.usrPtr = obj.usrPtr || false;
	return obj;
}

function unfuckSymbol(obj) {
	obj.returnType = unfuckType(obj.returnType);
	obj.parameters = obj.parameters.map(unfuckType);
	return obj;
}

function readEntry(obj) {
	if (typeof(obj) === typeof(""))
		return readSymbol(obj);
	return unfuckSymbol(obj);
}

module.exports = readEntry;