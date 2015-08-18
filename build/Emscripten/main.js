var Module;
if (!Module) Module = (typeof Module !== "undefined" ? Module : null) || {};
var moduleOverrides = {};
for (var key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB;
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
 if (!Module["print"]) Module["print"] = function print(x) {
  process["stdout"].write(x + "\n");
 };
 if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
  process["stderr"].write(x + "\n");
 };
 var nodeFS = require("fs");
 var nodePath = require("path");
 Module["read"] = function read(filename, binary) {
  filename = nodePath["normalize"](filename);
  var ret = nodeFS["readFileSync"](filename);
  if (!ret && filename != nodePath["resolve"](filename)) {
   filename = path.join(__dirname, "..", "src", filename);
   ret = nodeFS["readFileSync"](filename);
  }
  if (ret && !binary) ret = ret.toString();
  return ret;
 };
 Module["readBinary"] = function readBinary(filename) {
  return Module["read"](filename, true);
 };
 Module["load"] = function load(f) {
  globalEval(read(f));
 };
 if (!Module["thisProgram"]) {
  if (process["argv"].length > 1) {
   Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
  } else {
   Module["thisProgram"] = "unknown-program";
  }
 }
 Module["arguments"] = process["argv"].slice(2);
 if (typeof module !== "undefined") {
  module["exports"] = Module;
 }
 process["on"]("uncaughtException", (function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 }));
 Module["inspect"] = (function() {
  return "[Emscripten Module object]";
 });
} else if (ENVIRONMENT_IS_SHELL) {
 if (!Module["print"]) Module["print"] = print;
 if (typeof printErr != "undefined") Module["printErr"] = printErr;
 if (typeof read != "undefined") {
  Module["read"] = read;
 } else {
  Module["read"] = function read() {
   throw "no read() available (jsc?)";
  };
 }
 Module["readBinary"] = function readBinary(f) {
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  var data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 Module["read"] = function read(url) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.responseText;
 };
 if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof console !== "undefined") {
  if (!Module["print"]) Module["print"] = function print(x) {
   console.log(x);
  };
  if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
   console.log(x);
  };
 } else {
  var TRY_USE_DUMP = false;
  if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
   dump(x);
  }) : (function(x) {});
 }
 if (ENVIRONMENT_IS_WORKER) {
  Module["load"] = importScripts;
 }
 if (typeof Module["setWindowTitle"] === "undefined") {
  Module["setWindowTitle"] = (function(title) {
   document.title = title;
  });
 }
} else {
 throw "Unknown runtime environment. Where are we?";
}
function globalEval(x) {
 eval.call(null, x);
}
if (!Module["load"] && Module["read"]) {
 Module["load"] = function load(f) {
  globalEval(Module["read"](f));
 };
}
if (!Module["print"]) {
 Module["print"] = (function() {});
}
if (!Module["printErr"]) {
 Module["printErr"] = Module["print"];
}
if (!Module["arguments"]) {
 Module["arguments"] = [];
}
if (!Module["thisProgram"]) {
 Module["thisProgram"] = "./this.program";
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (var key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}
var Runtime = {
 setTempRet0: (function(value) {
  tempRet0 = value;
 }),
 getTempRet0: (function() {
  return tempRet0;
 }),
 stackSave: (function() {
  return STACKTOP;
 }),
 stackRestore: (function(stackTop) {
  STACKTOP = stackTop;
 }),
 getNativeTypeSize: (function(type) {
  switch (type) {
  case "i1":
  case "i8":
   return 1;
  case "i16":
   return 2;
  case "i32":
   return 4;
  case "i64":
   return 8;
  case "float":
   return 4;
  case "double":
   return 8;
  default:
   {
    if (type[type.length - 1] === "*") {
     return Runtime.QUANTUM_SIZE;
    } else if (type[0] === "i") {
     var bits = parseInt(type.substr(1));
     assert(bits % 8 === 0);
     return bits / 8;
    } else {
     return 0;
    }
   }
  }
 }),
 getNativeFieldSize: (function(type) {
  return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
 }),
 STACK_ALIGN: 16,
 prepVararg: (function(ptr, type) {
  if (type === "double" || type === "i64") {
   if (ptr & 7) {
    assert((ptr & 7) === 4);
    ptr += 4;
   }
  } else {
   assert((ptr & 3) === 0);
  }
  return ptr;
 }),
 getAlignSize: (function(type, size, vararg) {
  if (!vararg && (type == "i64" || type == "double")) return 8;
  if (!type) return Math.min(size, 8);
  return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
 }),
 dynCall: (function(sig, ptr, args) {
  if (args && args.length) {
   if (!args.splice) args = Array.prototype.slice.call(args);
   args.splice(0, 0, ptr);
   return Module["dynCall_" + sig].apply(null, args);
  } else {
   return Module["dynCall_" + sig].call(null, ptr);
  }
 }),
 functionPointers: [],
 addFunction: (function(func) {
  for (var i = 0; i < Runtime.functionPointers.length; i++) {
   if (!Runtime.functionPointers[i]) {
    Runtime.functionPointers[i] = func;
    return 2 * (1 + i);
   }
  }
  throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.";
 }),
 removeFunction: (function(index) {
  Runtime.functionPointers[(index - 2) / 2] = null;
 }),
 warnOnce: (function(text) {
  if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
  if (!Runtime.warnOnce.shown[text]) {
   Runtime.warnOnce.shown[text] = 1;
   Module.printErr(text);
  }
 }),
 funcWrappers: {},
 getFuncWrapper: (function(func, sig) {
  assert(sig);
  if (!Runtime.funcWrappers[sig]) {
   Runtime.funcWrappers[sig] = {};
  }
  var sigCache = Runtime.funcWrappers[sig];
  if (!sigCache[func]) {
   sigCache[func] = function dynCall_wrapper() {
    return Runtime.dynCall(sig, func, arguments);
   };
  }
  return sigCache[func];
 }),
 getCompilerSetting: (function(name) {
  throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work";
 }),
 stackAlloc: (function(size) {
  var ret = STACKTOP;
  STACKTOP = STACKTOP + size | 0;
  STACKTOP = STACKTOP + 15 & -16;
  return ret;
 }),
 staticAlloc: (function(size) {
  var ret = STATICTOP;
  STATICTOP = STATICTOP + size | 0;
  STATICTOP = STATICTOP + 15 & -16;
  return ret;
 }),
 dynamicAlloc: (function(size) {
  var ret = DYNAMICTOP;
  DYNAMICTOP = DYNAMICTOP + size | 0;
  DYNAMICTOP = DYNAMICTOP + 15 & -16;
  if (DYNAMICTOP >= TOTAL_MEMORY) {
   var success = enlargeMemory();
   if (!success) {
    DYNAMICTOP = ret;
    return 0;
   }
  }
  return ret;
 }),
 alignMemory: (function(size, quantum) {
  var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
  return ret;
 }),
 makeBigInt: (function(low, high, unsigned) {
  var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
  return ret;
 }),
 GLOBAL_BASE: 8,
 QUANTUM_SIZE: 4,
 __dummy__: 0
};
Module["Runtime"] = Runtime;
var __THREW__ = 0;
var ABORT = false;
var EXITSTATUS = 0;
var undef = 0;
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}
var globalScope = this;
function getCFunc(ident) {
 var func = Module["_" + ident];
 if (!func) {
  try {
   func = eval("_" + ident);
  } catch (e) {}
 }
 assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
 return func;
}
var cwrap, ccall;
((function() {
 var JSfuncs = {
  "stackSave": (function() {
   Runtime.stackSave();
  }),
  "stackRestore": (function() {
   Runtime.stackRestore();
  }),
  "arrayToC": (function(arr) {
   var ret = Runtime.stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }),
  "stringToC": (function(str) {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    ret = Runtime.stackAlloc((str.length << 2) + 1);
    writeStringToMemory(str, ret);
   }
   return ret;
  })
 };
 var toC = {
  "string": JSfuncs["stringToC"],
  "array": JSfuncs["arrayToC"]
 };
 ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
   for (var i = 0; i < args.length; i++) {
    var converter = toC[argTypes[i]];
    if (converter) {
     if (stack === 0) stack = Runtime.stackSave();
     cArgs[i] = converter(args[i]);
    } else {
     cArgs[i] = args[i];
    }
   }
  }
  var ret = func.apply(null, cArgs);
  if (returnType === "string") ret = Pointer_stringify(ret);
  if (stack !== 0) {
   if (opts && opts.async) {
    EmterpreterAsync.asyncFinalizers.push((function() {
     Runtime.stackRestore(stack);
    }));
    return;
   }
   Runtime.stackRestore(stack);
  }
  return ret;
 };
 var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
 function parseJSFunc(jsfunc) {
  var parsed = jsfunc.toString().match(sourceRegex).slice(1);
  return {
   arguments: parsed[0],
   body: parsed[1],
   returnValue: parsed[2]
  };
 }
 var JSsource = {};
 for (var fun in JSfuncs) {
  if (JSfuncs.hasOwnProperty(fun)) {
   JSsource[fun] = parseJSFunc(JSfuncs[fun]);
  }
 }
 cwrap = function cwrap(ident, returnType, argTypes) {
  argTypes = argTypes || [];
  var cfunc = getCFunc(ident);
  var numericArgs = argTypes.every((function(type) {
   return type === "number";
  }));
  var numericRet = returnType !== "string";
  if (numericRet && numericArgs) {
   return cfunc;
  }
  var argNames = argTypes.map((function(x, i) {
   return "$" + i;
  }));
  var funcstr = "(function(" + argNames.join(",") + ") {";
  var nargs = argTypes.length;
  if (!numericArgs) {
   funcstr += "var stack = " + JSsource["stackSave"].body + ";";
   for (var i = 0; i < nargs; i++) {
    var arg = argNames[i], type = argTypes[i];
    if (type === "number") continue;
    var convertCode = JSsource[type + "ToC"];
    funcstr += "var " + convertCode.arguments + " = " + arg + ";";
    funcstr += convertCode.body + ";";
    funcstr += arg + "=" + convertCode.returnValue + ";";
   }
  }
  var cfuncname = parseJSFunc((function() {
   return cfunc;
  })).returnValue;
  funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
  if (!numericRet) {
   var strgfy = parseJSFunc((function() {
    return Pointer_stringify;
   })).returnValue;
   funcstr += "ret = " + strgfy + "(ret);";
  }
  if (!numericArgs) {
   funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";";
  }
  funcstr += "return ret})";
  return eval(funcstr);
 };
}))();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;
function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  break;
 case "i8":
  HEAP8[ptr >> 0] = value;
  break;
 case "i16":
  HEAP16[ptr >> 1] = value;
  break;
 case "i32":
  HEAP32[ptr >> 2] = value;
  break;
 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0) ], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  break;
 case "float":
  HEAPF32[ptr >> 2] = value;
  break;
 case "double":
  HEAPF64[ptr >> 3] = value;
  break;
 default:
  abort("invalid type for setValue: " + type);
 }
}
Module["setValue"] = setValue;
function getValue(ptr, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  return HEAP8[ptr >> 0];
 case "i8":
  return HEAP8[ptr >> 0];
 case "i16":
  return HEAP16[ptr >> 1];
 case "i32":
  return HEAP32[ptr >> 2];
 case "i64":
  return HEAP32[ptr >> 2];
 case "float":
  return HEAPF32[ptr >> 2];
 case "double":
  return HEAPF64[ptr >> 3];
 default:
  abort("invalid type for setValue: " + type);
 }
 return null;
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;
function allocate(slab, types, allocator, ptr) {
 var zeroinit, size;
 if (typeof slab === "number") {
  zeroinit = true;
  size = slab;
 } else {
  zeroinit = false;
  size = slab.length;
 }
 var singleType = typeof types === "string" ? types : null;
 var ret;
 if (allocator == ALLOC_NONE) {
  ret = ptr;
 } else {
  ret = [ _malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc ][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
 }
 if (zeroinit) {
  var ptr = ret, stop;
  assert((ret & 3) == 0);
  stop = ret + (size & ~3);
  for (; ptr < stop; ptr += 4) {
   HEAP32[ptr >> 2] = 0;
  }
  stop = ret + size;
  while (ptr < stop) {
   HEAP8[ptr++ >> 0] = 0;
  }
  return ret;
 }
 if (singleType === "i8") {
  if (slab.subarray || slab.slice) {
   HEAPU8.set(slab, ret);
  } else {
   HEAPU8.set(new Uint8Array(slab), ret);
  }
  return ret;
 }
 var i = 0, type, typeSize, previousType;
 while (i < size) {
  var curr = slab[i];
  if (typeof curr === "function") {
   curr = Runtime.getFunctionIndex(curr);
  }
  type = singleType || types[i];
  if (type === 0) {
   i++;
   continue;
  }
  if (type == "i64") type = "i32";
  setValue(ret + i, curr, type);
  if (previousType !== type) {
   typeSize = Runtime.getNativeTypeSize(type);
   previousType = type;
  }
  i += typeSize;
 }
 return ret;
}
Module["allocate"] = allocate;
function getMemory(size) {
 if (!staticSealed) return Runtime.staticAlloc(size);
 if (typeof _sbrk !== "undefined" && !_sbrk.called || !runtimeInitialized) return Runtime.dynamicAlloc(size);
 return _malloc(size);
}
Module["getMemory"] = getMemory;
function Pointer_stringify(ptr, length) {
 if (length === 0 || !ptr) return "";
 var hasUtf = 0;
 var t;
 var i = 0;
 while (1) {
  t = HEAPU8[ptr + i >> 0];
  hasUtf |= t;
  if (t == 0 && !length) break;
  i++;
  if (length && i == length) break;
 }
 if (!length) length = i;
 var ret = "";
 if (hasUtf < 128) {
  var MAX_CHUNK = 1024;
  var curr;
  while (length > 0) {
   curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
   ret = ret ? ret + curr : curr;
   ptr += MAX_CHUNK;
   length -= MAX_CHUNK;
  }
  return ret;
 }
 return Module["UTF8ToString"](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;
function AsciiToString(ptr) {
 var str = "";
 while (1) {
  var ch = HEAP8[ptr++ >> 0];
  if (!ch) return str;
  str += String.fromCharCode(ch);
 }
}
Module["AsciiToString"] = AsciiToString;
function stringToAscii(str, outPtr) {
 return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;
function UTF8ArrayToString(u8Array, idx) {
 var u0, u1, u2, u3, u4, u5;
 var str = "";
 while (1) {
  u0 = u8Array[idx++];
  if (!u0) return str;
  if (!(u0 & 128)) {
   str += String.fromCharCode(u0);
   continue;
  }
  u1 = u8Array[idx++] & 63;
  if ((u0 & 224) == 192) {
   str += String.fromCharCode((u0 & 31) << 6 | u1);
   continue;
  }
  u2 = u8Array[idx++] & 63;
  if ((u0 & 240) == 224) {
   u0 = (u0 & 15) << 12 | u1 << 6 | u2;
  } else {
   u3 = u8Array[idx++] & 63;
   if ((u0 & 248) == 240) {
    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
   } else {
    u4 = u8Array[idx++] & 63;
    if ((u0 & 252) == 248) {
     u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
    } else {
     u5 = u8Array[idx++] & 63;
     u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
    }
   }
  }
  if (u0 < 65536) {
   str += String.fromCharCode(u0);
  } else {
   var ch = u0 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  }
 }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;
function UTF8ToString(ptr) {
 return UTF8ArrayToString(HEAPU8, ptr);
}
Module["UTF8ToString"] = UTF8ToString;
function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   outU8Array[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   outU8Array[outIdx++] = 192 | u >> 6;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   outU8Array[outIdx++] = 224 | u >> 12;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 2097151) {
   if (outIdx + 3 >= endIdx) break;
   outU8Array[outIdx++] = 240 | u >> 18;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 67108863) {
   if (outIdx + 4 >= endIdx) break;
   outU8Array[outIdx++] = 248 | u >> 24;
   outU8Array[outIdx++] = 128 | u >> 18 & 63;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 5 >= endIdx) break;
   outU8Array[outIdx++] = 252 | u >> 30;
   outU8Array[outIdx++] = 128 | u >> 24 & 63;
   outU8Array[outIdx++] = 128 | u >> 18 & 63;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  }
 }
 outU8Array[outIdx] = 0;
 return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;
function stringToUTF8(str, outPtr, maxBytesToWrite) {
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;
function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) {
   ++len;
  } else if (u <= 2047) {
   len += 2;
  } else if (u <= 65535) {
   len += 3;
  } else if (u <= 2097151) {
   len += 4;
  } else if (u <= 67108863) {
   len += 5;
  } else {
   len += 6;
  }
 }
 return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;
function UTF16ToString(ptr) {
 var i = 0;
 var str = "";
 while (1) {
  var codeUnit = HEAP16[ptr + i * 2 >> 1];
  if (codeUnit == 0) return str;
  ++i;
  str += String.fromCharCode(codeUnit);
 }
}
Module["UTF16ToString"] = UTF16ToString;
function stringToUTF16(str, outPtr, maxBytesToWrite) {
 if (maxBytesToWrite === undefined) {
  maxBytesToWrite = 2147483647;
 }
 if (maxBytesToWrite < 2) return 0;
 maxBytesToWrite -= 2;
 var startPtr = outPtr;
 var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
 for (var i = 0; i < numCharsToWrite; ++i) {
  var codeUnit = str.charCodeAt(i);
  HEAP16[outPtr >> 1] = codeUnit;
  outPtr += 2;
 }
 HEAP16[outPtr >> 1] = 0;
 return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;
function lengthBytesUTF16(str) {
 return str.length * 2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;
function UTF32ToString(ptr) {
 var i = 0;
 var str = "";
 while (1) {
  var utf32 = HEAP32[ptr + i * 4 >> 2];
  if (utf32 == 0) return str;
  ++i;
  if (utf32 >= 65536) {
   var ch = utf32 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  } else {
   str += String.fromCharCode(utf32);
  }
 }
}
Module["UTF32ToString"] = UTF32ToString;
function stringToUTF32(str, outPtr, maxBytesToWrite) {
 if (maxBytesToWrite === undefined) {
  maxBytesToWrite = 2147483647;
 }
 if (maxBytesToWrite < 4) return 0;
 var startPtr = outPtr;
 var endPtr = startPtr + maxBytesToWrite - 4;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) {
   var trailSurrogate = str.charCodeAt(++i);
   codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
  }
  HEAP32[outPtr >> 2] = codeUnit;
  outPtr += 4;
  if (outPtr + 4 > endPtr) break;
 }
 HEAP32[outPtr >> 2] = 0;
 return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;
function lengthBytesUTF32(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
  len += 4;
 }
 return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;
function demangle(func) {
 var hasLibcxxabi = !!Module["___cxa_demangle"];
 if (hasLibcxxabi) {
  try {
   var buf = _malloc(func.length);
   writeStringToMemory(func.substr(1), buf);
   var status = _malloc(4);
   var ret = Module["___cxa_demangle"](buf, 0, 0, status);
   if (getValue(status, "i32") === 0 && ret) {
    return Pointer_stringify(ret);
   }
  } catch (e) {} finally {
   if (buf) _free(buf);
   if (status) _free(status);
   if (ret) _free(ret);
  }
 }
 var i = 3;
 var basicTypes = {
  "v": "void",
  "b": "bool",
  "c": "char",
  "s": "short",
  "i": "int",
  "l": "long",
  "f": "float",
  "d": "double",
  "w": "wchar_t",
  "a": "signed char",
  "h": "unsigned char",
  "t": "unsigned short",
  "j": "unsigned int",
  "m": "unsigned long",
  "x": "long long",
  "y": "unsigned long long",
  "z": "..."
 };
 var subs = [];
 var first = true;
 function dump(x) {
  if (x) Module.print(x);
  Module.print(func);
  var pre = "";
  for (var a = 0; a < i; a++) pre += " ";
  Module.print(pre + "^");
 }
 function parseNested() {
  i++;
  if (func[i] === "K") i++;
  var parts = [];
  while (func[i] !== "E") {
   if (func[i] === "S") {
    i++;
    var next = func.indexOf("_", i);
    var num = func.substring(i, next) || 0;
    parts.push(subs[num] || "?");
    i = next + 1;
    continue;
   }
   if (func[i] === "C") {
    parts.push(parts[parts.length - 1]);
    i += 2;
    continue;
   }
   var size = parseInt(func.substr(i));
   var pre = size.toString().length;
   if (!size || !pre) {
    i--;
    break;
   }
   var curr = func.substr(i + pre, size);
   parts.push(curr);
   subs.push(curr);
   i += pre + size;
  }
  i++;
  return parts;
 }
 function parse(rawList, limit, allowVoid) {
  limit = limit || Infinity;
  var ret = "", list = [];
  function flushList() {
   return "(" + list.join(", ") + ")";
  }
  var name;
  if (func[i] === "N") {
   name = parseNested().join("::");
   limit--;
   if (limit === 0) return rawList ? [ name ] : name;
  } else {
   if (func[i] === "K" || first && func[i] === "L") i++;
   var size = parseInt(func.substr(i));
   if (size) {
    var pre = size.toString().length;
    name = func.substr(i + pre, size);
    i += pre + size;
   }
  }
  first = false;
  if (func[i] === "I") {
   i++;
   var iList = parse(true);
   var iRet = parse(true, 1, true);
   ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">";
  } else {
   ret = name;
  }
  paramLoop : while (i < func.length && limit-- > 0) {
   var c = func[i++];
   if (c in basicTypes) {
    list.push(basicTypes[c]);
   } else {
    switch (c) {
    case "P":
     list.push(parse(true, 1, true)[0] + "*");
     break;
    case "R":
     list.push(parse(true, 1, true)[0] + "&");
     break;
    case "L":
     {
      i++;
      var end = func.indexOf("E", i);
      var size = end - i;
      list.push(func.substr(i, size));
      i += size + 2;
      break;
     }
    case "A":
     {
      var size = parseInt(func.substr(i));
      i += size.toString().length;
      if (func[i] !== "_") throw "?";
      i++;
      list.push(parse(true, 1, true)[0] + " [" + size + "]");
      break;
     }
    case "E":
     break paramLoop;
    default:
     ret += "?" + c;
     break paramLoop;
    }
   }
  }
  if (!allowVoid && list.length === 1 && list[0] === "void") list = [];
  if (rawList) {
   if (ret) {
    list.push(ret + "?");
   }
   return list;
  } else {
   return ret + flushList();
  }
 }
 var parsed = func;
 try {
  if (func == "Object._main" || func == "_main") {
   return "main()";
  }
  if (typeof func === "number") func = Pointer_stringify(func);
  if (func[0] !== "_") return func;
  if (func[1] !== "_") return func;
  if (func[2] !== "Z") return func;
  switch (func[3]) {
  case "n":
   return "operator new()";
  case "d":
   return "operator delete()";
  }
  parsed = parse();
 } catch (e) {
  parsed += "?";
 }
 if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
  Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
 }
 return parsed;
}
function demangleAll(text) {
 return text.replace(/__Z[\w\d_]+/g, (function(x) {
  var y = demangle(x);
  return x === y ? x : x + " [" + y + "]";
 }));
}
function jsStackTrace() {
 var err = new Error;
 if (!err.stack) {
  try {
   throw new Error(0);
  } catch (e) {
   err = e;
  }
  if (!err.stack) {
   return "(no stack trace available)";
  }
 }
 return err.stack.toString();
}
function stackTrace() {
 return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
 if (x % 4096 > 0) {
  x += 4096 - x % 4096;
 }
 return x;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false;
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0;
var DYNAMIC_BASE = 0, DYNAMICTOP = 0;
function enlargeMemory() {
 abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.");
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 67108864;
var totalMemory = 64 * 1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
 if (totalMemory < 16 * 1024 * 1024) {
  totalMemory *= 2;
 } else {
  totalMemory += 16 * 1024 * 1024;
 }
}
if (totalMemory !== TOTAL_MEMORY) {
 Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec (and given that TOTAL_STACK=" + TOTAL_STACK + ")");
 TOTAL_MEMORY = totalMemory;
}
assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
var buffer;
buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Runtime.dynCall("v", func);
   } else {
    Runtime.dynCall("vi", func, [ callback.arg ]);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
 callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
 callRuntimeCallbacks(__ATEXIT__);
 runtimeExited = true;
}
function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}
Module["addOnInit"] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
 __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;
function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}
Module["intArrayFromString"] = intArrayFromString;
function intArrayToString(array) {
 var ret = [];
 for (var i = 0; i < array.length; i++) {
  var chr = array[i];
  if (chr > 255) {
   chr &= 255;
  }
  ret.push(String.fromCharCode(chr));
 }
 return ret.join("");
}
Module["intArrayToString"] = intArrayToString;
function writeStringToMemory(string, buffer, dontAddNull) {
 var array = intArrayFromString(string, dontAddNull);
 var i = 0;
 while (i < array.length) {
  var chr = array[i];
  HEAP8[buffer + i >> 0] = chr;
  i = i + 1;
 }
}
Module["writeStringToMemory"] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
 for (var i = 0; i < array.length; i++) {
  HEAP8[buffer++ >> 0] = array[i];
 }
}
Module["writeArrayToMemory"] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; ++i) {
  HEAP8[buffer++ >> 0] = str.charCodeAt(i);
 }
 if (!dontAddNull) HEAP8[buffer >> 0] = 0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;
function unSign(value, bits, ignore) {
 if (value >= 0) {
  return value;
 }
 return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}
function reSign(value, bits, ignore) {
 if (value <= 0) {
  return value;
 }
 var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
 if (value >= half && (bits <= 32 || value > half)) {
  value = -2 * half + value;
 }
 return value;
}
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) Math["imul"] = function imul(a, b) {
 var ah = a >>> 16;
 var al = a & 65535;
 var bh = b >>> 16;
 var bl = b & 65535;
 return al * bl + (ah * bl + al * bh << 16) | 0;
};
Math.imul = Math["imul"];
if (!Math["clz32"]) Math["clz32"] = (function(x) {
 x = x >>> 0;
 for (var i = 0; i < 32; i++) {
  if (x & 1 << 31 - i) return i;
 }
 return 32;
});
Math.clz32 = Math["clz32"];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function getUniqueRunDependency(id) {
 return id;
}
function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}
Module["addRunDependency"] = addRunDependency;
function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
var ASM_CONSTS = [];
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 14432;
__ATINIT__.push({
 func: (function() {
  __GLOBAL__sub_I_iostream_cpp();
 })
});
memoryInitializer = "main.html.mem";
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) {
 HEAP8[tempDoublePtr] = HEAP8[ptr];
 HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
 HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
 HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
}
function copyTempDouble(ptr) {
 HEAP8[tempDoublePtr] = HEAP8[ptr];
 HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
 HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
 HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
 HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
 HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
 HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
 HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7];
}
function _atexit(func, arg) {
 __ATEXIT__.unshift({
  func: func,
  arg: arg
 });
}
function ___cxa_atexit() {
 return _atexit.apply(null, arguments);
}
Module["_i64Subtract"] = _i64Subtract;
function ___assert_fail(condition, filename, line, func) {
 ABORT = true;
 throw "Assertion failed: " + Pointer_stringify(condition) + ", at: " + [ filename ? Pointer_stringify(filename) : "unknown filename", line, func ? Pointer_stringify(func) : "unknown function" ] + " at " + stackTrace();
}
function __ZSt18uncaught_exceptionv() {
 return !!__ZSt18uncaught_exceptionv.uncaught_exception;
}
var EXCEPTIONS = {
 last: 0,
 caught: [],
 infos: {},
 deAdjust: (function(adjusted) {
  if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
  for (var ptr in EXCEPTIONS.infos) {
   var info = EXCEPTIONS.infos[ptr];
   if (info.adjusted === adjusted) {
    return ptr;
   }
  }
  return adjusted;
 }),
 addRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  info.refcount++;
 }),
 decRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  assert(info.refcount > 0);
  info.refcount--;
  if (info.refcount === 0) {
   if (info.destructor) {
    Runtime.dynCall("vi", info.destructor, [ ptr ]);
   }
   delete EXCEPTIONS.infos[ptr];
   ___cxa_free_exception(ptr);
  }
 }),
 clearRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  info.refcount = 0;
 })
};
function ___resumeException(ptr) {
 if (!EXCEPTIONS.last) {
  EXCEPTIONS.last = ptr;
 }
 EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr));
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
function ___cxa_find_matching_catch() {
 var thrown = EXCEPTIONS.last;
 if (!thrown) {
  return (asm["setTempRet0"](0), 0) | 0;
 }
 var info = EXCEPTIONS.infos[thrown];
 var throwntype = info.type;
 if (!throwntype) {
  return (asm["setTempRet0"](0), thrown) | 0;
 }
 var typeArray = Array.prototype.slice.call(arguments);
 var pointer = Module["___cxa_is_pointer_type"](throwntype);
 if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
 HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
 thrown = ___cxa_find_matching_catch.buffer;
 for (var i = 0; i < typeArray.length; i++) {
  if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
   thrown = HEAP32[thrown >> 2];
   info.adjusted = thrown;
   return (asm["setTempRet0"](typeArray[i]), thrown) | 0;
  }
 }
 thrown = HEAP32[thrown >> 2];
 return (asm["setTempRet0"](throwntype), thrown) | 0;
}
function ___cxa_throw(ptr, type, destructor) {
 EXCEPTIONS.infos[ptr] = {
  ptr: ptr,
  adjusted: ptr,
  type: type,
  destructor: destructor,
  refcount: 0
 };
 EXCEPTIONS.last = ptr;
 if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
  __ZSt18uncaught_exceptionv.uncaught_exception = 1;
 } else {
  __ZSt18uncaught_exceptionv.uncaught_exception++;
 }
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
Module["_memset"] = _memset;
var _BDtoILow = true;
var ERRNO_CODES = {
 EPERM: 1,
 ENOENT: 2,
 ESRCH: 3,
 EINTR: 4,
 EIO: 5,
 ENXIO: 6,
 E2BIG: 7,
 ENOEXEC: 8,
 EBADF: 9,
 ECHILD: 10,
 EAGAIN: 11,
 EWOULDBLOCK: 11,
 ENOMEM: 12,
 EACCES: 13,
 EFAULT: 14,
 ENOTBLK: 15,
 EBUSY: 16,
 EEXIST: 17,
 EXDEV: 18,
 ENODEV: 19,
 ENOTDIR: 20,
 EISDIR: 21,
 EINVAL: 22,
 ENFILE: 23,
 EMFILE: 24,
 ENOTTY: 25,
 ETXTBSY: 26,
 EFBIG: 27,
 ENOSPC: 28,
 ESPIPE: 29,
 EROFS: 30,
 EMLINK: 31,
 EPIPE: 32,
 EDOM: 33,
 ERANGE: 34,
 ENOMSG: 42,
 EIDRM: 43,
 ECHRNG: 44,
 EL2NSYNC: 45,
 EL3HLT: 46,
 EL3RST: 47,
 ELNRNG: 48,
 EUNATCH: 49,
 ENOCSI: 50,
 EL2HLT: 51,
 EDEADLK: 35,
 ENOLCK: 37,
 EBADE: 52,
 EBADR: 53,
 EXFULL: 54,
 ENOANO: 55,
 EBADRQC: 56,
 EBADSLT: 57,
 EDEADLOCK: 35,
 EBFONT: 59,
 ENOSTR: 60,
 ENODATA: 61,
 ETIME: 62,
 ENOSR: 63,
 ENONET: 64,
 ENOPKG: 65,
 EREMOTE: 66,
 ENOLINK: 67,
 EADV: 68,
 ESRMNT: 69,
 ECOMM: 70,
 EPROTO: 71,
 EMULTIHOP: 72,
 EDOTDOT: 73,
 EBADMSG: 74,
 ENOTUNIQ: 76,
 EBADFD: 77,
 EREMCHG: 78,
 ELIBACC: 79,
 ELIBBAD: 80,
 ELIBSCN: 81,
 ELIBMAX: 82,
 ELIBEXEC: 83,
 ENOSYS: 38,
 ENOTEMPTY: 39,
 ENAMETOOLONG: 36,
 ELOOP: 40,
 EOPNOTSUPP: 95,
 EPFNOSUPPORT: 96,
 ECONNRESET: 104,
 ENOBUFS: 105,
 EAFNOSUPPORT: 97,
 EPROTOTYPE: 91,
 ENOTSOCK: 88,
 ENOPROTOOPT: 92,
 ESHUTDOWN: 108,
 ECONNREFUSED: 111,
 EADDRINUSE: 98,
 ECONNABORTED: 103,
 ENETUNREACH: 101,
 ENETDOWN: 100,
 ETIMEDOUT: 110,
 EHOSTDOWN: 112,
 EHOSTUNREACH: 113,
 EINPROGRESS: 115,
 EALREADY: 114,
 EDESTADDRREQ: 89,
 EMSGSIZE: 90,
 EPROTONOSUPPORT: 93,
 ESOCKTNOSUPPORT: 94,
 EADDRNOTAVAIL: 99,
 ENETRESET: 102,
 EISCONN: 106,
 ENOTCONN: 107,
 ETOOMANYREFS: 109,
 EUSERS: 87,
 EDQUOT: 122,
 ESTALE: 116,
 ENOTSUP: 95,
 ENOMEDIUM: 123,
 EILSEQ: 84,
 EOVERFLOW: 75,
 ECANCELED: 125,
 ENOTRECOVERABLE: 131,
 EOWNERDEAD: 130,
 ESTRPIPE: 86
};
var ERRNO_MESSAGES = {
 0: "Success",
 1: "Not super-user",
 2: "No such file or directory",
 3: "No such process",
 4: "Interrupted system call",
 5: "I/O error",
 6: "No such device or address",
 7: "Arg list too long",
 8: "Exec format error",
 9: "Bad file number",
 10: "No children",
 11: "No more processes",
 12: "Not enough core",
 13: "Permission denied",
 14: "Bad address",
 15: "Block device required",
 16: "Mount device busy",
 17: "File exists",
 18: "Cross-device link",
 19: "No such device",
 20: "Not a directory",
 21: "Is a directory",
 22: "Invalid argument",
 23: "Too many open files in system",
 24: "Too many open files",
 25: "Not a typewriter",
 26: "Text file busy",
 27: "File too large",
 28: "No space left on device",
 29: "Illegal seek",
 30: "Read only file system",
 31: "Too many links",
 32: "Broken pipe",
 33: "Math arg out of domain of func",
 34: "Math result not representable",
 35: "File locking deadlock error",
 36: "File or path name too long",
 37: "No record locks available",
 38: "Function not implemented",
 39: "Directory not empty",
 40: "Too many symbolic links",
 42: "No message of desired type",
 43: "Identifier removed",
 44: "Channel number out of range",
 45: "Level 2 not synchronized",
 46: "Level 3 halted",
 47: "Level 3 reset",
 48: "Link number out of range",
 49: "Protocol driver not attached",
 50: "No CSI structure available",
 51: "Level 2 halted",
 52: "Invalid exchange",
 53: "Invalid request descriptor",
 54: "Exchange full",
 55: "No anode",
 56: "Invalid request code",
 57: "Invalid slot",
 59: "Bad font file fmt",
 60: "Device not a stream",
 61: "No data (for no delay io)",
 62: "Timer expired",
 63: "Out of streams resources",
 64: "Machine is not on the network",
 65: "Package not installed",
 66: "The object is remote",
 67: "The link has been severed",
 68: "Advertise error",
 69: "Srmount error",
 70: "Communication error on send",
 71: "Protocol error",
 72: "Multihop attempted",
 73: "Cross mount point (not really error)",
 74: "Trying to read unreadable message",
 75: "Value too large for defined data type",
 76: "Given log. name not unique",
 77: "f.d. invalid for this operation",
 78: "Remote address changed",
 79: "Can   access a needed shared lib",
 80: "Accessing a corrupted shared lib",
 81: ".lib section in a.out corrupted",
 82: "Attempting to link in too many libs",
 83: "Attempting to exec a shared library",
 84: "Illegal byte sequence",
 86: "Streams pipe error",
 87: "Too many users",
 88: "Socket operation on non-socket",
 89: "Destination address required",
 90: "Message too long",
 91: "Protocol wrong type for socket",
 92: "Protocol not available",
 93: "Unknown protocol",
 94: "Socket type not supported",
 95: "Not supported",
 96: "Protocol family not supported",
 97: "Address family not supported by protocol family",
 98: "Address already in use",
 99: "Address not available",
 100: "Network interface is not configured",
 101: "Network is unreachable",
 102: "Connection reset by network",
 103: "Connection aborted",
 104: "Connection reset by peer",
 105: "No buffer space available",
 106: "Socket is already connected",
 107: "Socket is not connected",
 108: "Can't send after socket shutdown",
 109: "Too many references",
 110: "Connection timed out",
 111: "Connection refused",
 112: "Host is down",
 113: "Host is unreachable",
 114: "Socket already connected",
 115: "Connection already in progress",
 116: "Stale file handle",
 122: "Quota exceeded",
 123: "No medium (in tape drive)",
 125: "Operation canceled",
 130: "Previous owner died",
 131: "State not recoverable"
};
var ___errno_state = 0;
function ___setErrNo(value) {
 HEAP32[___errno_state >> 2] = value;
 return value;
}
function _strerror_r(errnum, strerrbuf, buflen) {
 if (errnum in ERRNO_MESSAGES) {
  if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
   return ___setErrNo(ERRNO_CODES.ERANGE);
  } else {
   var msg = ERRNO_MESSAGES[errnum];
   writeAsciiToMemory(msg, strerrbuf);
   return 0;
  }
 } else {
  return ___setErrNo(ERRNO_CODES.EINVAL);
 }
}
function _strerror(errnum) {
 if (!_strerror.buffer) _strerror.buffer = _malloc(256);
 _strerror_r(errnum, _strerror.buffer, 256);
 return _strerror.buffer;
}
function _pthread_mutex_lock() {}
function __isLeapYear(year) {
 return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function __arraySum(array, index) {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) ;
 return sum;
}
var __MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
var __MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
function __addDays(date, days) {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = __isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= daysInCurrentMonth - newDate.getDate() + 1;
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
}
function _strftime(s, maxsize, format, tm) {
 var tm_zone = HEAP32[tm + 40 >> 2];
 var date = {
  tm_sec: HEAP32[tm >> 2],
  tm_min: HEAP32[tm + 4 >> 2],
  tm_hour: HEAP32[tm + 8 >> 2],
  tm_mday: HEAP32[tm + 12 >> 2],
  tm_mon: HEAP32[tm + 16 >> 2],
  tm_year: HEAP32[tm + 20 >> 2],
  tm_wday: HEAP32[tm + 24 >> 2],
  tm_yday: HEAP32[tm + 28 >> 2],
  tm_isdst: HEAP32[tm + 32 >> 2],
  tm_gmtoff: HEAP32[tm + 36 >> 2],
  tm_zone: tm_zone ? Pointer_stringify(tm_zone) : ""
 };
 var pattern = Pointer_stringify(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value === "number" ? value.toString() : value || "";
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : value > 0 ? 1 : 0;
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);
  case 1:
   return janFourth;
  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);
  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);
  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);
  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);
  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   } else {
    return thisDate.getFullYear();
   }
  } else {
   return thisDate.getFullYear() - 1;
  }
 }
 var EXPANSION_RULES_2 = {
  "%a": (function(date) {
   return WEEKDAYS[date.tm_wday].substring(0, 3);
  }),
  "%A": (function(date) {
   return WEEKDAYS[date.tm_wday];
  }),
  "%b": (function(date) {
   return MONTHS[date.tm_mon].substring(0, 3);
  }),
  "%B": (function(date) {
   return MONTHS[date.tm_mon];
  }),
  "%C": (function(date) {
   var year = date.tm_year + 1900;
   return leadingNulls(year / 100 | 0, 2);
  }),
  "%d": (function(date) {
   return leadingNulls(date.tm_mday, 2);
  }),
  "%e": (function(date) {
   return leadingSomething(date.tm_mday, 2, " ");
  }),
  "%g": (function(date) {
   return getWeekBasedYear(date).toString().substring(2);
  }),
  "%G": (function(date) {
   return getWeekBasedYear(date);
  }),
  "%H": (function(date) {
   return leadingNulls(date.tm_hour, 2);
  }),
  "%I": (function(date) {
   return leadingNulls(date.tm_hour < 13 ? date.tm_hour : date.tm_hour - 12, 2);
  }),
  "%j": (function(date) {
   return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3);
  }),
  "%m": (function(date) {
   return leadingNulls(date.tm_mon + 1, 2);
  }),
  "%M": (function(date) {
   return leadingNulls(date.tm_min, 2);
  }),
  "%n": (function() {
   return "\n";
  }),
  "%p": (function(date) {
   if (date.tm_hour > 0 && date.tm_hour < 13) {
    return "AM";
   } else {
    return "PM";
   }
  }),
  "%S": (function(date) {
   return leadingNulls(date.tm_sec, 2);
  }),
  "%t": (function() {
   return "\t";
  }),
  "%u": (function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay() || 7;
  }),
  "%U": (function(date) {
   var janFirst = new Date(date.tm_year + 1900, 0, 1);
   var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstSunday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
    var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00";
  }),
  "%V": (function(date) {
   var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
   var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
   var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
   var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
   var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
   if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
    return "53";
   }
   if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
    return "01";
   }
   var daysDifference;
   if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
    daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate();
   } else {
    daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate();
   }
   return leadingNulls(Math.ceil(daysDifference / 7), 2);
  }),
  "%w": (function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay();
  }),
  "%W": (function(date) {
   var janFirst = new Date(date.tm_year, 0, 1);
   var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstMonday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
    var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00";
  }),
  "%y": (function(date) {
   return (date.tm_year + 1900).toString().substring(2);
  }),
  "%Y": (function(date) {
   return date.tm_year + 1900;
  }),
  "%z": (function(date) {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = off / 60 * 100 + off % 60;
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  }),
  "%Z": (function(date) {
   return date.tm_zone;
  }),
  "%%": (function() {
   return "%";
  })
 };
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.indexOf(rule) >= 0) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
}
function _strftime_l(s, maxsize, format, tm) {
 return _strftime(s, maxsize, format, tm);
}
function _abort() {
 Module["abort"]();
}
function _pthread_once(ptr, func) {
 if (!_pthread_once.seen) _pthread_once.seen = {};
 if (ptr in _pthread_once.seen) return;
 Runtime.dynCall("v", func);
 _pthread_once.seen[ptr] = 1;
}
var PATH = {
 splitPath: (function(filename) {
  var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 }),
 normalizeArray: (function(parts, allowAboveRoot) {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (; up--; up) {
    parts.unshift("..");
   }
  }
  return parts;
 }),
 normalize: (function(path) {
  var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter((function(p) {
   return !!p;
  })), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 }),
 dirname: (function(path) {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 }),
 basename: (function(path) {
  if (path === "/") return "/";
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 }),
 extname: (function(path) {
  return PATH.splitPath(path)[3];
 }),
 join: (function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return PATH.normalize(paths.join("/"));
 }),
 join2: (function(l, r) {
  return PATH.normalize(l + "/" + r);
 }),
 resolve: (function() {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = i >= 0 ? arguments[i] : FS.cwd();
   if (typeof path !== "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = path.charAt(0) === "/";
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
   return !!p;
  })), !resolvedAbsolute).join("/");
  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
 }),
 relative: (function(from, to) {
  from = PATH.resolve(from).substr(1);
  to = PATH.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (; start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (; end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 })
};
var TTY = {
 ttys: [],
 init: (function() {}),
 shutdown: (function() {}),
 register: (function(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 }),
 stream_ops: {
  open: (function(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   stream.tty = tty;
   stream.seekable = false;
  }),
  close: (function(stream) {
   stream.tty.ops.flush(stream.tty);
  }),
  flush: (function(stream) {
   stream.tty.ops.flush(stream.tty);
  }),
  read: (function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  }),
  write: (function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   for (var i = 0; i < length; i++) {
    try {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  })
 },
 default_tty_ops: {
  get_char: (function(tty) {
   if (!tty.input.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
     var BUFSIZE = 256;
     var buf = new Buffer(BUFSIZE);
     var bytesRead = 0;
     var fd = process.stdin.fd;
     var usingDevice = false;
     try {
      fd = fs.openSync("/dev/stdin", "r");
      usingDevice = true;
     } catch (e) {}
     bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
     if (usingDevice) {
      fs.closeSync(fd);
     }
     if (bytesRead > 0) {
      result = buf.slice(0, bytesRead).toString("utf-8");
     } else {
      result = null;
     }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
     result = window.prompt("Input: ");
     if (result !== null) {
      result += "\n";
     }
    } else if (typeof readline == "function") {
     result = readline();
     if (result !== null) {
      result += "\n";
     }
    }
    if (!result) {
     return null;
    }
    tty.input = intArrayFromString(result, true);
   }
   return tty.input.shift();
  }),
  put_char: (function(tty, val) {
   if (val === null || val === 10) {
    Module["print"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  }),
  flush: (function(tty) {
   if (tty.output && tty.output.length > 0) {
    Module["print"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  })
 },
 default_tty1_ops: {
  put_char: (function(tty, val) {
   if (val === null || val === 10) {
    Module["printErr"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  }),
  flush: (function(tty) {
   if (tty.output && tty.output.length > 0) {
    Module["printErr"](UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  })
 }
};
var MEMFS = {
 ops_table: null,
 mount: (function(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, 0);
 }),
 createNode: (function(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (!MEMFS.ops_table) {
   MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap,
      msync: MEMFS.stream_ops.msync
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   };
  }
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 }),
 getFileDataAsRegularArray: (function(node) {
  if (node.contents && node.contents.subarray) {
   var arr = [];
   for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
   return arr;
  }
  return node.contents;
 }),
 getFileDataAsTypedArray: (function(node) {
  if (!node.contents) return new Uint8Array;
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 }),
 expandFileStorage: (function(node, newCapacity) {
  if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
   node.contents = MEMFS.getFileDataAsRegularArray(node);
   node.usedBytes = node.contents.length;
  }
  if (!node.contents || node.contents.subarray) {
   var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
   if (prevCapacity >= newCapacity) return;
   var CAPACITY_DOUBLING_MAX = 1024 * 1024;
   newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
   if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
   var oldContents = node.contents;
   node.contents = new Uint8Array(newCapacity);
   if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
   return;
  }
  if (!node.contents && newCapacity > 0) node.contents = [];
  while (node.contents.length < newCapacity) node.contents.push(0);
 }),
 resizeFileStorage: (function(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
   return;
  }
  if (!node.contents || node.contents.subarray) {
   var oldContents = node.contents;
   node.contents = new Uint8Array(new ArrayBuffer(newSize));
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
   return;
  }
  if (!node.contents) node.contents = [];
  if (node.contents.length > newSize) node.contents.length = newSize; else while (node.contents.length < newSize) node.contents.push(0);
  node.usedBytes = newSize;
 }),
 node_ops: {
  getattr: (function(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  }),
  setattr: (function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  }),
  lookup: (function(parent, name) {
   throw FS.genericErrors[ERRNO_CODES.ENOENT];
  }),
  mknod: (function(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  }),
  rename: (function(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   old_node.parent = new_dir;
  }),
  unlink: (function(parent, name) {
   delete parent.contents[name];
  }),
  rmdir: (function(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
   }
   delete parent.contents[name];
  }),
  readdir: (function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  }),
  symlink: (function(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
   node.link = oldpath;
   return node;
  }),
  readlink: (function(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return node.link;
  })
 },
 stream_ops: {
  read: (function(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   assert(size >= 0);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  }),
  write: (function(stream, buffer, offset, length, position, canOwn) {
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else {
    for (var i = 0; i < length; i++) {
     node.contents[position + i] = buffer[offset + i];
    }
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  }),
  llseek: (function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }),
  allocate: (function(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  }),
  mmap: (function(stream, buffer, offset, length, position, prot, flags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < stream.node.usedBytes) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = _malloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
    }
    buffer.set(contents, ptr);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  }),
  msync: (function(stream, buffer, offset, length, mmapFlags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   if (mmapFlags & 2) {
    return 0;
   }
   var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
   return 0;
  })
 }
};
var IDBFS = {
 dbs: {},
 indexedDB: (function() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  var ret = null;
  if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, "IDBFS used, but indexedDB not supported");
  return ret;
 }),
 DB_VERSION: 21,
 DB_STORE_NAME: "FILE_DATA",
 mount: (function(mount) {
  return MEMFS.mount.apply(null, arguments);
 }),
 syncfs: (function(mount, populate, callback) {
  IDBFS.getLocalSet(mount, (function(err, local) {
   if (err) return callback(err);
   IDBFS.getRemoteSet(mount, (function(err, remote) {
    if (err) return callback(err);
    var src = populate ? remote : local;
    var dst = populate ? local : remote;
    IDBFS.reconcile(src, dst, callback);
   }));
  }));
 }),
 getDB: (function(name, callback) {
  var db = IDBFS.dbs[name];
  if (db) {
   return callback(null, db);
  }
  var req;
  try {
   req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
  } catch (e) {
   return callback(e);
  }
  req.onupgradeneeded = (function(e) {
   var db = e.target.result;
   var transaction = e.target.transaction;
   var fileStore;
   if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
   } else {
    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
   }
   if (!fileStore.indexNames.contains("timestamp")) {
    fileStore.createIndex("timestamp", "timestamp", {
     unique: false
    });
   }
  });
  req.onsuccess = (function() {
   db = req.result;
   IDBFS.dbs[name] = db;
   callback(null, db);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 getLocalSet: (function(mount, callback) {
  var entries = {};
  function isRealDir(p) {
   return p !== "." && p !== "..";
  }
  function toAbsolute(root) {
   return (function(p) {
    return PATH.join2(root, p);
   });
  }
  var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  while (check.length) {
   var path = check.pop();
   var stat;
   try {
    stat = FS.stat(path);
   } catch (e) {
    return callback(e);
   }
   if (FS.isDir(stat.mode)) {
    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
   }
   entries[path] = {
    timestamp: stat.mtime
   };
  }
  return callback(null, {
   type: "local",
   entries: entries
  });
 }),
 getRemoteSet: (function(mount, callback) {
  var entries = {};
  IDBFS.getDB(mount.mountpoint, (function(err, db) {
   if (err) return callback(err);
   var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
   transaction.onerror = (function(e) {
    callback(this.error);
    e.preventDefault();
   });
   var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
   var index = store.index("timestamp");
   index.openKeyCursor().onsuccess = (function(event) {
    var cursor = event.target.result;
    if (!cursor) {
     return callback(null, {
      type: "remote",
      db: db,
      entries: entries
     });
    }
    entries[cursor.primaryKey] = {
     timestamp: cursor.key
    };
    cursor.continue();
   });
  }));
 }),
 loadLocalEntry: (function(path, callback) {
  var stat, node;
  try {
   var lookup = FS.lookupPath(path);
   node = lookup.node;
   stat = FS.stat(path);
  } catch (e) {
   return callback(e);
  }
  if (FS.isDir(stat.mode)) {
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode
   });
  } else if (FS.isFile(stat.mode)) {
   node.contents = MEMFS.getFileDataAsTypedArray(node);
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode,
    contents: node.contents
   });
  } else {
   return callback(new Error("node type not supported"));
  }
 }),
 storeLocalEntry: (function(path, entry, callback) {
  try {
   if (FS.isDir(entry.mode)) {
    FS.mkdir(path, entry.mode);
   } else if (FS.isFile(entry.mode)) {
    FS.writeFile(path, entry.contents, {
     encoding: "binary",
     canOwn: true
    });
   } else {
    return callback(new Error("node type not supported"));
   }
   FS.chmod(path, entry.mode);
   FS.utime(path, entry.timestamp, entry.timestamp);
  } catch (e) {
   return callback(e);
  }
  callback(null);
 }),
 removeLocalEntry: (function(path, callback) {
  try {
   var lookup = FS.lookupPath(path);
   var stat = FS.stat(path);
   if (FS.isDir(stat.mode)) {
    FS.rmdir(path);
   } else if (FS.isFile(stat.mode)) {
    FS.unlink(path);
   }
  } catch (e) {
   return callback(e);
  }
  callback(null);
 }),
 loadRemoteEntry: (function(store, path, callback) {
  var req = store.get(path);
  req.onsuccess = (function(event) {
   callback(null, event.target.result);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 storeRemoteEntry: (function(store, path, entry, callback) {
  var req = store.put(entry, path);
  req.onsuccess = (function() {
   callback(null);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 removeRemoteEntry: (function(store, path, callback) {
  var req = store.delete(path);
  req.onsuccess = (function() {
   callback(null);
  });
  req.onerror = (function(e) {
   callback(this.error);
   e.preventDefault();
  });
 }),
 reconcile: (function(src, dst, callback) {
  var total = 0;
  var create = [];
  Object.keys(src.entries).forEach((function(key) {
   var e = src.entries[key];
   var e2 = dst.entries[key];
   if (!e2 || e.timestamp > e2.timestamp) {
    create.push(key);
    total++;
   }
  }));
  var remove = [];
  Object.keys(dst.entries).forEach((function(key) {
   var e = dst.entries[key];
   var e2 = src.entries[key];
   if (!e2) {
    remove.push(key);
    total++;
   }
  }));
  if (!total) {
   return callback(null);
  }
  var errored = false;
  var completed = 0;
  var db = src.type === "remote" ? src.db : dst.db;
  var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
  var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= total) {
    return callback(null);
   }
  }
  transaction.onerror = (function(e) {
   done(this.error);
   e.preventDefault();
  });
  create.sort().forEach((function(path) {
   if (dst.type === "local") {
    IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
     if (err) return done(err);
     IDBFS.storeLocalEntry(path, entry, done);
    }));
   } else {
    IDBFS.loadLocalEntry(path, (function(err, entry) {
     if (err) return done(err);
     IDBFS.storeRemoteEntry(store, path, entry, done);
    }));
   }
  }));
  remove.sort().reverse().forEach((function(path) {
   if (dst.type === "local") {
    IDBFS.removeLocalEntry(path, done);
   } else {
    IDBFS.removeRemoteEntry(store, path, done);
   }
  }));
 })
};
var NODEFS = {
 isWindows: false,
 staticInit: (function() {
  NODEFS.isWindows = !!process.platform.match(/^win/);
 }),
 mount: (function(mount) {
  assert(ENVIRONMENT_IS_NODE);
  return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
 }),
 createNode: (function(parent, name, mode, dev) {
  if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = FS.createNode(parent, name, mode);
  node.node_ops = NODEFS.node_ops;
  node.stream_ops = NODEFS.stream_ops;
  return node;
 }),
 getMode: (function(path) {
  var stat;
  try {
   stat = fs.lstatSync(path);
   if (NODEFS.isWindows) {
    stat.mode = stat.mode | (stat.mode & 146) >> 1;
   }
  } catch (e) {
   if (!e.code) throw e;
   throw new FS.ErrnoError(ERRNO_CODES[e.code]);
  }
  return stat.mode;
 }),
 realPath: (function(node) {
  var parts = [];
  while (node.parent !== node) {
   parts.push(node.name);
   node = node.parent;
  }
  parts.push(node.mount.opts.root);
  parts.reverse();
  return PATH.join.apply(null, parts);
 }),
 flagsToPermissionStringMap: {
  0: "r",
  1: "r+",
  2: "r+",
  64: "r",
  65: "r+",
  66: "r+",
  129: "rx+",
  193: "rx+",
  514: "w+",
  577: "w",
  578: "w+",
  705: "wx",
  706: "wx+",
  1024: "a",
  1025: "a",
  1026: "a+",
  1089: "a",
  1090: "a+",
  1153: "ax",
  1154: "ax+",
  1217: "ax",
  1218: "ax+",
  4096: "rs",
  4098: "rs+"
 },
 flagsToPermissionString: (function(flags) {
  if (flags in NODEFS.flagsToPermissionStringMap) {
   return NODEFS.flagsToPermissionStringMap[flags];
  } else {
   return flags;
  }
 }),
 node_ops: {
  getattr: (function(node) {
   var path = NODEFS.realPath(node);
   var stat;
   try {
    stat = fs.lstatSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (NODEFS.isWindows && !stat.blksize) {
    stat.blksize = 4096;
   }
   if (NODEFS.isWindows && !stat.blocks) {
    stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
   }
   return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    atime: stat.atime,
    mtime: stat.mtime,
    ctime: stat.ctime,
    blksize: stat.blksize,
    blocks: stat.blocks
   };
  }),
  setattr: (function(node, attr) {
   var path = NODEFS.realPath(node);
   try {
    if (attr.mode !== undefined) {
     fs.chmodSync(path, attr.mode);
     node.mode = attr.mode;
    }
    if (attr.timestamp !== undefined) {
     var date = new Date(attr.timestamp);
     fs.utimesSync(path, date, date);
    }
    if (attr.size !== undefined) {
     fs.truncateSync(path, attr.size);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  lookup: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   var mode = NODEFS.getMode(path);
   return NODEFS.createNode(parent, name, mode);
  }),
  mknod: (function(parent, name, mode, dev) {
   var node = NODEFS.createNode(parent, name, mode, dev);
   var path = NODEFS.realPath(node);
   try {
    if (FS.isDir(node.mode)) {
     fs.mkdirSync(path, node.mode);
    } else {
     fs.writeFileSync(path, "", {
      mode: node.mode
     });
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return node;
  }),
  rename: (function(oldNode, newDir, newName) {
   var oldPath = NODEFS.realPath(oldNode);
   var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
   try {
    fs.renameSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  unlink: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.unlinkSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  rmdir: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.rmdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  readdir: (function(node) {
   var path = NODEFS.realPath(node);
   try {
    return fs.readdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  symlink: (function(parent, newName, oldPath) {
   var newPath = PATH.join2(NODEFS.realPath(parent), newName);
   try {
    fs.symlinkSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  readlink: (function(node) {
   var path = NODEFS.realPath(node);
   try {
    path = fs.readlinkSync(path);
    path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
    return path;
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  })
 },
 stream_ops: {
  open: (function(stream) {
   var path = NODEFS.realPath(stream.node);
   try {
    if (FS.isFile(stream.node.mode)) {
     stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  close: (function(stream) {
   try {
    if (FS.isFile(stream.node.mode) && stream.nfd) {
     fs.closeSync(stream.nfd);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  read: (function(stream, buffer, offset, length, position) {
   if (length === 0) return 0;
   var nbuffer = new Buffer(length);
   var res;
   try {
    res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (res > 0) {
    for (var i = 0; i < res; i++) {
     buffer[offset + i] = nbuffer[i];
    }
   }
   return res;
  }),
  write: (function(stream, buffer, offset, length, position) {
   var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
   var res;
   try {
    res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return res;
  }),
  llseek: (function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     try {
      var stat = fs.fstatSync(stream.nfd);
      position += stat.size;
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES[e.code]);
     }
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  })
 }
};
var _stdin = allocate(1, "i32*", ALLOC_STATIC);
var _stdout = allocate(1, "i32*", ALLOC_STATIC);
var _stderr = allocate(1, "i32*", ALLOC_STATIC);
var FS = {
 root: null,
 mounts: [],
 devices: [ null ],
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 trackingDelegate: {},
 tracking: {
  openFlags: {
   READ: 1,
   WRITE: 2
  }
 },
 ErrnoError: null,
 genericErrors: {},
 handleFSError: (function(e) {
  if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
  return ___setErrNo(e.errno);
 }),
 lookupPath: (function(path, opts) {
  path = PATH.resolve(FS.cwd(), path);
  opts = opts || {};
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  for (var key in defaults) {
   if (opts[key] === undefined) {
    opts[key] = defaults[key];
   }
  }
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
  }
  var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
   return !!p;
  })), false);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = i === parts.length - 1;
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || islast && opts.follow_mount) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 }),
 getPath: (function(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
   }
   path = path ? node.name + "/" + path : node.name;
   node = node.parent;
  }
 }),
 hashName: (function(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
  }
  return (parentid + hash >>> 0) % FS.nameTable.length;
 }),
 hashAddNode: (function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 }),
 hashRemoveNode: (function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 }),
 lookupNode: (function(parent, name) {
  var err = FS.mayLookup(parent);
  if (err) {
   throw new FS.ErrnoError(err, parent);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 }),
 createNode: (function(parent, name, mode, rdev) {
  if (!FS.FSNode) {
   FS.FSNode = (function(parent, name, mode, rdev) {
    if (!parent) {
     parent = this;
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
   });
   FS.FSNode.prototype = {};
   var readMode = 292 | 73;
   var writeMode = 146;
   Object.defineProperties(FS.FSNode.prototype, {
    read: {
     get: (function() {
      return (this.mode & readMode) === readMode;
     }),
     set: (function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
     })
    },
    write: {
     get: (function() {
      return (this.mode & writeMode) === writeMode;
     }),
     set: (function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
     })
    },
    isFolder: {
     get: (function() {
      return FS.isDir(this.mode);
     })
    },
    isDevice: {
     get: (function() {
      return FS.isChrdev(this.mode);
     })
    }
   });
  }
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 }),
 destroyNode: (function(node) {
  FS.hashRemoveNode(node);
 }),
 isRoot: (function(node) {
  return node === node.parent;
 }),
 isMountpoint: (function(node) {
  return !!node.mounted;
 }),
 isFile: (function(mode) {
  return (mode & 61440) === 32768;
 }),
 isDir: (function(mode) {
  return (mode & 61440) === 16384;
 }),
 isLink: (function(mode) {
  return (mode & 61440) === 40960;
 }),
 isChrdev: (function(mode) {
  return (mode & 61440) === 8192;
 }),
 isBlkdev: (function(mode) {
  return (mode & 61440) === 24576;
 }),
 isFIFO: (function(mode) {
  return (mode & 61440) === 4096;
 }),
 isSocket: (function(mode) {
  return (mode & 49152) === 49152;
 }),
 flagModes: {
  "r": 0,
  "rs": 1052672,
  "r+": 2,
  "w": 577,
  "wx": 705,
  "xw": 705,
  "w+": 578,
  "wx+": 706,
  "xw+": 706,
  "a": 1089,
  "ax": 1217,
  "xa": 1217,
  "a+": 1090,
  "ax+": 1218,
  "xa+": 1218
 },
 modeStringToFlags: (function(str) {
  var flags = FS.flagModes[str];
  if (typeof flags === "undefined") {
   throw new Error("Unknown file open mode: " + str);
  }
  return flags;
 }),
 flagsToPermissionString: (function(flag) {
  var accmode = flag & 2097155;
  var perms = [ "r", "w", "rw" ][accmode];
  if (flag & 512) {
   perms += "w";
  }
  return perms;
 }),
 nodePermissions: (function(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
   return ERRNO_CODES.EACCES;
  } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
   return ERRNO_CODES.EACCES;
  } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
   return ERRNO_CODES.EACCES;
  }
  return 0;
 }),
 mayLookup: (function(dir) {
  var err = FS.nodePermissions(dir, "x");
  if (err) return err;
  if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
  return 0;
 }),
 mayCreate: (function(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return ERRNO_CODES.EEXIST;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 }),
 mayDelete: (function(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var err = FS.nodePermissions(dir, "wx");
  if (err) {
   return err;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return ERRNO_CODES.ENOTDIR;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return ERRNO_CODES.EBUSY;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return ERRNO_CODES.EISDIR;
   }
  }
  return 0;
 }),
 mayOpen: (function(node, flags) {
  if (!node) {
   return ERRNO_CODES.ENOENT;
  }
  if (FS.isLink(node.mode)) {
   return ERRNO_CODES.ELOOP;
  } else if (FS.isDir(node.mode)) {
   if ((flags & 2097155) !== 0 || flags & 512) {
    return ERRNO_CODES.EISDIR;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 }),
 MAX_OPEN_FDS: 4096,
 nextfd: (function(fd_start, fd_end) {
  fd_start = fd_start || 0;
  fd_end = fd_end || FS.MAX_OPEN_FDS;
  for (var fd = fd_start; fd <= fd_end; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
 }),
 getStream: (function(fd) {
  return FS.streams[fd];
 }),
 createStream: (function(stream, fd_start, fd_end) {
  if (!FS.FSStream) {
   FS.FSStream = (function() {});
   FS.FSStream.prototype = {};
   Object.defineProperties(FS.FSStream.prototype, {
    object: {
     get: (function() {
      return this.node;
     }),
     set: (function(val) {
      this.node = val;
     })
    },
    isRead: {
     get: (function() {
      return (this.flags & 2097155) !== 1;
     })
    },
    isWrite: {
     get: (function() {
      return (this.flags & 2097155) !== 0;
     })
    },
    isAppend: {
     get: (function() {
      return this.flags & 1024;
     })
    }
   });
  }
  var newStream = new FS.FSStream;
  for (var p in stream) {
   newStream[p] = stream[p];
  }
  stream = newStream;
  var fd = FS.nextfd(fd_start, fd_end);
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 }),
 closeStream: (function(fd) {
  FS.streams[fd] = null;
 }),
 getStreamFromPtr: (function(ptr) {
  return FS.streams[ptr - 1];
 }),
 getPtrForStream: (function(stream) {
  return stream ? stream.fd + 1 : 0;
 }),
 chrdev_stream_ops: {
  open: (function(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   if (stream.stream_ops.open) {
    stream.stream_ops.open(stream);
   }
  }),
  llseek: (function() {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  })
 },
 major: (function(dev) {
  return dev >> 8;
 }),
 minor: (function(dev) {
  return dev & 255;
 }),
 makedev: (function(ma, mi) {
  return ma << 8 | mi;
 }),
 registerDevice: (function(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 }),
 getDevice: (function(dev) {
  return FS.devices[dev];
 }),
 getMounts: (function(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push.apply(check, m.mounts);
  }
  return mounts;
 }),
 syncfs: (function(populate, callback) {
  if (typeof populate === "function") {
   callback = populate;
   populate = false;
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= mounts.length) {
    callback(null);
   }
  }
  mounts.forEach((function(mount) {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  }));
 }),
 mount: (function(type, opts, mountpoint) {
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 }),
 unmount: (function(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach((function(hash) {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.indexOf(current.mount) !== -1) {
     FS.destroyNode(current);
    }
    current = next;
   }
  }));
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  assert(idx !== -1);
  node.mount.mounts.splice(idx, 1);
 }),
 lookup: (function(parent, name) {
  return parent.node_ops.lookup(parent, name);
 }),
 mknod: (function(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var err = FS.mayCreate(parent, name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 }),
 create: (function(path, mode) {
  mode = mode !== undefined ? mode : 438;
  mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 }),
 mkdir: (function(path, mode) {
  mode = mode !== undefined ? mode : 511;
  mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 }),
 mkdev: (function(path, mode, dev) {
  if (typeof dev === "undefined") {
   dev = mode;
   mode = 438;
  }
  mode |= 8192;
  return FS.mknod(path, mode, dev);
 }),
 symlink: (function(oldpath, newpath) {
  if (!PATH.resolve(oldpath)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  var newname = PATH.basename(newpath);
  var err = FS.mayCreate(parent, newname);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 }),
 rename: (function(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  try {
   lookup = FS.lookupPath(old_path, {
    parent: true
   });
   old_dir = lookup.node;
   lookup = FS.lookupPath(new_path, {
    parent: true
   });
   new_dir = lookup.node;
  } catch (e) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  relative = PATH.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var err = FS.mayDelete(old_dir, old_name, isdir);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  if (new_dir !== old_dir) {
   err = FS.nodePermissions(old_dir, "w");
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  try {
   if (FS.trackingDelegate["willMovePath"]) {
    FS.trackingDelegate["willMovePath"](old_path, new_path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
  try {
   if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
  } catch (e) {
   console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
 }),
 rmdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, true);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 }),
 readdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
  }
  return node.node_ops.readdir(node);
 }),
 unlink: (function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, false);
  if (err) {
   if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 }),
 readlink: (function(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link));
 }),
 stat: (function(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return node.node_ops.getattr(node);
 }),
 lstat: (function(path) {
  return FS.stat(path, true);
 }),
 chmod: (function(path, mode, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  node.node_ops.setattr(node, {
   mode: mode & 4095 | node.mode & ~4095,
   timestamp: Date.now()
  });
 }),
 lchmod: (function(path, mode) {
  FS.chmod(path, mode, true);
 }),
 fchmod: (function(fd, mode) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  FS.chmod(stream.node, mode);
 }),
 chown: (function(path, uid, gid, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 }),
 lchown: (function(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 }),
 fchown: (function(fd, uid, gid) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  FS.chown(stream.node, uid, gid);
 }),
 truncate: (function(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var err = FS.nodePermissions(node, "w");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 }),
 ftruncate: (function(fd, len) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  FS.truncate(stream.node, len);
 }),
 utime: (function(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 }),
 open: (function(path, flags, mode, fd_start, fd_end) {
  if (path === "") {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
  mode = typeof mode === "undefined" ? 438 : mode;
  if (flags & 64) {
   mode = mode & 4095 | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path === "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if (flags & 64) {
   if (node) {
    if (flags & 128) {
     throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if (!created) {
   var err = FS.mayOpen(node, flags);
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  if (flags & 512) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  }, fd_start, fd_end);
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
    Module["printErr"]("read file: " + path);
   }
  }
  try {
   if (FS.trackingDelegate["onOpenFile"]) {
    var trackingFlags = 0;
    if ((flags & 2097155) !== 1) {
     trackingFlags |= FS.tracking.openFlags.READ;
    }
    if ((flags & 2097155) !== 0) {
     trackingFlags |= FS.tracking.openFlags.WRITE;
    }
    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
  }
  return stream;
 }),
 close: (function(stream) {
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
 }),
 llseek: (function(stream, offset, whence) {
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 }),
 read: (function(stream, buffer, offset, length, position) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var seeking = true;
  if (typeof position === "undefined") {
   position = stream.position;
   seeking = false;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 }),
 write: (function(stream, buffer, offset, length, position, canOwn) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if (stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = true;
  if (typeof position === "undefined") {
   position = stream.position;
   seeking = false;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  try {
   if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path);
  } catch (e) {
   console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message);
  }
  return bytesWritten;
 }),
 allocate: (function(stream, offset, length) {
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
  }
  stream.stream_ops.allocate(stream, offset, length);
 }),
 mmap: (function(stream, buffer, offset, length, position, prot, flags) {
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(ERRNO_CODES.EACCES);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
  }
  return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
 }),
 msync: (function(stream, buffer, offset, length, mmapFlags) {
  if (!stream || !stream.stream_ops.msync) {
   return 0;
  }
  return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
 }),
 munmap: (function(stream) {
  return 0;
 }),
 ioctl: (function(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 }),
 readFile: (function(path, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "r";
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = UTF8ArrayToString(buf, 0);
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 }),
 writeFile: (function(path, data, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "w";
  opts.encoding = opts.encoding || "utf8";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var stream = FS.open(path, opts.flags, opts.mode);
  if (opts.encoding === "utf8") {
   var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
   var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
   FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
  } else if (opts.encoding === "binary") {
   FS.write(stream, data, 0, data.length, 0, opts.canOwn);
  }
  FS.close(stream);
 }),
 cwd: (function() {
  return FS.currentPath;
 }),
 chdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
  }
  var err = FS.nodePermissions(lookup.node, "x");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  FS.currentPath = lookup.path;
 }),
 createDefaultDirectories: (function() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 }),
 createDefaultDevices: (function() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: (function() {
    return 0;
   }),
   write: (function(stream, buffer, offset, length, pos) {
    return length;
   })
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var random_device;
  if (typeof crypto !== "undefined") {
   var randomBuffer = new Uint8Array(1);
   random_device = (function() {
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0];
   });
  } else if (ENVIRONMENT_IS_NODE) {
   random_device = (function() {
    return require("crypto").randomBytes(1)[0];
   });
  } else {
   random_device = (function() {
    return Math.random() * 256 | 0;
   });
  }
  FS.createDevice("/dev", "random", random_device);
  FS.createDevice("/dev", "urandom", random_device);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 }),
 createStandardStreams: (function() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", "r");
  HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin);
  assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
  var stdout = FS.open("/dev/stdout", "w");
  HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout);
  assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
  var stderr = FS.open("/dev/stderr", "w");
  HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr);
  assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")");
 }),
 ensureErrnoError: (function() {
  if (FS.ErrnoError) return;
  FS.ErrnoError = function ErrnoError(errno, node) {
   this.node = node;
   this.setErrno = (function(errno) {
    this.errno = errno;
    for (var key in ERRNO_CODES) {
     if (ERRNO_CODES[key] === errno) {
      this.code = key;
      break;
     }
    }
   });
   this.setErrno(errno);
   this.message = ERRNO_MESSAGES[errno];
  };
  FS.ErrnoError.prototype = new Error;
  FS.ErrnoError.prototype.constructor = FS.ErrnoError;
  [ ERRNO_CODES.ENOENT ].forEach((function(code) {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  }));
 }),
 staticInit: (function() {
  FS.ensureErrnoError();
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
 }),
 init: (function(input, output, error) {
  assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
  FS.init.initialized = true;
  FS.ensureErrnoError();
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 }),
 quit: (function() {
  FS.init.initialized = false;
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 }),
 getMode: (function(canRead, canWrite) {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
 }),
 joinPath: (function(parts, forceRelative) {
  var path = PATH.join.apply(null, parts);
  if (forceRelative && path[0] == "/") path = path.substr(1);
  return path;
 }),
 absolutePath: (function(relative, base) {
  return PATH.resolve(base, relative);
 }),
 standardizePath: (function(path) {
  return PATH.normalize(path);
 }),
 findObject: (function(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (ret.exists) {
   return ret.object;
  } else {
   ___setErrNo(ret.error);
   return null;
  }
 }),
 analyzePath: (function(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 }),
 createFolder: (function(parent, name, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.mkdir(path, mode);
 }),
 createPath: (function(parent, path, canRead, canWrite) {
  parent = typeof parent === "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 }),
 createFile: (function(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.create(path, mode);
 }),
 createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
  var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
  var mode = FS.getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data === "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, "w");
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
  return node;
 }),
 createDevice: (function(parent, name, input, output) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open: (function(stream) {
    stream.seekable = false;
   }),
   close: (function(stream) {
    if (output && output.buffer && output.buffer.length) {
     output(10);
    }
   }),
   read: (function(stream, buffer, offset, length, pos) {
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   }),
   write: (function(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   })
  });
  return FS.mkdev(path, mode, dev);
 }),
 createLink: (function(parent, name, target, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  return FS.symlink(target, path);
 }),
 forceLoadFile: (function(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  var success = true;
  if (typeof XMLHttpRequest !== "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (Module["read"]) {
   try {
    obj.contents = intArrayFromString(Module["read"](obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    success = false;
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
  if (!success) ___setErrNo(ERRNO_CODES.EIO);
  return success;
 }),
 createLazyFile: (function(parent, name, url, canRead, canWrite) {
  function LazyUint8Array() {
   this.lengthKnown = false;
   this.chunks = [];
  }
  LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
   if (idx > this.length - 1 || idx < 0) {
    return undefined;
   }
   var chunkOffset = idx % this.chunkSize;
   var chunkNum = idx / this.chunkSize | 0;
   return this.getter(chunkNum)[chunkOffset];
  };
  LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
   this.getter = getter;
  };
  LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
   var xhr = new XMLHttpRequest;
   xhr.open("HEAD", url, false);
   xhr.send(null);
   if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
   var datalength = Number(xhr.getResponseHeader("Content-length"));
   var header;
   var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
   var chunkSize = 1024 * 1024;
   if (!hasByteServing) chunkSize = datalength;
   var doXHR = (function(from, to) {
    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
    if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
    if (xhr.overrideMimeType) {
     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    }
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    if (xhr.response !== undefined) {
     return new Uint8Array(xhr.response || []);
    } else {
     return intArrayFromString(xhr.responseText || "", true);
    }
   });
   var lazyArray = this;
   lazyArray.setDataGetter((function(chunkNum) {
    var start = chunkNum * chunkSize;
    var end = (chunkNum + 1) * chunkSize - 1;
    end = Math.min(end, datalength - 1);
    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
     lazyArray.chunks[chunkNum] = doXHR(start, end);
    }
    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
    return lazyArray.chunks[chunkNum];
   }));
   this._length = datalength;
   this._chunkSize = chunkSize;
   this.lengthKnown = true;
  };
  if (typeof XMLHttpRequest !== "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array;
   Object.defineProperty(lazyArray, "length", {
    get: (function() {
     if (!this.lengthKnown) {
      this.cacheLength();
     }
     return this._length;
    })
   });
   Object.defineProperty(lazyArray, "chunkSize", {
    get: (function() {
     if (!this.lengthKnown) {
      this.cacheLength();
     }
     return this._chunkSize;
    })
   });
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperty(node, "usedBytes", {
   get: (function() {
    return this.contents.length;
   })
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach((function(key) {
   var fn = node.stream_ops[key];
   stream_ops[key] = function forceLoadLazyFile() {
    if (!FS.forceLoadFile(node)) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    return fn.apply(null, arguments);
   };
  }));
  stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
   if (!FS.forceLoadFile(node)) {
    throw new FS.ErrnoError(ERRNO_CODES.EIO);
   }
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   assert(size >= 0);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  };
  node.stream_ops = stream_ops;
  return node;
 }),
 createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
  Browser.init();
  var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency("cp " + fullname);
  function processData(byteArray) {
   function finish(byteArray) {
    if (preFinish) preFinish();
    if (!dontCreateFile) {
     FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
    if (onload) onload();
    removeRunDependency(dep);
   }
   var handled = false;
   Module["preloadPlugins"].forEach((function(plugin) {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
     plugin["handle"](byteArray, fullname, finish, (function() {
      if (onerror) onerror();
      removeRunDependency(dep);
     }));
     handled = true;
    }
   }));
   if (!handled) finish(byteArray);
  }
  addRunDependency(dep);
  if (typeof url == "string") {
   Browser.asyncLoad(url, (function(byteArray) {
    processData(byteArray);
   }), onerror);
  } else {
   processData(url);
  }
 }),
 indexedDB: (function() {
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
 }),
 DB_NAME: (function() {
  return "EM_FS_" + window.location.pathname;
 }),
 DB_VERSION: 20,
 DB_STORE_NAME: "FILE_DATA",
 saveFilesToDB: (function(paths, onload, onerror) {
  onload = onload || (function() {});
  onerror = onerror || (function() {});
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
   console.log("creating db");
   var db = openRequest.result;
   db.createObjectStore(FS.DB_STORE_NAME);
  };
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   var transaction = db.transaction([ FS.DB_STORE_NAME ], "readwrite");
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach((function(path) {
    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
    putRequest.onsuccess = function putRequest_onsuccess() {
     ok++;
     if (ok + fail == total) finish();
    };
    putRequest.onerror = function putRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   }));
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 }),
 loadFilesFromDB: (function(paths, onload, onerror) {
  onload = onload || (function() {});
  onerror = onerror || (function() {});
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = onerror;
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   try {
    var transaction = db.transaction([ FS.DB_STORE_NAME ], "readonly");
   } catch (e) {
    onerror(e);
    return;
   }
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach((function(path) {
    var getRequest = files.get(path);
    getRequest.onsuccess = function getRequest_onsuccess() {
     if (FS.analyzePath(path).exists) {
      FS.unlink(path);
     }
     FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
     ok++;
     if (ok + fail == total) finish();
    };
    getRequest.onerror = function getRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   }));
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 })
};
function _fflush(stream) {}
Module["_strlen"] = _strlen;
function _mkport() {
 throw "TODO";
}
var SOCKFS = {
 mount: (function(mount) {
  Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
  Module["websocket"]._callbacks = {};
  Module["websocket"]["on"] = (function(event, callback) {
   if ("function" === typeof callback) {
    this._callbacks[event] = callback;
   }
   return this;
  });
  Module["websocket"].emit = (function(event, param) {
   if ("function" === typeof this._callbacks[event]) {
    this._callbacks[event].call(this, param);
   }
  });
  return FS.createNode(null, "/", 16384 | 511, 0);
 }),
 createSocket: (function(family, type, protocol) {
  var streaming = type == 1;
  if (protocol) {
   assert(streaming == (protocol == 6));
  }
  var sock = {
   family: family,
   type: type,
   protocol: protocol,
   server: null,
   error: null,
   peers: {},
   pending: [],
   recv_queue: [],
   sock_ops: SOCKFS.websocket_sock_ops
  };
  var name = SOCKFS.nextname();
  var node = FS.createNode(SOCKFS.root, name, 49152, 0);
  node.sock = sock;
  var stream = FS.createStream({
   path: name,
   node: node,
   flags: FS.modeStringToFlags("r+"),
   seekable: false,
   stream_ops: SOCKFS.stream_ops
  });
  sock.stream = stream;
  return sock;
 }),
 getSocket: (function(fd) {
  var stream = FS.getStream(fd);
  if (!stream || !FS.isSocket(stream.node.mode)) {
   return null;
  }
  return stream.node.sock;
 }),
 stream_ops: {
  poll: (function(stream) {
   var sock = stream.node.sock;
   return sock.sock_ops.poll(sock);
  }),
  ioctl: (function(stream, request, varargs) {
   var sock = stream.node.sock;
   return sock.sock_ops.ioctl(sock, request, varargs);
  }),
  read: (function(stream, buffer, offset, length, position) {
   var sock = stream.node.sock;
   var msg = sock.sock_ops.recvmsg(sock, length);
   if (!msg) {
    return 0;
   }
   buffer.set(msg.buffer, offset);
   return msg.buffer.length;
  }),
  write: (function(stream, buffer, offset, length, position) {
   var sock = stream.node.sock;
   return sock.sock_ops.sendmsg(sock, buffer, offset, length);
  }),
  close: (function(stream) {
   var sock = stream.node.sock;
   sock.sock_ops.close(sock);
  })
 },
 nextname: (function() {
  if (!SOCKFS.nextname.current) {
   SOCKFS.nextname.current = 0;
  }
  return "socket[" + SOCKFS.nextname.current++ + "]";
 }),
 websocket_sock_ops: {
  createPeer: (function(sock, addr, port) {
   var ws;
   if (typeof addr === "object") {
    ws = addr;
    addr = null;
    port = null;
   }
   if (ws) {
    if (ws._socket) {
     addr = ws._socket.remoteAddress;
     port = ws._socket.remotePort;
    } else {
     var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
     if (!result) {
      throw new Error("WebSocket URL must be in the format ws(s)://address:port");
     }
     addr = result[1];
     port = parseInt(result[2], 10);
    }
   } else {
    try {
     var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
     var url = "ws:#".replace("#", "//");
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["url"]) {
       url = Module["websocket"]["url"];
      }
     }
     if (url === "ws://" || url === "wss://") {
      var parts = addr.split("/");
      url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
     }
     var subProtocols = "binary";
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["subprotocol"]) {
       subProtocols = Module["websocket"]["subprotocol"];
      }
     }
     subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
     var opts = ENVIRONMENT_IS_NODE ? {
      "protocol": subProtocols.toString()
     } : subProtocols;
     var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
     ws = new WebSocket(url, opts);
     ws.binaryType = "arraybuffer";
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
    }
   }
   var peer = {
    addr: addr,
    port: port,
    socket: ws,
    dgram_send_queue: []
   };
   SOCKFS.websocket_sock_ops.addPeer(sock, peer);
   SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
   if (sock.type === 2 && typeof sock.sport !== "undefined") {
    peer.dgram_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255 ]));
   }
   return peer;
  }),
  getPeer: (function(sock, addr, port) {
   return sock.peers[addr + ":" + port];
  }),
  addPeer: (function(sock, peer) {
   sock.peers[peer.addr + ":" + peer.port] = peer;
  }),
  removePeer: (function(sock, peer) {
   delete sock.peers[peer.addr + ":" + peer.port];
  }),
  handlePeerEvents: (function(sock, peer) {
   var first = true;
   var handleOpen = (function() {
    Module["websocket"].emit("open", sock.stream.fd);
    try {
     var queued = peer.dgram_send_queue.shift();
     while (queued) {
      peer.socket.send(queued);
      queued = peer.dgram_send_queue.shift();
     }
    } catch (e) {
     peer.socket.close();
    }
   });
   function handleMessage(data) {
    assert(typeof data !== "string" && data.byteLength !== undefined);
    data = new Uint8Array(data);
    var wasfirst = first;
    first = false;
    if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
     var newport = data[8] << 8 | data[9];
     SOCKFS.websocket_sock_ops.removePeer(sock, peer);
     peer.port = newport;
     SOCKFS.websocket_sock_ops.addPeer(sock, peer);
     return;
    }
    sock.recv_queue.push({
     addr: peer.addr,
     port: peer.port,
     data: data
    });
    Module["websocket"].emit("message", sock.stream.fd);
   }
   if (ENVIRONMENT_IS_NODE) {
    peer.socket.on("open", handleOpen);
    peer.socket.on("message", (function(data, flags) {
     if (!flags.binary) {
      return;
     }
     handleMessage((new Uint8Array(data)).buffer);
    }));
    peer.socket.on("close", (function() {
     Module["websocket"].emit("close", sock.stream.fd);
    }));
    peer.socket.on("error", (function(error) {
     sock.error = ERRNO_CODES.ECONNREFUSED;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    }));
   } else {
    peer.socket.onopen = handleOpen;
    peer.socket.onclose = (function() {
     Module["websocket"].emit("close", sock.stream.fd);
    });
    peer.socket.onmessage = function peer_socket_onmessage(event) {
     handleMessage(event.data);
    };
    peer.socket.onerror = (function(error) {
     sock.error = ERRNO_CODES.ECONNREFUSED;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    });
   }
  }),
  poll: (function(sock) {
   if (sock.type === 1 && sock.server) {
    return sock.pending.length ? 64 | 1 : 0;
   }
   var mask = 0;
   var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
   if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
    mask |= 64 | 1;
   }
   if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
    mask |= 4;
   }
   if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
    mask |= 16;
   }
   return mask;
  }),
  ioctl: (function(sock, request, arg) {
   switch (request) {
   case 21531:
    var bytes = 0;
    if (sock.recv_queue.length) {
     bytes = sock.recv_queue[0].data.length;
    }
    HEAP32[arg >> 2] = bytes;
    return 0;
   default:
    return ERRNO_CODES.EINVAL;
   }
  }),
  close: (function(sock) {
   if (sock.server) {
    try {
     sock.server.close();
    } catch (e) {}
    sock.server = null;
   }
   var peers = Object.keys(sock.peers);
   for (var i = 0; i < peers.length; i++) {
    var peer = sock.peers[peers[i]];
    try {
     peer.socket.close();
    } catch (e) {}
    SOCKFS.websocket_sock_ops.removePeer(sock, peer);
   }
   return 0;
  }),
  bind: (function(sock, addr, port) {
   if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   sock.saddr = addr;
   sock.sport = port || _mkport();
   if (sock.type === 2) {
    if (sock.server) {
     sock.server.close();
     sock.server = null;
    }
    try {
     sock.sock_ops.listen(sock, 0);
    } catch (e) {
     if (!(e instanceof FS.ErrnoError)) throw e;
     if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
    }
   }
  }),
  connect: (function(sock, addr, port) {
   if (sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   }
   if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
    var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
    if (dest) {
     if (dest.socket.readyState === dest.socket.CONNECTING) {
      throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
     } else {
      throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
     }
    }
   }
   var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
   sock.daddr = peer.addr;
   sock.dport = peer.port;
   throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
  }),
  listen: (function(sock, backlog) {
   if (!ENVIRONMENT_IS_NODE) {
    throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   }
   if (sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   var WebSocketServer = require("ws").Server;
   var host = sock.saddr;
   sock.server = new WebSocketServer({
    host: host,
    port: sock.sport
   });
   Module["websocket"].emit("listen", sock.stream.fd);
   sock.server.on("connection", (function(ws) {
    if (sock.type === 1) {
     var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
     var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
     newsock.daddr = peer.addr;
     newsock.dport = peer.port;
     sock.pending.push(newsock);
     Module["websocket"].emit("connection", newsock.stream.fd);
    } else {
     SOCKFS.websocket_sock_ops.createPeer(sock, ws);
     Module["websocket"].emit("connection", sock.stream.fd);
    }
   }));
   sock.server.on("closed", (function() {
    Module["websocket"].emit("close", sock.stream.fd);
    sock.server = null;
   }));
   sock.server.on("error", (function(error) {
    sock.error = ERRNO_CODES.EHOSTUNREACH;
    Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable" ]);
   }));
  }),
  accept: (function(listensock) {
   if (!listensock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   var newsock = listensock.pending.shift();
   newsock.stream.flags = listensock.stream.flags;
   return newsock;
  }),
  getname: (function(sock, peer) {
   var addr, port;
   if (peer) {
    if (sock.daddr === undefined || sock.dport === undefined) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
    }
    addr = sock.daddr;
    port = sock.dport;
   } else {
    addr = sock.saddr || 0;
    port = sock.sport || 0;
   }
   return {
    addr: addr,
    port: port
   };
  }),
  sendmsg: (function(sock, buffer, offset, length, addr, port) {
   if (sock.type === 2) {
    if (addr === undefined || port === undefined) {
     addr = sock.daddr;
     port = sock.dport;
    }
    if (addr === undefined || port === undefined) {
     throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
    }
   } else {
    addr = sock.daddr;
    port = sock.dport;
   }
   var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
   if (sock.type === 1) {
    if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
    } else if (dest.socket.readyState === dest.socket.CONNECTING) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
   }
   var data;
   if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
    data = buffer.slice(offset, offset + length);
   } else {
    data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
   }
   if (sock.type === 2) {
    if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
     if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
     }
     dest.dgram_send_queue.push(data);
     return length;
    }
   }
   try {
    dest.socket.send(data);
    return length;
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
  }),
  recvmsg: (function(sock, length) {
   if (sock.type === 1 && sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
   }
   var queued = sock.recv_queue.shift();
   if (!queued) {
    if (sock.type === 1) {
     var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
     if (!dest) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
     } else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      return null;
     } else {
      throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     }
    } else {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
   }
   var queuedLength = queued.data.byteLength || queued.data.length;
   var queuedOffset = queued.data.byteOffset || 0;
   var queuedBuffer = queued.data.buffer || queued.data;
   var bytesRead = Math.min(length, queuedLength);
   var res = {
    buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
    addr: queued.addr,
    port: queued.port
   };
   if (sock.type === 1 && bytesRead < queuedLength) {
    var bytesRemaining = queuedLength - bytesRead;
    queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
    sock.recv_queue.unshift(queued);
   }
   return res;
  })
 }
};
function _recv(fd, buf, len, flags) {
 var sock = SOCKFS.getSocket(fd);
 if (!sock) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 return _read(fd, buf, len);
}
function _pread(fildes, buf, nbyte, offset) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.read(stream, slab, buf, nbyte, offset);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _read(fildes, buf, nbyte) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.read(stream, slab, buf, nbyte);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _fread(ptr, size, nitems, stream) {
 var bytesToRead = nitems * size;
 if (bytesToRead == 0) {
  return 0;
 }
 var bytesRead = 0;
 var streamObj = FS.getStreamFromPtr(stream);
 if (!streamObj) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return 0;
 }
 while (streamObj.ungotten.length && bytesToRead > 0) {
  HEAP8[ptr++ >> 0] = streamObj.ungotten.pop();
  bytesToRead--;
  bytesRead++;
 }
 var err = _read(streamObj.fd, ptr, bytesToRead);
 if (err == -1) {
  if (streamObj) streamObj.error = true;
  return 0;
 }
 bytesRead += err;
 if (bytesRead < bytesToRead) streamObj.eof = true;
 return bytesRead / size | 0;
}
function _fgetc(stream) {
 var streamObj = FS.getStreamFromPtr(stream);
 if (!streamObj) return -1;
 if (streamObj.eof || streamObj.error) return -1;
 var ret = _fread(_fgetc.ret, 1, 1, stream);
 if (ret == 0) {
  return -1;
 } else if (ret == -1) {
  streamObj.error = true;
  return -1;
 } else {
  return HEAPU8[_fgetc.ret >> 0];
 }
}
function _getchar() {
 return _fgetc(HEAP32[_stdin >> 2]);
}
function _send(fd, buf, len, flags) {
 var sock = SOCKFS.getSocket(fd);
 if (!sock) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 return _write(fd, buf, len);
}
function _pwrite(fildes, buf, nbyte, offset) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.write(stream, slab, buf, nbyte, offset);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _write(fildes, buf, nbyte) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.write(stream, slab, buf, nbyte);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _fileno(stream) {
 stream = FS.getStreamFromPtr(stream);
 if (!stream) return -1;
 return stream.fd;
}
function _fputc(c, stream) {
 var chr = unSign(c & 255);
 HEAP8[_fputc.ret >> 0] = chr;
 var fd = _fileno(stream);
 var ret = _write(fd, _fputc.ret, 1);
 if (ret == -1) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (streamObj) streamObj.error = true;
  return -1;
 } else {
  return chr;
 }
}
var PTHREAD_SPECIFIC = {};
function _pthread_getspecific(key) {
 return PTHREAD_SPECIFIC[key] || 0;
}
function _sysconf(name) {
 switch (name) {
 case 30:
  return PAGE_SIZE;
 case 85:
  return totalMemory / PAGE_SIZE;
 case 132:
 case 133:
 case 12:
 case 137:
 case 138:
 case 15:
 case 235:
 case 16:
 case 17:
 case 18:
 case 19:
 case 20:
 case 149:
 case 13:
 case 10:
 case 236:
 case 153:
 case 9:
 case 21:
 case 22:
 case 159:
 case 154:
 case 14:
 case 77:
 case 78:
 case 139:
 case 80:
 case 81:
 case 82:
 case 68:
 case 67:
 case 164:
 case 11:
 case 29:
 case 47:
 case 48:
 case 95:
 case 52:
 case 51:
 case 46:
  return 200809;
 case 79:
  return 0;
 case 27:
 case 246:
 case 127:
 case 128:
 case 23:
 case 24:
 case 160:
 case 161:
 case 181:
 case 182:
 case 242:
 case 183:
 case 184:
 case 243:
 case 244:
 case 245:
 case 165:
 case 178:
 case 179:
 case 49:
 case 50:
 case 168:
 case 169:
 case 175:
 case 170:
 case 171:
 case 172:
 case 97:
 case 76:
 case 32:
 case 173:
 case 35:
  return -1;
 case 176:
 case 177:
 case 7:
 case 155:
 case 8:
 case 157:
 case 125:
 case 126:
 case 92:
 case 93:
 case 129:
 case 130:
 case 131:
 case 94:
 case 91:
  return 1;
 case 74:
 case 60:
 case 69:
 case 70:
 case 4:
  return 1024;
 case 31:
 case 42:
 case 72:
  return 32;
 case 87:
 case 26:
 case 33:
  return 2147483647;
 case 34:
 case 1:
  return 47839;
 case 38:
 case 36:
  return 99;
 case 43:
 case 37:
  return 2048;
 case 0:
  return 2097152;
 case 3:
  return 65536;
 case 28:
  return 32768;
 case 44:
  return 32767;
 case 75:
  return 16384;
 case 39:
  return 1e3;
 case 89:
  return 700;
 case 71:
  return 256;
 case 40:
  return 255;
 case 2:
  return 100;
 case 180:
  return 64;
 case 25:
  return 20;
 case 5:
  return 16;
 case 6:
  return 6;
 case 73:
  return 4;
 case 84:
  {
   if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
   return 1;
  }
 }
 ___setErrNo(ERRNO_CODES.EINVAL);
 return -1;
}
var _fabs = Math_abs;
function _clock() {
 if (_clock.start === undefined) _clock.start = Date.now();
 return (Date.now() - _clock.start) * (1e6 / 1e3) | 0;
}
function _fwrite(ptr, size, nitems, stream) {
 var bytesToWrite = nitems * size;
 if (bytesToWrite == 0) return 0;
 var fd = _fileno(stream);
 var bytesWritten = _write(fd, ptr, bytesToWrite);
 if (bytesWritten == -1) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (streamObj) streamObj.error = true;
  return 0;
 } else {
  return bytesWritten / size | 0;
 }
}
function _getc() {
 return _fgetc.apply(null, arguments);
}
function _catclose(catd) {
 return 0;
}
function _emscripten_set_main_loop_timing(mode, value) {
 Browser.mainLoop.timingMode = mode;
 Browser.mainLoop.timingValue = value;
 if (!Browser.mainLoop.func) {
  return 1;
 }
 if (mode == 0) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
   setTimeout(Browser.mainLoop.runner, value);
  };
  Browser.mainLoop.method = "timeout";
 } else if (mode == 1) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
   Browser.requestAnimationFrame(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "rAF";
 }
 return 0;
}
function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
 Module["noExitRuntime"] = true;
 assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
 Browser.mainLoop.func = func;
 Browser.mainLoop.arg = arg;
 var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
 Browser.mainLoop.runner = function Browser_mainLoop_runner() {
  if (ABORT) return;
  if (Browser.mainLoop.queue.length > 0) {
   var start = Date.now();
   var blocker = Browser.mainLoop.queue.shift();
   blocker.func(blocker.arg);
   if (Browser.mainLoop.remainingBlockers) {
    var remaining = Browser.mainLoop.remainingBlockers;
    var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
    if (blocker.counted) {
     Browser.mainLoop.remainingBlockers = next;
    } else {
     next = next + .5;
     Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
    }
   }
   console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
   Browser.mainLoop.updateStatus();
   setTimeout(Browser.mainLoop.runner, 0);
   return;
  }
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
  if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
   Browser.mainLoop.scheduler();
   return;
  }
  if (Browser.mainLoop.method === "timeout" && Module.ctx) {
   Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
   Browser.mainLoop.method = "";
  }
  Browser.mainLoop.runIter((function() {
   if (typeof arg !== "undefined") {
    Runtime.dynCall("vi", func, [ arg ]);
   } else {
    Runtime.dynCall("v", func);
   }
  }));
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  Browser.mainLoop.scheduler();
 };
 if (!noSetTiming) {
  if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps); else _emscripten_set_main_loop_timing(1, 1);
  Browser.mainLoop.scheduler();
 }
 if (simulateInfiniteLoop) {
  throw "SimulateInfiniteLoop";
 }
}
var Browser = {
 mainLoop: {
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  pause: (function() {
   Browser.mainLoop.scheduler = null;
   Browser.mainLoop.currentlyRunningMainloop++;
  }),
  resume: (function() {
   Browser.mainLoop.currentlyRunningMainloop++;
   var timingMode = Browser.mainLoop.timingMode;
   var timingValue = Browser.mainLoop.timingValue;
   var func = Browser.mainLoop.func;
   Browser.mainLoop.func = null;
   _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
   _emscripten_set_main_loop_timing(timingMode, timingValue);
   Browser.mainLoop.scheduler();
  }),
  updateStatus: (function() {
   if (Module["setStatus"]) {
    var message = Module["statusMessage"] || "Please wait...";
    var remaining = Browser.mainLoop.remainingBlockers;
    var expected = Browser.mainLoop.expectedBlockers;
    if (remaining) {
     if (remaining < expected) {
      Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")");
     } else {
      Module["setStatus"](message);
     }
    } else {
     Module["setStatus"]("");
    }
   }
  }),
  runIter: (function(func) {
   if (ABORT) return;
   if (Module["preMainLoop"]) {
    var preRet = Module["preMainLoop"]();
    if (preRet === false) {
     return;
    }
   }
   try {
    func();
   } catch (e) {
    if (e instanceof ExitStatus) {
     return;
    } else {
     if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [ e, e.stack ]);
     throw e;
    }
   }
   if (Module["postMainLoop"]) Module["postMainLoop"]();
  })
 },
 isFullScreen: false,
 pointerLock: false,
 moduleContextCreatedCallbacks: [],
 workers: [],
 init: (function() {
  if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
  if (Browser.initted) return;
  Browser.initted = true;
  try {
   new Blob;
   Browser.hasBlobConstructor = true;
  } catch (e) {
   Browser.hasBlobConstructor = false;
   console.log("warning: no blob constructor, cannot create blobs with mimetypes");
  }
  Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
  Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
  if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
   console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
   Module.noImageDecoding = true;
  }
  var imagePlugin = {};
  imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
   return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
  };
  imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
   var b = null;
   if (Browser.hasBlobConstructor) {
    try {
     b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
     if (b.size !== byteArray.length) {
      b = new Blob([ (new Uint8Array(byteArray)).buffer ], {
       type: Browser.getMimetype(name)
      });
     }
    } catch (e) {
     Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder");
    }
   }
   if (!b) {
    var bb = new Browser.BlobBuilder;
    bb.append((new Uint8Array(byteArray)).buffer);
    b = bb.getBlob();
   }
   var url = Browser.URLObject.createObjectURL(b);
   var img = new Image;
   img.onload = function img_onload() {
    assert(img.complete, "Image " + name + " could not be decoded");
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    Module["preloadedImages"][name] = canvas;
    Browser.URLObject.revokeObjectURL(url);
    if (onload) onload(byteArray);
   };
   img.onerror = function img_onerror(event) {
    console.log("Image " + url + " could not be decoded");
    if (onerror) onerror();
   };
   img.src = url;
  };
  Module["preloadPlugins"].push(imagePlugin);
  var audioPlugin = {};
  audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
   return !Module.noAudioDecoding && name.substr(-4) in {
    ".ogg": 1,
    ".wav": 1,
    ".mp3": 1
   };
  };
  audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
   var done = false;
   function finish(audio) {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = audio;
    if (onload) onload(byteArray);
   }
   function fail() {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = new Audio;
    if (onerror) onerror();
   }
   if (Browser.hasBlobConstructor) {
    try {
     var b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
    } catch (e) {
     return fail();
    }
    var url = Browser.URLObject.createObjectURL(b);
    var audio = new Audio;
    audio.addEventListener("canplaythrough", (function() {
     finish(audio);
    }), false);
    audio.onerror = function audio_onerror(event) {
     if (done) return;
     console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");
     function encode64(data) {
      var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var PAD = "=";
      var ret = "";
      var leftchar = 0;
      var leftbits = 0;
      for (var i = 0; i < data.length; i++) {
       leftchar = leftchar << 8 | data[i];
       leftbits += 8;
       while (leftbits >= 6) {
        var curr = leftchar >> leftbits - 6 & 63;
        leftbits -= 6;
        ret += BASE[curr];
       }
      }
      if (leftbits == 2) {
       ret += BASE[(leftchar & 3) << 4];
       ret += PAD + PAD;
      } else if (leftbits == 4) {
       ret += BASE[(leftchar & 15) << 2];
       ret += PAD;
      }
      return ret;
     }
     audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
     finish(audio);
    };
    audio.src = url;
    Browser.safeSetTimeout((function() {
     finish(audio);
    }), 1e4);
   } else {
    return fail();
   }
  };
  Module["preloadPlugins"].push(audioPlugin);
  var canvas = Module["canvas"];
  function pointerLockChange() {
   Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas || document["msPointerLockElement"] === canvas;
  }
  if (canvas) {
   canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (function() {});
   canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (function() {});
   canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
   document.addEventListener("pointerlockchange", pointerLockChange, false);
   document.addEventListener("mozpointerlockchange", pointerLockChange, false);
   document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
   document.addEventListener("mspointerlockchange", pointerLockChange, false);
   if (Module["elementPointerLock"]) {
    canvas.addEventListener("click", (function(ev) {
     if (!Browser.pointerLock && canvas.requestPointerLock) {
      canvas.requestPointerLock();
      ev.preventDefault();
     }
    }), false);
   }
  }
 }),
 createContext: (function(canvas, useWebGL, setInModule, webGLContextAttributes) {
  if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
  var ctx;
  var contextHandle;
  if (useWebGL) {
   var contextAttributes = {
    antialias: false,
    alpha: false
   };
   if (webGLContextAttributes) {
    for (var attribute in webGLContextAttributes) {
     contextAttributes[attribute] = webGLContextAttributes[attribute];
    }
   }
   contextHandle = GL.createContext(canvas, contextAttributes);
   if (contextHandle) {
    ctx = GL.getContext(contextHandle).GLctx;
   }
   canvas.style.backgroundColor = "black";
  } else {
   ctx = canvas.getContext("2d");
  }
  if (!ctx) return null;
  if (setInModule) {
   if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
   Module.ctx = ctx;
   if (useWebGL) GL.makeContextCurrent(contextHandle);
   Module.useWebGL = useWebGL;
   Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
    callback();
   }));
   Browser.init();
  }
  return ctx;
 }),
 destroyContext: (function(canvas, useWebGL, setInModule) {}),
 fullScreenHandlersInstalled: false,
 lockPointer: undefined,
 resizeCanvas: undefined,
 requestFullScreen: (function(lockPointer, resizeCanvas, vrDevice) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  Browser.vrDevice = vrDevice;
  if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
  if (typeof Browser.vrDevice === "undefined") Browser.vrDevice = null;
  var canvas = Module["canvas"];
  function fullScreenChange() {
   Browser.isFullScreen = false;
   var canvasContainer = canvas.parentNode;
   if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
    canvas.cancelFullScreen = document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["webkitCancelFullScreen"] || document["msExitFullscreen"] || document["exitFullscreen"] || (function() {});
    canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
    if (Browser.lockPointer) canvas.requestPointerLock();
    Browser.isFullScreen = true;
    if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
   } else {
    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
    canvasContainer.parentNode.removeChild(canvasContainer);
    if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
   }
   if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullScreen);
   Browser.updateCanvasDimensions(canvas);
  }
  if (!Browser.fullScreenHandlersInstalled) {
   Browser.fullScreenHandlersInstalled = true;
   document.addEventListener("fullscreenchange", fullScreenChange, false);
   document.addEventListener("mozfullscreenchange", fullScreenChange, false);
   document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
   document.addEventListener("MSFullscreenChange", fullScreenChange, false);
  }
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);
  canvasContainer.requestFullScreen = canvasContainer["requestFullScreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullScreen"] ? (function() {
   canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
  }) : null);
  if (vrDevice) {
   canvasContainer.requestFullScreen({
    vrDisplay: vrDevice
   });
  } else {
   canvasContainer.requestFullScreen();
  }
 }),
 nextRAF: 0,
 fakeRequestAnimationFrame: (function(func) {
  var now = Date.now();
  if (Browser.nextRAF === 0) {
   Browser.nextRAF = now + 1e3 / 60;
  } else {
   while (now + 2 >= Browser.nextRAF) {
    Browser.nextRAF += 1e3 / 60;
   }
  }
  var delay = Math.max(Browser.nextRAF - now, 0);
  setTimeout(func, delay);
 }),
 requestAnimationFrame: function requestAnimationFrame(func) {
  if (typeof window === "undefined") {
   Browser.fakeRequestAnimationFrame(func);
  } else {
   if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || Browser.fakeRequestAnimationFrame;
   }
   window.requestAnimationFrame(func);
  }
 },
 safeCallback: (function(func) {
  return (function() {
   if (!ABORT) return func.apply(null, arguments);
  });
 }),
 allowAsyncCallbacks: true,
 queuedAsyncCallbacks: [],
 pauseAsyncCallbacks: (function() {
  Browser.allowAsyncCallbacks = false;
 }),
 resumeAsyncCallbacks: (function() {
  Browser.allowAsyncCallbacks = true;
  if (Browser.queuedAsyncCallbacks.length > 0) {
   var callbacks = Browser.queuedAsyncCallbacks;
   Browser.queuedAsyncCallbacks = [];
   callbacks.forEach((function(func) {
    func();
   }));
  }
 }),
 safeRequestAnimationFrame: (function(func) {
  return Browser.requestAnimationFrame((function() {
   if (ABORT) return;
   if (Browser.allowAsyncCallbacks) {
    func();
   } else {
    Browser.queuedAsyncCallbacks.push(func);
   }
  }));
 }),
 safeSetTimeout: (function(func, timeout) {
  Module["noExitRuntime"] = true;
  return setTimeout((function() {
   if (ABORT) return;
   if (Browser.allowAsyncCallbacks) {
    func();
   } else {
    Browser.queuedAsyncCallbacks.push(func);
   }
  }), timeout);
 }),
 safeSetInterval: (function(func, timeout) {
  Module["noExitRuntime"] = true;
  return setInterval((function() {
   if (ABORT) return;
   if (Browser.allowAsyncCallbacks) {
    func();
   }
  }), timeout);
 }),
 getMimetype: (function(name) {
  return {
   "jpg": "image/jpeg",
   "jpeg": "image/jpeg",
   "png": "image/png",
   "bmp": "image/bmp",
   "ogg": "audio/ogg",
   "wav": "audio/wav",
   "mp3": "audio/mpeg"
  }[name.substr(name.lastIndexOf(".") + 1)];
 }),
 getUserMedia: (function(func) {
  if (!window.getUserMedia) {
   window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"];
  }
  window.getUserMedia(func);
 }),
 getMovementX: (function(event) {
  return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
 }),
 getMovementY: (function(event) {
  return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
 }),
 getMouseWheelDelta: (function(event) {
  var delta = 0;
  switch (event.type) {
  case "DOMMouseScroll":
   delta = event.detail;
   break;
  case "mousewheel":
   delta = event.wheelDelta;
   break;
  case "wheel":
   delta = event["deltaY"];
   break;
  default:
   throw "unrecognized mouse wheel event: " + event.type;
  }
  return delta;
 }),
 mouseX: 0,
 mouseY: 0,
 mouseMovementX: 0,
 mouseMovementY: 0,
 touches: {},
 lastTouches: {},
 calculateMouseEvent: (function(event) {
  if (Browser.pointerLock) {
   if (event.type != "mousemove" && "mozMovementX" in event) {
    Browser.mouseMovementX = Browser.mouseMovementY = 0;
   } else {
    Browser.mouseMovementX = Browser.getMovementX(event);
    Browser.mouseMovementY = Browser.getMovementY(event);
   }
   if (typeof SDL != "undefined") {
    Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
    Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
   } else {
    Browser.mouseX += Browser.mouseMovementX;
    Browser.mouseY += Browser.mouseMovementY;
   }
  } else {
   var rect = Module["canvas"].getBoundingClientRect();
   var cw = Module["canvas"].width;
   var ch = Module["canvas"].height;
   var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
   var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
   if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
    var touch = event.touch;
    if (touch === undefined) {
     return;
    }
    var adjustedX = touch.pageX - (scrollX + rect.left);
    var adjustedY = touch.pageY - (scrollY + rect.top);
    adjustedX = adjustedX * (cw / rect.width);
    adjustedY = adjustedY * (ch / rect.height);
    var coords = {
     x: adjustedX,
     y: adjustedY
    };
    if (event.type === "touchstart") {
     Browser.lastTouches[touch.identifier] = coords;
     Browser.touches[touch.identifier] = coords;
    } else if (event.type === "touchend" || event.type === "touchmove") {
     var last = Browser.touches[touch.identifier];
     if (!last) last = coords;
     Browser.lastTouches[touch.identifier] = last;
     Browser.touches[touch.identifier] = coords;
    }
    return;
   }
   var x = event.pageX - (scrollX + rect.left);
   var y = event.pageY - (scrollY + rect.top);
   x = x * (cw / rect.width);
   y = y * (ch / rect.height);
   Browser.mouseMovementX = x - Browser.mouseX;
   Browser.mouseMovementY = y - Browser.mouseY;
   Browser.mouseX = x;
   Browser.mouseY = y;
  }
 }),
 xhrLoad: (function(url, onload, onerror) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
   } else {
    onerror();
   }
  };
  xhr.onerror = onerror;
  xhr.send(null);
 }),
 asyncLoad: (function(url, onload, onerror, noRunDep) {
  Browser.xhrLoad(url, (function(arrayBuffer) {
   assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
   onload(new Uint8Array(arrayBuffer));
   if (!noRunDep) removeRunDependency("al " + url);
  }), (function(event) {
   if (onerror) {
    onerror();
   } else {
    throw 'Loading data file "' + url + '" failed.';
   }
  }));
  if (!noRunDep) addRunDependency("al " + url);
 }),
 resizeListeners: [],
 updateResizeListeners: (function() {
  var canvas = Module["canvas"];
  Browser.resizeListeners.forEach((function(listener) {
   listener(canvas.width, canvas.height);
  }));
 }),
 setCanvasSize: (function(width, height, noUpdates) {
  var canvas = Module["canvas"];
  Browser.updateCanvasDimensions(canvas, width, height);
  if (!noUpdates) Browser.updateResizeListeners();
 }),
 windowedWidth: 0,
 windowedHeight: 0,
 setFullScreenCanvasSize: (function() {
  if (typeof SDL != "undefined") {
   var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
   flags = flags | 8388608;
   HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags;
  }
  Browser.updateResizeListeners();
 }),
 setWindowedCanvasSize: (function() {
  if (typeof SDL != "undefined") {
   var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
   flags = flags & ~8388608;
   HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags;
  }
  Browser.updateResizeListeners();
 }),
 updateCanvasDimensions: (function(canvas, wNative, hNative) {
  if (wNative && hNative) {
   canvas.widthNative = wNative;
   canvas.heightNative = hNative;
  } else {
   wNative = canvas.widthNative;
   hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
   if (w / h < Module["forcedAspectRatio"]) {
    w = Math.round(h * Module["forcedAspectRatio"]);
   } else {
    h = Math.round(w / Module["forcedAspectRatio"]);
   }
  }
  if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
   var factor = Math.min(screen.width / w, screen.height / h);
   w = Math.round(w * factor);
   h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
   if (canvas.width != w) canvas.width = w;
   if (canvas.height != h) canvas.height = h;
   if (typeof canvas.style != "undefined") {
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
   }
  } else {
   if (canvas.width != wNative) canvas.width = wNative;
   if (canvas.height != hNative) canvas.height = hNative;
   if (typeof canvas.style != "undefined") {
    if (w != wNative || h != hNative) {
     canvas.style.setProperty("width", w + "px", "important");
     canvas.style.setProperty("height", h + "px", "important");
    } else {
     canvas.style.removeProperty("width");
     canvas.style.removeProperty("height");
    }
   }
  }
 }),
 wgetRequests: {},
 nextWgetRequestHandle: 0,
 getNextWgetRequestHandle: (function() {
  var handle = Browser.nextWgetRequestHandle;
  Browser.nextWgetRequestHandle++;
  return handle;
 })
};
function _pthread_setspecific(key, value) {
 if (!(key in PTHREAD_SPECIFIC)) {
  return ERRNO_CODES.EINVAL;
 }
 PTHREAD_SPECIFIC[key] = value;
 return 0;
}
function ___ctype_b_loc() {
 var me = ___ctype_b_loc;
 if (!me.ret) {
  var values = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 8195, 8194, 8194, 8194, 8194, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 24577, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 55304, 49156, 49156, 49156, 49156, 49156, 49156, 49156, 54536, 54536, 54536, 54536, 54536, 54536, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 50440, 49156, 49156, 49156, 49156, 49156, 49156, 54792, 54792, 54792, 54792, 54792, 54792, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 50696, 49156, 49156, 49156, 49156, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
  var i16size = 2;
  var arr = _malloc(values.length * i16size);
  for (var i = 0; i < values.length; i++) {
   HEAP16[arr + i * i16size >> 1] = values[i];
  }
  me.ret = allocate([ arr + 128 * i16size ], "i16*", ALLOC_NORMAL);
 }
 return me.ret;
}
var LOCALE = {
 curr: 0,
 check: (function(locale) {
  if (locale) locale = Pointer_stringify(locale);
  return locale === "C" || locale === "POSIX" || !locale;
 })
};
function _free() {}
Module["_free"] = _free;
function _freelocale(locale) {
 _free(locale);
}
function _malloc(bytes) {
 var ptr = Runtime.dynamicAlloc(bytes + 8);
 return ptr + 8 & 4294967288;
}
Module["_malloc"] = _malloc;
function ___cxa_allocate_exception(size) {
 return _malloc(size);
}
Module["_i64Add"] = _i64Add;
Module["_bitshift64Lshr"] = _bitshift64Lshr;
function _catopen(name, oflag) {
 return -1;
}
function _catgets(catd, set_id, msg_id, s) {
 return s;
}
var _BDtoIHigh = true;
function _pthread_cond_broadcast() {
 return 0;
}
function ___ctype_toupper_loc() {
 var me = ___ctype_toupper_loc;
 if (!me.ret) {
  var values = [ 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255 ];
  var i32size = 4;
  var arr = _malloc(values.length * i32size);
  for (var i = 0; i < values.length; i++) {
   HEAP32[arr + i * i32size >> 2] = values[i];
  }
  me.ret = allocate([ arr + 128 * i32size ], "i32*", ALLOC_NORMAL);
 }
 return me.ret;
}
function ___cxa_guard_acquire(variable) {
 if (!HEAP8[variable >> 0]) {
  HEAP8[variable >> 0] = 1;
  return 1;
 }
 return 0;
}
function ___cxa_guard_release() {}
function __reallyNegative(x) {
 return x < 0 || x === 0 && 1 / x === -Infinity;
}
function __formatString(format, varargs) {
 assert((varargs & 3) === 0);
 var textIndex = format;
 var argIndex = 0;
 function getNextArg(type) {
  var ret;
  argIndex = Runtime.prepVararg(argIndex, type);
  if (type === "double") {
   ret = (HEAP32[tempDoublePtr >> 2] = HEAP32[varargs + argIndex >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[varargs + (argIndex + 4) >> 2], +HEAPF64[tempDoublePtr >> 3]);
   argIndex += 8;
  } else if (type == "i64") {
   ret = [ HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2] ];
   argIndex += 8;
  } else {
   assert((argIndex & 3) === 0);
   type = "i32";
   ret = HEAP32[varargs + argIndex >> 2];
   argIndex += 4;
  }
  return ret;
 }
 var ret = [];
 var curr, next, currArg;
 while (1) {
  var startTextIndex = textIndex;
  curr = HEAP8[textIndex >> 0];
  if (curr === 0) break;
  next = HEAP8[textIndex + 1 >> 0];
  if (curr == 37) {
   var flagAlwaysSigned = false;
   var flagLeftAlign = false;
   var flagAlternative = false;
   var flagZeroPad = false;
   var flagPadSign = false;
   flagsLoop : while (1) {
    switch (next) {
    case 43:
     flagAlwaysSigned = true;
     break;
    case 45:
     flagLeftAlign = true;
     break;
    case 35:
     flagAlternative = true;
     break;
    case 48:
     if (flagZeroPad) {
      break flagsLoop;
     } else {
      flagZeroPad = true;
      break;
     }
    case 32:
     flagPadSign = true;
     break;
    default:
     break flagsLoop;
    }
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
   }
   var width = 0;
   if (next == 42) {
    width = getNextArg("i32");
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
   } else {
    while (next >= 48 && next <= 57) {
     width = width * 10 + (next - 48);
     textIndex++;
     next = HEAP8[textIndex + 1 >> 0];
    }
   }
   var precisionSet = false, precision = -1;
   if (next == 46) {
    precision = 0;
    precisionSet = true;
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
    if (next == 42) {
     precision = getNextArg("i32");
     textIndex++;
    } else {
     while (1) {
      var precisionChr = HEAP8[textIndex + 1 >> 0];
      if (precisionChr < 48 || precisionChr > 57) break;
      precision = precision * 10 + (precisionChr - 48);
      textIndex++;
     }
    }
    next = HEAP8[textIndex + 1 >> 0];
   }
   if (precision < 0) {
    precision = 6;
    precisionSet = false;
   }
   var argSize;
   switch (String.fromCharCode(next)) {
   case "h":
    var nextNext = HEAP8[textIndex + 2 >> 0];
    if (nextNext == 104) {
     textIndex++;
     argSize = 1;
    } else {
     argSize = 2;
    }
    break;
   case "l":
    var nextNext = HEAP8[textIndex + 2 >> 0];
    if (nextNext == 108) {
     textIndex++;
     argSize = 8;
    } else {
     argSize = 4;
    }
    break;
   case "L":
   case "q":
   case "j":
    argSize = 8;
    break;
   case "z":
   case "t":
   case "I":
    argSize = 4;
    break;
   default:
    argSize = null;
   }
   if (argSize) textIndex++;
   next = HEAP8[textIndex + 1 >> 0];
   switch (String.fromCharCode(next)) {
   case "d":
   case "i":
   case "u":
   case "o":
   case "x":
   case "X":
   case "p":
    {
     var signed = next == 100 || next == 105;
     argSize = argSize || 4;
     var currArg = getNextArg("i" + argSize * 8);
     var origArg = currArg;
     var argText;
     if (argSize == 8) {
      currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
     }
     if (argSize <= 4) {
      var limit = Math.pow(256, argSize) - 1;
      currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
     }
     var currAbsArg = Math.abs(currArg);
     var prefix = "";
     if (next == 100 || next == 105) {
      if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else argText = reSign(currArg, 8 * argSize, 1).toString(10);
     } else if (next == 117) {
      if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else argText = unSign(currArg, 8 * argSize, 1).toString(10);
      currArg = Math.abs(currArg);
     } else if (next == 111) {
      argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8);
     } else if (next == 120 || next == 88) {
      prefix = flagAlternative && currArg != 0 ? "0x" : "";
      if (argSize == 8 && i64Math) {
       if (origArg[1]) {
        argText = (origArg[1] >>> 0).toString(16);
        var lower = (origArg[0] >>> 0).toString(16);
        while (lower.length < 8) lower = "0" + lower;
        argText += lower;
       } else {
        argText = (origArg[0] >>> 0).toString(16);
       }
      } else if (currArg < 0) {
       currArg = -currArg;
       argText = (currAbsArg - 1).toString(16);
       var buffer = [];
       for (var i = 0; i < argText.length; i++) {
        buffer.push((15 - parseInt(argText[i], 16)).toString(16));
       }
       argText = buffer.join("");
       while (argText.length < argSize * 2) argText = "f" + argText;
      } else {
       argText = currAbsArg.toString(16);
      }
      if (next == 88) {
       prefix = prefix.toUpperCase();
       argText = argText.toUpperCase();
      }
     } else if (next == 112) {
      if (currAbsArg === 0) {
       argText = "(nil)";
      } else {
       prefix = "0x";
       argText = currAbsArg.toString(16);
      }
     }
     if (precisionSet) {
      while (argText.length < precision) {
       argText = "0" + argText;
      }
     }
     if (currArg >= 0) {
      if (flagAlwaysSigned) {
       prefix = "+" + prefix;
      } else if (flagPadSign) {
       prefix = " " + prefix;
      }
     }
     if (argText.charAt(0) == "-") {
      prefix = "-" + prefix;
      argText = argText.substr(1);
     }
     while (prefix.length + argText.length < width) {
      if (flagLeftAlign) {
       argText += " ";
      } else {
       if (flagZeroPad) {
        argText = "0" + argText;
       } else {
        prefix = " " + prefix;
       }
      }
     }
     argText = prefix + argText;
     argText.split("").forEach((function(chr) {
      ret.push(chr.charCodeAt(0));
     }));
     break;
    }
   case "f":
   case "F":
   case "e":
   case "E":
   case "g":
   case "G":
    {
     var currArg = getNextArg("double");
     var argText;
     if (isNaN(currArg)) {
      argText = "nan";
      flagZeroPad = false;
     } else if (!isFinite(currArg)) {
      argText = (currArg < 0 ? "-" : "") + "inf";
      flagZeroPad = false;
     } else {
      var isGeneral = false;
      var effectivePrecision = Math.min(precision, 20);
      if (next == 103 || next == 71) {
       isGeneral = true;
       precision = precision || 1;
       var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
       if (precision > exponent && exponent >= -4) {
        next = (next == 103 ? "f" : "F").charCodeAt(0);
        precision -= exponent + 1;
       } else {
        next = (next == 103 ? "e" : "E").charCodeAt(0);
        precision--;
       }
       effectivePrecision = Math.min(precision, 20);
      }
      if (next == 101 || next == 69) {
       argText = currArg.toExponential(effectivePrecision);
       if (/[eE][-+]\d$/.test(argText)) {
        argText = argText.slice(0, -1) + "0" + argText.slice(-1);
       }
      } else if (next == 102 || next == 70) {
       argText = currArg.toFixed(effectivePrecision);
       if (currArg === 0 && __reallyNegative(currArg)) {
        argText = "-" + argText;
       }
      }
      var parts = argText.split("e");
      if (isGeneral && !flagAlternative) {
       while (parts[0].length > 1 && parts[0].indexOf(".") != -1 && (parts[0].slice(-1) == "0" || parts[0].slice(-1) == ".")) {
        parts[0] = parts[0].slice(0, -1);
       }
      } else {
       if (flagAlternative && argText.indexOf(".") == -1) parts[0] += ".";
       while (precision > effectivePrecision++) parts[0] += "0";
      }
      argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : "");
      if (next == 69) argText = argText.toUpperCase();
      if (currArg >= 0) {
       if (flagAlwaysSigned) {
        argText = "+" + argText;
       } else if (flagPadSign) {
        argText = " " + argText;
       }
      }
     }
     while (argText.length < width) {
      if (flagLeftAlign) {
       argText += " ";
      } else {
       if (flagZeroPad && (argText[0] == "-" || argText[0] == "+")) {
        argText = argText[0] + "0" + argText.slice(1);
       } else {
        argText = (flagZeroPad ? "0" : " ") + argText;
       }
      }
     }
     if (next < 97) argText = argText.toUpperCase();
     argText.split("").forEach((function(chr) {
      ret.push(chr.charCodeAt(0));
     }));
     break;
    }
   case "s":
    {
     var arg = getNextArg("i8*");
     var argLength = arg ? _strlen(arg) : "(null)".length;
     if (precisionSet) argLength = Math.min(argLength, precision);
     if (!flagLeftAlign) {
      while (argLength < width--) {
       ret.push(32);
      }
     }
     if (arg) {
      for (var i = 0; i < argLength; i++) {
       ret.push(HEAPU8[arg++ >> 0]);
      }
     } else {
      ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), true));
     }
     if (flagLeftAlign) {
      while (argLength < width--) {
       ret.push(32);
      }
     }
     break;
    }
   case "c":
    {
     if (flagLeftAlign) ret.push(getNextArg("i8"));
     while (--width > 0) {
      ret.push(32);
     }
     if (!flagLeftAlign) ret.push(getNextArg("i8"));
     break;
    }
   case "n":
    {
     var ptr = getNextArg("i32*");
     HEAP32[ptr >> 2] = ret.length;
     break;
    }
   case "%":
    {
     ret.push(curr);
     break;
    }
   default:
    {
     for (var i = startTextIndex; i < textIndex + 2; i++) {
      ret.push(HEAP8[i >> 0]);
     }
    }
   }
   textIndex += 2;
  } else {
   ret.push(curr);
   textIndex += 1;
  }
 }
 return ret;
}
function _fprintf(stream, format, varargs) {
 var result = __formatString(format, varargs);
 var stack = Runtime.stackSave();
 var ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
 Runtime.stackRestore(stack);
 return ret;
}
function _vfprintf(s, f, va_arg) {
 return _fprintf(s, f, HEAP32[va_arg >> 2]);
}
function ___ctype_tolower_loc() {
 var me = ___ctype_tolower_loc;
 if (!me.ret) {
  var values = [ 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255 ];
  var i32size = 4;
  var arr = _malloc(values.length * i32size);
  for (var i = 0; i < values.length; i++) {
   HEAP32[arr + i * i32size >> 2] = values[i];
  }
  me.ret = allocate([ arr + 128 * i32size ], "i32*", ALLOC_NORMAL);
 }
 return me.ret;
}
function ___cxa_begin_catch(ptr) {
 __ZSt18uncaught_exceptionv.uncaught_exception--;
 EXCEPTIONS.caught.push(ptr);
 EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
 return ptr;
}
var _ceil = Math_ceil;
function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
 return dest;
}
Module["_memcpy"] = _memcpy;
var PTHREAD_SPECIFIC_NEXT_KEY = 1;
function _pthread_key_create(key, destructor) {
 if (key == 0) {
  return ERRNO_CODES.EINVAL;
 }
 HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
 PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
 PTHREAD_SPECIFIC_NEXT_KEY++;
 return 0;
}
function _sbrk(bytes) {
 var self = _sbrk;
 if (!self.called) {
  DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
  self.called = true;
  assert(Runtime.dynamicAlloc);
  self.alloc = Runtime.dynamicAlloc;
  Runtime.dynamicAlloc = (function() {
   abort("cannot dynamically allocate, sbrk now has control");
  });
 }
 var ret = DYNAMICTOP;
 if (bytes != 0) {
  var success = self.alloc(bytes);
  if (!success) return -1 >>> 0;
 }
 return ret;
}
Module["_bitshift64Shl"] = _bitshift64Shl;
function _calloc(n, s) {
 var ret = _malloc(n * s);
 _memset(ret, 0, n * s);
 return ret;
}
function _newlocale(mask, locale, base) {
 if (!LOCALE.check(locale)) {
  ___setErrNo(ERRNO_CODES.ENOENT);
  return 0;
 }
 if (!base) base = _calloc(1, 4);
 return base;
}
Module["_memmove"] = _memmove;
function ___errno_location() {
 return ___errno_state;
}
var _BItoD = true;
function _pthread_cond_wait() {
 return 0;
}
function _pthread_mutex_unlock() {}
function _time(ptr) {
 var ret = Date.now() / 1e3 | 0;
 if (ptr) {
  HEAP32[ptr >> 2] = ret;
 }
 return ret;
}
function _ungetc(c, stream) {
 stream = FS.getStreamFromPtr(stream);
 if (!stream) {
  return -1;
 }
 if (c === -1) {
  return c;
 }
 c = unSign(c & 255);
 stream.ungotten.push(c);
 stream.eof = false;
 return c;
}
function _uselocale(locale) {
 var old = LOCALE.curr;
 if (locale) LOCALE.curr = locale;
 return old;
}
var ___dso_handle = allocate(1, "i32*", ALLOC_STATIC);
___errno_state = Runtime.staticAlloc(4);
HEAP32[___errno_state >> 2] = 0;
FS.staticInit();
__ATINIT__.unshift((function() {
 if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
}));
__ATMAIN__.push((function() {
 FS.ignorePermissions = false;
}));
__ATEXIT__.push((function() {
 FS.quit();
}));
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift((function() {
 TTY.init();
}));
__ATEXIT__.push((function() {
 TTY.shutdown();
}));
if (ENVIRONMENT_IS_NODE) {
 var fs = require("fs");
 var NODEJS_PATH = require("path");
 NODEFS.staticInit();
}
_fgetc.ret = allocate([ 0 ], "i8", ALLOC_STATIC);
__ATINIT__.push((function() {
 SOCKFS.root = FS.mount(SOCKFS, {}, null);
}));
_fputc.ret = allocate([ 0 ], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) {
 Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice);
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
 Browser.requestAnimationFrame(func);
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
 Browser.setCanvasSize(width, height, noUpdates);
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
 Browser.mainLoop.pause();
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
 Browser.mainLoop.resume();
};
Module["getUserMedia"] = function Module_getUserMedia() {
 Browser.getUserMedia();
};
Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
 return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes);
};
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true;
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
var cttz_i8 = allocate([ 8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0 ], "i8", ALLOC_DYNAMIC);
function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
 try {
  return Module["dynCall_iiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiii(index, a1, a2, a3) {
 try {
  return Module["dynCall_iiii"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiii(index, a1, a2, a3, a4, a5) {
 try {
  Module["dynCall_viiiii"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiiid(index, a1, a2, a3, a4, a5, a6) {
 try {
  return Module["dynCall_iiiiiid"](index, a1, a2, a3, a4, a5, a6);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_vi(index, a1) {
 try {
  Module["dynCall_vi"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_vii(index, a1, a2) {
 try {
  Module["dynCall_vii"](index, a1, a2);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
 try {
  return Module["dynCall_iiiiiii"](index, a1, a2, a3, a4, a5, a6);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiid(index, a1, a2, a3, a4, a5) {
 try {
  return Module["dynCall_iiiiid"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_ii(index, a1) {
 try {
  return Module["dynCall_ii"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viid(index, a1, a2, a3) {
 try {
  Module["dynCall_viid"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viii(index, a1, a2, a3) {
 try {
  Module["dynCall_viii"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_v(index) {
 try {
  Module["dynCall_v"](index);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 try {
  return Module["dynCall_iiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiii(index, a1, a2, a3, a4) {
 try {
  return Module["dynCall_iiiii"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
 try {
  Module["dynCall_viiiiii"](index, a1, a2, a3, a4, a5, a6);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iii(index, a1, a2) {
 try {
  return Module["dynCall_iii"](index, a1, a2);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
 try {
  return Module["dynCall_iiiiii"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiii(index, a1, a2, a3, a4) {
 try {
  Module["dynCall_viiii"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
Module.asmGlobalArg = {
 "Math": Math,
 "Int8Array": Int8Array,
 "Int16Array": Int16Array,
 "Int32Array": Int32Array,
 "Uint8Array": Uint8Array,
 "Uint16Array": Uint16Array,
 "Uint32Array": Uint32Array,
 "Float32Array": Float32Array,
 "Float64Array": Float64Array,
 "NaN": NaN,
 "Infinity": Infinity
};
Module.asmLibraryArg = {
 "abort": abort,
 "assert": assert,
 "invoke_iiiiiiii": invoke_iiiiiiii,
 "invoke_iiii": invoke_iiii,
 "invoke_viiiii": invoke_viiiii,
 "invoke_iiiiiid": invoke_iiiiiid,
 "invoke_vi": invoke_vi,
 "invoke_vii": invoke_vii,
 "invoke_iiiiiii": invoke_iiiiiii,
 "invoke_iiiiid": invoke_iiiiid,
 "invoke_ii": invoke_ii,
 "invoke_viid": invoke_viid,
 "invoke_viii": invoke_viii,
 "invoke_v": invoke_v,
 "invoke_iiiiiiiii": invoke_iiiiiiiii,
 "invoke_iiiii": invoke_iiiii,
 "invoke_viiiiii": invoke_viiiiii,
 "invoke_iii": invoke_iii,
 "invoke_iiiiii": invoke_iiiiii,
 "invoke_viiii": invoke_viiii,
 "_fabs": _fabs,
 "_strftime": _strftime,
 "_pthread_cond_wait": _pthread_cond_wait,
 "_getchar": _getchar,
 "_send": _send,
 "_pthread_key_create": _pthread_key_create,
 "_fread": _fread,
 "___ctype_b_loc": ___ctype_b_loc,
 "___cxa_guard_acquire": ___cxa_guard_acquire,
 "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing,
 "_vfprintf": _vfprintf,
 "_ungetc": _ungetc,
 "___assert_fail": ___assert_fail,
 "___cxa_allocate_exception": ___cxa_allocate_exception,
 "___cxa_find_matching_catch": ___cxa_find_matching_catch,
 "___ctype_toupper_loc": ___ctype_toupper_loc,
 "_fflush": _fflush,
 "___cxa_guard_release": ___cxa_guard_release,
 "__addDays": __addDays,
 "_pwrite": _pwrite,
 "_strerror_r": _strerror_r,
 "_strftime_l": _strftime_l,
 "_pthread_mutex_lock": _pthread_mutex_lock,
 "___setErrNo": ___setErrNo,
 "_sbrk": _sbrk,
 "_uselocale": _uselocale,
 "_catgets": _catgets,
 "_newlocale": _newlocale,
 "___cxa_begin_catch": ___cxa_begin_catch,
 "_emscripten_memcpy_big": _emscripten_memcpy_big,
 "_fileno": _fileno,
 "___resumeException": ___resumeException,
 "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv,
 "_sysconf": _sysconf,
 "_pthread_getspecific": _pthread_getspecific,
 "_clock": _clock,
 "__arraySum": __arraySum,
 "_calloc": _calloc,
 "___ctype_tolower_loc": ___ctype_tolower_loc,
 "_pthread_mutex_unlock": _pthread_mutex_unlock,
 "_pthread_once": _pthread_once,
 "_pread": _pread,
 "_mkport": _mkport,
 "__reallyNegative": __reallyNegative,
 "_getc": _getc,
 "_write": _write,
 "__isLeapYear": __isLeapYear,
 "_emscripten_set_main_loop": _emscripten_set_main_loop,
 "___errno_location": ___errno_location,
 "_recv": _recv,
 "_pthread_setspecific": _pthread_setspecific,
 "___cxa_atexit": ___cxa_atexit,
 "_fgetc": _fgetc,
 "_fputc": _fputc,
 "___cxa_throw": ___cxa_throw,
 "_freelocale": _freelocale,
 "_pthread_cond_broadcast": _pthread_cond_broadcast,
 "_abort": _abort,
 "_catclose": _catclose,
 "_fwrite": _fwrite,
 "_time": _time,
 "_fprintf": _fprintf,
 "_strerror": _strerror,
 "_ceil": _ceil,
 "__formatString": __formatString,
 "_atexit": _atexit,
 "_catopen": _catopen,
 "_read": _read,
 "STACKTOP": STACKTOP,
 "STACK_MAX": STACK_MAX,
 "tempDoublePtr": tempDoublePtr,
 "ABORT": ABORT,
 "cttz_i8": cttz_i8,
 "___dso_handle": ___dso_handle,
 "_stderr": _stderr,
 "_stdin": _stdin,
 "_stdout": _stdout
};
// EMSCRIPTEN_START_ASM

var asm = (function(global,env,buffer) {

 "use asm";
 var a = new global.Int8Array(buffer);
 var b = new global.Int16Array(buffer);
 var c = new global.Int32Array(buffer);
 var d = new global.Uint8Array(buffer);
 var e = new global.Uint16Array(buffer);
 var f = new global.Uint32Array(buffer);
 var g = new global.Float32Array(buffer);
 var h = new global.Float64Array(buffer);
 var i = env.STACKTOP | 0;
 var j = env.STACK_MAX | 0;
 var k = env.tempDoublePtr | 0;
 var l = env.ABORT | 0;
 var m = env.cttz_i8 | 0;
 var n = env.___dso_handle | 0;
 var o = env._stderr | 0;
 var p = env._stdin | 0;
 var q = env._stdout | 0;
 var r = 0;
 var s = 0;
 var t = 0;
 var u = 0;
 var v = global.NaN, w = global.Infinity;
 var x = 0, y = 0, z = 0, A = 0, B = 0.0, C = 0, D = 0, E = 0, F = 0.0;
 var G = 0;
 var H = 0;
 var I = 0;
 var J = 0;
 var K = 0;
 var L = 0;
 var M = 0;
 var N = 0;
 var O = 0;
 var P = 0;
 var Q = global.Math.floor;
 var R = global.Math.abs;
 var S = global.Math.sqrt;
 var T = global.Math.pow;
 var U = global.Math.cos;
 var V = global.Math.sin;
 var W = global.Math.tan;
 var X = global.Math.acos;
 var Y = global.Math.asin;
 var Z = global.Math.atan;
 var _ = global.Math.atan2;
 var $ = global.Math.exp;
 var aa = global.Math.log;
 var ba = global.Math.ceil;
 var ca = global.Math.imul;
 var da = global.Math.min;
 var ea = global.Math.clz32;
 var fa = env.abort;
 var ga = env.assert;
 var ha = env.invoke_iiiiiiii;
 var ia = env.invoke_iiii;
 var ja = env.invoke_viiiii;
 var ka = env.invoke_iiiiiid;
 var la = env.invoke_vi;
 var ma = env.invoke_vii;
 var na = env.invoke_iiiiiii;
 var oa = env.invoke_iiiiid;
 var pa = env.invoke_ii;
 var qa = env.invoke_viid;
 var ra = env.invoke_viii;
 var sa = env.invoke_v;
 var ta = env.invoke_iiiiiiiii;
 var ua = env.invoke_iiiii;
 var va = env.invoke_viiiiii;
 var wa = env.invoke_iii;
 var xa = env.invoke_iiiiii;
 var ya = env.invoke_viiii;
 var za = env._fabs;
 var Aa = env._strftime;
 var Ba = env._pthread_cond_wait;
 var Ca = env._getchar;
 var Da = env._send;
 var Ea = env._pthread_key_create;
 var Fa = env._fread;
 var Ga = env.___ctype_b_loc;
 var Ha = env.___cxa_guard_acquire;
 var Ia = env._emscripten_set_main_loop_timing;
 var Ja = env._vfprintf;
 var Ka = env._ungetc;
 var La = env.___assert_fail;
 var Ma = env.___cxa_allocate_exception;
 var Na = env.___cxa_find_matching_catch;
 var Oa = env.___ctype_toupper_loc;
 var Pa = env._fflush;
 var Qa = env.___cxa_guard_release;
 var Ra = env.__addDays;
 var Sa = env._pwrite;
 var Ta = env._strerror_r;
 var Ua = env._strftime_l;
 var Va = env._pthread_mutex_lock;
 var Wa = env.___setErrNo;
 var Xa = env._sbrk;
 var Ya = env._uselocale;
 var Za = env._catgets;
 var _a = env._newlocale;
 var $a = env.___cxa_begin_catch;
 var ab = env._emscripten_memcpy_big;
 var bb = env._fileno;
 var cb = env.___resumeException;
 var db = env.__ZSt18uncaught_exceptionv;
 var eb = env._sysconf;
 var fb = env._pthread_getspecific;
 var gb = env._clock;
 var hb = env.__arraySum;
 var ib = env._calloc;
 var jb = env.___ctype_tolower_loc;
 var kb = env._pthread_mutex_unlock;
 var lb = env._pthread_once;
 var mb = env._pread;
 var nb = env._mkport;
 var ob = env.__reallyNegative;
 var pb = env._getc;
 var qb = env._write;
 var rb = env.__isLeapYear;
 var sb = env._emscripten_set_main_loop;
 var tb = env.___errno_location;
 var ub = env._recv;
 var vb = env._pthread_setspecific;
 var wb = env.___cxa_atexit;
 var xb = env._fgetc;
 var yb = env._fputc;
 var zb = env.___cxa_throw;
 var Ab = env._freelocale;
 var Bb = env._pthread_cond_broadcast;
 var Cb = env._abort;
 var Db = env._catclose;
 var Eb = env._fwrite;
 var Fb = env._time;
 var Gb = env._fprintf;
 var Hb = env._strerror;
 var Ib = env._ceil;
 var Jb = env.__formatString;
 var Kb = env._atexit;
 var Lb = env._catopen;
 var Mb = env._read;
 var Nb = 0.0;
 
// EMSCRIPTEN_START_FUNCS
function ec(e,f,g,j,l){e=e|0;f=f|0;g=g|0;j=j|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0.0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0.0,rb=0,sb=0,ub=0,vb=0,wb=0,xb=0,yb=0.0,zb=0.0,Ab=0.0,Bb=0.0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0.0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0.0,Ac=0.0,Bc=0.0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,_c=0,$c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0,id=0,jd=0,kd=0,ld=0,md=0,nd=0,od=0,pd=0,qd=0,rd=0,sd=0,td=0,ud=0,vd=0,wd=0,xd=0,yd=0,zd=0,Ad=0,Bd=0,Cd=0,Dd=0,Ed=0,Fd=0,Gd=0,Hd=0,Id=0,Jd=0,Kd=0,Ld=0;m=i;i=i+864|0;n=m+16|0;o=m+8|0;p=m+836|0;q=p;r=m+824|0;s=m+568|0;t=m+528|0;u=m;v=m+520|0;w=(e|0)!=0;x=t+40|0;y=x;z=t+39|0;t=u+4|0;A=u;B=r+12|0;C=r+11|0;r=B;D=r-q|0;E=-2-q|0;F=r+2|0;H=n+288|0;I=p+9|0;J=I;K=p+8|0;L=0;M=0;N=0;O=f;f=0;P=0;a:while(1){do if((N|0)>-1)if((f|0)>(2147483647-N|0)){c[(tb()|0)>>2]=75;Q=-1;break}else{Q=f+N|0;break}else Q=N;while(0);R=a[O>>0]|0;if(!(R<<24>>24)){S=Q;T=P;U=344;break}else{V=R;W=O}b:while(1){switch(V<<24>>24){case 37:{X=W;Y=W;U=9;break b;break}case 0:{Z=W;_=W;break b;break}default:{}}R=W+1|0;V=a[R>>0]|0;W=R}c:do if((U|0)==9)while(1){U=0;if((a[X+1>>0]|0)!=37){Z=X;_=Y;break c}R=Y+1|0;$=X+2|0;if((a[$>>0]|0)==37){X=$;Y=R;U=9}else{Z=$;_=R;break}}while(0);R=_-O|0;if(w)Re(O,R,e)|0;if((_|0)!=(O|0)){N=Q;O=Z;f=R;continue}$=Z+1|0;aa=a[$>>0]|0;ba=(aa<<24>>24)+-48|0;if(ba>>>0<10){da=(a[Z+2>>0]|0)==36;ea=da?Z+3|0:$;fa=a[ea>>0]|0;ga=da?ba:-1;ha=da?1:P;ia=ea}else{fa=aa;ga=-1;ha=P;ia=$}$=fa<<24>>24;d:do if(($&-32|0)==32){aa=$;ea=fa;da=0;ba=ia;while(1){if(!(1<<aa+-32&75913)){ja=ea;ka=da;la=ba;break d}ma=1<<(ea<<24>>24)+-32|da;na=ba+1|0;oa=a[na>>0]|0;aa=oa<<24>>24;if((aa&-32|0)!=32){ja=oa;ka=ma;la=na;break}else{ea=oa;da=ma;ba=na}}}else{ja=fa;ka=0;la=ia}while(0);do if(ja<<24>>24==42){$=la+1|0;ba=(a[$>>0]|0)+-48|0;if(ba>>>0<10?(a[la+2>>0]|0)==36:0){c[l+(ba<<2)>>2]=10;pa=1;qa=la+3|0;ra=c[j+((a[$>>0]|0)+-48<<3)>>2]|0}else{if(ha){sa=-1;U=363;break a}if(!w){ta=ka;ua=$;va=0;wa=0;break}ba=(c[g>>2]|0)+(4-1)&~(4-1);da=c[ba>>2]|0;c[g>>2]=ba+4;pa=0;qa=$;ra=da}if((ra|0)<0){ta=ka|8192;ua=qa;va=pa;wa=0-ra|0}else{ta=ka;ua=qa;va=pa;wa=ra}}else{da=(ja<<24>>24)+-48|0;if(da>>>0<10){$=la;ba=0;ea=da;while(1){da=(ba*10|0)+ea|0;aa=$+1|0;ea=(a[aa>>0]|0)+-48|0;if(ea>>>0>=10){xa=da;ya=aa;break}else{$=aa;ba=da}}if((xa|0)<0){sa=-1;U=363;break a}else{ta=ka;ua=ya;va=ha;wa=xa}}else{ta=ka;ua=la;va=ha;wa=0}}while(0);e:do if((a[ua>>0]|0)==46){ba=ua+1|0;$=a[ba>>0]|0;if($<<24>>24!=42){ea=($<<24>>24)+-48|0;if(ea>>>0<10){za=ba;Aa=0;Ba=ea}else{Ca=ba;Da=0;break}while(1){ba=(Aa*10|0)+Ba|0;ea=za+1|0;Ba=(a[ea>>0]|0)+-48|0;if(Ba>>>0>=10){Ca=ea;Da=ba;break e}else{za=ea;Aa=ba}}}ba=ua+2|0;ea=(a[ba>>0]|0)+-48|0;if(ea>>>0<10?(a[ua+3>>0]|0)==36:0){c[l+(ea<<2)>>2]=10;Ca=ua+4|0;Da=c[j+((a[ba>>0]|0)+-48<<3)>>2]|0;break}if(va){sa=-1;U=363;break a}if(w){ea=(c[g>>2]|0)+(4-1)&~(4-1);$=c[ea>>2]|0;c[g>>2]=ea+4;Ca=ba;Da=$}else{Ca=ba;Da=0}}else{Ca=ua;Da=-1}while(0);ba=Ca;$=0;while(1){ea=(a[ba>>0]|0)+-65|0;if(ea>>>0>57){sa=-1;U=363;break a}da=ba+1|0;aa=a[11132+($*58|0)+ea>>0]|0;ea=aa&255;if((ea+-1|0)>>>0<8){ba=da;$=ea}else{Ea=da;Fa=aa;Ga=ea;Ha=ba;Ia=$;break}}if(!(Fa<<24>>24)){sa=-1;U=363;break}$=(ga|0)>-1;f:do if(Fa<<24>>24==19)if($){sa=-1;U=363;break a}else{Ja=L;Ka=M;U=62}else{if($){c[l+(ga<<2)>>2]=Ga;ba=j+(ga<<3)|0;Ja=c[ba+4>>2]|0;Ka=c[ba>>2]|0;U=62;break}if(!w){sa=0;U=363;break a}if((Fa&255)>20){La=M;Ma=L}else do switch(Ga|0){case 9:{ba=(c[g>>2]|0)+(4-1)&~(4-1);ea=c[ba>>2]|0;c[g>>2]=ba+4;La=ea;Ma=L;break f;break}case 10:{ea=(c[g>>2]|0)+(4-1)&~(4-1);ba=c[ea>>2]|0;c[g>>2]=ea+4;La=ba;Ma=((ba|0)<0)<<31>>31;break f;break}case 11:{ba=(c[g>>2]|0)+(4-1)&~(4-1);ea=c[ba>>2]|0;c[g>>2]=ba+4;La=ea;Ma=0;break f;break}case 12:{ea=(c[g>>2]|0)+(8-1)&~(8-1);ba=ea;aa=c[ba>>2]|0;da=c[ba+4>>2]|0;c[g>>2]=ea+8;La=aa;Ma=da;break f;break}case 13:{da=(c[g>>2]|0)+(4-1)&~(4-1);aa=c[da>>2]|0;c[g>>2]=da+4;La=aa<<16>>16;Ma=(((aa&65535)<<16>>16|0)<0)<<31>>31;break f;break}case 14:{aa=(c[g>>2]|0)+(4-1)&~(4-1);da=c[aa>>2]|0;c[g>>2]=aa+4;La=da&65535;Ma=0;break f;break}case 15:{da=(c[g>>2]|0)+(4-1)&~(4-1);aa=c[da>>2]|0;c[g>>2]=da+4;La=aa<<24>>24;Ma=(((aa&255)<<24>>24|0)<0)<<31>>31;break f;break}case 16:{aa=(c[g>>2]|0)+(4-1)&~(4-1);da=c[aa>>2]|0;c[g>>2]=aa+4;La=da&255;Ma=0;break f;break}case 17:{da=(c[g>>2]|0)+(8-1)&~(8-1);Na=+h[da>>3];c[g>>2]=da+8;h[k>>3]=Na;La=c[k>>2]|0;Ma=c[k+4>>2]|0;break f;break}case 18:{da=(c[g>>2]|0)+(8-1)&~(8-1);Na=+h[da>>3];c[g>>2]=da+8;h[k>>3]=Na;La=c[k>>2]|0;Ma=c[k+4>>2]|0;break f;break}default:{La=M;Ma=L;break f}}while(0)}while(0);if((U|0)==62){U=0;if(w){La=Ka;Ma=Ja}else{L=Ja;M=Ka;N=Q;O=Ea;f=R;P=va;continue}}$=a[Ha>>0]|0;da=(Ia|0)!=0&($&15|0)==3?$&-33:$;$=ta&-65537;aa=(ta&8192|0)==0?ta:$;g:do switch(da|0){case 110:{switch(Ia|0){case 0:{c[La>>2]=Q;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}case 1:{c[La>>2]=Q;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}case 2:{ea=La;c[ea>>2]=Q;c[ea+4>>2]=((Q|0)<0)<<31>>31;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}case 3:{b[La>>1]=Q;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}case 4:{a[La>>0]=Q;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}case 6:{c[La>>2]=Q;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}case 7:{ea=La;c[ea>>2]=Q;c[ea+4>>2]=((Q|0)<0)<<31>>31;L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a;break}default:{L=Ma;M=La;N=Q;O=Ea;f=R;P=va;continue a}}break}case 112:{Oa=aa|8;Pa=Da>>>0>8?Da:8;Qa=120;U=73;break}case 88:case 120:{Oa=aa;Pa=Da;Qa=da;U=73;break}case 111:{ea=(La|0)==0&(Ma|0)==0;if(ea)Ra=x;else{ba=x;na=La;ma=Ma;while(1){oa=ba+-1|0;a[oa>>0]=na&7|48;na=ek(na|0,ma|0,3)|0;ma=G;if((na|0)==0&(ma|0)==0){Ra=oa;break}else ba=oa}}ba=(aa&8|0)==0|ea;Sa=La;Ta=Ma;Ua=Ra;Va=aa;Wa=Da;Xa=ba&1^1;Ya=ba?11612:11617;U=89;break}case 105:case 100:{if((Ma|0)<0){ba=Oj(0,0,La|0,Ma|0)|0;Za=G;_a=ba;$a=1;ab=11612;U=84;break g}if(!(aa&2048)){ba=aa&1;Za=Ma;_a=La;$a=ba;ab=(ba|0)==0?11612:11614;U=84}else{Za=Ma;_a=La;$a=1;ab=11613;U=84}break}case 117:{Za=Ma;_a=La;$a=0;ab=11612;U=84;break}case 99:{a[z>>0]=La;bb=Ma;cb=La;db=z;eb=$;fb=1;gb=0;hb=11612;ib=x;break}case 109:{jb=Hb(c[(tb()|0)>>2]|0)|0;U=94;break}case 115:{jb=(La|0)!=0?La:11622;U=94;break}case 67:{c[u>>2]=La;c[t>>2]=0;kb=u;lb=A;mb=-1;U=97;break}case 83:{ba=La;if(!Da){nb=La;ob=ba;pb=0;U=102}else{kb=ba;lb=La;mb=Da;U=97}break}case 65:case 71:case 70:case 69:case 97:case 103:case 102:case 101:{c[k>>2]=La;c[k+4>>2]=Ma;Na=+h[k>>3];c[o>>2]=0;if((Ma|0)>=0)if(!(aa&2048)){ba=aa&1;qb=Na;rb=ba;sb=(ba|0)==0?11630:11635}else{qb=Na;rb=1;sb=11632}else{qb=-Na;rb=1;sb=11629}h[k>>3]=qb;ba=c[k+4>>2]&2146435072;do if(ba>>>0<2146435072|(ba|0)==2146435072&0<0){Na=+Ko(qb,o)*2.0;ma=Na!=0.0;if(ma)c[o>>2]=(c[o>>2]|0)+-1;na=da|32;if((na|0)==97){oa=da&32;ub=(oa|0)==0?sb:sb+9|0;vb=rb|2;wb=12-Da|0;do if(!(Da>>>0>11|(wb|0)==0)){xb=wb;yb=8.0;while(1){xb=xb+-1|0;zb=yb*16.0;if(!xb){Ab=zb;break}else yb=zb}if((a[ub>>0]|0)==45){Bb=-(Ab+(-Na-Ab));break}else{Bb=Na+Ab-Ab;break}}else Bb=Na;while(0);wb=c[o>>2]|0;xb=(wb|0)<0?0-wb|0:wb;if((xb|0)<0){wb=B;Cb=xb;Db=((xb|0)<0)<<31>>31;while(1){Eb=ij(Cb|0,Db|0,10,0)|0;Fb=wb+-1|0;a[Fb>>0]=Eb|48;Eb=sm(Cb|0,Db|0,10,0)|0;if(Db>>>0>9|(Db|0)==9&Cb>>>0>4294967295){wb=Fb;Cb=Eb;Db=G}else{Gb=Fb;Ib=Eb;break}}Jb=Gb;Kb=Ib}else{Jb=B;Kb=xb}if(!Kb)Lb=Jb;else{Db=Jb;Cb=Kb;while(1){wb=Db+-1|0;a[wb>>0]=(Cb>>>0)%10|0|48;if(Cb>>>0<10){Lb=wb;break}else{Db=wb;Cb=(Cb>>>0)/10|0}}}if((Lb|0)==(B|0)){a[C>>0]=48;Mb=C}else Mb=Lb;a[Mb+-1>>0]=(c[o>>2]>>31&2)+43;Cb=Mb+-2|0;a[Cb>>0]=da+15;if(!(aa&8))if((Da|0)<1){yb=Bb;Db=p;while(1){xb=~~yb;wb=Db+1|0;a[Db>>0]=d[11596+xb>>0]|oa;yb=(yb-+(xb|0))*16.0;if((wb-q|0)!=1|yb==0.0)Nb=wb;else{a[wb>>0]=46;Nb=Db+2|0}if(!(yb!=0.0)){Ob=Nb;break}else Db=Nb}}else{yb=Bb;Db=p;while(1){wb=~~yb;xb=Db+1|0;a[Db>>0]=d[11596+wb>>0]|oa;yb=(yb-+(wb|0))*16.0;if((xb-q|0)==1){a[xb>>0]=46;Pb=Db+2|0}else Pb=xb;if(!(yb!=0.0)){Ob=Pb;break}else Db=Pb}}else{yb=Bb;Db=p;while(1){xb=~~yb;wb=Db+1|0;a[Db>>0]=d[11596+xb>>0]|oa;yb=(yb-+(xb|0))*16.0;if((wb-q|0)==1){a[wb>>0]=46;Qb=Db+2|0}else Qb=wb;if(!(yb!=0.0)){Ob=Qb;break}else Db=Qb}}Db=Ob;oa=(Da|0)!=0&(E+Db|0)<(Da|0)?F+Da-Cb|0:D-Cb+Db|0;wb=oa+vb|0;xb=aa&73728;Eb=(wa|0)>(wb|0);if((xb|0)==0&Eb){Fb=wa-wb|0;Mh(s|0,32,(Fb>>>0>256?256:Fb)|0)|0;if(Fb>>>0>255){Rb=Fb;do{Re(s,256,e)|0;Rb=Rb+-256|0}while(Rb>>>0>255);Sb=Fb&255}else Sb=Fb;Re(s,Sb,e)|0}Re(ub,vb,e)|0;if((xb|0)==65536&Eb){Rb=wa-wb|0;Mh(s|0,48,(Rb>>>0>256?256:Rb)|0)|0;if(Rb>>>0>255){Tb=Rb;do{Re(s,256,e)|0;Tb=Tb+-256|0}while(Tb>>>0>255);Ub=Rb&255}else Ub=Rb;Re(s,Ub,e)|0}Tb=Db-q|0;Re(p,Tb,e)|0;vb=r-Cb|0;ub=oa-vb-Tb|0;if((ub|0)>0){Mh(s|0,48,(ub>>>0>256?256:ub)|0)|0;if(ub>>>0>255){Tb=ub;do{Re(s,256,e)|0;Tb=Tb+-256|0}while(Tb>>>0>255);Vb=ub&255}else Vb=ub;Re(s,Vb,e)|0}Re(Cb,vb,e)|0;if((xb|0)==8192&Eb){Tb=wa-wb|0;Mh(s|0,32,(Tb>>>0>256?256:Tb)|0)|0;if(Tb>>>0>255){oa=Tb;do{Re(s,256,e)|0;oa=oa+-256|0}while(oa>>>0>255);Wb=Tb&255}else Wb=Tb;Re(s,Wb,e)|0}Xb=Eb?wa:wb;break}oa=(Da|0)<0?6:Da;if(ma){xb=(c[o>>2]|0)+-28|0;c[o>>2]=xb;Yb=Na*268435456.0;Zb=xb}else{Yb=Na;Zb=c[o>>2]|0}xb=(Zb|0)<0?n:H;vb=xb;yb=Yb;Cb=xb;while(1){ub=~~yb>>>0;c[Cb>>2]=ub;Db=Cb+4|0;yb=(yb-+(ub>>>0))*1.0e9;if(!(yb!=0.0)){_b=Db;break}else Cb=Db}Cb=c[o>>2]|0;if((Cb|0)>0){ma=Cb;wb=xb;Eb=_b;while(1){Tb=(ma|0)>29?29:ma;Db=Eb+-4|0;do if(Db>>>0<wb>>>0)$b=wb;else{ub=0;Rb=Db;while(1){Fb=ck(c[Rb>>2]|0,0,Tb|0)|0;ac=Ok(Fb|0,G|0,ub|0,0)|0;Fb=G;bc=ij(ac|0,Fb|0,1e9,0)|0;c[Rb>>2]=bc;bc=sm(ac|0,Fb|0,1e9,0)|0;Rb=Rb+-4|0;if(Rb>>>0<wb>>>0){cc=bc;break}else ub=bc}if(!cc){$b=wb;break}ub=wb+-4|0;c[ub>>2]=cc;$b=ub}while(0);Db=Eb;while(1){if(Db>>>0<=$b>>>0){dc=Db;break}ub=Db+-4|0;if(!(c[ub>>2]|0))Db=ub;else{dc=Db;break}}Db=(c[o>>2]|0)-Tb|0;c[o>>2]=Db;if((Db|0)>0){ma=Db;wb=$b;Eb=dc}else{ec=Db;fc=$b;gc=dc;break}}}else{ec=Cb;fc=xb;gc=_b}h:do if((ec|0)<0){Eb=((oa+25|0)/9|0)+1|0;if((na|0)!=102){wb=ec;ma=fc;Db=gc;while(1){ub=0-wb|0;Rb=(ub|0)>9?9:ub;do if(ma>>>0<Db>>>0){ub=(1<<Rb)+-1|0;bc=1e9>>>Rb;Fb=0;ac=ma;while(1){hc=c[ac>>2]|0;c[ac>>2]=(hc>>>Rb)+Fb;ic=ca(hc&ub,bc)|0;ac=ac+4|0;if(ac>>>0>=Db>>>0){jc=ic;break}else Fb=ic}Fb=(c[ma>>2]|0)==0?ma+4|0:ma;if(!jc){kc=Fb;lc=Db;break}c[Db>>2]=jc;kc=Fb;lc=Db+4|0}else{kc=(c[ma>>2]|0)==0?ma+4|0:ma;lc=Db}while(0);Fb=(lc-kc>>2|0)>(Eb|0)?kc+(Eb<<2)|0:lc;wb=(c[o>>2]|0)+Rb|0;c[o>>2]=wb;if((wb|0)>=0){mc=kc;nc=Fb;break h}else{ma=kc;Db=Fb}}}Db=xb+(Eb<<2)|0;ma=ec;wb=fc;Tb=gc;while(1){Fb=0-ma|0;ac=(Fb|0)>9?9:Fb;do if(wb>>>0<Tb>>>0){Fb=(1<<ac)+-1|0;bc=1e9>>>ac;ub=0;ic=wb;while(1){hc=c[ic>>2]|0;c[ic>>2]=(hc>>>ac)+ub;oc=ca(hc&Fb,bc)|0;ic=ic+4|0;if(ic>>>0>=Tb>>>0){pc=oc;break}else ub=oc}ub=(c[wb>>2]|0)==0?wb+4|0:wb;if(!pc){qc=ub;rc=Tb;break}c[Tb>>2]=pc;qc=ub;rc=Tb+4|0}else{qc=(c[wb>>2]|0)==0?wb+4|0:wb;rc=Tb}while(0);Rb=(rc-vb>>2|0)>(Eb|0)?Db:rc;ma=(c[o>>2]|0)+ac|0;c[o>>2]=ma;if((ma|0)>=0){mc=qc;nc=Rb;break}else{wb=qc;Tb=Rb}}}else{mc=fc;nc=gc}while(0);do if(mc>>>0<nc>>>0){Cb=(vb-mc>>2)*9|0;Tb=c[mc>>2]|0;if(Tb>>>0<10){sc=Cb;break}else{tc=Cb;uc=10}while(1){uc=uc*10|0;Cb=tc+1|0;if(Tb>>>0<uc>>>0){sc=Cb;break}else tc=Cb}}else sc=0;while(0);Tb=(na|0)==103;Cb=(oa|0)!=0;wb=oa-((na|0)!=102?sc:0)+((Cb&Tb)<<31>>31)|0;if((wb|0)<(((nc-vb>>2)*9|0)+-9|0)){ma=wb+9216|0;wb=(ma|0)/9|0;Db=xb+(wb+-1023<<2)|0;Eb=((ma|0)%9|0)+1|0;if((Eb|0)<9){ma=10;Rb=Eb;while(1){Eb=ma*10|0;Rb=Rb+1|0;if((Rb|0)==9){vc=Eb;break}else ma=Eb}}else vc=10;ma=c[Db>>2]|0;Rb=(ma>>>0)%(vc>>>0)|0;if((Rb|0)==0?(xb+(wb+-1022<<2)|0)==(nc|0):0){wc=mc;xc=Db;yc=sc}else U=221;do if((U|0)==221){U=0;yb=(((ma>>>0)/(vc>>>0)|0)&1|0)==0?9007199254740992.0:9007199254740994.0;na=(vc|0)/2|0;do if(Rb>>>0<na>>>0)zc=.5;else{if((Rb|0)==(na|0)?(xb+(wb+-1022<<2)|0)==(nc|0):0){zc=1.0;break}zc=1.5}while(0);do if(!rb){Ac=yb;Bc=zc}else{if((a[sb>>0]|0)!=45){Ac=yb;Bc=zc;break}Ac=-yb;Bc=-zc}while(0);na=ma-Rb|0;c[Db>>2]=na;if(!(Ac+Bc!=Ac)){wc=mc;xc=Db;yc=sc;break}Eb=na+vc|0;c[Db>>2]=Eb;if(Eb>>>0>999999999){Eb=mc;na=Db;while(1){ub=na+-4|0;c[na>>2]=0;if(ub>>>0<Eb>>>0){ic=Eb+-4|0;c[ic>>2]=0;Cc=ic}else Cc=Eb;ic=(c[ub>>2]|0)+1|0;c[ub>>2]=ic;if(ic>>>0>999999999){Eb=Cc;na=ub}else{Dc=Cc;Ec=ub;break}}}else{Dc=mc;Ec=Db}na=(vb-Dc>>2)*9|0;Eb=c[Dc>>2]|0;if(Eb>>>0<10){wc=Dc;xc=Ec;yc=na;break}else{Fc=na;Gc=10}while(1){Gc=Gc*10|0;na=Fc+1|0;if(Eb>>>0<Gc>>>0){wc=Dc;xc=Ec;yc=na;break}else Fc=na}}while(0);Db=xc+4|0;Hc=wc;Ic=yc;Jc=nc>>>0>Db>>>0?Db:nc}else{Hc=mc;Ic=sc;Jc=nc}Db=0-Ic|0;Rb=Jc;while(1){if(Rb>>>0<=Hc>>>0){Kc=0;Lc=Rb;break}ma=Rb+-4|0;if(!(c[ma>>2]|0))Rb=ma;else{Kc=1;Lc=Rb;break}}do if(Tb){Rb=(Cb&1^1)+oa|0;if((Rb|0)>(Ic|0)&(Ic|0)>-5){Mc=da+-1|0;Nc=Rb+-1-Ic|0}else{Mc=da+-2|0;Nc=Rb+-1|0}Rb=aa&8;if(Rb){Oc=Mc;Pc=Nc;Qc=Rb;break}do if(Kc){Rb=c[Lc+-4>>2]|0;if(!Rb){Rc=9;break}if(!((Rb>>>0)%10|0)){Sc=10;Tc=0}else{Rc=0;break}while(1){Sc=Sc*10|0;ma=Tc+1|0;if((Rb>>>0)%(Sc>>>0)|0){Rc=ma;break}else Tc=ma}}else Rc=9;while(0);Rb=((Lc-vb>>2)*9|0)+-9|0;if((Mc|32|0)==102){ac=Rb-Rc|0;ma=(ac|0)<0?0:ac;Oc=Mc;Pc=(Nc|0)<(ma|0)?Nc:ma;Qc=0;break}else{ma=Rb+Ic-Rc|0;Rb=(ma|0)<0?0:ma;Oc=Mc;Pc=(Nc|0)<(Rb|0)?Nc:Rb;Qc=0;break}}else{Oc=da;Pc=oa;Qc=aa&8}while(0);oa=Pc|Qc;vb=(oa|0)!=0&1;Cb=(Oc|32|0)==102;if(Cb){Uc=(Ic|0)>0?Ic:0;Vc=0}else{Tb=(Ic|0)<0?Db:Ic;if((Tb|0)<0){Rb=B;ma=Tb;ac=((Tb|0)<0)<<31>>31;while(1){wb=ij(ma|0,ac|0,10,0)|0;Eb=Rb+-1|0;a[Eb>>0]=wb|48;wb=sm(ma|0,ac|0,10,0)|0;if(ac>>>0>9|(ac|0)==9&ma>>>0>4294967295){Rb=Eb;ma=wb;ac=G}else{Wc=Eb;Xc=wb;break}}Yc=Wc;Zc=Xc}else{Yc=B;Zc=Tb}if(!Zc)_c=Yc;else{ac=Yc;ma=Zc;while(1){Rb=ac+-1|0;a[Rb>>0]=(ma>>>0)%10|0|48;if(ma>>>0<10){_c=Rb;break}else{ac=Rb;ma=(ma>>>0)/10|0}}}if((r-_c|0)<2){ma=_c;while(1){ac=ma+-1|0;a[ac>>0]=48;if((r-ac|0)<2)ma=ac;else{$c=ac;break}}}else $c=_c;a[$c+-1>>0]=(Ic>>31&2)+43;ma=$c+-2|0;a[ma>>0]=Oc;Uc=r-ma|0;Vc=ma}ma=rb+1+Pc+vb+Uc|0;ac=aa&73728;Tb=(wa|0)>(ma|0);if((ac|0)==0&Tb){Rb=wa-ma|0;Mh(s|0,32,(Rb>>>0>256?256:Rb)|0)|0;if(Rb>>>0>255){Db=Rb;do{Re(s,256,e)|0;Db=Db+-256|0}while(Db>>>0>255);ad=Rb&255}else ad=Rb;Re(s,ad,e)|0}Re(sb,rb,e)|0;if((ac|0)==65536&Tb){Db=wa-ma|0;Mh(s|0,48,(Db>>>0>256?256:Db)|0)|0;if(Db>>>0>255){vb=Db;do{Re(s,256,e)|0;vb=vb+-256|0}while(vb>>>0>255);bd=Db&255}else bd=Db;Re(s,bd,e)|0}if(Cb){vb=Hc>>>0>xb>>>0?xb:Hc;Rb=vb;while(1){wb=c[Rb>>2]|0;if(!wb)cd=I;else{Eb=I;na=wb;while(1){wb=Eb+-1|0;a[wb>>0]=(na>>>0)%10|0|48;if(na>>>0<10){cd=wb;break}else{Eb=wb;na=(na>>>0)/10|0}}}do if((Rb|0)==(vb|0)){if((cd|0)!=(I|0)){dd=cd;break}a[K>>0]=48;dd=K}else{if(cd>>>0>p>>>0)ed=cd;else{dd=cd;break}while(1){na=ed+-1|0;a[na>>0]=48;if(na>>>0>p>>>0)ed=na;else{dd=na;break}}}while(0);Re(dd,J-dd|0,e)|0;na=Rb+4|0;if(na>>>0>xb>>>0){fd=na;break}else Rb=na}if(oa)Re(11664,1,e)|0;if((Pc|0)>0&fd>>>0<Lc>>>0){Rb=Pc;xb=fd;while(1){vb=c[xb>>2]|0;if(vb){Cb=I;Db=vb;while(1){vb=Cb+-1|0;a[vb>>0]=(Db>>>0)%10|0|48;if(Db>>>0<10){gd=vb;break}else{Cb=vb;Db=(Db>>>0)/10|0}}if(gd>>>0>p>>>0){hd=gd;U=289}else id=gd}else{hd=I;U=289}if((U|0)==289)while(1){U=0;Db=hd+-1|0;a[Db>>0]=48;if(Db>>>0>p>>>0){hd=Db;U=289}else{id=Db;break}}Db=(Rb|0)>9;Re(id,Db?9:Rb,e)|0;xb=xb+4|0;Cb=Rb+-9|0;if(!(Db&xb>>>0<Lc>>>0)){jd=Cb;break}else Rb=Cb}}else jd=Pc;if((jd|0)>0){Mh(s|0,48,(jd>>>0>256?256:jd)|0)|0;if(jd>>>0>255){Rb=jd;do{Re(s,256,e)|0;Rb=Rb+-256|0}while(Rb>>>0>255);kd=jd&255}else kd=jd;Re(s,kd,e)|0}}else{Rb=Kc?Lc:Hc+4|0;do if((Pc|0)>-1){xb=(Qc|0)==0;oa=Pc;Cb=Hc;while(1){Db=c[Cb>>2]|0;if(Db){vb=I;na=Db;while(1){Db=vb+-1|0;a[Db>>0]=(na>>>0)%10|0|48;if(na>>>0<10){ld=vb;md=Db;break}else{vb=Db;na=(na>>>0)/10|0}}if((md|0)!=(I|0)){nd=ld;od=md}else U=303}else U=303;if((U|0)==303){U=0;a[K>>0]=48;nd=I;od=K}do if((Cb|0)==(Hc|0)){Re(od,1,e)|0;if(xb&(oa|0)<1){pd=nd;break}Re(11664,1,e)|0;pd=nd}else{if(od>>>0>p>>>0)qd=od;else{pd=od;break}while(1){na=qd+-1|0;a[na>>0]=48;if(na>>>0>p>>>0)qd=na;else{pd=na;break}}}while(0);na=J-pd|0;Re(pd,(oa|0)>(na|0)?na:oa,e)|0;vb=oa-na|0;Cb=Cb+4|0;if(!(Cb>>>0<Rb>>>0&(vb|0)>-1)){rd=vb;break}else oa=vb}if((rd|0)<=0)break;Mh(s|0,48,(rd>>>0>256?256:rd)|0)|0;if(rd>>>0>255){oa=rd;do{Re(s,256,e)|0;oa=oa+-256|0}while(oa>>>0>255);sd=rd&255}else sd=rd;Re(s,sd,e)|0}while(0);Re(Vc,r-Vc|0,e)|0}if((ac|0)==8192&Tb){Rb=wa-ma|0;Mh(s|0,32,(Rb>>>0>256?256:Rb)|0)|0;if(Rb>>>0>255){oa=Rb;do{Re(s,256,e)|0;oa=oa+-256|0}while(oa>>>0>255);td=Rb&255}else td=Rb;Re(s,td,e)|0}Xb=Tb?wa:ma}else{oa=(da&32|0)!=0;ac=qb!=qb|0.0!=0.0;Cb=ac?0:rb;xb=ac?(oa?11656:11660):oa?11648:11652;oa=Cb+3|0;ac=(wa|0)>(oa|0);if((aa&8192|0)==0&ac){vb=wa-oa|0;Mh(s|0,32,(vb>>>0>256?256:vb)|0)|0;if(vb>>>0>255){na=vb;do{Re(s,256,e)|0;na=na+-256|0}while(na>>>0>255);ud=vb&255}else ud=vb;Re(s,ud,e)|0}Re(sb,Cb,e)|0;Re(xb,3,e)|0;if((aa&73728|0)==8192&ac){na=wa-oa|0;Mh(s|0,32,(na>>>0>256?256:na)|0)|0;if(na>>>0>255){ma=na;do{Re(s,256,e)|0;ma=ma+-256|0}while(ma>>>0>255);vd=na&255}else vd=na;Re(s,vd,e)|0}Xb=ac?wa:oa}while(0);L=Ma;M=La;N=Q;O=Ea;f=Xb;P=va;continue a;break}default:{bb=Ma;cb=La;db=O;eb=aa;fb=Da;gb=0;hb=11612;ib=x}}while(0);if((U|0)==73){U=0;da=Qa&32;if(!((La|0)==0&(Ma|0)==0)){R=x;ba=La;ea=Ma;while(1){ma=R+-1|0;a[ma>>0]=d[11596+(ba&15)>>0]|da;ba=ek(ba|0,ea|0,4)|0;ea=G;if((ba|0)==0&(ea|0)==0){wd=ma;break}else R=ma}if(!(Oa&8)){Sa=La;Ta=Ma;Ua=wd;Va=Oa;Wa=Pa;Xa=0;Ya=11612;U=89}else{Sa=La;Ta=Ma;Ua=wd;Va=Oa;Wa=Pa;Xa=2;Ya=11612+(Qa>>4)|0;U=89}}else{Sa=La;Ta=Ma;Ua=x;Va=Oa;Wa=Pa;Xa=0;Ya=11612;U=89}}else if((U|0)==84){U=0;if(Za>>>0>0|(Za|0)==0&_a>>>0>4294967295){R=x;ea=_a;ba=Za;while(1){da=ij(ea|0,ba|0,10,0)|0;ma=R+-1|0;a[ma>>0]=da|48;da=sm(ea|0,ba|0,10,0)|0;if(ba>>>0>9|(ba|0)==9&ea>>>0>4294967295){R=ma;ea=da;ba=G}else{xd=ma;yd=da;break}}zd=xd;Ad=yd}else{zd=x;Ad=_a}if(!Ad){Sa=_a;Ta=Za;Ua=zd;Va=aa;Wa=Da;Xa=$a;Ya=ab;U=89}else{ba=zd;ea=Ad;while(1){R=ba+-1|0;a[R>>0]=(ea>>>0)%10|0|48;if(ea>>>0<10){Sa=_a;Ta=Za;Ua=R;Va=aa;Wa=Da;Xa=$a;Ya=ab;U=89;break}else{ba=R;ea=(ea>>>0)/10|0}}}}else if((U|0)==94){U=0;ea=Wd(jb,0,Da)|0;ba=(ea|0)==0;bb=Ma;cb=La;db=jb;eb=$;fb=ba?Da:ea-jb|0;gb=0;hb=11612;ib=ba?jb+Da|0:ea}else if((U|0)==97){U=0;ea=0;ba=0;R=kb;while(1){da=c[R>>2]|0;if(!da){Bd=ea;Cd=ba;break}ma=Pl(v,da)|0;if((ma|0)<0|ma>>>0>(mb-ea|0)>>>0){Bd=ea;Cd=ma;break}da=ma+ea|0;if(mb>>>0>da>>>0){ea=da;ba=ma;R=R+4|0}else{Bd=da;Cd=ma;break}}if((Cd|0)<0){sa=-1;U=363;break}else{nb=lb;ob=kb;pb=Bd;U=102}}if((U|0)==89){U=0;R=(Wa|0)>-1?Va&-65537:Va;ba=(Sa|0)!=0|(Ta|0)!=0;if(ba|(Wa|0)!=0){ea=(ba&1^1)+(y-Ua)|0;bb=Ta;cb=Sa;db=Ua;eb=R;fb=(Wa|0)>(ea|0)?Wa:ea;gb=Xa;hb=Ya;ib=x}else{bb=Ta;cb=Sa;db=x;eb=R;fb=0;gb=Xa;hb=Ya;ib=x}}else if((U|0)==102){U=0;R=aa&73728;ea=(wa|0)>(pb|0);if((R|0)==0&ea){ba=wa-pb|0;Mh(s|0,32,(ba>>>0>256?256:ba)|0)|0;if(ba>>>0>255){$=ba;do{Re(s,256,e)|0;$=$+-256|0}while($>>>0>255);Dd=ba&255}else Dd=ba;Re(s,Dd,e)|0}i:do if(pb){$=0;aa=ob;while(1){ma=c[aa>>2]|0;if(!ma)break i;da=Pl(v,ma)|0;$=da+$|0;if(($|0)>(pb|0))break i;Re(v,da,e)|0;if($>>>0>=pb>>>0)break;else aa=aa+4|0}}while(0);if((R|0)==8192&ea){ba=wa-pb|0;Mh(s|0,32,(ba>>>0>256?256:ba)|0)|0;if(ba>>>0>255){aa=ba;do{Re(s,256,e)|0;aa=aa+-256|0}while(aa>>>0>255);Ed=ba&255}else Ed=ba;Re(s,Ed,e)|0}L=Ma;M=nb;N=Q;O=Ea;f=ea?wa:pb;P=va;continue}aa=ib-db|0;R=(fb|0)<(aa|0)?aa:fb;$=gb+R|0;da=(wa|0)<($|0)?$:wa;ma=eb&73728;xb=(da|0)>($|0);if((ma|0)==0&xb){Cb=da-$|0;Mh(s|0,32,(Cb>>>0>256?256:Cb)|0)|0;if(Cb>>>0>255){vb=Cb;do{Re(s,256,e)|0;vb=vb+-256|0}while(vb>>>0>255);Fd=Cb&255}else Fd=Cb;Re(s,Fd,e)|0}Re(hb,gb,e)|0;if((ma|0)==65536&xb){vb=da-$|0;Mh(s|0,48,(vb>>>0>256?256:vb)|0)|0;if(vb>>>0>255){ea=vb;do{Re(s,256,e)|0;ea=ea+-256|0}while(ea>>>0>255);Gd=vb&255}else Gd=vb;Re(s,Gd,e)|0}if((R|0)>(aa|0)){ea=R-aa|0;Mh(s|0,48,(ea>>>0>256?256:ea)|0)|0;if(ea>>>0>255){Cb=ea;do{Re(s,256,e)|0;Cb=Cb+-256|0}while(Cb>>>0>255);Hd=ea&255}else Hd=ea;Re(s,Hd,e)|0}Re(db,aa,e)|0;if((ma|0)==8192&xb){Cb=da-$|0;Mh(s|0,32,(Cb>>>0>256?256:Cb)|0)|0;if(Cb>>>0>255){R=Cb;do{Re(s,256,e)|0;R=R+-256|0}while(R>>>0>255);Id=Cb&255}else Id=Cb;Re(s,Id,e)|0}L=bb;M=cb;N=Q;O=Ea;f=da;P=va}if((U|0)==344){if(e){sa=S;i=m;return sa|0}if(!T){sa=0;i=m;return sa|0}else Jd=1;while(1){T=c[l+(Jd<<2)>>2]|0;if(!T){Kd=Jd;break}S=j+(Jd<<3)|0;j:do if(T>>>0<=20)do switch(T|0){case 9:{e=(c[g>>2]|0)+(4-1)&~(4-1);va=c[e>>2]|0;c[g>>2]=e+4;c[S>>2]=va;break j;break}case 10:{va=(c[g>>2]|0)+(4-1)&~(4-1);e=c[va>>2]|0;c[g>>2]=va+4;va=S;c[va>>2]=e;c[va+4>>2]=((e|0)<0)<<31>>31;break j;break}case 11:{e=(c[g>>2]|0)+(4-1)&~(4-1);va=c[e>>2]|0;c[g>>2]=e+4;e=S;c[e>>2]=va;c[e+4>>2]=0;break j;break}case 12:{e=(c[g>>2]|0)+(8-1)&~(8-1);va=e;P=c[va>>2]|0;f=c[va+4>>2]|0;c[g>>2]=e+8;e=S;c[e>>2]=P;c[e+4>>2]=f;break j;break}case 13:{f=(c[g>>2]|0)+(4-1)&~(4-1);e=c[f>>2]|0;c[g>>2]=f+4;f=(e&65535)<<16>>16;e=S;c[e>>2]=f;c[e+4>>2]=((f|0)<0)<<31>>31;break j;break}case 14:{f=(c[g>>2]|0)+(4-1)&~(4-1);e=c[f>>2]|0;c[g>>2]=f+4;f=S;c[f>>2]=e&65535;c[f+4>>2]=0;break j;break}case 15:{f=(c[g>>2]|0)+(4-1)&~(4-1);e=c[f>>2]|0;c[g>>2]=f+4;f=(e&255)<<24>>24;e=S;c[e>>2]=f;c[e+4>>2]=((f|0)<0)<<31>>31;break j;break}case 16:{f=(c[g>>2]|0)+(4-1)&~(4-1);e=c[f>>2]|0;c[g>>2]=f+4;f=S;c[f>>2]=e&255;c[f+4>>2]=0;break j;break}case 17:{f=(c[g>>2]|0)+(8-1)&~(8-1);qb=+h[f>>3];c[g>>2]=f+8;h[S>>3]=qb;break j;break}case 18:{f=(c[g>>2]|0)+(8-1)&~(8-1);qb=+h[f>>3];c[g>>2]=f+8;h[S>>3]=qb;break j;break}default:break j}while(0);while(0);Jd=Jd+1|0;if((Jd|0)>=10){sa=1;U=363;break}}if((U|0)==363){i=m;return sa|0}if((Kd|0)<10)Ld=Kd;else{sa=1;i=m;return sa|0}while(1){if(c[l+(Ld<<2)>>2]|0){sa=-1;U=363;break}Ld=Ld+1|0;if((Ld|0)>=10){sa=1;U=363;break}}if((U|0)==363){i=m;return sa|0}}else if((U|0)==363){i=m;return sa|0}return 0}function gc(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0.0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,S=0,T=0,U=0,V=0.0,W=0,X=0.0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,da=0,ea=0,fa=0,ga=0,ha=0.0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0.0,qa=0,ra=0.0,sa=0.0,ta=0,ua=0.0,va=0,wa=0.0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0.0,Ha=0,Ia=0,Ja=0,Ka=0,La=0.0,Ma=0,Na=0,Oa=0,Pa=0.0,Qa=0.0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0.0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0,Ac=0,Bc=0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,_c=0,$c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0.0,id=0.0,jd=0.0,kd=0.0,ld=0.0,md=0.0,nd=0.0,od=0,pd=0,qd=0.0,rd=0,sd=0.0,td=0;g=i;i=i+512|0;h=g;switch(e|0){case 0:{j=24;k=-149;break}case 1:{j=53;k=-1074;break}case 2:{j=53;k=-1074;break}default:{l=0.0;i=g;return +l}}e=b+4|0;m=b+100|0;do{n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;o=d[n>>0]|0}else o=Ye(b)|0}while((Tn(o)|0)!=0);p=o;a:do switch(p|0){case 43:case 45:{o=1-(((p|0)==45&1)<<1)|0;n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;q=d[n>>0]|0;r=o;break a}else{q=Ye(b)|0;r=o;break a}break}default:{q=p;r=1}}while(0);p=q;q=0;while(1){if((p|32|0)!=(a[11123+q>>0]|0)){s=p;t=q;break}do if(q>>>0<7){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;u=d[o>>0]|0;break}else{u=Ye(b)|0;break}}else u=p;while(0);o=q+1|0;if(o>>>0<8){p=u;q=o}else{s=u;t=o;break}}b:do switch(t|0){case 8:break;case 3:{x=23;break}default:{u=(f|0)!=0;if(u&t>>>0>3)if((t|0)==8)break b;else{x=23;break b}do if(!t){if((s|32|0)==110){q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;y=d[q>>0]|0}else y=Ye(b)|0;if((y|32|0)!=97)break;q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;z=d[q>>0]|0}else z=Ye(b)|0;if((z|32|0)!=110)break;q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;A=d[q>>0]|0}else A=Ye(b)|0;if((A|0)==40)B=1;else{if(!(c[m>>2]|0)){l=v;i=g;return +l}c[e>>2]=(c[e>>2]|0)+-1;l=v;i=g;return +l}while(1){q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;C=d[q>>0]|0}else C=Ye(b)|0;if(!((C+-48|0)>>>0<10|(C+-65|0)>>>0<26)?!((C|0)==95|(C+-97|0)>>>0<26):0){D=C;E=B;break}B=B+1|0}if((D|0)==41){l=v;i=g;return +l}q=(c[m>>2]|0)==0;if(!q)c[e>>2]=(c[e>>2]|0)+-1;if(!u){c[(tb()|0)>>2]=22;Di(b,0);l=0.0;i=g;return +l}if((E|0)==0|q){l=v;i=g;return +l}q=E;p=c[e>>2]|0;while(1){q=q+-1|0;o=p+-1|0;if(!q){F=o;break}else p=o}c[e>>2]=F;l=v;i=g;return +l}do if((s|0)==48){p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;H=d[p>>0]|0}else H=Ye(b)|0;if((H|32|0)!=120){if(!(c[m>>2]|0)){I=48;break}c[e>>2]=(c[e>>2]|0)+-1;I=48;break}p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;J=d[p>>0]|0;K=0}else{J=Ye(b)|0;K=0}c:while(1){switch(J|0){case 46:{L=K;x=71;break c;break}case 48:break;default:{M=0;N=0;O=0;P=0;Q=J;S=K;T=0;U=0;V=1.0;W=0;X=0.0;break c}}p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;J=d[p>>0]|0;K=1;continue}else{J=Ye(b)|0;K=1;continue}}if((x|0)==71){p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;Y=d[p>>0]|0}else Y=Ye(b)|0;if((Y|0)==48){p=0;q=0;while(1){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;Z=d[o>>0]|0}else Z=Ye(b)|0;o=Ok(p|0,q|0,-1,-1)|0;n=G;if((Z|0)==48){p=o;q=n}else{M=0;N=0;O=o;P=n;Q=Z;S=1;T=1;U=0;V=1.0;W=0;X=0.0;break}}}else{M=0;N=0;O=0;P=0;Q=Y;S=L;T=1;U=0;V=1.0;W=0;X=0.0}}while(1){q=Q+-48|0;p=Q|32;if(q>>>0>=10){n=(Q|0)==46;if(!(n|(p+-97|0)>>>0<6)){_=O;$=N;aa=P;ba=M;da=Q;ea=S;fa=T;ga=W;ha=X;break}if(n)if(!T){ia=N;ja=M;ka=N;la=M;ma=S;na=1;oa=U;pa=V;qa=W;ra=X}else{_=O;$=N;aa=P;ba=M;da=46;ea=S;fa=T;ga=W;ha=X;break}else x=83}else x=83;if((x|0)==83){x=0;n=(Q|0)>57?p+-87|0:q;do if(!((M|0)<0|(M|0)==0&N>>>0<8)){if((M|0)<0|(M|0)==0&N>>>0<14){sa=V*.0625;ta=U;ua=sa;va=W;wa=X+sa*+(n|0);break}if((U|0)!=0|(n|0)==0){ta=U;ua=V;va=W;wa=X}else{ta=1;ua=V;va=W;wa=X+V*.5}}else{ta=U;ua=V;va=n+(W<<4)|0;wa=X}while(0);n=Ok(N|0,M|0,1,0)|0;ia=O;ja=P;ka=n;la=G;ma=1;na=T;oa=ta;pa=ua;qa=va;ra=wa}n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;M=la;N=ka;O=ia;P=ja;Q=d[n>>0]|0;S=ma;T=na;U=oa;V=pa;W=qa;X=ra;continue}else{M=la;N=ka;O=ia;P=ja;Q=Ye(b)|0;S=ma;T=na;U=oa;V=pa;W=qa;X=ra;continue}}if(!ea){n=(c[m>>2]|0)==0;if(!n)c[e>>2]=(c[e>>2]|0)+-1;if(f){if(!n?(n=c[e>>2]|0,c[e>>2]=n+-1,(fa|0)!=0):0)c[e>>2]=n+-2}else Di(b,0);l=+(r|0)*0.0;i=g;return +l}n=(fa|0)==0;q=n?$:_;p=n?ba:aa;if((ba|0)<0|(ba|0)==0&$>>>0<8){n=$;o=ba;xa=ga;while(1){ya=xa<<4;n=Ok(n|0,o|0,1,0)|0;o=G;if(!((o|0)<0|(o|0)==0&n>>>0<8)){za=ya;break}else xa=ya}}else za=ga;do if((da|32|0)==112){xa=zd(b,f)|0;n=G;if((xa|0)==0&(n|0)==-2147483648)if(!f){Di(b,0);l=0.0;i=g;return +l}else{if(!(c[m>>2]|0)){Aa=0;Ba=0;break}c[e>>2]=(c[e>>2]|0)+-1;Aa=0;Ba=0;break}else{Aa=xa;Ba=n}}else if(!(c[m>>2]|0)){Aa=0;Ba=0}else{c[e>>2]=(c[e>>2]|0)+-1;Aa=0;Ba=0}while(0);n=ck(q|0,p|0,2)|0;xa=Ok(n|0,G|0,-32,-1)|0;n=Ok(xa|0,G|0,Aa|0,Ba|0)|0;xa=G;if(!za){l=+(r|0)*0.0;i=g;return +l}if((xa|0)>0|(xa|0)==0&n>>>0>(0-k|0)>>>0){c[(tb()|0)>>2]=34;l=+(r|0)*17976931348623157.0e292*17976931348623157.0e292;i=g;return +l}o=k+-106|0;ya=((o|0)<0)<<31>>31;if((xa|0)<(ya|0)|(xa|0)==(ya|0)&n>>>0<o>>>0){c[(tb()|0)>>2]=34;l=+(r|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return +l}if((za|0)>-1){o=n;ya=xa;Ca=za;sa=ha;while(1){Da=!(sa>=.5);Ea=Da&1|Ca<<1;Fa=Ea^1;Ga=sa+(Da?sa:sa+-1.0);Da=Ok(o|0,ya|0,-1,-1)|0;Ha=G;if((Ea|0)>-1){o=Da;ya=Ha;Ca=Fa;sa=Ga}else{Ia=Da;Ja=Ha;Ka=Fa;La=Ga;break}}}else{Ia=n;Ja=xa;Ka=za;La=ha}Ca=Oj(32,0,k|0,((k|0)<0)<<31>>31|0)|0;ya=Ok(Ia|0,Ja|0,Ca|0,G|0)|0;Ca=G;if(0>(Ca|0)|0==(Ca|0)&j>>>0>ya>>>0)if((ya|0)<0){Ma=0;x=124}else{Na=ya;x=122}else{Na=j;x=122}if((x|0)==122)if((Na|0)<53){Ma=Na;x=124}else{Oa=Na;Pa=+(r|0);Qa=0.0}if((x|0)==124){sa=+(r|0);Oa=Ma;Pa=sa;Qa=+Fo(+Rf(1.0,84-Ma|0),sa)}ya=(Ka&1|0)==0&(La!=0.0&(Oa|0)<32);sa=Pa*(ya?0.0:La)+(Qa+Pa*+(((ya&1)+Ka|0)>>>0))-Qa;if(!(sa!=0.0))c[(tb()|0)>>2]=34;l=+Go(sa,Ia);i=g;return +l}else I=s;while(0);ya=k+j|0;Ca=0-ya|0;o=I;p=0;d:while(1){switch(o|0){case 46:{Ra=p;x=135;break d;break}case 48:break;default:{Sa=o;Ta=0;Ua=0;Va=p;Wa=0;break d}}q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;o=d[q>>0]|0;p=1;continue}else{o=Ye(b)|0;p=1;continue}}if((x|0)==135){p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;Xa=d[p>>0]|0}else Xa=Ye(b)|0;if((Xa|0)==48){p=0;o=0;while(1){q=Ok(p|0,o|0,-1,-1)|0;Fa=G;Ha=c[e>>2]|0;if(Ha>>>0<(c[m>>2]|0)>>>0){c[e>>2]=Ha+1;Ya=d[Ha>>0]|0}else Ya=Ye(b)|0;if((Ya|0)==48){p=q;o=Fa}else{Sa=Ya;Ta=q;Ua=Fa;Va=1;Wa=1;break}}}else{Sa=Xa;Ta=0;Ua=0;Va=Ra;Wa=1}}c[h>>2]=0;o=Sa+-48|0;p=(Sa|0)==46;e:do if(p|o>>>0<10){Fa=h+496|0;q=Sa;Ha=0;Da=0;Ea=p;Za=o;_a=Ta;$a=Ua;ab=Va;bb=Wa;cb=0;db=0;eb=0;f:while(1){do if(Ea)if(!bb){fb=Ha;gb=Da;hb=Ha;ib=Da;jb=ab;kb=1;lb=cb;mb=db;nb=eb}else{ob=_a;pb=$a;qb=Ha;rb=Da;sb=ab;ub=cb;vb=db;wb=eb;break f}else{xb=Ok(Ha|0,Da|0,1,0)|0;yb=G;zb=(q|0)!=48;if((db|0)>=125){if(!zb){fb=_a;gb=$a;hb=xb;ib=yb;jb=ab;kb=bb;lb=cb;mb=db;nb=eb;break}c[Fa>>2]=c[Fa>>2]|1;fb=_a;gb=$a;hb=xb;ib=yb;jb=ab;kb=bb;lb=cb;mb=db;nb=eb;break}Ab=h+(db<<2)|0;if(!cb)Bb=Za;else Bb=q+-48+((c[Ab>>2]|0)*10|0)|0;c[Ab>>2]=Bb;Ab=cb+1|0;Cb=(Ab|0)==9;fb=_a;gb=$a;hb=xb;ib=yb;jb=1;kb=bb;lb=Cb?0:Ab;mb=(Cb&1)+db|0;nb=zb?xb:eb}while(0);xb=c[e>>2]|0;if(xb>>>0<(c[m>>2]|0)>>>0){c[e>>2]=xb+1;Db=d[xb>>0]|0}else Db=Ye(b)|0;Za=Db+-48|0;Ea=(Db|0)==46;if(!(Ea|Za>>>0<10)){Eb=Db;Fb=fb;Gb=hb;Hb=gb;Ib=ib;Jb=jb;Kb=kb;Lb=lb;Mb=mb;Nb=nb;x=158;break e}else{q=Db;Ha=hb;Da=ib;_a=fb;$a=gb;ab=jb;bb=kb;cb=lb;db=mb;eb=nb}}Ob=qb;Pb=rb;Qb=ob;Rb=pb;Sb=(sb|0)!=0;Tb=ub;Ub=vb;Vb=wb;x=166}else{Eb=Sa;Fb=Ta;Gb=0;Hb=Ua;Ib=0;Jb=Va;Kb=Wa;Lb=0;Mb=0;Nb=0;x=158}while(0);do if((x|0)==158){o=(Kb|0)==0;p=o?Gb:Fb;eb=o?Ib:Hb;o=(Jb|0)!=0;if(!((Eb|32|0)==101&o))if((Eb|0)>-1){Ob=Gb;Pb=Ib;Qb=p;Rb=eb;Sb=o;Tb=Lb;Ub=Mb;Vb=Nb;x=166;break}else{Wb=Gb;Xb=Ib;Yb=o;Zb=p;_b=eb;$b=Lb;ac=Mb;bc=Nb;x=168;break}o=zd(b,f)|0;db=G;if((o|0)==0&(db|0)==-2147483648){if(!f){Di(b,0);cc=0.0;break}if(!(c[m>>2]|0)){dc=0;ec=0}else{c[e>>2]=(c[e>>2]|0)+-1;dc=0;ec=0}}else{dc=o;ec=db}db=Ok(dc|0,ec|0,p|0,eb|0)|0;fc=db;gc=Gb;hc=G;ic=Ib;jc=Lb;kc=Mb;lc=Nb;x=170}while(0);if((x|0)==166)if(c[m>>2]|0){c[e>>2]=(c[e>>2]|0)+-1;if(Sb){fc=Qb;gc=Ob;hc=Rb;ic=Pb;jc=Tb;kc=Ub;lc=Vb;x=170}else x=169}else{Wb=Ob;Xb=Pb;Yb=Sb;Zb=Qb;_b=Rb;$b=Tb;ac=Ub;bc=Vb;x=168}if((x|0)==168)if(Yb){fc=Zb;gc=Wb;hc=_b;ic=Xb;jc=$b;kc=ac;lc=bc;x=170}else x=169;do if((x|0)==169){c[(tb()|0)>>2]=22;Di(b,0);cc=0.0}else if((x|0)==170){db=c[h>>2]|0;if(!db){cc=+(r|0)*0.0;break}if(((ic|0)<0|(ic|0)==0&gc>>>0<10)&((fc|0)==(gc|0)&(hc|0)==(ic|0))?j>>>0>30|(db>>>j|0)==0:0){cc=+(r|0)*+(db>>>0);break}db=(k|0)/-2|0;eb=((db|0)<0)<<31>>31;if((hc|0)>(eb|0)|(hc|0)==(eb|0)&fc>>>0>db>>>0){c[(tb()|0)>>2]=34;cc=+(r|0)*17976931348623157.0e292*17976931348623157.0e292;break}db=k+-106|0;eb=((db|0)<0)<<31>>31;if((hc|0)<(eb|0)|(hc|0)==(eb|0)&fc>>>0<db>>>0){c[(tb()|0)>>2]=34;cc=+(r|0)*2.2250738585072014e-308*2.2250738585072014e-308;break}if(!jc)mc=kc;else{if((jc|0)<9){db=h+(kc<<2)|0;eb=c[db>>2]|0;p=jc;while(1){o=eb*10|0;p=p+1|0;if((p|0)==9){nc=o;break}else eb=o}c[db>>2]=nc}mc=kc+1|0}if((lc|0)<9?(lc|0)<=(fc|0)&(fc|0)<18:0){if((fc|0)==9){cc=+(r|0)*+((c[h>>2]|0)>>>0);break}if((fc|0)<9){cc=+(r|0)*+((c[h>>2]|0)>>>0)/+(c[2592+(8-fc<<2)>>2]|0);break}eb=j+27+(ca(fc,-3)|0)|0;p=c[h>>2]|0;if((eb|0)>30|(p>>>eb|0)==0){cc=+(r|0)*+(p>>>0)*+(c[2592+(fc+-10<<2)>>2]|0);break}}p=(fc|0)%9|0;if(!p){oc=0;pc=0;qc=fc;rc=mc}else{eb=(fc|0)>-1?p:p+9|0;p=c[2592+(8-eb<<2)>>2]|0;if(mc){o=1e9/(p|0)|0;cb=0;bb=0;ab=0;$a=fc;while(1){_a=h+(ab<<2)|0;Da=c[_a>>2]|0;Ha=((Da>>>0)/(p>>>0)|0)+bb|0;c[_a>>2]=Ha;_a=ca((Da>>>0)%(p>>>0)|0,o)|0;Da=(ab|0)==(cb|0)&(Ha|0)==0;ab=ab+1|0;Ha=Da?$a+-9|0:$a;q=Da?ab&127:cb;if((ab|0)==(mc|0)){sc=_a;tc=q;uc=Ha;break}else{cb=q;bb=_a;$a=Ha}}if(!sc){vc=tc;wc=uc;xc=mc}else{c[h+(mc<<2)>>2]=sc;vc=tc;wc=uc;xc=mc+1|0}}else{vc=0;wc=fc;xc=0}oc=vc;pc=0;qc=9-eb+wc|0;rc=xc}g:while(1){$a=h+(oc<<2)|0;if((qc|0)<18){bb=pc;cb=rc;while(1){ab=0;o=cb+127|0;p=cb;while(1){db=o&127;Ha=h+(db<<2)|0;_a=ck(c[Ha>>2]|0,0,29)|0;q=Ok(_a|0,G|0,ab|0,0)|0;_a=G;if(_a>>>0>0|(_a|0)==0&q>>>0>1e9){Da=sm(q|0,_a|0,1e9,0)|0;Za=ij(q|0,_a|0,1e9,0)|0;yc=Za;zc=Da}else{yc=q;zc=0}c[Ha>>2]=yc;Ha=(db|0)==(oc|0);q=(db|0)!=(p+127&127|0)|Ha?p:(yc|0)==0?db:p;if(Ha){Ac=zc;Bc=q;break}else{ab=zc;o=db+-1|0;p=q}}p=bb+-29|0;if(!Ac){bb=p;cb=Bc}else{Cc=p;Dc=Ac;Ec=Bc;break}}}else{if((qc|0)==18){Fc=pc;Gc=rc}else{Hc=oc;Ic=pc;Jc=qc;Kc=rc;break}while(1){if((c[$a>>2]|0)>>>0>=9007199){Hc=oc;Ic=Fc;Jc=18;Kc=Gc;break g}cb=0;bb=Gc+127|0;p=Gc;while(1){o=bb&127;ab=h+(o<<2)|0;q=ck(c[ab>>2]|0,0,29)|0;db=Ok(q|0,G|0,cb|0,0)|0;q=G;if(q>>>0>0|(q|0)==0&db>>>0>1e9){Ha=sm(db|0,q|0,1e9,0)|0;Da=ij(db|0,q|0,1e9,0)|0;Lc=Da;Mc=Ha}else{Lc=db;Mc=0}c[ab>>2]=Lc;ab=(o|0)==(oc|0);db=(o|0)!=(p+127&127|0)|ab?p:(Lc|0)==0?o:p;if(ab){Nc=Mc;Oc=db;break}else{cb=Mc;bb=o+-1|0;p=db}}p=Fc+-29|0;if(!Nc){Fc=p;Gc=Oc}else{Cc=p;Dc=Nc;Ec=Oc;break}}}$a=oc+127&127;if(($a|0)==(Ec|0)){p=Ec+127&127;bb=h+((Ec+126&127)<<2)|0;c[bb>>2]=c[bb>>2]|c[h+(p<<2)>>2];Pc=p}else Pc=Ec;c[h+($a<<2)>>2]=Dc;oc=$a;pc=Cc;qc=qc+9|0;rc=Pc}h:while(1){Qc=Kc+1&127;eb=h+((Kc+127&127)<<2)|0;$a=Hc;p=Ic;bb=Jc;while(1){cb=(bb|0)==18;db=(bb|0)>27?9:1;o=cb^1;Rc=$a;Sc=p;while(1){Tc=Rc&127;Uc=(Tc|0)==(Kc|0);do if(!Uc){ab=c[h+(Tc<<2)>>2]|0;if(ab>>>0<9007199){x=220;break}if(ab>>>0>9007199)break;ab=Rc+1&127;if((ab|0)==(Kc|0)){x=220;break}Ha=c[h+(ab<<2)>>2]|0;if(Ha>>>0<254740991){x=220;break}if(!(Ha>>>0>254740991|o)){Vc=Tc;Wc=Rc;Xc=Sc;Yc=Kc;break h}}else x=220;while(0);if((x|0)==220?(x=0,cb):0){x=221;break h}Ha=Sc+db|0;if((Rc|0)==(Kc|0)){Rc=Kc;Sc=Ha}else{Zc=Ha;_c=Rc;break}}cb=(1<<db)+-1|0;o=1e9>>>db;Ha=_c;ab=0;Da=_c;q=bb;while(1){Za=h+(Da<<2)|0;_a=c[Za>>2]|0;Ea=(_a>>>db)+ab|0;c[Za>>2]=Ea;Za=ca(_a&cb,o)|0;_a=(Da|0)==(Ha|0)&(Ea|0)==0;Da=Da+1&127;Ea=_a?q+-9|0:q;Fa=_a?Da:Ha;if((Da|0)==(Kc|0)){$c=Za;ad=Fa;bd=Ea;break}else{Ha=Fa;ab=Za;q=Ea}}if(!$c){$a=ad;p=Zc;bb=bd;continue}if((Qc|0)!=(ad|0)){cd=Zc;dd=$c;ed=ad;fd=bd;break}c[eb>>2]=c[eb>>2]|1;$a=ad;p=Zc;bb=bd}c[h+(Kc<<2)>>2]=dd;Hc=ed;Ic=cd;Jc=fd;Kc=Qc}if((x|0)==221)if(Uc){c[h+(Qc+-1<<2)>>2]=0;Vc=Kc;Wc=Rc;Xc=Sc;Yc=Qc}else{Vc=Tc;Wc=Rc;Xc=Sc;Yc=Kc}sa=+((c[h+(Vc<<2)>>2]|0)>>>0);bb=Wc+1&127;if((bb|0)==(Yc|0)){p=Wc+2&127;c[h+(p+-1<<2)>>2]=0;gd=p}else gd=Yc;Ga=+(r|0);hd=Ga*(sa*1.0e9+ +((c[h+(bb<<2)>>2]|0)>>>0));bb=Xc+53|0;p=bb-k|0;$a=(p|0)<(j|0);eb=$a&1;q=$a?((p|0)<0?0:p):j;if((q|0)<53){sa=+Fo(+Rf(1.0,105-q|0),hd);id=+Wo(hd,+Rf(1.0,53-q|0));jd=sa;kd=id;ld=sa+(hd-id)}else{jd=0.0;kd=0.0;ld=hd}ab=Wc+2&127;do if((ab|0)==(gd|0))md=kd;else{Ha=c[h+(ab<<2)>>2]|0;do if(Ha>>>0>=5e8){if(Ha>>>0>5e8){nd=Ga*.75+kd;break}if((Wc+3&127|0)==(gd|0)){nd=Ga*.5+kd;break}else{nd=Ga*.75+kd;break}}else{if((Ha|0)==0?(Wc+3&127|0)==(gd|0):0){nd=kd;break}nd=Ga*.25+kd}while(0);if((53-q|0)<=1){md=nd;break}if(+Wo(nd,1.0)!=0.0){md=nd;break}md=nd+1.0}while(0);Ga=ld+md-jd;do if((bb&2147483647|0)>(-2-ya|0)){if(!(+R(+Ga)>=9007199254740992.0)){od=eb;pd=Xc;qd=Ga}else{od=$a&(q|0)==(p|0)?0:eb;pd=Xc+1|0;qd=Ga*.5}if((pd+50|0)<=(Ca|0)?!(md!=0.0&(od|0)!=0):0){rd=pd;sd=qd;break}c[(tb()|0)>>2]=34;rd=pd;sd=qd}else{rd=Xc;sd=Ga}while(0);cc=+Go(sd,rd)}while(0);l=cc;i=g;return +l}while(0);if(c[m>>2]|0)c[e>>2]=(c[e>>2]|0)+-1;c[(tb()|0)>>2]=22;Di(b,0);l=0.0;i=g;return +l}}while(0);if((x|0)==23){x=(c[m>>2]|0)==0;if(!x)c[e>>2]=(c[e>>2]|0)+-1;if(!(t>>>0<4|(f|0)==0|x)){x=c[e>>2]|0;f=t;while(1){t=x+-1|0;f=f+-1|0;if(f>>>0<=3){td=t;break}else x=t}c[e>>2]=td}}l=+(r|0)*w;i=g;return +l}function fc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0;do if(a>>>0<245){b=a>>>0<11?16:a+11&-8;d=b>>>3;e=c[684]|0;f=e>>>d;if(f&3){g=(f&1^1)+d|0;h=g<<1;i=2776+(h<<2)|0;j=2776+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do if((i|0)!=(l|0)){if(l>>>0<(c[688]|0)>>>0)Cb();m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else Cb()}else c[684]=e&~(1<<g);while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}j=c[686]|0;if(b>>>0>j>>>0){if(f){l=2<<d;i=f<<d&(l|0-l);l=(i&0-i)+-1|0;i=l>>>12&16;m=l>>>i;l=m>>>5&8;o=m>>>l;m=o>>>2&4;p=o>>>m;o=p>>>1&2;q=p>>>o;p=q>>>1&1;r=(l|i|m|o|p)+(q>>>p)|0;p=r<<1;q=2776+(p<<2)|0;o=2776+(p+2<<2)|0;p=c[o>>2]|0;m=p+8|0;i=c[m>>2]|0;do if((q|0)!=(i|0)){if(i>>>0<(c[688]|0)>>>0)Cb();l=i+12|0;if((c[l>>2]|0)==(p|0)){c[l>>2]=q;c[o>>2]=i;s=c[686]|0;break}else Cb()}else{c[684]=e&~(1<<r);s=j}while(0);j=r<<3;e=j-b|0;c[p+4>>2]=b|3;i=p+b|0;c[p+(b|4)>>2]=e|1;c[p+j>>2]=e;if(s){j=c[689]|0;o=s>>>3;q=o<<1;d=2776+(q<<2)|0;f=c[684]|0;k=1<<o;if(f&k){o=2776+(q+2<<2)|0;h=c[o>>2]|0;if(h>>>0<(c[688]|0)>>>0)Cb();else{t=o;u=h}}else{c[684]=f|k;t=2776+(q+2<<2)|0;u=d}c[t>>2]=j;c[u+12>>2]=j;c[j+8>>2]=u;c[j+12>>2]=d}c[686]=e;c[689]=i;n=m;return n|0}i=c[685]|0;if(i){e=(i&0-i)+-1|0;i=e>>>12&16;d=e>>>i;e=d>>>5&8;j=d>>>e;d=j>>>2&4;q=j>>>d;j=q>>>1&2;k=q>>>j;q=k>>>1&1;f=c[3040+((e|i|d|j|q)+(k>>>q)<<2)>>2]|0;q=(c[f+4>>2]&-8)-b|0;k=f;j=f;while(1){f=c[k+16>>2]|0;if(!f){d=c[k+20>>2]|0;if(!d){v=q;w=j;break}else x=d}else x=f;f=(c[x+4>>2]&-8)-b|0;d=f>>>0<q>>>0;q=d?f:q;k=x;j=d?x:j}j=c[688]|0;if(w>>>0<j>>>0)Cb();k=w+b|0;if(w>>>0>=k>>>0)Cb();q=c[w+24>>2]|0;m=c[w+12>>2]|0;do if((m|0)==(w|0)){p=w+20|0;r=c[p>>2]|0;if(!r){d=w+16|0;f=c[d>>2]|0;if(!f){y=0;break}else{z=f;A=d}}else{z=r;A=p}while(1){p=z+20|0;r=c[p>>2]|0;if(r){z=r;A=p;continue}p=z+16|0;r=c[p>>2]|0;if(!r){B=z;C=A;break}else{z=r;A=p}}if(C>>>0<j>>>0)Cb();else{c[C>>2]=0;y=B;break}}else{p=c[w+8>>2]|0;if(p>>>0<j>>>0)Cb();r=p+12|0;if((c[r>>2]|0)!=(w|0))Cb();d=m+8|0;if((c[d>>2]|0)==(w|0)){c[r>>2]=m;c[d>>2]=p;y=m;break}else Cb()}while(0);do if(q){m=c[w+28>>2]|0;j=3040+(m<<2)|0;if((w|0)==(c[j>>2]|0)){c[j>>2]=y;if(!y){c[685]=c[685]&~(1<<m);break}}else{if(q>>>0<(c[688]|0)>>>0)Cb();m=q+16|0;if((c[m>>2]|0)==(w|0))c[m>>2]=y;else c[q+20>>2]=y;if(!y)break}m=c[688]|0;if(y>>>0<m>>>0)Cb();c[y+24>>2]=q;j=c[w+16>>2]|0;do if(j)if(j>>>0<m>>>0)Cb();else{c[y+16>>2]=j;c[j+24>>2]=y;break}while(0);j=c[w+20>>2]|0;if(j)if(j>>>0<(c[688]|0)>>>0)Cb();else{c[y+20>>2]=j;c[j+24>>2]=y;break}}while(0);if(v>>>0<16){q=v+b|0;c[w+4>>2]=q|3;j=w+(q+4)|0;c[j>>2]=c[j>>2]|1}else{c[w+4>>2]=b|3;c[w+(b|4)>>2]=v|1;c[w+(v+b)>>2]=v;j=c[686]|0;if(j){q=c[689]|0;m=j>>>3;j=m<<1;p=2776+(j<<2)|0;d=c[684]|0;r=1<<m;if(d&r){m=2776+(j+2<<2)|0;f=c[m>>2]|0;if(f>>>0<(c[688]|0)>>>0)Cb();else{D=m;E=f}}else{c[684]=d|r;D=2776+(j+2<<2)|0;E=p}c[D>>2]=q;c[E+12>>2]=q;c[q+8>>2]=E;c[q+12>>2]=p}c[686]=v;c[689]=k}n=w+8|0;return n|0}else F=b}else F=b}else if(a>>>0<=4294967231){p=a+11|0;q=p&-8;j=c[685]|0;if(j){r=0-q|0;d=p>>>8;if(d)if(q>>>0>16777215)G=31;else{p=(d+1048320|0)>>>16&8;f=d<<p;d=(f+520192|0)>>>16&4;m=f<<d;f=(m+245760|0)>>>16&2;i=14-(d|p|f)+(m<<f>>>15)|0;G=q>>>(i+7|0)&1|i<<1}else G=0;i=c[3040+(G<<2)>>2]|0;a:do if(!i){H=r;I=0;J=0;K=86}else{f=r;m=0;p=q<<((G|0)==31?0:25-(G>>>1)|0);d=i;e=0;while(1){h=c[d+4>>2]&-8;o=h-q|0;if(o>>>0<f>>>0)if((h|0)==(q|0)){L=o;M=d;N=d;K=90;break a}else{O=o;P=d}else{O=f;P=e}o=c[d+20>>2]|0;d=c[d+16+(p>>>31<<2)>>2]|0;h=(o|0)==0|(o|0)==(d|0)?m:o;if(!d){H=O;I=h;J=P;K=86;break}else{f=O;m=h;p=p<<1;e=P}}}while(0);if((K|0)==86){if((I|0)==0&(J|0)==0){i=2<<G;r=j&(i|0-i);if(!r){F=q;break}i=(r&0-r)+-1|0;r=i>>>12&16;b=i>>>r;i=b>>>5&8;k=b>>>i;b=k>>>2&4;e=k>>>b;k=e>>>1&2;p=e>>>k;e=p>>>1&1;Q=c[3040+((i|r|b|k|e)+(p>>>e)<<2)>>2]|0;R=0}else{Q=I;R=J}if(!Q){S=H;T=R}else{L=H;M=Q;N=R;K=90}}if((K|0)==90)while(1){K=0;e=(c[M+4>>2]&-8)-q|0;p=e>>>0<L>>>0;k=p?e:L;e=p?M:N;p=c[M+16>>2]|0;if(p){L=k;M=p;N=e;K=90;continue}M=c[M+20>>2]|0;if(!M){S=k;T=e;break}else{L=k;N=e;K=90}}if((T|0)!=0?S>>>0<((c[686]|0)-q|0)>>>0:0){j=c[688]|0;if(T>>>0<j>>>0)Cb();e=T+q|0;if(T>>>0>=e>>>0)Cb();k=c[T+24>>2]|0;p=c[T+12>>2]|0;do if((p|0)==(T|0)){b=T+20|0;r=c[b>>2]|0;if(!r){i=T+16|0;m=c[i>>2]|0;if(!m){U=0;break}else{V=m;W=i}}else{V=r;W=b}while(1){b=V+20|0;r=c[b>>2]|0;if(r){V=r;W=b;continue}b=V+16|0;r=c[b>>2]|0;if(!r){X=V;Y=W;break}else{V=r;W=b}}if(Y>>>0<j>>>0)Cb();else{c[Y>>2]=0;U=X;break}}else{b=c[T+8>>2]|0;if(b>>>0<j>>>0)Cb();r=b+12|0;if((c[r>>2]|0)!=(T|0))Cb();i=p+8|0;if((c[i>>2]|0)==(T|0)){c[r>>2]=p;c[i>>2]=b;U=p;break}else Cb()}while(0);do if(k){p=c[T+28>>2]|0;j=3040+(p<<2)|0;if((T|0)==(c[j>>2]|0)){c[j>>2]=U;if(!U){c[685]=c[685]&~(1<<p);break}}else{if(k>>>0<(c[688]|0)>>>0)Cb();p=k+16|0;if((c[p>>2]|0)==(T|0))c[p>>2]=U;else c[k+20>>2]=U;if(!U)break}p=c[688]|0;if(U>>>0<p>>>0)Cb();c[U+24>>2]=k;j=c[T+16>>2]|0;do if(j)if(j>>>0<p>>>0)Cb();else{c[U+16>>2]=j;c[j+24>>2]=U;break}while(0);j=c[T+20>>2]|0;if(j)if(j>>>0<(c[688]|0)>>>0)Cb();else{c[U+20>>2]=j;c[j+24>>2]=U;break}}while(0);b:do if(S>>>0>=16){c[T+4>>2]=q|3;c[T+(q|4)>>2]=S|1;c[T+(S+q)>>2]=S;k=S>>>3;if(S>>>0<256){j=k<<1;p=2776+(j<<2)|0;b=c[684]|0;i=1<<k;if(b&i){k=2776+(j+2<<2)|0;r=c[k>>2]|0;if(r>>>0<(c[688]|0)>>>0)Cb();else{Z=k;_=r}}else{c[684]=b|i;Z=2776+(j+2<<2)|0;_=p}c[Z>>2]=e;c[_+12>>2]=e;c[T+(q+8)>>2]=_;c[T+(q+12)>>2]=p;break}p=S>>>8;if(p)if(S>>>0>16777215)$=31;else{j=(p+1048320|0)>>>16&8;i=p<<j;p=(i+520192|0)>>>16&4;b=i<<p;i=(b+245760|0)>>>16&2;r=14-(p|j|i)+(b<<i>>>15)|0;$=S>>>(r+7|0)&1|r<<1}else $=0;r=3040+($<<2)|0;c[T+(q+28)>>2]=$;c[T+(q+20)>>2]=0;c[T+(q+16)>>2]=0;i=c[685]|0;b=1<<$;if(!(i&b)){c[685]=i|b;c[r>>2]=e;c[T+(q+24)>>2]=r;c[T+(q+12)>>2]=e;c[T+(q+8)>>2]=e;break}b=c[r>>2]|0;c:do if((c[b+4>>2]&-8|0)!=(S|0)){r=S<<(($|0)==31?0:25-($>>>1)|0);i=b;while(1){j=i+16+(r>>>31<<2)|0;p=c[j>>2]|0;if(!p){aa=j;ba=i;break}if((c[p+4>>2]&-8|0)==(S|0)){ca=p;break c}else{r=r<<1;i=p}}if(aa>>>0<(c[688]|0)>>>0)Cb();else{c[aa>>2]=e;c[T+(q+24)>>2]=ba;c[T+(q+12)>>2]=e;c[T+(q+8)>>2]=e;break b}}else ca=b;while(0);b=ca+8|0;i=c[b>>2]|0;r=c[688]|0;if(i>>>0>=r>>>0&ca>>>0>=r>>>0){c[i+12>>2]=e;c[b>>2]=e;c[T+(q+8)>>2]=i;c[T+(q+12)>>2]=ca;c[T+(q+24)>>2]=0;break}else Cb()}else{i=S+q|0;c[T+4>>2]=i|3;b=T+(i+4)|0;c[b>>2]=c[b>>2]|1}while(0);n=T+8|0;return n|0}else F=q}else F=q}else F=-1;while(0);T=c[686]|0;if(T>>>0>=F>>>0){S=T-F|0;ca=c[689]|0;if(S>>>0>15){c[689]=ca+F;c[686]=S;c[ca+(F+4)>>2]=S|1;c[ca+T>>2]=S;c[ca+4>>2]=F|3}else{c[686]=0;c[689]=0;c[ca+4>>2]=T|3;S=ca+(T+4)|0;c[S>>2]=c[S>>2]|1}n=ca+8|0;return n|0}ca=c[687]|0;if(ca>>>0>F>>>0){S=ca-F|0;c[687]=S;ca=c[690]|0;c[690]=ca+F;c[ca+(F+4)>>2]=S|1;c[ca+4>>2]=F|3;n=ca+8|0;return n|0}do if(!(c[802]|0)){ca=eb(30)|0;if(!(ca+-1&ca)){c[804]=ca;c[803]=ca;c[805]=-1;c[806]=-1;c[807]=0;c[795]=0;c[802]=(Fb(0)|0)&-16^1431655768;break}else Cb()}while(0);ca=F+48|0;S=c[804]|0;T=F+47|0;ba=S+T|0;aa=0-S|0;S=ba&aa;if(S>>>0<=F>>>0){n=0;return n|0}$=c[794]|0;if(($|0)!=0?(_=c[792]|0,Z=_+S|0,Z>>>0<=_>>>0|Z>>>0>$>>>0):0){n=0;return n|0}d:do if(!(c[795]&4)){$=c[690]|0;e:do if($){Z=3184;while(1){_=c[Z>>2]|0;if(_>>>0<=$>>>0?(U=Z+4|0,(_+(c[U>>2]|0)|0)>>>0>$>>>0):0){da=Z;ea=U;break}Z=c[Z+8>>2]|0;if(!Z){K=174;break e}}Z=ba-(c[687]|0)&aa;if(Z>>>0<2147483647){U=Xa(Z|0)|0;_=(U|0)==((c[da>>2]|0)+(c[ea>>2]|0)|0);X=_?Z:0;if(_)if((U|0)==(-1|0))fa=X;else{ga=U;ha=X;K=194;break d}else{ia=U;ja=Z;ka=X;K=184}}else fa=0}else K=174;while(0);do if((K|0)==174){$=Xa(0)|0;if(($|0)!=(-1|0)){q=$;X=c[803]|0;Z=X+-1|0;if(!(Z&q))la=S;else la=S-q+(Z+q&0-X)|0;X=c[792]|0;q=X+la|0;if(la>>>0>F>>>0&la>>>0<2147483647){Z=c[794]|0;if((Z|0)!=0?q>>>0<=X>>>0|q>>>0>Z>>>0:0){fa=0;break}Z=Xa(la|0)|0;q=(Z|0)==($|0);X=q?la:0;if(q){ga=$;ha=X;K=194;break d}else{ia=Z;ja=la;ka=X;K=184}}else fa=0}else fa=0}while(0);f:do if((K|0)==184){X=0-ja|0;do if(ca>>>0>ja>>>0&(ja>>>0<2147483647&(ia|0)!=(-1|0))?(Z=c[804]|0,$=T-ja+Z&0-Z,$>>>0<2147483647):0)if((Xa($|0)|0)==(-1|0)){Xa(X|0)|0;fa=ka;break f}else{ma=$+ja|0;break}else ma=ja;while(0);if((ia|0)==(-1|0))fa=ka;else{ga=ia;ha=ma;K=194;break d}}while(0);c[795]=c[795]|4;na=fa;K=191}else{na=0;K=191}while(0);if((((K|0)==191?S>>>0<2147483647:0)?(fa=Xa(S|0)|0,S=Xa(0)|0,fa>>>0<S>>>0&((fa|0)!=(-1|0)&(S|0)!=(-1|0))):0)?(ma=S-fa|0,S=ma>>>0>(F+40|0)>>>0,S):0){ga=fa;ha=S?ma:na;K=194}if((K|0)==194){na=(c[792]|0)+ha|0;c[792]=na;if(na>>>0>(c[793]|0)>>>0)c[793]=na;na=c[690]|0;g:do if(na){ma=3184;do{S=c[ma>>2]|0;fa=ma+4|0;ia=c[fa>>2]|0;if((ga|0)==(S+ia|0)){oa=S;pa=fa;qa=ia;ra=ma;K=204;break}ma=c[ma+8>>2]|0}while((ma|0)!=0);if(((K|0)==204?(c[ra+12>>2]&8|0)==0:0)?na>>>0<ga>>>0&na>>>0>=oa>>>0:0){c[pa>>2]=qa+ha;ma=(c[687]|0)+ha|0;ia=na+8|0;fa=(ia&7|0)==0?0:0-ia&7;ia=ma-fa|0;c[690]=na+fa;c[687]=ia;c[na+(fa+4)>>2]=ia|1;c[na+(ma+4)>>2]=40;c[691]=c[806];break}ma=c[688]|0;if(ga>>>0<ma>>>0){c[688]=ga;sa=ga}else sa=ma;ma=ga+ha|0;ia=3184;while(1){if((c[ia>>2]|0)==(ma|0)){ta=ia;ua=ia;K=212;break}ia=c[ia+8>>2]|0;if(!ia){va=3184;break}}if((K|0)==212)if(!(c[ua+12>>2]&8)){c[ta>>2]=ga;ia=ua+4|0;c[ia>>2]=(c[ia>>2]|0)+ha;ia=ga+8|0;ma=(ia&7|0)==0?0:0-ia&7;ia=ga+(ha+8)|0;fa=(ia&7|0)==0?0:0-ia&7;ia=ga+(fa+ha)|0;S=ma+F|0;ka=ga+S|0;ja=ia-(ga+ma)-F|0;c[ga+(ma+4)>>2]=F|3;h:do if((ia|0)!=(na|0)){if((ia|0)==(c[689]|0)){T=(c[686]|0)+ja|0;c[686]=T;c[689]=ka;c[ga+(S+4)>>2]=T|1;c[ga+(T+S)>>2]=T;break}T=ha+4|0;ca=c[ga+(T+fa)>>2]|0;if((ca&3|0)==1){la=ca&-8;ea=ca>>>3;i:do if(ca>>>0>=256){da=c[ga+((fa|24)+ha)>>2]|0;aa=c[ga+(ha+12+fa)>>2]|0;do if((aa|0)==(ia|0)){ba=fa|16;X=ga+(T+ba)|0;$=c[X>>2]|0;if(!$){Z=ga+(ba+ha)|0;ba=c[Z>>2]|0;if(!ba){wa=0;break}else{xa=ba;ya=Z}}else{xa=$;ya=X}while(1){X=xa+20|0;$=c[X>>2]|0;if($){xa=$;ya=X;continue}X=xa+16|0;$=c[X>>2]|0;if(!$){za=xa;Aa=ya;break}else{xa=$;ya=X}}if(Aa>>>0<sa>>>0)Cb();else{c[Aa>>2]=0;wa=za;break}}else{X=c[ga+((fa|8)+ha)>>2]|0;if(X>>>0<sa>>>0)Cb();$=X+12|0;if((c[$>>2]|0)!=(ia|0))Cb();Z=aa+8|0;if((c[Z>>2]|0)==(ia|0)){c[$>>2]=aa;c[Z>>2]=X;wa=aa;break}else Cb()}while(0);if(!da)break;aa=c[ga+(ha+28+fa)>>2]|0;X=3040+(aa<<2)|0;do if((ia|0)!=(c[X>>2]|0)){if(da>>>0<(c[688]|0)>>>0)Cb();Z=da+16|0;if((c[Z>>2]|0)==(ia|0))c[Z>>2]=wa;else c[da+20>>2]=wa;if(!wa)break i}else{c[X>>2]=wa;if(wa)break;c[685]=c[685]&~(1<<aa);break i}while(0);aa=c[688]|0;if(wa>>>0<aa>>>0)Cb();c[wa+24>>2]=da;X=fa|16;Z=c[ga+(X+ha)>>2]|0;do if(Z)if(Z>>>0<aa>>>0)Cb();else{c[wa+16>>2]=Z;c[Z+24>>2]=wa;break}while(0);Z=c[ga+(T+X)>>2]|0;if(!Z)break;if(Z>>>0<(c[688]|0)>>>0)Cb();else{c[wa+20>>2]=Z;c[Z+24>>2]=wa;break}}else{Z=c[ga+((fa|8)+ha)>>2]|0;aa=c[ga+(ha+12+fa)>>2]|0;da=2776+(ea<<1<<2)|0;do if((Z|0)!=(da|0)){if(Z>>>0<sa>>>0)Cb();if((c[Z+12>>2]|0)==(ia|0))break;Cb()}while(0);if((aa|0)==(Z|0)){c[684]=c[684]&~(1<<ea);break}do if((aa|0)==(da|0))Ba=aa+8|0;else{if(aa>>>0<sa>>>0)Cb();X=aa+8|0;if((c[X>>2]|0)==(ia|0)){Ba=X;break}Cb()}while(0);c[Z+12>>2]=aa;c[Ba>>2]=Z}while(0);Ca=ga+((la|fa)+ha)|0;Da=la+ja|0}else{Ca=ia;Da=ja}ea=Ca+4|0;c[ea>>2]=c[ea>>2]&-2;c[ga+(S+4)>>2]=Da|1;c[ga+(Da+S)>>2]=Da;ea=Da>>>3;if(Da>>>0<256){T=ea<<1;ca=2776+(T<<2)|0;da=c[684]|0;X=1<<ea;do if(!(da&X)){c[684]=da|X;Ea=2776+(T+2<<2)|0;Fa=ca}else{ea=2776+(T+2<<2)|0;$=c[ea>>2]|0;if($>>>0>=(c[688]|0)>>>0){Ea=ea;Fa=$;break}Cb()}while(0);c[Ea>>2]=ka;c[Fa+12>>2]=ka;c[ga+(S+8)>>2]=Fa;c[ga+(S+12)>>2]=ca;break}T=Da>>>8;do if(!T)Ga=0;else{if(Da>>>0>16777215){Ga=31;break}X=(T+1048320|0)>>>16&8;da=T<<X;la=(da+520192|0)>>>16&4;$=da<<la;da=($+245760|0)>>>16&2;ea=14-(la|X|da)+($<<da>>>15)|0;Ga=Da>>>(ea+7|0)&1|ea<<1}while(0);T=3040+(Ga<<2)|0;c[ga+(S+28)>>2]=Ga;c[ga+(S+20)>>2]=0;c[ga+(S+16)>>2]=0;ca=c[685]|0;ea=1<<Ga;if(!(ca&ea)){c[685]=ca|ea;c[T>>2]=ka;c[ga+(S+24)>>2]=T;c[ga+(S+12)>>2]=ka;c[ga+(S+8)>>2]=ka;break}ea=c[T>>2]|0;j:do if((c[ea+4>>2]&-8|0)!=(Da|0)){T=Da<<((Ga|0)==31?0:25-(Ga>>>1)|0);ca=ea;while(1){da=ca+16+(T>>>31<<2)|0;$=c[da>>2]|0;if(!$){Ha=da;Ia=ca;break}if((c[$+4>>2]&-8|0)==(Da|0)){Ja=$;break j}else{T=T<<1;ca=$}}if(Ha>>>0<(c[688]|0)>>>0)Cb();else{c[Ha>>2]=ka;c[ga+(S+24)>>2]=Ia;c[ga+(S+12)>>2]=ka;c[ga+(S+8)>>2]=ka;break h}}else Ja=ea;while(0);ea=Ja+8|0;ca=c[ea>>2]|0;T=c[688]|0;if(ca>>>0>=T>>>0&Ja>>>0>=T>>>0){c[ca+12>>2]=ka;c[ea>>2]=ka;c[ga+(S+8)>>2]=ca;c[ga+(S+12)>>2]=Ja;c[ga+(S+24)>>2]=0;break}else Cb()}else{ca=(c[687]|0)+ja|0;c[687]=ca;c[690]=ka;c[ga+(S+4)>>2]=ca|1}while(0);n=ga+(ma|8)|0;return n|0}else va=3184;while(1){S=c[va>>2]|0;if(S>>>0<=na>>>0?(ka=c[va+4>>2]|0,ja=S+ka|0,ja>>>0>na>>>0):0){Ka=S;La=ka;Ma=ja;break}va=c[va+8>>2]|0}ma=Ka+(La+-39)|0;ja=Ka+(La+-47+((ma&7|0)==0?0:0-ma&7))|0;ma=na+16|0;ka=ja>>>0<ma>>>0?na:ja;ja=ka+8|0;S=ga+8|0;ia=(S&7|0)==0?0:0-S&7;S=ha+-40-ia|0;c[690]=ga+ia;c[687]=S;c[ga+(ia+4)>>2]=S|1;c[ga+(ha+-36)>>2]=40;c[691]=c[806];S=ka+4|0;c[S>>2]=27;c[ja>>2]=c[796];c[ja+4>>2]=c[797];c[ja+8>>2]=c[798];c[ja+12>>2]=c[799];c[796]=ga;c[797]=ha;c[799]=0;c[798]=ja;ja=ka+28|0;c[ja>>2]=7;if((ka+32|0)>>>0<Ma>>>0){ia=ja;do{ja=ia;ia=ia+4|0;c[ia>>2]=7}while((ja+8|0)>>>0<Ma>>>0)}if((ka|0)!=(na|0)){ia=ka-na|0;c[S>>2]=c[S>>2]&-2;c[na+4>>2]=ia|1;c[ka>>2]=ia;ja=ia>>>3;if(ia>>>0<256){fa=ja<<1;ca=2776+(fa<<2)|0;ea=c[684]|0;T=1<<ja;if(ea&T){ja=2776+(fa+2<<2)|0;Z=c[ja>>2]|0;if(Z>>>0<(c[688]|0)>>>0)Cb();else{Na=ja;Oa=Z}}else{c[684]=ea|T;Na=2776+(fa+2<<2)|0;Oa=ca}c[Na>>2]=na;c[Oa+12>>2]=na;c[na+8>>2]=Oa;c[na+12>>2]=ca;break}ca=ia>>>8;if(ca)if(ia>>>0>16777215)Pa=31;else{fa=(ca+1048320|0)>>>16&8;T=ca<<fa;ca=(T+520192|0)>>>16&4;ea=T<<ca;T=(ea+245760|0)>>>16&2;Z=14-(ca|fa|T)+(ea<<T>>>15)|0;Pa=ia>>>(Z+7|0)&1|Z<<1}else Pa=0;Z=3040+(Pa<<2)|0;c[na+28>>2]=Pa;c[na+20>>2]=0;c[ma>>2]=0;T=c[685]|0;ea=1<<Pa;if(!(T&ea)){c[685]=T|ea;c[Z>>2]=na;c[na+24>>2]=Z;c[na+12>>2]=na;c[na+8>>2]=na;break}ea=c[Z>>2]|0;k:do if((c[ea+4>>2]&-8|0)!=(ia|0)){Z=ia<<((Pa|0)==31?0:25-(Pa>>>1)|0);T=ea;while(1){fa=T+16+(Z>>>31<<2)|0;ca=c[fa>>2]|0;if(!ca){Qa=fa;Ra=T;break}if((c[ca+4>>2]&-8|0)==(ia|0)){Sa=ca;break k}else{Z=Z<<1;T=ca}}if(Qa>>>0<(c[688]|0)>>>0)Cb();else{c[Qa>>2]=na;c[na+24>>2]=Ra;c[na+12>>2]=na;c[na+8>>2]=na;break g}}else Sa=ea;while(0);ea=Sa+8|0;ia=c[ea>>2]|0;ma=c[688]|0;if(ia>>>0>=ma>>>0&Sa>>>0>=ma>>>0){c[ia+12>>2]=na;c[ea>>2]=na;c[na+8>>2]=ia;c[na+12>>2]=Sa;c[na+24>>2]=0;break}else Cb()}}else{ia=c[688]|0;if((ia|0)==0|ga>>>0<ia>>>0)c[688]=ga;c[796]=ga;c[797]=ha;c[799]=0;c[693]=c[802];c[692]=-1;ia=0;do{ea=ia<<1;ma=2776+(ea<<2)|0;c[2776+(ea+3<<2)>>2]=ma;c[2776+(ea+2<<2)>>2]=ma;ia=ia+1|0}while((ia|0)!=32);ia=ga+8|0;ma=(ia&7|0)==0?0:0-ia&7;ia=ha+-40-ma|0;c[690]=ga+ma;c[687]=ia;c[ga+(ma+4)>>2]=ia|1;c[ga+(ha+-36)>>2]=40;c[691]=c[806]}while(0);ha=c[687]|0;if(ha>>>0>F>>>0){ga=ha-F|0;c[687]=ga;ha=c[690]|0;c[690]=ha+F;c[ha+(F+4)>>2]=ga|1;c[ha+4>>2]=F|3;n=ha+8|0;return n|0}}c[(tb()|0)>>2]=12;n=0;return n|0}function hc(b,e,f,g,h,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0;p=i;i=i+512|0;q=p+496|0;r=p+96|0;s=p+88|0;t=p+80|0;u=p+76|0;v=p+500|0;w=p+72|0;x=p+68|0;y=p+56|0;z=p+44|0;A=p+32|0;B=p+20|0;C=p+8|0;D=p+4|0;E=p;c[q>>2]=o;c[s>>2]=r;o=s+4|0;c[o>>2]=100;c[t>>2]=r;c[u>>2]=r+400;c[y>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;c[z>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;c[A>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;c[B>>2]=0;c[B+4>>2]=0;c[B+8>>2]=0;c[C>>2]=0;c[C+4>>2]=0;c[C+8>>2]=0;zc(f,g,v,w,x,y,z,A,B,D);c[n>>2]=c[m>>2];g=A+4|0;f=B+4|0;F=B+8|0;G=A+8|0;H=(h&512|0)!=0;h=z+8|0;I=z+4|0;J=C+4|0;K=C+8|0;L=v+3|0;M=y+4|0;N=r;r=0;O=0;a:while(1){P=c[b>>2]|0;do if(P){Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0))R=Wb[c[(c[P>>2]|0)+36>>2]&63](P)|0;else R=c[Q>>2]|0;if((R|0)==-1){c[b>>2]=0;S=1;break}else{S=(c[b>>2]|0)==0;break}}else S=1;while(0);P=c[e>>2]|0;do if(P){Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0))T=Wb[c[(c[P>>2]|0)+36>>2]&63](P)|0;else T=c[Q>>2]|0;if((T|0)!=-1)if(S){U=P;break}else{V=N;W=O;X=217;break a}else{c[e>>2]=0;X=15;break}}else X=15;while(0);if((X|0)==15){X=0;if(S){V=N;W=O;X=217;break}else U=0}b:do switch(a[v+r>>0]|0){case 1:{if((r|0)==3){Y=N;Z=O}else{P=c[b>>2]|0;Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0))_=Wb[c[(c[P>>2]|0)+36>>2]&63](P)|0;else _=c[Q>>2]|0;if(!(Pb[c[(c[l>>2]|0)+12>>2]&31](l,8192,_)|0)){X=28;break a}Q=c[b>>2]|0;P=Q+12|0;$=c[P>>2]|0;if(($|0)==(c[Q+16>>2]|0))aa=Wb[c[(c[Q>>2]|0)+40>>2]&63](Q)|0;else{c[P>>2]=$+4;aa=c[$>>2]|0}xf(C,aa);ba=U;ca=U;X=30}break}case 0:{if((r|0)==3){Y=N;Z=O}else{ba=U;ca=U;X=30}break}case 3:{$=a[A>>0]|0;P=($&1)==0?($&255)>>>1:c[g>>2]|0;Q=a[B>>0]|0;da=(Q&1)==0?(Q&255)>>>1:c[f>>2]|0;if((P|0)==(0-da|0)){Y=N;Z=O}else{Q=(P|0)==0;P=c[b>>2]|0;ea=c[P+12>>2]|0;fa=c[P+16>>2]|0;ga=(ea|0)==(fa|0);if(Q|(da|0)==0){if(ga)ha=Wb[c[(c[P>>2]|0)+36>>2]&63](P)|0;else ha=c[ea>>2]|0;if(Q){if((ha|0)!=(c[((a[B>>0]&1)==0?f:c[F>>2]|0)>>2]|0)){Y=N;Z=O;break b}Q=c[b>>2]|0;da=Q+12|0;ia=c[da>>2]|0;if((ia|0)==(c[Q+16>>2]|0))Wb[c[(c[Q>>2]|0)+40>>2]&63](Q)|0;else c[da>>2]=ia+4;a[k>>0]=1;ia=a[B>>0]|0;Y=N;Z=((ia&1)==0?(ia&255)>>>1:c[f>>2]|0)>>>0>1?B:O;break b}if((ha|0)!=(c[((a[A>>0]&1)==0?g:c[G>>2]|0)>>2]|0)){a[k>>0]=1;Y=N;Z=O;break b}ia=c[b>>2]|0;da=ia+12|0;Q=c[da>>2]|0;if((Q|0)==(c[ia+16>>2]|0))Wb[c[(c[ia>>2]|0)+40>>2]&63](ia)|0;else c[da>>2]=Q+4;Q=a[A>>0]|0;Y=N;Z=((Q&1)==0?(Q&255)>>>1:c[g>>2]|0)>>>0>1?A:O;break b}if(ga){ga=Wb[c[(c[P>>2]|0)+36>>2]&63](P)|0;Q=c[b>>2]|0;ja=ga;ka=a[A>>0]|0;la=Q;ma=c[Q+12>>2]|0;na=c[Q+16>>2]|0}else{ja=c[ea>>2]|0;ka=$;la=P;ma=ea;na=fa}fa=la+12|0;ea=(ma|0)==(na|0);if((ja|0)==(c[((ka&1)==0?g:c[G>>2]|0)>>2]|0)){if(ea)Wb[c[(c[la>>2]|0)+40>>2]&63](la)|0;else c[fa>>2]=ma+4;fa=a[A>>0]|0;Y=N;Z=((fa&1)==0?(fa&255)>>>1:c[g>>2]|0)>>>0>1?A:O;break b}if(ea)oa=Wb[c[(c[la>>2]|0)+36>>2]&63](la)|0;else oa=c[ma>>2]|0;if((oa|0)!=(c[((a[B>>0]&1)==0?f:c[F>>2]|0)>>2]|0)){X=86;break a}ea=c[b>>2]|0;fa=ea+12|0;P=c[fa>>2]|0;if((P|0)==(c[ea+16>>2]|0))Wb[c[(c[ea>>2]|0)+40>>2]&63](ea)|0;else c[fa>>2]=P+4;a[k>>0]=1;P=a[B>>0]|0;Y=N;Z=((P&1)==0?(P&255)>>>1:c[f>>2]|0)>>>0>1?B:O}break}case 2:{if(!(r>>>0<2|(O|0)!=0)?!(H|(r|0)==2&(a[L>>0]|0)!=0):0){Y=N;Z=0;break b}P=a[z>>0]|0;fa=c[h>>2]|0;ea=(P&1)==0?I:fa;$=ea;c:do if((r|0)!=0?(d[v+(r+-1)>>0]|0)<2:0){Q=(P&1)==0;d:do if((ea|0)==((Q?I:fa)+((Q?(P&255)>>>1:c[I>>2]|0)<<2)|0)){pa=P;qa=fa;ra=$}else{ga=ea;da=$;while(1){if(!(Pb[c[(c[l>>2]|0)+12>>2]&31](l,8192,c[ga>>2]|0)|0)){sa=da;break}ga=ga+4|0;ia=ga;ta=a[z>>0]|0;ua=c[h>>2]|0;va=(ta&1)==0;if((ga|0)==((va?I:ua)+((va?(ta&255)>>>1:c[I>>2]|0)<<2)|0)){pa=ta;qa=ua;ra=ia;break d}else da=ia}pa=a[z>>0]|0;qa=c[h>>2]|0;ra=sa}while(0);Q=(pa&1)==0?I:qa;da=Q;ga=ra-da>>2;ia=a[C>>0]|0;ua=(ia&1)==0;ta=ua?(ia&255)>>>1:c[J>>2]|0;if(ta>>>0>=ga>>>0){ia=ua?J:c[K>>2]|0;ua=ia+(ta<<2)|0;if(!ga){wa=qa;xa=pa;ya=ra}else{va=Q;Q=ia+(ta-ga<<2)|0;while(1){if((c[Q>>2]|0)!=(c[va>>2]|0)){wa=qa;xa=pa;ya=da;break c}Q=Q+4|0;if((Q|0)==(ua|0)){wa=qa;xa=pa;ya=ra;break}else va=va+4|0}}}else{wa=qa;xa=pa;ya=da}}else{wa=fa;xa=P;ya=$}while(0);$=(xa&1)==0;P=($?I:wa)+(($?(xa&255)>>>1:c[I>>2]|0)<<2)|0;$=ya;e:do if(($|0)==(P|0))za=P;else{fa=U;ea=U;va=$;while(1){ua=c[b>>2]|0;do if(ua){Q=c[ua+12>>2]|0;if((Q|0)==(c[ua+16>>2]|0))Aa=Wb[c[(c[ua>>2]|0)+36>>2]&63](ua)|0;else Aa=c[Q>>2]|0;if((Aa|0)==-1){c[b>>2]=0;Ba=1;break}else{Ba=(c[b>>2]|0)==0;break}}else Ba=1;while(0);do if(ea){ua=c[ea+12>>2]|0;if((ua|0)==(c[ea+16>>2]|0))Ca=Wb[c[(c[ea>>2]|0)+36>>2]&63](ea)|0;else Ca=c[ua>>2]|0;if((Ca|0)!=-1)if(Ba^(fa|0)==0){Da=fa;Ea=fa;break}else{za=va;break e}else{c[e>>2]=0;Fa=0;X=114;break}}else{Fa=fa;X=114}while(0);if((X|0)==114){X=0;if(Ba){za=va;break e}else{Da=Fa;Ea=0}}ua=c[b>>2]|0;Q=c[ua+12>>2]|0;if((Q|0)==(c[ua+16>>2]|0))Ga=Wb[c[(c[ua>>2]|0)+36>>2]&63](ua)|0;else Ga=c[Q>>2]|0;if((Ga|0)!=(c[va>>2]|0)){za=va;break e}Q=c[b>>2]|0;ua=Q+12|0;ga=c[ua>>2]|0;if((ga|0)==(c[Q+16>>2]|0))Wb[c[(c[Q>>2]|0)+40>>2]&63](Q)|0;else c[ua>>2]=ga+4;va=va+4|0;ga=a[z>>0]|0;ua=(ga&1)==0;Q=(ua?I:c[h>>2]|0)+((ua?(ga&255)>>>1:c[I>>2]|0)<<2)|0;if((va|0)==(Q|0)){za=Q;break}else{fa=Da;ea=Ea}}}while(0);if(H?($=a[z>>0]|0,P=($&1)==0,(za|0)!=((P?I:c[h>>2]|0)+((P?($&255)>>>1:c[I>>2]|0)<<2)|0)):0){X=126;break a}else{Y=N;Z=O}break}case 4:{$=c[x>>2]|0;P=U;ea=U;fa=N;va=0;f:while(1){da=c[b>>2]|0;do if(da){Q=c[da+12>>2]|0;if((Q|0)==(c[da+16>>2]|0))Ha=Wb[c[(c[da>>2]|0)+36>>2]&63](da)|0;else Ha=c[Q>>2]|0;if((Ha|0)==-1){c[b>>2]=0;Ia=1;break}else{Ia=(c[b>>2]|0)==0;break}}else Ia=1;while(0);do if(ea){da=c[ea+12>>2]|0;if((da|0)==(c[ea+16>>2]|0))Ja=Wb[c[(c[ea>>2]|0)+36>>2]&63](ea)|0;else Ja=c[da>>2]|0;if((Ja|0)!=-1)if(Ia^(P|0)==0){Ka=P;La=P;break}else{Ma=fa;Na=P;Oa=va;break f}else{c[e>>2]=0;Pa=0;X=140;break}}else{Pa=P;X=140}while(0);if((X|0)==140){X=0;if(Ia){Ma=fa;Na=Pa;Oa=va;break}else{Ka=Pa;La=0}}da=c[b>>2]|0;Q=c[da+12>>2]|0;if((Q|0)==(c[da+16>>2]|0))Qa=Wb[c[(c[da>>2]|0)+36>>2]&63](da)|0;else Qa=c[Q>>2]|0;if(Pb[c[(c[l>>2]|0)+12>>2]&31](l,2048,Qa)|0){Q=c[n>>2]|0;if((Q|0)==(c[q>>2]|0)){Ff(m,n,q);Ra=c[n>>2]|0}else Ra=Q;c[n>>2]=Ra+4;c[Ra>>2]=Qa;Sa=fa;Ta=va+1|0}else{Q=a[y>>0]|0;if(!((Qa|0)==($|0)&((va|0)!=0?(((Q&1)==0?(Q&255)>>>1:c[M>>2]|0)|0)!=0:0))){Ma=fa;Na=Ka;Oa=va;break}if((fa|0)==(c[u>>2]|0)){Gf(s,t,u);Ua=c[t>>2]|0}else Ua=fa;Q=Ua+4|0;c[t>>2]=Q;c[Ua>>2]=va;Sa=Q;Ta=0}Q=c[b>>2]|0;da=Q+12|0;ga=c[da>>2]|0;if((ga|0)==(c[Q+16>>2]|0)){Wb[c[(c[Q>>2]|0)+40>>2]&63](Q)|0;P=Ka;ea=La;fa=Sa;va=Ta;continue}else{c[da>>2]=ga+4;P=Ka;ea=La;fa=Sa;va=Ta;continue}}if((Oa|0)!=0?(c[s>>2]|0)!=(Ma|0):0){if((Ma|0)==(c[u>>2]|0)){Gf(s,t,u);Va=c[t>>2]|0}else Va=Ma;va=Va+4|0;c[t>>2]=va;c[Va>>2]=Oa;Wa=va}else Wa=Ma;va=c[D>>2]|0;if((va|0)>0){fa=c[b>>2]|0;do if(fa){ea=c[fa+12>>2]|0;if((ea|0)==(c[fa+16>>2]|0))Xa=Wb[c[(c[fa>>2]|0)+36>>2]&63](fa)|0;else Xa=c[ea>>2]|0;if((Xa|0)==-1){c[b>>2]=0;Ya=1;break}else{Ya=(c[b>>2]|0)==0;break}}else Ya=1;while(0);do if(Na){fa=c[Na+12>>2]|0;if((fa|0)==(c[Na+16>>2]|0))Za=Wb[c[(c[Na>>2]|0)+36>>2]&63](Na)|0;else Za=c[fa>>2]|0;if((Za|0)!=-1)if(Ya){_a=Na;break}else{X=180;break a}else{c[e>>2]=0;X=174;break}}else X=174;while(0);if((X|0)==174){X=0;if(Ya){X=180;break a}else _a=0}fa=c[b>>2]|0;ea=c[fa+12>>2]|0;if((ea|0)==(c[fa+16>>2]|0))$a=Wb[c[(c[fa>>2]|0)+36>>2]&63](fa)|0;else $a=c[ea>>2]|0;if(($a|0)!=(c[w>>2]|0)){X=180;break a}ea=c[b>>2]|0;fa=ea+12|0;P=c[fa>>2]|0;if((P|0)==(c[ea+16>>2]|0))Wb[c[(c[ea>>2]|0)+40>>2]&63](ea)|0;else c[fa>>2]=P+4;if((va|0)>0){P=_a;fa=_a;ea=va;while(1){$=c[b>>2]|0;do if($){ga=c[$+12>>2]|0;if((ga|0)==(c[$+16>>2]|0))ab=Wb[c[(c[$>>2]|0)+36>>2]&63]($)|0;else ab=c[ga>>2]|0;if((ab|0)==-1){c[b>>2]=0;bb=1;break}else{bb=(c[b>>2]|0)==0;break}}else bb=1;while(0);do if(fa){$=c[fa+12>>2]|0;if(($|0)==(c[fa+16>>2]|0))cb=Wb[c[(c[fa>>2]|0)+36>>2]&63](fa)|0;else cb=c[$>>2]|0;if((cb|0)!=-1)if(bb^(P|0)==0){db=P;eb=P;break}else{X=204;break a}else{c[e>>2]=0;fb=0;X=198;break}}else{fb=P;X=198}while(0);if((X|0)==198){X=0;if(bb){X=204;break a}else{db=fb;eb=0}}$=c[b>>2]|0;ga=c[$+12>>2]|0;if((ga|0)==(c[$+16>>2]|0))gb=Wb[c[(c[$>>2]|0)+36>>2]&63]($)|0;else gb=c[ga>>2]|0;if(!(Pb[c[(c[l>>2]|0)+12>>2]&31](l,2048,gb)|0)){X=204;break a}if((c[n>>2]|0)==(c[q>>2]|0))Ff(m,n,q);ga=c[b>>2]|0;$=c[ga+12>>2]|0;if(($|0)==(c[ga+16>>2]|0))hb=Wb[c[(c[ga>>2]|0)+36>>2]&63](ga)|0;else hb=c[$>>2]|0;$=c[n>>2]|0;c[n>>2]=$+4;c[$>>2]=hb;$=ea;ea=ea+-1|0;c[D>>2]=ea;ga=c[b>>2]|0;da=ga+12|0;Q=c[da>>2]|0;if((Q|0)==(c[ga+16>>2]|0))Wb[c[(c[ga>>2]|0)+40>>2]&63](ga)|0;else c[da>>2]=Q+4;if(($|0)<=1)break;else{P=db;fa=eb}}}}if((c[n>>2]|0)==(c[m>>2]|0)){X=215;break a}else{Y=Wa;Z=O}break}default:{Y=N;Z=O}}while(0);g:do if((X|0)==30)while(1){X=0;fa=c[b>>2]|0;do if(fa){P=c[fa+12>>2]|0;if((P|0)==(c[fa+16>>2]|0))ib=Wb[c[(c[fa>>2]|0)+36>>2]&63](fa)|0;else ib=c[P>>2]|0;if((ib|0)==-1){c[b>>2]=0;jb=1;break}else{jb=(c[b>>2]|0)==0;break}}else jb=1;while(0);do if(ca){fa=c[ca+12>>2]|0;if((fa|0)==(c[ca+16>>2]|0))kb=Wb[c[(c[ca>>2]|0)+36>>2]&63](ca)|0;else kb=c[fa>>2]|0;if((kb|0)!=-1)if(jb^(ba|0)==0){lb=ba;mb=ba;break}else{Y=N;Z=O;break g}else{c[e>>2]=0;nb=0;X=43;break}}else{nb=ba;X=43}while(0);if((X|0)==43){X=0;if(jb){Y=N;Z=O;break g}else{lb=nb;mb=0}}fa=c[b>>2]|0;P=c[fa+12>>2]|0;if((P|0)==(c[fa+16>>2]|0))ob=Wb[c[(c[fa>>2]|0)+36>>2]&63](fa)|0;else ob=c[P>>2]|0;if(!(Pb[c[(c[l>>2]|0)+12>>2]&31](l,8192,ob)|0)){Y=N;Z=O;break g}P=c[b>>2]|0;fa=P+12|0;ea=c[fa>>2]|0;if((ea|0)==(c[P+16>>2]|0))pb=Wb[c[(c[P>>2]|0)+40>>2]&63](P)|0;else{c[fa>>2]=ea+4;pb=c[ea>>2]|0}xf(C,pb);ba=lb;ca=mb;X=30}while(0);r=r+1|0;if(r>>>0>=4){V=Y;W=Z;X=217;break}else{N=Y;O=Z}}h:do if((X|0)==28){c[j>>2]=c[j>>2]|4;qb=0}else if((X|0)==86){c[j>>2]=c[j>>2]|4;qb=0}else if((X|0)==126){c[j>>2]=c[j>>2]|4;qb=0}else if((X|0)==180){c[j>>2]=c[j>>2]|4;qb=0}else if((X|0)==204){c[j>>2]=c[j>>2]|4;qb=0}else if((X|0)==215){c[j>>2]=c[j>>2]|4;qb=0}else if((X|0)==217){i:do if(W){Z=W+4|0;O=W+8|0;Y=1;j:while(1){N=a[W>>0]|0;if(!(N&1))rb=(N&255)>>>1;else rb=c[Z>>2]|0;if(Y>>>0>=rb>>>0)break i;N=c[b>>2]|0;do if(N){r=c[N+12>>2]|0;if((r|0)==(c[N+16>>2]|0))sb=Wb[c[(c[N>>2]|0)+36>>2]&63](N)|0;else sb=c[r>>2]|0;if((sb|0)==-1){c[b>>2]=0;tb=1;break}else{tb=(c[b>>2]|0)==0;break}}else tb=1;while(0);N=c[e>>2]|0;do if(N){r=c[N+12>>2]|0;if((r|0)==(c[N+16>>2]|0))ub=Wb[c[(c[N>>2]|0)+36>>2]&63](N)|0;else ub=c[r>>2]|0;if((ub|0)!=-1)if(tb)break;else break j;else{c[e>>2]=0;X=236;break}}else X=236;while(0);if((X|0)==236?(X=0,tb):0)break;N=c[b>>2]|0;r=c[N+12>>2]|0;if((r|0)==(c[N+16>>2]|0))vb=Wb[c[(c[N>>2]|0)+36>>2]&63](N)|0;else vb=c[r>>2]|0;if(!(a[W>>0]&1))wb=Z;else wb=c[O>>2]|0;if((vb|0)!=(c[wb+(Y<<2)>>2]|0))break;r=Y+1|0;N=c[b>>2]|0;mb=N+12|0;ca=c[mb>>2]|0;if((ca|0)==(c[N+16>>2]|0)){Wb[c[(c[N>>2]|0)+40>>2]&63](N)|0;Y=r;continue}else{c[mb>>2]=ca+4;Y=r;continue}}c[j>>2]=c[j>>2]|4;qb=0;break h}while(0);Y=c[s>>2]|0;if((Y|0)!=(V|0)?(c[E>>2]=0,ae(y,Y,V,E),(c[E>>2]|0)!=0):0){c[j>>2]=c[j>>2]|4;qb=0}else qb=1}while(0);tl(C);tl(B);tl(A);tl(z);ul(y);y=c[s>>2]|0;c[s>>2]=0;if(y)Sb[c[o>>2]&127](y);i=p;return qb|0}function ic(e,f,g,h,j,k,l,m,n,o,p){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0;q=i;i=i+512|0;r=q+88|0;s=q+96|0;t=q+80|0;u=q+72|0;v=q+68|0;w=q+500|0;x=q+497|0;y=q+496|0;z=q+56|0;A=q+44|0;B=q+32|0;C=q+20|0;D=q+8|0;E=q+4|0;F=q;c[r>>2]=p;c[t>>2]=s;p=t+4|0;c[p>>2]=100;c[u>>2]=s;c[v>>2]=s+400;c[z>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;c[A>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;c[B>>2]=0;c[B+4>>2]=0;c[B+8>>2]=0;c[C>>2]=0;c[C+4>>2]=0;c[C+8>>2]=0;c[D>>2]=0;c[D+4>>2]=0;c[D+8>>2]=0;xc(g,h,w,x,y,z,A,B,C,E);c[o>>2]=c[n>>2];h=m+8|0;m=B+4|0;g=C+4|0;G=C+8|0;H=C+1|0;I=B+8|0;J=B+1|0;K=(j&512|0)!=0;j=A+8|0;L=A+1|0;M=A+4|0;N=D+4|0;O=D+8|0;P=D+1|0;Q=w+3|0;R=z+4|0;S=s;s=0;T=0;a:while(1){U=c[e>>2]|0;do if(U)if((c[U+12>>2]|0)==(c[U+16>>2]|0))if((Wb[c[(c[U>>2]|0)+36>>2]&63](U)|0)==-1){c[e>>2]=0;V=0;break}else{V=c[e>>2]|0;break}else V=U;else V=0;while(0);U=(V|0)==0;W=c[f>>2]|0;do if(W){if((c[W+12>>2]|0)!=(c[W+16>>2]|0))if(U){X=W;break}else{Y=S;Z=T;_=202;break a}if((Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0)!=-1)if(U){X=W;break}else{Y=S;Z=T;_=202;break a}else{c[f>>2]=0;_=12;break}}else _=12;while(0);if((_|0)==12){_=0;if(U){Y=S;Z=T;_=202;break}else X=0}b:do switch(a[w+s>>0]|0){case 1:{if((s|0)==3){$=S;aa=T}else{W=c[e>>2]|0;ba=c[W+12>>2]|0;if((ba|0)==(c[W+16>>2]|0))ca=Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0;else ca=d[ba>>0]|0;if((ca&255)<<24>>24<=-1){_=26;break a}if(!(b[(c[h>>2]|0)+(ca<<24>>24<<1)>>1]&8192)){_=26;break a}ba=c[e>>2]|0;W=ba+12|0;da=c[W>>2]|0;if((da|0)==(c[ba+16>>2]|0))ea=Wb[c[(c[ba>>2]|0)+40>>2]&63](ba)|0;else{c[W>>2]=da+1;ea=d[da>>0]|0}zf(D,ea&255);fa=X;ga=X;_=28}break}case 0:{if((s|0)==3){$=S;aa=T}else{fa=X;ga=X;_=28}break}case 3:{da=a[B>>0]|0;W=(da&1)==0?(da&255)>>>1:c[m>>2]|0;ba=a[C>>0]|0;ha=(ba&1)==0?(ba&255)>>>1:c[g>>2]|0;if((W|0)==(0-ha|0)){$=S;aa=T}else{ba=(W|0)==0;W=c[e>>2]|0;ia=c[W+12>>2]|0;ja=c[W+16>>2]|0;ka=(ia|0)==(ja|0);if(ba|(ha|0)==0){if(ka)la=Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0;else la=d[ia>>0]|0;ha=la&255;if(ba){if(ha<<24>>24!=(a[((a[C>>0]&1)==0?H:c[G>>2]|0)>>0]|0)){$=S;aa=T;break b}ba=c[e>>2]|0;ma=ba+12|0;na=c[ma>>2]|0;if((na|0)==(c[ba+16>>2]|0))Wb[c[(c[ba>>2]|0)+40>>2]&63](ba)|0;else c[ma>>2]=na+1;a[l>>0]=1;na=a[C>>0]|0;$=S;aa=((na&1)==0?(na&255)>>>1:c[g>>2]|0)>>>0>1?C:T;break b}if(ha<<24>>24!=(a[((a[B>>0]&1)==0?J:c[I>>2]|0)>>0]|0)){a[l>>0]=1;$=S;aa=T;break b}ha=c[e>>2]|0;na=ha+12|0;ma=c[na>>2]|0;if((ma|0)==(c[ha+16>>2]|0))Wb[c[(c[ha>>2]|0)+40>>2]&63](ha)|0;else c[na>>2]=ma+1;ma=a[B>>0]|0;$=S;aa=((ma&1)==0?(ma&255)>>>1:c[m>>2]|0)>>>0>1?B:T;break b}if(ka){ka=Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0;ma=c[e>>2]|0;oa=ka;pa=a[B>>0]|0;qa=ma;ra=c[ma+12>>2]|0;sa=c[ma+16>>2]|0}else{oa=d[ia>>0]|0;pa=da;qa=W;ra=ia;sa=ja}ja=qa+12|0;ia=(ra|0)==(sa|0);if((oa&255)<<24>>24==(a[((pa&1)==0?J:c[I>>2]|0)>>0]|0)){if(ia)Wb[c[(c[qa>>2]|0)+40>>2]&63](qa)|0;else c[ja>>2]=ra+1;ja=a[B>>0]|0;$=S;aa=((ja&1)==0?(ja&255)>>>1:c[m>>2]|0)>>>0>1?B:T;break b}if(ia)ta=Wb[c[(c[qa>>2]|0)+36>>2]&63](qa)|0;else ta=d[ra>>0]|0;if((ta&255)<<24>>24!=(a[((a[C>>0]&1)==0?H:c[G>>2]|0)>>0]|0)){_=82;break a}ia=c[e>>2]|0;ja=ia+12|0;W=c[ja>>2]|0;if((W|0)==(c[ia+16>>2]|0))Wb[c[(c[ia>>2]|0)+40>>2]&63](ia)|0;else c[ja>>2]=W+1;a[l>>0]=1;W=a[C>>0]|0;$=S;aa=((W&1)==0?(W&255)>>>1:c[g>>2]|0)>>>0>1?C:T}break}case 2:{if(!(s>>>0<2|(T|0)!=0)?!(K|(s|0)==2&(a[Q>>0]|0)!=0):0){$=S;aa=0;break b}W=a[A>>0]|0;ja=(W&1)==0;ia=c[j>>2]|0;da=ja?L:ia;ma=da;c:do if((s|0)!=0?(d[w+(s+-1)>>0]|0)<2:0){ka=ja?(W&255)>>>1:c[M>>2]|0;na=da+ka|0;ha=c[h>>2]|0;d:do if(!ka)ua=ma;else{ba=da;va=ma;while(1){wa=a[ba>>0]|0;if(wa<<24>>24<=-1){ua=va;break d}if(!(b[ha+(wa<<24>>24<<1)>>1]&8192)){ua=va;break d}ba=ba+1|0;wa=ba;if((ba|0)==(na|0)){ua=wa;break}else va=wa}}while(0);na=ua-ma|0;ha=a[D>>0]|0;ka=(ha&1)==0;va=ka?(ha&255)>>>1:c[N>>2]|0;if(va>>>0>=na>>>0){ha=ka?P:c[O>>2]|0;ka=ha+va|0;if((ua|0)==(ma|0))xa=ua;else{ba=da;wa=ha+(va-na)|0;while(1){if((a[wa>>0]|0)!=(a[ba>>0]|0)){xa=ma;break c}wa=wa+1|0;if((wa|0)==(ka|0)){xa=ua;break}else ba=ba+1|0}}}else xa=ma}else xa=ma;while(0);ma=(W&1)==0;da=(ma?L:ia)+(ma?(W&255)>>>1:c[M>>2]|0)|0;ma=xa;e:do if((ma|0)==(da|0))ya=da;else{ja=X;ba=X;ka=ma;while(1){wa=c[e>>2]|0;do if(wa)if((c[wa+12>>2]|0)==(c[wa+16>>2]|0))if((Wb[c[(c[wa>>2]|0)+36>>2]&63](wa)|0)==-1){c[e>>2]=0;za=0;break}else{za=c[e>>2]|0;break}else za=wa;else za=0;while(0);wa=(za|0)==0;do if(ba){if((c[ba+12>>2]|0)!=(c[ba+16>>2]|0))if(wa){Aa=ja;Ba=ba;break}else{ya=ka;break e}if((Wb[c[(c[ba>>2]|0)+36>>2]&63](ba)|0)!=-1)if(wa^(ja|0)==0){Aa=ja;Ba=ja;break}else{ya=ka;break e}else{c[f>>2]=0;Ca=0;_=107;break}}else{Ca=ja;_=107}while(0);if((_|0)==107){_=0;if(wa){ya=ka;break e}else{Aa=Ca;Ba=0}}na=c[e>>2]|0;va=c[na+12>>2]|0;if((va|0)==(c[na+16>>2]|0))Da=Wb[c[(c[na>>2]|0)+36>>2]&63](na)|0;else Da=d[va>>0]|0;if((Da&255)<<24>>24!=(a[ka>>0]|0)){ya=ka;break e}va=c[e>>2]|0;na=va+12|0;ha=c[na>>2]|0;if((ha|0)==(c[va+16>>2]|0))Wb[c[(c[va>>2]|0)+40>>2]&63](va)|0;else c[na>>2]=ha+1;ka=ka+1|0;ha=a[A>>0]|0;na=(ha&1)==0;va=(na?L:c[j>>2]|0)+(na?(ha&255)>>>1:c[M>>2]|0)|0;if((ka|0)==(va|0)){ya=va;break}else{ja=Aa;ba=Ba}}}while(0);if(K?(ma=a[A>>0]|0,da=(ma&1)==0,(ya|0)!=((da?L:c[j>>2]|0)+(da?(ma&255)>>>1:c[M>>2]|0)|0)):0){_=119;break a}else{$=S;aa=T}break}case 4:{ma=a[y>>0]|0;da=X;W=X;ia=S;ba=0;f:while(1){ja=c[e>>2]|0;do if(ja)if((c[ja+12>>2]|0)==(c[ja+16>>2]|0))if((Wb[c[(c[ja>>2]|0)+36>>2]&63](ja)|0)==-1){c[e>>2]=0;Ea=0;break}else{Ea=c[e>>2]|0;break}else Ea=ja;else Ea=0;while(0);ja=(Ea|0)==0;do if(W){if((c[W+12>>2]|0)!=(c[W+16>>2]|0))if(ja){Fa=da;Ga=W;break}else{Ha=ia;Ia=da;Ja=ba;break f}if((Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0)!=-1)if(ja^(da|0)==0){Fa=da;Ga=da;break}else{Ha=ia;Ia=da;Ja=ba;break f}else{c[f>>2]=0;Ka=0;_=130;break}}else{Ka=da;_=130}while(0);if((_|0)==130){_=0;if(ja){Ha=ia;Ia=Ka;Ja=ba;break}else{Fa=Ka;Ga=0}}ka=c[e>>2]|0;va=c[ka+12>>2]|0;if((va|0)==(c[ka+16>>2]|0))La=Wb[c[(c[ka>>2]|0)+36>>2]&63](ka)|0;else La=d[va>>0]|0;va=La&255;if(va<<24>>24>-1?(b[(c[h>>2]|0)+(La<<24>>24<<1)>>1]&2048)!=0:0){ka=c[o>>2]|0;if((ka|0)==(c[r>>2]|0)){Lf(n,o,r);Ma=c[o>>2]|0}else Ma=ka;c[o>>2]=Ma+1;a[Ma>>0]=va;Na=ia;Oa=ba+1|0}else{ka=a[z>>0]|0;if(!(va<<24>>24==ma<<24>>24&((ba|0)!=0?(((ka&1)==0?(ka&255)>>>1:c[R>>2]|0)|0)!=0:0))){Ha=ia;Ia=Fa;Ja=ba;break}if((ia|0)==(c[v>>2]|0)){Gf(t,u,v);Pa=c[u>>2]|0}else Pa=ia;ka=Pa+4|0;c[u>>2]=ka;c[Pa>>2]=ba;Na=ka;Oa=0}ka=c[e>>2]|0;va=ka+12|0;ha=c[va>>2]|0;if((ha|0)==(c[ka+16>>2]|0)){Wb[c[(c[ka>>2]|0)+40>>2]&63](ka)|0;da=Fa;W=Ga;ia=Na;ba=Oa;continue}else{c[va>>2]=ha+1;da=Fa;W=Ga;ia=Na;ba=Oa;continue}}if((Ja|0)!=0?(c[t>>2]|0)!=(Ha|0):0){if((Ha|0)==(c[v>>2]|0)){Gf(t,u,v);Qa=c[u>>2]|0}else Qa=Ha;ba=Qa+4|0;c[u>>2]=ba;c[Qa>>2]=Ja;Ra=ba}else Ra=Ha;ba=c[E>>2]|0;if((ba|0)>0){ia=c[e>>2]|0;do if(ia)if((c[ia+12>>2]|0)==(c[ia+16>>2]|0))if((Wb[c[(c[ia>>2]|0)+36>>2]&63](ia)|0)==-1){c[e>>2]=0;Sa=0;break}else{Sa=c[e>>2]|0;break}else Sa=ia;else Sa=0;while(0);ia=(Sa|0)==0;do if(Ia){if((c[Ia+12>>2]|0)==(c[Ia+16>>2]|0)?(Wb[c[(c[Ia>>2]|0)+36>>2]&63](Ia)|0)==-1:0){c[f>>2]=0;_=162;break}if(ia)Ta=Ia;else{_=167;break a}}else _=162;while(0);if((_|0)==162){_=0;if(ia){_=167;break a}else Ta=0}W=c[e>>2]|0;da=c[W+12>>2]|0;if((da|0)==(c[W+16>>2]|0))Ua=Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0;else Ua=d[da>>0]|0;if((Ua&255)<<24>>24!=(a[x>>0]|0)){_=167;break a}da=c[e>>2]|0;W=da+12|0;ma=c[W>>2]|0;if((ma|0)==(c[da+16>>2]|0))Wb[c[(c[da>>2]|0)+40>>2]&63](da)|0;else c[W>>2]=ma+1;if((ba|0)>0){ma=Ta;W=Ta;da=ba;while(1){ha=c[e>>2]|0;do if(ha)if((c[ha+12>>2]|0)==(c[ha+16>>2]|0))if((Wb[c[(c[ha>>2]|0)+36>>2]&63](ha)|0)==-1){c[e>>2]=0;Va=0;break}else{Va=c[e>>2]|0;break}else Va=ha;else Va=0;while(0);ha=(Va|0)==0;do if(W){if((c[W+12>>2]|0)!=(c[W+16>>2]|0))if(ha){Wa=ma;Xa=W;break}else{_=189;break a}if((Wb[c[(c[W>>2]|0)+36>>2]&63](W)|0)!=-1)if(ha^(ma|0)==0){Wa=ma;Xa=ma;break}else{_=189;break a}else{c[f>>2]=0;Ya=0;_=182;break}}else{Ya=ma;_=182}while(0);if((_|0)==182){_=0;if(ha){_=189;break a}else{Wa=Ya;Xa=0}}ja=c[e>>2]|0;va=c[ja+12>>2]|0;if((va|0)==(c[ja+16>>2]|0))Za=Wb[c[(c[ja>>2]|0)+36>>2]&63](ja)|0;else Za=d[va>>0]|0;if((Za&255)<<24>>24<=-1){_=189;break a}if(!(b[(c[h>>2]|0)+(Za<<24>>24<<1)>>1]&2048)){_=189;break a}if((c[o>>2]|0)==(c[r>>2]|0))Lf(n,o,r);va=c[e>>2]|0;ja=c[va+12>>2]|0;if((ja|0)==(c[va+16>>2]|0))_a=Wb[c[(c[va>>2]|0)+36>>2]&63](va)|0;else _a=d[ja>>0]|0;ja=c[o>>2]|0;c[o>>2]=ja+1;a[ja>>0]=_a;ja=da;da=da+-1|0;c[E>>2]=da;va=c[e>>2]|0;ka=va+12|0;na=c[ka>>2]|0;if((na|0)==(c[va+16>>2]|0))Wb[c[(c[va>>2]|0)+40>>2]&63](va)|0;else c[ka>>2]=na+1;if((ja|0)<=1)break;else{ma=Wa;W=Xa}}}}if((c[o>>2]|0)==(c[n>>2]|0)){_=200;break a}else{$=Ra;aa=T}break}default:{$=S;aa=T}}while(0);g:do if((_|0)==28)while(1){_=0;U=c[e>>2]|0;do if(U)if((c[U+12>>2]|0)==(c[U+16>>2]|0))if((Wb[c[(c[U>>2]|0)+36>>2]&63](U)|0)==-1){c[e>>2]=0;$a=0;break}else{$a=c[e>>2]|0;break}else $a=U;else $a=0;while(0);U=($a|0)==0;do if(ga){if((c[ga+12>>2]|0)!=(c[ga+16>>2]|0))if(U){ab=fa;bb=ga;break}else{$=S;aa=T;break g}if((Wb[c[(c[ga>>2]|0)+36>>2]&63](ga)|0)!=-1)if(U^(fa|0)==0){ab=fa;bb=fa;break}else{$=S;aa=T;break g}else{c[f>>2]=0;cb=0;_=38;break}}else{cb=fa;_=38}while(0);if((_|0)==38){_=0;if(U){$=S;aa=T;break g}else{ab=cb;bb=0}}ha=c[e>>2]|0;W=c[ha+12>>2]|0;if((W|0)==(c[ha+16>>2]|0))db=Wb[c[(c[ha>>2]|0)+36>>2]&63](ha)|0;else db=d[W>>0]|0;if((db&255)<<24>>24<=-1){$=S;aa=T;break g}if(!(b[(c[h>>2]|0)+(db<<24>>24<<1)>>1]&8192)){$=S;aa=T;break g}W=c[e>>2]|0;ha=W+12|0;ma=c[ha>>2]|0;if((ma|0)==(c[W+16>>2]|0))eb=Wb[c[(c[W>>2]|0)+40>>2]&63](W)|0;else{c[ha>>2]=ma+1;eb=d[ma>>0]|0}zf(D,eb&255);fa=ab;ga=bb;_=28}while(0);s=s+1|0;if(s>>>0>=4){Y=$;Z=aa;_=202;break}else{S=$;T=aa}}h:do if((_|0)==26){c[k>>2]=c[k>>2]|4;fb=0}else if((_|0)==82){c[k>>2]=c[k>>2]|4;fb=0}else if((_|0)==119){c[k>>2]=c[k>>2]|4;fb=0}else if((_|0)==167){c[k>>2]=c[k>>2]|4;fb=0}else if((_|0)==189){c[k>>2]=c[k>>2]|4;fb=0}else if((_|0)==200){c[k>>2]=c[k>>2]|4;fb=0}else if((_|0)==202){i:do if(Z){aa=Z+1|0;T=Z+8|0;$=Z+4|0;S=1;j:while(1){s=a[Z>>0]|0;if(!(s&1))gb=(s&255)>>>1;else gb=c[$>>2]|0;if(S>>>0>=gb>>>0)break i;s=c[e>>2]|0;do if(s)if((c[s+12>>2]|0)==(c[s+16>>2]|0))if((Wb[c[(c[s>>2]|0)+36>>2]&63](s)|0)==-1){c[e>>2]=0;hb=0;break}else{hb=c[e>>2]|0;break}else hb=s;else hb=0;while(0);s=(hb|0)==0;U=c[f>>2]|0;do if(U){if((c[U+12>>2]|0)==(c[U+16>>2]|0)?(Wb[c[(c[U>>2]|0)+36>>2]&63](U)|0)==-1:0){c[f>>2]=0;_=218;break}if(!s)break j}else _=218;while(0);if((_|0)==218?(_=0,s):0)break;U=c[e>>2]|0;bb=c[U+12>>2]|0;if((bb|0)==(c[U+16>>2]|0))ib=Wb[c[(c[U>>2]|0)+36>>2]&63](U)|0;else ib=d[bb>>0]|0;if(!(a[Z>>0]&1))jb=aa;else jb=c[T>>2]|0;if((ib&255)<<24>>24!=(a[jb+S>>0]|0))break;bb=S+1|0;U=c[e>>2]|0;ga=U+12|0;ab=c[ga>>2]|0;if((ab|0)==(c[U+16>>2]|0)){Wb[c[(c[U>>2]|0)+40>>2]&63](U)|0;S=bb;continue}else{c[ga>>2]=ab+1;S=bb;continue}}c[k>>2]=c[k>>2]|4;fb=0;break h}while(0);S=c[t>>2]|0;if((S|0)!=(Y|0)?(c[F>>2]=0,ae(z,S,Y,F),(c[F>>2]|0)!=0):0){c[k>>2]=c[k>>2]|4;fb=0}else fb=1}while(0);ul(D);ul(C);ul(B);ul(A);ul(z);z=c[t>>2]|0;c[t>>2]=0;if(z)Sb[c[p>>2]&127](z);i=q;return fb|0}function jc(e,f,j){e=e|0;f=f|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0.0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0;k=i;i=i+304|0;l=k+16|0;m=k+8|0;n=k+33|0;o=k;p=k+32|0;q=a[f>>0]|0;if(!(q<<24>>24)){r=0;i=k;return r|0}s=e+4|0;t=e+100|0;u=e+108|0;v=e+8|0;w=n+10|0;x=n+33|0;y=m+4|0;z=n+46|0;A=n+94|0;B=q;q=0;C=f;f=0;D=0;E=0;a:while(1){b:do if(!(Tn(B&255)|0)){F=(a[C>>0]|0)==37;c:do if(F){H=C+1|0;I=a[H>>0]|0;d:do switch(I<<24>>24){case 37:{break c;break}case 42:{J=0;K=C+2|0;break}default:{L=(I&255)+-48|0;if(L>>>0<10?(a[C+2>>0]|0)==36:0){c[l>>2]=c[j>>2];M=L;while(1){L=(c[l>>2]|0)+(4-1)&~(4-1);N=c[L>>2]|0;c[l>>2]=L+4;if(M>>>0>1)M=M+-1|0;else{O=N;break}}J=O;K=C+3|0;break d}M=(c[j>>2]|0)+(4-1)&~(4-1);N=c[M>>2]|0;c[j>>2]=M+4;J=N;K=H}}while(0);H=a[K>>0]|0;I=H&255;if((I+-48|0)>>>0<10){N=I;I=K;M=0;while(1){L=(M*10|0)+-48+N|0;P=I+1|0;Q=a[P>>0]|0;N=Q&255;if((N+-48|0)>>>0>=10){R=Q;S=P;T=L;break}else{I=P;M=L}}}else{R=H;S=K;T=0}if(R<<24>>24==109){M=S+1|0;U=a[M>>0]|0;V=(J|0)!=0&1;W=M;X=0;Y=0}else{U=R;V=0;W=S;X=D;Y=E}M=W+1|0;switch(U&255|0){case 104:{I=(a[M>>0]|0)==104;Z=I?W+2|0:M;_=I?-2:-1;break}case 108:{I=(a[M>>0]|0)==108;Z=I?W+2|0:M;_=I?3:1;break}case 106:{Z=M;_=3;break}case 116:case 122:{Z=M;_=1;break}case 76:{Z=M;_=2;break}case 110:case 112:case 67:case 83:case 91:case 99:case 115:case 88:case 71:case 70:case 69:case 65:case 103:case 102:case 101:case 97:case 120:case 117:case 111:case 105:case 100:{Z=W;_=0;break}default:{$=V;aa=q;ba=X;ca=Y;da=164;break a}}M=d[Z>>0]|0;I=(M&47|0)==3;N=I?M|32:M;M=I?1:_;switch(N|0){case 99:{ea=f;fa=(T|0)<1?1:T;break}case 91:{ea=f;fa=T;break}case 110:{if(!J){ga=q;ha=Z;ia=f;ja=X;ka=Y;break b}switch(M|0){case -2:{a[J>>0]=f;ga=q;ha=Z;ia=f;ja=X;ka=Y;break b;break}case -1:{b[J>>1]=f;ga=q;ha=Z;ia=f;ja=X;ka=Y;break b;break}case 0:{c[J>>2]=f;ga=q;ha=Z;ia=f;ja=X;ka=Y;break b;break}case 1:{c[J>>2]=f;ga=q;ha=Z;ia=f;ja=X;ka=Y;break b;break}case 3:{I=J;c[I>>2]=f;c[I+4>>2]=((f|0)<0)<<31>>31;ga=q;ha=Z;ia=f;ja=X;ka=Y;break b;break}default:{ga=q;ha=Z;ia=f;ja=X;ka=Y;break b}}break}default:{Di(e,0);do{I=c[s>>2]|0;if(I>>>0<(c[t>>2]|0)>>>0){c[s>>2]=I+1;la=d[I>>0]|0}else la=Ye(e)|0}while((Tn(la)|0)!=0);H=c[s>>2]|0;if(!(c[t>>2]|0))ma=H;else{I=H+-1|0;c[s>>2]=I;ma=I}ea=(c[u>>2]|0)+f+ma-(c[v>>2]|0)|0;fa=T}}Di(e,fa);I=c[s>>2]|0;H=c[t>>2]|0;if(I>>>0<H>>>0){c[s>>2]=I+1;na=H}else{if((Ye(e)|0)<0){$=V;aa=q;ba=X;ca=Y;da=164;break a}na=c[t>>2]|0}if(na)c[s>>2]=(c[s>>2]|0)+-1;e:do switch(N|0){case 91:case 99:case 115:{H=(N|0)==99;f:do if((N&239|0)==99){Mh(n|0,-1,257)|0;a[n>>0]=0;if((N|0)==115){a[x>>0]=0;a[w>>0]=0;a[w+1>>0]=0;a[w+2>>0]=0;a[w+3>>0]=0;a[w+4>>0]=0;oa=Z}else oa=Z}else{I=Z+1|0;L=(a[I>>0]|0)==94;P=L&1;Q=L?I:Z;pa=L?Z+2|0:I;Mh(n|0,L&1|0,257)|0;a[n>>0]=0;switch(a[pa>>0]|0){case 45:{L=(P^1)&255;a[z>>0]=L;qa=L;ra=Q+2|0;break}case 93:{L=(P^1)&255;a[A>>0]=L;qa=L;ra=Q+2|0;break}default:{qa=(P^1)&255;ra=pa}}pa=ra;while(1){P=a[pa>>0]|0;g:do switch(P<<24>>24){case 0:{$=V;aa=q;ba=X;ca=Y;da=164;break a;break}case 93:{oa=pa;break f;break}case 45:{Q=pa+1|0;L=a[Q>>0]|0;switch(L<<24>>24){case 93:case 0:{sa=45;ta=pa;break g;break}default:{}}I=a[pa+-1>>0]|0;if((I&255)<(L&255)){ua=I&255;do{ua=ua+1|0;a[n+ua>>0]=qa;I=a[Q>>0]|0}while((ua|0)<(I&255|0));sa=I;ta=Q}else{sa=L;ta=Q}break}default:{sa=P;ta=pa}}while(0);a[n+((sa&255)+1)>>0]=qa;pa=ta+1|0}}while(0);pa=H?fa+1|0:31;P=(M|0)==1;ua=(V|0)!=0;h:do if(P){if(ua){I=fc(pa<<2)|0;if(!I){$=V;aa=q;ba=0;ca=I;da=164;break a}else va=I}else va=J;c[m>>2]=0;c[y>>2]=0;I=0;wa=pa;xa=va;i:while(1){j:do if(!xa){ya=ua&(I|0)==(wa|0);k:while(1){za=c[s>>2]|0;if(za>>>0<(c[t>>2]|0)>>>0){c[s>>2]=za+1;Aa=d[za>>0]|0}else Aa=Ye(e)|0;if(!(a[n+(Aa+1)>>0]|0)){Ba=I;Ca=0;break i}a[p>>0]=Aa;switch(Td(o,p,1,m)|0){case -1:{$=V;aa=q;ba=0;ca=0;da=164;break a;break}case -2:{continue k;break}default:{}}if(ya){Da=I;break j}}}else{if(ua)Ea=I;else{Fa=I;Ga=xa;da=86;break i}while(1){l:while(1){ya=c[s>>2]|0;if(ya>>>0<(c[t>>2]|0)>>>0){c[s>>2]=ya+1;Ha=d[ya>>0]|0}else Ha=Ye(e)|0;if(!(a[n+(Ha+1)>>0]|0)){Ba=Ea;Ca=xa;break i}a[p>>0]=Ha;switch(Td(o,p,1,m)|0){case -1:{$=V;aa=q;ba=0;ca=xa;da=164;break a;break}case -2:break;default:break l}}c[xa+(Ea<<2)>>2]=c[o>>2];Ea=Ea+1|0;if((Ea|0)==(wa|0)){Da=wa;break}}}while(0);ya=wa<<1|1;Q=nh(xa,ya<<2)|0;if(!Q){$=V;aa=q;ba=0;ca=xa;da=164;break a}I=Da;wa=ya;xa=Q}m:do if((da|0)==86){da=0;xa=Fa;while(1){n:while(1){wa=c[s>>2]|0;if(wa>>>0<(c[t>>2]|0)>>>0){c[s>>2]=wa+1;Ia=d[wa>>0]|0}else Ia=Ye(e)|0;if(!(a[n+(Ia+1)>>0]|0)){Ba=xa;Ca=Ga;break m}a[p>>0]=Ia;switch(Td(o,p,1,m)|0){case -1:{$=0;aa=q;ba=0;ca=Ga;da=164;break a;break}case -2:break;default:break n}}c[Ga+(xa<<2)>>2]=c[o>>2];xa=xa+1|0}}while(0);if(!(Wl(m)|0)){$=V;aa=q;ba=0;ca=Ca;da=164;break a}else{Ja=Ba;Ka=0;La=Ca}}else{if(ua){xa=fc(pa)|0;if(!xa){$=V;aa=q;ba=0;ca=0;da=164;break a}else{Ma=0;Na=pa;Oa=xa}while(1){xa=Ma;do{wa=c[s>>2]|0;if(wa>>>0<(c[t>>2]|0)>>>0){c[s>>2]=wa+1;Pa=d[wa>>0]|0}else Pa=Ye(e)|0;if(!(a[n+(Pa+1)>>0]|0)){Ja=xa;Ka=Oa;La=0;break h}a[Oa+xa>>0]=Pa;xa=xa+1|0}while((xa|0)!=(Na|0));xa=Na<<1|1;wa=nh(Oa,xa)|0;if(!wa){$=V;aa=q;ba=Oa;ca=0;da=164;break a}else{I=Na;Na=xa;Oa=wa;Ma=I}}}if(!J){I=na;while(1){wa=c[s>>2]|0;if(wa>>>0<I>>>0){c[s>>2]=wa+1;Qa=d[wa>>0]|0}else Qa=Ye(e)|0;if(!(a[n+(Qa+1)>>0]|0)){Ja=0;Ka=0;La=0;break h}I=c[t>>2]|0}}else{I=na;wa=0;while(1){xa=c[s>>2]|0;if(xa>>>0<I>>>0){c[s>>2]=xa+1;Ra=d[xa>>0]|0}else Ra=Ye(e)|0;if(!(a[n+(Ra+1)>>0]|0)){Ja=wa;Ka=J;La=0;break h}a[J+wa>>0]=Ra;I=c[t>>2]|0;wa=wa+1|0}}}while(0);pa=c[s>>2]|0;if(!(c[t>>2]|0))Sa=pa;else{wa=pa+-1|0;c[s>>2]=wa;Sa=wa}wa=Sa-(c[v>>2]|0)+(c[u>>2]|0)|0;if(!wa){Ta=V;Ua=q;Va=Ka;Wa=La;break a}if(!((wa|0)==(fa|0)|H^1)){Ta=V;Ua=q;Va=Ka;Wa=La;break a}do if(ua)if(P){c[J>>2]=La;break}else{c[J>>2]=Ka;break}while(0);if(!H){if(La)c[La+(Ja<<2)>>2]=0;if(!Ka){Xa=oa;Ya=0;Za=La}else{a[Ka+Ja>>0]=0;Xa=oa;Ya=Ka;Za=La}}else{Xa=oa;Ya=Ka;Za=La}break}case 120:case 88:case 112:{_a=16;da=146;break}case 111:{_a=8;da=146;break}case 117:case 100:{_a=10;da=146;break}case 105:{_a=0;da=146;break}case 71:case 103:case 70:case 102:case 69:case 101:case 65:case 97:{$a=+gc(e,M,0);if((c[u>>2]|0)==((c[v>>2]|0)-(c[s>>2]|0)|0)){Ta=V;Ua=q;Va=X;Wa=Y;break a}if(!J){Xa=Z;Ya=X;Za=Y}else switch(M|0){case 0:{g[J>>2]=$a;Xa=Z;Ya=X;Za=Y;break e;break}case 1:{h[J>>3]=$a;Xa=Z;Ya=X;Za=Y;break e;break}case 2:{h[J>>3]=$a;Xa=Z;Ya=X;Za=Y;break e;break}default:{Xa=Z;Ya=X;Za=Y;break e}}break}default:{Xa=Z;Ya=X;Za=Y}}while(0);o:do if((da|0)==146){da=0;P=nc(e,_a,0,-1,-1)|0;if((c[u>>2]|0)==((c[v>>2]|0)-(c[s>>2]|0)|0)){Ta=V;Ua=q;Va=X;Wa=Y;break a}if((J|0)!=0&(N|0)==112){c[J>>2]=P;Xa=Z;Ya=X;Za=Y;break}if(!J){Xa=Z;Ya=X;Za=Y}else switch(M|0){case -2:{a[J>>0]=P;Xa=Z;Ya=X;Za=Y;break o;break}case -1:{b[J>>1]=P;Xa=Z;Ya=X;Za=Y;break o;break}case 0:{c[J>>2]=P;Xa=Z;Ya=X;Za=Y;break o;break}case 1:{c[J>>2]=P;Xa=Z;Ya=X;Za=Y;break o;break}case 3:{ua=J;c[ua>>2]=P;c[ua+4>>2]=G;Xa=Z;Ya=X;Za=Y;break o;break}default:{Xa=Z;Ya=X;Za=Y;break o}}}while(0);ga=((J|0)!=0&1)+q|0;ha=Xa;ia=(c[u>>2]|0)+ea+(c[s>>2]|0)-(c[v>>2]|0)|0;ja=Ya;ka=Za;break b}while(0);M=C+(F&1)|0;Di(e,0);N=c[s>>2]|0;if(N>>>0<(c[t>>2]|0)>>>0){c[s>>2]=N+1;ab=d[N>>0]|0}else ab=Ye(e)|0;if((ab|0)!=(d[M>>0]|0)){bb=ab;cb=q;db=D;eb=E;da=19;break a}ga=q;ha=M;ia=f+1|0;ja=D;ka=E}else{M=C;while(1){N=M+1|0;if(!(Tn(d[N>>0]|0)|0)){fb=M;break}else M=N}Di(e,0);do{M=c[s>>2]|0;if(M>>>0<(c[t>>2]|0)>>>0){c[s>>2]=M+1;gb=d[M>>0]|0}else gb=Ye(e)|0}while((Tn(gb)|0)!=0);M=c[s>>2]|0;if(!(c[t>>2]|0))hb=M;else{F=M+-1|0;c[s>>2]=F;hb=F}ga=q;ha=fb;ia=(c[u>>2]|0)+f+hb-(c[v>>2]|0)|0;ja=D;ka=E}while(0);C=ha+1|0;B=a[C>>0]|0;if(!(B<<24>>24)){r=ga;da=168;break}else{q=ga;f=ia;D=ja;E=ka}}if((da|0)==19){if(c[t>>2]|0)c[s>>2]=(c[s>>2]|0)+-1;if((cb|0)!=0|(bb|0)>-1){r=cb;i=k;return r|0}else{ib=0;jb=db;kb=eb;da=165}}else if((da|0)==164)if(!aa){ib=$;jb=ba;kb=ca;da=165}else{Ta=$;Ua=aa;Va=ba;Wa=ca}else if((da|0)==168){i=k;return r|0}if((da|0)==165){Ta=ib;Ua=-1;Va=jb;Wa=kb}if(!Ta){r=Ua;i=k;return r|0}kc(Va);kc(Wa);r=Ua;i=k;return r|0}function kc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;if(!a)return;b=a+-8|0;d=c[688]|0;if(b>>>0<d>>>0)Cb();e=c[a+-4>>2]|0;f=e&3;if((f|0)==1)Cb();g=e&-8;h=a+(g+-8)|0;do if(!(e&1)){i=c[b>>2]|0;if(!f)return;j=-8-i|0;k=a+j|0;l=i+g|0;if(k>>>0<d>>>0)Cb();if((k|0)==(c[689]|0)){m=a+(g+-4)|0;n=c[m>>2]|0;if((n&3|0)!=3){o=k;p=l;break}c[686]=l;c[m>>2]=n&-2;c[a+(j+4)>>2]=l|1;c[h>>2]=l;return}n=i>>>3;if(i>>>0<256){i=c[a+(j+8)>>2]|0;m=c[a+(j+12)>>2]|0;q=2776+(n<<1<<2)|0;if((i|0)!=(q|0)){if(i>>>0<d>>>0)Cb();if((c[i+12>>2]|0)!=(k|0))Cb()}if((m|0)==(i|0)){c[684]=c[684]&~(1<<n);o=k;p=l;break}if((m|0)!=(q|0)){if(m>>>0<d>>>0)Cb();q=m+8|0;if((c[q>>2]|0)==(k|0))r=q;else Cb()}else r=m+8|0;c[i+12>>2]=m;c[r>>2]=i;o=k;p=l;break}i=c[a+(j+24)>>2]|0;m=c[a+(j+12)>>2]|0;do if((m|0)==(k|0)){q=a+(j+20)|0;n=c[q>>2]|0;if(!n){s=a+(j+16)|0;t=c[s>>2]|0;if(!t){u=0;break}else{v=t;w=s}}else{v=n;w=q}while(1){q=v+20|0;n=c[q>>2]|0;if(n){v=n;w=q;continue}q=v+16|0;n=c[q>>2]|0;if(!n){x=v;y=w;break}else{v=n;w=q}}if(y>>>0<d>>>0)Cb();else{c[y>>2]=0;u=x;break}}else{q=c[a+(j+8)>>2]|0;if(q>>>0<d>>>0)Cb();n=q+12|0;if((c[n>>2]|0)!=(k|0))Cb();s=m+8|0;if((c[s>>2]|0)==(k|0)){c[n>>2]=m;c[s>>2]=q;u=m;break}else Cb()}while(0);if(i){m=c[a+(j+28)>>2]|0;q=3040+(m<<2)|0;if((k|0)==(c[q>>2]|0)){c[q>>2]=u;if(!u){c[685]=c[685]&~(1<<m);o=k;p=l;break}}else{if(i>>>0<(c[688]|0)>>>0)Cb();m=i+16|0;if((c[m>>2]|0)==(k|0))c[m>>2]=u;else c[i+20>>2]=u;if(!u){o=k;p=l;break}}m=c[688]|0;if(u>>>0<m>>>0)Cb();c[u+24>>2]=i;q=c[a+(j+16)>>2]|0;do if(q)if(q>>>0<m>>>0)Cb();else{c[u+16>>2]=q;c[q+24>>2]=u;break}while(0);q=c[a+(j+20)>>2]|0;if(q)if(q>>>0<(c[688]|0)>>>0)Cb();else{c[u+20>>2]=q;c[q+24>>2]=u;o=k;p=l;break}else{o=k;p=l}}else{o=k;p=l}}else{o=b;p=g}while(0);if(o>>>0>=h>>>0)Cb();b=a+(g+-4)|0;u=c[b>>2]|0;if(!(u&1))Cb();if(!(u&2)){if((h|0)==(c[690]|0)){d=(c[687]|0)+p|0;c[687]=d;c[690]=o;c[o+4>>2]=d|1;if((o|0)!=(c[689]|0))return;c[689]=0;c[686]=0;return}if((h|0)==(c[689]|0)){d=(c[686]|0)+p|0;c[686]=d;c[689]=o;c[o+4>>2]=d|1;c[o+d>>2]=d;return}d=(u&-8)+p|0;x=u>>>3;do if(u>>>0>=256){y=c[a+(g+16)>>2]|0;w=c[a+(g|4)>>2]|0;do if((w|0)==(h|0)){v=a+(g+12)|0;r=c[v>>2]|0;if(!r){f=a+(g+8)|0;e=c[f>>2]|0;if(!e){z=0;break}else{A=e;B=f}}else{A=r;B=v}while(1){v=A+20|0;r=c[v>>2]|0;if(r){A=r;B=v;continue}v=A+16|0;r=c[v>>2]|0;if(!r){C=A;D=B;break}else{A=r;B=v}}if(D>>>0<(c[688]|0)>>>0)Cb();else{c[D>>2]=0;z=C;break}}else{v=c[a+g>>2]|0;if(v>>>0<(c[688]|0)>>>0)Cb();r=v+12|0;if((c[r>>2]|0)!=(h|0))Cb();f=w+8|0;if((c[f>>2]|0)==(h|0)){c[r>>2]=w;c[f>>2]=v;z=w;break}else Cb()}while(0);if(y){w=c[a+(g+20)>>2]|0;l=3040+(w<<2)|0;if((h|0)==(c[l>>2]|0)){c[l>>2]=z;if(!z){c[685]=c[685]&~(1<<w);break}}else{if(y>>>0<(c[688]|0)>>>0)Cb();w=y+16|0;if((c[w>>2]|0)==(h|0))c[w>>2]=z;else c[y+20>>2]=z;if(!z)break}w=c[688]|0;if(z>>>0<w>>>0)Cb();c[z+24>>2]=y;l=c[a+(g+8)>>2]|0;do if(l)if(l>>>0<w>>>0)Cb();else{c[z+16>>2]=l;c[l+24>>2]=z;break}while(0);l=c[a+(g+12)>>2]|0;if(l)if(l>>>0<(c[688]|0)>>>0)Cb();else{c[z+20>>2]=l;c[l+24>>2]=z;break}}}else{l=c[a+g>>2]|0;w=c[a+(g|4)>>2]|0;y=2776+(x<<1<<2)|0;if((l|0)!=(y|0)){if(l>>>0<(c[688]|0)>>>0)Cb();if((c[l+12>>2]|0)!=(h|0))Cb()}if((w|0)==(l|0)){c[684]=c[684]&~(1<<x);break}if((w|0)!=(y|0)){if(w>>>0<(c[688]|0)>>>0)Cb();y=w+8|0;if((c[y>>2]|0)==(h|0))E=y;else Cb()}else E=w+8|0;c[l+12>>2]=w;c[E>>2]=l}while(0);c[o+4>>2]=d|1;c[o+d>>2]=d;if((o|0)==(c[689]|0)){c[686]=d;return}else F=d}else{c[b>>2]=u&-2;c[o+4>>2]=p|1;c[o+p>>2]=p;F=p}p=F>>>3;if(F>>>0<256){u=p<<1;b=2776+(u<<2)|0;d=c[684]|0;E=1<<p;if(d&E){p=2776+(u+2<<2)|0;h=c[p>>2]|0;if(h>>>0<(c[688]|0)>>>0)Cb();else{G=p;H=h}}else{c[684]=d|E;G=2776+(u+2<<2)|0;H=b}c[G>>2]=o;c[H+12>>2]=o;c[o+8>>2]=H;c[o+12>>2]=b;return}b=F>>>8;if(b)if(F>>>0>16777215)I=31;else{H=(b+1048320|0)>>>16&8;G=b<<H;b=(G+520192|0)>>>16&4;u=G<<b;G=(u+245760|0)>>>16&2;E=14-(b|H|G)+(u<<G>>>15)|0;I=F>>>(E+7|0)&1|E<<1}else I=0;E=3040+(I<<2)|0;c[o+28>>2]=I;c[o+20>>2]=0;c[o+16>>2]=0;G=c[685]|0;u=1<<I;a:do if(G&u){H=c[E>>2]|0;b:do if((c[H+4>>2]&-8|0)!=(F|0)){b=F<<((I|0)==31?0:25-(I>>>1)|0);d=H;while(1){h=d+16+(b>>>31<<2)|0;p=c[h>>2]|0;if(!p){J=h;K=d;break}if((c[p+4>>2]&-8|0)==(F|0)){L=p;break b}else{b=b<<1;d=p}}if(J>>>0<(c[688]|0)>>>0)Cb();else{c[J>>2]=o;c[o+24>>2]=K;c[o+12>>2]=o;c[o+8>>2]=o;break a}}else L=H;while(0);H=L+8|0;d=c[H>>2]|0;b=c[688]|0;if(d>>>0>=b>>>0&L>>>0>=b>>>0){c[d+12>>2]=o;c[H>>2]=o;c[o+8>>2]=d;c[o+12>>2]=L;c[o+24>>2]=0;break}else Cb()}else{c[685]=G|u;c[E>>2]=o;c[o+24>>2]=E;c[o+12>>2]=o;c[o+8>>2]=o}while(0);o=(c[692]|0)+-1|0;c[692]=o;if(!o)M=3192;else return;while(1){o=c[M>>2]|0;if(!o)break;else M=o+8|0}c[692]=-1;return}function lc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=a+b|0;e=c[a+4>>2]|0;do if(!(e&1)){f=c[a>>2]|0;if(!(e&3))return;g=a+(0-f)|0;h=f+b|0;i=c[688]|0;if(g>>>0<i>>>0)Cb();if((g|0)==(c[689]|0)){j=a+(b+4)|0;k=c[j>>2]|0;if((k&3|0)!=3){l=g;m=h;break}c[686]=h;c[j>>2]=k&-2;c[a+(4-f)>>2]=h|1;c[d>>2]=h;return}k=f>>>3;if(f>>>0<256){j=c[a+(8-f)>>2]|0;n=c[a+(12-f)>>2]|0;o=2776+(k<<1<<2)|0;if((j|0)!=(o|0)){if(j>>>0<i>>>0)Cb();if((c[j+12>>2]|0)!=(g|0))Cb()}if((n|0)==(j|0)){c[684]=c[684]&~(1<<k);l=g;m=h;break}if((n|0)!=(o|0)){if(n>>>0<i>>>0)Cb();o=n+8|0;if((c[o>>2]|0)==(g|0))p=o;else Cb()}else p=n+8|0;c[j+12>>2]=n;c[p>>2]=j;l=g;m=h;break}j=c[a+(24-f)>>2]|0;n=c[a+(12-f)>>2]|0;do if((n|0)==(g|0)){o=16-f|0;k=a+(o+4)|0;q=c[k>>2]|0;if(!q){r=a+o|0;o=c[r>>2]|0;if(!o){s=0;break}else{t=o;u=r}}else{t=q;u=k}while(1){k=t+20|0;q=c[k>>2]|0;if(q){t=q;u=k;continue}k=t+16|0;q=c[k>>2]|0;if(!q){v=t;w=u;break}else{t=q;u=k}}if(w>>>0<i>>>0)Cb();else{c[w>>2]=0;s=v;break}}else{k=c[a+(8-f)>>2]|0;if(k>>>0<i>>>0)Cb();q=k+12|0;if((c[q>>2]|0)!=(g|0))Cb();r=n+8|0;if((c[r>>2]|0)==(g|0)){c[q>>2]=n;c[r>>2]=k;s=n;break}else Cb()}while(0);if(j){n=c[a+(28-f)>>2]|0;i=3040+(n<<2)|0;if((g|0)==(c[i>>2]|0)){c[i>>2]=s;if(!s){c[685]=c[685]&~(1<<n);l=g;m=h;break}}else{if(j>>>0<(c[688]|0)>>>0)Cb();n=j+16|0;if((c[n>>2]|0)==(g|0))c[n>>2]=s;else c[j+20>>2]=s;if(!s){l=g;m=h;break}}n=c[688]|0;if(s>>>0<n>>>0)Cb();c[s+24>>2]=j;i=16-f|0;k=c[a+i>>2]|0;do if(k)if(k>>>0<n>>>0)Cb();else{c[s+16>>2]=k;c[k+24>>2]=s;break}while(0);k=c[a+(i+4)>>2]|0;if(k)if(k>>>0<(c[688]|0)>>>0)Cb();else{c[s+20>>2]=k;c[k+24>>2]=s;l=g;m=h;break}else{l=g;m=h}}else{l=g;m=h}}else{l=a;m=b}while(0);s=c[688]|0;if(d>>>0<s>>>0)Cb();v=a+(b+4)|0;w=c[v>>2]|0;if(!(w&2)){if((d|0)==(c[690]|0)){u=(c[687]|0)+m|0;c[687]=u;c[690]=l;c[l+4>>2]=u|1;if((l|0)!=(c[689]|0))return;c[689]=0;c[686]=0;return}if((d|0)==(c[689]|0)){u=(c[686]|0)+m|0;c[686]=u;c[689]=l;c[l+4>>2]=u|1;c[l+u>>2]=u;return}u=(w&-8)+m|0;t=w>>>3;do if(w>>>0>=256){p=c[a+(b+24)>>2]|0;e=c[a+(b+12)>>2]|0;do if((e|0)==(d|0)){k=a+(b+20)|0;n=c[k>>2]|0;if(!n){f=a+(b+16)|0;j=c[f>>2]|0;if(!j){x=0;break}else{y=j;z=f}}else{y=n;z=k}while(1){k=y+20|0;n=c[k>>2]|0;if(n){y=n;z=k;continue}k=y+16|0;n=c[k>>2]|0;if(!n){A=y;B=z;break}else{y=n;z=k}}if(B>>>0<s>>>0)Cb();else{c[B>>2]=0;x=A;break}}else{k=c[a+(b+8)>>2]|0;if(k>>>0<s>>>0)Cb();n=k+12|0;if((c[n>>2]|0)!=(d|0))Cb();f=e+8|0;if((c[f>>2]|0)==(d|0)){c[n>>2]=e;c[f>>2]=k;x=e;break}else Cb()}while(0);if(p){e=c[a+(b+28)>>2]|0;h=3040+(e<<2)|0;if((d|0)==(c[h>>2]|0)){c[h>>2]=x;if(!x){c[685]=c[685]&~(1<<e);break}}else{if(p>>>0<(c[688]|0)>>>0)Cb();e=p+16|0;if((c[e>>2]|0)==(d|0))c[e>>2]=x;else c[p+20>>2]=x;if(!x)break}e=c[688]|0;if(x>>>0<e>>>0)Cb();c[x+24>>2]=p;h=c[a+(b+16)>>2]|0;do if(h)if(h>>>0<e>>>0)Cb();else{c[x+16>>2]=h;c[h+24>>2]=x;break}while(0);h=c[a+(b+20)>>2]|0;if(h)if(h>>>0<(c[688]|0)>>>0)Cb();else{c[x+20>>2]=h;c[h+24>>2]=x;break}}}else{h=c[a+(b+8)>>2]|0;e=c[a+(b+12)>>2]|0;p=2776+(t<<1<<2)|0;if((h|0)!=(p|0)){if(h>>>0<s>>>0)Cb();if((c[h+12>>2]|0)!=(d|0))Cb()}if((e|0)==(h|0)){c[684]=c[684]&~(1<<t);break}if((e|0)!=(p|0)){if(e>>>0<s>>>0)Cb();p=e+8|0;if((c[p>>2]|0)==(d|0))C=p;else Cb()}else C=e+8|0;c[h+12>>2]=e;c[C>>2]=h}while(0);c[l+4>>2]=u|1;c[l+u>>2]=u;if((l|0)==(c[689]|0)){c[686]=u;return}else D=u}else{c[v>>2]=w&-2;c[l+4>>2]=m|1;c[l+m>>2]=m;D=m}m=D>>>3;if(D>>>0<256){w=m<<1;v=2776+(w<<2)|0;u=c[684]|0;C=1<<m;if(u&C){m=2776+(w+2<<2)|0;d=c[m>>2]|0;if(d>>>0<(c[688]|0)>>>0)Cb();else{E=m;F=d}}else{c[684]=u|C;E=2776+(w+2<<2)|0;F=v}c[E>>2]=l;c[F+12>>2]=l;c[l+8>>2]=F;c[l+12>>2]=v;return}v=D>>>8;if(v)if(D>>>0>16777215)G=31;else{F=(v+1048320|0)>>>16&8;E=v<<F;v=(E+520192|0)>>>16&4;w=E<<v;E=(w+245760|0)>>>16&2;C=14-(v|F|E)+(w<<E>>>15)|0;G=D>>>(C+7|0)&1|C<<1}else G=0;C=3040+(G<<2)|0;c[l+28>>2]=G;c[l+20>>2]=0;c[l+16>>2]=0;E=c[685]|0;w=1<<G;if(!(E&w)){c[685]=E|w;c[C>>2]=l;c[l+24>>2]=C;c[l+12>>2]=l;c[l+8>>2]=l;return}w=c[C>>2]|0;a:do if((c[w+4>>2]&-8|0)==(D|0))H=w;else{C=D<<((G|0)==31?0:25-(G>>>1)|0);E=w;while(1){F=E+16+(C>>>31<<2)|0;v=c[F>>2]|0;if(!v){I=F;J=E;break}if((c[v+4>>2]&-8|0)==(D|0)){H=v;break a}else{C=C<<1;E=v}}if(I>>>0<(c[688]|0)>>>0)Cb();c[I>>2]=l;c[l+24>>2]=J;c[l+12>>2]=l;c[l+8>>2]=l;return}while(0);J=H+8|0;I=c[J>>2]|0;D=c[688]|0;if(!(I>>>0>=D>>>0&H>>>0>=D>>>0))Cb();c[I+12>>2]=l;c[J>>2]=l;c[l+8>>2]=I;c[l+12>>2]=H;c[l+24>>2]=0;return}function nc(b,e,f,g,h){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0;if(e>>>0>36){c[(tb()|0)>>2]=22;i=0;j=0;G=i;return j|0}k=b+4|0;l=b+100|0;do{m=c[k>>2]|0;if(m>>>0<(c[l>>2]|0)>>>0){c[k>>2]=m+1;n=d[m>>0]|0}else n=Ye(b)|0}while((Tn(n)|0)!=0);o=n;a:do switch(o|0){case 43:case 45:{n=((o|0)==45)<<31>>31;m=c[k>>2]|0;if(m>>>0<(c[l>>2]|0)>>>0){c[k>>2]=m+1;p=d[m>>0]|0;q=n;break a}else{p=Ye(b)|0;q=n;break a}break}default:{p=o;q=0}}while(0);o=(e|0)==0;do if((e&-17|0)==0&(p|0)==48){n=c[k>>2]|0;if(n>>>0<(c[l>>2]|0)>>>0){c[k>>2]=n+1;r=d[n>>0]|0}else r=Ye(b)|0;if((r|32|0)!=120)if(o){s=8;t=r;u=46;break}else{v=e;w=r;u=32;break}n=c[k>>2]|0;if(n>>>0<(c[l>>2]|0)>>>0){c[k>>2]=n+1;x=d[n>>0]|0}else x=Ye(b)|0;if((d[10857+(x+1)>>0]|0)>15){n=(c[l>>2]|0)==0;if(!n)c[k>>2]=(c[k>>2]|0)+-1;if(!f){Di(b,0);i=0;j=0;G=i;return j|0}if(n){i=0;j=0;G=i;return j|0}c[k>>2]=(c[k>>2]|0)+-1;i=0;j=0;G=i;return j|0}else{s=16;t=x;u=46}}else{n=o?10:e;if((d[10857+(p+1)>>0]|0)>>>0<n>>>0){v=n;w=p;u=32}else{if(c[l>>2]|0)c[k>>2]=(c[k>>2]|0)+-1;Di(b,0);c[(tb()|0)>>2]=22;i=0;j=0;G=i;return j|0}}while(0);if((u|0)==32)if((v|0)==10){p=w+-48|0;if(p>>>0<10){e=p;p=0;while(1){o=(p*10|0)+e|0;x=c[k>>2]|0;if(x>>>0<(c[l>>2]|0)>>>0){c[k>>2]=x+1;y=d[x>>0]|0}else y=Ye(b)|0;e=y+-48|0;if(!(e>>>0<10&o>>>0<429496729)){z=o;A=y;break}else p=o}B=z;C=0;D=A}else{B=0;C=0;D=w}A=D+-48|0;if(A>>>0<10){z=B;p=C;y=A;A=D;while(1){D=pj(z|0,p|0,10,0)|0;e=G;o=((y|0)<0)<<31>>31;x=~o;if(e>>>0>x>>>0|(e|0)==(x|0)&D>>>0>~y>>>0){E=y;F=z;H=p;I=A;break}x=Ok(D|0,e|0,y|0,o|0)|0;o=G;e=c[k>>2]|0;if(e>>>0<(c[l>>2]|0)>>>0){c[k>>2]=e+1;J=d[e>>0]|0}else J=Ye(b)|0;e=J+-48|0;if(e>>>0<10&(o>>>0<429496729|(o|0)==429496729&x>>>0<2576980378)){z=x;p=o;y=e;A=J}else{E=e;F=x;H=o;I=J;break}}if(E>>>0>9){K=H;L=F}else{M=10;N=F;O=H;P=I;u=72}}else{K=C;L=B}}else{s=v;t=w;u=46}b:do if((u|0)==46){if(!(s+-1&s)){w=a[11114+((s*23|0)>>>5&7)>>0]|0;v=a[10857+(t+1)>>0]|0;B=v&255;if(B>>>0<s>>>0){C=B;B=0;while(1){I=C|B<<w;H=c[k>>2]|0;if(H>>>0<(c[l>>2]|0)>>>0){c[k>>2]=H+1;Q=d[H>>0]|0}else Q=Ye(b)|0;H=a[10857+(Q+1)>>0]|0;C=H&255;if(!(I>>>0<134217728&C>>>0<s>>>0)){R=I;S=H;T=Q;break}else B=I}U=S;V=0;W=R;X=T}else{U=v;V=0;W=0;X=t}B=ek(-1,-1,w|0)|0;C=G;if((U&255)>>>0>=s>>>0|(V>>>0>C>>>0|(V|0)==(C|0)&W>>>0>B>>>0)){M=s;N=W;O=V;P=X;u=72;break}else{Y=W;Z=V;_=U}while(1){I=ck(Y|0,Z|0,w|0)|0;H=G;F=_&255|I;I=c[k>>2]|0;if(I>>>0<(c[l>>2]|0)>>>0){c[k>>2]=I+1;$=d[I>>0]|0}else $=Ye(b)|0;_=a[10857+($+1)>>0]|0;if((_&255)>>>0>=s>>>0|(H>>>0>C>>>0|(H|0)==(C|0)&F>>>0>B>>>0)){M=s;N=F;O=H;P=$;u=72;break b}else{Y=F;Z=H}}}B=a[10857+(t+1)>>0]|0;C=B&255;if(C>>>0<s>>>0){w=C;C=0;while(1){v=w+(ca(C,s)|0)|0;H=c[k>>2]|0;if(H>>>0<(c[l>>2]|0)>>>0){c[k>>2]=H+1;aa=d[H>>0]|0}else aa=Ye(b)|0;H=a[10857+(aa+1)>>0]|0;w=H&255;if(!(v>>>0<119304647&w>>>0<s>>>0)){ba=v;da=H;ea=aa;break}else C=v}fa=da;ga=ba;ha=0;ia=ea}else{fa=B;ga=0;ha=0;ia=t}if((fa&255)>>>0<s>>>0){C=sm(-1,-1,s|0,0)|0;w=G;v=ha;H=ga;F=fa;I=ia;while(1){if(v>>>0>w>>>0|(v|0)==(w|0)&H>>>0>C>>>0){M=s;N=H;O=v;P=I;u=72;break b}E=pj(H|0,v|0,s|0,0)|0;J=G;A=F&255;if(J>>>0>4294967295|(J|0)==-1&E>>>0>~A>>>0){M=s;N=H;O=v;P=I;u=72;break b}y=Ok(A|0,0,E|0,J|0)|0;J=G;E=c[k>>2]|0;if(E>>>0<(c[l>>2]|0)>>>0){c[k>>2]=E+1;ja=d[E>>0]|0}else ja=Ye(b)|0;F=a[10857+(ja+1)>>0]|0;if((F&255)>>>0>=s>>>0){M=s;N=y;O=J;P=ja;u=72;break}else{v=J;H=y;I=ja}}}else{M=s;N=ga;O=ha;P=ia;u=72}}while(0);if((u|0)==72)if((d[10857+(P+1)>>0]|0)>>>0<M>>>0){do{P=c[k>>2]|0;if(P>>>0<(c[l>>2]|0)>>>0){c[k>>2]=P+1;ka=d[P>>0]|0}else ka=Ye(b)|0}while((d[10857+(ka+1)>>0]|0)>>>0<M>>>0);c[(tb()|0)>>2]=34;K=h;L=g}else{K=O;L=N}if(c[l>>2]|0)c[k>>2]=(c[k>>2]|0)+-1;if(!(K>>>0<h>>>0|(K|0)==(h|0)&L>>>0<g>>>0)){if(!((g&1|0)!=0|0!=0|(q|0)!=0)){c[(tb()|0)>>2]=34;k=Ok(g|0,h|0,-1,-1)|0;i=G;j=k;G=i;return j|0}if(K>>>0>h>>>0|(K|0)==(h|0)&L>>>0>g>>>0){c[(tb()|0)>>2]=34;i=h;j=g;G=i;return j|0}}g=((q|0)<0)<<31>>31;h=Oj(L^q|0,K^g|0,q|0,g|0)|0;i=G;j=h;G=i;return j|0}function mc(){var b=0,d=0,e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ca=0,da=0;b=i;i=i+224|0;d=b+208|0;e=b+16|0;f=b+120|0;h=b+192|0;j=b+180|0;k=b+168|0;l=b+100|0;m=b+88|0;n=b+8|0;o=b;p=b+68|0;q=b+56|0;r=b+36|0;s=b+24|0;bn(Fb(0)|0);t=f;u=t+48|0;do{c[t>>2]=0;t=t+4|0}while((t|0)<(u|0));t=f+8|0;u=nh(0,28e4)|0;c[f>>2]=u;c[f+4>>2]=u;c[t>>2]=u+28e4;v=f+12|0;w=f+20|0;x=nh(0,4e4)|0;c[v>>2]=x;c[f+16>>2]=x;c[w>>2]=x+4e4;y=f+24|0;z=f+32|0;A=nh(0,8e4)|0;c[y>>2]=A;c[f+28>>2]=A;c[z>>2]=A+8e4;B=Ph(8)|0;C=B;c[C>>2]=0;c[C+4>>2]=0;c[B+4>>2]=-1;c[B>>2]=2208;c[h>>2]=B;c[h+4>>2]=1;c[h+8>>2]=2;B=nh(u,28e6)|0;c[f>>2]=B;c[f+4>>2]=B;c[t>>2]=B+28e6;B=nh(x,4e6)|0;c[v>>2]=B;c[f+16>>2]=B;c[w>>2]=B+4e6;B=nh(A,8e6)|0;c[y>>2]=B;c[f+28>>2]=B;c[z>>2]=B+8e6;B=j+4|0;z=j+8|0;y=nh(0,8e6)|0;c[j>>2]=y;c[B>>2]=y;c[z>>2]=y+8e6;A=le(3320,9520,20)|0;Ke(k,1e6);w=a[k>>0]|0;v=(w&1)==0;x=le(A,v?k+1|0:c[k+8>>2]|0,v?(w&255)>>>1:c[k+4>>2]|0)|0;c[d>>2]=fk(x+(c[(c[x>>2]|0)+-12>>2]|0)|0)|0;w=bk(d,5928)|0;v=bc[c[(c[w>>2]|0)+28>>2]&15](w,10)|0;zm(d);ef(x,v)|0;lg(x)|0;ul(k);Gh(m,9541,8);li(l,m);c[l+12>>2]=gb()|0;g[l+16>>2]=1.0;ul(m);m=y;k=y;y=0;while(1){switch((Vi()|0)%2|0|0){case 0:{Ee(n,f);if((k|0)==(c[z>>2]|0)){x=c[j>>2]|0;v=k-x|0;w=v>>3;A=w+1|0;t=~~+ba(+(+(w>>>0)*1.5))>>>0;w=(t>>>0<A>>>0?A:t)<<3;t=nh(x,w)|0;c[j>>2]=t;x=t+v|0;c[B>>2]=x;c[z>>2]=t+w;D=x}else D=k;x=n;w=c[x+4>>2]|0;t=D;c[t>>2]=c[x>>2];c[t+4>>2]=w;w=(c[B>>2]|0)+8|0;c[B>>2]=w;E=w;F=w;break}case 1:{Me(o,f);if((m|0)==(c[z>>2]|0)){w=c[j>>2]|0;t=m-w|0;x=t>>3;v=x+1|0;A=~~+ba(+(+(x>>>0)*1.5))>>>0;x=(A>>>0<v>>>0?v:A)<<3;A=nh(w,x)|0;c[j>>2]=A;w=A+t|0;c[B>>2]=w;c[z>>2]=A+x;G=w}else G=m;w=o;x=c[w+4>>2]|0;A=G;c[A>>2]=c[w>>2];c[A+4>>2]=x;x=(c[B>>2]|0)+8|0;c[B>>2]=x;E=x;F=x;break}default:{E=k;F=m}}y=y+1|0;if(y>>>0>=1e6)break;else{m=F;k=E}}Se(l);Gh(q,9550,6);li(p,q);c[p+12>>2]=gb()|0;l=p+16|0;g[l>>2]=1.0;ul(q);q=c[h>>2]|0;E=f+16|0;k=f+12|0;F=0;do{m=Wb[c[(c[q>>2]|0)+8>>2]&63](q)|0;if((c[E>>2]|0)!=(c[k>>2]|0)){y=m&3;m=0;do{B=$d(f,m*28|0)|0;if(!(y&(c[B+24>>2]^3)))Xb[c[h+4+(c[B+20>>2]<<2)>>2]&3](q,B,.1);m=m+1|0}while(m>>>0<(c[E>>2]|0)-(c[k>>2]|0)>>2>>>0)}F=F+1|0}while(F>>>0<10);g[l>>2]=10.0;Se(p);p=d+4|0;l=d+8|0;F=nh(0,4e6)|0;c[d>>2]=F;c[p>>2]=F;k=F+4e6|0;c[l>>2]=k;E=F;q=k;k=F;h=F;m=F;F=0;while(1){if((E|0)==(q|0)){y=q-k|0;B=y>>2;G=B+1|0;o=~~+ba(+(+(B>>>0)*1.5))>>>0;B=(o>>>0<G>>>0?G:o)<<2;o=nh(k,B)|0;c[d>>2]=o;G=o+y|0;c[p>>2]=G;y=o+B|0;c[l>>2]=y;H=G;I=o;J=o;K=o;L=y}else{H=E;I=h;J=m;K=k;L=q}c[H>>2]=F;E=H+4|0;c[p>>2]=E;F=F+1|0;if((F|0)==1e6){M=I;break}else{q=L;k=K;h=I;m=J}}J=0;while(1){m=((Vi()|0)>>>0)%((1e6-J|0)>>>0)|0;if(m){I=c[(_d(d,J)|0)>>2]|0;h=m+J|0;m=c[(_d(d,h)|0)>>2]|0;c[(_d(d,J)|0)>>2]=m;c[(_d(d,h)|0)>>2]=I}I=J+1|0;if(I>>>0<1e6)J=I;else{N=I;break}}J=0;I=0;h=0;m=0;while(1){K=_d(d,m)|0;if((J|0)==(I|0)){k=I-h|0;L=k>>2;q=L+1|0;F=~~+ba(+(+(L>>>0)*1.5))>>>0;L=(F>>>0<q>>>0?q:F)<<2;F=nh(h,L)|0;O=F+k|0;P=F+L|0;Q=F}else{O=J;P=I;Q=h}c[O>>2]=c[K>>2];K=O+4|0;m=m+1|0;if(m>>>0>=N>>>0){R=Q;S=K;break}else{J=K;I=P;h=Q}}kc(M);Gh(s,9557,8);li(r,s);c[r+12>>2]=gb()|0;g[r+16>>2]=1.0;ul(s);if((R|0)==(S|0)){Se(r);T=le(3320,9566,29)|0;U=c[T>>2]|0;V=U+-12|0;W=c[V>>2]|0;X=T+W|0;Y=fk(X)|0;c[d>>2]=Y;Z=bk(d,5928)|0;_=c[Z>>2]|0;$=_+28|0;aa=c[$>>2]|0;ca=bc[aa&15](Z,10)|0;zm(d);ef(T,ca)|0;lg(T)|0;Ca()|0;kc(R);da=c[j>>2]|0;kc(da);of(f);i=b;return 0}s=S;do{s=s+-4|0;S=Zd(j,c[s>>2]|0)|0;M=c[S+4>>2]|0;Q=e;c[Q>>2]=c[S>>2];c[Q+4>>2]=M;c[d>>2]=c[e>>2];c[d+4>>2]=c[e+4>>2];Qc(f,d)}while((R|0)!=(s|0));Se(r);T=le(3320,9566,29)|0;U=c[T>>2]|0;V=U+-12|0;W=c[V>>2]|0;X=T+W|0;Y=fk(X)|0;c[d>>2]=Y;Z=bk(d,5928)|0;_=c[Z>>2]|0;$=_+28|0;aa=c[$>>2]|0;ca=bc[aa&15](Z,10)|0;zm(d);ef(T,ca)|0;lg(T)|0;Ca()|0;kc(R);da=c[j>>2]|0;kc(da);of(f);i=b;return 0}function qc(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0;k=i;i=i+32|0;l=k+16|0;m=k+12|0;n=k+8|0;o=k+4|0;p=k;q=fk(e)|0;c[n>>2]=q;r=bk(n,5920)|0;_i(q)|0;c[f>>2]=0;q=c[b>>2]|0;a:do if((h|0)!=(j|0)){n=h;s=q;b:while(1){t=s;if(s){u=c[s+12>>2]|0;if((u|0)==(c[s+16>>2]|0))v=Wb[c[(c[s>>2]|0)+36>>2]&63](s)|0;else v=c[u>>2]|0;if((v|0)==-1){c[b>>2]=0;w=0;x=1;y=0}else{w=s;x=0;y=t}}else{w=0;x=1;y=t}t=c[d>>2]|0;u=t;do if(t){z=c[t+12>>2]|0;if((z|0)==(c[t+16>>2]|0))A=Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0;else A=c[z>>2]|0;if((A|0)!=-1)if(x){B=t;C=u;break}else{D=w;E=16;break b}else{c[d>>2]=0;F=0;E=14;break}}else{F=u;E=14}while(0);if((E|0)==14){E=0;if(x){D=w;E=16;break}else{B=0;C=F}}c:do if((Pb[c[(c[r>>2]|0)+52>>2]&31](r,c[n>>2]|0,0)|0)<<24>>24==37){u=n+4|0;if((u|0)==(j|0)){G=w;E=19;break b}t=Pb[c[(c[r>>2]|0)+52>>2]&31](r,c[u>>2]|0,0)|0;switch(t<<24>>24){case 48:case 69:{z=n+8|0;if((z|0)==(j|0)){H=w;E=22;break b}I=u;J=Pb[c[(c[r>>2]|0)+52>>2]&31](r,c[z>>2]|0,0)|0;K=t;break}default:{I=n;J=t;K=0}}t=c[(c[a>>2]|0)+36>>2]|0;c[o>>2]=y;c[p>>2]=C;c[m>>2]=c[o>>2];c[l>>2]=c[p>>2];c[b>>2]=_b[t&15](a,m,l,e,f,g,J,K)|0;L=I+8|0}else{if(Pb[c[(c[r>>2]|0)+12>>2]&31](r,8192,c[n>>2]|0)|0)M=n;else{t=w+12|0;z=c[t>>2]|0;u=w+16|0;if((z|0)==(c[u>>2]|0))N=Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0;else N=c[z>>2]|0;z=bc[c[(c[r>>2]|0)+28>>2]&15](r,N)|0;if((z|0)!=(bc[c[(c[r>>2]|0)+28>>2]&15](r,c[n>>2]|0)|0)){E=59;break b}z=c[t>>2]|0;if((z|0)==(c[u>>2]|0))Wb[c[(c[w>>2]|0)+40>>2]&63](w)|0;else c[t>>2]=z+4;L=n+4|0;break}while(1){z=M+4|0;if((z|0)==(j|0)){O=j;break}if(Pb[c[(c[r>>2]|0)+12>>2]&31](r,8192,c[z>>2]|0)|0)M=z;else{O=z;break}}z=w;t=B;u=B;while(1){if(z){P=c[z+12>>2]|0;if((P|0)==(c[z+16>>2]|0))Q=Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0;else Q=c[P>>2]|0;if((Q|0)==-1){c[b>>2]=0;R=1;S=0}else{R=0;S=z}}else{R=1;S=0}do if(u){P=c[u+12>>2]|0;if((P|0)==(c[u+16>>2]|0))T=Wb[c[(c[u>>2]|0)+36>>2]&63](u)|0;else T=c[P>>2]|0;if((T|0)!=-1)if(R^(t|0)==0){U=t;V=t;break}else{L=O;break c}else{c[d>>2]=0;W=0;E=42;break}}else{W=t;E=42}while(0);if((E|0)==42){E=0;if(R){L=O;break c}else{U=W;V=0}}P=S+12|0;X=c[P>>2]|0;Y=S+16|0;if((X|0)==(c[Y>>2]|0))Z=Wb[c[(c[S>>2]|0)+36>>2]&63](S)|0;else Z=c[X>>2]|0;if(!(Pb[c[(c[r>>2]|0)+12>>2]&31](r,8192,Z)|0)){L=O;break c}X=c[P>>2]|0;if((X|0)==(c[Y>>2]|0)){Wb[c[(c[S>>2]|0)+40>>2]&63](S)|0;z=S;t=U;u=V;continue}else{c[P>>2]=X+4;z=S;t=U;u=V;continue}}}while(0);u=c[b>>2]|0;if((L|0)!=(j|0)&(c[f>>2]|0)==0){n=L;s=u}else{_=u;break a}}if((E|0)==16){c[f>>2]=4;_=D;break}else if((E|0)==19){c[f>>2]=4;_=G;break}else if((E|0)==22){c[f>>2]=4;_=H;break}else if((E|0)==59){c[f>>2]=4;_=c[b>>2]|0;break}}else _=q;while(0);if(_){q=c[_+12>>2]|0;if((q|0)==(c[_+16>>2]|0))$=Wb[c[(c[_>>2]|0)+36>>2]&63](_)|0;else $=c[q>>2]|0;if(($|0)==-1){c[b>>2]=0;aa=0;ba=1}else{aa=_;ba=0}}else{aa=0;ba=1}_=c[d>>2]|0;do if(_){b=c[_+12>>2]|0;if((b|0)==(c[_+16>>2]|0))ca=Wb[c[(c[_>>2]|0)+36>>2]&63](_)|0;else ca=c[b>>2]|0;if((ca|0)!=-1)if(ba)break;else{E=74;break}else{c[d>>2]=0;E=72;break}}else E=72;while(0);if((E|0)==72?ba:0)E=74;if((E|0)==74)c[f>>2]=c[f>>2]|2;i=k;return aa|0}function rc(e,f,g,h,j,k,l,m){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0;n=i;i=i+32|0;o=n+16|0;p=n+12|0;q=n+8|0;r=n+4|0;s=n;t=fk(h)|0;c[q>>2]=t;u=bk(q,5928)|0;_i(t)|0;c[j>>2]=0;t=u+8|0;q=c[f>>2]|0;a:do if((l|0)!=(m|0)){v=l;w=q;b:while(1){x=w;if(w)if((c[w+12>>2]|0)==(c[w+16>>2]|0)?(Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0)==-1:0){c[f>>2]=0;y=0;z=0}else{y=w;z=x}else{y=0;z=x}x=(y|0)==0;A=c[g>>2]|0;B=A;do if(A){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(Wb[c[(c[A>>2]|0)+36>>2]&63](A)|0)==-1:0){c[g>>2]=0;C=0;D=11;break}if(x){E=A;F=B}else{G=y;D=12;break b}}else{C=B;D=11}while(0);if((D|0)==11){D=0;if(x){G=y;D=12;break}else{E=0;F=C}}c:do if((Pb[c[(c[u>>2]|0)+36>>2]&31](u,a[v>>0]|0,0)|0)<<24>>24==37){B=v+1|0;if((B|0)==(m|0)){H=y;D=15;break b}A=Pb[c[(c[u>>2]|0)+36>>2]&31](u,a[B>>0]|0,0)|0;switch(A<<24>>24){case 48:case 69:{I=v+2|0;if((I|0)==(m|0)){J=y;D=18;break b}K=B;L=Pb[c[(c[u>>2]|0)+36>>2]&31](u,a[I>>0]|0,0)|0;M=A;break}default:{K=v;L=A;M=0}}A=c[(c[e>>2]|0)+36>>2]|0;c[r>>2]=z;c[s>>2]=F;c[p>>2]=c[r>>2];c[o>>2]=c[s>>2];c[f>>2]=_b[A&15](e,p,o,h,j,k,L,M)|0;N=K+2|0}else{A=a[v>>0]|0;if(A<<24>>24>-1?(I=c[t>>2]|0,(b[I+(A<<24>>24<<1)>>1]&8192)!=0):0){A=v;while(1){B=A+1|0;if((B|0)==(m|0)){O=m;break}P=a[B>>0]|0;if(P<<24>>24<=-1){O=B;break}if(!(b[I+(P<<24>>24<<1)>>1]&8192)){O=B;break}else A=B}A=y;I=E;B=E;while(1){if(A)if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(Wb[c[(c[A>>2]|0)+36>>2]&63](A)|0)==-1:0){c[f>>2]=0;Q=0}else Q=A;else Q=0;P=(Q|0)==0;do if(B){if((c[B+12>>2]|0)!=(c[B+16>>2]|0))if(P){R=I;S=B;break}else{N=O;break c}if((Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)!=-1)if(P^(I|0)==0){R=I;S=I;break}else{N=O;break c}else{c[g>>2]=0;T=0;D=37;break}}else{T=I;D=37}while(0);if((D|0)==37){D=0;if(P){N=O;break c}else{R=T;S=0}}U=Q+12|0;V=c[U>>2]|0;W=Q+16|0;if((V|0)==(c[W>>2]|0))X=Wb[c[(c[Q>>2]|0)+36>>2]&63](Q)|0;else X=d[V>>0]|0;if((X&255)<<24>>24<=-1){N=O;break c}if(!(b[(c[t>>2]|0)+(X<<24>>24<<1)>>1]&8192)){N=O;break c}V=c[U>>2]|0;if((V|0)==(c[W>>2]|0)){Wb[c[(c[Q>>2]|0)+40>>2]&63](Q)|0;A=Q;I=R;B=S;continue}else{c[U>>2]=V+1;A=Q;I=R;B=S;continue}}}B=y+12|0;I=c[B>>2]|0;A=y+16|0;if((I|0)==(c[A>>2]|0))Y=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else Y=d[I>>0]|0;I=bc[c[(c[u>>2]|0)+12>>2]&15](u,Y&255)|0;if(I<<24>>24!=(bc[c[(c[u>>2]|0)+12>>2]&15](u,a[v>>0]|0)|0)<<24>>24){D=55;break b}I=c[B>>2]|0;if((I|0)==(c[A>>2]|0))Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;else c[B>>2]=I+1;N=v+1|0}while(0);x=c[f>>2]|0;if((N|0)!=(m|0)&(c[j>>2]|0)==0){v=N;w=x}else{Z=x;break a}}if((D|0)==12){c[j>>2]=4;Z=G;break}else if((D|0)==15){c[j>>2]=4;Z=H;break}else if((D|0)==18){c[j>>2]=4;Z=J;break}else if((D|0)==55){c[j>>2]=4;Z=c[f>>2]|0;break}}else Z=q;while(0);if(Z)if((c[Z+12>>2]|0)==(c[Z+16>>2]|0)?(Wb[c[(c[Z>>2]|0)+36>>2]&63](Z)|0)==-1:0){c[f>>2]=0;_=0}else _=Z;else _=0;Z=(_|0)==0;f=c[g>>2]|0;do if(f){if((c[f+12>>2]|0)==(c[f+16>>2]|0)?(Wb[c[(c[f>>2]|0)+36>>2]&63](f)|0)==-1:0){c[g>>2]=0;D=65;break}if(!Z)D=66}else D=65;while(0);if((D|0)==65?Z:0)D=66;if((D|0)==66)c[j>>2]=c[j>>2]|2;i=n;return _|0}function tc(d,e,f,g,h,i,j,k,l,m,n,o,p,q,r){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0;c[f>>2]=d;s=q+4|0;t=q+8|0;u=q+1|0;v=p+4|0;w=(g&512|0)==0;x=p+8|0;y=p+1|0;z=j+8|0;A=(r|0)>0;B=o+4|0;C=o+8|0;D=o+1|0;E=r+1|0;F=-2-r-((r|0)<0?~r:-1)|0;G=(r|0)>0;H=h;h=0;while(1){switch(a[l+h>>0]|0){case 0:{c[e>>2]=c[f>>2];I=H;break}case 1:{c[e>>2]=c[f>>2];J=bc[c[(c[j>>2]|0)+28>>2]&15](j,32)|0;K=c[f>>2]|0;c[f>>2]=K+1;a[K>>0]=J;I=H;break}case 3:{J=a[q>>0]|0;K=(J&1)==0;if(!((K?(J&255)>>>1:c[s>>2]|0)|0))I=H;else{J=a[(K?u:c[t>>2]|0)>>0]|0;K=c[f>>2]|0;c[f>>2]=K+1;a[K>>0]=J;I=H}break}case 2:{J=a[p>>0]|0;K=(J&1)==0;L=K?(J&255)>>>1:c[v>>2]|0;if(w|(L|0)==0)I=H;else{J=K?y:c[x>>2]|0;K=J+L|0;M=c[f>>2]|0;if(!L)N=M;else{L=M;M=J;while(1){a[L>>0]=a[M>>0]|0;M=M+1|0;J=L+1|0;if((M|0)==(K|0)){N=J;break}else L=J}}c[f>>2]=N;I=H}break}case 4:{L=c[f>>2]|0;K=k?H+1|0:H;M=K;J=c[z>>2]|0;a:do if(K>>>0<i>>>0){O=K;while(1){P=a[O>>0]|0;if(P<<24>>24<=-1){Q=O;break a}if(!(b[J+(P<<24>>24<<1)>>1]&2048)){Q=O;break a}P=O+1|0;if(P>>>0<i>>>0)O=P;else{Q=P;break}}}else Q=K;while(0);J=Q;if(A){O=-2-J-~(J>>>0>M>>>0?M:J)|0;J=F>>>0>O>>>0?F:O;if(Q>>>0>K>>>0&G){O=Q;P=r;while(1){O=O+-1|0;R=a[O>>0]|0;S=c[f>>2]|0;c[f>>2]=S+1;a[S>>0]=R;R=(P|0)>1;if(!(O>>>0>K>>>0&R)){T=R;break}else P=P+-1|0}}else T=G;P=E+J|0;O=Q+(J+1)|0;if(T)U=bc[c[(c[j>>2]|0)+28>>2]&15](j,48)|0;else U=0;M=c[f>>2]|0;c[f>>2]=M+1;if((P|0)>0){R=M;S=P;while(1){a[R>>0]=U;P=c[f>>2]|0;c[f>>2]=P+1;if((S|0)>1){R=P;S=S+-1|0}else{V=P;break}}}else V=M;a[V>>0]=m;W=O}else W=Q;if((W|0)!=(K|0)){S=a[o>>0]|0;R=(S&1)==0;if(!((R?(S&255)>>>1:c[B>>2]|0)|0))X=-1;else X=a[(R?D:c[C>>2]|0)>>0]|0;if((W|0)!=(K|0)){R=W;S=X;J=0;P=0;while(1){if((P|0)==(S|0)){Y=c[f>>2]|0;c[f>>2]=Y+1;a[Y>>0]=n;Y=J+1|0;Z=a[o>>0]|0;_=(Z&1)==0;if(Y>>>0<(_?(Z&255)>>>1:c[B>>2]|0)>>>0){Z=a[(_?D:c[C>>2]|0)+Y>>0]|0;$=Z<<24>>24==127?-1:Z<<24>>24;aa=Y;ba=0}else{$=P;aa=Y;ba=0}}else{$=S;aa=J;ba=P}R=R+-1|0;Y=a[R>>0]|0;Z=c[f>>2]|0;c[f>>2]=Z+1;a[Z>>0]=Y;if((R|0)==(K|0))break;else{S=$;J=aa;P=ba+1|0}}}}else{P=bc[c[(c[j>>2]|0)+28>>2]&15](j,48)|0;J=c[f>>2]|0;c[f>>2]=J+1;a[J>>0]=P}P=c[f>>2]|0;if((L|0)!=(P|0)?(J=P+-1|0,L>>>0<J>>>0):0){P=L;S=J;do{J=a[P>>0]|0;a[P>>0]=a[S>>0]|0;a[S>>0]=J;P=P+1|0;S=S+-1|0}while(P>>>0<S>>>0);I=K}else I=K;break}default:I=H}h=h+1|0;if((h|0)==4)break;else H=I}I=a[q>>0]|0;q=(I&1)==0;H=q?(I&255)>>>1:c[s>>2]|0;if(H>>>0>1){s=q?u:c[t>>2]|0;t=s+H|0;u=c[f>>2]|0;if((H|0)==1)ca=u;else{H=u;u=s+1|0;while(1){a[H>>0]=a[u>>0]|0;s=H+1|0;u=u+1|0;if((u|0)==(t|0)){ca=s;break}else H=s}}c[f>>2]=ca}switch(g&176|0){case 32:{c[e>>2]=c[f>>2];break}case 16:break;default:c[e>>2]=d}return}function vc(b,d,e,f,g,h,i,j,k,l,m,n,o,p,q){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;var r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0;c[e>>2]=b;r=p+4|0;s=p+8|0;t=o+4|0;u=(f&512|0)==0;v=o+8|0;w=(q|0)>0;x=n+4|0;y=n+8|0;z=n+1|0;A=(q|0)>0;B=g;g=0;while(1){switch(a[k+g>>0]|0){case 0:{c[d>>2]=c[e>>2];C=B;break}case 1:{c[d>>2]=c[e>>2];D=bc[c[(c[i>>2]|0)+44>>2]&15](i,32)|0;E=c[e>>2]|0;c[e>>2]=E+4;c[E>>2]=D;C=B;break}case 3:{D=a[p>>0]|0;E=(D&1)==0;if(!((E?(D&255)>>>1:c[r>>2]|0)|0))C=B;else{D=c[(E?r:c[s>>2]|0)>>2]|0;E=c[e>>2]|0;c[e>>2]=E+4;c[E>>2]=D;C=B}break}case 2:{D=a[o>>0]|0;E=(D&1)==0;F=E?(D&255)>>>1:c[t>>2]|0;if(u|(F|0)==0)C=B;else{D=E?t:c[v>>2]|0;E=D+(F<<2)|0;G=c[e>>2]|0;if(F){H=G;I=D;while(1){c[H>>2]=c[I>>2];I=I+4|0;if((I|0)==(E|0))break;else H=H+4|0}}c[e>>2]=G+(F<<2);C=B}break}case 4:{H=c[e>>2]|0;E=j?B+4|0:B;a:do if(E>>>0<h>>>0){I=E;while(1){if(!(Pb[c[(c[i>>2]|0)+12>>2]&31](i,2048,c[I>>2]|0)|0)){J=I;break a}D=I+4|0;if(D>>>0<h>>>0)I=D;else{J=D;break}}}else J=E;while(0);if(w){if(J>>>0>E>>>0&A){F=c[e>>2]|0;G=J;I=q;while(1){D=G+-4|0;K=F+4|0;c[F>>2]=c[D>>2];L=I+-1|0;M=(I|0)>1;if(D>>>0>E>>>0&M){F=K;G=D;I=L}else{N=D;O=L;P=M;Q=K;break}}c[e>>2]=Q;R=P;S=N;T=O}else{R=A;S=J;T=q}if(R)U=bc[c[(c[i>>2]|0)+44>>2]&15](i,48)|0;else U=0;I=c[e>>2]|0;G=T+((T|0)<0?~T:-1)|0;if((T|0)>0){F=I;K=T;while(1){c[F>>2]=U;if((K|0)>1){F=F+4|0;K=K+-1|0}else break}}c[e>>2]=I+(G+2<<2);c[I+(G+1<<2)>>2]=l;V=S}else V=J;if((V|0)==(E|0)){K=bc[c[(c[i>>2]|0)+44>>2]&15](i,48)|0;F=c[e>>2]|0;M=F+4|0;c[e>>2]=M;c[F>>2]=K;W=M}else{M=a[n>>0]|0;K=(M&1)==0;F=c[x>>2]|0;if(!((K?(M&255)>>>1:F)|0))X=-1;else X=a[(K?z:c[y>>2]|0)>>0]|0;if((V|0)!=(E|0)){K=V;M=X;L=0;D=0;while(1){Y=c[e>>2]|0;if((D|0)==(M|0)){Z=Y+4|0;c[e>>2]=Z;c[Y>>2]=m;_=L+1|0;$=a[n>>0]|0;aa=($&1)==0;if(_>>>0<(aa?($&255)>>>1:F)>>>0){$=a[(aa?z:c[y>>2]|0)+_>>0]|0;ba=Z;ca=$<<24>>24==127?-1:$<<24>>24;da=_;ea=0}else{ba=Z;ca=D;da=_;ea=0}}else{ba=Y;ca=M;da=L;ea=D}K=K+-4|0;Y=c[K>>2]|0;c[e>>2]=ba+4;c[ba>>2]=Y;if((K|0)==(E|0))break;else{M=ca;L=da;D=ea+1|0}}}W=c[e>>2]|0}if((H|0)!=(W|0)?(D=W+-4|0,H>>>0<D>>>0):0){L=H;M=D;do{D=c[L>>2]|0;c[L>>2]=c[M>>2];c[M>>2]=D;L=L+4|0;M=M+-4|0}while(L>>>0<M>>>0);C=E}else C=E;break}default:C=B}g=g+1|0;if((g|0)==4)break;else B=C}C=a[p>>0]|0;p=(C&1)==0;B=p?(C&255)>>>1:c[r>>2]|0;if(B>>>0>1){C=p?r:c[s>>2]|0;s=C+4|0;r=C+(B<<2)|0;C=c[e>>2]|0;p=r-s|0;if((B|0)!=1){B=C;g=s;while(1){c[B>>2]=c[g>>2];g=g+4|0;if((g|0)==(r|0))break;else B=B+4|0}}c[e>>2]=C+(p>>>2<<2)}switch(f&176|0){case 32:{c[d>>2]=c[e>>2];break}case 16:break;default:c[d>>2]=b}return}function yc(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0;h=c[e>>2]|0;if((g|0)!=0?(i=c[g>>2]|0,(i|0)!=0):0)if(!b){j=f;k=i;l=h;m=16}else{c[g>>2]=0;n=b;o=f;p=i;q=h;m=37}else if(!b){r=f;s=h;m=7}else{t=b;u=f;v=h;m=6}a:while(1)if((m|0)==6){m=0;if(!u){w=v;m=26;break}else{x=t;y=u;z=v}while(1){h=a[z>>0]|0;do if(((h&255)+-1|0)>>>0<127?y>>>0>4&(z&3|0)==0:0){i=x;g=y;A=z;while(1){B=c[A>>2]|0;if((B+-16843009|B)&-2139062144){C=i;D=g;E=B;F=A;m=32;break}c[i>>2]=B&255;c[i+4>>2]=d[A+1>>0];c[i+8>>2]=d[A+2>>0];B=A+4|0;G=i+16|0;c[i+12>>2]=d[A+3>>0];H=g+-4|0;if(H>>>0>4){i=G;g=H;A=B}else{I=B;J=G;K=H;m=31;break}}if((m|0)==31){m=0;L=J;M=K;N=a[I>>0]|0;O=I;break}else if((m|0)==32){m=0;L=C;M=D;N=E&255;O=F;break}}else{L=x;M=y;N=h;O=z}while(0);h=N&255;if((h+-1|0)>>>0>=127){P=L;Q=M;R=h;S=O;break}A=O+1|0;c[L>>2]=h;y=M+-1|0;if(!y){w=A;m=26;break a}else{x=L+4|0;z=A}}A=R+-194|0;if(A>>>0>50){T=P;U=Q;V=S;m=48;break}n=P;o=Q;p=c[2220+(A<<2)>>2]|0;q=S+1|0;m=37;continue}else if((m|0)==7){m=0;A=a[s>>0]|0;if(((A&255)+-1|0)>>>0<127?(s&3|0)==0:0){h=c[s>>2]|0;if(!((h+-16843009|h)&-2139062144)){g=r;i=s;while(1){H=i+4|0;G=g+-4|0;B=c[H>>2]|0;if(!((B+-16843009|B)&-2139062144)){g=G;i=H}else{W=G;X=B;Y=H;break}}}else{W=r;X=h;Y=s}Z=W;_=X&255;$=Y}else{Z=r;_=A;$=s}i=_&255;if((i+-1|0)>>>0<127){r=Z+-1|0;s=$+1|0;m=7;continue}else{aa=Z;ba=i;ca=$}i=ba+-194|0;if(i>>>0>50){T=b;U=aa;V=ca;m=48;break}j=aa;k=c[2220+(i<<2)>>2]|0;l=ca+1|0;m=16;continue}else if((m|0)==16){m=0;i=(d[l>>0]|0)>>>3;if((i+-16|i+(k>>26))>>>0>7){m=17;break}i=l+1|0;if(k&33554432){if((a[i>>0]&-64)<<24>>24!=-128){m=20;break}g=l+2|0;if(!(k&524288))da=g;else{if((a[g>>0]&-64)<<24>>24!=-128){m=23;break}da=l+3|0}}else da=i;r=j+-1|0;s=da;m=7;continue}else if((m|0)==37){m=0;i=d[q>>0]|0;g=i>>>3;if((g+-16|g+(p>>26))>>>0>7){m=38;break}g=q+1|0;H=i+-128|p<<6;if((H|0)<0){i=d[g>>0]|0;if((i&192|0)!=128){m=41;break}B=q+2|0;G=i+-128|H<<6;if((G|0)<0){i=d[B>>0]|0;if((i&192|0)!=128){m=44;break}ea=i+-128|G<<6;fa=q+3|0}else{ea=G;fa=B}}else{ea=H;fa=g}c[n>>2]=ea;t=n+4|0;u=o+-1|0;v=fa;m=6;continue}if((m|0)==17){ga=b;ha=j;ia=k;ja=l+-1|0;m=47}else if((m|0)==20){ga=b;ha=j;ia=k;ja=l+-1|0;m=47}else if((m|0)==23){ga=b;ha=j;ia=k;ja=l+-1|0;m=47}else if((m|0)==26){c[e>>2]=w;ka=f;return ka|0}else if((m|0)==38){ga=n;ha=o;ia=p;ja=q+-1|0;m=47}else if((m|0)==41){la=n;ma=q+-1|0}else if((m|0)==44){la=n;ma=q+-1|0}if((m|0)==47)if(!ia){T=ga;U=ha;V=ja;m=48}else{la=ga;ma=ja}if((m|0)==48)if(!(a[V>>0]|0)){if(T){c[T>>2]=0;c[e>>2]=0}ka=f-U|0;return ka|0}else{la=T;ma=V}c[(tb()|0)>>2]=84;if(!la){ka=-1;return ka|0}c[e>>2]=ma;ka=-1;return ka|0}function oc(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0;k=i;i=i+144|0;l=k+132|0;m=k+116|0;n=k+128|0;o=k+124|0;p=k+120|0;q=k+112|0;r=k+108|0;s=k+104|0;t=k+100|0;u=k+96|0;v=k+92|0;w=k+88|0;x=k+84|0;y=k+80|0;z=k+76|0;A=k+72|0;B=k+68|0;C=k+64|0;D=k+60|0;E=k+56|0;F=k+52|0;G=k+48|0;H=k+44|0;I=k+40|0;J=k+36|0;K=k+32|0;L=k+28|0;M=k+24|0;N=k+20|0;O=k+16|0;P=k+12|0;Q=k+8|0;R=k+4|0;S=k;c[g>>2]=0;T=fk(f)|0;c[n>>2]=T;U=bk(n,5920)|0;_i(T)|0;do switch(j<<24>>24|0){case 65:case 97:{c[o>>2]=c[e>>2];c[l>>2]=c[o>>2];Zf(b,h+24|0,d,l,g,U);V=26;break}case 104:case 66:case 98:{c[p>>2]=c[e>>2];c[l>>2]=c[p>>2];Pf(b,h+16|0,d,l,g,U);V=26;break}case 99:{T=b+8|0;n=Wb[c[(c[T>>2]|0)+12>>2]&63](T)|0;c[q>>2]=c[d>>2];c[r>>2]=c[e>>2];T=a[n>>0]|0;W=(T&1)==0;X=n+4|0;Y=W?X:c[n+8>>2]|0;n=Y+((W?(T&255)>>>1:c[X>>2]|0)<<2)|0;c[m>>2]=c[q>>2];c[l>>2]=c[r>>2];c[d>>2]=qc(b,m,l,f,g,h,Y,n)|0;V=26;break}case 101:case 100:{c[s>>2]=c[e>>2];c[l>>2]=c[s>>2];Qg(b,h+12|0,d,l,g,U);V=26;break}case 68:{c[t>>2]=c[d>>2];c[u>>2]=c[e>>2];c[m>>2]=c[t>>2];c[l>>2]=c[u>>2];c[d>>2]=qc(b,m,l,f,g,h,6528,6560)|0;V=26;break}case 70:{c[v>>2]=c[d>>2];c[w>>2]=c[e>>2];c[m>>2]=c[v>>2];c[l>>2]=c[w>>2];c[d>>2]=qc(b,m,l,f,g,h,6560,6592)|0;V=26;break}case 72:{c[x>>2]=c[e>>2];c[l>>2]=c[x>>2];bh(b,h+8|0,d,l,g,U);V=26;break}case 73:{c[y>>2]=c[e>>2];c[l>>2]=c[y>>2];Ng(b,h+8|0,d,l,g,U);V=26;break}case 106:{c[z>>2]=c[e>>2];c[l>>2]=c[z>>2];Rg(b,h+28|0,d,l,g,U);V=26;break}case 109:{c[A>>2]=c[e>>2];c[l>>2]=c[A>>2];Ug(b,h+16|0,d,l,g,U);V=26;break}case 77:{c[B>>2]=c[e>>2];c[l>>2]=c[B>>2];Zg(b,h+4|0,d,l,g,U);V=26;break}case 116:case 110:{c[C>>2]=c[e>>2];c[l>>2]=c[C>>2];wd(b,d,l,g,U);V=26;break}case 112:{c[D>>2]=c[e>>2];c[l>>2]=c[D>>2];Pe(b,h+8|0,d,l,g,U);V=26;break}case 114:{c[E>>2]=c[d>>2];c[F>>2]=c[e>>2];c[m>>2]=c[E>>2];c[l>>2]=c[F>>2];c[d>>2]=qc(b,m,l,f,g,h,6592,6636)|0;V=26;break}case 82:{c[G>>2]=c[d>>2];c[H>>2]=c[e>>2];c[m>>2]=c[G>>2];c[l>>2]=c[H>>2];c[d>>2]=qc(b,m,l,f,g,h,6636,6656)|0;V=26;break}case 83:{c[I>>2]=c[e>>2];c[l>>2]=c[I>>2];Yg(b,h,d,l,g,U);V=26;break}case 84:{c[J>>2]=c[d>>2];c[K>>2]=c[e>>2];c[m>>2]=c[J>>2];c[l>>2]=c[K>>2];c[d>>2]=qc(b,m,l,f,g,h,6656,6688)|0;V=26;break}case 119:{c[L>>2]=c[e>>2];c[l>>2]=c[L>>2];Xg(b,h+24|0,d,l,g,U);V=26;break}case 120:{n=c[(c[b>>2]|0)+20>>2]|0;c[M>>2]=c[d>>2];c[N>>2]=c[e>>2];c[m>>2]=c[M>>2];c[l>>2]=c[N>>2];Z=Ub[n&63](b,m,l,f,g,h)|0;break}case 88:{n=b+8|0;Y=Wb[c[(c[n>>2]|0)+24>>2]&63](n)|0;c[O>>2]=c[d>>2];c[P>>2]=c[e>>2];n=a[Y>>0]|0;X=(n&1)==0;T=Y+4|0;W=X?T:c[Y+8>>2]|0;Y=W+((X?(n&255)>>>1:c[T>>2]|0)<<2)|0;c[m>>2]=c[O>>2];c[l>>2]=c[P>>2];c[d>>2]=qc(b,m,l,f,g,h,W,Y)|0;V=26;break}case 121:{c[Q>>2]=c[e>>2];c[l>>2]=c[Q>>2];hg(b,h+20|0,d,l,g,U);V=26;break}case 89:{c[R>>2]=c[e>>2];c[l>>2]=c[R>>2];uh(b,h+20|0,d,l,g,U);V=26;break}case 37:{c[S>>2]=c[e>>2];c[l>>2]=c[S>>2];ud(b,d,l,g,U);V=26;break}default:{c[g>>2]=c[g>>2]|4;V=26}}while(0);if((V|0)==26)Z=c[d>>2]|0;i=k;return Z|0}function pc(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0;k=i;i=i+144|0;l=k+132|0;m=k+116|0;n=k+128|0;o=k+124|0;p=k+120|0;q=k+112|0;r=k+108|0;s=k+104|0;t=k+100|0;u=k+96|0;v=k+92|0;w=k+88|0;x=k+84|0;y=k+80|0;z=k+76|0;A=k+72|0;B=k+68|0;C=k+64|0;D=k+60|0;E=k+56|0;F=k+52|0;G=k+48|0;H=k+44|0;I=k+40|0;J=k+36|0;K=k+32|0;L=k+28|0;M=k+24|0;N=k+20|0;O=k+16|0;P=k+12|0;Q=k+8|0;R=k+4|0;S=k;c[g>>2]=0;T=fk(f)|0;c[n>>2]=T;U=bk(n,5928)|0;_i(T)|0;do switch(j<<24>>24|0){case 65:case 97:{c[o>>2]=c[e>>2];c[l>>2]=c[o>>2];_f(b,h+24|0,d,l,g,U);V=26;break}case 104:case 66:case 98:{c[p>>2]=c[e>>2];c[l>>2]=c[p>>2];Qf(b,h+16|0,d,l,g,U);V=26;break}case 99:{T=b+8|0;n=Wb[c[(c[T>>2]|0)+12>>2]&63](T)|0;c[q>>2]=c[d>>2];c[r>>2]=c[e>>2];T=a[n>>0]|0;W=(T&1)==0;X=W?n+1|0:c[n+8>>2]|0;Y=X+(W?(T&255)>>>1:c[n+4>>2]|0)|0;c[m>>2]=c[q>>2];c[l>>2]=c[r>>2];c[d>>2]=rc(b,m,l,f,g,h,X,Y)|0;V=26;break}case 101:case 100:{c[s>>2]=c[e>>2];c[l>>2]=c[s>>2];Sg(b,h+12|0,d,l,g,U);V=26;break}case 68:{c[t>>2]=c[d>>2];c[u>>2]=c[e>>2];c[m>>2]=c[t>>2];c[l>>2]=c[u>>2];c[d>>2]=rc(b,m,l,f,g,h,13611,13619)|0;V=26;break}case 70:{c[v>>2]=c[d>>2];c[w>>2]=c[e>>2];c[m>>2]=c[v>>2];c[l>>2]=c[w>>2];c[d>>2]=rc(b,m,l,f,g,h,13619,13627)|0;V=26;break}case 72:{c[x>>2]=c[e>>2];c[l>>2]=c[x>>2];ch(b,h+8|0,d,l,g,U);V=26;break}case 73:{c[y>>2]=c[e>>2];c[l>>2]=c[y>>2];Og(b,h+8|0,d,l,g,U);V=26;break}case 106:{c[z>>2]=c[e>>2];c[l>>2]=c[z>>2];Tg(b,h+28|0,d,l,g,U);V=26;break}case 109:{c[A>>2]=c[e>>2];c[l>>2]=c[A>>2];Vg(b,h+16|0,d,l,g,U);V=26;break}case 77:{c[B>>2]=c[e>>2];c[l>>2]=c[B>>2];ah(b,h+4|0,d,l,g,U);V=26;break}case 116:case 110:{c[C>>2]=c[e>>2];c[l>>2]=c[C>>2];Ad(b,d,l,g,U);V=26;break}case 112:{c[D>>2]=c[e>>2];c[l>>2]=c[D>>2];Qe(b,h+8|0,d,l,g,U);V=26;break}case 114:{c[E>>2]=c[d>>2];c[F>>2]=c[e>>2];c[m>>2]=c[E>>2];c[l>>2]=c[F>>2];c[d>>2]=rc(b,m,l,f,g,h,13627,13638)|0;V=26;break}case 82:{c[G>>2]=c[d>>2];c[H>>2]=c[e>>2];c[m>>2]=c[G>>2];c[l>>2]=c[H>>2];c[d>>2]=rc(b,m,l,f,g,h,13638,13643)|0;V=26;break}case 83:{c[I>>2]=c[e>>2];c[l>>2]=c[I>>2];$g(b,h,d,l,g,U);V=26;break}case 84:{c[J>>2]=c[d>>2];c[K>>2]=c[e>>2];c[m>>2]=c[J>>2];c[l>>2]=c[K>>2];c[d>>2]=rc(b,m,l,f,g,h,13643,13651)|0;V=26;break}case 119:{c[L>>2]=c[e>>2];c[l>>2]=c[L>>2];_g(b,h+24|0,d,l,g,U);V=26;break}case 120:{Y=c[(c[b>>2]|0)+20>>2]|0;c[M>>2]=c[d>>2];c[N>>2]=c[e>>2];c[m>>2]=c[M>>2];c[l>>2]=c[N>>2];Z=Ub[Y&63](b,m,l,f,g,h)|0;break}case 88:{Y=b+8|0;X=Wb[c[(c[Y>>2]|0)+24>>2]&63](Y)|0;c[O>>2]=c[d>>2];c[P>>2]=c[e>>2];Y=a[X>>0]|0;n=(Y&1)==0;T=n?X+1|0:c[X+8>>2]|0;W=T+(n?(Y&255)>>>1:c[X+4>>2]|0)|0;c[m>>2]=c[O>>2];c[l>>2]=c[P>>2];c[d>>2]=rc(b,m,l,f,g,h,T,W)|0;V=26;break}case 121:{c[Q>>2]=c[e>>2];c[l>>2]=c[Q>>2];ig(b,h+20|0,d,l,g,U);V=26;break}case 89:{c[R>>2]=c[e>>2];c[l>>2]=c[R>>2];th(b,h+20|0,d,l,g,U);V=26;break}case 37:{c[S>>2]=c[e>>2];c[l>>2]=c[S>>2];Bd(b,d,l,g,U);V=26;break}default:{c[g>>2]=c[g>>2]|4;V=26}}while(0);if((V|0)==26)Z=c[d>>2]|0;i=k;return Z|0}function wc(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0;k=i;i=i+112|0;l=k;m=(f-e|0)/12|0;if(m>>>0>100){n=fc(m)|0;if(!n)Zl();else{o=n;p=n}}else{o=0;p=l}if((e|0)==(f|0)){q=0;r=m}else{l=e;n=0;s=m;m=p;while(1){t=a[l>>0]|0;if(!(t&1))u=(t&255)>>>1;else u=c[l+4>>2]|0;if(!u){a[m>>0]=2;v=n+1|0;w=s+-1|0}else{a[m>>0]=1;v=n;w=s}l=l+12|0;if((l|0)==(f|0)){q=v;r=w;break}else{n=v;s=w;m=m+1|0}}}m=(e|0)==(f|0);w=(e|0)==(f|0);s=0;v=q;q=r;a:while(1){r=c[b>>2]|0;do if(r){n=c[r+12>>2]|0;if((n|0)==(c[r+16>>2]|0))x=Wb[c[(c[r>>2]|0)+36>>2]&63](r)|0;else x=c[n>>2]|0;if((x|0)==-1){c[b>>2]=0;y=1;break}else{y=(c[b>>2]|0)==0;break}}else y=1;while(0);r=c[d>>2]|0;if(r){n=c[r+12>>2]|0;if((n|0)==(c[r+16>>2]|0))z=Wb[c[(c[r>>2]|0)+36>>2]&63](r)|0;else z=c[n>>2]|0;if((z|0)==-1){c[d>>2]=0;A=0;B=1}else{A=r;B=0}}else{A=0;B=1}r=c[b>>2]|0;if(!((q|0)!=0&(y^B))){C=r;D=A;break}n=c[r+12>>2]|0;if((n|0)==(c[r+16>>2]|0))E=Wb[c[(c[r>>2]|0)+36>>2]&63](r)|0;else E=c[n>>2]|0;if(j)F=E;else F=bc[c[(c[g>>2]|0)+28>>2]&15](g,E)|0;n=s+1|0;if(m){G=0;H=v;I=q}else{r=0;l=e;u=v;t=q;J=p;while(1){do if((a[J>>0]|0)==1){if(!(a[l>>0]&1))K=l+4|0;else K=c[l+8>>2]|0;L=c[K+(s<<2)>>2]|0;if(j)M=L;else M=bc[c[(c[g>>2]|0)+28>>2]&15](g,L)|0;if((F|0)!=(M|0)){a[J>>0]=0;N=r;O=u;P=t+-1|0;break}L=a[l>>0]|0;if(!(L&1))Q=(L&255)>>>1;else Q=c[l+4>>2]|0;if((Q|0)==(n|0)){a[J>>0]=2;N=1;O=u+1|0;P=t+-1|0}else{N=1;O=u;P=t}}else{N=r;O=u;P=t}while(0);l=l+12|0;if((l|0)==(f|0)){G=N;H=O;I=P;break}else{r=N;u=O;t=P;J=J+1|0}}}if(!G){s=n;v=H;q=I;continue}J=c[b>>2]|0;t=J+12|0;u=c[t>>2]|0;if((u|0)==(c[J+16>>2]|0))Wb[c[(c[J>>2]|0)+40>>2]&63](J)|0;else c[t>>2]=u+4;if((H+I|0)>>>0<2|w){s=n;v=H;q=I;continue}else{R=e;S=H;T=p}while(1){if((a[T>>0]|0)==2){u=a[R>>0]|0;if(!(u&1))U=(u&255)>>>1;else U=c[R+4>>2]|0;if((U|0)!=(n|0)){a[T>>0]=0;V=S+-1|0}else V=S}else V=S;u=R+12|0;if((u|0)==(f|0)){s=n;v=V;q=I;continue a}else{R=u;S=V;T=T+1|0}}}do if(C){T=c[C+12>>2]|0;if((T|0)==(c[C+16>>2]|0))W=Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0;else W=c[T>>2]|0;if((W|0)==-1){c[b>>2]=0;X=1;break}else{X=(c[b>>2]|0)==0;break}}else X=1;while(0);do if(D){b=c[D+12>>2]|0;if((b|0)==(c[D+16>>2]|0))Y=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else Y=c[b>>2]|0;if((Y|0)!=-1)if(X)break;else{Z=74;break}else{c[d>>2]=0;Z=72;break}}else Z=72;while(0);if((Z|0)==72?X:0)Z=74;if((Z|0)==74)c[h>>2]=c[h>>2]|2;b:do if((e|0)==(f|0))Z=78;else{X=e;d=p;while(1){if((a[d>>0]|0)==2){_=X;break b}X=X+12|0;if((X|0)==(f|0)){Z=78;break}else d=d+1|0}}while(0);if((Z|0)==78){c[h>>2]=c[h>>2]|4;_=f}kc(o);i=k;return _|0}function Ac(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0;l=i;i=i+112|0;m=l;n=(g-f|0)/12|0;if(n>>>0>100){o=fc(n)|0;if(!o)Zl();else{p=o;q=o}}else{p=0;q=m}if((f|0)==(g|0)){r=0;s=n}else{m=f;o=0;t=n;n=q;while(1){u=a[m>>0]|0;if(!(u&1))v=(u&255)>>>1;else v=c[m+4>>2]|0;if(!v){a[n>>0]=2;w=o+1|0;x=t+-1|0}else{a[n>>0]=1;w=o;x=t}m=m+12|0;if((m|0)==(g|0)){r=w;s=x;break}else{o=w;t=x;n=n+1|0}}}n=(f|0)==(g|0);x=(f|0)==(g|0);t=0;w=r;r=s;a:while(1){s=c[b>>2]|0;do if(s)if((c[s+12>>2]|0)==(c[s+16>>2]|0))if((Wb[c[(c[s>>2]|0)+36>>2]&63](s)|0)==-1){c[b>>2]=0;y=0;break}else{y=c[b>>2]|0;break}else y=s;else y=0;while(0);s=(y|0)==0;o=c[e>>2]|0;if(o)if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(Wb[c[(c[o>>2]|0)+36>>2]&63](o)|0)==-1:0){c[e>>2]=0;z=0}else z=o;else z=0;o=(z|0)==0;m=c[b>>2]|0;if(!((r|0)!=0&(s^o))){A=o;B=m;C=z;break}o=c[m+12>>2]|0;if((o|0)==(c[m+16>>2]|0))D=Wb[c[(c[m>>2]|0)+36>>2]&63](m)|0;else D=d[o>>0]|0;o=D&255;if(k)E=o;else E=bc[c[(c[h>>2]|0)+12>>2]&15](h,o)|0;o=t+1|0;if(n){F=0;G=w;H=r}else{m=0;s=f;v=w;u=r;I=q;while(1){do if((a[I>>0]|0)==1){if(!(a[s>>0]&1))J=s+1|0;else J=c[s+8>>2]|0;K=a[J+t>>0]|0;if(k)L=K;else L=bc[c[(c[h>>2]|0)+12>>2]&15](h,K)|0;if(E<<24>>24!=L<<24>>24){a[I>>0]=0;M=m;N=v;O=u+-1|0;break}K=a[s>>0]|0;if(!(K&1))P=(K&255)>>>1;else P=c[s+4>>2]|0;if((P|0)==(o|0)){a[I>>0]=2;M=1;N=v+1|0;O=u+-1|0}else{M=1;N=v;O=u}}else{M=m;N=v;O=u}while(0);s=s+12|0;if((s|0)==(g|0)){F=M;G=N;H=O;break}else{m=M;v=N;u=O;I=I+1|0}}}if(!F){t=o;w=G;r=H;continue}I=c[b>>2]|0;u=I+12|0;v=c[u>>2]|0;if((v|0)==(c[I+16>>2]|0))Wb[c[(c[I>>2]|0)+40>>2]&63](I)|0;else c[u>>2]=v+1;if((G+H|0)>>>0<2|x){t=o;w=G;r=H;continue}else{Q=f;R=G;S=q}while(1){if((a[S>>0]|0)==2){v=a[Q>>0]|0;if(!(v&1))T=(v&255)>>>1;else T=c[Q+4>>2]|0;if((T|0)!=(o|0)){a[S>>0]=0;U=R+-1|0}else U=R}else U=R;v=Q+12|0;if((v|0)==(g|0)){t=o;w=U;r=H;continue a}else{Q=v;R=U;S=S+1|0}}}do if(B)if((c[B+12>>2]|0)==(c[B+16>>2]|0))if((Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1){c[b>>2]=0;V=0;break}else{V=c[b>>2]|0;break}else V=B;else V=0;while(0);B=(V|0)==0;do if(!A){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[e>>2]=0;W=65;break}if(!B)W=66}else W=65;while(0);if((W|0)==65?B:0)W=66;if((W|0)==66)c[j>>2]=c[j>>2]|2;b:do if((f|0)==(g|0))W=70;else{B=f;e=q;while(1){if((a[e>>0]|0)==2){X=B;break b}B=B+12|0;if((B|0)==(g|0)){W=70;break}else e=e+1|0}}while(0);if((W|0)==70){c[j>>2]=c[j>>2]|4;X=g}kc(p);i=l;return X|0}function sc(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;n=i;i=i+112|0;o=n+108|0;p=n+96|0;q=n+92|0;r=n+80|0;s=n+68|0;t=n+56|0;u=n+52|0;v=n+40|0;w=n+36|0;x=n+24|0;y=n+12|0;z=n;if(b){b=bk(e,5536)|0;A=c[b>>2]|0;if(d){Tb[c[A+44>>2]&63](o,b);B=c[o>>2]|0;a[f>>0]=B;a[f+1>>0]=B>>8;a[f+2>>0]=B>>16;a[f+3>>0]=B>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](p,b);if(!(a[l>>0]&1)){a[l+1>>0]=0;a[l>>0]=0}else{a[c[l+8>>2]>>0]=0;c[l+4>>2]=0}Ce(l,0);c[l>>2]=c[p>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;ul(p);C=b}else{Tb[c[A+40>>2]&63](q,b);A=c[q>>2]|0;a[f>>0]=A;a[f+1>>0]=A>>8;a[f+2>>0]=A>>16;a[f+3>>0]=A>>24;Tb[c[(c[b>>2]|0)+28>>2]&63](r,b);if(!(a[l>>0]&1)){a[l+1>>0]=0;a[l>>0]=0}else{a[c[l+8>>2]>>0]=0;c[l+4>>2]=0}Ce(l,0);c[l>>2]=c[r>>2];c[l+4>>2]=c[r+4>>2];c[l+8>>2]=c[r+8>>2];c[r>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;ul(r);C=b}a[g>>0]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;a[h>>0]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[C>>2]|0)+20>>2]&63](s,b);if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}Ce(j,0);c[j>>2]=c[s>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;ul(s);Tb[c[(c[C>>2]|0)+24>>2]&63](t,b);if(!(a[k>>0]&1)){a[k+1>>0]=0;a[k>>0]=0}else{a[c[k+8>>2]>>0]=0;c[k+4>>2]=0}Ce(k,0);c[k>>2]=c[t>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[t>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;ul(t);D=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}else{b=bk(e,5472)|0;e=c[b>>2]|0;if(d){Tb[c[e+44>>2]&63](u,b);d=c[u>>2]|0;a[f>>0]=d;a[f+1>>0]=d>>8;a[f+2>>0]=d>>16;a[f+3>>0]=d>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](v,b);if(!(a[l>>0]&1)){a[l+1>>0]=0;a[l>>0]=0}else{a[c[l+8>>2]>>0]=0;c[l+4>>2]=0}Ce(l,0);c[l>>2]=c[v>>2];c[l+4>>2]=c[v+4>>2];c[l+8>>2]=c[v+8>>2];c[v>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;ul(v);E=b}else{Tb[c[e+40>>2]&63](w,b);e=c[w>>2]|0;a[f>>0]=e;a[f+1>>0]=e>>8;a[f+2>>0]=e>>16;a[f+3>>0]=e>>24;Tb[c[(c[b>>2]|0)+28>>2]&63](x,b);if(!(a[l>>0]&1)){a[l+1>>0]=0;a[l>>0]=0}else{a[c[l+8>>2]>>0]=0;c[l+4>>2]=0}Ce(l,0);c[l>>2]=c[x>>2];c[l+4>>2]=c[x+4>>2];c[l+8>>2]=c[x+8>>2];c[x>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;ul(x);E=b}a[g>>0]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;a[h>>0]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[E>>2]|0)+20>>2]&63](y,b);if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}Ce(j,0);c[j>>2]=c[y>>2];c[j+4>>2]=c[y+4>>2];c[j+8>>2]=c[y+8>>2];c[y>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;ul(y);Tb[c[(c[E>>2]|0)+24>>2]&63](z,b);if(!(a[k>>0]&1)){a[k+1>>0]=0;a[k>>0]=0}else{a[c[k+8>>2]>>0]=0;c[k+4>>2]=0}Ce(k,0);c[k>>2]=c[z>>2];c[k+4>>2]=c[z+4>>2];c[k+8>>2]=c[z+8>>2];c[z>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;ul(z);D=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}c[m>>2]=D;i=n;return}function Cc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=a+4|0;e=c[d>>2]|0;f=e&-8;g=a+f|0;h=c[688]|0;i=e&3;if(!((i|0)!=1&a>>>0>=h>>>0&a>>>0<g>>>0))Cb();j=a+(f|4)|0;k=c[j>>2]|0;if(!(k&1))Cb();if(!i){if(b>>>0<256){l=0;return l|0}if(f>>>0>=(b+4|0)>>>0?(f-b|0)>>>0<=c[804]<<1>>>0:0){l=a;return l|0}l=0;return l|0}if(f>>>0>=b>>>0){i=f-b|0;if(i>>>0<=15){l=a;return l|0}c[d>>2]=e&1|b|2;c[a+(b+4)>>2]=i|3;c[j>>2]=c[j>>2]|1;lc(a+b|0,i);l=a;return l|0}if((g|0)==(c[690]|0)){i=(c[687]|0)+f|0;if(i>>>0<=b>>>0){l=0;return l|0}j=i-b|0;c[d>>2]=e&1|b|2;c[a+(b+4)>>2]=j|1;c[690]=a+b;c[687]=j;l=a;return l|0}if((g|0)==(c[689]|0)){j=(c[686]|0)+f|0;if(j>>>0<b>>>0){l=0;return l|0}i=j-b|0;if(i>>>0>15){c[d>>2]=e&1|b|2;c[a+(b+4)>>2]=i|1;c[a+j>>2]=i;m=a+(j+4)|0;c[m>>2]=c[m>>2]&-2;n=a+b|0;o=i}else{c[d>>2]=e&1|j|2;i=a+(j+4)|0;c[i>>2]=c[i>>2]|1;n=0;o=0}c[686]=o;c[689]=n;l=a;return l|0}if(k&2){l=0;return l|0}n=(k&-8)+f|0;if(n>>>0<b>>>0){l=0;return l|0}o=n-b|0;i=k>>>3;do if(k>>>0>=256){j=c[a+(f+24)>>2]|0;m=c[a+(f+12)>>2]|0;do if((m|0)==(g|0)){p=a+(f+20)|0;q=c[p>>2]|0;if(!q){r=a+(f+16)|0;s=c[r>>2]|0;if(!s){t=0;break}else{u=s;v=r}}else{u=q;v=p}while(1){p=u+20|0;q=c[p>>2]|0;if(q){u=q;v=p;continue}p=u+16|0;q=c[p>>2]|0;if(!q){w=u;x=v;break}else{u=q;v=p}}if(x>>>0<h>>>0)Cb();else{c[x>>2]=0;t=w;break}}else{p=c[a+(f+8)>>2]|0;if(p>>>0<h>>>0)Cb();q=p+12|0;if((c[q>>2]|0)!=(g|0))Cb();r=m+8|0;if((c[r>>2]|0)==(g|0)){c[q>>2]=m;c[r>>2]=p;t=m;break}else Cb()}while(0);if(j){m=c[a+(f+28)>>2]|0;p=3040+(m<<2)|0;if((g|0)==(c[p>>2]|0)){c[p>>2]=t;if(!t){c[685]=c[685]&~(1<<m);break}}else{if(j>>>0<(c[688]|0)>>>0)Cb();m=j+16|0;if((c[m>>2]|0)==(g|0))c[m>>2]=t;else c[j+20>>2]=t;if(!t)break}m=c[688]|0;if(t>>>0<m>>>0)Cb();c[t+24>>2]=j;p=c[a+(f+16)>>2]|0;do if(p)if(p>>>0<m>>>0)Cb();else{c[t+16>>2]=p;c[p+24>>2]=t;break}while(0);p=c[a+(f+20)>>2]|0;if(p)if(p>>>0<(c[688]|0)>>>0)Cb();else{c[t+20>>2]=p;c[p+24>>2]=t;break}}}else{p=c[a+(f+8)>>2]|0;m=c[a+(f+12)>>2]|0;j=2776+(i<<1<<2)|0;if((p|0)!=(j|0)){if(p>>>0<h>>>0)Cb();if((c[p+12>>2]|0)!=(g|0))Cb()}if((m|0)==(p|0)){c[684]=c[684]&~(1<<i);break}if((m|0)!=(j|0)){if(m>>>0<h>>>0)Cb();j=m+8|0;if((c[j>>2]|0)==(g|0))y=j;else Cb()}else y=m+8|0;c[p+12>>2]=m;c[y>>2]=p}while(0);if(o>>>0<16){c[d>>2]=n|e&1|2;y=a+(n|4)|0;c[y>>2]=c[y>>2]|1;l=a;return l|0}else{c[d>>2]=e&1|b|2;c[a+(b+4)>>2]=o|3;e=a+(n|4)|0;c[e>>2]=c[e>>2]|1;lc(a+b|0,o);l=a;return l|0}return 0}function uc(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;n=i;i=i+112|0;o=n+108|0;p=n+96|0;q=n+92|0;r=n+80|0;s=n+68|0;t=n+56|0;u=n+52|0;v=n+40|0;w=n+36|0;x=n+24|0;y=n+12|0;z=n;if(b){b=bk(e,5664)|0;A=c[b>>2]|0;if(d){Tb[c[A+44>>2]&63](o,b);B=c[o>>2]|0;a[f>>0]=B;a[f+1>>0]=B>>8;a[f+2>>0]=B>>16;a[f+3>>0]=B>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](p,b);if(!(a[l>>0]&1))a[l>>0]=0;else c[c[l+8>>2]>>2]=0;c[l+4>>2]=0;Fe(l,0);c[l>>2]=c[p>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;tl(p)}else{Tb[c[A+40>>2]&63](q,b);A=c[q>>2]|0;a[f>>0]=A;a[f+1>>0]=A>>8;a[f+2>>0]=A>>16;a[f+3>>0]=A>>24;Tb[c[(c[b>>2]|0)+28>>2]&63](r,b);if(!(a[l>>0]&1))a[l>>0]=0;else c[c[l+8>>2]>>2]=0;c[l+4>>2]=0;Fe(l,0);c[l>>2]=c[r>>2];c[l+4>>2]=c[r+4>>2];c[l+8>>2]=c[r+8>>2];c[r>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;tl(r)}c[g>>2]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;c[h>>2]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[b>>2]|0)+20>>2]&63](s,b);if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}Ce(j,0);c[j>>2]=c[s>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;ul(s);Tb[c[(c[b>>2]|0)+24>>2]&63](t,b);if(!(a[k>>0]&1))a[k>>0]=0;else c[c[k+8>>2]>>2]=0;c[k+4>>2]=0;Fe(k,0);c[k>>2]=c[t>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[t>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;tl(t);C=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}else{b=bk(e,5600)|0;e=c[b>>2]|0;if(d){Tb[c[e+44>>2]&63](u,b);d=c[u>>2]|0;a[f>>0]=d;a[f+1>>0]=d>>8;a[f+2>>0]=d>>16;a[f+3>>0]=d>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](v,b);if(!(a[l>>0]&1))a[l>>0]=0;else c[c[l+8>>2]>>2]=0;c[l+4>>2]=0;Fe(l,0);c[l>>2]=c[v>>2];c[l+4>>2]=c[v+4>>2];c[l+8>>2]=c[v+8>>2];c[v>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;tl(v)}else{Tb[c[e+40>>2]&63](w,b);e=c[w>>2]|0;a[f>>0]=e;a[f+1>>0]=e>>8;a[f+2>>0]=e>>16;a[f+3>>0]=e>>24;Tb[c[(c[b>>2]|0)+28>>2]&63](x,b);if(!(a[l>>0]&1))a[l>>0]=0;else c[c[l+8>>2]>>2]=0;c[l+4>>2]=0;Fe(l,0);c[l>>2]=c[x>>2];c[l+4>>2]=c[x+4>>2];c[l+8>>2]=c[x+8>>2];c[x>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;tl(x)}c[g>>2]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;c[h>>2]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[b>>2]|0)+20>>2]&63](y,b);if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}Ce(j,0);c[j>>2]=c[y>>2];c[j+4>>2]=c[y+4>>2];c[j+8>>2]=c[y+8>>2];c[y>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;ul(y);Tb[c[(c[b>>2]|0)+24>>2]&63](z,b);if(!(a[k>>0]&1))a[k>>0]=0;else c[c[k+8>>2]>>2]=0;c[k+4>>2]=0;Fe(k,0);c[k>>2]=c[z>>2];c[k+4>>2]=c[z+4>>2];c[k+8>>2]=c[z+8>>2];c[z>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;tl(z);C=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}c[m>>2]=C;i=n;return}function Bc(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;k=i;i=i+16|0;l=k;m=bk(j,5920)|0;n=bk(j,6076)|0;Tb[c[(c[n>>2]|0)+20>>2]&63](l,n);c[h>>2]=f;j=a[b>>0]|0;switch(j<<24>>24){case 43:case 45:{o=bc[c[(c[m>>2]|0)+44>>2]&15](m,j)|0;j=c[h>>2]|0;c[h>>2]=j+4;c[j>>2]=o;p=b+1|0;break}default:p=b}o=e;a:do if((o-p|0)>1?(a[p>>0]|0)==48:0){j=p+1|0;switch(a[j>>0]|0){case 88:case 120:break;default:{q=4;break a}}r=bc[c[(c[m>>2]|0)+44>>2]&15](m,48)|0;s=c[h>>2]|0;c[h>>2]=s+4;c[s>>2]=r;r=p+2|0;s=bc[c[(c[m>>2]|0)+44>>2]&15](m,a[j>>0]|0)|0;j=c[h>>2]|0;c[h>>2]=j+4;c[j>>2]=s;if(r>>>0<e>>>0){s=r;while(1){j=a[s>>0]|0;if(!(zo(j,jk()|0)|0)){t=r;u=s;break a}j=s+1|0;if(j>>>0<e>>>0)s=j;else{t=r;u=j;break}}}else{t=r;u=r}}else q=4;while(0);b:do if((q|0)==4)if(p>>>0<e>>>0){s=p;while(1){j=a[s>>0]|0;if(!(Yn(j,jk()|0)|0)){t=p;u=s;break b}j=s+1|0;if(j>>>0<e>>>0)s=j;else{t=p;u=j;break}}}else{t=p;u=p}while(0);p=a[l>>0]|0;q=l+4|0;if(((p&1)==0?(p&255)>>>1:c[q>>2]|0)|0){if((t|0)!=(u|0)?(p=u+-1|0,t>>>0<p>>>0):0){s=t;r=p;do{p=a[s>>0]|0;a[s>>0]=a[r>>0]|0;a[r>>0]=p;s=s+1|0;r=r+-1|0}while(s>>>0<r>>>0)}r=Wb[c[(c[n>>2]|0)+16>>2]&63](n)|0;s=l+8|0;p=l+1|0;if(t>>>0<u>>>0){j=0;v=0;w=t;while(1){x=a[((a[l>>0]&1)==0?p:c[s>>2]|0)+v>>0]|0;if(x<<24>>24>0&(j|0)==(x<<24>>24|0)){x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=r;x=a[l>>0]|0;y=0;z=(v>>>0<(((x&1)==0?(x&255)>>>1:c[q>>2]|0)+-1|0)>>>0&1)+v|0}else{y=j;z=v}x=bc[c[(c[m>>2]|0)+44>>2]&15](m,a[w>>0]|0)|0;A=c[h>>2]|0;c[h>>2]=A+4;c[A>>2]=x;w=w+1|0;if(w>>>0>=u>>>0)break;else{j=y+1|0;v=z}}}z=f+(t-b<<2)|0;v=c[h>>2]|0;if((z|0)!=(v|0)){y=v+-4|0;if(z>>>0<y>>>0){j=z;w=y;do{y=c[j>>2]|0;c[j>>2]=c[w>>2];c[w>>2]=y;j=j+4|0;w=w+-4|0}while(j>>>0<w>>>0);B=m;C=v}else{B=m;C=v}}else{B=m;C=z}}else{$b[c[(c[m>>2]|0)+48>>2]&7](m,t,u,c[h>>2]|0)|0;z=(c[h>>2]|0)+(u-t<<2)|0;c[h>>2]=z;B=m;C=z}c:do if(u>>>0<e>>>0){z=u;while(1){t=a[z>>0]|0;if(t<<24>>24==46){D=z;break}v=bc[c[(c[B>>2]|0)+44>>2]&15](m,t)|0;t=c[h>>2]|0;w=t+4|0;c[h>>2]=w;c[t>>2]=v;v=z+1|0;if(v>>>0<e>>>0)z=v;else{E=w;F=v;break c}}z=Wb[c[(c[n>>2]|0)+12>>2]&63](n)|0;v=c[h>>2]|0;w=v+4|0;c[h>>2]=w;c[v>>2]=z;E=w;F=D+1|0}else{E=C;F=u}while(0);$b[c[(c[m>>2]|0)+48>>2]&7](m,F,e,E)|0;E=(c[h>>2]|0)+(o-F<<2)|0;c[h>>2]=E;c[g>>2]=(d|0)==(e|0)?E:f+(d-b<<2)|0;ul(l);i=k;return}function xc(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;n=i;i=i+112|0;o=n+100|0;p=n+88|0;q=n+76|0;r=n+64|0;s=n+52|0;t=n+48|0;u=n+36|0;v=n+24|0;w=n+12|0;x=n;if(b){b=bk(d,5536)|0;Tb[c[(c[b>>2]|0)+44>>2]&63](o,b);y=c[o>>2]|0;a[e>>0]=y;a[e+1>>0]=y>>8;a[e+2>>0]=y>>16;a[e+3>>0]=y>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](p,b);if(!(a[l>>0]&1)){a[l+1>>0]=0;a[l>>0]=0}else{a[c[l+8>>2]>>0]=0;c[l+4>>2]=0}Ce(l,0);c[l>>2]=c[p>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;ul(p);Tb[c[(c[b>>2]|0)+28>>2]&63](q,b);if(!(a[k>>0]&1)){a[k+1>>0]=0;a[k>>0]=0}else{a[c[k+8>>2]>>0]=0;c[k+4>>2]=0}Ce(k,0);c[k>>2]=c[q>>2];c[k+4>>2]=c[q+4>>2];c[k+8>>2]=c[q+8>>2];c[q>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;ul(q);a[f>>0]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;a[g>>0]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[b>>2]|0)+20>>2]&63](r,b);if(!(a[h>>0]&1)){a[h+1>>0]=0;a[h>>0]=0}else{a[c[h+8>>2]>>0]=0;c[h+4>>2]=0}Ce(h,0);c[h>>2]=c[r>>2];c[h+4>>2]=c[r+4>>2];c[h+8>>2]=c[r+8>>2];c[r>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;ul(r);Tb[c[(c[b>>2]|0)+24>>2]&63](s,b);if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}Ce(j,0);c[j>>2]=c[s>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;ul(s);z=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}else{b=bk(d,5472)|0;Tb[c[(c[b>>2]|0)+44>>2]&63](t,b);d=c[t>>2]|0;a[e>>0]=d;a[e+1>>0]=d>>8;a[e+2>>0]=d>>16;a[e+3>>0]=d>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](u,b);if(!(a[l>>0]&1)){a[l+1>>0]=0;a[l>>0]=0}else{a[c[l+8>>2]>>0]=0;c[l+4>>2]=0}Ce(l,0);c[l>>2]=c[u>>2];c[l+4>>2]=c[u+4>>2];c[l+8>>2]=c[u+8>>2];c[u>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;ul(u);Tb[c[(c[b>>2]|0)+28>>2]&63](v,b);if(!(a[k>>0]&1)){a[k+1>>0]=0;a[k>>0]=0}else{a[c[k+8>>2]>>0]=0;c[k+4>>2]=0}Ce(k,0);c[k>>2]=c[v>>2];c[k+4>>2]=c[v+4>>2];c[k+8>>2]=c[v+8>>2];c[v>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;ul(v);a[f>>0]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;a[g>>0]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[b>>2]|0)+20>>2]&63](w,b);if(!(a[h>>0]&1)){a[h+1>>0]=0;a[h>>0]=0}else{a[c[h+8>>2]>>0]=0;c[h+4>>2]=0}Ce(h,0);c[h>>2]=c[w>>2];c[h+4>>2]=c[w+4>>2];c[h+8>>2]=c[w+8>>2];c[w>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;ul(w);Tb[c[(c[b>>2]|0)+24>>2]&63](x,b);if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}Ce(j,0);c[j>>2]=c[x>>2];c[j+4>>2]=c[x+4>>2];c[j+8>>2]=c[x+8>>2];c[x>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;ul(x);z=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}c[m>>2]=z;i=n;return}function Dc(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;g=c[a>>2]|0;do if(g){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0))i=Wb[c[(c[g>>2]|0)+36>>2]&63](g)|0;else i=c[h>>2]|0;if((i|0)==-1){c[a>>2]=0;j=1;break}else{j=(c[a>>2]|0)==0;break}}else j=1;while(0);i=c[b>>2]|0;do if(i){g=c[i+12>>2]|0;if((g|0)==(c[i+16>>2]|0))k=Wb[c[(c[i>>2]|0)+36>>2]&63](i)|0;else k=c[g>>2]|0;if((k|0)!=-1)if(j){l=i;m=17;break}else{m=16;break}else{c[b>>2]=0;m=14;break}}else m=14;while(0);if((m|0)==14)if(j)m=16;else{l=0;m=17}a:do if((m|0)==16){c[d>>2]=c[d>>2]|6;n=0}else if((m|0)==17){j=c[a>>2]|0;i=c[j+12>>2]|0;if((i|0)==(c[j+16>>2]|0))o=Wb[c[(c[j>>2]|0)+36>>2]&63](j)|0;else o=c[i>>2]|0;if(!(Pb[c[(c[e>>2]|0)+12>>2]&31](e,2048,o)|0)){c[d>>2]=c[d>>2]|4;n=0;break}i=(Pb[c[(c[e>>2]|0)+52>>2]&31](e,o,0)|0)<<24>>24;j=c[a>>2]|0;k=j+12|0;g=c[k>>2]|0;if((g|0)==(c[j+16>>2]|0)){Wb[c[(c[j>>2]|0)+40>>2]&63](j)|0;p=f;q=l;r=l;s=i}else{c[k>>2]=g+4;p=f;q=l;r=l;s=i}while(1){i=s+-48|0;g=p+-1|0;k=c[a>>2]|0;do if(k){j=c[k+12>>2]|0;if((j|0)==(c[k+16>>2]|0))t=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else t=c[j>>2]|0;if((t|0)==-1){c[a>>2]=0;u=1;break}else{u=(c[a>>2]|0)==0;break}}else u=1;while(0);do if(r){k=c[r+12>>2]|0;if((k|0)==(c[r+16>>2]|0))v=Wb[c[(c[r>>2]|0)+36>>2]&63](r)|0;else v=c[k>>2]|0;if((v|0)==-1){c[b>>2]=0;w=0;x=0;y=1;break}else{w=q;x=q;y=(q|0)==0;break}}else{w=q;x=0;y=1}while(0);k=c[a>>2]|0;if(!((p|0)>1&(u^y))){z=k;A=w;B=i;break}j=c[k+12>>2]|0;if((j|0)==(c[k+16>>2]|0))C=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else C=c[j>>2]|0;if(!(Pb[c[(c[e>>2]|0)+12>>2]&31](e,2048,C)|0)){n=i;break a}j=((Pb[c[(c[e>>2]|0)+52>>2]&31](e,C,0)|0)<<24>>24)+(i*10|0)|0;k=c[a>>2]|0;h=k+12|0;D=c[h>>2]|0;if((D|0)==(c[k+16>>2]|0)){Wb[c[(c[k>>2]|0)+40>>2]&63](k)|0;p=g;q=w;r=x;s=j;continue}else{c[h>>2]=D+4;p=g;q=w;r=x;s=j;continue}}do if(z){j=c[z+12>>2]|0;if((j|0)==(c[z+16>>2]|0))E=Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0;else E=c[j>>2]|0;if((E|0)==-1){c[a>>2]=0;F=1;break}else{F=(c[a>>2]|0)==0;break}}else F=1;while(0);do if(A){j=c[A+12>>2]|0;if((j|0)==(c[A+16>>2]|0))G=Wb[c[(c[A>>2]|0)+36>>2]&63](A)|0;else G=c[j>>2]|0;if((G|0)!=-1)if(F){n=B;break a}else break;else{c[b>>2]=0;m=60;break}}else m=60;while(0);if((m|0)==60?!F:0){n=B;break}c[d>>2]=c[d>>2]|2;n=B}while(0);return n|0}function Hc(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;k=i;i=i+16|0;l=k;m=bk(j,5928)|0;n=bk(j,6068)|0;Tb[c[(c[n>>2]|0)+20>>2]&63](l,n);c[h>>2]=f;j=a[b>>0]|0;switch(j<<24>>24){case 43:case 45:{o=bc[c[(c[m>>2]|0)+28>>2]&15](m,j)|0;j=c[h>>2]|0;c[h>>2]=j+1;a[j>>0]=o;p=b+1|0;break}default:p=b}o=e;a:do if((o-p|0)>1?(a[p>>0]|0)==48:0){j=p+1|0;switch(a[j>>0]|0){case 88:case 120:break;default:{q=4;break a}}r=bc[c[(c[m>>2]|0)+28>>2]&15](m,48)|0;s=c[h>>2]|0;c[h>>2]=s+1;a[s>>0]=r;r=p+2|0;s=bc[c[(c[m>>2]|0)+28>>2]&15](m,a[j>>0]|0)|0;j=c[h>>2]|0;c[h>>2]=j+1;a[j>>0]=s;if(r>>>0<e>>>0){s=r;while(1){j=a[s>>0]|0;if(!(zo(j,jk()|0)|0)){t=r;u=s;break a}j=s+1|0;if(j>>>0<e>>>0)s=j;else{t=r;u=j;break}}}else{t=r;u=r}}else q=4;while(0);b:do if((q|0)==4)if(p>>>0<e>>>0){s=p;while(1){j=a[s>>0]|0;if(!(Yn(j,jk()|0)|0)){t=p;u=s;break b}j=s+1|0;if(j>>>0<e>>>0)s=j;else{t=p;u=j;break}}}else{t=p;u=p}while(0);p=a[l>>0]|0;q=l+4|0;if(((p&1)==0?(p&255)>>>1:c[q>>2]|0)|0){if((t|0)!=(u|0)?(p=u+-1|0,t>>>0<p>>>0):0){s=t;r=p;do{p=a[s>>0]|0;a[s>>0]=a[r>>0]|0;a[r>>0]=p;s=s+1|0;r=r+-1|0}while(s>>>0<r>>>0)}r=Wb[c[(c[n>>2]|0)+16>>2]&63](n)|0;s=l+8|0;p=l+1|0;if(t>>>0<u>>>0){j=0;v=0;w=t;while(1){x=a[((a[l>>0]&1)==0?p:c[s>>2]|0)+v>>0]|0;if(x<<24>>24>0&(j|0)==(x<<24>>24|0)){x=c[h>>2]|0;c[h>>2]=x+1;a[x>>0]=r;x=a[l>>0]|0;y=0;z=(v>>>0<(((x&1)==0?(x&255)>>>1:c[q>>2]|0)+-1|0)>>>0&1)+v|0}else{y=j;z=v}x=bc[c[(c[m>>2]|0)+28>>2]&15](m,a[w>>0]|0)|0;A=c[h>>2]|0;c[h>>2]=A+1;a[A>>0]=x;w=w+1|0;if(w>>>0>=u>>>0)break;else{j=y+1|0;v=z}}}z=f+(t-b)|0;v=c[h>>2]|0;if((z|0)!=(v|0)?(y=v+-1|0,z>>>0<y>>>0):0){v=z;z=y;do{y=a[v>>0]|0;a[v>>0]=a[z>>0]|0;a[z>>0]=y;v=v+1|0;z=z+-1|0}while(v>>>0<z>>>0);B=m}else B=m}else{$b[c[(c[m>>2]|0)+32>>2]&7](m,t,u,c[h>>2]|0)|0;c[h>>2]=(c[h>>2]|0)+(u-t);B=m}c:do if(u>>>0<e>>>0){t=u;while(1){z=a[t>>0]|0;if(z<<24>>24==46){C=t;break}v=bc[c[(c[B>>2]|0)+28>>2]&15](m,z)|0;z=c[h>>2]|0;c[h>>2]=z+1;a[z>>0]=v;v=t+1|0;if(v>>>0<e>>>0)t=v;else{D=v;break c}}t=Wb[c[(c[n>>2]|0)+12>>2]&63](n)|0;v=c[h>>2]|0;c[h>>2]=v+1;a[v>>0]=t;D=C+1|0}else D=u;while(0);$b[c[(c[m>>2]|0)+32>>2]&7](m,D,e,c[h>>2]|0)|0;m=(c[h>>2]|0)+(o-D)|0;c[h>>2]=m;c[g>>2]=(d|0)==(e|0)?m:f+(d-b)|0;ul(l);i=k;return}function Nc(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;i=c[a>>2]|0;do if(i)if((c[i+12>>2]|0)==(c[i+16>>2]|0))if((Wb[c[(c[i>>2]|0)+36>>2]&63](i)|0)==-1){c[a>>2]=0;j=0;break}else{j=c[a>>2]|0;break}else j=i;else j=0;while(0);i=(j|0)==0;j=c[e>>2]|0;do if(j){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(Wb[c[(c[j>>2]|0)+36>>2]&63](j)|0)==-1:0){c[e>>2]=0;k=11;break}if(i){l=j;k=13}else k=12}else k=11;while(0);if((k|0)==11)if(i)k=12;else{l=0;k=13}a:do if((k|0)==12){c[f>>2]=c[f>>2]|6;m=0}else if((k|0)==13){i=c[a>>2]|0;j=c[i+12>>2]|0;if((j|0)==(c[i+16>>2]|0))n=Wb[c[(c[i>>2]|0)+36>>2]&63](i)|0;else n=d[j>>0]|0;j=n&255;if(j<<24>>24>-1?(i=g+8|0,(b[(c[i>>2]|0)+(n<<24>>24<<1)>>1]&2048)!=0):0){o=(Pb[c[(c[g>>2]|0)+36>>2]&31](g,j,0)|0)<<24>>24;j=c[a>>2]|0;p=j+12|0;q=c[p>>2]|0;if((q|0)==(c[j+16>>2]|0)){Wb[c[(c[j>>2]|0)+40>>2]&63](j)|0;r=h;s=l;t=l;u=o}else{c[p>>2]=q+1;r=h;s=l;t=l;u=o}while(1){o=u+-48|0;q=r+-1|0;p=c[a>>2]|0;do if(p)if((c[p+12>>2]|0)==(c[p+16>>2]|0))if((Wb[c[(c[p>>2]|0)+36>>2]&63](p)|0)==-1){c[a>>2]=0;v=0;break}else{v=c[a>>2]|0;break}else v=p;else v=0;while(0);p=(v|0)==0;if(t)if((c[t+12>>2]|0)==(c[t+16>>2]|0))if((Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0)==-1){c[e>>2]=0;w=0;x=0}else{w=s;x=s}else{w=s;x=t}else{w=s;x=0}j=c[a>>2]|0;if(!((r|0)>1&(p^(x|0)==0))){y=j;z=w;A=o;break}p=c[j+12>>2]|0;if((p|0)==(c[j+16>>2]|0))B=Wb[c[(c[j>>2]|0)+36>>2]&63](j)|0;else B=d[p>>0]|0;p=B&255;if(p<<24>>24<=-1){m=o;break a}if(!(b[(c[i>>2]|0)+(B<<24>>24<<1)>>1]&2048)){m=o;break a}j=((Pb[c[(c[g>>2]|0)+36>>2]&31](g,p,0)|0)<<24>>24)+(o*10|0)|0;p=c[a>>2]|0;C=p+12|0;D=c[C>>2]|0;if((D|0)==(c[p+16>>2]|0)){Wb[c[(c[p>>2]|0)+40>>2]&63](p)|0;r=q;s=w;t=x;u=j;continue}else{c[C>>2]=D+1;r=q;s=w;t=x;u=j;continue}}do if(y)if((c[y+12>>2]|0)==(c[y+16>>2]|0))if((Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0)==-1){c[a>>2]=0;E=0;break}else{E=c[a>>2]|0;break}else E=y;else E=0;while(0);i=(E|0)==0;do if(z){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0)==-1:0){c[e>>2]=0;k=50;break}if(i){m=A;break a}}else k=50;while(0);if((k|0)==50?!i:0){m=A;break}c[f>>2]=c[f>>2]|2;m=A;break}c[f>>2]=c[f>>2]|4;m=0}while(0);return m|0}function zc(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;n=i;i=i+112|0;o=n+100|0;p=n+88|0;q=n+76|0;r=n+64|0;s=n+52|0;t=n+48|0;u=n+36|0;v=n+24|0;w=n+12|0;x=n;if(b){b=bk(d,5664)|0;Tb[c[(c[b>>2]|0)+44>>2]&63](o,b);y=c[o>>2]|0;a[e>>0]=y;a[e+1>>0]=y>>8;a[e+2>>0]=y>>16;a[e+3>>0]=y>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](p,b);if(!(a[l>>0]&1))a[l>>0]=0;else c[c[l+8>>2]>>2]=0;c[l+4>>2]=0;Fe(l,0);c[l>>2]=c[p>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;tl(p);Tb[c[(c[b>>2]|0)+28>>2]&63](q,b);if(!(a[k>>0]&1))a[k>>0]=0;else c[c[k+8>>2]>>2]=0;c[k+4>>2]=0;Fe(k,0);c[k>>2]=c[q>>2];c[k+4>>2]=c[q+4>>2];c[k+8>>2]=c[q+8>>2];c[q>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;tl(q);c[f>>2]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;c[g>>2]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[b>>2]|0)+20>>2]&63](r,b);if(!(a[h>>0]&1)){a[h+1>>0]=0;a[h>>0]=0}else{a[c[h+8>>2]>>0]=0;c[h+4>>2]=0}Ce(h,0);c[h>>2]=c[r>>2];c[h+4>>2]=c[r+4>>2];c[h+8>>2]=c[r+8>>2];c[r>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;ul(r);Tb[c[(c[b>>2]|0)+24>>2]&63](s,b);if(!(a[j>>0]&1))a[j>>0]=0;else c[c[j+8>>2]>>2]=0;c[j+4>>2]=0;Fe(j,0);c[j>>2]=c[s>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;tl(s);z=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}else{b=bk(d,5600)|0;Tb[c[(c[b>>2]|0)+44>>2]&63](t,b);d=c[t>>2]|0;a[e>>0]=d;a[e+1>>0]=d>>8;a[e+2>>0]=d>>16;a[e+3>>0]=d>>24;Tb[c[(c[b>>2]|0)+32>>2]&63](u,b);if(!(a[l>>0]&1))a[l>>0]=0;else c[c[l+8>>2]>>2]=0;c[l+4>>2]=0;Fe(l,0);c[l>>2]=c[u>>2];c[l+4>>2]=c[u+4>>2];c[l+8>>2]=c[u+8>>2];c[u>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;tl(u);Tb[c[(c[b>>2]|0)+28>>2]&63](v,b);if(!(a[k>>0]&1))a[k>>0]=0;else c[c[k+8>>2]>>2]=0;c[k+4>>2]=0;Fe(k,0);c[k>>2]=c[v>>2];c[k+4>>2]=c[v+4>>2];c[k+8>>2]=c[v+8>>2];c[v>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;tl(v);c[f>>2]=Wb[c[(c[b>>2]|0)+12>>2]&63](b)|0;c[g>>2]=Wb[c[(c[b>>2]|0)+16>>2]&63](b)|0;Tb[c[(c[b>>2]|0)+20>>2]&63](w,b);if(!(a[h>>0]&1)){a[h+1>>0]=0;a[h>>0]=0}else{a[c[h+8>>2]>>0]=0;c[h+4>>2]=0}Ce(h,0);c[h>>2]=c[w>>2];c[h+4>>2]=c[w+4>>2];c[h+8>>2]=c[w+8>>2];c[w>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;ul(w);Tb[c[(c[b>>2]|0)+24>>2]&63](x,b);if(!(a[j>>0]&1))a[j>>0]=0;else c[c[j+8>>2]>>2]=0;c[j+4>>2]=0;Fe(j,0);c[j>>2]=c[x>>2];c[j+4>>2]=c[x+4>>2];c[j+8>>2]=c[x+8>>2];c[x>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;tl(x);z=Wb[c[(c[b>>2]|0)+36>>2]&63](b)|0}c[m>>2]=z;i=n;return}function $c(a,b){a=+a;b=+b;var d=0,e=0,f=0,g=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0.0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0.0;h[k>>3]=a;d=c[k>>2]|0;e=c[k+4>>2]|0;h[k>>3]=b;f=c[k>>2]|0;g=c[k+4>>2]|0;i=ek(d|0,e|0,52)|0;j=i&2047;i=ek(f|0,g|0,52)|0;l=i&2047;i=e&-2147483648;m=ck(f|0,g|0,1)|0;n=G;if(!((m|0)==0&(n|0)==0)?(o=g&2147483647,!(o>>>0>2146435072|(o|0)==2146435072&f>>>0>0|(j|0)==2047)):0){o=ck(d|0,e|0,1)|0;p=G;if(!(p>>>0>n>>>0|(p|0)==(n|0)&o>>>0>m>>>0))return +((o|0)==(m|0)&(p|0)==(n|0)?a*0.0:a);if(!j){n=ck(d|0,e|0,12)|0;p=G;if((p|0)>-1|(p|0)==-1&n>>>0>4294967295){m=n;n=p;p=0;while(1){o=p+-1|0;m=ck(m|0,n|0,1)|0;n=G;if(!((n|0)>-1|(n|0)==-1&m>>>0>4294967295)){q=o;break}else p=o}}else q=0;p=ck(d|0,e|0,1-q|0)|0;r=p;s=G;t=q}else{r=d;s=e&1048575|1048576;t=j}if(!l){j=ck(f|0,g|0,12)|0;e=G;if((e|0)>-1|(e|0)==-1&j>>>0>4294967295){d=j;j=e;e=0;while(1){q=e+-1|0;d=ck(d|0,j|0,1)|0;j=G;if(!((j|0)>-1|(j|0)==-1&d>>>0>4294967295)){u=q;break}else e=q}}else u=0;e=ck(f|0,g|0,1-u|0)|0;v=e;w=G;x=u}else{v=f;w=g&1048575|1048576;x=l}l=Oj(r|0,s|0,v|0,w|0)|0;g=G;f=(g|0)>-1|(g|0)==-1&l>>>0>4294967295;a:do if((t|0)>(x|0)){u=f;e=l;d=g;j=r;q=s;p=t;while(1){if(u)if((j|0)==(v|0)&(q|0)==(w|0))break;else{y=e;z=d}else{y=j;z=q}m=ck(y|0,z|0,1)|0;n=G;o=p+-1|0;A=Oj(m|0,n|0,v|0,w|0)|0;B=G;C=(B|0)>-1|(B|0)==-1&A>>>0>4294967295;if((o|0)>(x|0)){u=C;e=A;d=B;j=m;q=n;p=o}else{D=C;E=m;F=n;H=A;I=B;J=o;break a}}K=a*0.0;return +K}else{D=f;E=r;F=s;H=l;I=g;J=t}while(0);if(D)if((E|0)==(v|0)&(F|0)==(w|0)){K=a*0.0;return +K}else{L=I;M=H}else{L=F;M=E}if(L>>>0<1048576|(L|0)==1048576&M>>>0<0){E=M;F=L;H=J;while(1){I=ck(E|0,F|0,1)|0;w=G;v=H+-1|0;if(w>>>0<1048576|(w|0)==1048576&I>>>0<0){E=I;F=w;H=v}else{N=I;O=w;P=v;break}}}else{N=M;O=L;P=J}if((P|0)>0){J=Ok(N|0,O|0,0,-1048576)|0;L=G;M=ck(P|0,0,52)|0;Q=L|G;R=J|M}else{M=ek(N|0,O|0,1-P|0)|0;Q=G;R=M}c[k>>2]=R;c[k+4>>2]=Q|i;K=+h[k>>3];return +K}S=a*b;K=S/S;return +K}function ed(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;h=c;if((((g&4|0)!=0?(h-b|0)>2:0)?(a[b>>0]|0)==-17:0)?(a[b+1>>0]|0)==-69:0)i=(a[b+2>>0]|0)==-65?b+3|0:b;else i=b;a:do if((e|0)!=0&i>>>0<c>>>0){g=i;j=0;b:while(1){k=a[g>>0]|0;l=k&255;if(l>>>0>f>>>0){m=g;n=42;break a}do if(k<<24>>24>-1){o=g+1|0;p=j}else{if((k&255)<194){m=g;n=42;break a}if((k&255)<224){if((h-g|0)<2){m=g;n=42;break a}q=d[g+1>>0]|0;if((q&192|0)!=128){m=g;n=42;break a}if((q&63|l<<6&1984)>>>0>f>>>0){m=g;n=42;break a}o=g+2|0;p=j;break}if((k&255)<240){q=g;if((h-q|0)<3){m=g;n=42;break a}r=a[g+1>>0]|0;s=a[g+2>>0]|0;switch(l|0){case 224:{if((r&-32)<<24>>24!=-96){t=q;n=20;break b}break}case 237:{if((r&-32)<<24>>24!=-128){u=q;n=22;break b}break}default:if((r&-64)<<24>>24!=-128){v=q;n=24;break b}}q=s&255;if((q&192|0)!=128){m=g;n=42;break a}if(((r&255)<<6&4032|l<<12&61440|q&63)>>>0>f>>>0){m=g;n=42;break a}o=g+3|0;p=j;break}if((k&255)>=245){m=g;n=42;break a}q=g;if((e-j|0)>>>0<2|(h-q|0)<4){m=g;n=42;break a}r=a[g+1>>0]|0;s=a[g+2>>0]|0;w=a[g+3>>0]|0;switch(l|0){case 240:{if((r+112&255)>=48){x=q;n=32;break b}break}case 244:{if((r&-16)<<24>>24!=-128){y=q;n=34;break b}break}default:if((r&-64)<<24>>24!=-128){z=q;n=36;break b}}q=s&255;if((q&192|0)!=128){m=g;n=42;break a}s=w&255;if((s&192|0)!=128){m=g;n=42;break a}if(((r&255)<<12&258048|l<<18&1835008|q<<6&4032|s&63)>>>0>f>>>0){m=g;n=42;break a}o=g+4|0;p=j+1|0}while(0);j=p+1|0;if(!(j>>>0<e>>>0&o>>>0<c>>>0)){m=o;n=42;break a}else g=o}if((n|0)==20){A=t-b|0;break}else if((n|0)==22){A=u-b|0;break}else if((n|0)==24){A=v-b|0;break}else if((n|0)==32){A=x-b|0;break}else if((n|0)==34){A=y-b|0;break}else if((n|0)==36){A=z-b|0;break}}else{m=i;n=42}while(0);if((n|0)==42)A=m-b|0;return A|0}function ad(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0;g=a;h=b;i=h;j=d;k=e;l=k;if(!i){m=(f|0)!=0;if(!l){if(m){c[f>>2]=(g>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(g>>>0)/(j>>>0)>>>0;return (G=n,o)|0}else{if(!m){n=0;o=0;return (G=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;n=0;o=0;return (G=n,o)|0}}m=(l|0)==0;do if(j){if(!m){p=(ea(l|0)|0)-(ea(i|0)|0)|0;if(p>>>0<=31){q=p+1|0;r=31-p|0;s=p-31>>31;t=q;u=g>>>(q>>>0)&s|i<<r;v=i>>>(q>>>0)&s;w=0;x=g<<r;break}if(!f){n=0;o=0;return (G=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return (G=n,o)|0}r=j-1|0;if(r&j){s=(ea(j|0)|0)+33-(ea(i|0)|0)|0;q=64-s|0;p=32-s|0;y=p>>31;z=s-32|0;A=z>>31;t=s;u=p-1>>31&i>>>(z>>>0)|(i<<p|g>>>(s>>>0))&A;v=A&i>>>(s>>>0);w=g<<q&y;x=(i<<q|g>>>(z>>>0))&y|g<<p&s-33>>31;break}if(f){c[f>>2]=r&g;c[f+4>>2]=0}if((j|0)==1){n=h|b&0;o=a|0|0;return (G=n,o)|0}else{r=Bi(j|0)|0;n=i>>>(r>>>0)|0;o=i<<32-r|g>>>(r>>>0)|0;return (G=n,o)|0}}else{if(m){if(f){c[f>>2]=(i>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(i>>>0)/(j>>>0)>>>0;return (G=n,o)|0}if(!g){if(f){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}n=0;o=(i>>>0)/(l>>>0)>>>0;return (G=n,o)|0}r=l-1|0;if(!(r&l)){if(f){c[f>>2]=a|0;c[f+4>>2]=r&i|b&0}n=0;o=i>>>((Bi(l|0)|0)>>>0);return (G=n,o)|0}r=(ea(l|0)|0)-(ea(i|0)|0)|0;if(r>>>0<=30){s=r+1|0;p=31-r|0;t=s;u=i<<p|g>>>(s>>>0);v=i>>>(s>>>0);w=0;x=g<<p;break}if(!f){n=0;o=0;return (G=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return (G=n,o)|0}while(0);if(!t){B=x;C=w;D=v;E=u;F=0;H=0}else{b=d|0|0;d=k|e&0;e=Ok(b|0,d|0,-1,-1)|0;k=G;h=x;x=w;w=v;v=u;u=t;t=0;do{a=h;h=x>>>31|h<<1;x=t|x<<1;g=v<<1|a>>>31|0;a=v>>>31|w<<1|0;Oj(e,k,g,a)|0;i=G;l=i>>31|((i|0)<0?-1:0)<<1;t=l&1;v=Oj(g,a,l&b,(((i|0)<0?-1:0)>>31|((i|0)<0?-1:0)<<1)&d)|0;w=G;u=u-1|0}while((u|0)!=0);B=h;C=x;D=w;E=v;F=0;H=t}t=C;C=0;if(f){c[f>>2]=E;c[f+4>>2]=D}n=(t|0)>>>31|(B|C)<<1|(C<<1|t>>>31)&0|F;o=(t<<1|0>>>31)&-2|H;return (G=n,o)|0}function hd(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;h=c;if((((g&4|0)!=0?(h-b|0)>2:0)?(a[b>>0]|0)==-17:0)?(a[b+1>>0]|0)==-69:0)i=(a[b+2>>0]|0)==-65?b+3|0:b;else i=b;a:do if((e|0)!=0&i>>>0<c>>>0){g=i;j=0;b:while(1){k=a[g>>0]|0;l=k&255;do if(k<<24>>24>-1){if(l>>>0>f>>>0){m=g;n=42;break a}o=g+1|0}else{if((k&255)<194){m=g;n=42;break a}if((k&255)<224){if((h-g|0)<2){m=g;n=42;break a}p=d[g+1>>0]|0;if((p&192|0)!=128){m=g;n=42;break a}if((p&63|l<<6&1984)>>>0>f>>>0){m=g;n=42;break a}o=g+2|0;break}if((k&255)<240){p=g;if((h-p|0)<3){m=g;n=42;break a}q=a[g+1>>0]|0;r=a[g+2>>0]|0;switch(l|0){case 224:{if((q&-32)<<24>>24!=-96){s=p;n=20;break b}break}case 237:{if((q&-32)<<24>>24!=-128){t=p;n=22;break b}break}default:if((q&-64)<<24>>24!=-128){u=p;n=24;break b}}p=r&255;if((p&192|0)!=128){m=g;n=42;break a}if(((q&255)<<6&4032|l<<12&61440|p&63)>>>0>f>>>0){m=g;n=42;break a}o=g+3|0;break}if((k&255)>=245){m=g;n=42;break a}p=g;if((h-p|0)<4){m=g;n=42;break a}q=a[g+1>>0]|0;r=a[g+2>>0]|0;v=a[g+3>>0]|0;switch(l|0){case 240:{if((q+112&255)>=48){w=p;n=32;break b}break}case 244:{if((q&-16)<<24>>24!=-128){x=p;n=34;break b}break}default:if((q&-64)<<24>>24!=-128){y=p;n=36;break b}}p=r&255;if((p&192|0)!=128){m=g;n=42;break a}r=v&255;if((r&192|0)!=128){m=g;n=42;break a}if(((q&255)<<12&258048|l<<18&1835008|p<<6&4032|r&63)>>>0>f>>>0){m=g;n=42;break a}o=g+4|0}while(0);j=j+1|0;if(!(j>>>0<e>>>0&o>>>0<c>>>0)){m=o;n=42;break a}else g=o}if((n|0)==20){z=s-b|0;break}else if((n|0)==22){z=t-b|0;break}else if((n|0)==24){z=u-b|0;break}else if((n|0)==32){z=w-b|0;break}else if((n|0)==34){z=x-b|0;break}else if((n|0)==36){z=y-b|0;break}}else{m=i;n=42}while(0);if((n|0)==42)z=m-b|0;return z|0}function Gc(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;b=i;i=i+352|0;k=b+208|0;l=b+40|0;m=b+36|0;n=b+24|0;o=b+12|0;p=b+8|0;q=b+48|0;r=b+4|0;s=b;t=b+337|0;u=b+336|0;Ef(n,f,k,l,m);c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;if(!(a[o>>0]&1))v=10;else v=(c[o>>2]&-2)+-1|0;mh(o,v,0);v=o+8|0;f=o+1|0;w=(a[o>>0]&1)==0?f:c[v>>2]|0;c[p>>2]=w;c[r>>2]=q;c[s>>2]=0;a[t>>0]=1;a[u>>0]=69;x=o+4|0;y=c[l>>2]|0;l=c[m>>2]|0;m=c[d>>2]|0;z=w;a:while(1){if(m){w=c[m+12>>2]|0;if((w|0)==(c[m+16>>2]|0))A=Wb[c[(c[m>>2]|0)+36>>2]&63](m)|0;else A=c[w>>2]|0;if((A|0)==-1){c[d>>2]=0;B=0;C=1}else{B=m;C=0}}else{B=0;C=1}w=c[e>>2]|0;do if(w){D=c[w+12>>2]|0;if((D|0)==(c[w+16>>2]|0))E=Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0;else E=c[D>>2]|0;if((E|0)!=-1)if(C){F=w;break}else{G=B;H=w;I=z;break a}else{c[e>>2]=0;J=16;break}}else J=16;while(0);if((J|0)==16){J=0;if(C){G=B;H=0;I=z;break}else F=0}w=a[o>>0]|0;D=(w&1)==0?(w&255)>>>1:c[x>>2]|0;if((c[p>>2]|0)==(z+D|0)){mh(o,D<<1,0);if(!(a[o>>0]&1))K=10;else K=(c[o>>2]&-2)+-1|0;mh(o,K,0);w=(a[o>>0]&1)==0?f:c[v>>2]|0;c[p>>2]=w+D;L=w}else L=z;w=B+12|0;D=c[w>>2]|0;M=B+16|0;if((D|0)==(c[M>>2]|0))N=Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0;else N=c[D>>2]|0;if(Cd(N,t,u,L,p,y,l,n,q,r,s,k)|0){G=B;H=F;I=L;break}D=c[w>>2]|0;if((D|0)==(c[M>>2]|0)){Wb[c[(c[B>>2]|0)+40>>2]&63](B)|0;m=B;z=L;continue}else{c[w>>2]=D+4;m=B;z=L;continue}}L=a[n>>0]|0;z=c[r>>2]|0;if(!((a[t>>0]|0)==0?1:(((L&1)==0?(L&255)>>>1:c[n+4>>2]|0)|0)==0)?(z-q|0)<160:0){L=c[s>>2]|0;s=z+4|0;c[r>>2]=s;c[z>>2]=L;O=s}else O=z;h[j>>3]=+eg(I,c[p>>2]|0,g);ae(n,q,O,g);if(G){O=c[G+12>>2]|0;if((O|0)==(c[G+16>>2]|0))P=Wb[c[(c[G>>2]|0)+36>>2]&63](G)|0;else P=c[O>>2]|0;if((P|0)==-1){c[d>>2]=0;Q=1}else Q=0}else Q=1;do if(H){P=c[H+12>>2]|0;if((P|0)==(c[H+16>>2]|0))R=Wb[c[(c[H>>2]|0)+36>>2]&63](H)|0;else R=c[P>>2]|0;if((R|0)!=-1)if(Q)break;else{J=46;break}else{c[e>>2]=0;J=44;break}}else J=44;while(0);if((J|0)==44?Q:0)J=46;if((J|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(o);ul(n);i=b;return g|0}function Fc(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;b=i;i=i+352|0;k=b+208|0;l=b+40|0;m=b+36|0;n=b+24|0;o=b+12|0;p=b+8|0;q=b+48|0;r=b+4|0;s=b;t=b+337|0;u=b+336|0;Ef(n,f,k,l,m);c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;if(!(a[o>>0]&1))v=10;else v=(c[o>>2]&-2)+-1|0;mh(o,v,0);v=o+8|0;f=o+1|0;w=(a[o>>0]&1)==0?f:c[v>>2]|0;c[p>>2]=w;c[r>>2]=q;c[s>>2]=0;a[t>>0]=1;a[u>>0]=69;x=o+4|0;y=c[l>>2]|0;l=c[m>>2]|0;m=c[d>>2]|0;z=w;a:while(1){if(m){w=c[m+12>>2]|0;if((w|0)==(c[m+16>>2]|0))A=Wb[c[(c[m>>2]|0)+36>>2]&63](m)|0;else A=c[w>>2]|0;if((A|0)==-1){c[d>>2]=0;B=0;C=1}else{B=m;C=0}}else{B=0;C=1}w=c[e>>2]|0;do if(w){D=c[w+12>>2]|0;if((D|0)==(c[w+16>>2]|0))E=Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0;else E=c[D>>2]|0;if((E|0)!=-1)if(C){F=w;break}else{G=B;H=w;I=z;break a}else{c[e>>2]=0;J=16;break}}else J=16;while(0);if((J|0)==16){J=0;if(C){G=B;H=0;I=z;break}else F=0}w=a[o>>0]|0;D=(w&1)==0?(w&255)>>>1:c[x>>2]|0;if((c[p>>2]|0)==(z+D|0)){mh(o,D<<1,0);if(!(a[o>>0]&1))K=10;else K=(c[o>>2]&-2)+-1|0;mh(o,K,0);w=(a[o>>0]&1)==0?f:c[v>>2]|0;c[p>>2]=w+D;L=w}else L=z;w=B+12|0;D=c[w>>2]|0;M=B+16|0;if((D|0)==(c[M>>2]|0))N=Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0;else N=c[D>>2]|0;if(Cd(N,t,u,L,p,y,l,n,q,r,s,k)|0){G=B;H=F;I=L;break}D=c[w>>2]|0;if((D|0)==(c[M>>2]|0)){Wb[c[(c[B>>2]|0)+40>>2]&63](B)|0;m=B;z=L;continue}else{c[w>>2]=D+4;m=B;z=L;continue}}L=a[n>>0]|0;z=c[r>>2]|0;if(!((a[t>>0]|0)==0?1:(((L&1)==0?(L&255)>>>1:c[n+4>>2]|0)|0)==0)?(z-q|0)<160:0){L=c[s>>2]|0;s=z+4|0;c[r>>2]=s;c[z>>2]=L;O=s}else O=z;h[j>>3]=+dg(I,c[p>>2]|0,g);ae(n,q,O,g);if(G){O=c[G+12>>2]|0;if((O|0)==(c[G+16>>2]|0))P=Wb[c[(c[G>>2]|0)+36>>2]&63](G)|0;else P=c[O>>2]|0;if((P|0)==-1){c[d>>2]=0;Q=1}else Q=0}else Q=1;do if(H){P=c[H+12>>2]|0;if((P|0)==(c[H+16>>2]|0))R=Wb[c[(c[H>>2]|0)+36>>2]&63](H)|0;else R=c[P>>2]|0;if((R|0)!=-1)if(Q)break;else{J=46;break}else{c[e>>2]=0;J=44;break}}else J=44;while(0);if((J|0)==44?Q:0)J=46;if((J|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(o);ul(n);i=b;return g|0}function Ec(b,d,e,f,h,j){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;b=i;i=i+352|0;k=b+208|0;l=b+40|0;m=b+36|0;n=b+24|0;o=b+12|0;p=b+8|0;q=b+48|0;r=b+4|0;s=b;t=b+337|0;u=b+336|0;Ef(n,f,k,l,m);c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;if(!(a[o>>0]&1))v=10;else v=(c[o>>2]&-2)+-1|0;mh(o,v,0);v=o+8|0;f=o+1|0;w=(a[o>>0]&1)==0?f:c[v>>2]|0;c[p>>2]=w;c[r>>2]=q;c[s>>2]=0;a[t>>0]=1;a[u>>0]=69;x=o+4|0;y=c[l>>2]|0;l=c[m>>2]|0;m=c[d>>2]|0;z=w;a:while(1){if(m){w=c[m+12>>2]|0;if((w|0)==(c[m+16>>2]|0))A=Wb[c[(c[m>>2]|0)+36>>2]&63](m)|0;else A=c[w>>2]|0;if((A|0)==-1){c[d>>2]=0;B=0;C=1}else{B=m;C=0}}else{B=0;C=1}w=c[e>>2]|0;do if(w){D=c[w+12>>2]|0;if((D|0)==(c[w+16>>2]|0))E=Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0;else E=c[D>>2]|0;if((E|0)!=-1)if(C){F=w;break}else{G=B;H=w;I=z;break a}else{c[e>>2]=0;J=16;break}}else J=16;while(0);if((J|0)==16){J=0;if(C){G=B;H=0;I=z;break}else F=0}w=a[o>>0]|0;D=(w&1)==0?(w&255)>>>1:c[x>>2]|0;if((c[p>>2]|0)==(z+D|0)){mh(o,D<<1,0);if(!(a[o>>0]&1))K=10;else K=(c[o>>2]&-2)+-1|0;mh(o,K,0);w=(a[o>>0]&1)==0?f:c[v>>2]|0;c[p>>2]=w+D;L=w}else L=z;w=B+12|0;D=c[w>>2]|0;M=B+16|0;if((D|0)==(c[M>>2]|0))N=Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0;else N=c[D>>2]|0;if(Cd(N,t,u,L,p,y,l,n,q,r,s,k)|0){G=B;H=F;I=L;break}D=c[w>>2]|0;if((D|0)==(c[M>>2]|0)){Wb[c[(c[B>>2]|0)+40>>2]&63](B)|0;m=B;z=L;continue}else{c[w>>2]=D+4;m=B;z=L;continue}}L=a[n>>0]|0;z=c[r>>2]|0;if(!((a[t>>0]|0)==0?1:(((L&1)==0?(L&255)>>>1:c[n+4>>2]|0)|0)==0)?(z-q|0)<160:0){L=c[s>>2]|0;s=z+4|0;c[r>>2]=s;c[z>>2]=L;O=s}else O=z;g[j>>2]=+ng(I,c[p>>2]|0,h);ae(n,q,O,h);if(G){O=c[G+12>>2]|0;if((O|0)==(c[G+16>>2]|0))P=Wb[c[(c[G>>2]|0)+36>>2]&63](G)|0;else P=c[O>>2]|0;if((P|0)==-1){c[d>>2]=0;Q=1}else Q=0}else Q=1;do if(H){P=c[H+12>>2]|0;if((P|0)==(c[H+16>>2]|0))R=Wb[c[(c[H>>2]|0)+36>>2]&63](H)|0;else R=c[P>>2]|0;if((R|0)!=-1)if(Q)break;else{J=46;break}else{c[e>>2]=0;J=44;break}}else J=44;while(0);if((J|0)==44?Q:0)J=46;if((J|0)==46)c[h>>2]=c[h>>2]|2;h=c[d>>2]|0;ul(o);ul(n);i=b;return h|0}function gd(e,f,g,h,i,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;c[g>>2]=e;c[j>>2]=h;if(l&4){l=c[g>>2]|0;e=f;if((((e-l|0)>2?(a[l>>0]|0)==-17:0)?(a[l+1>>0]|0)==-69:0)?(a[l+2>>0]|0)==-65:0){c[g>>2]=l+3;m=c[j>>2]|0;n=e}else{m=h;n=e}}else{m=h;n=f}h=i;e=c[g>>2]|0;l=e>>>0<f>>>0;a:do if(l&m>>>0<i>>>0){o=e;p=m;while(1){q=a[o>>0]|0;r=q&255;if(r>>>0>k>>>0){s=2;break a}do if(q<<24>>24>-1){b[p>>1]=q&255;c[g>>2]=o+1}else{if((q&255)<194){s=2;break a}if((q&255)<224){if((n-o|0)<2){s=1;break a}t=d[o+1>>0]|0;if((t&192|0)!=128){s=2;break a}u=t&63|r<<6&1984;if(u>>>0>k>>>0){s=2;break a}b[p>>1]=u;c[g>>2]=o+2;break}if((q&255)<240){if((n-o|0)<3){s=1;break a}u=a[o+1>>0]|0;t=a[o+2>>0]|0;switch(r|0){case 224:{if((u&-32)<<24>>24!=-96){s=2;break a}break}case 237:{if((u&-32)<<24>>24!=-128){s=2;break a}break}default:if((u&-64)<<24>>24!=-128){s=2;break a}}v=t&255;if((v&192|0)!=128){s=2;break a}t=(u&255)<<6&4032|r<<12|v&63;if((t&65535)>>>0>k>>>0){s=2;break a}b[p>>1]=t;c[g>>2]=o+3;break}if((q&255)>=245){s=2;break a}if((n-o|0)<4){s=1;break a}t=a[o+1>>0]|0;v=a[o+2>>0]|0;u=a[o+3>>0]|0;switch(r|0){case 240:{if((t+112&255)>=48){s=2;break a}break}case 244:{if((t&-16)<<24>>24!=-128){s=2;break a}break}default:if((t&-64)<<24>>24!=-128){s=2;break a}}w=v&255;if((w&192|0)!=128){s=2;break a}v=u&255;if((v&192|0)!=128){s=2;break a}if((h-p|0)<4){s=1;break a}u=r&7;x=t&255;t=w<<6;y=v&63;if((x<<12&258048|u<<18|t&4032|y)>>>0>k>>>0){s=2;break a}b[p>>1]=x<<2&60|w>>>4&3|((x>>>4&3|u<<2)<<6)+16320|55296;u=p+2|0;c[j>>2]=u;b[u>>1]=y|t&960|56320;c[g>>2]=(c[g>>2]|0)+4}while(0);p=(c[j>>2]|0)+2|0;c[j>>2]=p;o=c[g>>2]|0;r=o>>>0<f>>>0;if(!(r&p>>>0<i>>>0)){z=r;A=39;break}}}else{z=l;A=39}while(0);if((A|0)==39)s=z&1;return s|0}function Jc(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;b=i;i=i+320|0;j=b+208|0;k=b+200|0;l=b+24|0;m=b+12|0;n=b+8|0;o=b+40|0;p=b+4|0;q=b;r=jj(f)|0;jg(l,f,j,k);c[m>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;if(!(a[m>>0]&1))s=10;else s=(c[m>>2]&-2)+-1|0;mh(m,s,0);s=m+8|0;f=m+1|0;t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t;c[p>>2]=o;c[q>>2]=0;u=m+4|0;v=c[k>>2]|0;k=c[d>>2]|0;w=t;a:while(1){if(k){t=c[k+12>>2]|0;if((t|0)==(c[k+16>>2]|0))x=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else x=c[t>>2]|0;if((x|0)==-1){c[d>>2]=0;y=0;z=1}else{y=k;z=0}}else{y=0;z=1}t=c[e>>2]|0;do if(t){A=c[t+12>>2]|0;if((A|0)==(c[t+16>>2]|0))B=Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0;else B=c[A>>2]|0;if((B|0)!=-1)if(z){C=t;break}else{D=y;E=t;F=w;break a}else{c[e>>2]=0;H=16;break}}else H=16;while(0);if((H|0)==16){H=0;if(z){D=y;E=0;F=w;break}else C=0}t=a[m>>0]|0;A=(t&1)==0?(t&255)>>>1:c[u>>2]|0;if((c[n>>2]|0)==(w+A|0)){mh(m,A<<1,0);if(!(a[m>>0]&1))I=10;else I=(c[m>>2]&-2)+-1|0;mh(m,I,0);t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t+A;J=t}else J=w;t=y+12|0;A=c[t>>2]|0;K=y+16|0;if((A|0)==(c[K>>2]|0))L=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else L=c[A>>2]|0;if(Vd(L,r,J,n,q,v,l,o,p,j)|0){D=y;E=C;F=J;break}A=c[t>>2]|0;if((A|0)==(c[K>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;k=y;w=J;continue}else{c[t>>2]=A+4;k=y;w=J;continue}}J=a[l>>0]|0;w=c[p>>2]|0;if((((J&1)==0?(J&255)>>>1:c[l+4>>2]|0)|0)!=0?(w-o|0)<160:0){J=c[q>>2]|0;q=w+4|0;c[p>>2]=q;c[w>>2]=J;M=q}else M=w;w=ff(F,c[n>>2]|0,g,r)|0;r=h;c[r>>2]=w;c[r+4>>2]=G;ae(l,o,M,g);if(D){M=c[D+12>>2]|0;if((M|0)==(c[D+16>>2]|0))N=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else N=c[M>>2]|0;if((N|0)==-1){c[d>>2]=0;O=1}else O=0}else O=1;do if(E){N=c[E+12>>2]|0;if((N|0)==(c[E+16>>2]|0))P=Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0;else P=c[N>>2]|0;if((P|0)!=-1)if(O)break;else{H=46;break}else{c[e>>2]=0;H=44;break}}else H=44;while(0);if((H|0)==44?O:0)H=46;if((H|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(m);ul(l);i=b;return g|0}function Ic(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;b=i;i=i+320|0;j=b+208|0;k=b+200|0;l=b+24|0;m=b+12|0;n=b+8|0;o=b+40|0;p=b+4|0;q=b;r=jj(f)|0;jg(l,f,j,k);c[m>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;if(!(a[m>>0]&1))s=10;else s=(c[m>>2]&-2)+-1|0;mh(m,s,0);s=m+8|0;f=m+1|0;t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t;c[p>>2]=o;c[q>>2]=0;u=m+4|0;v=c[k>>2]|0;k=c[d>>2]|0;w=t;a:while(1){if(k){t=c[k+12>>2]|0;if((t|0)==(c[k+16>>2]|0))x=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else x=c[t>>2]|0;if((x|0)==-1){c[d>>2]=0;y=0;z=1}else{y=k;z=0}}else{y=0;z=1}t=c[e>>2]|0;do if(t){A=c[t+12>>2]|0;if((A|0)==(c[t+16>>2]|0))B=Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0;else B=c[A>>2]|0;if((B|0)!=-1)if(z){C=t;break}else{D=y;E=t;F=w;break a}else{c[e>>2]=0;H=16;break}}else H=16;while(0);if((H|0)==16){H=0;if(z){D=y;E=0;F=w;break}else C=0}t=a[m>>0]|0;A=(t&1)==0?(t&255)>>>1:c[u>>2]|0;if((c[n>>2]|0)==(w+A|0)){mh(m,A<<1,0);if(!(a[m>>0]&1))I=10;else I=(c[m>>2]&-2)+-1|0;mh(m,I,0);t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t+A;J=t}else J=w;t=y+12|0;A=c[t>>2]|0;K=y+16|0;if((A|0)==(c[K>>2]|0))L=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else L=c[A>>2]|0;if(Vd(L,r,J,n,q,v,l,o,p,j)|0){D=y;E=C;F=J;break}A=c[t>>2]|0;if((A|0)==(c[K>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;k=y;w=J;continue}else{c[t>>2]=A+4;k=y;w=J;continue}}J=a[l>>0]|0;w=c[p>>2]|0;if((((J&1)==0?(J&255)>>>1:c[l+4>>2]|0)|0)!=0?(w-o|0)<160:0){J=c[q>>2]|0;q=w+4|0;c[p>>2]=q;c[w>>2]=J;M=q}else M=w;w=qf(F,c[n>>2]|0,g,r)|0;r=h;c[r>>2]=w;c[r+4>>2]=G;ae(l,o,M,g);if(D){M=c[D+12>>2]|0;if((M|0)==(c[D+16>>2]|0))N=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else N=c[M>>2]|0;if((N|0)==-1){c[d>>2]=0;O=1}else O=0}else O=1;do if(E){N=c[E+12>>2]|0;if((N|0)==(c[E+16>>2]|0))P=Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0;else P=c[N>>2]|0;if((P|0)!=-1)if(O)break;else{H=46;break}else{c[e>>2]=0;H=44;break}}else H=44;while(0);if((H|0)==44?O:0)H=46;if((H|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(m);ul(l);i=b;return g|0}function Pc(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;b=i;i=i+320|0;j=b;k=b+208|0;l=b+192|0;m=b+28|0;n=b+16|0;o=b+12|0;p=b+32|0;q=b+8|0;r=b+4|0;c[l>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;s=fk(f)|0;c[m>>2]=s;f=bk(m,5920)|0;$b[c[(c[f>>2]|0)+48>>2]&7](f,12194,12220,k)|0;_i(s)|0;c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;s=n+1|0;f=(a[n>>0]&1)==0?s:c[t>>2]|0;c[o>>2]=f;c[q>>2]=p;c[r>>2]=0;m=n+4|0;u=c[d>>2]|0;v=f;a:while(1){if(u){f=c[u+12>>2]|0;if((f|0)==(c[u+16>>2]|0))w=Wb[c[(c[u>>2]|0)+36>>2]&63](u)|0;else w=c[f>>2]|0;if((w|0)==-1){c[d>>2]=0;x=0;y=1}else{x=u;y=0}}else{x=0;y=1}f=c[e>>2]|0;do if(f){z=c[f+12>>2]|0;if((z|0)==(c[f+16>>2]|0))A=Wb[c[(c[f>>2]|0)+36>>2]&63](f)|0;else A=c[z>>2]|0;if((A|0)!=-1)if(y){B=f;break}else{C=x;D=f;E=v;break a}else{c[e>>2]=0;F=16;break}}else F=16;while(0);if((F|0)==16){F=0;if(y){C=x;D=0;E=v;break}else B=0}f=a[n>>0]|0;z=(f&1)==0?(f&255)>>>1:c[m>>2]|0;if((c[o>>2]|0)==(v+z|0)){mh(n,z<<1,0);if(!(a[n>>0]&1))G=10;else G=(c[n>>2]&-2)+-1|0;mh(n,G,0);f=(a[n>>0]&1)==0?s:c[t>>2]|0;c[o>>2]=f+z;H=f}else H=v;f=x+12|0;z=c[f>>2]|0;I=x+16|0;if((z|0)==(c[I>>2]|0))J=Wb[c[(c[x>>2]|0)+36>>2]&63](x)|0;else J=c[z>>2]|0;if(Vd(J,16,H,o,r,0,l,p,q,k)|0){C=x;D=B;E=H;break}z=c[f>>2]|0;if((z|0)==(c[I>>2]|0)){Wb[c[(c[x>>2]|0)+40>>2]&63](x)|0;u=x;v=H;continue}else{c[f>>2]=z+4;u=x;v=H;continue}}mh(n,(c[o>>2]|0)-E|0,0);E=(a[n>>0]&1)==0?s:c[t>>2]|0;t=jk()|0;c[j>>2]=h;if((zi(E,t,13578,j)|0)!=1)c[g>>2]=4;if(C){j=c[C+12>>2]|0;if((j|0)==(c[C+16>>2]|0))K=Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0;else K=c[j>>2]|0;if((K|0)==-1){c[d>>2]=0;L=1}else L=0}else L=1;do if(D){K=c[D+12>>2]|0;if((K|0)==(c[D+16>>2]|0))M=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else M=c[K>>2]|0;if((M|0)!=-1)if(L)break;else{F=45;break}else{c[e>>2]=0;F=43;break}}else F=43;while(0);if((F|0)==43?L:0)F=45;if((F|0)==45)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(n);ul(l);i=b;return g|0}function Oc(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;b=i;i=i+320|0;j=b+208|0;k=b+200|0;l=b+24|0;m=b+12|0;n=b+8|0;o=b+40|0;p=b+4|0;q=b;r=jj(f)|0;jg(l,f,j,k);c[m>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;if(!(a[m>>0]&1))s=10;else s=(c[m>>2]&-2)+-1|0;mh(m,s,0);s=m+8|0;f=m+1|0;t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t;c[p>>2]=o;c[q>>2]=0;u=m+4|0;v=c[k>>2]|0;k=c[d>>2]|0;w=t;a:while(1){if(k){t=c[k+12>>2]|0;if((t|0)==(c[k+16>>2]|0))x=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else x=c[t>>2]|0;if((x|0)==-1){c[d>>2]=0;y=0;z=1}else{y=k;z=0}}else{y=0;z=1}t=c[e>>2]|0;do if(t){A=c[t+12>>2]|0;if((A|0)==(c[t+16>>2]|0))B=Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0;else B=c[A>>2]|0;if((B|0)!=-1)if(z){C=t;break}else{D=y;E=t;F=w;break a}else{c[e>>2]=0;G=16;break}}else G=16;while(0);if((G|0)==16){G=0;if(z){D=y;E=0;F=w;break}else C=0}t=a[m>>0]|0;A=(t&1)==0?(t&255)>>>1:c[u>>2]|0;if((c[n>>2]|0)==(w+A|0)){mh(m,A<<1,0);if(!(a[m>>0]&1))H=10;else H=(c[m>>2]&-2)+-1|0;mh(m,H,0);t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t+A;I=t}else I=w;t=y+12|0;A=c[t>>2]|0;J=y+16|0;if((A|0)==(c[J>>2]|0))K=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else K=c[A>>2]|0;if(Vd(K,r,I,n,q,v,l,o,p,j)|0){D=y;E=C;F=I;break}A=c[t>>2]|0;if((A|0)==(c[J>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;k=y;w=I;continue}else{c[t>>2]=A+4;k=y;w=I;continue}}I=a[l>>0]|0;w=c[p>>2]|0;if((((I&1)==0?(I&255)>>>1:c[l+4>>2]|0)|0)!=0?(w-o|0)<160:0){I=c[q>>2]|0;q=w+4|0;c[p>>2]=q;c[w>>2]=I;L=q}else L=w;c[h>>2]=We(F,c[n>>2]|0,g,r)|0;ae(l,o,L,g);if(D){L=c[D+12>>2]|0;if((L|0)==(c[D+16>>2]|0))M=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else M=c[L>>2]|0;if((M|0)==-1){c[d>>2]=0;N=1}else N=0}else N=1;do if(E){M=c[E+12>>2]|0;if((M|0)==(c[E+16>>2]|0))O=Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0;else O=c[M>>2]|0;if((O|0)!=-1)if(N)break;else{G=46;break}else{c[e>>2]=0;G=44;break}}else G=44;while(0);if((G|0)==44?N:0)G=46;if((G|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(m);ul(l);i=b;return g|0}function Mc(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;b=i;i=i+320|0;j=b+208|0;k=b+200|0;l=b+24|0;m=b+12|0;n=b+8|0;o=b+40|0;p=b+4|0;q=b;r=jj(f)|0;jg(l,f,j,k);c[m>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;if(!(a[m>>0]&1))s=10;else s=(c[m>>2]&-2)+-1|0;mh(m,s,0);s=m+8|0;f=m+1|0;t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t;c[p>>2]=o;c[q>>2]=0;u=m+4|0;v=c[k>>2]|0;k=c[d>>2]|0;w=t;a:while(1){if(k){t=c[k+12>>2]|0;if((t|0)==(c[k+16>>2]|0))x=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else x=c[t>>2]|0;if((x|0)==-1){c[d>>2]=0;y=0;z=1}else{y=k;z=0}}else{y=0;z=1}t=c[e>>2]|0;do if(t){A=c[t+12>>2]|0;if((A|0)==(c[t+16>>2]|0))B=Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0;else B=c[A>>2]|0;if((B|0)!=-1)if(z){C=t;break}else{D=y;E=t;F=w;break a}else{c[e>>2]=0;G=16;break}}else G=16;while(0);if((G|0)==16){G=0;if(z){D=y;E=0;F=w;break}else C=0}t=a[m>>0]|0;A=(t&1)==0?(t&255)>>>1:c[u>>2]|0;if((c[n>>2]|0)==(w+A|0)){mh(m,A<<1,0);if(!(a[m>>0]&1))H=10;else H=(c[m>>2]&-2)+-1|0;mh(m,H,0);t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t+A;I=t}else I=w;t=y+12|0;A=c[t>>2]|0;J=y+16|0;if((A|0)==(c[J>>2]|0))K=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else K=c[A>>2]|0;if(Vd(K,r,I,n,q,v,l,o,p,j)|0){D=y;E=C;F=I;break}A=c[t>>2]|0;if((A|0)==(c[J>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;k=y;w=I;continue}else{c[t>>2]=A+4;k=y;w=I;continue}}I=a[l>>0]|0;w=c[p>>2]|0;if((((I&1)==0?(I&255)>>>1:c[l+4>>2]|0)|0)!=0?(w-o|0)<160:0){I=c[q>>2]|0;q=w+4|0;c[p>>2]=q;c[w>>2]=I;L=q}else L=w;c[h>>2]=nf(F,c[n>>2]|0,g,r)|0;ae(l,o,L,g);if(D){L=c[D+12>>2]|0;if((L|0)==(c[D+16>>2]|0))M=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else M=c[L>>2]|0;if((M|0)==-1){c[d>>2]=0;N=1}else N=0}else N=1;do if(E){M=c[E+12>>2]|0;if((M|0)==(c[E+16>>2]|0))O=Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0;else O=c[M>>2]|0;if((O|0)!=-1)if(N)break;else{G=46;break}else{c[e>>2]=0;G=44;break}}else G=44;while(0);if((G|0)==44?N:0)G=46;if((G|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(m);ul(l);i=b;return g|0}function Lc(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;b=i;i=i+320|0;j=b+208|0;k=b+200|0;l=b+24|0;m=b+12|0;n=b+8|0;o=b+40|0;p=b+4|0;q=b;r=jj(f)|0;jg(l,f,j,k);c[m>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;if(!(a[m>>0]&1))s=10;else s=(c[m>>2]&-2)+-1|0;mh(m,s,0);s=m+8|0;f=m+1|0;t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t;c[p>>2]=o;c[q>>2]=0;u=m+4|0;v=c[k>>2]|0;k=c[d>>2]|0;w=t;a:while(1){if(k){t=c[k+12>>2]|0;if((t|0)==(c[k+16>>2]|0))x=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else x=c[t>>2]|0;if((x|0)==-1){c[d>>2]=0;y=0;z=1}else{y=k;z=0}}else{y=0;z=1}t=c[e>>2]|0;do if(t){A=c[t+12>>2]|0;if((A|0)==(c[t+16>>2]|0))B=Wb[c[(c[t>>2]|0)+36>>2]&63](t)|0;else B=c[A>>2]|0;if((B|0)!=-1)if(z){C=t;break}else{D=y;E=t;F=w;break a}else{c[e>>2]=0;G=16;break}}else G=16;while(0);if((G|0)==16){G=0;if(z){D=y;E=0;F=w;break}else C=0}t=a[m>>0]|0;A=(t&1)==0?(t&255)>>>1:c[u>>2]|0;if((c[n>>2]|0)==(w+A|0)){mh(m,A<<1,0);if(!(a[m>>0]&1))H=10;else H=(c[m>>2]&-2)+-1|0;mh(m,H,0);t=(a[m>>0]&1)==0?f:c[s>>2]|0;c[n>>2]=t+A;I=t}else I=w;t=y+12|0;A=c[t>>2]|0;J=y+16|0;if((A|0)==(c[J>>2]|0))K=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else K=c[A>>2]|0;if(Vd(K,r,I,n,q,v,l,o,p,j)|0){D=y;E=C;F=I;break}A=c[t>>2]|0;if((A|0)==(c[J>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;k=y;w=I;continue}else{c[t>>2]=A+4;k=y;w=I;continue}}I=a[l>>0]|0;w=c[p>>2]|0;if((((I&1)==0?(I&255)>>>1:c[l+4>>2]|0)|0)!=0?(w-o|0)<160:0){I=c[q>>2]|0;q=w+4|0;c[p>>2]=q;c[w>>2]=I;L=q}else L=w;c[h>>2]=mf(F,c[n>>2]|0,g,r)|0;ae(l,o,L,g);if(D){L=c[D+12>>2]|0;if((L|0)==(c[D+16>>2]|0))M=Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0;else M=c[L>>2]|0;if((M|0)==-1){c[d>>2]=0;N=1}else N=0}else N=1;do if(E){M=c[E+12>>2]|0;if((M|0)==(c[E+16>>2]|0))O=Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0;else O=c[M>>2]|0;if((O|0)!=-1)if(N)break;else{G=46;break}else{c[e>>2]=0;G=44;break}}else G=44;while(0);if((G|0)==44?N:0)G=46;if((G|0)==46)c[g>>2]=c[g>>2]|2;g=c[d>>2]|0;ul(m);ul(l);i=b;return g|0}function Kc(d,e,f,g,h,j){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;d=i;i=i+320|0;k=d+208|0;l=d+200|0;m=d+24|0;n=d+12|0;o=d+8|0;p=d+40|0;q=d+4|0;r=d;s=jj(g)|0;jg(m,g,k,l);c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;g=n+1|0;u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u;c[q>>2]=p;c[r>>2]=0;v=n+4|0;w=c[l>>2]|0;l=c[e>>2]|0;x=u;a:while(1){if(l){u=c[l+12>>2]|0;if((u|0)==(c[l+16>>2]|0))y=Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0;else y=c[u>>2]|0;if((y|0)==-1){c[e>>2]=0;z=0;A=1}else{z=l;A=0}}else{z=0;A=1}u=c[f>>2]|0;do if(u){B=c[u+12>>2]|0;if((B|0)==(c[u+16>>2]|0))C=Wb[c[(c[u>>2]|0)+36>>2]&63](u)|0;else C=c[B>>2]|0;if((C|0)!=-1)if(A){D=u;break}else{E=z;F=u;G=x;break a}else{c[f>>2]=0;H=16;break}}else H=16;while(0);if((H|0)==16){H=0;if(A){E=z;F=0;G=x;break}else D=0}u=a[n>>0]|0;B=(u&1)==0?(u&255)>>>1:c[v>>2]|0;if((c[o>>2]|0)==(x+B|0)){mh(n,B<<1,0);if(!(a[n>>0]&1))I=10;else I=(c[n>>2]&-2)+-1|0;mh(n,I,0);u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u+B;J=u}else J=x;u=z+12|0;B=c[u>>2]|0;K=z+16|0;if((B|0)==(c[K>>2]|0))L=Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0;else L=c[B>>2]|0;if(Vd(L,s,J,o,r,w,m,p,q,k)|0){E=z;F=D;G=J;break}B=c[u>>2]|0;if((B|0)==(c[K>>2]|0)){Wb[c[(c[z>>2]|0)+40>>2]&63](z)|0;l=z;x=J;continue}else{c[u>>2]=B+4;l=z;x=J;continue}}J=a[m>>0]|0;x=c[q>>2]|0;if((((J&1)==0?(J&255)>>>1:c[m+4>>2]|0)|0)!=0?(x-p|0)<160:0){J=c[r>>2]|0;r=x+4|0;c[q>>2]=r;c[x>>2]=J;M=r}else M=x;b[j>>1]=lf(G,c[o>>2]|0,h,s)|0;ae(m,p,M,h);if(E){M=c[E+12>>2]|0;if((M|0)==(c[E+16>>2]|0))N=Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0;else N=c[M>>2]|0;if((N|0)==-1){c[e>>2]=0;O=1}else O=0}else O=1;do if(F){N=c[F+12>>2]|0;if((N|0)==(c[F+16>>2]|0))P=Wb[c[(c[F>>2]|0)+36>>2]&63](F)|0;else P=c[N>>2]|0;if((P|0)!=-1)if(O)break;else{H=46;break}else{c[f>>2]=0;H=44;break}}else H=44;while(0);if((H|0)==44?O:0)H=46;if((H|0)==46)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(n);ul(m);i=d;return h|0}function Tc(b,e,f,g,j,k){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;b=i;i=i+240|0;l=b+208|0;m=b+203|0;n=b+202|0;o=b+24|0;p=b+12|0;q=b+8|0;r=b+40|0;s=b+4|0;t=b;u=b+201|0;v=b+200|0;If(o,g,l,m,n);c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;if(!(a[p>>0]&1))w=10;else w=(c[p>>2]&-2)+-1|0;mh(p,w,0);w=p+8|0;g=p+1|0;x=(a[p>>0]&1)==0?g:c[w>>2]|0;c[q>>2]=x;c[s>>2]=r;c[t>>2]=0;a[u>>0]=1;a[v>>0]=69;y=p+4|0;z=a[m>>0]|0;m=a[n>>0]|0;n=c[e>>2]|0;A=x;a:while(1){if(n)if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(Wb[c[(c[n>>2]|0)+36>>2]&63](n)|0)==-1:0){c[e>>2]=0;B=0}else B=n;else B=0;x=(B|0)==0;C=c[f>>2]|0;do if(C){if((c[C+12>>2]|0)!=(c[C+16>>2]|0))if(x){D=C;break}else{E=B;F=C;G=A;break a}if((Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)!=-1)if(x){D=C;break}else{E=B;F=C;G=A;break a}else{c[f>>2]=0;H=13;break}}else H=13;while(0);if((H|0)==13){H=0;if(x){E=B;F=0;G=A;break}else D=0}C=a[p>>0]|0;I=(C&1)==0?(C&255)>>>1:c[y>>2]|0;if((c[q>>2]|0)==(A+I|0)){mh(p,I<<1,0);if(!(a[p>>0]&1))J=10;else J=(c[p>>2]&-2)+-1|0;mh(p,J,0);C=(a[p>>0]&1)==0?g:c[w>>2]|0;c[q>>2]=C+I;K=C}else K=A;C=B+12|0;I=c[C>>2]|0;L=B+16|0;if((I|0)==(c[L>>2]|0))M=Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0;else M=d[I>>0]|0;if(xd(M&255,u,v,K,q,z,m,o,r,s,t,l)|0){E=B;F=D;G=K;break}I=c[C>>2]|0;if((I|0)==(c[L>>2]|0)){Wb[c[(c[B>>2]|0)+40>>2]&63](B)|0;n=B;A=K;continue}else{c[C>>2]=I+1;n=B;A=K;continue}}K=a[o>>0]|0;A=c[s>>2]|0;if(!((a[u>>0]|0)==0?1:(((K&1)==0?(K&255)>>>1:c[o+4>>2]|0)|0)==0)?(A-r|0)<160:0){K=c[t>>2]|0;t=A+4|0;c[s>>2]=t;c[A>>2]=K;N=t}else N=A;h[k>>3]=+eg(G,c[q>>2]|0,j);ae(o,r,N,j);if(E)if((c[E+12>>2]|0)==(c[E+16>>2]|0)?(Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0)==-1:0){c[e>>2]=0;O=0}else O=E;else O=0;E=(O|0)==0;do if(F){if((c[F+12>>2]|0)==(c[F+16>>2]|0)?(Wb[c[(c[F>>2]|0)+36>>2]&63](F)|0)==-1:0){c[f>>2]=0;H=38;break}if(!E)H=39}else H=38;while(0);if((H|0)==38?E:0)H=39;if((H|0)==39)c[j>>2]=c[j>>2]|2;j=c[e>>2]|0;ul(p);ul(o);i=b;return j|0}function Sc(b,e,f,g,j,k){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;b=i;i=i+240|0;l=b+208|0;m=b+203|0;n=b+202|0;o=b+24|0;p=b+12|0;q=b+8|0;r=b+40|0;s=b+4|0;t=b;u=b+201|0;v=b+200|0;If(o,g,l,m,n);c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;if(!(a[p>>0]&1))w=10;else w=(c[p>>2]&-2)+-1|0;mh(p,w,0);w=p+8|0;g=p+1|0;x=(a[p>>0]&1)==0?g:c[w>>2]|0;c[q>>2]=x;c[s>>2]=r;c[t>>2]=0;a[u>>0]=1;a[v>>0]=69;y=p+4|0;z=a[m>>0]|0;m=a[n>>0]|0;n=c[e>>2]|0;A=x;a:while(1){if(n)if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(Wb[c[(c[n>>2]|0)+36>>2]&63](n)|0)==-1:0){c[e>>2]=0;B=0}else B=n;else B=0;x=(B|0)==0;C=c[f>>2]|0;do if(C){if((c[C+12>>2]|0)!=(c[C+16>>2]|0))if(x){D=C;break}else{E=B;F=C;G=A;break a}if((Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)!=-1)if(x){D=C;break}else{E=B;F=C;G=A;break a}else{c[f>>2]=0;H=13;break}}else H=13;while(0);if((H|0)==13){H=0;if(x){E=B;F=0;G=A;break}else D=0}C=a[p>>0]|0;I=(C&1)==0?(C&255)>>>1:c[y>>2]|0;if((c[q>>2]|0)==(A+I|0)){mh(p,I<<1,0);if(!(a[p>>0]&1))J=10;else J=(c[p>>2]&-2)+-1|0;mh(p,J,0);C=(a[p>>0]&1)==0?g:c[w>>2]|0;c[q>>2]=C+I;K=C}else K=A;C=B+12|0;I=c[C>>2]|0;L=B+16|0;if((I|0)==(c[L>>2]|0))M=Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0;else M=d[I>>0]|0;if(xd(M&255,u,v,K,q,z,m,o,r,s,t,l)|0){E=B;F=D;G=K;break}I=c[C>>2]|0;if((I|0)==(c[L>>2]|0)){Wb[c[(c[B>>2]|0)+40>>2]&63](B)|0;n=B;A=K;continue}else{c[C>>2]=I+1;n=B;A=K;continue}}K=a[o>>0]|0;A=c[s>>2]|0;if(!((a[u>>0]|0)==0?1:(((K&1)==0?(K&255)>>>1:c[o+4>>2]|0)|0)==0)?(A-r|0)<160:0){K=c[t>>2]|0;t=A+4|0;c[s>>2]=t;c[A>>2]=K;N=t}else N=A;h[k>>3]=+dg(G,c[q>>2]|0,j);ae(o,r,N,j);if(E)if((c[E+12>>2]|0)==(c[E+16>>2]|0)?(Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0)==-1:0){c[e>>2]=0;O=0}else O=E;else O=0;E=(O|0)==0;do if(F){if((c[F+12>>2]|0)==(c[F+16>>2]|0)?(Wb[c[(c[F>>2]|0)+36>>2]&63](F)|0)==-1:0){c[f>>2]=0;H=38;break}if(!E)H=39}else H=38;while(0);if((H|0)==38?E:0)H=39;if((H|0)==39)c[j>>2]=c[j>>2]|2;j=c[e>>2]|0;ul(p);ul(o);i=b;return j|0}function Rc(b,e,f,h,j,k){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;b=i;i=i+240|0;l=b+208|0;m=b+203|0;n=b+202|0;o=b+24|0;p=b+12|0;q=b+8|0;r=b+40|0;s=b+4|0;t=b;u=b+201|0;v=b+200|0;If(o,h,l,m,n);c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;if(!(a[p>>0]&1))w=10;else w=(c[p>>2]&-2)+-1|0;mh(p,w,0);w=p+8|0;h=p+1|0;x=(a[p>>0]&1)==0?h:c[w>>2]|0;c[q>>2]=x;c[s>>2]=r;c[t>>2]=0;a[u>>0]=1;a[v>>0]=69;y=p+4|0;z=a[m>>0]|0;m=a[n>>0]|0;n=c[e>>2]|0;A=x;a:while(1){if(n)if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(Wb[c[(c[n>>2]|0)+36>>2]&63](n)|0)==-1:0){c[e>>2]=0;B=0}else B=n;else B=0;x=(B|0)==0;C=c[f>>2]|0;do if(C){if((c[C+12>>2]|0)!=(c[C+16>>2]|0))if(x){D=C;break}else{E=B;F=C;G=A;break a}if((Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)!=-1)if(x){D=C;break}else{E=B;F=C;G=A;break a}else{c[f>>2]=0;H=13;break}}else H=13;while(0);if((H|0)==13){H=0;if(x){E=B;F=0;G=A;break}else D=0}C=a[p>>0]|0;I=(C&1)==0?(C&255)>>>1:c[y>>2]|0;if((c[q>>2]|0)==(A+I|0)){mh(p,I<<1,0);if(!(a[p>>0]&1))J=10;else J=(c[p>>2]&-2)+-1|0;mh(p,J,0);C=(a[p>>0]&1)==0?h:c[w>>2]|0;c[q>>2]=C+I;K=C}else K=A;C=B+12|0;I=c[C>>2]|0;L=B+16|0;if((I|0)==(c[L>>2]|0))M=Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0;else M=d[I>>0]|0;if(xd(M&255,u,v,K,q,z,m,o,r,s,t,l)|0){E=B;F=D;G=K;break}I=c[C>>2]|0;if((I|0)==(c[L>>2]|0)){Wb[c[(c[B>>2]|0)+40>>2]&63](B)|0;n=B;A=K;continue}else{c[C>>2]=I+1;n=B;A=K;continue}}K=a[o>>0]|0;A=c[s>>2]|0;if(!((a[u>>0]|0)==0?1:(((K&1)==0?(K&255)>>>1:c[o+4>>2]|0)|0)==0)?(A-r|0)<160:0){K=c[t>>2]|0;t=A+4|0;c[s>>2]=t;c[A>>2]=K;N=t}else N=A;g[k>>2]=+ng(G,c[q>>2]|0,j);ae(o,r,N,j);if(E)if((c[E+12>>2]|0)==(c[E+16>>2]|0)?(Wb[c[(c[E>>2]|0)+36>>2]&63](E)|0)==-1:0){c[e>>2]=0;O=0}else O=E;else O=0;E=(O|0)==0;do if(F){if((c[F+12>>2]|0)==(c[F+16>>2]|0)?(Wb[c[(c[F>>2]|0)+36>>2]&63](F)|0)==-1:0){c[f>>2]=0;H=38;break}if(!E)H=39}else H=38;while(0);if((H|0)==38?E:0)H=39;if((H|0)==39)c[j>>2]=c[j>>2]|2;j=c[e>>2]|0;ul(p);ul(o);i=b;return j|0}function Vc(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0;b=i;i=i+240|0;k=b+202|0;l=b+200|0;m=b+24|0;n=b+12|0;o=b+8|0;p=b+40|0;q=b+4|0;r=b;s=jj(g)|0;mg(m,g,k,l);c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;g=n+1|0;u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u;c[q>>2]=p;c[r>>2]=0;v=n+4|0;w=a[l>>0]|0;l=c[e>>2]|0;x=u;a:while(1){if(l)if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1:0){c[e>>2]=0;y=0}else y=l;else y=0;u=(y|0)==0;z=c[f>>2]|0;do if(z){if((c[z+12>>2]|0)!=(c[z+16>>2]|0))if(u){A=z;break}else{B=y;C=z;D=x;break a}if((Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0)!=-1)if(u){A=z;break}else{B=y;C=z;D=x;break a}else{c[f>>2]=0;E=13;break}}else E=13;while(0);if((E|0)==13){E=0;if(u){B=y;C=0;D=x;break}else A=0}z=a[n>>0]|0;F=(z&1)==0?(z&255)>>>1:c[v>>2]|0;if((c[o>>2]|0)==(x+F|0)){mh(n,F<<1,0);if(!(a[n>>0]&1))H=10;else H=(c[n>>2]&-2)+-1|0;mh(n,H,0);z=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=z+F;I=z}else I=x;z=y+12|0;F=c[z>>2]|0;J=y+16|0;if((F|0)==(c[J>>2]|0))K=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else K=d[F>>0]|0;if(Ud(K&255,s,I,o,r,w,m,p,q,k)|0){B=y;C=A;D=I;break}F=c[z>>2]|0;if((F|0)==(c[J>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;l=y;x=I;continue}else{c[z>>2]=F+1;l=y;x=I;continue}}I=a[m>>0]|0;x=c[q>>2]|0;if((((I&1)==0?(I&255)>>>1:c[m+4>>2]|0)|0)!=0?(x-p|0)<160:0){I=c[r>>2]|0;r=x+4|0;c[q>>2]=r;c[x>>2]=I;L=r}else L=x;x=ff(D,c[o>>2]|0,h,s)|0;s=j;c[s>>2]=x;c[s+4>>2]=G;ae(m,p,L,h);if(B)if((c[B+12>>2]|0)==(c[B+16>>2]|0)?(Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1:0){c[e>>2]=0;M=0}else M=B;else M=0;B=(M|0)==0;do if(C){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[f>>2]=0;E=38;break}if(!B)E=39}else E=38;while(0);if((E|0)==38?B:0)E=39;if((E|0)==39)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(n);ul(m);i=b;return h|0}function Uc(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0;b=i;i=i+240|0;k=b+202|0;l=b+200|0;m=b+24|0;n=b+12|0;o=b+8|0;p=b+40|0;q=b+4|0;r=b;s=jj(g)|0;mg(m,g,k,l);c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;g=n+1|0;u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u;c[q>>2]=p;c[r>>2]=0;v=n+4|0;w=a[l>>0]|0;l=c[e>>2]|0;x=u;a:while(1){if(l)if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1:0){c[e>>2]=0;y=0}else y=l;else y=0;u=(y|0)==0;z=c[f>>2]|0;do if(z){if((c[z+12>>2]|0)!=(c[z+16>>2]|0))if(u){A=z;break}else{B=y;C=z;D=x;break a}if((Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0)!=-1)if(u){A=z;break}else{B=y;C=z;D=x;break a}else{c[f>>2]=0;E=13;break}}else E=13;while(0);if((E|0)==13){E=0;if(u){B=y;C=0;D=x;break}else A=0}z=a[n>>0]|0;F=(z&1)==0?(z&255)>>>1:c[v>>2]|0;if((c[o>>2]|0)==(x+F|0)){mh(n,F<<1,0);if(!(a[n>>0]&1))H=10;else H=(c[n>>2]&-2)+-1|0;mh(n,H,0);z=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=z+F;I=z}else I=x;z=y+12|0;F=c[z>>2]|0;J=y+16|0;if((F|0)==(c[J>>2]|0))K=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else K=d[F>>0]|0;if(Ud(K&255,s,I,o,r,w,m,p,q,k)|0){B=y;C=A;D=I;break}F=c[z>>2]|0;if((F|0)==(c[J>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;l=y;x=I;continue}else{c[z>>2]=F+1;l=y;x=I;continue}}I=a[m>>0]|0;x=c[q>>2]|0;if((((I&1)==0?(I&255)>>>1:c[m+4>>2]|0)|0)!=0?(x-p|0)<160:0){I=c[r>>2]|0;r=x+4|0;c[q>>2]=r;c[x>>2]=I;L=r}else L=x;x=qf(D,c[o>>2]|0,h,s)|0;s=j;c[s>>2]=x;c[s+4>>2]=G;ae(m,p,L,h);if(B)if((c[B+12>>2]|0)==(c[B+16>>2]|0)?(Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1:0){c[e>>2]=0;M=0}else M=B;else M=0;B=(M|0)==0;do if(C){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[f>>2]=0;E=38;break}if(!B)E=39}else E=38;while(0);if((E|0)==38?B:0)E=39;if((E|0)==39)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(n);ul(m);i=b;return h|0}function jd(b,e,f,g,h,i,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;c[f>>2]=b;c[i>>2]=g;if(k&4){k=c[f>>2]|0;b=e;if((((b-k|0)>2?(a[k>>0]|0)==-17:0)?(a[k+1>>0]|0)==-69:0)?(a[k+2>>0]|0)==-65:0){c[f>>2]=k+3;l=c[i>>2]|0;m=b}else{l=g;m=b}}else{l=g;m=e}g=c[f>>2]|0;b=g>>>0<e>>>0;a:do if(b&l>>>0<h>>>0){k=g;n=l;while(1){o=a[k>>0]|0;p=o&255;do if(o<<24>>24>-1){if(p>>>0>j>>>0){q=2;break a}c[n>>2]=p;c[f>>2]=k+1}else{if((o&255)<194){q=2;break a}if((o&255)<224){if((m-k|0)<2){q=1;break a}r=d[k+1>>0]|0;if((r&192|0)!=128){q=2;break a}s=r&63|p<<6&1984;if(s>>>0>j>>>0){q=2;break a}c[n>>2]=s;c[f>>2]=k+2;break}if((o&255)<240){if((m-k|0)<3){q=1;break a}s=a[k+1>>0]|0;r=a[k+2>>0]|0;switch(p|0){case 224:{if((s&-32)<<24>>24!=-96){q=2;break a}break}case 237:{if((s&-32)<<24>>24!=-128){q=2;break a}break}default:if((s&-64)<<24>>24!=-128){q=2;break a}}t=r&255;if((t&192|0)!=128){q=2;break a}r=(s&255)<<6&4032|p<<12&61440|t&63;if(r>>>0>j>>>0){q=2;break a}c[n>>2]=r;c[f>>2]=k+3;break}if((o&255)>=245){q=2;break a}if((m-k|0)<4){q=1;break a}r=a[k+1>>0]|0;t=a[k+2>>0]|0;s=a[k+3>>0]|0;switch(p|0){case 240:{if((r+112&255)>=48){q=2;break a}break}case 244:{if((r&-16)<<24>>24!=-128){q=2;break a}break}default:if((r&-64)<<24>>24!=-128){q=2;break a}}u=t&255;if((u&192|0)!=128){q=2;break a}t=s&255;if((t&192|0)!=128){q=2;break a}s=(r&255)<<12&258048|p<<18&1835008|u<<6&4032|t&63;if(s>>>0>j>>>0){q=2;break a}c[n>>2]=s;c[f>>2]=k+4}while(0);n=(c[i>>2]|0)+4|0;c[i>>2]=n;k=c[f>>2]|0;p=k>>>0<e>>>0;if(!(p&n>>>0<h>>>0)){v=p;w=38;break}}}else{v=b;w=38}while(0);if((w|0)==38)q=v&1;return q|0}function _c(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;b=i;i=i+240|0;k=b;l=b+208|0;m=b+32|0;n=b+28|0;o=b+16|0;p=b+12|0;q=b+48|0;r=b+8|0;s=b+4|0;c[m>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;t=fk(g)|0;c[n>>2]=t;g=bk(n,5928)|0;$b[c[(c[g>>2]|0)+32>>2]&7](g,12194,12220,l)|0;_i(t)|0;c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;if(!(a[o>>0]&1))u=10;else u=(c[o>>2]&-2)+-1|0;mh(o,u,0);u=o+8|0;t=o+1|0;g=(a[o>>0]&1)==0?t:c[u>>2]|0;c[p>>2]=g;c[r>>2]=q;c[s>>2]=0;n=o+4|0;v=c[e>>2]|0;w=g;a:while(1){if(v)if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Wb[c[(c[v>>2]|0)+36>>2]&63](v)|0)==-1:0){c[e>>2]=0;x=0}else x=v;else x=0;g=(x|0)==0;y=c[f>>2]|0;do if(y){if((c[y+12>>2]|0)!=(c[y+16>>2]|0))if(g){z=y;break}else{A=x;B=y;C=w;break a}if((Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0)!=-1)if(g){z=y;break}else{A=x;B=y;C=w;break a}else{c[f>>2]=0;D=13;break}}else D=13;while(0);if((D|0)==13){D=0;if(g){A=x;B=0;C=w;break}else z=0}y=a[o>>0]|0;E=(y&1)==0?(y&255)>>>1:c[n>>2]|0;if((c[p>>2]|0)==(w+E|0)){mh(o,E<<1,0);if(!(a[o>>0]&1))F=10;else F=(c[o>>2]&-2)+-1|0;mh(o,F,0);y=(a[o>>0]&1)==0?t:c[u>>2]|0;c[p>>2]=y+E;G=y}else G=w;y=x+12|0;E=c[y>>2]|0;H=x+16|0;if((E|0)==(c[H>>2]|0))I=Wb[c[(c[x>>2]|0)+36>>2]&63](x)|0;else I=d[E>>0]|0;if(Ud(I&255,16,G,p,s,0,m,q,r,l)|0){A=x;B=z;C=G;break}E=c[y>>2]|0;if((E|0)==(c[H>>2]|0)){Wb[c[(c[x>>2]|0)+40>>2]&63](x)|0;v=x;w=G;continue}else{c[y>>2]=E+1;v=x;w=G;continue}}mh(o,(c[p>>2]|0)-C|0,0);C=(a[o>>0]&1)==0?t:c[u>>2]|0;u=jk()|0;c[k>>2]=j;if((zi(C,u,13578,k)|0)!=1)c[h>>2]=4;if(A)if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(Wb[c[(c[A>>2]|0)+36>>2]&63](A)|0)==-1:0){c[e>>2]=0;J=0}else J=A;else J=0;A=(J|0)==0;do if(B){if((c[B+12>>2]|0)==(c[B+16>>2]|0)?(Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1:0){c[f>>2]=0;D=37;break}if(!A)D=38}else D=37;while(0);if((D|0)==37?A:0)D=38;if((D|0)==38)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(o);ul(m);i=b;return h|0}function Zc(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+240|0;k=b+202|0;l=b+200|0;m=b+24|0;n=b+12|0;o=b+8|0;p=b+40|0;q=b+4|0;r=b;s=jj(g)|0;mg(m,g,k,l);c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;g=n+1|0;u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u;c[q>>2]=p;c[r>>2]=0;v=n+4|0;w=a[l>>0]|0;l=c[e>>2]|0;x=u;a:while(1){if(l)if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1:0){c[e>>2]=0;y=0}else y=l;else y=0;u=(y|0)==0;z=c[f>>2]|0;do if(z){if((c[z+12>>2]|0)!=(c[z+16>>2]|0))if(u){A=z;break}else{B=y;C=z;D=x;break a}if((Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0)!=-1)if(u){A=z;break}else{B=y;C=z;D=x;break a}else{c[f>>2]=0;E=13;break}}else E=13;while(0);if((E|0)==13){E=0;if(u){B=y;C=0;D=x;break}else A=0}z=a[n>>0]|0;F=(z&1)==0?(z&255)>>>1:c[v>>2]|0;if((c[o>>2]|0)==(x+F|0)){mh(n,F<<1,0);if(!(a[n>>0]&1))G=10;else G=(c[n>>2]&-2)+-1|0;mh(n,G,0);z=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=z+F;H=z}else H=x;z=y+12|0;F=c[z>>2]|0;I=y+16|0;if((F|0)==(c[I>>2]|0))J=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else J=d[F>>0]|0;if(Ud(J&255,s,H,o,r,w,m,p,q,k)|0){B=y;C=A;D=H;break}F=c[z>>2]|0;if((F|0)==(c[I>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;l=y;x=H;continue}else{c[z>>2]=F+1;l=y;x=H;continue}}H=a[m>>0]|0;x=c[q>>2]|0;if((((H&1)==0?(H&255)>>>1:c[m+4>>2]|0)|0)!=0?(x-p|0)<160:0){H=c[r>>2]|0;r=x+4|0;c[q>>2]=r;c[x>>2]=H;K=r}else K=x;c[j>>2]=We(D,c[o>>2]|0,h,s)|0;ae(m,p,K,h);if(B)if((c[B+12>>2]|0)==(c[B+16>>2]|0)?(Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1:0){c[e>>2]=0;L=0}else L=B;else L=0;B=(L|0)==0;do if(C){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[f>>2]=0;E=38;break}if(!B)E=39}else E=38;while(0);if((E|0)==38?B:0)E=39;if((E|0)==39)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(n);ul(m);i=b;return h|0}function Yc(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+240|0;k=b+202|0;l=b+200|0;m=b+24|0;n=b+12|0;o=b+8|0;p=b+40|0;q=b+4|0;r=b;s=jj(g)|0;mg(m,g,k,l);c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;g=n+1|0;u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u;c[q>>2]=p;c[r>>2]=0;v=n+4|0;w=a[l>>0]|0;l=c[e>>2]|0;x=u;a:while(1){if(l)if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1:0){c[e>>2]=0;y=0}else y=l;else y=0;u=(y|0)==0;z=c[f>>2]|0;do if(z){if((c[z+12>>2]|0)!=(c[z+16>>2]|0))if(u){A=z;break}else{B=y;C=z;D=x;break a}if((Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0)!=-1)if(u){A=z;break}else{B=y;C=z;D=x;break a}else{c[f>>2]=0;E=13;break}}else E=13;while(0);if((E|0)==13){E=0;if(u){B=y;C=0;D=x;break}else A=0}z=a[n>>0]|0;F=(z&1)==0?(z&255)>>>1:c[v>>2]|0;if((c[o>>2]|0)==(x+F|0)){mh(n,F<<1,0);if(!(a[n>>0]&1))G=10;else G=(c[n>>2]&-2)+-1|0;mh(n,G,0);z=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=z+F;H=z}else H=x;z=y+12|0;F=c[z>>2]|0;I=y+16|0;if((F|0)==(c[I>>2]|0))J=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else J=d[F>>0]|0;if(Ud(J&255,s,H,o,r,w,m,p,q,k)|0){B=y;C=A;D=H;break}F=c[z>>2]|0;if((F|0)==(c[I>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;l=y;x=H;continue}else{c[z>>2]=F+1;l=y;x=H;continue}}H=a[m>>0]|0;x=c[q>>2]|0;if((((H&1)==0?(H&255)>>>1:c[m+4>>2]|0)|0)!=0?(x-p|0)<160:0){H=c[r>>2]|0;r=x+4|0;c[q>>2]=r;c[x>>2]=H;K=r}else K=x;c[j>>2]=nf(D,c[o>>2]|0,h,s)|0;ae(m,p,K,h);if(B)if((c[B+12>>2]|0)==(c[B+16>>2]|0)?(Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1:0){c[e>>2]=0;L=0}else L=B;else L=0;B=(L|0)==0;do if(C){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[f>>2]=0;E=38;break}if(!B)E=39}else E=38;while(0);if((E|0)==38?B:0)E=39;if((E|0)==39)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(n);ul(m);i=b;return h|0}function Xc(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+240|0;k=b+202|0;l=b+200|0;m=b+24|0;n=b+12|0;o=b+8|0;p=b+40|0;q=b+4|0;r=b;s=jj(g)|0;mg(m,g,k,l);c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;if(!(a[n>>0]&1))t=10;else t=(c[n>>2]&-2)+-1|0;mh(n,t,0);t=n+8|0;g=n+1|0;u=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=u;c[q>>2]=p;c[r>>2]=0;v=n+4|0;w=a[l>>0]|0;l=c[e>>2]|0;x=u;a:while(1){if(l)if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1:0){c[e>>2]=0;y=0}else y=l;else y=0;u=(y|0)==0;z=c[f>>2]|0;do if(z){if((c[z+12>>2]|0)!=(c[z+16>>2]|0))if(u){A=z;break}else{B=y;C=z;D=x;break a}if((Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0)!=-1)if(u){A=z;break}else{B=y;C=z;D=x;break a}else{c[f>>2]=0;E=13;break}}else E=13;while(0);if((E|0)==13){E=0;if(u){B=y;C=0;D=x;break}else A=0}z=a[n>>0]|0;F=(z&1)==0?(z&255)>>>1:c[v>>2]|0;if((c[o>>2]|0)==(x+F|0)){mh(n,F<<1,0);if(!(a[n>>0]&1))G=10;else G=(c[n>>2]&-2)+-1|0;mh(n,G,0);z=(a[n>>0]&1)==0?g:c[t>>2]|0;c[o>>2]=z+F;H=z}else H=x;z=y+12|0;F=c[z>>2]|0;I=y+16|0;if((F|0)==(c[I>>2]|0))J=Wb[c[(c[y>>2]|0)+36>>2]&63](y)|0;else J=d[F>>0]|0;if(Ud(J&255,s,H,o,r,w,m,p,q,k)|0){B=y;C=A;D=H;break}F=c[z>>2]|0;if((F|0)==(c[I>>2]|0)){Wb[c[(c[y>>2]|0)+40>>2]&63](y)|0;l=y;x=H;continue}else{c[z>>2]=F+1;l=y;x=H;continue}}H=a[m>>0]|0;x=c[q>>2]|0;if((((H&1)==0?(H&255)>>>1:c[m+4>>2]|0)|0)!=0?(x-p|0)<160:0){H=c[r>>2]|0;r=x+4|0;c[q>>2]=r;c[x>>2]=H;K=r}else K=x;c[j>>2]=mf(D,c[o>>2]|0,h,s)|0;ae(m,p,K,h);if(B)if((c[B+12>>2]|0)==(c[B+16>>2]|0)?(Wb[c[(c[B>>2]|0)+36>>2]&63](B)|0)==-1:0){c[e>>2]=0;L=0}else L=B;else L=0;B=(L|0)==0;do if(C){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[f>>2]=0;E=38;break}if(!B)E=39}else E=38;while(0);if((E|0)==38?B:0)E=39;if((E|0)==39)c[h>>2]=c[h>>2]|2;h=c[e>>2]|0;ul(n);ul(m);i=b;return h|0}function Wc(e,f,g,h,j,k){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;e=i;i=i+240|0;l=e+202|0;m=e+200|0;n=e+24|0;o=e+12|0;p=e+8|0;q=e+40|0;r=e+4|0;s=e;t=jj(h)|0;mg(n,h,l,m);c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;if(!(a[o>>0]&1))u=10;else u=(c[o>>2]&-2)+-1|0;mh(o,u,0);u=o+8|0;h=o+1|0;v=(a[o>>0]&1)==0?h:c[u>>2]|0;c[p>>2]=v;c[r>>2]=q;c[s>>2]=0;w=o+4|0;x=a[m>>0]|0;m=c[f>>2]|0;y=v;a:while(1){if(m)if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(Wb[c[(c[m>>2]|0)+36>>2]&63](m)|0)==-1:0){c[f>>2]=0;z=0}else z=m;else z=0;v=(z|0)==0;A=c[g>>2]|0;do if(A){if((c[A+12>>2]|0)!=(c[A+16>>2]|0))if(v){B=A;break}else{C=z;D=A;E=y;break a}if((Wb[c[(c[A>>2]|0)+36>>2]&63](A)|0)!=-1)if(v){B=A;break}else{C=z;D=A;E=y;break a}else{c[g>>2]=0;F=13;break}}else F=13;while(0);if((F|0)==13){F=0;if(v){C=z;D=0;E=y;break}else B=0}A=a[o>>0]|0;G=(A&1)==0?(A&255)>>>1:c[w>>2]|0;if((c[p>>2]|0)==(y+G|0)){mh(o,G<<1,0);if(!(a[o>>0]&1))H=10;else H=(c[o>>2]&-2)+-1|0;mh(o,H,0);A=(a[o>>0]&1)==0?h:c[u>>2]|0;c[p>>2]=A+G;I=A}else I=y;A=z+12|0;G=c[A>>2]|0;J=z+16|0;if((G|0)==(c[J>>2]|0))K=Wb[c[(c[z>>2]|0)+36>>2]&63](z)|0;else K=d[G>>0]|0;if(Ud(K&255,t,I,p,s,x,n,q,r,l)|0){C=z;D=B;E=I;break}G=c[A>>2]|0;if((G|0)==(c[J>>2]|0)){Wb[c[(c[z>>2]|0)+40>>2]&63](z)|0;m=z;y=I;continue}else{c[A>>2]=G+1;m=z;y=I;continue}}I=a[n>>0]|0;y=c[r>>2]|0;if((((I&1)==0?(I&255)>>>1:c[n+4>>2]|0)|0)!=0?(y-q|0)<160:0){I=c[s>>2]|0;s=y+4|0;c[r>>2]=s;c[y>>2]=I;L=s}else L=y;b[k>>1]=lf(E,c[p>>2]|0,j,t)|0;ae(n,q,L,j);if(C)if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Wb[c[(c[C>>2]|0)+36>>2]&63](C)|0)==-1:0){c[f>>2]=0;M=0}else M=C;else M=0;C=(M|0)==0;do if(D){if((c[D+12>>2]|0)==(c[D+16>>2]|0)?(Wb[c[(c[D>>2]|0)+36>>2]&63](D)|0)==-1:0){c[g>>2]=0;F=38;break}if(!C)F=39}else F=38;while(0);if((F|0)==38?C:0)F=39;if((F|0)==39)c[j>>2]=c[j>>2]|2;j=c[f>>2]|0;ul(o);ul(n);i=e;return j|0}function Qc(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;e=i;i=i+16|0;f=e;g=c[d+4>>2]|0;h=b+24|0;if(!(g>>>0<(c[b+28>>2]|0)-(c[h>>2]|0)>>3>>>0?(c[(Zd(h,g)|0)+4>>2]|0)!=-1:0)){g=le(le(we(le(le(le(3404,9596,42)|0,9639,81)|0,9721,6)|0,41)|0,9728,2)|0,9731,14)|0;c[f>>2]=fk(g+(c[(c[g>>2]|0)+-12>>2]|0)|0)|0;j=bk(f,5928)|0;k=bc[c[(c[j>>2]|0)+28>>2]&15](j,10)|0;zm(f);ef(g,k)|0;lg(g)|0;g=le(3320,9566,29)|0;c[f>>2]=fk(g+(c[(c[g>>2]|0)+-12>>2]|0)|0)|0;k=bk(f,5928)|0;j=bc[c[(c[k>>2]|0)+28>>2]&15](k,10)|0;zm(f);ef(g,j)|0;lg(g)|0;Ca()|0}g=d+4|0;d=c[(Zd(h,c[g>>2]|0)|0)+4>>2]|0;j=$d(b,d*28|0)|0;f=b+16|0;k=(c[f>>2]|0)-(c[b+12>>2]|0)|0;l=(k>>2)+-1|0;m=l*28|0;n=$d(b,m)|0;o=j+12|0;p=j+20|0;if((c[p>>2]|0)!=-1){if((a[8]|0)==0?(Ha(8)|0)!=0:0){c[544]=96;c[546]=39;c[548]=40;c[545]=97;c[547]=41;c[549]=42;Qa(8)}Sb[c[2176+(c[p>>2]<<2)>>2]&127](o)}ti(j|0,n|0,28)|0;n=b+12|0;j=c[(_d(n,l)|0)>>2]|0;c[(Zd(h,j)|0)+4>>2]=d;c[(_d(n,d)|0)>>2]=j;j=b+4|0;o=c[j>>2]|0;p=c[b>>2]|0;q=p;r=o-q|0;s=m-r|0;if((s|0)>0){t=b+8|0;if(((c[t>>2]|0)-q|0)>>>0<m>>>0){q=nh(p,m)|0;c[b>>2]=q;u=q+r|0;c[j>>2]=u;c[t>>2]=q+m;v=u}else v=o;o=v+s|0;if((m|0)!=(r|0)){r=v;do{a[r>>0]=0;r=(c[j>>2]|0)+1|0;c[j>>2]=r}while((r|0)!=(o|0))}}else c[j>>2]=p+m;m=c[f>>2]|0;p=c[n>>2]|0;j=m;o=p;r=j-o|0;v=l<<2;if((v-r|0)>0){l=b+20|0;if(v>>>0>((c[l>>2]|0)-o|0)>>>0){s=nh(p,v)|0;c[n>>2]=s;n=s+r|0;c[f>>2]=n;c[l>>2]=s+v;w=n}else w=m;if((v|0)!=(r|0)){Mh(w|0,0,o+k+-8-j+4&-4|0)|0;c[f>>2]=w+(((w+(v+-4-j+o-w)|0)>>>2)+1<<2)}}else c[f>>2]=p+v;c[(Zd(h,d)|0)+4>>2]=-1;v=Zd(h,d)|0;c[v>>2]=(c[v>>2]|0)+1;v=b+36|0;d=b+40|0;h=c[d>>2]|0;p=b+44|0;if((h|0)!=(c[p>>2]|0)){x=h;y=c[g>>2]|0;c[x>>2]=y;z=x+4|0;c[d>>2]=z;i=e;return}b=c[v>>2]|0;f=h-b|0;h=f>>2;w=h+1|0;o=~~+ba(+(+(h>>>0)*1.5))>>>0;h=(o>>>0<w>>>0?w:o)<<2;o=nh(b,h)|0;c[v>>2]=o;v=o+f|0;c[d>>2]=v;c[p>>2]=o+h;x=v;y=c[g>>2]|0;c[x>>2]=y;z=x+4|0;c[d>>2]=z;i=e;return}function id(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;l=i;i=i+16|0;m=l;a:do if((e|0)==(f|0))n=f;else{o=e;while(1){if(!(a[o>>0]|0)){n=o;break a}o=o+1|0;if((o|0)==(f|0)){n=f;break}}}while(0);c[k>>2]=h;c[g>>2]=e;o=j;p=b+8|0;b:do if((h|0)==(j|0)|(e|0)==(f|0)){q=e;r=29}else{b=e;s=h;t=n;c:while(1){u=d;v=c[u+4>>2]|0;w=m;c[w>>2]=c[u>>2];c[w+4>>2]=v;v=t;w=Ya(c[p>>2]|0)|0;u=Md(s,g,v-b|0,o-s>>2,d)|0;if(w)Ya(w|0)|0;switch(u|0){case 0:{x=2;break b;break}case -1:{y=b;z=s;A=v;break c;break}default:{}}v=(c[k>>2]|0)+(u<<2)|0;c[k>>2]=v;if((v|0)==(j|0)){r=19;break}u=c[g>>2]|0;if((t|0)==(f|0)){B=u;C=v;D=f}else{w=Ya(c[p>>2]|0)|0;E=Td(v,u,1,d)|0;if(w)Ya(w|0)|0;if(E){x=2;break b}c[k>>2]=(c[k>>2]|0)+4;E=(c[g>>2]|0)+1|0;c[g>>2]=E;d:do if((E|0)==(f|0))F=f;else{w=E;while(1){if(!(a[w>>0]|0)){F=w;break d}w=w+1|0;if((w|0)==(f|0)){F=f;break}}}while(0);B=E;C=c[k>>2]|0;D=F}if((C|0)==(j|0)|(B|0)==(f|0)){q=B;r=29;break b}else{b=B;s=C;t=D}}if((r|0)==19){q=c[g>>2]|0;r=29;break}c[k>>2]=z;e:do if((y|0)!=(c[g>>2]|0)){t=y;s=z;f:while(1){b=Ya(c[p>>2]|0)|0;w=Td(s,t,A-t|0,m)|0;if(b)Ya(b|0)|0;switch(w|0){case -1:{G=t;r=13;break f;break}case -2:{H=t;r=14;break f;break}case 0:{I=t+1|0;break}default:I=t+w|0}s=(c[k>>2]|0)+4|0;c[k>>2]=s;if((I|0)==(c[g>>2]|0)){J=I;break e}else t=I}if((r|0)==13){c[g>>2]=G;x=2;break b}else if((r|0)==14){c[g>>2]=H;x=1;break b}}else J=y;while(0);c[g>>2]=J;x=(J|0)!=(f|0)&1}while(0);if((r|0)==29)x=(q|0)!=(f|0)&1;i=l;return x|0}function pd(d,f,g,h,i,j,k,l){d=d|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0;c[g>>2]=d;c[j>>2]=h;d=i;if(l&2)if((d-h|0)<3)m=1;else{c[j>>2]=h+1;a[h>>0]=-17;h=c[j>>2]|0;c[j>>2]=h+1;a[h>>0]=-69;h=c[j>>2]|0;c[j>>2]=h+1;a[h>>0]=-65;n=4}else n=4;a:do if((n|0)==4){h=f;l=c[g>>2]|0;if(l>>>0<f>>>0){i=l;while(1){l=b[i>>1]|0;o=l&65535;if(o>>>0>k>>>0){m=2;break a}do if((l&65535)<128){p=c[j>>2]|0;if((d-p|0)<1){m=1;break a}c[j>>2]=p+1;a[p>>0]=l}else{if((l&65535)<2048){p=c[j>>2]|0;if((d-p|0)<2){m=1;break a}c[j>>2]=p+1;a[p>>0]=o>>>6|192;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=o&63|128;break}if((l&65535)<55296){p=c[j>>2]|0;if((d-p|0)<3){m=1;break a}c[j>>2]=p+1;a[p>>0]=o>>>12|224;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=o>>>6&63|128;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=o&63|128;break}if((l&65535)>=56320){if((l&65535)<57344){m=2;break a}p=c[j>>2]|0;if((d-p|0)<3){m=1;break a}c[j>>2]=p+1;a[p>>0]=o>>>12|224;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=o>>>6&63|128;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=o&63|128;break}if((h-i|0)<4){m=1;break a}p=i+2|0;q=e[p>>1]|0;if((q&64512|0)!=56320){m=2;break a}if((d-(c[j>>2]|0)|0)<4){m=1;break a}r=o&960;if(((r<<10)+65536|o<<10&64512|q&1023)>>>0>k>>>0){m=2;break a}c[g>>2]=p;p=(r>>>6)+1|0;r=c[j>>2]|0;c[j>>2]=r+1;a[r>>0]=p>>>2|240;r=c[j>>2]|0;c[j>>2]=r+1;a[r>>0]=o>>>2&15|p<<4&48|128;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=o<<4&48|q>>>6&15|128;p=c[j>>2]|0;c[j>>2]=p+1;a[p>>0]=q&63|128}while(0);i=(c[g>>2]|0)+2|0;c[g>>2]=i;if(i>>>0>=f>>>0){m=0;break}}}else m=0}while(0);return m|0}function bd(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;b=i;i=i+576|0;k=b+424|0;l=b;m=b+24|0;n=b+16|0;o=b+12|0;p=b+8|0;q=b+464|0;r=b+4|0;s=b+468|0;c[n>>2]=m;t=n+4|0;c[t>>2]=100;c[p>>2]=fk(g)|0;u=bk(p,5920)|0;a[q>>0]=0;c[r>>2]=c[e>>2];v=c[g+4>>2]|0;c[k>>2]=c[r>>2];if(hc(d,k,f,p,v,h,q,u,n,o,m+400|0)|0){$b[c[(c[u>>2]|0)+48>>2]&7](u,13666,13676,k)|0;u=c[o>>2]|0;m=c[n>>2]|0;v=u-m|0;if((v|0)>392){f=fc((v>>2)+2|0)|0;if(!f)Zl();else{w=f;x=f}}else{w=0;x=s}if(!(a[q>>0]|0))y=x;else{a[x>>0]=45;y=x+1|0}x=k+40|0;q=k;if(m>>>0<u>>>0){u=k+4|0;f=u+4|0;v=f+4|0;r=v+4|0;g=r+4|0;z=g+4|0;A=z+4|0;B=A+4|0;C=B+4|0;D=y;E=m;while(1){m=c[E>>2]|0;if((c[k>>2]|0)!=(m|0))if((c[u>>2]|0)!=(m|0))if((c[f>>2]|0)!=(m|0))if((c[v>>2]|0)!=(m|0))if((c[r>>2]|0)!=(m|0))if((c[g>>2]|0)!=(m|0))if((c[z>>2]|0)!=(m|0))if((c[A>>2]|0)!=(m|0))if((c[B>>2]|0)==(m|0))F=B;else F=(c[C>>2]|0)==(m|0)?C:x;else F=A;else F=z;else F=g;else F=r;else F=v;else F=f;else F=u;else F=k;a[D>>0]=a[13666+(F-q>>2)>>0]|0;E=E+4|0;m=D+1|0;if(E>>>0>=(c[o>>2]|0)>>>0){G=m;break}else D=m}}else G=y;a[G>>0]=0;c[l>>2]=j;Zj(s,13662,l)|0;if(w)kc(w)}w=c[d>>2]|0;do if(w){l=c[w+12>>2]|0;if((l|0)==(c[w+16>>2]|0))H=Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0;else H=c[l>>2]|0;if((H|0)==-1){c[d>>2]=0;I=1;break}else{I=(c[d>>2]|0)==0;break}}else I=1;while(0);H=c[e>>2]|0;do if(H){w=c[H+12>>2]|0;if((w|0)==(c[H+16>>2]|0))J=Wb[c[(c[H>>2]|0)+36>>2]&63](H)|0;else J=c[w>>2]|0;if((J|0)!=-1)if(I)break;else{K=30;break}else{c[e>>2]=0;K=28;break}}else K=28;while(0);if((K|0)==28?I:0)K=30;if((K|0)==30)c[h>>2]=c[h>>2]|2;h=c[d>>2]|0;_i(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if(p)Sb[c[t>>2]&127](p);i=b;return h|0}function kd(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;l=i;i=i+16|0;m=l;n=l+8|0;a:do if((e|0)==(f|0))o=f;else{p=e;while(1){if(!(c[p>>2]|0)){o=p;break a}p=p+4|0;if((p|0)==(f|0)){o=f;break}}}while(0);c[k>>2]=h;c[g>>2]=e;p=j;q=b+8|0;b:do if((h|0)==(j|0)|(e|0)==(f|0)){r=e;s=29}else{b=e;t=h;u=o;c:while(1){v=d;w=c[v+4>>2]|0;x=m;c[x>>2]=c[v>>2];c[x+4>>2]=w;w=Ya(c[q>>2]|0)|0;x=Qd(t,g,u-b>>2,p-t|0,d)|0;if(w)Ya(w|0)|0;switch(x|0){case 0:{y=1;break b;break}case -1:{z=b;A=t;break c;break}default:{}}w=(c[k>>2]|0)+x|0;c[k>>2]=w;if((w|0)==(j|0)){s=15;break}if((u|0)==(f|0)){B=c[g>>2]|0;C=w;D=f}else{w=Ya(c[q>>2]|0)|0;x=Jf(n,0,d)|0;if(w)Ya(w|0)|0;if((x|0)==-1){y=2;break b}if(x>>>0>(p-(c[k>>2]|0)|0)>>>0){y=1;break b}if(x){w=x;x=n;while(1){v=a[x>>0]|0;E=c[k>>2]|0;c[k>>2]=E+1;a[E>>0]=v;w=w+-1|0;if(!w)break;else x=x+1|0}}x=(c[g>>2]|0)+4|0;c[g>>2]=x;d:do if((x|0)==(f|0))F=f;else{w=x;while(1){if(!(c[w>>2]|0)){F=w;break d}w=w+4|0;if((w|0)==(f|0)){F=f;break}}}while(0);B=x;C=c[k>>2]|0;D=F}if((C|0)==(j|0)|(B|0)==(f|0)){r=B;s=29;break b}else{b=B;t=C;u=D}}if((s|0)==15){r=c[g>>2]|0;s=29;break}c[k>>2]=A;e:do if((z|0)==(c[g>>2]|0))G=z;else{u=z;t=A;while(1){b=c[u>>2]|0;w=Ya(c[q>>2]|0)|0;v=Jf(t,b,m)|0;if(w)Ya(w|0)|0;if((v|0)==-1){G=u;break e}t=(c[k>>2]|0)+v|0;c[k>>2]=t;v=u+4|0;if((v|0)==(c[g>>2]|0)){G=v;break}else u=v}}while(0);c[g>>2]=G;y=2}while(0);if((s|0)==29)y=(r|0)!=(f|0)&1;i=l;return y|0}function ld(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+16|0;l=k;m=bk(j,5920)|0;n=bk(j,6076)|0;Tb[c[(c[n>>2]|0)+20>>2]&63](l,n);j=a[l>>0]|0;o=l+4|0;if(((j&1)==0?(j&255)>>>1:c[o>>2]|0)|0){c[h>>2]=f;j=a[b>>0]|0;switch(j<<24>>24){case 43:case 45:{p=bc[c[(c[m>>2]|0)+44>>2]&15](m,j)|0;j=c[h>>2]|0;c[h>>2]=j+4;c[j>>2]=p;q=b+1|0;break}default:q=b}a:do if((e-q|0)>1?(a[q>>0]|0)==48:0){p=q+1|0;switch(a[p>>0]|0){case 88:case 120:break;default:{r=q;break a}}j=bc[c[(c[m>>2]|0)+44>>2]&15](m,48)|0;s=c[h>>2]|0;c[h>>2]=s+4;c[s>>2]=j;j=bc[c[(c[m>>2]|0)+44>>2]&15](m,a[p>>0]|0)|0;p=c[h>>2]|0;c[h>>2]=p+4;c[p>>2]=j;r=q+2|0}else r=q;while(0);if((r|0)!=(e|0)?(q=e+-1|0,r>>>0<q>>>0):0){j=r;p=q;do{q=a[j>>0]|0;a[j>>0]=a[p>>0]|0;a[p>>0]=q;j=j+1|0;p=p+-1|0}while(j>>>0<p>>>0)}p=Wb[c[(c[n>>2]|0)+16>>2]&63](n)|0;n=l+8|0;j=l+1|0;if(r>>>0<e>>>0){q=0;s=0;t=r;while(1){u=a[((a[l>>0]&1)==0?j:c[n>>2]|0)+s>>0]|0;if(u<<24>>24!=0&(q|0)==(u<<24>>24|0)){u=c[h>>2]|0;c[h>>2]=u+4;c[u>>2]=p;u=a[l>>0]|0;v=0;w=(s>>>0<(((u&1)==0?(u&255)>>>1:c[o>>2]|0)+-1|0)>>>0&1)+s|0}else{v=q;w=s}u=bc[c[(c[m>>2]|0)+44>>2]&15](m,a[t>>0]|0)|0;x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=u;t=t+1|0;if(t>>>0>=e>>>0)break;else{q=v+1|0;s=w}}}w=b;s=f+(r-w<<2)|0;r=c[h>>2]|0;if((s|0)!=(r|0)){v=r+-4|0;if(s>>>0<v>>>0){q=s;t=v;do{v=c[q>>2]|0;c[q>>2]=c[t>>2];c[t>>2]=v;q=q+4|0;t=t+-4|0}while(q>>>0<t>>>0);y=w;z=r}else{y=w;z=r}}else{y=w;z=s}}else{$b[c[(c[m>>2]|0)+48>>2]&7](m,b,e,f)|0;m=b;b=f+(e-m<<2)|0;c[h>>2]=b;y=m;z=b}c[g>>2]=(d|0)==(e|0)?z:f+(d-y<<2)|0;ul(l);i=k;return}function dd(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;a:do if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)==(e|0)?(h=d+28|0,(c[h>>2]|0)!=1):0)c[h>>2]=f}else{if((b|0)!=(c[d>>2]|0)){h=c[b+12>>2]|0;i=b+16+(h<<3)|0;Qh(b+16|0,d,e,f,g);j=b+24|0;if((h|0)<=1)break;h=c[b+8>>2]|0;if((h&2|0)==0?(k=d+36|0,(c[k>>2]|0)!=1):0){if(!(h&1)){h=d+54|0;l=j;while(1){if(a[h>>0]|0)break a;if((c[k>>2]|0)==1)break a;Qh(l,d,e,f,g);l=l+8|0;if(l>>>0>=i>>>0)break a}}l=d+24|0;h=d+54|0;m=j;while(1){if(a[h>>0]|0)break a;if((c[k>>2]|0)==1?(c[l>>2]|0)==1:0)break a;Qh(m,d,e,f,g);m=m+8|0;if(m>>>0>=i>>>0)break a}}m=d+54|0;l=j;while(1){if(a[m>>0]|0)break a;Qh(l,d,e,f,g);l=l+8|0;if(l>>>0>=i>>>0)break a}}if((c[d+16>>2]|0)!=(e|0)?(i=d+20|0,(c[i>>2]|0)!=(e|0)):0){c[d+32>>2]=f;l=d+44|0;if((c[l>>2]|0)==4)break;m=c[b+12>>2]|0;j=b+16+(m<<3)|0;k=d+52|0;h=d+53|0;n=d+54|0;o=b+8|0;p=d+24|0;b:do if((m|0)>0){q=0;r=0;s=b+16|0;while(1){a[k>>0]=0;a[h>>0]=0;Lh(s,d,e,e,1,g);if(a[n>>0]|0){t=q;u=r;v=20;break b}do if(a[h>>0]|0){if(!(a[k>>0]|0))if(!(c[o>>2]&1)){t=q;u=1;v=20;break b}else{w=q;x=1;break}if((c[p>>2]|0)==1)break b;if(!(c[o>>2]&2))break b;else{w=1;x=1}}else{w=q;x=r}while(0);s=s+8|0;if(s>>>0>=j>>>0){t=w;u=x;v=20;break}else{q=w;r=x}}}else{t=0;u=0;v=20}while(0);do if((v|0)==20){if((!t?(c[i>>2]=e,j=d+40|0,c[j>>2]=(c[j>>2]|0)+1,(c[d+36>>2]|0)==1):0)?(c[p>>2]|0)==2:0){a[n>>0]=1;if(u)break}else v=24;if((v|0)==24?u:0)break;c[l>>2]=4;break a}while(0);c[l>>2]=3;break}if((f|0)==1)c[d+32>>2]=1}while(0);return}function nd(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+16|0;l=k;m=bk(j,5928)|0;n=bk(j,6068)|0;Tb[c[(c[n>>2]|0)+20>>2]&63](l,n);j=a[l>>0]|0;o=l+4|0;if(((j&1)==0?(j&255)>>>1:c[o>>2]|0)|0){c[h>>2]=f;j=a[b>>0]|0;switch(j<<24>>24){case 43:case 45:{p=bc[c[(c[m>>2]|0)+28>>2]&15](m,j)|0;j=c[h>>2]|0;c[h>>2]=j+1;a[j>>0]=p;q=b+1|0;break}default:q=b}a:do if((e-q|0)>1?(a[q>>0]|0)==48:0){p=q+1|0;switch(a[p>>0]|0){case 88:case 120:break;default:{r=q;break a}}j=bc[c[(c[m>>2]|0)+28>>2]&15](m,48)|0;s=c[h>>2]|0;c[h>>2]=s+1;a[s>>0]=j;j=bc[c[(c[m>>2]|0)+28>>2]&15](m,a[p>>0]|0)|0;p=c[h>>2]|0;c[h>>2]=p+1;a[p>>0]=j;r=q+2|0}else r=q;while(0);if((r|0)!=(e|0)?(q=e+-1|0,r>>>0<q>>>0):0){j=r;p=q;do{q=a[j>>0]|0;a[j>>0]=a[p>>0]|0;a[p>>0]=q;j=j+1|0;p=p+-1|0}while(j>>>0<p>>>0)}p=Wb[c[(c[n>>2]|0)+16>>2]&63](n)|0;n=l+8|0;j=l+1|0;if(r>>>0<e>>>0){q=0;s=0;t=r;while(1){u=a[((a[l>>0]&1)==0?j:c[n>>2]|0)+s>>0]|0;if(u<<24>>24!=0&(q|0)==(u<<24>>24|0)){u=c[h>>2]|0;c[h>>2]=u+1;a[u>>0]=p;u=a[l>>0]|0;v=0;w=(s>>>0<(((u&1)==0?(u&255)>>>1:c[o>>2]|0)+-1|0)>>>0&1)+s|0}else{v=q;w=s}u=bc[c[(c[m>>2]|0)+28>>2]&15](m,a[t>>0]|0)|0;x=c[h>>2]|0;c[h>>2]=x+1;a[x>>0]=u;t=t+1|0;if(t>>>0>=e>>>0)break;else{q=v+1|0;s=w}}}w=b;s=f+(r-w)|0;r=c[h>>2]|0;if((s|0)==(r|0)){y=w;z=s}else{v=r+-1|0;if(s>>>0<v>>>0){r=s;s=v;do{v=a[r>>0]|0;a[r>>0]=a[s>>0]|0;a[s>>0]=v;r=r+1|0;s=s+-1|0}while(r>>>0<s>>>0)}y=w;z=c[h>>2]|0}}else{$b[c[(c[m>>2]|0)+32>>2]&7](m,b,e,f)|0;m=b;b=f+(e-m)|0;c[h>>2]=b;y=m;z=b}c[g>>2]=(d|0)==(e|0)?z:f+(d-y)|0;ul(l);i=k;return}function cd(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;b=i;i=i+240|0;k=b+24|0;l=b;m=b+136|0;n=b+16|0;o=b+12|0;p=b+8|0;q=b+134|0;r=b+4|0;s=b+124|0;c[n>>2]=m;t=n+4|0;c[t>>2]=100;c[p>>2]=fk(g)|0;u=bk(p,5928)|0;a[q>>0]=0;c[r>>2]=c[e>>2];v=c[g+4>>2]|0;c[k>>2]=c[r>>2];if(ic(d,k,f,p,v,h,q,u,n,o,m+100|0)|0){$b[c[(c[u>>2]|0)+32>>2]&7](u,13651,13661,s)|0;u=c[o>>2]|0;m=c[n>>2]|0;v=u-m|0;if((v|0)>98){f=fc(v+2|0)|0;if(!f)Zl();else{w=f;x=f}}else{w=0;x=k}if(!(a[q>>0]|0))y=x;else{a[x>>0]=45;y=x+1|0}x=s+10|0;q=s;if(m>>>0<u>>>0){u=s+1|0;f=u+1|0;v=f+1|0;r=v+1|0;g=r+1|0;z=g+1|0;A=z+1|0;B=A+1|0;C=B+1|0;D=y;E=m;while(1){m=a[E>>0]|0;if((a[s>>0]|0)!=m<<24>>24)if((a[u>>0]|0)!=m<<24>>24)if((a[f>>0]|0)!=m<<24>>24)if((a[v>>0]|0)!=m<<24>>24)if((a[r>>0]|0)!=m<<24>>24)if((a[g>>0]|0)!=m<<24>>24)if((a[z>>0]|0)!=m<<24>>24)if((a[A>>0]|0)!=m<<24>>24)if((a[B>>0]|0)==m<<24>>24)F=B;else F=(a[C>>0]|0)==m<<24>>24?C:x;else F=A;else F=z;else F=g;else F=r;else F=v;else F=f;else F=u;else F=s;a[D>>0]=a[13651+(F-q)>>0]|0;E=E+1|0;m=D+1|0;if(E>>>0>=(c[o>>2]|0)>>>0){G=m;break}else D=m}}else G=y;a[G>>0]=0;c[l>>2]=j;Zj(k,13662,l)|0;if(w)kc(w)}w=c[d>>2]|0;do if(w)if((c[w+12>>2]|0)==(c[w+16>>2]|0))if((Wb[c[(c[w>>2]|0)+36>>2]&63](w)|0)==-1){c[d>>2]=0;H=0;break}else{H=c[d>>2]|0;break}else H=w;else H=0;while(0);w=(H|0)==0;H=c[e>>2]|0;do if(H){if((c[H+12>>2]|0)==(c[H+16>>2]|0)?(Wb[c[(c[H>>2]|0)+36>>2]&63](H)|0)==-1:0){c[e>>2]=0;I=25;break}if(!w)I=26}else I=25;while(0);if((I|0)==25?w:0)I=26;if((I|0)==26)c[h>>2]=c[h>>2]|2;h=c[d>>2]|0;_i(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if(p)Sb[c[t>>2]&127](p);i=b;return h|0}function yd(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;f=i;i=i+16|0;g=f;if(!b){h=c[d>>2]|0;j=c[h>>2]|0;if(!j){k=0;i=f;return k|0}else{l=0;m=j;n=h}while(1){if(m>>>0>127){h=Jf(g,m,0)|0;if((h|0)==-1){k=-1;o=26;break}else p=h}else p=1;h=p+l|0;n=n+4|0;m=c[n>>2]|0;if(!m){k=h;o=26;break}else l=h}if((o|0)==26){i=f;return k|0}}a:do if(e>>>0>3){l=b;m=e;n=c[d>>2]|0;while(1){p=c[n>>2]|0;if((p+-1|0)>>>0>126){if(!p){q=l;r=m;break}h=Jf(l,p,0)|0;if((h|0)==-1){k=-1;o=26;break}s=l+h|0;t=m-h|0;u=n}else{a[l>>0]=p;s=l+1|0;t=m+-1|0;u=c[d>>2]|0}n=u+4|0;c[d>>2]=n;if(t>>>0<=3){v=s;w=t;break a}else{l=s;m=t}}if((o|0)==26){i=f;return k|0}a[q>>0]=0;c[d>>2]=0;k=e-r|0;i=f;return k|0}else{v=b;w=e}while(0);if(!w){k=e;i=f;return k|0}b=v;v=w;w=c[d>>2]|0;while(1){r=c[w>>2]|0;if((r+-1|0)>>>0>126){if(!r){x=b;y=v;o=19;break}q=Jf(g,r,0)|0;if((q|0)==-1){k=-1;o=26;break}if(v>>>0<q>>>0){z=v;o=22;break}Jf(b,c[w>>2]|0,0)|0;A=b+q|0;B=v-q|0;C=w}else{a[b>>0]=r;A=b+1|0;B=v+-1|0;C=c[d>>2]|0}w=C+4|0;c[d>>2]=w;if(!B){k=e;o=26;break}else{b=A;v=B}}if((o|0)==19){a[x>>0]=0;c[d>>2]=0;k=e-y|0;i=f;return k|0}else if((o|0)==22){k=e-z|0;i=f;return k|0}else if((o|0)==26){i=f;return k|0}return 0}function zd(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;e=a+4|0;f=c[e>>2]|0;g=a+100|0;if(f>>>0<(c[g>>2]|0)>>>0){c[e>>2]=f+1;h=d[f>>0]|0}else h=Ye(a)|0;switch(h|0){case 43:case 45:{f=(h|0)==45&1;i=c[e>>2]|0;if(i>>>0<(c[g>>2]|0)>>>0){c[e>>2]=i+1;j=d[i>>0]|0}else j=Ye(a)|0;if((b|0)!=0&(j+-48|0)>>>0>9?(c[g>>2]|0)!=0:0){c[e>>2]=(c[e>>2]|0)+-1;k=j;l=f}else{k=j;l=f}break}default:{k=h;l=0}}if((k+-48|0)>>>0>9){if(!(c[g>>2]|0)){m=-2147483648;n=0;G=m;return n|0}c[e>>2]=(c[e>>2]|0)+-1;m=-2147483648;n=0;G=m;return n|0}else{o=k;p=0}while(1){k=o+-48+(p*10|0)|0;h=c[e>>2]|0;if(h>>>0<(c[g>>2]|0)>>>0){c[e>>2]=h+1;q=d[h>>0]|0}else q=Ye(a)|0;if((q+-48|0)>>>0<10&(k|0)<214748364){o=q;p=k}else{r=k;s=q;break}}q=((r|0)<0)<<31>>31;if((s+-48|0)>>>0<10){p=r;o=q;k=s;while(1){h=pj(p|0,o|0,10,0)|0;f=G;j=Ok(k|0,((k|0)<0)<<31>>31|0,-48,-1)|0;b=Ok(j|0,G|0,h|0,f|0)|0;f=G;h=c[e>>2]|0;if(h>>>0<(c[g>>2]|0)>>>0){c[e>>2]=h+1;t=d[h>>0]|0}else t=Ye(a)|0;if((t+-48|0)>>>0<10&((f|0)<21474836|(f|0)==21474836&b>>>0<2061584302)){p=b;o=f;k=t}else{u=b;v=f;w=t;break}}}else{u=r;v=q;w=s}if((w+-48|0)>>>0<10)do{w=c[e>>2]|0;if(w>>>0<(c[g>>2]|0)>>>0){c[e>>2]=w+1;x=d[w>>0]|0}else x=Ye(a)|0}while((x+-48|0)>>>0<10);if(c[g>>2]|0)c[e>>2]=(c[e>>2]|0)+-1;e=(l|0)!=0;l=Oj(0,0,u|0,v|0)|0;m=e?G:v;n=e?l:u;G=m;return n|0}function xd(b,e,f,g,h,i,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0;a:do if(b<<24>>24==i<<24>>24)if(a[e>>0]|0){a[e>>0]=0;p=c[h>>2]|0;c[h>>2]=p+1;a[p>>0]=46;p=a[k>>0]|0;if((((p&1)==0?(p&255)>>>1:c[k+4>>2]|0)|0)!=0?(p=c[m>>2]|0,(p-l|0)<160):0){q=c[n>>2]|0;c[m>>2]=p+4;c[p>>2]=q;r=0}else r=0}else r=-1;else{if(b<<24>>24==j<<24>>24?(q=a[k>>0]|0,(((q&1)==0?(q&255)>>>1:c[k+4>>2]|0)|0)!=0):0){if(!(a[e>>0]|0)){r=-1;break}q=c[m>>2]|0;if((q-l|0)>=160){r=0;break}p=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=p;c[n>>2]=0;r=0;break}p=o+32|0;q=o;while(1){if((a[q>>0]|0)==b<<24>>24){s=q;break}q=q+1|0;if((q|0)==(p|0)){s=p;break}}p=s-o|0;if((p|0)>31)r=-1;else{q=a[12194+p>>0]|0;switch(p|0){case 24:case 25:{t=c[h>>2]|0;if((t|0)!=(g|0)?(d[t+-1>>0]&95|0)!=(d[f>>0]&127|0):0){r=-1;break a}c[h>>2]=t+1;a[t>>0]=q;r=0;break a;break}case 23:case 22:{a[f>>0]=80;t=c[h>>2]|0;c[h>>2]=t+1;a[t>>0]=q;r=0;break a;break}default:{t=q&95;if((((t|0)==(a[f>>0]|0)?(a[f>>0]=t|128,(a[e>>0]|0)!=0):0)?(a[e>>0]=0,t=a[k>>0]|0,(((t&1)==0?(t&255)>>>1:c[k+4>>2]|0)|0)!=0):0)?(t=c[m>>2]|0,(t-l|0)<160):0){u=c[n>>2]|0;c[m>>2]=t+4;c[t>>2]=u}u=c[h>>2]|0;c[h>>2]=u+1;a[u>>0]=q;if((p|0)>21){r=0;break a}c[n>>2]=(c[n>>2]|0)+1;r=0;break a}}}}while(0);return r|0}function vd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;e=d+16|0;f=(c[e>>2]|0)-(c[d+12>>2]|0)>>2;g=f*28|0;h=g+28|0;i=d+4|0;j=c[i>>2]|0;k=c[d>>2]|0;l=k;m=j-l|0;n=h-m|0;if((n|0)>0){o=d+8|0;if(((c[o>>2]|0)-l|0)>>>0<h>>>0){l=nh(k,h)|0;c[d>>2]=l;p=l+m|0;c[i>>2]=p;c[o>>2]=l+h;q=p}else q=j;j=q+n|0;if((h|0)!=(m|0)){m=q;do{a[m>>0]=0;m=(c[i>>2]|0)+1|0;c[i>>2]=m}while((m|0)!=(j|0))}}else c[i>>2]=k+h;h=$d(d,g)|0;c[h>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;c[h+12>>2]=0;c[h+16>>2]=0;c[h+20>>2]=0;c[h+20>>2]=-1;c[h+24>>2]=0;h=d+40|0;g=c[h>>2]|0;if((c[d+36>>2]|0)==(g|0)){k=d+24|0;i=d+28|0;j=c[i>>2]|0;m=c[k>>2]|0;q=j-m|0;n=q>>3;p=d+32|0;if((j|0)==(c[p>>2]|0)){l=n+1|0;o=~~+ba(+(+(n>>>0)*1.5))>>>0;r=(o>>>0<l>>>0?l:o)<<3;o=nh(m,r)|0;c[k>>2]=o;k=o+q|0;c[i>>2]=k;c[p>>2]=o+r;s=k}else s=j;j=s;c[j>>2]=0;c[j+4>>2]=f;c[i>>2]=(c[i>>2]|0)+8;t=n;u=0}else{n=g+-4|0;g=c[n>>2]|0;c[h>>2]=n;n=d+24|0;h=c[(Zd(n,g)|0)>>2]|0;i=Zd(n,g)|0;c[i>>2]=h;c[i+4>>2]=f;t=g;u=h}h=d+12|0;g=c[e>>2]|0;f=d+20|0;if((g|0)!=(c[f>>2]|0)){v=g;c[v>>2]=t;w=v+4|0;c[e>>2]=w;c[b>>2]=u;x=b+4|0;c[x>>2]=t;return}d=c[h>>2]|0;i=g-d|0;g=i>>2;n=g+1|0;j=~~+ba(+(+(g>>>0)*1.5))>>>0;g=(j>>>0<n>>>0?n:j)<<2;j=nh(d,g)|0;c[h>>2]=j;h=j+i|0;c[e>>2]=h;c[f>>2]=j+g;v=h;c[v>>2]=t;w=v+4|0;c[e>>2]=w;c[b>>2]=u;x=b+4|0;c[x>>2]=t;return}function md(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+1008|0;k=b+8|0;l=b;m=b+896|0;n=b+888|0;o=b+488|0;p=b+480|0;q=b+892|0;r=b+72|0;s=b+68|0;t=b+56|0;u=b+44|0;v=b+32|0;w=b+28|0;x=b+80|0;y=b+24|0;z=b+20|0;A=b+16|0;c[n>>2]=m;h[k>>3]=j;B=wj(m,100,13677,k)|0;if(B>>>0>99){m=jk()|0;h[l>>3]=j;C=vi(n,m,13677,l)|0;l=c[n>>2]|0;if(!l)Zl();m=fc(C<<2)|0;if(!m)Zl();else{D=m;E=l;F=m;G=C}}else{D=0;E=0;F=o;G=B}B=fk(f)|0;c[p>>2]=B;o=bk(p,5920)|0;C=c[n>>2]|0;$b[c[(c[o>>2]|0)+48>>2]&7](o,C,C+G|0,F)|0;if(!G)H=0;else H=(a[c[n>>2]>>0]|0)==45;c[t>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;c[u>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;uc(e,H,p,q,r,s,t,u,v,w);e=c[w>>2]|0;if((G|0)>(e|0)){w=a[v>>0]|0;n=a[u>>0]|0;I=(G-e<<1|1)+e+((w&1)==0?(w&255)>>>1:c[v+4>>2]|0)+((n&1)==0?(n&255)>>>1:c[u+4>>2]|0)|0}else{n=a[v>>0]|0;w=a[u>>0]|0;I=e+2+((n&1)==0?(n&255)>>>1:c[v+4>>2]|0)+((w&1)==0?(w&255)>>>1:c[u+4>>2]|0)|0}if(I>>>0>100){w=fc(I<<2)|0;if(!w)Zl();else{J=w;K=w}}else{J=0;K=x}vc(K,y,z,c[f+4>>2]|0,F,F+(G<<2)|0,o,H,q,c[r>>2]|0,c[s>>2]|0,t,u,v,e);c[A>>2]=c[d>>2];d=c[y>>2]|0;y=c[z>>2]|0;c[k>>2]=c[A>>2];A=ke(k,K,d,y,f,g)|0;if(!J)L=B;else{kc(J);L=c[p>>2]|0}tl(v);tl(u);ul(t);_i(L)|0;if(D)kc(D);if(E)kc(E);i=b;return A|0}function ud(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;a=c[b>>2]|0;do if(a){g=c[a+12>>2]|0;if((g|0)==(c[a+16>>2]|0))h=Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0;else h=c[g>>2]|0;if((h|0)==-1){c[b>>2]=0;i=1;break}else{i=(c[b>>2]|0)==0;break}}else i=1;while(0);h=c[d>>2]|0;do if(h){a=c[h+12>>2]|0;if((a|0)==(c[h+16>>2]|0))j=Wb[c[(c[h>>2]|0)+36>>2]&63](h)|0;else j=c[a>>2]|0;if((j|0)!=-1)if(i){k=h;l=17;break}else{l=16;break}else{c[d>>2]=0;l=14;break}}else l=14;while(0);if((l|0)==14)if(i)l=16;else{k=0;l=17}a:do if((l|0)==16)c[e>>2]=c[e>>2]|6;else if((l|0)==17){i=c[b>>2]|0;h=c[i+12>>2]|0;if((h|0)==(c[i+16>>2]|0))m=Wb[c[(c[i>>2]|0)+36>>2]&63](i)|0;else m=c[h>>2]|0;if((Pb[c[(c[f>>2]|0)+52>>2]&31](f,m,0)|0)<<24>>24!=37){c[e>>2]=c[e>>2]|4;break}h=c[b>>2]|0;i=h+12|0;j=c[i>>2]|0;if((j|0)==(c[h+16>>2]|0)){Wb[c[(c[h>>2]|0)+40>>2]&63](h)|0;a=c[b>>2]|0;if(!a)n=1;else{o=a;l=25}}else{c[i>>2]=j+4;o=h;l=25}do if((l|0)==25){h=c[o+12>>2]|0;if((h|0)==(c[o+16>>2]|0))p=Wb[c[(c[o>>2]|0)+36>>2]&63](o)|0;else p=c[h>>2]|0;if((p|0)==-1){c[b>>2]=0;n=1;break}else{n=(c[b>>2]|0)==0;break}}while(0);do if(k){h=c[k+12>>2]|0;if((h|0)==(c[k+16>>2]|0))q=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else q=c[h>>2]|0;if((q|0)!=-1)if(n)break a;else break;else{c[d>>2]=0;l=37;break}}else l=37;while(0);if((l|0)==37?!n:0)break;c[e>>2]=c[e>>2]|2}while(0);return}function od(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+384|0;k=b+8|0;l=b;m=b+284|0;n=b+72|0;o=b+184|0;p=b+68|0;q=b+80|0;r=b+77|0;s=b+76|0;t=b+56|0;u=b+44|0;v=b+32|0;w=b+28|0;x=b+84|0;y=b+24|0;z=b+20|0;A=b+16|0;c[n>>2]=m;h[k>>3]=j;B=wj(m,100,13677,k)|0;if(B>>>0>99){m=jk()|0;h[l>>3]=j;C=vi(n,m,13677,l)|0;l=c[n>>2]|0;if(!l)Zl();m=fc(C)|0;if(!m)Zl();else{D=m;E=l;F=m;G=C}}else{D=0;E=0;F=o;G=B}B=fk(f)|0;c[p>>2]=B;o=bk(p,5928)|0;C=c[n>>2]|0;$b[c[(c[o>>2]|0)+32>>2]&7](o,C,C+G|0,F)|0;if(!G)H=0;else H=(a[c[n>>2]>>0]|0)==45;c[t>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;c[u>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;sc(e,H,p,q,r,s,t,u,v,w);e=c[w>>2]|0;if((G|0)>(e|0)){w=a[v>>0]|0;n=a[u>>0]|0;I=(G-e<<1|1)+e+((w&1)==0?(w&255)>>>1:c[v+4>>2]|0)+((n&1)==0?(n&255)>>>1:c[u+4>>2]|0)|0}else{n=a[v>>0]|0;w=a[u>>0]|0;I=e+2+((n&1)==0?(n&255)>>>1:c[v+4>>2]|0)+((w&1)==0?(w&255)>>>1:c[u+4>>2]|0)|0}if(I>>>0>100){w=fc(I)|0;if(!w)Zl();else{J=w;K=w}}else{J=0;K=x}tc(K,y,z,c[f+4>>2]|0,F,F+G|0,o,H,q,a[r>>0]|0,a[s>>0]|0,t,u,v,e);c[A>>2]=c[d>>2];d=c[y>>2]|0;y=c[z>>2]|0;c[k>>2]=c[A>>2];A=pe(k,K,d,y,f,g)|0;if(!J)L=B;else{kc(J);L=c[p>>2]|0}ul(v);ul(u);ul(t);_i(L)|0;if(D)kc(D);if(E)kc(E);i=b;return A|0}function Cd(b,e,f,g,h,i,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0;a:do if((b|0)==(i|0))if(a[e>>0]|0){a[e>>0]=0;p=c[h>>2]|0;c[h>>2]=p+1;a[p>>0]=46;p=a[k>>0]|0;if((((p&1)==0?(p&255)>>>1:c[k+4>>2]|0)|0)!=0?(p=c[m>>2]|0,(p-l|0)<160):0){q=c[n>>2]|0;c[m>>2]=p+4;c[p>>2]=q;r=0}else r=0}else r=-1;else{if((b|0)==(j|0)?(q=a[k>>0]|0,(((q&1)==0?(q&255)>>>1:c[k+4>>2]|0)|0)!=0):0){if(!(a[e>>0]|0)){r=-1;break}q=c[m>>2]|0;if((q-l|0)>=160){r=0;break}p=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=p;c[n>>2]=0;r=0;break}p=o+128|0;q=o;while(1){if((c[q>>2]|0)==(b|0)){s=q;break}q=q+4|0;if((q|0)==(p|0)){s=p;break}}p=s-o|0;q=p>>2;if((p|0)<=124){t=a[12194+q>>0]|0;switch(q|0){case 24:case 25:{q=c[h>>2]|0;if((q|0)!=(g|0)?(d[q+-1>>0]&95|0)!=(d[f>>0]&127|0):0){r=-1;break a}c[h>>2]=q+1;a[q>>0]=t;r=0;break a;break}case 23:case 22:{a[f>>0]=80;break}default:{q=t&95;if((((q|0)==(a[f>>0]|0)?(a[f>>0]=q|128,(a[e>>0]|0)!=0):0)?(a[e>>0]=0,q=a[k>>0]|0,(((q&1)==0?(q&255)>>>1:c[k+4>>2]|0)|0)!=0):0)?(q=c[m>>2]|0,(q-l|0)<160):0){u=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=u}}}u=c[h>>2]|0;c[h>>2]=u+1;a[u>>0]=t;if((p|0)>84)r=0;else{c[n>>2]=(c[n>>2]|0)+1;r=0}}else r=-1}while(0);return r|0}function wd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a:while(1){a=c[b>>2]|0;do if(a){g=c[a+12>>2]|0;if((g|0)==(c[a+16>>2]|0))h=Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0;else h=c[g>>2]|0;if((h|0)==-1){c[b>>2]=0;i=1;break}else{i=(c[b>>2]|0)==0;break}}else i=1;while(0);a=c[d>>2]|0;do if(a){g=c[a+12>>2]|0;if((g|0)==(c[a+16>>2]|0))j=Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0;else j=c[g>>2]|0;if((j|0)!=-1)if(i){k=a;break}else{l=a;break a}else{c[d>>2]=0;m=15;break}}else m=15;while(0);if((m|0)==15){m=0;if(i){l=0;break}else k=0}a=c[b>>2]|0;g=c[a+12>>2]|0;if((g|0)==(c[a+16>>2]|0))n=Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0;else n=c[g>>2]|0;if(!(Pb[c[(c[f>>2]|0)+12>>2]&31](f,8192,n)|0)){l=k;break}g=c[b>>2]|0;a=g+12|0;o=c[a>>2]|0;if((o|0)==(c[g+16>>2]|0)){Wb[c[(c[g>>2]|0)+40>>2]&63](g)|0;continue}else{c[a>>2]=o+4;continue}}k=c[b>>2]|0;do if(k){n=c[k+12>>2]|0;if((n|0)==(c[k+16>>2]|0))p=Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0;else p=c[n>>2]|0;if((p|0)==-1){c[b>>2]=0;q=1;break}else{q=(c[b>>2]|0)==0;break}}else q=1;while(0);do if(l){b=c[l+12>>2]|0;if((b|0)==(c[l+16>>2]|0))r=Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0;else r=c[b>>2]|0;if((r|0)!=-1)if(q)break;else{m=39;break}else{c[d>>2]=0;m=37;break}}else m=37;while(0);if((m|0)==37?q:0)m=39;if((m|0)==39)c[e>>2]=c[e>>2]|2;return}function Hd(b,d,e,f,g,h,i,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0;c[e>>2]=b;c[h>>2]=f;b=g;if(j&2)if((b-f|0)<3)k=1;else{c[h>>2]=f+1;a[f>>0]=-17;f=c[h>>2]|0;c[h>>2]=f+1;a[f>>0]=-69;f=c[h>>2]|0;c[h>>2]=f+1;a[f>>0]=-65;l=4}else l=4;a:do if((l|0)==4){f=c[e>>2]|0;if(f>>>0<d>>>0){j=f;while(1){f=c[j>>2]|0;if(f>>>0>i>>>0|(f&-2048|0)==55296){k=2;break a}do if(f>>>0>=128){if(f>>>0<2048){g=c[h>>2]|0;if((b-g|0)<2){k=1;break a}c[h>>2]=g+1;a[g>>0]=f>>>6|192;g=c[h>>2]|0;c[h>>2]=g+1;a[g>>0]=f&63|128;break}g=c[h>>2]|0;m=b-g|0;if(f>>>0<65536){if((m|0)<3){k=1;break a}c[h>>2]=g+1;a[g>>0]=f>>>12|224;n=c[h>>2]|0;c[h>>2]=n+1;a[n>>0]=f>>>6&63|128;n=c[h>>2]|0;c[h>>2]=n+1;a[n>>0]=f&63|128;break}else{if((m|0)<4){k=1;break a}c[h>>2]=g+1;a[g>>0]=f>>>18|240;g=c[h>>2]|0;c[h>>2]=g+1;a[g>>0]=f>>>12&63|128;g=c[h>>2]|0;c[h>>2]=g+1;a[g>>0]=f>>>6&63|128;g=c[h>>2]|0;c[h>>2]=g+1;a[g>>0]=f&63|128;break}}else{g=c[h>>2]|0;if((b-g|0)<1){k=1;break a}c[h>>2]=g+1;a[g>>0]=f}while(0);j=(c[e>>2]|0)+4|0;c[e>>2]=j;if(j>>>0>=d>>>0){k=0;break}}}else k=0}while(0);return k|0}function rd(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;b=i;i=i+176|0;j=b+56|0;k=b+52|0;l=b+64|0;m=b+61|0;n=b+60|0;o=b+40|0;p=b+28|0;q=b+16|0;r=b+12|0;s=b+68|0;t=b+8|0;u=b+4|0;v=b;w=fk(f)|0;c[k>>2]=w;x=bk(k,5928)|0;y=a[h>>0]|0;z=(y&1)==0;A=h+4|0;if(!((z?(y&255)>>>1:c[A>>2]|0)|0))B=0;else{y=a[(z?h+1|0:c[h+8>>2]|0)>>0]|0;B=y<<24>>24==(bc[c[(c[x>>2]|0)+28>>2]&15](x,45)|0)<<24>>24}c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[q>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;sc(e,B,k,l,m,n,o,p,q,r);e=a[h>>0]|0;y=c[A>>2]|0;A=(e&1)==0?(e&255)>>>1:y;z=c[r>>2]|0;if((A|0)>(z|0)){r=a[q>>0]|0;C=a[p>>0]|0;D=(A-z<<1|1)+z+((r&1)==0?(r&255)>>>1:c[q+4>>2]|0)+((C&1)==0?(C&255)>>>1:c[p+4>>2]|0)|0}else{C=a[q>>0]|0;r=a[p>>0]|0;D=z+2+((C&1)==0?(C&255)>>>1:c[q+4>>2]|0)+((r&1)==0?(r&255)>>>1:c[p+4>>2]|0)|0}if(D>>>0>100){r=fc(D)|0;if(!r)Zl();else{E=r;F=r}}else{E=0;F=s}s=(e&1)==0;r=s?h+1|0:c[h+8>>2]|0;tc(F,t,u,c[f+4>>2]|0,r,r+(s?(e&255)>>>1:y)|0,x,B,l,a[m>>0]|0,a[n>>0]|0,o,p,q,z);c[v>>2]=c[d>>2];d=c[t>>2]|0;t=c[u>>2]|0;c[j>>2]=c[v>>2];v=pe(j,F,d,t,f,g)|0;if(!E)G=w;else{kc(E);G=c[k>>2]|0}ul(q);ul(p);ul(o);_i(G)|0;i=b;return v|0}function qd(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;b=i;i=i+480|0;j=b+464|0;k=b+60|0;l=b+468|0;m=b+56|0;n=b+52|0;o=b+40|0;p=b+28|0;q=b+16|0;r=b+12|0;s=b+64|0;t=b+8|0;u=b+4|0;v=b;w=fk(f)|0;c[k>>2]=w;x=bk(k,5920)|0;y=a[h>>0]|0;z=(y&1)==0;A=h+4|0;if(!((z?(y&255)>>>1:c[A>>2]|0)|0))B=0;else{y=c[(z?A:c[h+8>>2]|0)>>2]|0;B=(y|0)==(bc[c[(c[x>>2]|0)+44>>2]&15](x,45)|0)}c[o>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;c[p>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[q>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;uc(e,B,k,l,m,n,o,p,q,r);e=a[h>>0]|0;y=c[A>>2]|0;z=(e&1)==0?(e&255)>>>1:y;C=c[r>>2]|0;if((z|0)>(C|0)){r=a[q>>0]|0;D=a[p>>0]|0;E=(z-C<<1|1)+C+((r&1)==0?(r&255)>>>1:c[q+4>>2]|0)+((D&1)==0?(D&255)>>>1:c[p+4>>2]|0)|0}else{D=a[q>>0]|0;r=a[p>>0]|0;E=C+2+((D&1)==0?(D&255)>>>1:c[q+4>>2]|0)+((r&1)==0?(r&255)>>>1:c[p+4>>2]|0)|0}if(E>>>0>100){r=fc(E<<2)|0;if(!r)Zl();else{F=r;G=r}}else{F=0;G=s}s=(e&1)==0;r=s?A:c[h+8>>2]|0;vc(G,t,u,c[f+4>>2]|0,r,r+((s?(e&255)>>>1:y)<<2)|0,x,B,l,c[m>>2]|0,c[n>>2]|0,o,p,q,C);c[v>>2]=c[d>>2];d=c[t>>2]|0;t=c[u>>2]|0;c[j>>2]=c[v>>2];v=ke(j,G,d,t,f,g)|0;if(!F)H=w;else{kc(F);H=c[k>>2]|0}tl(q);tl(p);ul(o);_i(H)|0;i=b;return v|0}function Ad(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;a=h+8|0;a:while(1){h=c[e>>2]|0;do if(h)if((c[h+12>>2]|0)==(c[h+16>>2]|0))if((Wb[c[(c[h>>2]|0)+36>>2]&63](h)|0)==-1){c[e>>2]=0;i=0;break}else{i=c[e>>2]|0;break}else i=h;else i=0;while(0);h=(i|0)==0;j=c[f>>2]|0;do if(j){if((c[j+12>>2]|0)!=(c[j+16>>2]|0))if(h){k=j;break}else{l=j;break a}if((Wb[c[(c[j>>2]|0)+36>>2]&63](j)|0)!=-1)if(h){k=j;break}else{l=j;break a}else{c[f>>2]=0;m=12;break}}else m=12;while(0);if((m|0)==12){m=0;if(h){l=0;break}else k=0}j=c[e>>2]|0;n=c[j+12>>2]|0;if((n|0)==(c[j+16>>2]|0))o=Wb[c[(c[j>>2]|0)+36>>2]&63](j)|0;else o=d[n>>0]|0;if((o&255)<<24>>24<=-1){l=k;break}if(!(b[(c[a>>2]|0)+(o<<24>>24<<1)>>1]&8192)){l=k;break}n=c[e>>2]|0;j=n+12|0;p=c[j>>2]|0;if((p|0)==(c[n+16>>2]|0)){Wb[c[(c[n>>2]|0)+40>>2]&63](n)|0;continue}else{c[j>>2]=p+1;continue}}k=c[e>>2]|0;do if(k)if((c[k+12>>2]|0)==(c[k+16>>2]|0))if((Wb[c[(c[k>>2]|0)+36>>2]&63](k)|0)==-1){c[e>>2]=0;q=0;break}else{q=c[e>>2]|0;break}else q=k;else q=0;while(0);k=(q|0)==0;do if(l){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1:0){c[f>>2]=0;m=32;break}if(!k)m=33}else m=32;while(0);if((m|0)==32?k:0)m=33;if((m|0)==33)c[g>>2]=c[g>>2]|2;return}function Md(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;g=i;i=i+1040|0;h=g+8|0;j=g;k=c[b>>2]|0;c[j>>2]=k;l=(a|0)!=0;m=l?e:256;e=l?a:h;a=k;a:do if((m|0)!=0&(k|0)!=0){n=d;o=m;p=a;q=0;r=e;while(1){s=n>>>2;t=s>>>0>=o>>>0;if(!(n>>>0>131|t)){u=n;v=o;w=p;x=q;y=r;break a}z=t?o:s;s=n-z|0;t=yc(r,j,z,f)|0;if((t|0)==-1){A=s;B=r;break}z=(r|0)==(h|0);C=z?0:t;D=o-C|0;E=z?r:r+(t<<2)|0;z=t+q|0;t=c[j>>2]|0;if((o|0)!=(C|0)&(t|0)!=0){n=s;o=D;p=t;q=z;r=E}else{u=s;v=D;w=t;x=z;y=E;break a}}u=A;v=0;w=c[j>>2]|0;x=-1;y=B}else{u=d;v=m;w=a;x=0;y=e}while(0);b:do if((w|0)!=0?(v|0)!=0&(u|0)!=0:0){e=u;a=v;m=w;d=x;B=y;while(1){A=Td(B,m,e,f)|0;if((A+2|0)>>>0<3){F=A;G=d;break}m=(c[j>>2]|0)+A|0;c[j>>2]=m;a=a+-1|0;h=d+1|0;if(!((a|0)!=0&(e|0)!=(A|0))){H=h;break b}else{e=e-A|0;d=h;B=B+4|0}}switch(F|0){case -1:{H=-1;break b;break}case 0:{c[j>>2]=0;H=G;break b;break}default:{c[f>>2]=0;H=G;break b}}}else H=x;while(0);if(!l){i=g;return H|0}c[b>>2]=c[j>>2];i=g;return H|0}function sd(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;b=i;i=i+432|0;k=b+424|0;l=b+24|0;m=b+16|0;n=b+8|0;o=b+4|0;p=b+428|0;q=b;c[m>>2]=l;r=m+4|0;c[r>>2]=100;s=fk(g)|0;c[o>>2]=s;t=bk(o,5920)|0;a[p>>0]=0;u=c[e>>2]|0;c[q>>2]=u;v=c[g+4>>2]|0;c[k>>2]=c[q>>2];q=u;if(hc(d,k,f,o,v,h,p,t,m,n,l+400|0)|0){if(!(a[j>>0]&1))a[j>>0]=0;else c[c[j+8>>2]>>2]=0;c[j+4>>2]=0;if(a[p>>0]|0)xf(j,bc[c[(c[t>>2]|0)+44>>2]&15](t,45)|0);p=bc[c[(c[t>>2]|0)+44>>2]&15](t,48)|0;t=c[m>>2]|0;l=c[n>>2]|0;n=l+-4|0;a:do if(t>>>0<n>>>0){v=t;while(1){if((c[v>>2]|0)!=(p|0)){w=v;break a}o=v+4|0;if(o>>>0<n>>>0)v=o;else{w=o;break}}}else w=t;while(0);Le(j,w,l)|0}l=c[d>>2]|0;do if(l){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0))x=Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0;else x=c[w>>2]|0;if((x|0)==-1){c[d>>2]=0;y=1;break}else{y=(c[d>>2]|0)==0;break}}else y=1;while(0);do if(u){x=c[q+12>>2]|0;if((x|0)==(c[q+16>>2]|0))z=Wb[c[(c[u>>2]|0)+36>>2]&63](q)|0;else z=c[x>>2]|0;if((z|0)!=-1)if(y)break;else{A=26;break}else{c[e>>2]=0;A=24;break}}else A=24;while(0);if((A|0)==24?y:0)A=26;if((A|0)==26)c[h>>2]=c[h>>2]|2;h=c[d>>2]|0;_i(s)|0;s=c[m>>2]|0;c[m>>2]=0;if(s)Sb[c[r>>2]&127](s);i=b;return h|0}function Bd(a,b,e,f,g){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;a=c[b>>2]|0;do if(a)if((c[a+12>>2]|0)==(c[a+16>>2]|0))if((Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0)==-1){c[b>>2]=0;h=0;break}else{h=c[b>>2]|0;break}else h=a;else h=0;while(0);a=(h|0)==0;h=c[e>>2]|0;do if(h){if((c[h+12>>2]|0)==(c[h+16>>2]|0)?(Wb[c[(c[h>>2]|0)+36>>2]&63](h)|0)==-1:0){c[e>>2]=0;i=11;break}if(a){j=h;i=13}else i=12}else i=11;while(0);if((i|0)==11)if(a)i=12;else{j=0;i=13}a:do if((i|0)==12)c[f>>2]=c[f>>2]|6;else if((i|0)==13){a=c[b>>2]|0;h=c[a+12>>2]|0;if((h|0)==(c[a+16>>2]|0))k=Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0;else k=d[h>>0]|0;if((Pb[c[(c[g>>2]|0)+36>>2]&31](g,k&255,0)|0)<<24>>24!=37){c[f>>2]=c[f>>2]|4;break}h=c[b>>2]|0;a=h+12|0;l=c[a>>2]|0;if((l|0)==(c[h+16>>2]|0)){Wb[c[(c[h>>2]|0)+40>>2]&63](h)|0;m=c[b>>2]|0;if(!m)n=0;else{o=m;i=21}}else{c[a>>2]=l+1;o=h;i=21}do if((i|0)==21)if((c[o+12>>2]|0)==(c[o+16>>2]|0))if((Wb[c[(c[o>>2]|0)+36>>2]&63](o)|0)==-1){c[b>>2]=0;n=0;break}else{n=c[b>>2]|0;break}else n=o;while(0);h=(n|0)==0;do if(j){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(Wb[c[(c[j>>2]|0)+36>>2]&63](j)|0)==-1:0){c[e>>2]=0;i=30;break}if(h)break a}else i=30;while(0);if((i|0)==30?!h:0)break;c[f>>2]=c[f>>2]|2}while(0);return}function Kd(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;f=i;i=i+32|0;g=f+16|0;h=f+8|0;j=f+4|0;k=f;l=b+52|0;a:do if(a[l>>0]|0){m=b+48|0;n=c[m>>2]|0;if(e){c[m>>2]=-1;a[l>>0]=0;o=n}else o=n}else{n=c[b+44>>2]|0;m=(n|0)>1?n:1;n=b+32|0;if((m|0)>0){p=0;do{q=pb(c[n>>2]|0)|0;if((q|0)==-1){o=-1;break a}a[g+p>>0]=q;p=p+1|0}while((p|0)<(m|0))}b:do if(!(a[b+53>>0]|0)){p=b+40|0;q=b+36|0;r=h+1|0;s=m;c:while(1){t=c[p>>2]|0;u=t;v=c[u>>2]|0;w=c[u+4>>2]|0;u=c[q>>2]|0;x=g+s|0;switch(_b[c[(c[u>>2]|0)+16>>2]&15](u,t,g,x,j,h,r,k)|0){case 2:{o=-1;break a;break}case 3:{y=s;break c;break}case 1:break;default:{z=s;break b}}t=c[p>>2]|0;c[t>>2]=v;c[t+4>>2]=w;if((s|0)==8){o=-1;break a}w=pb(c[n>>2]|0)|0;if((w|0)==-1){o=-1;break a}a[x>>0]=w;s=s+1|0}a[h>>0]=a[g>>0]|0;z=y}else{a[h>>0]=a[g>>0]|0;z=m}while(0);if(e){m=a[h>>0]|0;c[b+48>>2]=m&255;A=m}else{m=z;while(1){if((m|0)<=0)break;m=m+-1|0;if((Ka(d[g+m>>0]|0,c[n>>2]|0)|0)==-1){o=-1;break a}}A=a[h>>0]|0}o=A&255}while(0);i=f;return o|0}function td(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;b=i;i=i+144|0;k=b+24|0;l=b+32|0;m=b+16|0;n=b+8|0;o=b+4|0;p=b+28|0;q=b;c[m>>2]=l;r=m+4|0;c[r>>2]=100;s=fk(g)|0;c[o>>2]=s;t=bk(o,5928)|0;a[p>>0]=0;u=c[e>>2]|0;c[q>>2]=u;v=c[g+4>>2]|0;c[k>>2]=c[q>>2];q=u;if(ic(d,k,f,o,v,h,p,t,m,n,l+100|0)|0){if(!(a[j>>0]&1)){a[j+1>>0]=0;a[j>>0]=0}else{a[c[j+8>>2]>>0]=0;c[j+4>>2]=0}if(a[p>>0]|0)zf(j,bc[c[(c[t>>2]|0)+28>>2]&15](t,45)|0);p=bc[c[(c[t>>2]|0)+28>>2]&15](t,48)|0;t=c[m>>2]|0;l=c[n>>2]|0;n=l+-1|0;a:do if(t>>>0<n>>>0){v=t;while(1){if((a[v>>0]|0)!=p<<24>>24){w=v;break a}o=v+1|0;if(o>>>0<n>>>0)v=o;else{w=o;break}}}else w=t;while(0);Ne(j,w,l)|0}l=c[d>>2]|0;do if(l)if((c[l+12>>2]|0)==(c[l+16>>2]|0))if((Wb[c[(c[l>>2]|0)+36>>2]&63](l)|0)==-1){c[d>>2]=0;x=0;break}else{x=c[d>>2]|0;break}else x=l;else x=0;while(0);l=(x|0)==0;do if(u){if((c[q+12>>2]|0)==(c[q+16>>2]|0)?(Wb[c[(c[u>>2]|0)+36>>2]&63](q)|0)==-1:0){c[e>>2]=0;y=21;break}if(!l)y=22}else y=21;while(0);if((y|0)==21?l:0)y=22;if((y|0)==22)c[h>>2]=c[h>>2]|2;h=c[d>>2]|0;_i(s)|0;s=c[m>>2]|0;c[m>>2]=0;if(s)Sb[c[r>>2]&127](s);i=b;return h|0}function Ld(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=b+52|0;a:do if(a[k>>0]|0){l=b+48|0;m=c[l>>2]|0;if(d){c[l>>2]=-1;a[k>>0]=0;n=m}else n=m}else{m=c[b+44>>2]|0;l=(m|0)>1?m:1;m=b+32|0;if((l|0)>0){o=0;do{p=pb(c[m>>2]|0)|0;if((p|0)==-1){n=-1;break a}a[f+o>>0]=p;o=o+1|0}while((o|0)<(l|0))}b:do if(!(a[b+53>>0]|0)){o=b+40|0;p=b+36|0;q=g+4|0;r=l;c:while(1){s=c[o>>2]|0;t=s;u=c[t>>2]|0;v=c[t+4>>2]|0;t=c[p>>2]|0;w=f+r|0;switch(_b[c[(c[t>>2]|0)+16>>2]&15](t,s,f,w,h,g,q,j)|0){case 2:{n=-1;break a;break}case 3:{x=r;break c;break}case 1:break;default:{y=r;break b}}s=c[o>>2]|0;c[s>>2]=u;c[s+4>>2]=v;if((r|0)==8){n=-1;break a}v=pb(c[m>>2]|0)|0;if((v|0)==-1){n=-1;break a}a[w>>0]=v;r=r+1|0}c[g>>2]=a[f>>0];y=x}else{c[g>>2]=a[f>>0];y=l}while(0);if(d){l=c[g>>2]|0;c[b+48>>2]=l;n=l;break}else z=y;while(1){if((z|0)<=0)break;z=z+-1|0;if((Ka(a[f+z>>0]|0,c[m>>2]|0)|0)==-1){n=-1;break a}}n=c[g>>2]|0}while(0);i=e;return n|0}function Qd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;f=i;i=i+272|0;g=f+8|0;h=f;j=c[b>>2]|0;c[h>>2]=j;k=(a|0)!=0;l=k?e:256;e=k?a:g;a=j;a:do if((l|0)!=0&(j|0)!=0){m=d;n=l;o=a;p=0;q=e;while(1){r=m>>>0>=n>>>0;if(!(r|m>>>0>32)){s=m;t=n;u=o;v=p;w=q;break a}x=r?n:m;r=m-x|0;y=yd(q,h,x,0)|0;if((y|0)==-1){z=r;A=q;break}x=(q|0)==(g|0);B=x?0:y;C=n-B|0;D=x?q:q+y|0;x=y+p|0;y=c[h>>2]|0;if((n|0)!=(B|0)&(y|0)!=0){m=r;n=C;o=y;p=x;q=D}else{s=r;t=C;u=y;v=x;w=D;break a}}s=z;t=0;u=c[h>>2]|0;v=-1;w=A}else{s=d;t=l;u=a;v=0;w=e}while(0);b:do if((u|0)!=0?(t|0)!=0&(s|0)!=0:0){e=s;a=t;l=u;d=v;A=w;while(1){z=Jf(A,c[l>>2]|0,0)|0;if((z+1|0)>>>0<2){E=z;F=d;break}l=(c[h>>2]|0)+4|0;c[h>>2]=l;e=e+-1|0;g=d+1|0;if(!((a|0)!=(z|0)&(e|0)!=0)){G=g;break b}else{a=a-z|0;d=g;A=A+z|0}}if(!E){c[h>>2]=0;G=F}else G=-1}else G=v;while(0);if(!k){i=f;return G|0}c[b>>2]=c[h>>2];i=f;return G|0}function Fd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;a=c[p>>2]|0;yh(3912,a,3968);c[808]=4660;c[810]=4680;c[809]=0;b=c[1162]|0;ki(3232+b|0,3912);c[3232+(b+72)>>2]=0;c[3232+(b+76)>>2]=-1;b=c[q>>2]|0;gh(4016,b,3976);c[830]=4740;c[831]=4760;d=c[1182]|0;ki(3320+d|0,4016);e=d+72|0;c[3320+e>>2]=0;f=d+76|0;c[3320+f>>2]=-1;g=c[o>>2]|0;gh(4064,g,3984);c[851]=4740;c[852]=4760;ki(3404+d|0,4064);c[3404+e>>2]=0;c[3404+f>>2]=-1;h=c[3404+((c[(c[851]|0)+-12>>2]|0)+24)>>2]|0;c[872]=4740;c[873]=4760;ki(3488+d|0,h);c[3488+e>>2]=0;c[3488+f>>2]=-1;c[3232+((c[(c[808]|0)+-12>>2]|0)+72)>>2]=3320;f=3404+((c[(c[851]|0)+-12>>2]|0)+4)|0;c[f>>2]=c[f>>2]|8192;c[3404+((c[(c[851]|0)+-12>>2]|0)+72)>>2]=3320;xh(4112,a,3992);c[893]=4700;c[895]=4720;c[894]=0;a=c[1172]|0;ki(3572+a|0,4112);c[3572+(a+72)>>2]=0;c[3572+(a+76)>>2]=-1;fh(4168,b,4e3);c[915]=4780;c[916]=4800;b=c[1192]|0;ki(3660+b|0,4168);a=b+72|0;c[3660+a>>2]=0;f=b+76|0;c[3660+f>>2]=-1;fh(4216,g,4008);c[936]=4780;c[937]=4800;ki(3744+b|0,4216);c[3744+a>>2]=0;c[3744+f>>2]=-1;g=c[3744+((c[(c[936]|0)+-12>>2]|0)+24)>>2]|0;c[957]=4780;c[958]=4800;ki(3828+b|0,g);c[3828+a>>2]=0;c[3828+f>>2]=-1;c[3572+((c[(c[893]|0)+-12>>2]|0)+72)>>2]=3660;f=3744+((c[(c[936]|0)+-12>>2]|0)+4)|0;c[f>>2]=c[f>>2]|8192;c[3744+((c[(c[936]|0)+-12>>2]|0)+72)>>2]=3660;return}function Ud(b,d,e,f,g,h,i,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0;m=c[f>>2]|0;n=(m|0)==(e|0);do if(n){o=(a[l+24>>0]|0)==b<<24>>24;if(!o?(a[l+25>>0]|0)!=b<<24>>24:0){p=5;break}c[f>>2]=e+1;a[e>>0]=o?43:45;c[g>>2]=0;q=0}else p=5;while(0);a:do if((p|0)==5){o=a[i>>0]|0;if(b<<24>>24==h<<24>>24?(((o&1)==0?(o&255)>>>1:c[i+4>>2]|0)|0)!=0:0){o=c[k>>2]|0;if((o-j|0)>=160){q=0;break}r=c[g>>2]|0;c[k>>2]=o+4;c[o>>2]=r;c[g>>2]=0;q=0;break}r=l+26|0;o=l;while(1){if((a[o>>0]|0)==b<<24>>24){s=o;break}o=o+1|0;if((o|0)==(r|0)){s=r;break}}r=s-l|0;if((r|0)>23)q=-1;else{switch(d|0){case 10:case 8:{if((r|0)>=(d|0)){q=-1;break a}break}case 16:{if((r|0)>=22){if(n){q=-1;break a}if((m-e|0)>=3){q=-1;break a}if((a[m+-1>>0]|0)!=48){q=-1;break a}c[g>>2]=0;o=a[12194+r>>0]|0;c[f>>2]=m+1;a[m>>0]=o;q=0;break a}break}default:{}}o=a[12194+r>>0]|0;c[f>>2]=m+1;a[m>>0]=o;c[g>>2]=(c[g>>2]|0)+1;q=0}}while(0);return q|0}function Vd(b,d,e,f,g,h,i,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0;m=c[f>>2]|0;n=(m|0)==(e|0);do if(n){o=(c[l+96>>2]|0)==(b|0);if(!o?(c[l+100>>2]|0)!=(b|0):0){p=5;break}c[f>>2]=e+1;a[e>>0]=o?43:45;c[g>>2]=0;q=0}else p=5;while(0);a:do if((p|0)==5){o=a[i>>0]|0;if((b|0)==(h|0)?(((o&1)==0?(o&255)>>>1:c[i+4>>2]|0)|0)!=0:0){o=c[k>>2]|0;if((o-j|0)>=160){q=0;break}r=c[g>>2]|0;c[k>>2]=o+4;c[o>>2]=r;c[g>>2]=0;q=0;break}r=l+104|0;o=l;while(1){if((c[o>>2]|0)==(b|0)){s=o;break}o=o+4|0;if((o|0)==(r|0)){s=r;break}}r=s-l|0;o=r>>2;if((r|0)>92)q=-1;else{switch(d|0){case 10:case 8:{if((o|0)>=(d|0)){q=-1;break a}break}case 16:{if((r|0)>=88){if(n){q=-1;break a}if((m-e|0)>=3){q=-1;break a}if((a[m+-1>>0]|0)!=48){q=-1;break a}c[g>>2]=0;r=a[12194+o>>0]|0;c[f>>2]=m+1;a[m>>0]=r;q=0;break a}break}default:{}}r=a[12194+o>>0]|0;c[f>>2]=m+1;a[m>>0]=r;c[g>>2]=(c[g>>2]|0)+1;q=0}}while(0);return q|0}function Wd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;f=d&255;g=(e|0)!=0;a:do if(g&(b&3|0)!=0){h=d&255;i=e;j=b;while(1){if((a[j>>0]|0)==h<<24>>24){k=i;l=j;m=6;break a}n=j+1|0;o=i+-1|0;p=(o|0)!=0;if(p&(n&3|0)!=0){i=o;j=n}else{q=o;r=p;s=n;m=5;break}}}else{q=e;r=g;s=b;m=5}while(0);if((m|0)==5)if(r){k=q;l=s;m=6}else{t=0;u=s}b:do if((m|0)==6){s=d&255;if((a[l>>0]|0)==s<<24>>24){t=k;u=l}else{q=ca(f,16843009)|0;c:do if(k>>>0>3){r=k;b=l;while(1){g=c[b>>2]^q;if((g&-2139062144^-2139062144)&g+-16843009){v=r;w=b;break}g=b+4|0;e=r+-4|0;if(e>>>0>3){r=e;b=g}else{x=e;y=g;m=11;break c}}z=v;A=w}else{x=k;y=l;m=11}while(0);if((m|0)==11)if(!x){t=0;u=y;break}else{z=x;A=y}while(1){if((a[A>>0]|0)==s<<24>>24){t=z;u=A;break b}q=A+1|0;z=z+-1|0;if(!z){t=0;u=q;break}else A=q}}}while(0);return ((t|0)!=0?u:0)|0}function fd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;c[a+4>>2]=b+-1;c[a>>2]=5904;b=a+8|0;hi(b,28);Gh(a+144|0,13581,1);d=c[b>>2]|0;b=a+12|0;e=c[b>>2]|0;if((e|0)!=(d|0)){f=e;while(1){e=f+-4|0;if((e|0)==(d|0)){g=e;break}else f=e}c[b>>2]=g}c[329]=0;c[328]=4832;Ik(a,1312);c[331]=0;c[330]=4872;Hk(a,1320);Zi(1328,0,0,1);Kk(a,1328);c[337]=0;c[336]=6192;Jk(a,1344);c[339]=0;c[338]=6260;nk(a,1352);c[341]=0;c[340]=6012;c[342]=jk()|0;mk(a,1360);c[345]=0;c[344]=6308;kk(a,1376);c[347]=0;c[346]=6356;lk(a,1384);nj(1392,1);Ck(a,1392);mj(1416,1);Bk(a,1416);c[363]=0;c[362]=4912;Mj(a,1448);c[365]=0;c[364]=4984;Lj(a,1456);c[367]=0;c[366]=5056;Kj(a,1464);c[369]=0;c[368]=5116;Jj(a,1472);c[371]=0;c[370]=5424;sk(a,1480);c[373]=0;c[372]=5488;rk(a,1488);c[375]=0;c[374]=5552;qk(a,1496);c[377]=0;c[376]=5616;pk(a,1504);c[379]=0;c[378]=5680;Ej(a,1512);c[381]=0;c[380]=5716;Dj(a,1520);c[383]=0;c[382]=5752;Cj(a,1528);c[385]=0;c[384]=5788;Bj(a,1536);c[387]=0;c[386]=5176;c[388]=5224;Ij(a,1544);c[391]=0;c[390]=5268;c[392]=5316;Hj(a,1560);c[395]=0;c[394]=6172;c[396]=jk()|0;c[394]=5360;Gj(a,1576);c[399]=0;c[398]=6172;c[400]=jk()|0;c[398]=5392;Fj(a,1592);c[403]=0;c[402]=5824;Ek(a,1608);c[405]=0;c[404]=5864;Dk(a,1616);return}function Td(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;g=i;i=i+16|0;h=g;c[h>>2]=b;j=(f|0)==0?2428:f;f=c[j>>2]|0;a:do if(!d){if(!f){k=0;i=g;return k|0}}else{if(!b){c[h>>2]=h;l=h}else l=b;if(!e){k=-2;i=g;return k|0}do if(!f){m=a[d>>0]|0;n=m&255;if(m<<24>>24<=-1){o=n+-194|0;if(o>>>0>50)break a;p=c[2220+(o<<2)>>2]|0;o=e+-1|0;if(!o){q=p;break}else{r=o;s=p;t=d+1|0;u=11;break}}else{c[l>>2]=n;k=m<<24>>24!=0&1;i=g;return k|0}}else{r=e;s=f;t=d;u=11}while(0);b:do if((u|0)==11){m=a[t>>0]|0;n=(m&255)>>>3;if((n+-16|n+(s>>26))>>>0>7)break a;else{v=r;w=m;x=s;y=t}while(1){y=y+1|0;x=(w&255)+-128|x<<6;v=v+-1|0;if((x|0)>=0){z=x;A=v;break}if(!v){q=x;break b}w=a[y>>0]|0;if((w&-64)<<24>>24!=-128)break a}c[j>>2]=0;c[l>>2]=z;k=e-A|0;i=g;return k|0}while(0);c[j>>2]=q;k=-2;i=g;return k|0}while(0);c[j>>2]=0;c[(tb()|0)>>2]=84;k=-1;i=g;return k|0}function Pd(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;d=i;i=i+176|0;j=d+168|0;k=d+40|0;l=d+32|0;m=d+28|0;n=d+16|0;o=d+8|0;p=d;c[n>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;c[o+4>>2]=0;c[o>>2]=6404;q=a[h>>0]|0;r=(q&1)==0;s=h+4|0;t=r?s:c[h+8>>2]|0;h=r?(q&255)>>>1:c[s>>2]|0;s=t+(h<<2)|0;q=k+32|0;if((h|0)>0){h=t;do{c[m>>2]=h;t=_b[c[(c[o>>2]|0)+12>>2]&15](o,j,h,s,m,k,q,l)|0;if(k>>>0<(c[l>>2]|0)>>>0){r=k;do{zf(n,a[r>>0]|0);r=r+1|0}while(r>>>0<(c[l>>2]|0)>>>0)}h=c[m>>2]|0}while((t|0)!=2&h>>>0<s>>>0)}s=Za(((e|0)==-1?-1:e<<1)|0,f|0,g|0,((a[n>>0]&1)==0?n+1|0:c[n+8>>2]|0)|0)|0;c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[p+4>>2]=0;c[p>>2]=6452;g=Am(s|0)|0;f=s+g|0;e=f;h=k+128|0;if((g|0)>0){g=s;do{c[m>>2]=g;s=_b[c[(c[p>>2]|0)+16>>2]&15](p,j,g,(e-g|0)>32?g+32|0:f,m,k,h,l)|0;if(k>>>0<(c[l>>2]|0)>>>0){q=k;do{xf(b,c[q>>2]|0);q=q+4|0}while(q>>>0<(c[l>>2]|0)>>>0)}g=c[m>>2]|0}while((s|0)!=2&g>>>0<f>>>0)}ul(n);i=d;return}function Gd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;var g=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;a=i;i=i+352|0;g=a+304|0;j=a+48|0;k=a+32|0;l=a+24|0;m=a+8|0;n=a;o=a+308|0;p=a+72|0;q=a+76|0;r=a+68|0;s=a+64|0;t=a+60|0;u=a+56|0;v=n;c[v>>2]=37;c[v+4>>2]=0;v=ye(n+1|0,13595,c[d+4>>2]|0)|0;c[p>>2]=o;w=jk()|0;if(v){c[m>>2]=c[d+8>>2];h[m+8>>3]=f;x=ri(o,30,w,n,m)|0}else{h[l>>3]=f;x=ri(o,30,w,n,l)|0}if((x|0)>29){l=jk()|0;if(v){c[k>>2]=c[d+8>>2];h[k+8>>3]=f;y=vi(p,l,n,k)|0}else{h[j>>3]=f;y=vi(p,l,n,j)|0}j=c[p>>2]|0;if(!j)Zl();else{z=j;A=j;B=y}}else{z=c[p>>2]|0;A=0;B=x}x=z+B|0;p=Of(z,x,d)|0;if((z|0)!=(o|0)){y=fc(B<<3)|0;if(!y)Zl();else{C=z;D=y;E=y}}else{C=o;D=0;E=q}q=fk(d)|0;c[t>>2]=q;Bc(C,p,x,E,r,s,t);_i(q)|0;c[u>>2]=c[b>>2];q=c[r>>2]|0;r=c[s>>2]|0;c[g>>2]=c[u>>2];u=ke(g,E,q,r,d,e)|0;c[b>>2]=u;if(D)kc(D);kc(A);i=a;return u|0}function Id(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;var g=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;a=i;i=i+176|0;g=a+76|0;j=a+48|0;k=a+32|0;l=a+24|0;m=a+8|0;n=a;o=a+80|0;p=a+72|0;q=a+110|0;r=a+68|0;s=a+64|0;t=a+60|0;u=a+56|0;v=n;c[v>>2]=37;c[v+4>>2]=0;v=ye(n+1|0,13595,c[d+4>>2]|0)|0;c[p>>2]=o;w=jk()|0;if(v){c[m>>2]=c[d+8>>2];h[m+8>>3]=f;x=ri(o,30,w,n,m)|0}else{h[l>>3]=f;x=ri(o,30,w,n,l)|0}if((x|0)>29){l=jk()|0;if(v){c[k>>2]=c[d+8>>2];h[k+8>>3]=f;y=vi(p,l,n,k)|0}else{h[j>>3]=f;y=vi(p,l,n,j)|0}j=c[p>>2]|0;if(!j)Zl();else{z=j;A=j;B=y}}else{z=c[p>>2]|0;A=0;B=x}x=z+B|0;p=Of(z,x,d)|0;if((z|0)!=(o|0)){y=fc(B<<1)|0;if(!y)Zl();else{C=z;D=y;E=y}}else{C=o;D=0;E=q}q=fk(d)|0;c[t>>2]=q;Hc(C,p,x,E,r,s,t);_i(q)|0;c[u>>2]=c[b>>2];b=c[r>>2]|0;r=c[s>>2]|0;c[g>>2]=c[u>>2];u=pe(g,E,b,r,d,e)|0;kc(D);kc(A);i=a;return u|0}function ae(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;g=a[b>>0]|0;h=b+4|0;i=c[h>>2]|0;a:do if(((g&1)==0?(g&255)>>>1:i)|0){if((d|0)==(e|0)){j=g;k=i}else{l=e+-4|0;if(l>>>0>d>>>0){m=d;n=l;do{l=c[m>>2]|0;c[m>>2]=c[n>>2];c[n>>2]=l;m=m+4|0;n=n+-4|0}while(m>>>0<n>>>0)}j=a[b>>0]|0;k=c[h>>2]|0}n=(j&1)==0;m=n?b+1|0:c[b+8>>2]|0;l=e+-4|0;o=m+(n?(j&255)>>>1:k)|0;n=a[m>>0]|0;p=n<<24>>24<1|n<<24>>24==127;b:do if(l>>>0>d>>>0){q=n;r=m;s=d;t=p;while(1){if(!t?(q<<24>>24|0)!=(c[s>>2]|0):0)break;r=(o-r|0)>1?r+1|0:r;s=s+4|0;u=a[r>>0]|0;v=u<<24>>24<1|u<<24>>24==127;if(s>>>0>=l>>>0){w=u;x=v;break b}else{q=u;t=v}}c[f>>2]=4;break a}else{w=n;x=p}while(0);if(!x?((c[l>>2]|0)+-1|0)>>>0>=w<<24>>24>>>0:0)c[f>>2]=4}while(0);return}function Nd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;var g=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;a=i;i=i+336|0;g=a+296|0;j=a+32|0;k=a+24|0;l=a+8|0;m=a;n=a+300|0;o=a+64|0;p=a+68|0;q=a+60|0;r=a+56|0;s=a+52|0;t=a+48|0;u=m;c[u>>2]=37;c[u+4>>2]=0;u=ye(m+1|0,13594,c[d+4>>2]|0)|0;c[o>>2]=n;v=jk()|0;if(u){c[l>>2]=c[d+8>>2];h[l+8>>3]=f;w=ri(n,30,v,m,l)|0}else{h[k>>3]=f;w=ri(n,30,v,m,k)|0}if((w|0)>29){k=jk()|0;c[j>>2]=c[d+8>>2];h[j+8>>3]=f;v=vi(o,k,m,j)|0;j=c[o>>2]|0;if(!j)Zl();else{x=j;y=j;z=v}}else{x=c[o>>2]|0;y=0;z=w}w=x+z|0;o=Of(x,w,d)|0;if((x|0)!=(n|0)){v=fc(z<<3)|0;if(!v)Zl();else{A=x;B=v;C=v}}else{A=n;B=0;C=p}p=fk(d)|0;c[s>>2]=p;Bc(A,o,w,C,q,r,s);_i(p)|0;c[t>>2]=c[b>>2];p=c[q>>2]|0;q=c[r>>2]|0;c[g>>2]=c[t>>2];t=ke(g,C,p,q,d,e)|0;c[b>>2]=t;if(B)kc(B);kc(y);i=a;return t|0}function Yd(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0;h=i;i=i+32|0;j=h+20|0;k=h+16|0;l=h+12|0;m=h;if(!(c[e+4>>2]&1)){n=c[(c[b>>2]|0)+24>>2]|0;c[k>>2]=c[d>>2];c[j>>2]=c[k>>2];o=cc[n&31](b,j,e,f,g&1)|0}else{f=fk(e)|0;c[l>>2]=f;e=bk(l,6068)|0;_i(f)|0;f=c[e>>2]|0;if(g)Tb[c[f+24>>2]&63](m,e);else Tb[c[f+28>>2]&63](m,e);e=a[m>>0]|0;f=(e&1)==0;g=m+1|0;l=m+8|0;j=f?g:m+1|0;b=f?g:c[m+8>>2]|0;g=m+4|0;f=(e&1)==0;if((b|0)!=((f?j:c[l>>2]|0)+(f?(e&255)>>>1:c[g>>2]|0)|0)){e=b;do{b=a[e>>0]|0;f=c[d>>2]|0;do if(f){n=f+24|0;k=c[n>>2]|0;if((k|0)!=(c[f+28>>2]|0)){c[n>>2]=k+1;a[k>>0]=b;break}if((bc[c[(c[f>>2]|0)+52>>2]&15](f,b&255)|0)==-1)c[d>>2]=0}while(0);e=e+1|0;b=a[m>>0]|0;f=(b&1)==0}while((e|0)!=((f?j:c[l>>2]|0)+(f?(b&255)>>>1:c[g>>2]|0)|0))}g=c[d>>2]|0;ul(m);o=g}i=h;return o|0}function Xd(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;i=i+32|0;j=h+20|0;k=h+16|0;l=h+12|0;m=h;if(!(c[e+4>>2]&1)){n=c[(c[b>>2]|0)+24>>2]|0;c[k>>2]=c[d>>2];c[j>>2]=c[k>>2];o=cc[n&31](b,j,e,f,g&1)|0}else{f=fk(e)|0;c[l>>2]=f;e=bk(l,6076)|0;_i(f)|0;f=c[e>>2]|0;if(g)Tb[c[f+24>>2]&63](m,e);else Tb[c[f+28>>2]&63](m,e);e=a[m>>0]|0;f=(e&1)==0;g=m+4|0;l=m+8|0;j=f?g:m+4|0;b=f?g:c[m+8>>2]|0;g=(e&1)==0;if((b|0)!=((g?j:c[l>>2]|0)+((g?(e&255)>>>1:c[j>>2]|0)<<2)|0)){e=b;do{b=c[e>>2]|0;g=c[d>>2]|0;if(g){f=g+24|0;n=c[f>>2]|0;if((n|0)==(c[g+28>>2]|0))p=bc[c[(c[g>>2]|0)+52>>2]&15](g,b)|0;else{c[f>>2]=n+4;c[n>>2]=b;p=b}if((p|0)==-1)c[d>>2]=0}e=e+4|0;b=a[m>>0]|0;n=(b&1)==0}while((e|0)!=((n?j:c[l>>2]|0)+((n?(b&255)>>>1:c[j>>2]|0)<<2)|0))}j=c[d>>2]|0;tl(m);o=j}i=h;return o|0}function Od(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;var g=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;a=i;i=i+160|0;g=a+68|0;j=a+32|0;k=a+24|0;l=a+8|0;m=a;n=a+72|0;o=a+64|0;p=a+102|0;q=a+60|0;r=a+56|0;s=a+52|0;t=a+48|0;u=m;c[u>>2]=37;c[u+4>>2]=0;u=ye(m+1|0,13594,c[d+4>>2]|0)|0;c[o>>2]=n;v=jk()|0;if(u){c[l>>2]=c[d+8>>2];h[l+8>>3]=f;w=ri(n,30,v,m,l)|0}else{h[k>>3]=f;w=ri(n,30,v,m,k)|0}if((w|0)>29){k=jk()|0;c[j>>2]=c[d+8>>2];h[j+8>>3]=f;v=vi(o,k,m,j)|0;j=c[o>>2]|0;if(!j)Zl();else{x=j;y=j;z=v}}else{x=c[o>>2]|0;y=0;z=w}w=x+z|0;o=Of(x,w,d)|0;if((x|0)!=(n|0)){v=fc(z<<1)|0;if(!v)Zl();else{A=x;B=v;C=v}}else{A=n;B=0;C=p}p=fk(d)|0;c[s>>2]=p;Hc(A,o,w,C,q,r,s);_i(p)|0;c[t>>2]=c[b>>2];b=c[q>>2]|0;q=c[r>>2]|0;c[g>>2]=c[t>>2];t=pe(g,C,b,q,d,e)|0;kc(B);kc(y);i=a;return t|0}function Sd(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+64|0;k=j+56|0;l=j+48|0;m=j+52|0;n=j+44|0;o=j+40|0;p=j+36|0;q=j+32|0;r=j+8|0;s=j;a:do if(!(c[f+4>>2]&1)){c[m>>2]=-1;t=c[(c[b>>2]|0)+16>>2]|0;c[n>>2]=c[d>>2];c[o>>2]=c[e>>2];c[l>>2]=c[n>>2];c[k>>2]=c[o>>2];u=Ub[t&63](b,l,k,f,g,m)|0;c[d>>2]=u;switch(c[m>>2]|0){case 0:{a[h>>0]=0;v=u;break a;break}case 1:{a[h>>0]=1;v=u;break a;break}default:{a[h>>0]=1;c[g>>2]=4;v=u;break a}}}else{u=fk(f)|0;c[p>>2]=u;t=bk(p,5928)|0;_i(u)|0;u=fk(f)|0;c[q>>2]=u;w=bk(q,6068)|0;_i(u)|0;Tb[c[(c[w>>2]|0)+24>>2]&63](r,w);Tb[c[(c[w>>2]|0)+28>>2]&63](r+12|0,w);c[s>>2]=c[e>>2];c[k>>2]=c[s>>2];a[h>>0]=(Ac(d,k,r,r+24|0,t,g,1)|0)==(r|0)&1;t=c[d>>2]|0;ul(r+12|0);ul(r);v=t}while(0);i=j;return v|0}function Rd(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+64|0;k=j+56|0;l=j+48|0;m=j+52|0;n=j+44|0;o=j+40|0;p=j+36|0;q=j+32|0;r=j+8|0;s=j;a:do if(!(c[f+4>>2]&1)){c[m>>2]=-1;t=c[(c[b>>2]|0)+16>>2]|0;c[n>>2]=c[d>>2];c[o>>2]=c[e>>2];c[l>>2]=c[n>>2];c[k>>2]=c[o>>2];u=Ub[t&63](b,l,k,f,g,m)|0;c[d>>2]=u;switch(c[m>>2]|0){case 0:{a[h>>0]=0;v=u;break a;break}case 1:{a[h>>0]=1;v=u;break a;break}default:{a[h>>0]=1;c[g>>2]=4;v=u;break a}}}else{u=fk(f)|0;c[p>>2]=u;t=bk(p,5920)|0;_i(u)|0;u=fk(f)|0;c[q>>2]=u;w=bk(q,6076)|0;_i(u)|0;Tb[c[(c[w>>2]|0)+24>>2]&63](r,w);Tb[c[(c[w>>2]|0)+28>>2]&63](r+12|0,w);c[s>>2]=c[e>>2];c[k>>2]=c[s>>2];a[h>>0]=(wc(d,k,r,r+24|0,t,g,1)|0)==(r|0)&1;t=c[d>>2]|0;tl(r+12|0);tl(r);v=t}while(0);i=j;return v|0}function je(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0;a:do if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)==(e|0)?(h=d+28|0,(c[h>>2]|0)!=1):0)c[h>>2]=f}else{if((b|0)!=(c[d>>2]|0)){h=c[b+8>>2]|0;Qb[c[(c[h>>2]|0)+24>>2]&3](h,d,e,f,g);break}if((c[d+16>>2]|0)!=(e|0)?(h=d+20|0,(c[h>>2]|0)!=(e|0)):0){c[d+32>>2]=f;i=d+44|0;if((c[i>>2]|0)==4)break;j=d+52|0;a[j>>0]=0;k=d+53|0;a[k>>0]=0;l=c[b+8>>2]|0;ac[c[(c[l>>2]|0)+20>>2]&7](l,d,e,e,1,g);if(a[k>>0]|0){if(!(a[j>>0]|0)){m=1;n=13}}else{m=0;n=13}do if((n|0)==13){c[h>>2]=e;j=d+40|0;c[j>>2]=(c[j>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54>>0]=1;if(m)break}else n=16;if((n|0)==16?m:0)break;c[i>>2]=4;break a}while(0);c[i>>2]=3;break}if((f|0)==1)c[d+32>>2]=1}while(0);return}function ne(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=(d|0)==-1;a:do if(!k){a[g>>0]=d;if(a[b+44>>0]|0)if((Eb(g|0,1,1,c[b+32>>2]|0)|0)==1){l=11;break}else{m=-1;break}c[h>>2]=f;n=g+1|0;o=b+36|0;p=b+40|0;q=f+8|0;r=f;s=b+32|0;t=g;while(1){u=c[o>>2]|0;v=_b[c[(c[u>>2]|0)+12>>2]&15](u,c[p>>2]|0,t,n,j,f,q,h)|0;if((c[j>>2]|0)==(t|0)){m=-1;break a}if((v|0)==3){w=t;break}u=(v|0)==1;if(v>>>0>=2){m=-1;break a}v=(c[h>>2]|0)-r|0;if((Eb(f|0,1,v|0,c[s>>2]|0)|0)!=(v|0)){m=-1;break a}if(u)t=u?c[j>>2]|0:t;else{l=11;break a}}if((Eb(w|0,1,1,c[s>>2]|0)|0)!=1)m=-1;else l=11}else l=11;while(0);if((l|0)==11)m=k?0:d;i=e;return m|0}function me(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=(d|0)==-1;a:do if(!k){c[g>>2]=d;if(a[b+44>>0]|0)if((Eb(g|0,4,1,c[b+32>>2]|0)|0)==1){l=11;break}else{m=-1;break}c[h>>2]=f;n=g+4|0;o=b+36|0;p=b+40|0;q=f+8|0;r=f;s=b+32|0;t=g;while(1){u=c[o>>2]|0;v=_b[c[(c[u>>2]|0)+12>>2]&15](u,c[p>>2]|0,t,n,j,f,q,h)|0;if((c[j>>2]|0)==(t|0)){m=-1;break a}if((v|0)==3){w=t;break}u=(v|0)==1;if(v>>>0>=2){m=-1;break a}v=(c[h>>2]|0)-r|0;if((Eb(f|0,1,v|0,c[s>>2]|0)|0)!=(v|0)){m=-1;break a}if(u)t=u?c[j>>2]|0:t;else{l=11;break a}}if((Eb(w|0,1,1,c[s>>2]|0)|0)!=1)m=-1;else l=11}else l=11;while(0);if((l|0)==11)m=k?0:d;i=e;return m|0}function qe(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;h=i;i=i+64|0;j=h;k=c[d>>2]|0;l=d+(c[k+-8>>2]|0)|0;m=c[k+-4>>2]|0;c[j>>2]=f;c[j+4>>2]=d;c[j+8>>2]=e;c[j+12>>2]=g;g=j+16|0;e=j+20|0;d=j+24|0;k=j+28|0;n=j+32|0;o=j+40|0;p=(m|0)==(f|0);q=g;r=q+36|0;do{c[q>>2]=0;q=q+4|0}while((q|0)<(r|0));b[g+36>>1]=0;a[g+38>>0]=0;a:do if(p){c[j+48>>2]=1;ac[c[(c[f>>2]|0)+20>>2]&7](f,j,l,l,1,0);s=(c[d>>2]|0)==1?l:0}else{Qb[c[(c[m>>2]|0)+24>>2]&3](m,j,l,1,0);switch(c[j+36>>2]|0){case 0:{s=(c[o>>2]|0)==1&(c[k>>2]|0)==1&(c[n>>2]|0)==1?c[e>>2]|0:0;break a;break}case 1:break;default:{s=0;break a}}if((c[d>>2]|0)!=1?!((c[o>>2]|0)==0&(c[k>>2]|0)==1&(c[n>>2]|0)==1):0){s=0;break}s=c[g>>2]|0}while(0);i=h;return s|0}function ve(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;c[h>>2]=b;if(!e){j=0;i=g;return j|0}do if(f){if(!b){c[h>>2]=h;k=h}else k=b;l=a[e>>0]|0;m=l&255;if(l<<24>>24>-1){c[k>>2]=m;j=l<<24>>24!=0&1;i=g;return j|0}l=m+-194|0;if(l>>>0<=50){m=e+1|0;n=c[2220+(l<<2)>>2]|0;if(f>>>0<4?(n&-2147483648>>>((f*6|0)+-6|0)|0)!=0:0)break;l=d[m>>0]|0;m=l>>>3;if((m+-16|m+(n>>26))>>>0<=7){m=l+-128|n<<6;if((m|0)>=0){c[k>>2]=m;j=2;i=g;return j|0}n=d[e+2>>0]|0;if((n&192|0)==128){l=n+-128|m<<6;if((l|0)>=0){c[k>>2]=l;j=3;i=g;return j|0}m=d[e+3>>0]|0;if((m&192|0)==128){c[k>>2]=m+-128|l<<6;j=4;i=g;return j|0}}}}}while(0);c[(tb()|0)>>2]=84;j=-1;i=g;return j|0}function ye(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0;if(!(d&2048))e=b;else{a[b>>0]=43;e=b+1|0}if(!(d&1024))f=e;else{a[e>>0]=35;f=e+1|0}e=d&260;b=d>>>14;d=(e|0)==260;if(d){g=f;h=0}else{a[f>>0]=46;a[f+1>>0]=42;g=f+2|0;h=1}f=a[c>>0]|0;if(!(f<<24>>24))i=g;else{j=c;c=g;g=f;while(1){j=j+1|0;f=c+1|0;a[c>>0]=g;g=a[j>>0]|0;if(!(g<<24>>24)){i=f;break}else c=f}}a:do switch(e|0){case 4:{if(!(b&1)){a[i>>0]=102;break a}else{a[i>>0]=70;break a}break}case 256:{if(!(b&1)){a[i>>0]=101;break a}else{a[i>>0]=69;break a}break}default:{c=(b&1|0)!=0;if(d)if(c){a[i>>0]=65;break a}else{a[i>>0]=97;break a}else if(c){a[i>>0]=71;break a}else{a[i>>0]=103;break a}}}while(0);return h|0}function Jd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;d=i;i=i+16|0;e=d;f=c[b+4>>2]|0;g=a+24|0;if(f>>>0<(c[a+28>>2]|0)-(c[g>>2]|0)>>3>>>0?(c[(Zd(g,f)|0)+4>>2]|0)!=-1:0){h=b+4|0;j=c[h>>2]|0;k=Zd(g,j)|0;l=k+4|0;m=c[l>>2]|0;n=m*28|0;o=$d(a,n)|0;i=d;return o|0}f=le(le(we(le(le(le(3404,9596,42)|0,9639,81)|0,9721,6)|0,76)|0,9728,2)|0,9731,14)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;p=bk(e,5928)|0;q=bc[c[(c[p>>2]|0)+28>>2]&15](p,10)|0;zm(e);ef(f,q)|0;lg(f)|0;f=le(3320,9566,29)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;q=bk(e,5928)|0;p=bc[c[(c[q>>2]|0)+28>>2]&15](q,10)|0;zm(e);ef(f,p)|0;lg(f)|0;Ca()|0;h=b+4|0;j=c[h>>2]|0;k=Zd(g,j)|0;l=k+4|0;m=c[l>>2]|0;n=m*28|0;o=$d(a,n)|0;i=d;return o|0}function De(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+16|0;g=e+4|0;h=e+8|0;j=e;k=b+52|0;l=(a[k>>0]|0)!=0;a:do if((d|0)==-1)if(l)m=-1;else{n=c[b+48>>2]|0;a[k>>0]=(n|0)!=-1&1;m=n}else{n=b+48|0;b:do if(l){a[h>>0]=c[n>>2];o=c[b+36>>2]|0;switch(_b[c[(c[o>>2]|0)+12>>2]&15](o,c[b+40>>2]|0,h,h+1|0,j,f,f+8|0,g)|0){case 1:case 2:{m=-1;break a;break}case 3:{a[f>>0]=c[n>>2];c[g>>2]=f+1;break}default:{}}o=b+32|0;while(1){p=c[g>>2]|0;if(p>>>0<=f>>>0)break b;q=p+-1|0;c[g>>2]=q;if((Ka(a[q>>0]|0,c[o>>2]|0)|0)==-1){m=-1;break a}}}while(0);c[n>>2]=d;a[k>>0]=1;m=d}while(0);i=e;return m|0}function Be(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=b+52|0;l=(a[k>>0]|0)!=0;a:do if((d|0)==-1)if(l)m=-1;else{n=c[b+48>>2]|0;a[k>>0]=(n|0)!=-1&1;m=n}else{n=b+48|0;b:do if(l){c[h>>2]=c[n>>2];o=c[b+36>>2]|0;switch(_b[c[(c[o>>2]|0)+12>>2]&15](o,c[b+40>>2]|0,h,h+4|0,j,f,f+8|0,g)|0){case 1:case 2:{m=-1;break a;break}case 3:{a[f>>0]=c[n>>2];c[g>>2]=f+1;break}default:{}}o=b+32|0;while(1){p=c[g>>2]|0;if(p>>>0<=f>>>0)break b;q=p+-1|0;c[g>>2]=q;if((Ka(a[q>>0]|0,c[o>>2]|0)|0)==-1){m=-1;break a}}}while(0);c[n>>2]=d;a[k>>0]=1;m=d}while(0);i=e;return m|0}function Ce(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;if(d>>>0>4294967279)um(b);e=a[b>>0]|0;if(!(e&1)){f=10;g=e}else{e=c[b>>2]|0;f=(e&-2)+-1|0;g=e&255}if(!(g&1))h=(g&255)>>>1;else h=c[b+4>>2]|0;e=h>>>0>d>>>0?h:d;if(e>>>0<11)i=10;else i=(e+16&-16)+-1|0;do if((i|0)!=(f|0)){do if((i|0)!=10){e=Ph(i+1|0)|0;if(!(g&1)){j=e;k=1;l=b+1|0;m=0;break}else{j=e;k=1;l=c[b+8>>2]|0;m=1;break}}else{j=b+1|0;k=0;l=c[b+8>>2]|0;m=1}while(0);if(!(g&1))n=(g&255)>>>1;else n=c[b+4>>2]|0;sh(j|0,l|0,n+1|0)|0;if(m)tp(l);if(k){c[b>>2]=i+1|1;c[b+4>>2]=h;c[b+8>>2]=j;break}else{a[b>>0]=h<<1;break}}while(0);return}function Fe(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;if(d>>>0>1073741807)um(b);e=a[b>>0]|0;if(!(e&1)){f=1;g=e}else{e=c[b>>2]|0;f=(e&-2)+-1|0;g=e&255}if(!(g&1))h=(g&255)>>>1;else h=c[b+4>>2]|0;e=h>>>0>d>>>0?h:d;if(e>>>0<2)i=1;else i=(e+4&-4)+-1|0;do if((i|0)!=(f|0)){do if((i|0)!=1){e=Ph((i<<2)+4|0)|0;if(!(g&1)){j=e;k=1;l=b+4|0;m=0;break}else{j=e;k=1;l=c[b+8>>2]|0;m=1;break}}else{j=b+4|0;k=0;l=c[b+8>>2]|0;m=1}while(0);if(!(g&1))n=(g&255)>>>1;else n=c[b+4>>2]|0;Ei(j,l,n+1|0)|0;if(m)tp(l);if(k){c[b>>2]=i+1|1;c[b+4>>2]=h;c[b+8>>2]=j;break}else{a[b>>0]=h<<1;break}}while(0);return}function ke(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;j=i;i=i+16|0;k=j;l=c[b>>2]|0;a:do if(!l)m=0;else{n=f;o=d;p=n-o>>2;q=g+12|0;r=c[q>>2]|0;s=(r|0)>(p|0)?r-p|0:0;p=e;r=p-o|0;o=r>>2;if((r|0)>0?(Pb[c[(c[l>>2]|0)+48>>2]&31](l,d,o)|0)!=(o|0):0){c[b>>2]=0;m=0;break}do if((s|0)>0){Jh(k,s,h);if((Pb[c[(c[l>>2]|0)+48>>2]&31](l,(a[k>>0]&1)==0?k+4|0:c[k+8>>2]|0,s)|0)==(s|0)){tl(k);break}else{c[b>>2]=0;tl(k);m=0;break a}}while(0);s=n-p|0;o=s>>2;if((s|0)>0?(Pb[c[(c[l>>2]|0)+48>>2]&31](l,e,o)|0)!=(o|0):0){c[b>>2]=0;m=0;break}c[q>>2]=0;m=l}while(0);i=j;return m|0}function pe(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+16|0;k=j;l=c[b>>2]|0;if(!l){m=0;i=j;return m|0}n=f;f=d;o=n-f|0;p=g+12|0;g=c[p>>2]|0;q=(g|0)>(o|0)?g-o|0:0;o=e;g=o-f|0;if((g|0)>0?(Pb[c[(c[l>>2]|0)+48>>2]&31](l,d,g)|0)!=(g|0):0){c[b>>2]=0;m=0;i=j;return m|0}do if((q|0)>0){Ih(k,q,h);if((Pb[c[(c[l>>2]|0)+48>>2]&31](l,(a[k>>0]&1)==0?k+1|0:c[k+8>>2]|0,q)|0)==(q|0)){ul(k);break}c[b>>2]=0;ul(k);m=0;i=j;return m|0}while(0);k=n-o|0;if((k|0)>0?(Pb[c[(c[l>>2]|0)+48>>2]&31](l,e,k)|0)!=(k|0):0){c[b>>2]=0;m=0;i=j;return m|0}c[p>>2]=0;m=l;i=j;return m|0}function Re(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;f=e+16|0;g=c[f>>2]|0;do if(!g)if(!(Vh(e)|0)){h=c[f>>2]|0;break}else{i=0;return i|0}else h=g;while(0);g=e+20|0;f=c[g>>2]|0;if((h-f|0)>>>0<d>>>0){i=Pb[c[e+36>>2]&31](e,b,d)|0;return i|0}a:do if((a[e+75>>0]|0)>-1){h=d;while(1){if(!h){j=d;k=b;l=f;m=0;break a}n=h+-1|0;if((a[b+n>>0]|0)==10){o=h;break}else h=n}if((Pb[c[e+36>>2]&31](e,b,o)|0)>>>0<o>>>0){i=o;return i|0}else{j=d-o|0;k=b+o|0;l=c[g>>2]|0;m=o;break}}else{j=d;k=b;l=f;m=0}while(0);sh(l|0,k|0,j|0)|0;c[g>>2]=(c[g>>2]|0)+j;i=m+j|0;return i|0}function Ye(b){b=b|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;e=b+104|0;f=c[e>>2]|0;if(!((f|0)!=0?(c[b+108>>2]|0)>=(f|0):0))g=3;if((g|0)==3?(f=ui(b)|0,(f|0)>=0):0){h=c[e>>2]|0;e=b+8|0;if(h){i=c[e>>2]|0;j=c[b+4>>2]|0;k=i;l=h-(c[b+108>>2]|0)+-1|0;if((k-j|0)>(l|0)){c[b+100>>2]=j+l;m=i}else{n=k;o=i;g=9}}else{i=c[e>>2]|0;n=i;o=i;g=9}if((g|0)==9){c[b+100>>2]=n;m=o}o=c[b+4>>2]|0;if(m){n=b+108|0;c[n>>2]=m+1-o+(c[n>>2]|0)}n=o+-1|0;if((d[n>>0]|0|0)==(f|0)){p=f;return p|0}a[n>>0]=f;p=f;return p|0}c[b+100>>2]=0;p=-1;return p|0}function Te(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=i;i=i+224|0;f=e+120|0;g=e+80|0;h=e;j=e+136|0;k=g;l=k+40|0;do{c[k>>2]=0;k=k+4|0}while((k|0)<(l|0));c[f>>2]=c[d>>2];if((ec(0,b,f,h,g)|0)<0){m=-1;i=e;return m|0}d=a+48|0;if(!(c[d>>2]|0)){k=a+44|0;l=c[k>>2]|0;c[k>>2]=j;n=a+28|0;c[n>>2]=j;o=a+20|0;c[o>>2]=j;c[d>>2]=80;p=a+16|0;c[p>>2]=j+80;j=ec(a,b,f,h,g)|0;if(!l)q=j;else{Pb[c[a+36>>2]&31](a,0,0)|0;r=(c[o>>2]|0)==0?-1:j;c[k>>2]=l;c[d>>2]=0;c[p>>2]=0;c[n>>2]=0;c[o>>2]=0;q=r}}else q=ec(a,b,f,h,g)|0;m=q;i=e;return m|0}function Ee(b,d){b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0;e=i;i=i+32|0;f=e+16|0;h=e+8|0;j=e;vd(h,d);k=h;h=c[k>>2]|0;l=c[k+4>>2]|0;k=j;c[k>>2]=h;c[k+4>>2]=l;c[f>>2]=c[j>>2];c[f+4>>2]=c[j+4>>2];j=Jd(d,f)|0;f=j;c[f>>2]=h;c[f+4>>2]=l;c[j+8>>2]=d;c[j+24>>2]=3;d=j+12|0;l=j+20|0;if((c[l>>2]|0)!=-1){if((a[8]|0)==0?(Ha(8)|0)!=0:0){c[544]=96;c[546]=39;c[548]=40;c[545]=97;c[547]=41;c[549]=42;Qa(8)}Sb[c[2176+(c[l>>2]<<2)>>2]&127](d)}f=d;c[f>>2]=0;c[f+4>>2]=0;c[l>>2]=0;l=ie(d)|0;g[l>>2]=+((Vi()|0)%100|0|0);g[l+4>>2]=+((Vi()|0)%10|0|0);l=j;j=c[l+4>>2]|0;d=b;c[d>>2]=c[l>>2];c[d+4>>2]=j;i=e;return}function oe(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;if((b|0)==(c[d+8>>2]|0))jf(0,d,e,f,g);else{i=d+52|0;j=a[i>>0]|0;k=d+53|0;l=a[k>>0]|0;m=c[b+12>>2]|0;n=b+16+(m<<3)|0;a[i>>0]=0;a[k>>0]=0;Lh(b+16|0,d,e,f,g,h);a:do if((m|0)>1){o=d+24|0;p=b+8|0;q=d+54|0;r=b+24|0;do{if(a[q>>0]|0)break a;if(!(a[i>>0]|0)){if((a[k>>0]|0)!=0?(c[p>>2]&1|0)==0:0)break a}else{if((c[o>>2]|0)==1)break a;if(!(c[p>>2]&2))break a}a[i>>0]=0;a[k>>0]=0;Lh(r,d,e,f,g,h);r=r+8|0}while(r>>>0<n>>>0)}while(0);a[i>>0]=j;a[k>>0]=l}return}function we(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+20|0;g=e+16|0;h=e+8|0;j=e;ji(h,b);if(a[h>>0]|0){c[j>>2]=fk(b+(c[(c[b>>2]|0)+-12>>2]|0)|0)|0;k=bk(j,5100)|0;zm(j);j=c[(c[b>>2]|0)+-12>>2]|0;l=c[b+(j+24)>>2]|0;m=b+j|0;n=b+(j+76)|0;j=c[n>>2]|0;if((j|0)==-1){c[f>>2]=fk(m)|0;o=bk(f,5928)|0;p=bc[c[(c[o>>2]|0)+28>>2]&15](o,32)|0;zm(f);o=p<<24>>24;c[n>>2]=o;q=o}else q=j;j=c[(c[k>>2]|0)+16>>2]|0;c[g>>2]=l;c[f>>2]=c[g>>2];if(!(cc[j&31](k,f,m,q&255,d)|0)){d=b+((c[(c[b>>2]|0)+-12>>2]|0)+16)|0;c[d>>2]=c[d>>2]|5}}rg(h);i=e;return b|0}function xe(b,d){b=b|0;d=+d;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+20|0;g=e+16|0;h=e+8|0;j=e;ji(h,b);if(a[h>>0]|0){c[j>>2]=fk(b+(c[(c[b>>2]|0)+-12>>2]|0)|0)|0;k=bk(j,5100)|0;zm(j);j=c[(c[b>>2]|0)+-12>>2]|0;l=c[b+(j+24)>>2]|0;m=b+j|0;n=b+(j+76)|0;j=c[n>>2]|0;if((j|0)==-1){c[f>>2]=fk(m)|0;o=bk(f,5928)|0;p=bc[c[(c[o>>2]|0)+28>>2]&15](o,32)|0;zm(f);o=p<<24>>24;c[n>>2]=o;q=o}else q=j;j=c[(c[k>>2]|0)+32>>2]|0;c[g>>2]=l;c[f>>2]=c[g>>2];if(!(Vb[j&7](k,f,m,q&255,d)|0)){q=b+((c[(c[b>>2]|0)+-12>>2]|0)+16)|0;c[q>>2]=c[q>>2]|5}}rg(h);i=e;return b|0}function Ve(){var a=0,b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;a=i;i=i+48|0;b=a+32|0;d=a+24|0;e=a+16|0;f=a;g=a+36|0;a=oj()|0;if((a|0)!=0?(h=c[a>>2]|0,(h|0)!=0):0){a=h+48|0;j=c[a>>2]|0;k=c[a+4>>2]|0;if(!((j&-256|0)==1126902528&(k|0)==1129074247)){c[d>>2]=c[647];uj(10798,d)}if((j|0)==1126902529&(k|0)==1129074247)l=c[h+44>>2]|0;else l=h+80|0;c[g>>2]=l;l=c[h>>2]|0;h=c[l+4>>2]|0;if(Pb[c[(c[56>>2]|0)+16>>2]&31](56,l,g)|0){l=c[g>>2]|0;g=c[647]|0;k=Wb[c[(c[l>>2]|0)+8>>2]&63](l)|0;c[f>>2]=g;c[f+4>>2]=h;c[f+8>>2]=k;uj(10712,f)}else{c[e>>2]=c[647];c[e+4>>2]=h;uj(10757,e)}}uj(10836,b)}function Le(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;f=d;g=a[b>>0]|0;if(!(g&1)){h=1;i=(g&255)>>>1;j=g}else{g=c[b>>2]|0;h=(g&-2)+-1|0;i=c[b+4>>2]|0;j=g&255}g=e-f>>2;do if(g){if((h-i|0)>>>0<g>>>0){sf(b,h,i+g-h|0,i,i,0,0);k=a[b>>0]|0}else k=j;if(!(k&1))l=b+4|0;else l=c[b+8>>2]|0;m=i+((e-f|0)>>>2)|0;if((d|0)!=(e|0)){n=d;o=l+(i<<2)|0;while(1){c[o>>2]=c[n>>2];n=n+4|0;if((n|0)==(e|0))break;else o=o+4|0}}c[l+(m<<2)>>2]=0;o=i+g|0;if(!(a[b>>0]&1)){a[b>>0]=o<<1;break}else{c[b+4>>2]=o;break}}while(0);return b|0}function We(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;i=i+16|0;g=f;a:do if((a|0)==(b|0)){c[d>>2]=4;h=0}else{j=tb()|0;k=c[j>>2]|0;c[j>>2]=0;l=qm(a,g,e,jk()|0)|0;m=G;n=c[j>>2]|0;if(!n)c[j>>2]=k;if((c[g>>2]|0)!=(b|0)){c[d>>2]=4;h=0;break}do if((n|0)==34){c[d>>2]=4;if((m|0)>0|(m|0)==0&l>>>0>0){h=2147483647;break a}}else{if((m|0)<-1|(m|0)==-1&l>>>0<2147483648){c[d>>2]=4;break}if((m|0)>0|(m|0)==0&l>>>0>2147483647){c[d>>2]=4;h=2147483647;break a}else{h=l;break a}}while(0);h=-2147483648}while(0);i=f;return h|0}function Ne(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;f=d;g=a[b>>0]|0;if(!(g&1)){h=10;i=(g&255)>>>1;j=g}else{g=c[b>>2]|0;h=(g&-2)+-1|0;i=c[b+4>>2]|0;j=g&255}g=e-f|0;do if((e|0)!=(d|0)){if((h-i|0)>>>0<g>>>0){vf(b,h,i+g-h|0,i,i,0,0);k=a[b>>0]|0}else k=j;if(!(k&1))l=b+1|0;else l=c[b+8>>2]|0;m=e+(i-f)|0;if((d|0)!=(e|0)){n=d;o=l+i|0;while(1){a[o>>0]=a[n>>0]|0;n=n+1|0;if((n|0)==(e|0))break;else o=o+1|0}}a[l+m>>0]=0;o=i+g|0;if(!(a[b>>0]&1)){a[b>>0]=o<<1;break}else{c[b+4>>2]=o;break}}while(0);return b|0}function Dd(b){b=b|0;if((a[1832]|0)==0?(Ha(1832)|0)!=0:0){if((a[1840]|0)==0?(Ha(1840)|0)!=0:0){b=7432;do{c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;b=b+12|0}while((b|0)!=7720);wb(105,0,n|0)|0;Qa(1840)}Xj(7432,13779)|0;Xj(7444,13787)|0;Xj(7456,13796)|0;Xj(7468,13802)|0;Xj(7480,13808)|0;Xj(7492,13812)|0;Xj(7504,13817)|0;Xj(7516,13822)|0;Xj(7528,13829)|0;Xj(7540,13839)|0;Xj(7552,13847)|0;Xj(7564,13856)|0;Xj(7576,13865)|0;Xj(7588,13869)|0;Xj(7600,13873)|0;Xj(7612,13877)|0;Xj(7624,13808)|0;Xj(7636,13881)|0;Xj(7648,13885)|0;Xj(7660,13889)|0;Xj(7672,13893)|0;Xj(7684,13897)|0;Xj(7696,13901)|0;Xj(7708,13905)|0;c[1930]=7432;Qa(1832)}return c[1930]|0}function le(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;f=i;i=i+32|0;g=f+16|0;h=f+8|0;j=f;ji(h,b);if(!(a[h>>0]|0)){rg(h);i=f;return b|0}k=c[(c[b>>2]|0)+-12>>2]|0;c[j>>2]=c[b+(k+24)>>2];l=b+k|0;m=c[b+(k+4)>>2]|0;n=d+e|0;e=b+(k+76)|0;k=c[e>>2]|0;if((k|0)==-1){c[g>>2]=fk(l)|0;o=bk(g,5928)|0;p=bc[c[(c[o>>2]|0)+28>>2]&15](o,32)|0;zm(g);o=p<<24>>24;c[e>>2]=o;q=o}else q=k;c[g>>2]=c[j>>2];if(pe(g,d,(m&176|0)==32?n:d,n,l,q&255)|0){rg(h);i=f;return b|0}q=c[(c[b>>2]|0)+-12>>2]|0;_l(b+q|0,c[b+(q+16)>>2]|5);rg(h);i=f;return b|0}function Ed(b){b=b|0;if((a[1848]|0)==0?(Ha(1848)|0)!=0:0){if((a[1856]|0)==0?(Ha(1856)|0)!=0:0){b=7724;do{c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;b=b+12|0}while((b|0)!=8012);wb(106,0,n|0)|0;Qa(1856)}_j(7724,8012)|0;_j(7736,8044)|0;_j(7748,8080)|0;_j(7760,8104)|0;_j(7772,8128)|0;_j(7784,8144)|0;_j(7796,8164)|0;_j(7808,8184)|0;_j(7820,8212)|0;_j(7832,8252)|0;_j(7844,8284)|0;_j(7856,8320)|0;_j(7868,8356)|0;_j(7880,8372)|0;_j(7892,8388)|0;_j(7904,8404)|0;_j(7916,8128)|0;_j(7928,8420)|0;_j(7940,8436)|0;_j(7952,8452)|0;_j(7964,8468)|0;_j(7976,8484)|0;_j(7988,8500)|0;_j(8e3,8516)|0;c[2133]=7724;Qa(1848)}return c[2133]|0}function Me(b,d){b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0;e=i;i=i+32|0;f=e+16|0;h=e+8|0;j=e;vd(h,d);k=h;h=c[k>>2]|0;l=c[k+4>>2]|0;k=j;c[k>>2]=h;c[k+4>>2]=l;c[f>>2]=c[j>>2];c[f+4>>2]=c[j+4>>2];j=Jd(d,f)|0;f=j;c[f>>2]=h;c[f+4>>2]=l;c[j+8>>2]=d;c[j+24>>2]=2;d=j+12|0;l=j+20|0;if((c[l>>2]|0)!=-1){if((a[8]|0)==0?(Ha(8)|0)!=0:0){c[544]=96;c[546]=39;c[548]=40;c[545]=97;c[547]=41;c[549]=42;Qa(8)}Sb[c[2176+(c[l>>2]<<2)>>2]&127](d)}c[d>>2]=0;c[l>>2]=1;l=he(d)|0;g[l>>2]=+((Vi()|0)%100|0|0);l=j;j=c[l+4>>2]|0;d=b;c[d>>2]=c[l>>2];c[d+4>>2]=j;i=e;return}function _e(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;g=i;i=i+128|0;h=g+112|0;j=g;k=j;l=2624;m=k+112|0;do{c[k>>2]=c[l>>2];k=k+4|0;l=l+4|0}while((k|0)<(m|0));if((d+-1|0)>>>0>2147483646)if(!d){n=h;o=1}else{c[(tb()|0)>>2]=75;p=-1;i=g;return p|0}else{n=b;o=d}d=-2-n|0;b=o>>>0>d>>>0?d:o;c[j+48>>2]=b;o=j+20|0;c[o>>2]=n;c[j+44>>2]=n;d=n+b|0;n=j+16|0;c[n>>2]=d;c[j+28>>2]=d;d=Te(j,e,f)|0;if(!b){p=d;i=g;return p|0}b=c[o>>2]|0;a[b+(((b|0)==(c[n>>2]|0))<<31>>31)>>0]=0;p=d;i=g;return p|0}function Ke(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;e=i;i=i+16|0;f=e;g=e+4|0;c[g>>2]=0;c[g+4>>2]=0;c[g+8>>2]=0;if(!(a[g>>0]&1))h=10;else h=(c[g>>2]&-2)+-1|0;mh(g,h,0);h=a[g>>0]|0;j=g+1|0;k=g+8|0;l=h;m=(h&1)==0?(h&255)>>>1:c[g+4>>2]|0;while(1){h=(l&1)==0?j:c[k>>2]|0;c[f>>2]=d;n=wj(h,m+1|0,11803,f)|0;if((n|0)>-1)if(n>>>0>m>>>0)o=n;else{p=n;break}else o=m<<1|1;mh(g,o,0);l=a[g>>0]|0;m=o}mh(g,p,0);c[b>>2]=c[g>>2];c[b+4>>2]=c[g+4>>2];c[b+8>>2]=c[g+8>>2];c[g>>2]=0;c[g+4>>2]=0;c[g+8>>2]=0;ul(g);i=e;return}function _d(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;i=i+16|0;e=d;f=c[a>>2]|0;if((f+(b<<2)|0)>>>0<(c[a+4>>2]|0)>>>0){g=f;h=g+(b<<2)|0;i=d;return h|0}f=le(le(we(le(le(le(3404,9746,41)|0,9788,67)|0,9721,6)|0,240)|0,9728,2)|0,13594,0)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;j=bk(e,5928)|0;k=bc[c[(c[j>>2]|0)+28>>2]&15](j,10)|0;zm(e);ef(f,k)|0;lg(f)|0;f=le(3320,9566,29)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;k=bk(e,5928)|0;j=bc[c[(c[k>>2]|0)+28>>2]&15](k,10)|0;zm(e);ef(f,j)|0;lg(f)|0;Ca()|0;g=c[a>>2]|0;h=g+(b<<2)|0;i=d;return h|0}function Zd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;i=i+16|0;e=d;f=c[a>>2]|0;if((f+(b<<3)|0)>>>0<(c[a+4>>2]|0)>>>0){g=f;h=g+(b<<3)|0;i=d;return h|0}f=le(le(we(le(le(le(3404,9746,41)|0,9788,67)|0,9721,6)|0,240)|0,9728,2)|0,13594,0)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;j=bk(e,5928)|0;k=bc[c[(c[j>>2]|0)+28>>2]&15](j,10)|0;zm(e);ef(f,k)|0;lg(f)|0;f=le(3320,9566,29)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;k=bk(e,5928)|0;j=bc[c[(c[k>>2]|0)+28>>2]&15](k,10)|0;zm(e);ef(f,j)|0;lg(f)|0;Ca()|0;g=c[a>>2]|0;h=g+(b<<3)|0;i=d;return h|0}function ze(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+192|0;h=b;j=b+180|0;k=b+160|0;l=b+12|0;m=b+8|0;n=b+4|0;a[j>>0]=a[13597]|0;a[j+1>>0]=a[13598]|0;a[j+2>>0]=a[13599]|0;a[j+3>>0]=a[13600]|0;a[j+4>>0]=a[13601]|0;a[j+5>>0]=a[13602]|0;o=jk()|0;c[h>>2]=g;g=ri(k,20,o,j,h)|0;j=k+g|0;o=Of(k,j,e)|0;p=fk(e)|0;c[m>>2]=p;q=bk(m,5920)|0;_i(p)|0;$b[c[(c[q>>2]|0)+48>>2]&7](q,k,j,l)|0;q=l+(g<<2)|0;c[n>>2]=c[d>>2];c[h>>2]=c[n>>2];n=ke(h,l,(o|0)==(j|0)?q:l+(o-k<<2)|0,q,e,f)|0;i=b;return n|0}function se(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+128|0;h=b;j=b+116|0;k=b+104|0;l=b+20|0;m=b+16|0;n=b+12|0;o=b+8|0;p=b+4|0;a[j>>0]=a[13583]|0;a[j+1>>0]=a[13584]|0;a[j+2>>0]=a[13585]|0;a[j+3>>0]=a[13586]|0;a[j+4>>0]=a[13587]|0;a[j+5>>0]=a[13588]|0;df(j+1|0,13589,1,c[e+4>>2]|0);q=jk()|0;c[h>>2]=g;g=k+(ri(k,12,q,j,h)|0)|0;j=Of(k,g,e)|0;q=fk(e)|0;c[o>>2]=q;ld(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[d>>2];d=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=ke(h,l,d,m,e,f)|0;i=b;return p|0}function re(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+128|0;h=b;j=b+116|0;k=b+104|0;l=b+20|0;m=b+16|0;n=b+12|0;o=b+8|0;p=b+4|0;a[j>>0]=a[13583]|0;a[j+1>>0]=a[13584]|0;a[j+2>>0]=a[13585]|0;a[j+3>>0]=a[13586]|0;a[j+4>>0]=a[13587]|0;a[j+5>>0]=a[13588]|0;df(j+1|0,13589,0,c[e+4>>2]|0);q=jk()|0;c[h>>2]=g;g=k+(ri(k,12,q,j,h)|0)|0;j=Of(k,g,e)|0;q=fk(e)|0;c[o>>2]=q;ld(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[d>>2];d=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=ke(h,l,d,m,e,f)|0;i=b;return p|0}function Oe(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;d=i;i=i+16|0;j=d;c[j>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;k=a[h>>0]|0;l=(k&1)==0;m=l?h+1|0:c[h+8>>2]|0;n=l?(k&255)>>>1:c[h+4>>2]|0;h=m+n|0;if((n|0)>0){n=m;do{zf(j,a[n>>0]|0);n=n+1|0}while(n>>>0<h>>>0)}h=Za(((e|0)==-1?-1:e<<1)|0,f|0,g|0,((a[j>>0]&1)==0?j+1|0:c[j+8>>2]|0)|0)|0;c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g=Am(h|0)|0;f=h+g|0;if((g|0)>0){g=h;do{zf(b,a[g>>0]|0);g=g+1|0}while(g>>>0<f>>>0)}ul(j);i=d;return}function ue(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+64|0;h=b;j=b+56|0;k=b+44|0;l=b+20|0;m=b+16|0;n=b+12|0;o=b+8|0;p=b+4|0;a[j>>0]=a[13583]|0;a[j+1>>0]=a[13584]|0;a[j+2>>0]=a[13585]|0;a[j+3>>0]=a[13586]|0;a[j+4>>0]=a[13587]|0;a[j+5>>0]=a[13588]|0;df(j+1|0,13589,1,c[e+4>>2]|0);q=jk()|0;c[h>>2]=g;g=k+(ri(k,12,q,j,h)|0)|0;j=Of(k,g,e)|0;q=fk(e)|0;c[o>>2]=q;nd(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[d>>2];d=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=pe(h,l,d,m,e,f)|0;i=b;return p|0}function te(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+64|0;h=b;j=b+56|0;k=b+44|0;l=b+20|0;m=b+16|0;n=b+12|0;o=b+8|0;p=b+4|0;a[j>>0]=a[13583]|0;a[j+1>>0]=a[13584]|0;a[j+2>>0]=a[13585]|0;a[j+3>>0]=a[13586]|0;a[j+4>>0]=a[13587]|0;a[j+5>>0]=a[13588]|0;df(j+1|0,13589,0,c[e+4>>2]|0);q=jk()|0;c[h>>2]=g;g=k+(ri(k,12,q,j,h)|0)|0;j=Of(k,g,e)|0;q=fk(e)|0;c[o>>2]=q;nd(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[d>>2];d=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=pe(h,l,d,m,e,f)|0;i=b;return p|0}function Ae(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+80|0;h=b;j=b+72|0;k=b+52|0;l=b+12|0;m=b+8|0;n=b+4|0;a[j>>0]=a[13597]|0;a[j+1>>0]=a[13598]|0;a[j+2>>0]=a[13599]|0;a[j+3>>0]=a[13600]|0;a[j+4>>0]=a[13601]|0;a[j+5>>0]=a[13602]|0;o=jk()|0;c[h>>2]=g;g=ri(k,20,o,j,h)|0;j=k+g|0;o=Of(k,j,e)|0;p=fk(e)|0;c[m>>2]=p;q=bk(m,5928)|0;_i(p)|0;$b[c[(c[q>>2]|0)+32>>2]&7](q,k,j,l)|0;q=l+g|0;c[n>>2]=c[d>>2];c[h>>2]=c[n>>2];n=pe(h,l,(o|0)==(j|0)?q:l+(o-k)|0,q,e,f)|0;i=b;return n|0}function $d(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;i=i+16|0;e=d;f=c[a>>2]|0;if((f+b|0)>>>0<(c[a+4>>2]|0)>>>0){g=f;h=g+b|0;i=d;return h|0}f=le(le(we(le(le(le(3404,9746,41)|0,9788,67)|0,9721,6)|0,240)|0,9728,2)|0,13594,0)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;j=bk(e,5928)|0;k=bc[c[(c[j>>2]|0)+28>>2]&15](j,10)|0;zm(e);ef(f,k)|0;lg(f)|0;f=le(3320,9566,29)|0;c[e>>2]=fk(f+(c[(c[f>>2]|0)+-12>>2]|0)|0)|0;k=bk(e,5928)|0;j=bc[c[(c[k>>2]|0)+28>>2]&15](k,10)|0;zm(e);ef(f,j)|0;lg(f)|0;Ca()|0;g=c[a>>2]|0;h=g+b|0;i=d;return h|0}function df(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(!(e&2048))f=b;else{a[b>>0]=43;f=b+1|0}if(!(e&512))g=f;else{a[f>>0]=35;g=f+1|0}f=a[c>>0]|0;if(!(f<<24>>24))h=g;else{b=c;c=g;g=f;while(1){b=b+1|0;f=c+1|0;a[c>>0]=g;g=a[b>>0]|0;if(!(g<<24>>24)){h=f;break}else c=f}}a:do switch(e&74|0){case 64:{a[h>>0]=111;break}case 8:{if(!(e&16384)){a[h>>0]=120;break a}else{a[h>>0]=88;break a}break}default:if(d){a[h>>0]=100;break a}else{a[h>>0]=117;break a}}while(0);return}function Xe(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0;f=i;i=i+112|0;e=f+4|0;k=f;c[k>>2]=e+100;wh(b+8|0,e,k,g,h,j);j=c[k>>2]|0;k=c[d>>2]|0;if((e|0)==(j|0))l=k;else{d=e;e=k;while(1){k=a[d>>0]|0;do if(e){h=e+24|0;g=c[h>>2]|0;if((g|0)==(c[e+28>>2]|0)){b=(bc[c[(c[e>>2]|0)+52>>2]&15](e,k&255)|0)==-1;m=b?0:e;break}else{c[h>>2]=g+1;a[g>>0]=k;m=e;break}}else m=0;while(0);d=d+1|0;if((d|0)==(j|0)){l=m;break}else e=m}}i=f;return l|0}function Qe(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;j=i;i=i+16|0;k=j+4|0;l=j;m=b+8|0;b=Wb[c[(c[m>>2]|0)+8>>2]&63](m)|0;m=a[b>>0]|0;if(!(m&1))n=(m&255)>>>1;else n=c[b+4>>2]|0;m=a[b+12>>0]|0;if(!(m&1))o=(m&255)>>>1;else o=c[b+16>>2]|0;do if((n|0)!=(0-o|0)){c[l>>2]=c[f>>2];c[k>>2]=c[l>>2];m=Ac(e,k,b,b+24|0,h,g,0)|0;p=c[d>>2]|0;if((m|0)==(b|0)&(p|0)==12){c[d>>2]=0;break}if((p|0)<12&(m-b|0)==12)c[d>>2]=p+12}else c[g>>2]=c[g>>2]|4;while(0);i=j;return}function Pe(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;j=i;i=i+16|0;k=j+4|0;l=j;m=b+8|0;b=Wb[c[(c[m>>2]|0)+8>>2]&63](m)|0;m=a[b>>0]|0;if(!(m&1))n=(m&255)>>>1;else n=c[b+4>>2]|0;m=a[b+12>>0]|0;if(!(m&1))o=(m&255)>>>1;else o=c[b+16>>2]|0;do if((n|0)!=(0-o|0)){c[l>>2]=c[f>>2];c[k>>2]=c[l>>2];m=wc(e,k,b,b+24|0,h,g,0)|0;p=c[d>>2]|0;if((m|0)==(b|0)&(p|0)==12){c[d>>2]=0;break}if((p|0)<12&(m-b|0)==12)c[d>>2]=p+12}else c[g>>2]=c[g>>2]|4;while(0);i=j;return}function hf(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;g=e;h=a+8|0;a:do if((d|0)==(e|0)|(f|0)==0)i=0;else{a=d;j=0;k=0;while(1){l=Ya(c[h>>2]|0)|0;m=Bm(a,g-a|0,b)|0;if(l)Ya(l|0)|0;switch(m|0){case -2:case -1:{i=j;break a;break}case 0:{n=a+1|0;o=1;break}default:{n=a+m|0;o=m}}m=o+j|0;k=k+1|0;if((n|0)==(e|0)|k>>>0>=f>>>0){i=m;break a}else{a=n;j=m}}}while(0);return i|0}function $e(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;e=i;i=i+416|0;d=e+8|0;j=e;c[j>>2]=d+400;pg(a+8|0,d,j,f,g,h);h=c[j>>2]|0;j=c[b>>2]|0;if((d|0)==(h|0))k=j;else{b=d;d=j;while(1){j=c[b>>2]|0;if(!d)l=0;else{g=d+24|0;f=c[g>>2]|0;if((f|0)==(c[d+28>>2]|0))m=bc[c[(c[d>>2]|0)+52>>2]&15](d,j)|0;else{c[g>>2]=f+4;c[f>>2]=j;m=j}l=(m|0)==-1?0:d}b=b+4|0;if((b|0)==(h|0)){k=l;break}else d=l}}i=e;return k|0}function Ze(b,d,e,f,g,h,i,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0;if((1073741806-d|0)>>>0<e>>>0)um(b);if(!(a[b>>0]&1))k=b+4|0;else k=c[b+8>>2]|0;if(d>>>0<536870887){l=e+d|0;e=d<<1;m=l>>>0<e>>>0?e:l;n=m>>>0<2?2:m+4&-4}else n=1073741807;m=Ph(n<<2)|0;if(g)Ei(m,k,g)|0;if(i)Ei(m+(g<<2)|0,j,i)|0;j=f-h|0;if((j|0)!=(g|0))Ei(m+(i+g<<2)|0,k+(h+g<<2)|0,j-g|0)|0;if((d|0)!=1)tp(k);c[b+8>>2]=m;c[b>>2]=n|1;n=j+i|0;c[b+4>>2]=n;c[m+(n<<2)>>2]=0;return}function He(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a=i;i=i+224|0;h=a+8|0;j=a;k=a+196|0;l=a+32|0;m=a+28|0;n=a+24|0;o=a+20|0;p=a+16|0;q=j;c[q>>2]=37;c[q+4>>2]=0;df(j+1|0,13591,1,c[d+4>>2]|0);q=jk()|0;r=h;c[r>>2]=f;c[r+4>>2]=g;g=k+(ri(k,22,q,j,h)|0)|0;j=Of(k,g,d)|0;q=fk(d)|0;c[o>>2]=q;ld(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[b>>2];b=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=ke(h,l,b,m,d,e)|0;i=a;return p|0}function Ge(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a=i;i=i+240|0;h=a+8|0;j=a;k=a+204|0;l=a+32|0;m=a+28|0;n=a+24|0;o=a+20|0;p=a+16|0;q=j;c[q>>2]=37;c[q+4>>2]=0;df(j+1|0,13591,0,c[d+4>>2]|0);q=jk()|0;r=h;c[r>>2]=f;c[r+4>>2]=g;g=k+(ri(k,23,q,j,h)|0)|0;j=Of(k,g,d)|0;q=fk(d)|0;c[o>>2]=q;ld(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[b>>2];b=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=ke(h,l,b,m,d,e)|0;i=a;return p|0}function Ie(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a=i;i=i+112|0;h=a+8|0;j=a;k=a+75|0;l=a+32|0;m=a+28|0;n=a+24|0;o=a+20|0;p=a+16|0;q=j;c[q>>2]=37;c[q+4>>2]=0;df(j+1|0,13591,0,c[d+4>>2]|0);q=jk()|0;r=h;c[r>>2]=f;c[r+4>>2]=g;g=k+(ri(k,23,q,j,h)|0)|0;j=Of(k,g,d)|0;q=fk(d)|0;c[o>>2]=q;nd(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[b>>2];b=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=pe(h,l,b,m,d,e)|0;i=a;return p|0}function Je(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a=i;i=i+96|0;h=a+8|0;j=a;k=a+74|0;l=a+32|0;m=a+28|0;n=a+24|0;o=a+20|0;p=a+16|0;q=j;c[q>>2]=37;c[q+4>>2]=0;df(j+1|0,13591,1,c[d+4>>2]|0);q=jk()|0;r=h;c[r>>2]=f;c[r+4>>2]=g;g=k+(ri(k,22,q,j,h)|0)|0;j=Of(k,g,d)|0;q=fk(d)|0;c[o>>2]=q;nd(k,j,g,l,m,n,o);_i(q)|0;c[p>>2]=c[b>>2];b=c[m>>2]|0;m=c[n>>2]|0;c[h>>2]=c[p>>2];p=pe(h,l,b,m,d,e)|0;i=a;return p|0}function Jf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if(!b){f=1;return f|0}if(d>>>0<128){a[b>>0]=d;f=1;return f|0}if(d>>>0<2048){a[b>>0]=d>>>6|192;a[b+1>>0]=d&63|128;f=2;return f|0}if(d>>>0<55296|(d&-8192|0)==57344){a[b>>0]=d>>>12|224;a[b+1>>0]=d>>>6&63|128;a[b+2>>0]=d&63|128;f=3;return f|0}if((d+-65536|0)>>>0<1048576){a[b>>0]=d>>>18|240;a[b+1>>0]=d>>>12&63|128;a[b+2>>0]=d>>>6&63|128;a[b+3>>0]=d&63|128;f=4;return f|0}else{c[(tb()|0)>>2]=84;f=-1;return f|0}return 0}function af(b,d,e,f,g,h,i,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0;if((-18-d|0)>>>0<e>>>0)um(b);if(!(a[b>>0]&1))k=b+1|0;else k=c[b+8>>2]|0;if(d>>>0<2147483623){l=e+d|0;e=d<<1;m=l>>>0<e>>>0?e:l;n=m>>>0<11?11:m+16&-16}else n=-17;m=Ph(n)|0;if(g)sh(m|0,k|0,g|0)|0;if(i)sh(m+g|0,j|0,i|0)|0;j=f-h|0;if((j|0)!=(g|0))sh(m+(i+g)|0,k+(h+g)|0,j-g|0)|0;if((d|0)!=10)tp(k);c[b+8>>2]=m;c[b>>2]=n|1;n=j+i|0;c[b+4>>2]=n;a[m+n>>0]=0;return}function jf(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0;a[d+53>>0]=1;do if((c[d+4>>2]|0)==(f|0)){a[d+52>>0]=1;b=d+16|0;h=c[b>>2]|0;if(!h){c[b>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((g|0)==1?(c[d+48>>2]|0)==1:0))break;a[d+54>>0]=1;break}if((h|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;a[d+54>>0]=1;break}h=d+24|0;b=c[h>>2]|0;if((b|0)==2){c[h>>2]=g;i=g}else i=b;if((i|0)==1?(c[d+48>>2]|0)==1:0)a[d+54>>0]=1}while(0);return}function ff(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;i=i+16|0;g=f;do if((a|0)!=(b|0)){h=tb()|0;j=c[h>>2]|0;c[h>>2]=0;k=qm(a,g,e,jk()|0)|0;l=G;m=c[h>>2]|0;if(!m)c[h>>2]=j;if((c[g>>2]|0)!=(b|0)){c[d>>2]=4;n=0;o=0;break}if((m|0)==34){c[d>>2]=4;m=(l|0)>0|(l|0)==0&k>>>0>0;G=m?2147483647:-2147483648;i=f;return (m?-1:0)|0}else{n=l;o=k}}else{c[d>>2]=4;n=0;o=0}while(0);G=n;i=f;return o|0}function lf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+16|0;h=g;do if((b|0)!=(d|0)){if((a[b>>0]|0)==45){c[e>>2]=4;j=0;break}k=tb()|0;l=c[k>>2]|0;c[k>>2]=0;m=cm(b,h,f,jk()|0)|0;n=G;o=c[k>>2]|0;if(!o)c[k>>2]=l;if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;break}if(n>>>0>0|(n|0)==0&m>>>0>65535|(o|0)==34){c[e>>2]=4;j=-1;break}else{j=m&65535;break}}else{c[e>>2]=4;j=0}while(0);i=g;return j|0}function of(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;d=b+16|0;e=b+12|0;if((c[d>>2]|0)!=(c[e>>2]|0)){f=0;do{g=$d(b,0)|0;h=g+(f*28|0)+12|0;i=g+(f*28|0)+20|0;if((c[i>>2]|0)!=-1){if((a[8]|0)==0?(Ha(8)|0)!=0:0){c[544]=96;c[546]=39;c[548]=40;c[545]=97;c[547]=41;c[549]=42;Qa(8)}Sb[c[2176+(c[i>>2]<<2)>>2]&127](h)}f=f+1|0}while(f>>>0<(c[d>>2]|0)-(c[e>>2]|0)>>2>>>0)}kc(c[b+36>>2]|0);kc(c[b+24>>2]|0);kc(c[b+12>>2]|0);kc(c[b>>2]|0);return}function nf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+16|0;h=g;do if((b|0)!=(d|0)){if((a[b>>0]|0)==45){c[e>>2]=4;j=0;break}k=tb()|0;l=c[k>>2]|0;c[k>>2]=0;m=cm(b,h,f,jk()|0)|0;n=G;o=c[k>>2]|0;if(!o)c[k>>2]=l;if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;break}if(n>>>0>0|(n|0)==0&m>>>0>4294967295|(o|0)==34){c[e>>2]=4;j=-1;break}else{j=m;break}}else{c[e>>2]=4;j=0}while(0);i=g;return j|0}function mf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+16|0;h=g;do if((b|0)!=(d|0)){if((a[b>>0]|0)==45){c[e>>2]=4;j=0;break}k=tb()|0;l=c[k>>2]|0;c[k>>2]=0;m=cm(b,h,f,jk()|0)|0;n=G;o=c[k>>2]|0;if(!o)c[k>>2]=l;if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;break}if(n>>>0>0|(n|0)==0&m>>>0>4294967295|(o|0)==34){c[e>>2]=4;j=-1;break}else{j=m;break}}else{c[e>>2]=4;j=0}while(0);i=g;return j|0}function Cf(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b+8|0;e=b;f=a+36|0;g=a+40|0;h=d+8|0;j=d;k=a+32|0;a:while(1){a=c[f>>2]|0;l=cc[c[(c[a>>2]|0)+20>>2]&31](a,c[g>>2]|0,d,h,e)|0;a=(c[e>>2]|0)-j|0;if((Eb(d|0,1,a|0,c[k>>2]|0)|0)!=(a|0)){m=-1;break}switch(l|0){case 1:break;case 2:{m=-1;break a;break}default:{n=4;break a}}}if((n|0)==4)m=((Pa(c[k>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}function Bf(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b+8|0;e=b;f=a+36|0;g=a+40|0;h=d+8|0;j=d;k=a+32|0;a:while(1){a=c[f>>2]|0;l=cc[c[(c[a>>2]|0)+20>>2]&31](a,c[g>>2]|0,d,h,e)|0;a=(c[e>>2]|0)-j|0;if((Eb(d|0,1,a|0,c[k>>2]|0)|0)!=(a|0)){m=-1;break}switch(l|0){case 1:break;case 2:{m=-1;break a;break}default:{n=4;break a}}}if((n|0)==4)m=((Pa(c[k>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}function he(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;i=i+16|0;d=b;if((c[a+8>>2]|0)==1){i=b;return a|0}e=le(le(we(le(le(le(3404,9896,48)|0,9945,54)|0,9721,6)|0,71)|0,9728,2)|0,1e4,42)|0;c[d>>2]=fk(e+(c[(c[e>>2]|0)+-12>>2]|0)|0)|0;f=bk(d,5928)|0;g=bc[c[(c[f>>2]|0)+28>>2]&15](f,10)|0;zm(d);ef(e,g)|0;lg(e)|0;e=le(3320,9566,29)|0;c[d>>2]=fk(e+(c[(c[e>>2]|0)+-12>>2]|0)|0)|0;g=bk(d,5928)|0;f=bc[c[(c[g>>2]|0)+28>>2]&15](g,10)|0;zm(d);ef(e,f)|0;lg(e)|0;Ca()|0;i=b;return a|0}function be(b){b=b|0;if((a[1800]|0)==0?(Ha(1800)|0)!=0:0){if((a[1808]|0)==0?(Ha(1808)|0)!=0:0){b=6748;do{c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;b=b+12|0}while((b|0)!=6916);wb(103,0,n|0)|0;Qa(1808)}Xj(6748,13694)|0;Xj(6760,13701)|0;Xj(6772,13708)|0;Xj(6784,13716)|0;Xj(6796,13726)|0;Xj(6808,13735)|0;Xj(6820,13742)|0;Xj(6832,13751)|0;Xj(6844,13755)|0;Xj(6856,13759)|0;Xj(6868,13763)|0;Xj(6880,13767)|0;Xj(6892,13771)|0;Xj(6904,13775)|0;c[1729]=6748;Qa(1800)}return c[1729]|0}function qf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+16|0;h=g;do if((b|0)!=(d|0)){if((a[b>>0]|0)==45){c[e>>2]=4;j=0;k=0;break}l=tb()|0;m=c[l>>2]|0;c[l>>2]=0;n=cm(b,h,f,jk()|0)|0;o=c[l>>2]|0;if(!o)c[l>>2]=m;if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;break}if((o|0)==34){c[e>>2]=4;j=-1;k=-1}else{j=G;k=n}}else{c[e>>2]=4;j=0;k=0}while(0);G=j;i=g;return k|0}function ie(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;i=i+16|0;d=b;if(!(c[a+8>>2]|0)){i=b;return a|0}e=le(le(we(le(le(le(3404,9896,48)|0,9945,54)|0,9721,6)|0,71)|0,9728,2)|0,1e4,42)|0;c[d>>2]=fk(e+(c[(c[e>>2]|0)+-12>>2]|0)|0)|0;f=bk(d,5928)|0;g=bc[c[(c[f>>2]|0)+28>>2]&15](f,10)|0;zm(d);ef(e,g)|0;lg(e)|0;e=le(3320,9566,29)|0;c[d>>2]=fk(e+(c[(c[e>>2]|0)+-12>>2]|0)|0)|0;g=bk(d,5928)|0;f=bc[c[(c[g>>2]|0)+28>>2]&15](g,10)|0;zm(d);ef(e,f)|0;lg(e)|0;Ca()|0;i=b;return a|0}function Rf(a,b){a=+a;b=b|0;var d=0.0,e=0,f=0,g=0,i=0.0;if((b|0)>1023){d=a*89884656743115795.0e291;e=b+-1023|0;if((e|0)>1023){f=b+-2046|0;g=(f|0)>1023?1023:f;i=d*89884656743115795.0e291}else{g=e;i=d}}else if((b|0)<-1022){d=a*2.2250738585072014e-308;e=b+1022|0;if((e|0)<-1022){f=b+2044|0;g=(f|0)<-1022?-1022:f;i=d*2.2250738585072014e-308}else{g=e;i=d}}else{g=b;i=a}b=ck(g+1023|0,0,52)|0;g=G;c[k>>2]=b;c[k+4>>2]=g;return +(i*+h[k>>3])}function rf(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;h=i;i=i+16|0;j=h;c[g>>2]=e;e=Ya(c[b+8>>2]|0)|0;b=Jf(j,0,d)|0;if(e)Ya(e|0)|0;switch(b|0){case 0:case -1:{k=2;break}default:{e=b+-1|0;if(e>>>0<=(f-(c[g>>2]|0)|0)>>>0)if(!e)k=0;else{f=e;e=j;while(1){j=a[e>>0]|0;b=c[g>>2]|0;c[g>>2]=b+1;a[b>>0]=j;f=f+-1|0;if(!f){k=0;break}else e=e+1|0}}else k=1}}i=h;return k|0}function ge(b){b=b|0;if((a[1816]|0)==0?(Ha(1816)|0)!=0:0){if((a[1824]|0)==0?(Ha(1824)|0)!=0:0){b=6920;do{c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;b=b+12|0}while((b|0)!=7088);wb(104,0,n|0)|0;Qa(1824)}_j(6920,7088)|0;_j(6932,7116)|0;_j(6944,7144)|0;_j(6956,7176)|0;_j(6968,7216)|0;_j(6980,7252)|0;_j(6992,7280)|0;_j(7004,7316)|0;_j(7016,7332)|0;_j(7028,7348)|0;_j(7040,7364)|0;_j(7052,7380)|0;_j(7064,7396)|0;_j(7076,7412)|0;c[1857]=6920;Qa(1816)}return c[1857]|0}function Mf(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0;a:do if((e|0)==(f|0)){g=c;h=6}else{b=e;i=c;while(1){if((i|0)==(d|0)){j=-1;break a}k=a[i>>0]|0;l=a[b>>0]|0;if(k<<24>>24<l<<24>>24){j=-1;break a}if(l<<24>>24<k<<24>>24){j=1;break a}k=i+1|0;b=b+1|0;if((b|0)==(f|0)){g=k;h=6;break}else i=k}}while(0);if((h|0)==6)j=(g|0)!=(d|0)&1;return j|0}function pf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;if(d){f=a[b>>0]|0;if(!(f&1)){g=10;h=f}else{f=c[b>>2]|0;g=(f&-2)+-1|0;h=f&255}if(!(h&1))i=(h&255)>>>1;else i=c[b+4>>2]|0;if((g-i|0)>>>0<d>>>0){vf(b,g,d-g+i|0,i,i,0,0);j=a[b>>0]|0}else j=h;if(!(j&1))k=b+1|0;else k=c[b+8>>2]|0;Mh(k+i|0,e|0,d|0)|0;e=i+d|0;if(!(a[b>>0]&1))a[b>>0]=e<<1;else c[b+4>>2]=e;a[k+e>>0]=0}return b|0}function yf(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;do if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)==(e|0)?(g=d+28|0,(c[g>>2]|0)!=1):0)c[g>>2]=f}else if((b|0)==(c[d>>2]|0)){if((c[d+16>>2]|0)!=(e|0)?(g=d+20|0,(c[g>>2]|0)!=(e|0)):0){c[d+32>>2]=f;c[g>>2]=e;g=d+40|0;c[g>>2]=(c[g>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0)a[d+54>>0]=1;c[d+44>>2]=4;break}if((f|0)==1)c[d+32>>2]=1}while(0);return}function sf(b,d,e,f,g,h,i){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0;if((1073741807-d|0)>>>0<e>>>0)um(b);if(!(a[b>>0]&1))j=b+4|0;else j=c[b+8>>2]|0;if(d>>>0<536870887){k=e+d|0;e=d<<1;l=k>>>0<e>>>0?e:k;m=l>>>0<2?2:l+4&-4}else m=1073741807;l=Ph(m<<2)|0;if(g)Ei(l,j,g)|0;k=f-h|0;if((k|0)!=(g|0))Ei(l+(i+g<<2)|0,j+(h+g<<2)|0,k-g|0)|0;if((d|0)!=1)tp(j);c[b+8>>2]=l;c[b>>2]=m|1;return}function $f(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0;a:do if((e|0)==(f|0)){g=b;h=6}else{a=e;i=b;while(1){if((i|0)==(d|0)){j=-1;break a}k=c[i>>2]|0;l=c[a>>2]|0;if((k|0)<(l|0)){j=-1;break a}if((l|0)<(k|0)){j=1;break a}k=i+4|0;a=a+4|0;if((a|0)==(f|0)){g=k;h=6;break}else i=k}}while(0);if((h|0)==6)j=(g|0)!=(d|0)&1;return j|0}function Kf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=a+12|0;f=a+16|0;a:do if((d|0)>0){g=b;h=0;while(1){i=c[e>>2]|0;if(i>>>0>=(c[f>>2]|0)>>>0){j=Wb[c[(c[a>>2]|0)+40>>2]&63](a)|0;if((j|0)==-1){k=h;break a}else l=j}else{c[e>>2]=i+4;l=c[i>>2]|0}c[g>>2]=l;i=h+1|0;if((i|0)<(d|0)){g=g+4|0;h=i}else{k=i;break}}}else k=0;while(0);return k|0}
function Of(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;a:do switch(c[e+4>>2]&176|0){case 16:{f=a[b>>0]|0;switch(f<<24>>24){case 43:case 45:{g=b+1|0;break a;break}default:{}}if((d-b|0)>1&f<<24>>24==48){switch(a[b+1>>0]|0){case 88:case 120:break;default:{h=7;break a}}g=b+2|0}else h=7;break}case 32:{g=d;break}default:h=7}while(0);if((h|0)==7)g=b;return g|0}function xf(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a[b>>0]|0;f=(e&1)!=0;if(f){g=(c[b>>2]&-2)+-1|0;h=c[b+4>>2]|0}else{g=1;h=(e&255)>>>1}if((h|0)==(g|0)){sf(b,g,1,g,g,0,0);if(!(a[b>>0]&1))i=7;else i=8}else if(f)i=8;else i=7;if((i|0)==7){a[b>>0]=(h<<1)+2;j=b+4|0;k=h+1|0}else if((i|0)==8){i=c[b+8>>2]|0;f=h+1|0;c[b+4>>2]=f;j=i;k=f}c[j+(h<<2)>>2]=d;c[j+(k<<2)>>2]=0;return}function Yf(a,b){a=+a;b=b|0;var d=0,e=0,f=0,g=0,i=0.0,j=0.0,l=0,m=0.0;h[k>>3]=a;d=c[k>>2]|0;e=c[k+4>>2]|0;f=ek(d|0,e|0,52)|0;g=f&2047;switch(g|0){case 0:{if(a!=0.0){i=+Yf(a*18446744073709552.0e3,b);j=i;l=(c[b>>2]|0)+-64|0}else{j=a;l=0}c[b>>2]=l;m=j;return +m}case 2047:{m=a;return +m}default:{c[b>>2]=g+-1022;c[k>>2]=d;c[k+4>>2]=e&-2146435073|1071644672;m=+h[k>>3];return +m}}return +(0.0)}function Nf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0;f=b+12|0;g=b+16|0;a:do if((e|0)>0){h=d;i=0;while(1){j=c[f>>2]|0;if(j>>>0<(c[g>>2]|0)>>>0){c[f>>2]=j+1;k=a[j>>0]|0}else{j=Wb[c[(c[b>>2]|0)+40>>2]&63](b)|0;if((j|0)==-1){l=i;break a}k=j&255}a[h>>0]=k;j=i+1|0;if((j|0)<(e|0)){h=h+1|0;i=j}else{l=j;break}}}else l=0;while(0);return l|0}function ef(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;i=i+16|0;f=e;ji(f,b);a:do if(a[f>>0]|0){g=c[b+((c[(c[b>>2]|0)+-12>>2]|0)+24)>>2]|0;h=g;do if(g){j=h+24|0;k=c[j>>2]|0;if((k|0)==(c[h+28>>2]|0))if((bc[c[(c[g>>2]|0)+52>>2]&15](h,d&255)|0)==-1)break;else break a;else{c[j>>2]=k+1;a[k>>0]=d;break a}}while(0);h=b+((c[(c[b>>2]|0)+-12>>2]|0)+16)|0;c[h>>2]=c[h>>2]|1}while(0);rg(f);i=e;return b|0}function vf(b,d,e,f,g,h,i){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0;if((-17-d|0)>>>0<e>>>0)um(b);if(!(a[b>>0]&1))j=b+1|0;else j=c[b+8>>2]|0;if(d>>>0<2147483623){k=e+d|0;e=d<<1;l=k>>>0<e>>>0?e:k;m=l>>>0<11?11:l+16&-16}else m=-17;l=Ph(m)|0;if(g)sh(l|0,j|0,g|0)|0;k=f-h|0;if((k|0)!=(g|0))sh(l+(i+g)|0,j+(h+g)|0,k-g|0)|0;if((d|0)!=10)tp(j);c[b+8>>2]=l;c[b>>2]=m|1;return}function Af(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;i=i+64|0;f=e;if((a|0)!=(b|0))if((b|0)!=0?(g=qe(b,72,88,0)|0,(g|0)!=0):0){b=f;h=b+56|0;do{c[b>>2]=0;b=b+4|0}while((b|0)<(h|0));c[f>>2]=g;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;dc[c[(c[g>>2]|0)+28>>2]&7](g,f,c[d>>2]|0,1);if((c[f+24>>2]|0)==1){c[d>>2]=c[f+16>>2];j=1}else j=0;k=j}else k=0;else k=1;i=e;return k|0}function zf(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a[b>>0]|0;f=(e&1)!=0;if(f){g=(c[b>>2]&-2)+-1|0;h=c[b+4>>2]|0}else{g=10;h=(e&255)>>>1}if((h|0)==(g|0)){vf(b,g,1,g,g,0,0);if(!(a[b>>0]&1))i=7;else i=8}else if(f)i=8;else i=7;if((i|0)==7){a[b>>0]=(h<<1)+2;j=b+1|0;k=h+1|0}else if((i|0)==8){i=c[b+8>>2]|0;f=h+1|0;c[b+4>>2]=f;j=i;k=f}a[j+h>>0]=d;a[j+k>>0]=0;return}function Tf(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0;g=b+24|0;h=b+28|0;a:do if((f|0)>0){i=e;j=0;while(1){k=c[g>>2]|0;if(k>>>0>=(c[h>>2]|0)>>>0){if((bc[c[(c[b>>2]|0)+52>>2]&15](b,d[i>>0]|0)|0)==-1){l=j;break a}}else{m=a[i>>0]|0;c[g>>2]=k+1;a[k>>0]=m}m=j+1|0;if((m|0)<(f|0)){i=i+1|0;j=m}else{l=m;break}}}else l=0;while(0);return l|0}function Sf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a+24|0;f=a+28|0;a:do if((d|0)>0){g=b;h=0;while(1){i=c[e>>2]|0;if(i>>>0>=(c[f>>2]|0)>>>0){if((bc[c[(c[a>>2]|0)+52>>2]&15](a,c[g>>2]|0)|0)==-1){j=h;break a}}else{k=c[g>>2]|0;c[e>>2]=i+4;c[i>>2]=k}k=h+1|0;if((k|0)<(d|0)){g=g+4|0;h=k}else{j=k;break}}}else j=0;while(0);return j|0}function uf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;f=a[b>>0]|0;if(!(f&1)){g=10;h=f}else{f=c[b>>2]|0;g=(f&-2)+-1|0;h=f&255}f=(h&1)==0;do if(g>>>0>=e>>>0){if(f)i=b+1|0;else i=c[b+8>>2]|0;ti(i|0,d|0,e|0)|0;a[i+e>>0]=0;if(!(a[b>>0]&1)){a[b>>0]=e<<1;break}else{c[b+4>>2]=e;break}}else{if(f)j=(h&255)>>>1;else j=c[b+4>>2]|0;af(b,g,e-g|0,j,0,j,e,d)}while(0);return b|0}function Ue(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;d=i;i=i+32|0;e=d;f=c[a+8>>2]|0;g=c[a+4>>2]|0;if(f-g>>2>>>0<b>>>0){h=c[a>>2]|0;j=g-h>>2;g=j+b|0;if(g>>>0>1073741823)vm(a);k=f-h|0;if(k>>2>>>0<536870911){h=k>>1;l=h>>>0<g>>>0?g:h}else l=1073741823;rh(e,l,j,a+16|0);j=e+8|0;l=c[j>>2]|0;Mh(l|0,0,b<<2|0)|0;c[j>>2]=l+(b<<2);cg(a,e);qh(e)}else Ai(a,b);i=d;return}function wf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;f=a[b>>0]|0;if(!(f&1)){g=1;h=f}else{f=c[b>>2]|0;g=(f&-2)+-1|0;h=f&255}f=(h&1)==0;do if(g>>>0>=e>>>0){if(f)i=b+4|0;else i=c[b+8>>2]|0;hh(i,d,e)|0;c[i+(e<<2)>>2]=0;if(!(a[b>>0]&1)){a[b>>0]=e<<1;break}else{c[b+4>>2]=e;break}}else{if(f)j=(h&255)>>>1;else j=c[b+4>>2]|0;Ze(b,g,e-g|0,j,0,j,e,d)}while(0);return b|0}function gf(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;m=j+4|0;n=j;o=b+8|0;p=Wb[c[(c[o>>2]|0)+20>>2]&63](o)|0;c[m>>2]=c[d>>2];c[n>>2]=c[e>>2];e=a[p>>0]|0;d=(e&1)==0;o=p+4|0;q=d?o:c[p+8>>2]|0;p=q+((d?(e&255)>>>1:c[o>>2]|0)<<2)|0;c[l>>2]=c[m>>2];c[k>>2]=c[n>>2];n=qc(b,l,k,f,g,h,q,p)|0;i=j;return n|0}function kf(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;m=j+4|0;n=j;o=b+8|0;p=Wb[c[(c[o>>2]|0)+20>>2]&63](o)|0;c[m>>2]=c[d>>2];c[n>>2]=c[e>>2];e=a[p>>0]|0;d=(e&1)==0;o=d?p+1|0:c[p+8>>2]|0;q=o+(d?(e&255)>>>1:c[p+4>>2]|0)|0;c[l>>2]=c[m>>2];c[k>>2]=c[n>>2];n=rc(b,l,k,f,g,h,o,q)|0;i=j;return n|0}function Gf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a+4|0;f=(c[e>>2]|0)!=100;g=c[a>>2]|0;h=g;i=(c[d>>2]|0)-h|0;j=i>>>0<2147483647?i<<1:-1;i=(c[b>>2]|0)-h>>2;h=nh(f?g:0,j)|0;if(!h)Zl();if(!f){f=c[a>>2]|0;c[a>>2]=h;if(!f)k=h;else{Sb[c[e>>2]&127](f);k=c[a>>2]|0}}else{c[a>>2]=h;k=h}c[e>>2]=111;c[b>>2]=k+(i<<2);c[d>>2]=(c[a>>2]|0)+(j>>>2<<2);return}function Ff(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a+4|0;f=(c[e>>2]|0)!=100;g=c[a>>2]|0;h=g;i=(c[d>>2]|0)-h|0;j=i>>>0<2147483647?i<<1:-1;i=(c[b>>2]|0)-h>>2;h=nh(f?g:0,j)|0;if(!h)Zl();if(!f){f=c[a>>2]|0;c[a>>2]=h;if(!f)k=h;else{Sb[c[e>>2]&127](f);k=c[a>>2]|0}}else{c[a>>2]=h;k=h}c[e>>2]=111;c[b>>2]=k+(i<<2);c[d>>2]=(c[a>>2]|0)+(j>>>2<<2);return}function Df(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;f=d;g=e-f|0;h=g>>2;if(h>>>0>1073741807)um(b);if(h>>>0<2){a[b>>0]=g>>>1;i=b+4|0}else{g=h+4&-4;j=Ph(g<<2)|0;c[b+8>>2]=j;c[b>>2]=g|1;c[b+4>>2]=h;i=j}j=(e-f|0)>>>2;if((d|0)!=(e|0)){f=d;d=i;while(1){c[d>>2]=c[f>>2];f=f+4|0;if((f|0)==(e|0))break;else d=d+4|0}}c[i+(j<<2)>>2]=0;return}function Lf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a+4|0;f=(c[e>>2]|0)!=100;g=c[a>>2]|0;h=g;i=(c[d>>2]|0)-h|0;j=i>>>0<2147483647?i<<1:-1;i=(c[b>>2]|0)-h|0;h=nh(f?g:0,j)|0;if(!h)Zl();if(!f){f=c[a>>2]|0;c[a>>2]=h;if(!f)k=h;else{Sb[c[e>>2]&127](f);k=c[a>>2]|0}}else{c[a>>2]=h;k=h}c[e>>2]=111;c[b>>2]=k+i;c[d>>2]=(c[a>>2]|0)+j;return}function Se(b){b=b|0;var d=0,e=0,f=0,h=0.0,j=0,k=0;d=i;i=i+16|0;e=d;f=gb()|0;h=+(f-(c[b+12>>2]|0)|0)/+g[b+16>>2]/1.0e6;f=a[b>>0]|0;j=(f&1)==0;k=le(xe(le(le(3320,j?b+1|0:c[b+8>>2]|0,j?(f&255)>>>1:c[b+4>>2]|0)|0,9728,2)|0,h)|0,9856,5)|0;c[e>>2]=fk(k+(c[(c[k>>2]|0)+-12>>2]|0)|0)|0;f=bk(e,5928)|0;j=bc[c[(c[f>>2]|0)+28>>2]&15](f,10)|0;zm(e);ef(k,j)|0;lg(k)|0;ul(b);i=d;return}function og(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+8|0;g=f|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;m=Oj(h^a,j^b,h,j)|0;b=G;ad(m,b,Oj(k^d,l^e,k,l)|0,G,g)|0;l=Oj(c[g>>2]^h,c[g+4>>2]^j,h,j)|0;j=G;i=f;return (G=j,l)|0}function Hf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;f=d;g=e-f|0;if(g>>>0>4294967279)um(b);if(g>>>0<11){a[b>>0]=g<<1;h=b+1|0}else{i=g+16&-16;j=Ph(i)|0;c[b+8>>2]=j;c[b>>2]=i|1;c[b+4>>2]=g;h=j}j=e-f|0;if((d|0)!=(e|0)){f=d;d=h;while(1){a[d>>0]=a[f>>0]|0;f=f+1|0;if((f|0)==(e|0))break;else d=d+1|0}}a[h+j>>0]=0;return}function hh(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=(d|0)==0;if(a-b>>2>>>0<d>>>0){if(e)return a|0;else f=d;do{f=f+-1|0;c[a+(f<<2)>>2]=c[b+(f<<2)>>2]}while((f|0)!=0);return a|0}else{if(e)return a|0;else{g=b;h=a;i=d}while(1){i=i+-1|0;c[h>>2]=c[g>>2];if(!i)break;else{g=g+4|0;h=h+4|0}}return a|0}return 0}function Wg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0.0,j=0;d=i;i=i+112|0;e=d;f=e;g=f+112|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(g|0));f=e+4|0;c[f>>2]=a;g=e+8|0;c[g>>2]=-1;c[e+44>>2]=a;c[e+76>>2]=-1;Di(e,0);h=+gc(e,2,1);j=(c[f>>2]|0)-(c[g>>2]|0)+(c[e+108>>2]|0)|0;if(!b){i=d;return +h}c[b>>2]=(j|0)!=0?a+j|0:a;i=d;return +h}function rg(a){a=a|0;var b=0,d=0;b=a+4|0;a=c[b>>2]|0;d=c[(c[a>>2]|0)+-12>>2]|0;if(((((c[a+(d+24)>>2]|0)!=0?(c[a+(d+16)>>2]|0)==0:0)?(c[a+(d+4)>>2]&8192|0)!=0:0)?!(db()|0):0)?(d=c[b>>2]|0,a=c[d+((c[(c[d>>2]|0)+-12>>2]|0)+24)>>2]|0,(Wb[c[(c[a>>2]|0)+24>>2]&63](a)|0)==-1):0){a=c[b>>2]|0;b=a+((c[(c[a>>2]|0)+-12>>2]|0)+16)|0;c[b>>2]=c[b>>2]|1}return}function qg(a){a=a|0;var b=0,d=0;b=a+4|0;a=c[b>>2]|0;d=c[(c[a>>2]|0)+-12>>2]|0;if(((((c[a+(d+24)>>2]|0)!=0?(c[a+(d+16)>>2]|0)==0:0)?(c[a+(d+4)>>2]&8192|0)!=0:0)?!(db()|0):0)?(d=c[b>>2]|0,a=c[d+((c[(c[d>>2]|0)+-12>>2]|0)+24)>>2]|0,(Wb[c[(c[a>>2]|0)+24>>2]&63](a)|0)==-1):0){a=c[b>>2]|0;b=a+((c[(c[a>>2]|0)+-12>>2]|0)+16)|0;c[b>>2]=c[b>>2]|1}return}function sh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return ab(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if(!e)return f|0;a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function nh(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if(!a){d=fc(b)|0;return d|0}if(b>>>0>4294967231){c[(tb()|0)>>2]=12;d=0;return d|0}e=Cc(a+-8|0,b>>>0<11?16:b+11&-8)|0;if(e){d=e+8|0;return d|0}e=fc(b)|0;if(!e){d=0;return d|0}f=c[a+-4>>2]|0;g=(f&-8)-((f&3|0)==0?8:4)|0;sh(e|0,a|0,(g>>>0<b>>>0?g:b)|0)|0;kc(a);d=e;return d|0}function jh(b){b=b|0;var d=0,e=0,f=0,g=0;d=b+74|0;e=a[d>>0]|0;a[d>>0]=e+255|e;e=b+20|0;d=b+44|0;if((c[e>>2]|0)>>>0>(c[d>>2]|0)>>>0)Pb[c[b+36>>2]&31](b,0,0)|0;c[b+16>>2]=0;c[b+28>>2]=0;c[e>>2]=0;e=c[b>>2]|0;if(!(e&20)){f=c[d>>2]|0;c[b+8>>2]=f;c[b+4>>2]=f;g=0;return g|0}if(!(e&4)){g=-1;return g|0}c[b>>2]=e|32;g=-1;return g|0}function eg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0.0,k=0,l=0.0;e=i;i=i+16|0;f=e;do if((a|0)!=(b|0)){g=tb()|0;h=c[g>>2]|0;c[g>>2]=0;j=+Wg(a,f,jk()|0);k=c[g>>2]|0;if(!k)c[g>>2]=h;if((c[f>>2]|0)!=(b|0)){c[d>>2]=4;l=0.0;break}if((k|0)==34){c[d>>2]=4;l=j}else l=j}else{c[d>>2]=4;l=0.0}while(0);i=e;return +l}function dg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0.0,k=0,l=0.0;e=i;i=i+16|0;f=e;do if((a|0)!=(b|0)){g=tb()|0;h=c[g>>2]|0;c[g>>2]=0;j=+Wg(a,f,jk()|0);k=c[g>>2]|0;if(!k)c[g>>2]=h;if((c[f>>2]|0)!=(b|0)){c[d>>2]=4;l=0.0;break}if((k|0)==34){c[d>>2]=4;l=j}else l=j}else{c[d>>2]=4;l=0.0}while(0);i=e;return +l}function cg(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=c[a>>2]|0;e=a+4|0;f=b+4|0;g=(c[e>>2]|0)-d|0;h=(c[f>>2]|0)+(0-(g>>2)<<2)|0;c[f>>2]=h;sh(h|0,d|0,g|0)|0;g=c[a>>2]|0;c[a>>2]=c[f>>2];c[f>>2]=g;g=b+8|0;d=c[e>>2]|0;c[e>>2]=c[g>>2];c[g>>2]=d;d=a+8|0;a=b+12|0;g=c[d>>2]|0;c[d>>2]=c[a>>2];c[a>>2]=g;c[b>>2]=c[f>>2];return}function Ag(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;i=i+16|0;f=e;g=fc(240)|0;do if(g){c[f>>2]=c[d>>2];h=_e(g,240,b,f)|0;if(h>>>0<240){j=nh(g,h+1|0)|0;c[a>>2]=(j|0)!=0?j:g;k=h;break}kc(g);if((h|0)>=0?(j=h+1|0,h=fc(j)|0,c[a>>2]=h,(h|0)!=0):0)k=_e(h,j,b,d)|0;else k=-1}else k=-1;while(0);i=e;return k|0}function ih(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+112|0;f=e;c[f>>2]=0;g=f+4|0;c[g>>2]=a;c[f+44>>2]=a;h=f+8|0;c[h>>2]=(a|0)<0?-1:a+2147483647|0;c[f+76>>2]=-1;Di(f,0);j=nc(f,d,1,0,-2147483648)|0;d=G;if(!b){G=d;i=e;return j|0}c[b>>2]=a+((c[g>>2]|0)+(c[f+108>>2]|0)-(c[h>>2]|0));G=d;i=e;return j|0}function ng(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0.0,h=0,j=0,k=0.0,l=0;e=i;i=i+16|0;f=e;do if((a|0)==(b|0)){c[d>>2]=4;g=0.0}else{h=tb()|0;j=c[h>>2]|0;c[h>>2]=0;k=+Wg(a,f,jk()|0);l=c[h>>2]|0;if(!l)c[h>>2]=j;if((c[f>>2]|0)!=(b|0)){c[d>>2]=4;g=0.0;break}if((l|0)==34)c[d>>2]=4;g=k}while(0);i=e;return +g}function eh(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0;a:do if(!(a[b+44>>0]|0))if((f|0)>0){g=e;h=0;while(1){if((bc[c[(c[b>>2]|0)+52>>2]&15](b,d[g>>0]|0)|0)==-1){i=h;break a}j=h+1|0;if((j|0)<(f|0)){g=g+1|0;h=j}else{i=j;break}}}else i=0;else i=Eb(e|0,1,f|0,c[b+32>>2]|0)|0;while(0);return i|0}function dh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;a:do if(!(a[b+44>>0]|0))if((e|0)>0){f=d;g=0;while(1){if((bc[c[(c[b>>2]|0)+52>>2]&15](b,c[f>>2]|0)|0)==-1){h=g;break a}i=g+1|0;if((i|0)<(e|0)){f=f+4|0;g=i}else{h=i;break}}}else h=0;else h=Eb(d|0,4,e|0,c[b+32>>2]|0)|0;while(0);return h|0}function lh(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+112|0;f=e;c[f>>2]=0;g=f+4|0;c[g>>2]=a;c[f+44>>2]=a;h=f+8|0;c[h>>2]=(a|0)<0?-1:a+2147483647|0;c[f+76>>2]=-1;Di(f,0);j=nc(f,d,1,-1,-1)|0;d=G;if(!b){G=d;i=e;return j|0}c[b>>2]=a+((c[g>>2]|0)+(c[f+108>>2]|0)-(c[h>>2]|0));G=d;i=e;return j|0}function pg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+128|0;j=h+16|0;k=h+12|0;l=h;m=h+8|0;c[k>>2]=j+100;wh(a,j,k,e,f,g);g=l;c[g>>2]=0;c[g+4>>2]=0;c[m>>2]=j;j=(c[d>>2]|0)-b>>2;g=Ya(c[a>>2]|0)|0;a=yc(b,m,j,l)|0;if(g)Ya(g|0)|0;c[d>>2]=b+(a<<2);i=h;return}function zh(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;i=Oj(e^a,f^b,e,f)|0;b=G;a=g^e;e=h^f;return Oj((ad(i,b,Oj(g^c,h^d,g,h)|0,G,0)|0)^a,G^e,a,e)|0}function If(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;h=i;i=i+16|0;j=h;k=fk(d)|0;c[j>>2]=k;d=bk(j,5928)|0;$b[c[(c[d>>2]|0)+32>>2]&7](d,12194,12226,e)|0;e=bk(j,6068)|0;a[f>>0]=Wb[c[(c[e>>2]|0)+12>>2]&63](e)|0;a[g>>0]=Wb[c[(c[e>>2]|0)+16>>2]&63](e)|0;Tb[c[(c[e>>2]|0)+20>>2]&63](b,e);_i(k)|0;i=h;return}function Ef(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;g=i;i=i+16|0;h=g;j=fk(b)|0;c[h>>2]=j;b=bk(h,5920)|0;$b[c[(c[b>>2]|0)+48>>2]&7](b,12194,12226,d)|0;d=bk(h,6076)|0;c[e>>2]=Wb[c[(c[d>>2]|0)+12>>2]&63](d)|0;c[f>>2]=Wb[c[(c[d>>2]|0)+16>>2]&63](d)|0;Tb[c[(c[d>>2]|0)+20>>2]&63](a,d);_i(j)|0;i=g;return}function Mh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;g=b&3;h=d|d<<8|d<<16|d<<24;i=f&~3;if(g){g=b+4-g|0;while((b|0)<(g|0)){a[b>>0]=d;b=b+1|0}}while((b|0)<(i|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b>>0]=d;b=b+1|0}return b-e|0}function qh(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=c[b+4>>2]|0;e=b+8|0;f=c[e>>2]|0;if((f|0)!=(d|0)){g=f;while(1){f=g+-4|0;if((f|0)==(d|0)){h=f;break}else g=f}c[e>>2]=h}h=c[b>>2]|0;do if(h){e=c[b+16>>2]|0;if((e|0)==(h|0)){a[e+112>>0]=0;break}else{tp(h);break}}while(0);return}function lg(b){b=b|0;var d=0,e=0,f=0;d=i;i=i+16|0;e=d;if(c[b+((c[(c[b>>2]|0)+-12>>2]|0)+24)>>2]|0){ji(e,b);if((a[e>>0]|0)!=0?(f=c[b+((c[(c[b>>2]|0)+-12>>2]|0)+24)>>2]|0,(Wb[c[(c[f>>2]|0)+24>>2]&63](f)|0)==-1):0){f=b+((c[(c[b>>2]|0)+-12>>2]|0)+16)|0;c[f>>2]=c[f>>2]|1}rg(e)}i=d;return b|0}function kg(b){b=b|0;var d=0,e=0,f=0;d=i;i=i+16|0;e=d;if(c[b+((c[(c[b>>2]|0)+-12>>2]|0)+24)>>2]|0){ii(e,b);if((a[e>>0]|0)!=0?(f=c[b+((c[(c[b>>2]|0)+-12>>2]|0)+24)>>2]|0,(Wb[c[(c[f>>2]|0)+24>>2]&63](f)|0)==-1):0){f=b+((c[(c[b>>2]|0)+-12>>2]|0)+16)|0;c[f>>2]=c[f>>2]|1}qg(e)}i=d;return b|0}function Bh(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;a:do if((e|0)==(f|0))g=f;else{a=e;while(1){h=c[a>>2]|0;if(h>>>0>=128){g=a;break a}if(!((b[(c[(Ga()|0)>>2]|0)+(h<<1)>>1]&d)<<16>>16)){g=a;break a}a=a+4|0;if((a|0)==(f|0)){g=f;break}}}while(0);return g|0}function tf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;a:do if((b|0)!=(c[d+8>>2]|0)){g=c[b+12>>2]|0;h=b+16+(g<<3)|0;Sh(b+16|0,d,e,f);if((g|0)>1){g=d+54|0;i=b+24|0;do{Sh(i,d,e,f);if(a[g>>0]|0)break a;i=i+8|0}while(i>>>0<h>>>0)}}else ph(0,d,e,f);while(0);return}function kh(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;d=a+4|0;e=c[d>>2]|0;f=c[a>>2]|0;g=e-f>>2;if(g>>>0>=b>>>0){if(g>>>0>b>>>0?(h=f+(b<<2)|0,(e|0)!=(h|0)):0){f=e;while(1){e=f+-4|0;if((e|0)==(h|0)){i=e;break}else f=e}c[d>>2]=i}}else Ue(a,b-g|0);return}function rh(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;c[b+12>>2]=0;c[b+16>>2]=f;do if(d){g=f+112|0;if(d>>>0<29&(a[g>>0]|0)==0){a[g>>0]=1;h=f;break}else{h=Ph(d<<2)|0;break}}else h=0;while(0);c[b>>2]=h;f=h+(e<<2)|0;c[b+8>>2]=f;c[b+4>>2]=f;c[b+12>>2]=h+(d<<2);return}function ph(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;b=d+16|0;g=c[b>>2]|0;do if(g){if((g|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;c[d+24>>2]=2;a[d+54>>0]=1;break}h=d+24|0;if((c[h>>2]|0)==2)c[h>>2]=f}else{c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1}while(0);return}function vh(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=c[b>>2]|0;do if(d){e=b+4|0;f=c[e>>2]|0;if((f|0)!=(d|0)){g=f;while(1){f=g+-4|0;if((f|0)==(d|0)){h=f;break}else g=f}c[e>>2]=h}if((b+16|0)==(d|0)){a[b+128>>0]=0;break}else{tp(d);break}}while(0);return}function Qf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;h=i;i=i+16|0;j=h+4|0;k=h;l=a+8|0;a=Wb[c[(c[l>>2]|0)+4>>2]&63](l)|0;c[k>>2]=c[e>>2];c[j>>2]=c[k>>2];k=(Ac(d,j,a,a+288|0,g,f,0)|0)-a|0;if((k|0)<288)c[b>>2]=((k|0)/12|0|0)%12|0;i=h;return}function Pf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;h=i;i=i+16|0;j=h+4|0;k=h;l=a+8|0;a=Wb[c[(c[l>>2]|0)+4>>2]&63](l)|0;c[k>>2]=c[e>>2];c[j>>2]=c[k>>2];k=(wc(d,j,a,a+288|0,g,f,0)|0)-a|0;if((k|0)<288)c[b>>2]=((k|0)/12|0|0)%12|0;i=h;return}function wh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;j=i;i=i+16|0;k=j;a[k>>0]=37;l=k+1|0;a[l>>0]=g;m=k+2|0;a[m>>0]=h;a[k+3>>0]=0;if(h<<24>>24){a[l>>0]=h;a[m>>0]=g}c[e>>2]=d+(Ua(d|0,(c[e>>2]|0)-d|0,k|0,f|0,c[b>>2]|0)|0);i=j;return}function _f(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;h=i;i=i+16|0;j=h+4|0;k=h;l=a+8|0;a=Wb[c[c[l>>2]>>2]&63](l)|0;c[k>>2]=c[e>>2];c[j>>2]=c[k>>2];k=(Ac(d,j,a,a+168|0,g,f,0)|0)-a|0;if((k|0)<168)c[b>>2]=((k|0)/12|0|0)%7|0;i=h;return}function Zf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;h=i;i=i+16|0;j=h+4|0;k=h;l=a+8|0;a=Wb[c[c[l>>2]>>2]&63](l)|0;c[k>>2]=c[e>>2];c[j>>2]=c[k>>2];k=(wc(d,j,a,a+168|0,g,f,0)|0)-a|0;if((k|0)<168)c[b>>2]=((k|0)/12|0|0)%7|0;i=h;return}function Nh(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;a:do if((e|0)==(f|0))g=f;else{a=e;while(1){h=c[a>>2]|0;if(h>>>0<128?(b[(c[(Ga()|0)>>2]|0)+(h<<1)>>1]&d)<<16>>16!=0:0){g=a;break a}a=a+4|0;if((a|0)==(f|0)){g=f;break}}}while(0);return g|0}function ig(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,4)|0;if(!(c[f>>2]&4)){if((j|0)<69)k=j+2e3|0;else k=(j+-69|0)>>>0<31?j+1900|0:j;c[b>>2]=k+-1900}i=a;return}function hg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,4)|0;if(!(c[f>>2]&4)){if((j|0)<69)k=j+2e3|0;else k=(j+-69|0)>>>0<31?j+1900|0:j;c[b>>2]=k+-1900}i=a;return}function fg(b){b=b|0;if((a[1864]|0)==0?(Ha(1864)|0)!=0:0){if((a[1872]|0)==0?(Ha(1872)|0)!=0:0){b=8536;do{c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;b=b+12|0}while((b|0)!=8824);wb(107,0,n|0)|0;Qa(1872)}Xj(8536,13909)|0;Xj(8548,13912)|0;c[2206]=8536;Qa(1864)}return c[2206]|0}function Kh(a,d,f,g){a=a|0;d=d|0;f=f|0;g=g|0;var h=0,i=0,j=0;a=(f-d|0)>>>2;if((d|0)!=(f|0)){h=d;i=g;while(1){g=c[h>>2]|0;if(g>>>0<128)j=e[(c[(Ga()|0)>>2]|0)+(g<<1)>>1]|0;else j=0;b[i>>1]=j;h=h+4|0;if((h|0)==(f|0))break;else i=i+2|0}}return d+(a<<2)|0}function gg(b){b=b|0;if((a[1880]|0)==0?(Ha(1880)|0)!=0:0){if((a[1888]|0)==0?(Ha(1888)|0)!=0:0){b=8828;do{c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;b=b+12|0}while((b|0)!=9116);wb(108,0,n|0)|0;Qa(1888)}_j(8828,9116)|0;_j(8840,9128)|0;c[2285]=8828;Qa(1880)}return c[2285]|0}function Vh(b){b=b|0;var d=0,e=0,f=0;d=b+74|0;e=a[d>>0]|0;a[d>>0]=e+255|e;e=c[b>>2]|0;if(!(e&8)){c[b+8>>2]=0;c[b+4>>2]=0;d=c[b+44>>2]|0;c[b+28>>2]=d;c[b+20>>2]=d;c[b+16>>2]=d+(c[b+48>>2]|0);f=0;return f|0}else{c[b>>2]=e|32;f=-1;return f|0}return 0}function mh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=a[b>>0]|0;g=(f&1)==0;if(g)h=(f&255)>>>1;else h=c[b+4>>2]|0;do if(h>>>0>=d>>>0)if(g){a[b+1+d>>0]=0;a[b>>0]=d<<1;break}else{a[(c[b+8>>2]|0)+d>>0]=0;c[b+4>>2]=d;break}else pf(b,d-h|0,e)|0;while(0);return}function mg(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;g=i;i=i+16|0;h=g;j=fk(d)|0;c[h>>2]=j;d=bk(h,5928)|0;$b[c[(c[d>>2]|0)+32>>2]&7](d,12194,12220,e)|0;e=bk(h,6068)|0;a[f>>0]=Wb[c[(c[e>>2]|0)+16>>2]&63](e)|0;Tb[c[(c[e>>2]|0)+20>>2]&63](b,e);_i(j)|0;i=g;return}function jg(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f;h=fk(b)|0;c[g>>2]=h;b=bk(g,5920)|0;$b[c[(c[b>>2]|0)+48>>2]&7](b,12194,12220,d)|0;d=bk(g,6076)|0;c[e>>2]=Wb[c[(c[d>>2]|0)+16>>2]&63](d)|0;Tb[c[(c[d>>2]|0)+20>>2]&63](a,d);_i(h)|0;i=f;return}function sg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=rc(a,k,j,e,f,g,13603,13611)|0;i=h;return m|0}function tg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=qc(a,k,j,e,f,g,6496,6528)|0;i=h;return m|0}function Pg(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;c[a>>2]=5904;b=a+8|0;d=a+12|0;e=c[b>>2]|0;if((c[d>>2]|0)!=(e|0)){f=e;e=0;do{g=c[f+(e<<2)>>2]|0;if(g)_i(g)|0;e=e+1|0;f=c[b>>2]|0}while(e>>>0<(c[d>>2]|0)-f>>2>>>0)}ul(a+144|0);vh(b);return}function bg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+8|0;k=h+4|0;l=h;m=fk(e)|0;c[k>>2]=m;e=bk(k,5928)|0;_i(m)|0;c[l>>2]=c[d>>2];c[j>>2]=c[l>>2];ig(a,g+20|0,b,j,f,e);i=h;return c[b>>2]|0}function ag(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+8|0;k=h+4|0;l=h;m=fk(e)|0;c[k>>2]=m;e=bk(k,5920)|0;_i(m)|0;c[l>>2]=c[d>>2];c[j>>2]=c[l>>2];hg(a,g+20|0,b,j,f,e);i=h;return c[b>>2]|0}function Xf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+8|0;k=h+4|0;l=h;m=fk(e)|0;c[k>>2]=m;e=bk(k,5928)|0;_i(m)|0;c[l>>2]=c[d>>2];c[j>>2]=c[l>>2];_f(a,g+24|0,b,j,f,e);i=h;return c[b>>2]|0}function Wf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+8|0;k=h+4|0;l=h;m=fk(e)|0;c[k>>2]=m;e=bk(k,5928)|0;_i(m)|0;c[l>>2]=c[d>>2];c[j>>2]=c[l>>2];Qf(a,g+16|0,b,j,f,e);i=h;return c[b>>2]|0}function Vf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+8|0;k=h+4|0;l=h;m=fk(e)|0;c[k>>2]=m;e=bk(k,5920)|0;_i(m)|0;c[l>>2]=c[d>>2];c[j>>2]=c[l>>2];Zf(a,g+24|0,b,j,f,e);i=h;return c[b>>2]|0}function Uf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+8|0;k=h+4|0;l=h;m=fk(e)|0;c[k>>2]=m;e=bk(k,5920)|0;_i(m)|0;c[l>>2]=c[d>>2];c[j>>2]=c[l>>2];Pf(a,g+16|0,b,j,f,e);i=h;return c[b>>2]|0}function gh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f+4|0;h=f;Ui(b);c[b>>2]=4400;c[b+32>>2]=d;cl(g,b+4|0);c[h>>2]=c[g>>2];g=bk(h,5988)|0;zm(h);c[b+36>>2]=g;c[b+40>>2]=e;a[b+44>>0]=(Wb[c[(c[g>>2]|0)+28>>2]&63](g)|0)&1;i=f;return}function fh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f+4|0;h=f;Ti(b);c[b>>2]=4272;c[b+32>>2]=d;cl(g,b+4|0);c[h>>2]=c[g>>2];g=bk(h,5996)|0;zm(h);c[b+36>>2]=g;c[b+40>>2]=e;a[b+44>>0]=(Wb[c[(c[g>>2]|0)+28>>2]&63](g)|0)&1;i=f;return}function zg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Tc(a,k,j,e,f,g)|0;i=h;return m|0}function yg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Sc(a,k,j,e,f,g)|0;i=h;return m|0}function xg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Rc(a,k,j,e,f,g)|0;i=h;return m|0}function wg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Gc(a,k,j,e,f,g)|0;i=h;return m|0}function vg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Fc(a,k,j,e,f,g)|0;i=h;return m|0}function ug(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Ec(a,k,j,e,f,g)|0;i=h;return m|0}function Mg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Zc(a,k,j,e,f,g)|0;i=h;return m|0}function Lg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Vc(a,k,j,e,f,g)|0;i=h;return m|0}function Kg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Oc(a,k,j,e,f,g)|0;i=h;return m|0}function Jg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Jc(a,k,j,e,f,g)|0;i=h;return m|0}function Ig(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Xc(a,k,j,e,f,g)|0;i=h;return m|0}function Hg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Wc(a,k,j,e,f,g)|0;i=h;return m|0}function Gg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Uc(a,k,j,e,f,g)|0;i=h;return m|0}function Fg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Lc(a,k,j,e,f,g)|0;i=h;return m|0}function Eg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Kc(a,k,j,e,f,g)|0;i=h;return m|0}function Dg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Ic(a,k,j,e,f,g)|0;i=h;return m|0}function Cg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Yc(a,k,j,e,f,g)|0;i=h;return m|0}function Bg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;j=h+12|0;k=h+8|0;l=h+4|0;m=h;c[l>>2]=c[b>>2];c[m>>2]=c[d>>2];c[k>>2]=c[l>>2];c[j>>2]=c[m>>2];m=Mc(a,k,j,e,f,g)|0;i=h;return m|0}function oh(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;Rl(b);e=a+8|0;f=c[e>>2]|0;if((c[a+12>>2]|0)-f>>2>>>0>d>>>0)g=f;else{kh(e,d+1|0);g=c[e>>2]|0}f=c[g+(d<<2)>>2]|0;if(!f)h=g;else{_i(f)|0;h=c[e>>2]|0}c[h+(d<<2)>>2]=b;return}function Sg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j+-1|0)>>>0<31&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Qg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j+-1|0)>>>0<31&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Og(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j+-1|0)>>>0<12&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Ng(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j+-1|0)>>>0<12&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Vg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<13&(g&4|0)==0)c[b>>2]=j+-1;else c[f>>2]=g|4;i=a;return}function Ug(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<13&(g&4|0)==0)c[b>>2]=j+-1;else c[f>>2]=g|4;i=a;return}function gi(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=a+84|0;f=c[e>>2]|0;g=d+256|0;h=Wd(f,0,g)|0;i=(h|0)==0?g:h-f|0;h=i>>>0<d>>>0?i:d;sh(b|0,f|0,h|0)|0;c[a+4>>2]=f+h;b=f+i|0;c[a+8>>2]=b;c[e>>2]=b;return h|0}function Tg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,3)|0;g=c[f>>2]|0;if((j|0)<366&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Rg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,3)|0;g=c[f>>2]|0;if((j|0)<366&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function ch(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<24&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function bh(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<24&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function ah(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<60&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function _h(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0;b=(e-d|0)>>>2;if((d|0)!=(e|0)){h=d;i=g;while(1){g=c[h>>2]|0;a[i>>0]=g>>>0<128?g&255:f;h=h+4|0;if((h|0)==(e|0))break;else i=i+1|0}}return d+(b<<2)|0}function Zg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<60&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Yg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<61&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function $g(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,2)|0;g=c[f>>2]|0;if((j|0)<61&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function _g(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,1)|0;g=c[f>>2]|0;if((j|0)<7&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function Xg(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,1)|0;g=c[f>>2]|0;if((j|0)<7&(g&4|0)==0)c[b>>2]=j;else c[f>>2]=g|4;i=a;return}function fi(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;if((c|0)==(d|0))e=0;else{b=0;f=c;while(1){c=(a[f>>0]|0)+(b<<4)|0;g=c&-268435456;h=(g>>>24|g)^c;f=f+1|0;if((f|0)==(d|0)){e=h;break}else b=h}}return e|0}function ei(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;if((b|0)==(d|0))e=0;else{a=0;f=b;while(1){b=(c[f>>2]|0)+(a<<4)|0;g=b&-268435456;h=(g>>>24|g)^b;f=f+4|0;if((f|0)==(d|0)){e=h;break}else a=h}}return e|0}function Ih(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(d>>>0>4294967279)um(b);if(d>>>0<11){a[b>>0]=d<<1;f=b+1|0}else{g=d+16&-16;h=Ph(g)|0;c[b+8>>2]=h;c[b>>2]=g|1;c[b+4>>2]=d;f=h}Mh(f|0,e|0,d|0)|0;a[f+d>>0]=0;return}function Gh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(e>>>0>4294967279)um(b);if(e>>>0<11){a[b>>0]=e<<1;f=b+1|0}else{g=e+16&-16;h=Ph(g)|0;c[b+8>>2]=h;c[b>>2]=g|1;c[b+4>>2]=e;f=h}sh(f|0,d|0,e|0)|0;a[f+e>>0]=0;return}function Uh(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;a=(d-b|0)>>>2;if((b|0)!=(d|0)){e=b;do{f=c[e>>2]|0;if(f>>>0<128)g=c[(c[(jb()|0)>>2]|0)+(f<<2)>>2]|0;else g=f;c[e>>2]=g;e=e+4|0}while((e|0)!=(d|0))}return b+(a<<2)|0}function Th(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;a=(d-b|0)>>>2;if((b|0)!=(d|0)){e=b;do{f=c[e>>2]|0;if(f>>>0<128)g=c[(c[(Oa()|0)>>2]|0)+(f<<2)>>2]|0;else g=f;c[e>>2]=g;e=e+4|0}while((e|0)!=(d|0))}return b+(a<<2)|0}function Jh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(d>>>0>1073741807)um(b);if(d>>>0<2){a[b>>0]=d<<1;f=b+4|0}else{g=d+4&-4;h=Ph(g<<2)|0;c[b+8>>2]=h;c[b>>2]=g|1;c[b+4>>2]=d;f=h}bj(f,e,d)|0;c[f+(d<<2)>>2]=0;return}function Hh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(e>>>0>1073741807)um(b);if(e>>>0<2){a[b>>0]=e<<1;f=b+4|0}else{g=e+4&-4;h=Ph(g<<2)|0;c[b+8>>2]=h;c[b>>2]=g|1;c[b+4>>2]=e;f=h}Ei(f,d,e)|0;c[f+(e<<2)>>2]=0;return}function di(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+112|0;f=e;g=f;h=g+112|0;do{c[g>>2]=0;g=g+4|0}while((g|0)<(h|0));c[f+32>>2]=22;c[f+44>>2]=a;c[f+76>>2]=-1;c[f+84>>2]=a;a=jc(f,b,d)|0;i=e;return a|0}function Lh(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0;h=c[a+4>>2]|0;i=h>>8;if(!(h&1))j=i;else j=c[(c[e>>2]|0)+i>>2]|0;i=c[a>>2]|0;ac[c[(c[i>>2]|0)+20>>2]&7](i,b,d,e+j|0,(h&2|0)!=0?f:2,g);return}function Fh(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=jd(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=c[a>>2];c[j>>2]=c[k>>2];i=b;return l|0}function Eh(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=Hd(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=c[a>>2];c[j>>2]=c[k>>2];i=b;return l|0}function Dh(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=gd(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=c[a>>2];c[j>>2]=c[k>>2];i=b;return l|0}function Ch(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=pd(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=c[a>>2];c[j>>2]=c[k>>2];i=b;return l|0}function Ph(a){a=a|0;var b=0,d=0,e=0;b=(a|0)==0?1:a;a=fc(b)|0;a:do if(!a){while(1){d=sn()|0;if(!d)break;Zb[d&3]();d=fc(b)|0;if(d){e=d;break a}}d=Ma(4)|0;c[d>>2]=2444;zb(d|0,40,3)}else e=a;while(0);return e|0}function ki(a,b){a=a|0;b=b|0;var d=0;c[a+24>>2]=b;c[a+16>>2]=(b|0)==0&1;c[a+20>>2]=0;c[a+4>>2]=4098;c[a+12>>2]=0;c[a+8>>2]=6;b=a+28|0;d=a+32|0;a=d+40|0;do{c[d>>2]=0;d=d+4|0}while((d|0)<(a|0));Gk(b);return}function Qh(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;g=c[a+4>>2]|0;h=g>>8;if(!(g&1))i=h;else i=c[(c[d>>2]|0)+h>>2]|0;h=c[a>>2]|0;Qb[c[(c[h>>2]|0)+24>>2]&3](h,b,d+i|0,(g&2|0)!=0?e:2,f);return}function pi(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;c=a&65535;d=b&65535;e=ca(d,c)|0;f=a>>>16;a=(e>>>16)+(ca(d,f)|0)|0;d=b>>>16;b=ca(d,c)|0;return (G=(a>>>16)+(ca(d,f)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|e&65535|0)|0}function Zh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((d|0)!=(e|0)){b=d;do{d=a[b>>0]|0;if(d<<24>>24>-1)f=c[(c[(jb()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255;else f=d;a[b>>0]=f;b=b+1|0}while((b|0)!=(e|0))}return e|0}function Yh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((d|0)!=(e|0)){b=d;do{d=a[b>>0]|0;if(d<<24>>24>-1)f=c[(c[(Oa()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255;else f=d;a[b>>0]=f;b=b+1|0}while((b|0)!=(e|0))}return e|0}function Ah(a,b,d){a=a|0;b=b|0;d=d|0;Va(9444)|0;if((c[a>>2]|0)==1)do Ba(9472,9444)|0;while((c[a>>2]|0)==1);if(!(c[a>>2]|0)){c[a>>2]=1;kb(9444)|0;Sb[d&127](b);Va(9444)|0;c[a>>2]=-1;kb(9444)|0;Bb(9472)|0}else kb(9444)|0;return}function yh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f+4|0;h=f;Ui(b);c[b>>2]=4464;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52>>0]=0;cl(g,b+4|0);c[h>>2]=c[g>>2];ai(b,h);zm(h);i=f;return}function xh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f+4|0;h=f;Ti(b);c[b>>2]=4336;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52>>0]=0;cl(g,b+4|0);c[h>>2]=c[g>>2];$h(b,h);zm(h);i=f;return}function ti(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b>>0]=a[c>>0]|0}b=e}else sh(b,c,d)|0;return b|0}function Rh(a){a=a|0;var b=0,d=0,e=0;b=a+8|0;a=Ya(c[b>>2]|0)|0;d=ve(0,0,4)|0;if(a)Ya(a|0)|0;if(!d){d=c[b>>2]|0;if(d){b=Ya(d|0)|0;if(!b)e=0;else{Ya(b|0)|0;e=0}}else e=1}else e=-1;return e|0}function bi(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=c[a+40>>2]|0;e=a+32|0;f=a+36|0;if(d){g=d;do{g=g+-1|0;Yb[c[(c[e>>2]|0)+(g<<2)>>2]&0](b,a,c[(c[f>>2]|0)+(g<<2)>>2]|0)}while((g|0)!=0)}return}function Sh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=c[a+4>>2]|0;g=f>>8;if(!(f&1))h=g;else h=c[(c[d>>2]|0)+g>>2]|0;g=c[a>>2]|0;dc[c[(c[g>>2]|0)+28>>2]&7](g,b,d+h|0,(f&2|0)!=0?e:2);return}function uh(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Dc(d,h,f,g,4)|0;if(!(c[f>>2]&4))c[b>>2]=j+-1900;i=a;return}function th(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;a=i;i=i+16|0;h=a+4|0;j=a;c[j>>2]=c[e>>2];c[h>>2]=c[j>>2];j=Nc(d,h,f,g,4)|0;if(!(c[f>>2]&4))c[b>>2]=j+-1900;i=a;return}function oi(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;if((c|0)!=(d|0)){b=c;c=f;while(1){f=a[b>>0]|0;a[c>>0]=f<<24>>24>-1?f:e;b=b+1|0;if((b|0)==(d|0))break;else c=c+1|0}}return d|0}function ee(a){a=a|0;ul(7708);ul(7696);ul(7684);ul(7672);ul(7660);ul(7648);ul(7636);ul(7624);ul(7612);ul(7600);ul(7588);ul(7576);ul(7564);ul(7552);ul(7540);ul(7528);ul(7516);ul(7504);ul(7492);ul(7480);ul(7468);ul(7456);ul(7444);ul(7432);return}function de(a){a=a|0;ul(8812);ul(8800);ul(8788);ul(8776);ul(8764);ul(8752);ul(8740);ul(8728);ul(8716);ul(8704);ul(8692);ul(8680);ul(8668);ul(8656);ul(8644);ul(8632);ul(8620);ul(8608);ul(8596);ul(8584);ul(8572);ul(8560);ul(8548);ul(8536);return}function ce(a){a=a|0;tl(9104);tl(9092);tl(9080);tl(9068);tl(9056);tl(9044);tl(9032);tl(9020);tl(9008);tl(8996);tl(8984);tl(8972);tl(8960);tl(8948);tl(8936);tl(8924);tl(8912);tl(8900);tl(8888);tl(8876);tl(8864);tl(8852);tl(8840);tl(8828);return}function Di(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;c[a+104>>2]=b;d=c[a+4>>2]|0;e=c[a+8>>2]|0;f=e-d|0;c[a+108>>2]=f;if((b|0)!=0&(f|0)>(b|0)){c[a+100>>2]=d+b;return}else{c[a+100>>2]=e;return}}function fe(a){a=a|0;tl(8e3);tl(7988);tl(7976);tl(7964);tl(7952);tl(7940);tl(7928);tl(7916);tl(7904);tl(7892);tl(7880);tl(7868);tl(7856);tl(7844);tl(7832);tl(7820);tl(7808);tl(7796);tl(7784);tl(7772);tl(7760);tl(7748);tl(7736);tl(7724);return}function Bi(b){b=b|0;var c=0;c=a[m+(b&255)>>0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)>>0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)>>0]|0;if((c|0)<8)return c+16|0;return (a[m+(b>>>24)>>0]|0)+24|0}function Wh(b,d){b=b|0;d=d|0;var e=0,f=0;if(d>>>0>1073741823)vm(b);e=b+128|0;if(d>>>0<29&(a[e>>0]|0)==0){a[e>>0]=1;f=b+16|0}else f=Ph(d<<2)|0;c[b+4>>2]=f;c[b>>2]=f;c[b+8>>2]=f+(d<<2);return}function ai(b,d){b=b|0;d=d|0;var e=0,f=0;e=bk(d,5988)|0;d=b+36|0;c[d>>2]=e;f=b+44|0;c[f>>2]=Wb[c[(c[e>>2]|0)+24>>2]&63](e)|0;e=c[d>>2]|0;a[b+53>>0]=(Wb[c[(c[e>>2]|0)+28>>2]&63](e)|0)&1;return}function $h(b,d){b=b|0;d=d|0;var e=0,f=0;e=bk(d,5996)|0;d=b+36|0;c[d>>2]=e;f=b+44|0;c[f>>2]=Wb[c[(c[e>>2]|0)+24>>2]&63](e)|0;e=c[d>>2]|0;a[b+53>>0]=(Wb[c[(c[e>>2]|0)+28>>2]&63](e)|0)&1;return}function Ei(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;if(!d)return a|0;else{e=d;f=b;g=a}while(1){e=e+-1|0;c[g>>2]=c[f>>2];if(!e)break;else{f=f+4|0;g=g+4|0}}return a|0}function qi(){var a=0,b=0;a=oj()|0;if(((a|0)!=0?(b=c[a>>2]|0,(b|0)!=0):0)?(a=b+48|0,(c[a>>2]&-256|0)==1126902528?(c[a+4>>2]|0)==1129074247:0):0)Hl(c[b+12>>2]|0);b=c[608]|0;c[608]=b+0;Hl(b)}function ci(b){b=b|0;a[k>>0]=a[b>>0];a[k+1>>0]=a[b+1>>0];a[k+2>>0]=a[b+2>>0];a[k+3>>0]=a[b+3>>0];a[k+4>>0]=a[b+4>>0];a[k+5>>0]=a[b+5>>0];a[k+6>>0]=a[b+6>>0];a[k+7>>0]=a[b+7>>0]}function Oh(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0;if((a|0)==(c[b+8>>2]|0))jf(0,b,d,e,f);else{h=c[a+8>>2]|0;ac[c[(c[h>>2]|0)+20>>2]&7](h,b,d,e,f,g)}return}function Yi(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=a+20|0;f=c[e>>2]|0;g=(c[a+16>>2]|0)-f|0;a=g>>>0>d>>>0?d:g;sh(f|0,b|0,a|0)|0;c[e>>2]=(c[e>>2]|0)+a;return d|0}function ui(a){a=a|0;var b=0,e=0,f=0;b=i;i=i+16|0;e=b;if((c[a+8>>2]|0)==0?(jh(a)|0)!=0:0)f=-1;else if((Pb[c[a+32>>2]&31](a,e,1)|0)==1)f=d[e>>0]|0;else f=-1;i=b;return f|0}function wi(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e;c[f>>2]=c[d>>2];g=Pb[c[(c[a>>2]|0)+16>>2]&31](a,b,f)|0;if(g)c[d>>2]=c[f>>2];i=e;return g&1|0}function Ji(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;if((c|0)!=(d|0)){b=c;c=e;while(1){a[c>>0]=a[b>>0]|0;b=b+1|0;if((b|0)==(d|0))break;else c=c+1|0}}return d|0}function ji(b,d){b=b|0;d=d|0;var e=0,f=0;a[b>>0]=0;c[b+4>>2]=d;e=c[(c[d>>2]|0)+-12>>2]|0;if(!(c[d+(e+16)>>2]|0)){f=c[d+(e+72)>>2]|0;if(f)lg(f)|0;a[b>>0]=1}return}function ii(b,d){b=b|0;d=d|0;var e=0,f=0;a[b>>0]=0;c[b+4>>2]=d;e=c[(c[d>>2]|0)+-12>>2]|0;if(!(c[d+(e+16)>>2]|0)){f=c[d+(e+72)>>2]|0;if(f)kg(f)|0;a[b>>0]=1}return}function Vi(){var a=0,b=0,d=0;a=168;b=pj(c[a>>2]|0,c[a+4>>2]|0,1284865837,1481765933)|0;a=Ok(b|0,G|0,1,0)|0;b=G;d=168;c[d>>2]=a;c[d+4>>2]=b;d=ek(a|0,b|0,33)|0;return d|0}function Li(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;if((d|0)!=(e|0)){b=d;d=f;while(1){c[d>>2]=a[b>>0];b=b+1|0;if((b|0)==(e|0))break;else d=d+4|0}}return e|0}function mi(a,b){a=+a;b=+b;var d=0,e=0,f=0;h[k>>3]=a;d=c[k>>2]|0;e=c[k+4>>2]|0;h[k>>3]=b;f=c[k+4>>2]&-2147483648|e&2147483647;c[k>>2]=d;c[k+4>>2]=f;return +(+h[k>>3])}function ni(a){a=a|0;var b=0,d=0,e=0,f=0;b=a+4|0;d=c[b>>2]|0;e=c[b+4>>2]|0;b=(c[a>>2]|0)+(e>>1)|0;if(!(e&1))f=d;else f=c[(c[b>>2]|0)+d>>2]|0;Sb[f&127](b);return}function ri(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;i=i+16|0;h=g;c[h>>2]=f;f=Ya(d|0)|0;d=_e(a,b,e,h)|0;if(f)Ya(f|0)|0;i=g;return d|0}function Ci(a){a=a|0;var b=0,d=0;b=i;i=i+16|0;d=b;if((c[a>>2]|0)!=-1){c[d>>2]=a;c[d+4>>2]=101;c[d+8>>2]=0;Ah(a,d,102)}i=b;return (c[a+4>>2]|0)+-1|0}function Xh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;if((a|0)==(c[b+8>>2]|0))ph(0,b,d,e);else{f=c[a+8>>2]|0;dc[c[(c[f>>2]|0)+28>>2]&7](f,b,d,e)}return}function bj(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;if(!d)return a|0;else{e=d;f=a}while(1){e=e+-1|0;c[f>>2]=b;if(!e)break;else f=f+4|0}return a|0}function zi(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=Ya(b|0)|0;b=di(a,d,g)|0;if(e)Ya(e|0)|0;i=f;return b|0}function vi(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=Ya(b|0)|0;b=Ag(a,d,g)|0;if(e)Ya(e|0)|0;i=f;return b|0}function hj(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return _b[a&15](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function jj(a){a=a|0;var b=0;switch(c[a+4>>2]&74|0){case 64:{b=8;break}case 8:{b=16;break}case 0:{b=0;break}default:b=10}return b|0}function yi(b,d){b=b|0;d=d|0;var e=0;Wb[c[(c[b>>2]|0)+24>>2]&63](b)|0;e=bk(d,5988)|0;c[b+36>>2]=e;a[b+44>>0]=(Wb[c[(c[e>>2]|0)+28>>2]&63](e)|0)&1;return}function xi(b,d){b=b|0;d=d|0;var e=0;Wb[c[(c[b>>2]|0)+24>>2]&63](b)|0;e=bk(d,5996)|0;c[b+36>>2]=e;a[b+44>>0]=(Wb[c[(c[e>>2]|0)+28>>2]&63](e)|0)&1;return}function Zi(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;c[b+4>>2]=f+-1;c[b>>2]=5944;f=b+8|0;c[f>>2]=d;a[b+12>>0]=e&1;if(!d)c[f>>2]=c[(Ga()|0)>>2];return}function Ai(a,b){a=a|0;b=b|0;var d=0;d=a+4|0;a=b;b=c[d>>2]|0;do{c[b>>2]=0;b=(c[d>>2]|0)+4|0;c[d>>2]=b;a=a+-1|0}while((a|0)!=0);return}function li(b,d){b=b|0;d=d|0;if(!(a[d>>0]&1)){c[b>>2]=c[d>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2]}else Gh(b,c[d+8>>2]|0,c[d+4>>2]|0);return}function Qi(a){a=a|0;var b=0,e=0;if((Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0)==-1)b=-1;else{e=a+12|0;a=c[e>>2]|0;c[e>>2]=a+1;b=d[a>>0]|0}return b|0}function Pi(a){a=a|0;var b=0,d=0;if((Wb[c[(c[a>>2]|0)+36>>2]&63](a)|0)==-1)b=-1;else{d=a+12|0;a=c[d>>2]|0;c[d>>2]=a+4;b=c[a>>2]|0}return b|0}function Ui(a){a=a|0;var b=0;c[a>>2]=4528;Gk(a+4|0);b=a+8|0;c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[b+12>>2]=0;c[b+16>>2]=0;c[b+20>>2]=0;return}function Ti(a){a=a|0;var b=0;c[a>>2]=4592;Gk(a+4|0);b=a+8|0;c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[b+12>>2]=0;c[b+16>>2]=0;c[b+20>>2]=0;return}function mj(a,b){a=a|0;b=b|0;c[a+4>>2]=b+-1;c[a>>2]=6132;c[a+8>>2]=46;c[a+12>>2]=44;b=a+16|0;c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;return}function ij(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+8|0;g=f|0;ad(a,b,d,e,g)|0;i=f;return (G=c[g+4>>2]|0,c[g>>2]|0)|0}function nj(b,d){b=b|0;d=d|0;c[b+4>>2]=d+-1;c[b>>2]=6092;a[b+8>>0]=46;a[b+9>>0]=44;d=b+12|0;c[d>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;return}function Xi(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function Wi(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function pj(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;a=c;c=pi(e,a)|0;f=G;return (G=(ca(b,a)|0)+(ca(d,e)|0)+f|f&0,c|0|0)|0}function tj(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;return Ob[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0)|0}function _i(a){a=a|0;var b=0,d=0,e=0;b=a+4|0;d=c[b>>2]|0;c[b>>2]=d+-1;if(!d){Sb[c[(c[a>>2]|0)+8>>2]&127](a);e=1}else e=0;return e|0}function Nj(){}function Oj(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=b-d>>>0;e=b-d-(c>>>0>a>>>0|0)>>>0;return (G=e,a-c>>>0|0)|0}function Uj(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){G=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}G=(b|0)<0?-1:0;return b>>c-32|0}function cf(a){a=a|0;ul(6904);ul(6892);ul(6880);ul(6868);ul(6856);ul(6844);ul(6832);ul(6820);ul(6808);ul(6796);ul(6784);ul(6772);ul(6760);ul(6748);return}function bf(a){a=a|0;tl(7076);tl(7064);tl(7052);tl(7040);tl(7028);tl(7016);tl(7004);tl(6992);tl(6980);tl(6968);tl(6956);tl(6944);tl(6932);tl(6920);return}function wj(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=_e(a,b,d,g)|0;i=f;return e|0}function vj(a,d,e){a=a|0;d=d|0;e=e|0;var f=0;if(e>>>0<128)f=(b[(c[(Ga()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0;else f=0;return f|0}function uj(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;i=i+16|0;e=d;c[e>>2]=b;b=c[o>>2]|0;Ja(b|0,a|0,e|0)|0;yb(10,b|0)|0;Cb()}function aj(a){a=a|0;var b=0,d=0;b=c[a+8>>2]|0;if(b){a=Ya(b|0)|0;if(!a)d=4;else{Ya(a|0)|0;d=4}}else d=1;return d|0}function yk(a){a=a|0;var b=0,c=0;if((a+-48|0)>>>0<10){b=1;c=b&1;return c|0}b=((a|32)+-97|0)>>>0<6;c=b&1;return c|0}function ck(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){G=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}G=a<<c-32;return 0}function Tj(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;return Ub[a&63](b|0,c|0,d|0,e|0,f|0,g|0)|0}function $i(a){a=a|0;c[a>>2]=4816;bi(a,0);zm(a+28|0);kc(c[a+32>>2]|0);kc(c[a+36>>2]|0);kc(c[a+48>>2]|0);kc(c[a+60>>2]|0);return}function fj(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function ek(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){G=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}G=0;return b>>>c-32|0}function ej(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function dj(b,d,e){b=b|0;d=d|0;e=e|0;e=Lb(((a[d>>0]&1)==0?d+1|0:c[d+8>>2]|0)|0,1)|0;return e>>>((e|0)!=(-1|0)&1)|0}function cj(b,d,e){b=b|0;d=d|0;e=e|0;e=Lb(((a[d>>0]&1)==0?d+1|0:c[d+8>>2]|0)|0,1)|0;return e>>>((e|0)!=(-1|0)&1)|0}function Yj(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;return Rb[a&3](b|0,c|0,d|0,e|0,f|0,+g)|0}function rj(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function qj(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function xj(a,b){a=a|0;b=b|0;var d=0;if(b<<24>>24>-1)d=c[(c[(jb()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;else d=b;return d|0}function ak(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;ac[a&7](b|0,c|0,d|0,e|0,f|0,g|0)}function Zj(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;i=i+16|0;f=e;c[f>>2]=d;d=di(a,b,f)|0;i=e;return d|0}function oj(){var a=0,b=0;a=i;i=i+16|0;if(!(lb(2584,2)|0)){b=fb(c[645]|0)|0;i=a;return b|0}else uj(10294,a);return 0}function Ii(b){b=b|0;if((a[1920]|0)==0?(Ha(1920)|0)!=0:0){Hh(9252,9216,Mk(9216)|0);wb(110,9252,n|0)|0;Qa(1920)}return 9252}function Hi(b){b=b|0;if((a[1936]|0)==0?(Ha(1936)|0)!=0:0){Hh(9360,9276,Mk(9276)|0);wb(110,9360,n|0)|0;Qa(1936)}return 9360}function Gi(b){b=b|0;if((a[1952]|0)==0?(Ha(1952)|0)!=0:0){Hh(9432,9384,Mk(9384)|0);wb(110,9432,n|0)|0;Qa(1952)}return 9432}function Fi(b){b=b|0;if((a[1904]|0)==0?(Ha(1904)|0)!=0:0){Hh(9192,9156,Mk(9156)|0);wb(110,9192,n|0)|0;Qa(1904)}return 9192}function Aj(a,b){a=a|0;b=b|0;var d=0;if(b<<24>>24>-1)d=c[(c[(Oa()|0)>>2]|0)+((b&255)<<2)>>2]&255;else d=b;return d|0}function si(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;if((a|0)==(c[b+8>>2]|0))jf(0,b,d,e,f);return}function hi(b,d){b=b|0;d=d|0;c[b>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;a[b+128>>0]=0;if(d){Wh(b,d);Ai(b,d)}return}function Ok(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+c>>>0;return (G=b+d+(e>>>0<a>>>0|0)>>>0,e|0)|0}function ok(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return cc[a&31](b|0,c|0,d|0,e|0,f|0)|0}function Oi(b){b=b|0;if((a[1928]|0)==0?(Ha(1928)|0)!=0:0){Gh(9264,13933,20);wb(109,9264,n|0)|0;Qa(1928)}return 9264}function Ni(b){b=b|0;if((a[1944]|0)==0?(Ha(1944)|0)!=0:0){Gh(9372,13954,11);wb(109,9372,n|0)|0;Qa(1944)}return 9372}function Si(b){b=b|0;if((a[1912]|0)==0?(Ha(1912)|0)!=0:0){Gh(9204,13924,8);wb(109,9204,n|0)|0;Qa(1912)}return 9204}function Ri(b){b=b|0;if((a[1896]|0)==0?(Ha(1896)|0)!=0:0){Gh(9144,13915,8);wb(109,9144,n|0)|0;Qa(1896)}return 9144}function tk(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;return Vb[a&7](b|0,c|0,d|0,e|0,+f)|0}function hk(a,b){a=a|0;b=b|0;var d=0,e=0;d=b;b=c[d+4>>2]|0;e=a;c[e>>2]=c[d>>2];c[e+4>>2]=b;return}function gk(a,b){a=a|0;b=b|0;var d=0,e=0;d=b;b=c[d+4>>2]|0;e=a;c[e>>2]=c[d>>2];c[e+4>>2]=b;return}function Wj(a,b){a=a|0;b=b|0;var d=0;if(b>>>0<128)d=c[(c[(jb()|0)>>2]|0)+(b<<2)>>2]|0;else d=b;return d|0}function Vj(a,b){a=a|0;b=b|0;var d=0;if(b>>>0<128)d=c[(c[(Oa()|0)>>2]|0)+(b<<2)>>2]|0;else d=b;return d|0}function Mk(a){a=a|0;var b=0,d=0;b=a;while(1)if(!(c[b>>2]|0)){d=b;break}else b=b+4|0;return d-a>>2|0}function nl(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(12);return 0}function Pj(a){a=a|0;var b=0;c[a>>2]=6012;b=a+8|0;a=c[b>>2]|0;if((a|0)!=(jk()|0))Ab(c[b>>2]|0);return}function Fk(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;Qb[a&3](b|0,c|0,d|0,e|0,f|0)}function Ak(b){b=b|0;var d=0;c[b>>2]=5944;d=c[b+8>>2]|0;if((d|0)!=0?(a[b+12>>0]|0)!=0:0)op(d);return}function Qj(b){b=b|0;a[k>>0]=a[b>>0];a[k+1>>0]=a[b+1>>0];a[k+2>>0]=a[b+2>>0];a[k+3>>0]=a[b+3>>0]}function sj(a){a=a|0;var b=0;b=i;i=i+16|0;kc(a);if(!(vb(c[645]|0,0)|0)){i=b;return}else uj(10448,b)}function jk(){if((a[1304]|0)==0?(Ha(1304)|0)!=0:0){c[1623]=_a(2147483647,13581,0)|0;Qa(1304)}return c[1623]|0}function ik(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=d-c|0;return (b>>>0<e>>>0?b:e)|0}function bk(a,b){a=a|0;b=b|0;var d=0;d=c[a>>2]|0;a=Ci(b)|0;return c[(c[d+8>>2]|0)+(a<<2)>>2]|0}function el(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return $b[a&7](b|0,c|0,d|0,e|0)|0}function Ol(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;fa(0);return 0}function gj(a,b,c){a=a|0;b=b|0;c=+c;a=ie(b+12|0)|0;g[a>>2]=+g[a>>2]+ +g[a+4>>2]*c;return}function Ki(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;if((a|0)==(c[b+8>>2]|0))ph(0,b,d,e);return}function Sj(){if((a[1624]|0)==0?(Ha(1624)|0)!=0:0){Nm()|0;c[1673]=6688;Qa(1624)}return c[1673]|0}function Rj(){if((a[1792]|0)==0?(Ha(1792)|0)!=0:0){zk()|0;c[1675]=6696;Qa(1792)}return c[1675]|0}function fk(a){a=a|0;var b=0,d=0;b=i;i=i+16|0;d=b;cl(d,a+28|0);i=b;return c[d>>2]|0}function zl(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;dc[a&7](b|0,c|0,d|0,e|0)}function Wk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Vk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Uk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Tk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Sk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Rk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Qk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function Pk(b,c){b=b|0;c=c|0;a[b>>0]=2;a[b+1>>0]=3;a[b+2>>0]=0;a[b+3>>0]=4;return}function zj(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return hd(c,d,e,1114111,0)|0}function yj(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ed(c,d,e,1114111,0)|0}function bm(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(6);return 0}function $j(){var a=0;a=i;i=i+16|0;if(!(Ea(2580,98)|0)){i=a;return}else uj(10398,a)}function rm(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;fa(3);return 0}function Nl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return Pb[a&31](b|0,c|0,d|0)|0}function dl(a){a=a|0;var b=0;b=c[a>>2]|0;if((b|0)!=(jk()|0))Ab(c[a>>2]|0);return}function Zk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Yk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Xk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function ol(a){a=a|0;var b=0;if(!a)b=0;else b=(qe(a,72,120,0)|0)!=0;return b&1|0}function wm(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(14)}function Pl(a,b){a=a|0;b=b|0;var c=0;if(!a)c=0;else c=Jf(a,b,0)|0;return c|0}function qm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=ih(a,b,c)|0;return d|0}function cm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=lh(a,b,c)|0;return d|0}function Ql(a){a=a|0;var b=0;b=c[1479]|0;c[1479]=b+1;c[a+4>>2]=b+1;return}function yl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function xl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function wl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function vl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function sl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function rl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function ql(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function pl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function cl(a,b){a=a|0;b=b|0;var d=0;d=c[b>>2]|0;c[a>>2]=d;Rl(d);return}function Im(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(16);return 0}function El(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function Dl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function Cl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function Bm(a,b,c){a=a|0;b=b|0;c=c|0;return Td(0,a,b,(c|0)!=0?c:2424)|0}function Bl(a,b){a=a|0;b=b|0;c[a>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;return}function Xl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;Yb[a&0](b|0,c|0,d|0)}function Wl(a){a=a|0;var b=0;if(!a)b=1;else b=(c[a>>2]|0)==0;return b&1|0}function Am(b){b=b|0;var c=0;c=b;while(a[c>>0]|0)c=c+1|0;return c-b|0}function sm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return ad(a,b,c,d,0)|0}function an(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;fa(7);return 0}function Gk(a){a=a|0;var b=0;b=c[(Rj()|0)>>2]|0;c[a>>2]=b;Rl(b);return}function _l(a,b){a=a|0;b=b|0;c[a+16>>2]=(c[a+24>>2]|0)==0|b;return}function $l(a,b,c){a=a|0;b=b|0;c=c|0;return (b>>>0<128?b&255:c)|0}function hm(a,b,c){a=a|0;b=b|0;c=c|0;return (b<<24>>24>-1?b:c)|0}function bn(a){a=a|0;var b=0;b=168;c[b>>2]=a+-1;c[b+4>>2]=0;return}function am(a,b,c,d){a=a|0;b=b|0;c=c|0;d=+d;Xb[a&3](b|0,c|0,+d)}function Rl(a){a=a|0;var b=0;b=a+4|0;c[b>>2]=(c[b>>2]|0)+1;return}function Yl(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+15&-16;return b|0}function Mi(a){a=a|0;lg(3320)|0;lg(3488)|0;kg(3660)|0;kg(3828)|0;return}function ym(a,b,c){a=a|0;b=b|0;c=c|0;return bc[a&15](b|0,c|0)|0}function lj(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;Hf(a,c,d);return}function kj(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;Df(a,c,d);return}function jn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(2)}function gm(a,b){a=a|0;b=b|0;Db(((b|0)==-1?-1:b<<1)|0)|0;return}function fm(a,b){a=a|0;b=b|0;Db(((b|0)==-1?-1:b<<1)|0)|0;return}function Ml(a){a=a|0;var b=0;b=a+16|0;c[b>>2]=c[b>>2]|1;return}function Hl(a){a=a|0;var b=0;b=i;i=i+16|0;Zb[a&3]();uj(10358,b)}function zn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(13);return 0}function jl(a){a=a|0;$i(a+((c[(c[a>>2]|0)+-12>>2]|0)+8)|0);return}function il(a){a=a|0;$i(a+((c[(c[a>>2]|0)+-12>>2]|0)+8)|0);return}function hl(a){a=a|0;$i(a+((c[(c[a>>2]|0)+-12>>2]|0)+4)|0);return}function gl(a){a=a|0;$i(a+((c[(c[a>>2]|0)+-12>>2]|0)+4)|0);return}function zk(){var a=0;a=c[(Sj()|0)>>2]|0;c[1674]=a;Rl(a);return 6696}function xk(a){a=a|0;nm(a+(c[(c[a>>2]|0)+-12>>2]|0)|0);return}function wk(a){a=a|0;mm(a+(c[(c[a>>2]|0)+-12>>2]|0)|0);return}function vk(a){a=a|0;lm(a+(c[(c[a>>2]|0)+-12>>2]|0)|0);return}function uk(a){a=a|0;km(a+(c[(c[a>>2]|0)+-12>>2]|0)|0);return}function Al(a){a=a|0;if(a)Sb[c[(c[a>>2]|0)+4>>2]&127](a);return}function Tn(a){a=a|0;return ((a|0)==32|(a+-9|0)>>>0<5)&1|0}function dk(a,b,c){a=a|0;b=b|0;c=+c;he(b+12|0)|0;return}function $m(a,b,c){a=a|0;b=b|0;c=c|0;Tb[a&63](b|0,c|0)}function kn(a,b,c){a=a|0;b=b|0;c=c|0;return gi(a,b,c)|0}function Sn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(17)}function Yn(a,b){a=a|0;b=b|0;return (a+-48|0)>>>0<10|0}function ul(b){b=b|0;if(a[b>>0]&1)tp(c[b+8>>2]|0);return}function tl(b){b=b|0;if(a[b>>0]&1)tp(c[b+8>>2]|0);return}function Xj(a,b){a=a|0;b=b|0;return uf(a,b,Am(b|0)|0)|0}function Nk(a,b){a=a|0;b=b|0;Hh(a,6704,Mk(6704)|0);return}function Ll(a){a=a|0;c[a>>2]=4528;zm(a+4|0);tp(a);return}function Lk(a,b){a=a|0;b=b|0;Hh(a,6724,Mk(6724)|0);return}function Kl(a){a=a|0;c[a>>2]=4592;zm(a+4|0);tp(a);return}function uo(a,b,c){a=a|0;b=b|0;c=c|0;fa(1);return 0}function sk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5472)|0);return}function rk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5536)|0);return}function qk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5600)|0);return}function pk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5664)|0);return}function nk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5988)|0);return}function mk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5996)|0);return}function lk(a,b){a=a|0;b=b|0;oh(a,b,Ci(6060)|0);return}function kk(a,b){a=a|0;b=b|0;oh(a,b,Ci(6052)|0);return}function Mj(a,b){a=a|0;b=b|0;oh(a,b,Ci(4968)|0);return}function Lj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5040)|0);return}function Kk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5928)|0);return}function Kj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5100)|0);return}function Jk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5920)|0);return}function Jj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5160)|0);return}function Ik(a,b){a=a|0;b=b|0;oh(a,b,Ci(4856)|0);return}function Ij(a,b){a=a|0;b=b|0;oh(a,b,Ci(5252)|0);return}function Hk(a,b){a=a|0;b=b|0;oh(a,b,Ci(4896)|0);return}function Hj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5344)|0);return}function Gj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5376)|0);return}function Fj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5408)|0);return}function Ek(a,b){a=a|0;b=b|0;oh(a,b,Ci(5848)|0);return}function Ej(a,b){a=a|0;b=b|0;oh(a,b,Ci(5700)|0);return}function Dk(a,b){a=a|0;b=b|0;oh(a,b,Ci(5888)|0);return}function Dj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5736)|0);return}function Ck(a,b){a=a|0;b=b|0;oh(a,b,Ci(6068)|0);return}function Cj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5772)|0);return}function Bk(a,b){a=a|0;b=b|0;oh(a,b,Ci(6076)|0);return}function Bj(a,b){a=a|0;b=b|0;oh(a,b,Ci(5808)|0);return}function sn(){var a=0;a=c[614]|0;c[614]=a+0;return a|0}function _j(a,b){a=a|0;b=b|0;return wf(a,b,Mk(b)|0)|0}function Pm(a,b){a=a|0;b=b|0;c[a>>2]=c[b>>2];return}function Om(a,b){a=a|0;b=b|0;c[a>>2]=c[b>>2];return}function Ym(a,b){a=a|0;b=b|0;if(!r){r=a;s=b}}function Dn(a,b){a=a|0;b=b|0;return Wb[a&63](b|0)|0}function jm(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function im(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function Gl(a){a=a|0;c[a>>2]=6092;ul(a+12|0);return}function Fl(a){a=a|0;c[a>>2]=6132;ul(a+16|0);return}function ml(a,b){a=a|0;b=b|0;li(a,b+12|0);return}function ll(a,b){a=a|0;b=b|0;li(a,b+16|0);return}function Vl(a){a=a|0;c[a>>2]=4528;zm(a+4|0);return}function Ul(a){a=a|0;c[a>>2]=4592;zm(a+4|0);return}function kl(a,b){a=a|0;b=b|0;Gh(a,13683,4);return}function fl(a,b){a=a|0;b=b|0;Gh(a,13688,5);return}function Zl(){var a=0;a=Ma(4)|0;Eo(a);zb(a|0,40,3)}function Cn(a,b){a=a|0;b=b|0;return b<<24>>24|0}function bl(a,b){a=a|0;b=b|0;Ih(a,1,45);return}function al(a,b){a=a|0;b=b|0;Ih(a,1,45);return}function _k(a,b){a=a|0;b=b|0;Jh(a,1,45);return}function Jo(a,b,c){a=a|0;b=b|0;c=c|0;fa(10)}function $k(a,b){a=a|0;b=b|0;Jh(a,1,45);return}function $n(a,b){a=a|0;b=b|0;Sb[a&127](b|0)}function Xo(a,b){a=a|0;b=b|0;fa(15);return 0}function To(a,b,c){a=a|0;b=b|0;c=+c;fa(9)}function zo(a,b){a=a|0;b=b|0;return yk(a)|0}function Ko(a,b){a=+a;b=b|0;return +(+Yf(a,b))}function Go(a,b){a=+a;b=b|0;return +(+Rf(a,b))}function zm(a){a=a|0;_i(c[a>>2]|0)|0;return}function nm(a){a=a|0;$i(a+8|0);tp(a);return}function mm(a){a=a|0;$i(a+8|0);tp(a);return}function lm(a){a=a|0;$i(a+4|0);tp(a);return}function km(a){a=a|0;$i(a+4|0);tp(a);return}function Jl(a){a=a|0;dl(a+8|0);tp(a);return}function Il(a){a=a|0;dl(a+8|0);tp(a);return}function um(a){a=a|0;La(10501,10530,1164,10599)}function Nm(){fd(1632,1);c[1672]=1632;return 6688}function xm(){Fd(0);wb(99,11666,n|0)|0;return}function vm(a){a=a|0;La(10620,10643,303,10599)}function Wo(a,b){a=+a;b=+b;return +(+$c(a,b))}function Nn(a,b){a=a|0;b=b|0;i=a;j=b}function Fo(a,b){a=+a;b=+b;return +(+mi(a,b))}function eo(a,b){a=a|0;b=b|0;return b|0}function Eo(a){a=a|0;c[a>>2]=2444;return}function Bn(a){a=a|0;return c[a+12>>2]|0}function fn(a,b){a=a|0;b=b|0;return -1}function en(a,b){a=a|0;b=b|0;return -1}function dn(a,b){a=a|0;b=b|0;return -1}function cn(a,b){a=a|0;b=b|0;return -1}function In(b){b=b|0;return a[b+8>>0]|0}function Hn(b){b=b|0;return a[b+9>>0]|0}function Gn(a){a=a|0;return c[a+8>>2]|0}function un(a){a=a|0;Gl(a);tp(a);return}function tn(a){a=a|0;Fl(a);tp(a);return}function tm(a){a=a|0;Pj(a);tp(a);return}function pn(a){a=a|0;Pg(a);tp(a);return}function pm(a){a=a|0;Vl(a);tp(a);return}function om(a){a=a|0;Ul(a);tp(a);return}function em(a){a=a|0;Vl(a);tp(a);return}function dm(a){a=a|0;Ul(a);tp(a);return}function Tl(a){a=a|0;dl(a+8|0);return}function Sl(a){a=a|0;dl(a+8|0);return}function Fn(a){a=a|0;Ak(a);tp(a);return}function Fm(a){a=a|0;$i(a+8|0);return}function En(a){a=a|0;$i(a);tp(a);return}function Em(a){a=a|0;$i(a+8|0);return}function Dm(a){a=a|0;$i(a+4|0);return}function Cm(a){a=a|0;$i(a+4|0);return}function Tm(a,b){a=a|0;b=b|0;return}function Sm(a,b){a=a|0;b=b|0;return}function mp(a,b){a=a|0;b=b|0;fa(5)}function An(a){a=a|0;$a(a|0)|0;qi()}function hn(a){a=a|0;return Kd(a,1)|0}function gn(a){a=a|0;return Ld(a,1)|0}function _m(a){a=a|0;return Kd(a,0)|0}function Zm(a){a=a|0;return Ld(a,0)|0}function Rn(a){a=a|0;return 2147483647}function Qn(a){a=a|0;return 2147483647}function Pn(a){a=a|0;return 2147483647}function On(a){a=a|0;return 2147483647}function vp(a){a=a|0;fa(8);return 0}function tp(a){a=a|0;kc(a);return}function to(a){a=a|0;tp(a);return}function ro(a){a=a|0;tp(a);return}function qo(a){a=a|0;tp(a);return}function op(a){a=a|0;tp(a);return}function jo(a){a=a|0;tp(a);return}function io(a){a=a|0;tp(a);return}function ho(a){a=a|0;tp(a);return}function fo(a){a=a|0;tp(a);return}function ao(a){a=a|0;tp(a);return}function Zo(a){a=a|0;tp(a);return}function Xm(a){a=a|0;tp(a);return}function Wm(a){a=a|0;tp(a);return}function Vm(a){a=a|0;tp(a);return}function Uo(a){a=a|0;tp(a);return}function Um(a){a=a|0;tp(a);return}function Ro(a){a=a|0;tp(a);return}function Rm(a){a=a|0;tp(a);return}function Qo(a){a=a|0;tp(a);return}function Qm(a){a=a|0;tp(a);return}function Po(a){a=a|0;tp(a);return}function No(a){a=a|0;tp(a);return}function Mo(a){a=a|0;tp(a);return}function Mm(a){a=a|0;tp(a);return}function Lo(a){a=a|0;tp(a);return}function Lm(a){a=a|0;tp(a);return}function Km(a){a=a|0;tp(a);return}function Jm(a){a=a|0;tp(a);return}function Do(a){a=a|0;tp(a);return}function Co(a){a=a|0;tp(a);return}function Bo(a){a=a|0;tp(a);return}function Ao(a){a=a|0;tp(a);return}function ep(a){a=a|0;return 10343}function fp(a){a=a|0;Zb[a&3]()}function po(a){a=a|0;return 127}function oo(a){a=a|0;return 127}function no(a){a=a|0;return 127}function mo(a){a=a|0;return 127}function Kn(a){a=a|0;return -1}function Jn(a){a=a|0;return -1}function yo(a){a=a|0;return 0}function xo(a){a=a|0;return 0}function wo(a){a=a|0;return 0}function vo(a){a=a|0;return 0}function so(a){a=a|0;return 1}function lo(a){a=a|0;return 0}function ko(a){a=a|0;return 0}function go(a){a=a|0;return 1}function co(a){a=a|0;return 4}function bo(a){a=a|0;return 4}function _n(a){a=a|0;return 1}function Zn(a){a=a|0;return 0}function Xn(a){a=a|0;return 0}function Wn(a){a=a|0;return 0}function Vn(a){a=a|0;return 0}function Un(a){a=a|0;return 0}function Oo(a){a=a|0;return 1}function Mn(a){a=a|0;return 0}function Ln(a){a=a|0;return 0}function Hm(a){a=a|0;return 2}function Gm(a){a=a|0;return 2}function yn(a){a=a|0;return}function xn(a){a=a|0;return}function wn(a){a=a|0;return}function vn(a){a=a|0;return}function rp(a){a=a|0;return}function rn(a){a=a|0;return}function qp(a){a=a|0;return}function qn(a){a=a|0;return}function pp(a){a=a|0;return}function on(a){a=a|0;return}function np(a){a=a|0;return}function nn(a){a=a|0;return}function mn(a){a=a|0;return}function lp(a){a=a|0;return}function ln(a){a=a|0;return}function kp(a){a=a|0;return}function jp(a){a=a|0;return}function ip(a){a=a|0;return}function hp(a){a=a|0;return}function gp(a){a=a|0;return}function dp(a){a=a|0;return}function cp(a){a=a|0;return}function bp(a){a=a|0;return}function ap(a){a=a|0;return}function _o(a){a=a|0;return}function Yo(a){a=a|0;return}function Vo(a){a=a|0;return}function So(a){a=a|0;return}function Io(a){a=a|0;return}function Ho(a){a=a|0;return}function $o(a){a=a|0;return}function yp(a){a=a|0;fa(4)}function up(a){a=a|0;G=a}function sp(a){a=a|0;i=a}function xp(){return i|0}function wp(){return G|0}function zp(){fa(11)}

// EMSCRIPTEN_END_FUNCS

 var Ob = [ Ol, Xe, $e, cd, td, bd, sd, Ol ];
 var Pb = [ uo, Af, Yi, im, Kf, dh, Sf, jm, Nf, eh, Tf, fi, ei, dj, cj, Yh, Zh, hm, vj, Th, Uh, $l, kn, uo, uo, uo, uo, uo, uo, uo, uo, uo ];
 var Qb = [ jn, yf, je, dd ];
 var Rb = [ rm, od, md, rm ];
 var Sb = [ yp, np, Ro, rp, Zo, So, to, Io, Ho, fo, ao, Ul, dm, om, Vl, em, pm, Ll, Kl, Fm, nm, jl, xk, Em, mm, il, wk, Dm, lm, hl, vk, Cm, km, gl, uk, $i, En, lp, Qo, Al, kp, Po, yn, Xm, xn, Wm, wn, Vm, vn, Um, rn, Rm, qn, Qm, Tl, Jl, Sl, Il, cp, Do, bp, Co, ap, Bo, $o, Ao, on, Mm, nn, Lm, mn, Km, ln, Jm, jp, No, ip, Mo, Pg, pn, Ak, Fn, Pj, tm, Gl, un, Fl, tn, gp, Lo, Uo, qo, ho, io, ro, jo, _o, Yo, sj, Mi, hp, Ql, ni, cf, bf, ee, fe, de, ce, ul, tl, kc, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp, yp ];
 var Tb = [ mp, xi, $h, yi, ai, Tm, Sm, El, yl, sl, bl, Vk, Wk, Dl, xl, rl, al, Tk, Uk, Cl, wl, ql, $k, Rk, Sk, Bl, vl, pl, _k, Pk, Qk, gm, fm, ml, kl, fl, ll, Nk, Lk, hk, gk, Pm, Om, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp, mp ];
 var Ub = [ bm, Sd, Mg, Lg, Hg, Cg, Ig, Gg, xg, zg, yg, _c, Rd, Kg, Jg, Eg, Bg, Fg, Dg, ug, wg, vg, Pc, Je, Ie, He, Ge, sg, kf, Xf, Wf, bg, tg, gf, Vf, Uf, ag, rd, qd, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm, bm ];
 var Vb = [ an, Od, Id, Nd, Gd, an, an, an ];
 var Wb = [ vp, Oo, ep, Bf, Ln, Jn, Pi, Un, Zm, gn, Cf, Mn, Kn, Qi, Vn, _m, hn, Hm, be, Dd, fg, Oi, Ni, Ri, Si, Gm, ge, Ed, gg, Hi, Gi, Fi, Ii, po, oo, yo, no, mo, xo, Rn, Qn, wo, Pn, On, vo, Rh, Zn, aj, In, Hn, Gn, Bn, so, _n, go, ko, Wn, bo, lo, Xn, co, vp, vp, vp ];
 var Xb = [ To, gj, dk, To ];
 var Yb = [ Jo ];
 var Zb = [ zp, Ve, $j, zp ];
 var _b = [ nl, pc, oc, kd, id, qj, rj, Ch, Dh, Eh, Fh, nl, nl, nl, nl, nl ];
 var $b = [ zn, Ji, Kh, Nh, Bh, Li, zn, zn ];
 var ac = [ wm, si, Oh, oe, Wi, Xi, Oe, Pd ];
 var bc = [ Xo, cn, me, Be, en, dn, ne, De, fn, Aj, xj, eo, Vj, Wj, Cn, Xo ];
 var cc = [ Im, Mf, $f, Yd, ue, te, Ae, Xd, se, re, ze, oi, rf, hf, _h, Zk, ik, Xk, yj, Yk, zj, Im, Im, Im, Im, Im, Im, Im, Im, Im, Im, Im ];
 var dc = [ Sn, Ki, Xh, tf, ej, fj, lj, kj ];
 return {
  ___cxa_can_catch: wi,
  _free: kc,
  _main: mc,
  ___cxa_is_pointer_type: ol,
  _i64Add: Ok,
  _memmove: ti,
  _i64Subtract: Oj,
  _memset: Mh,
  _malloc: fc,
  _memcpy: sh,
  _strlen: Am,
  _bitshift64Lshr: ek,
  _bitshift64Shl: ck,
  __GLOBAL__sub_I_iostream_cpp: xm,
  runPostSets: Nj,
  stackAlloc: Yl,
  stackSave: xp,
  stackRestore: sp,
  establishStackSpace: Nn,
  setThrew: Ym,
  setTempRet0: up,
  getTempRet0: wp,
  dynCall_iiiiiiii: tj,
  dynCall_iiii: Nl,
  dynCall_viiiii: Fk,
  dynCall_iiiiiid: Yj,
  dynCall_vi: $n,
  dynCall_vii: $m,
  dynCall_iiiiiii: Tj,
  dynCall_iiiiid: tk,
  dynCall_ii: Dn,
  dynCall_viid: am,
  dynCall_viii: Xl,
  dynCall_v: fp,
  dynCall_iiiiiiiii: hj,
  dynCall_iiiii: el,
  dynCall_viiiiii: ak,
  dynCall_iii: ym,
  dynCall_iiiiii: ok,
  dynCall_viiii: zl
 };
})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var _free = Module["_free"] = asm["_free"];
var _main = Module["_main"] = asm["_main"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var __GLOBAL__sub_I_iostream_cpp = Module["__GLOBAL__sub_I_iostream_cpp"] = asm["__GLOBAL__sub_I_iostream_cpp"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = asm["dynCall_iiiiiiii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_iiiiiid = Module["dynCall_iiiiiid"] = asm["dynCall_iiiiiid"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_iiiiid = Module["dynCall_iiiiid"] = asm["dynCall_iiiiid"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viid = Module["dynCall_viid"] = asm["dynCall_viid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
Runtime.stackAlloc = asm["stackAlloc"];
Runtime.stackSave = asm["stackSave"];
Runtime.stackRestore = asm["stackRestore"];
Runtime.establishStackSpace = asm["establishStackSpace"];
Runtime.setTempRet0 = asm["setTempRet0"];
Runtime.getTempRet0 = asm["getTempRet0"];
var i64Math = (function() {
 var goog = {
  math: {}
 };
 goog.math.Long = (function(low, high) {
  this.low_ = low | 0;
  this.high_ = high | 0;
 });
 goog.math.Long.IntCache_ = {};
 goog.math.Long.fromInt = (function(value) {
  if (-128 <= value && value < 128) {
   var cachedObj = goog.math.Long.IntCache_[value];
   if (cachedObj) {
    return cachedObj;
   }
  }
  var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
   goog.math.Long.IntCache_[value] = obj;
  }
  return obj;
 });
 goog.math.Long.fromNumber = (function(value) {
  if (isNaN(value) || !isFinite(value)) {
   return goog.math.Long.ZERO;
  } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
   return goog.math.Long.MIN_VALUE;
  } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
   return goog.math.Long.MAX_VALUE;
  } else if (value < 0) {
   return goog.math.Long.fromNumber(-value).negate();
  } else {
   return new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0);
  }
 });
 goog.math.Long.fromBits = (function(lowBits, highBits) {
  return new goog.math.Long(lowBits, highBits);
 });
 goog.math.Long.fromString = (function(str, opt_radix) {
  if (str.length == 0) {
   throw Error("number format error: empty string");
  }
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
   throw Error("radix out of range: " + radix);
  }
  if (str.charAt(0) == "-") {
   return goog.math.Long.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf("-") >= 0) {
   throw Error('number format error: interior "-" character: ' + str);
  }
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
  var result = goog.math.Long.ZERO;
  for (var i = 0; i < str.length; i += 8) {
   var size = Math.min(8, str.length - i);
   var value = parseInt(str.substring(i, i + size), radix);
   if (size < 8) {
    var power = goog.math.Long.fromNumber(Math.pow(radix, size));
    result = result.multiply(power).add(goog.math.Long.fromNumber(value));
   } else {
    result = result.multiply(radixToPower);
    result = result.add(goog.math.Long.fromNumber(value));
   }
  }
  return result;
 });
 goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;
 goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;
 goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
 goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;
 goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
 goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
 goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;
 goog.math.Long.ZERO = goog.math.Long.fromInt(0);
 goog.math.Long.ONE = goog.math.Long.fromInt(1);
 goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);
 goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(4294967295 | 0, 2147483647 | 0);
 goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 2147483648 | 0);
 goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);
 goog.math.Long.prototype.toInt = (function() {
  return this.low_;
 });
 goog.math.Long.prototype.toNumber = (function() {
  return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
 });
 goog.math.Long.prototype.toString = (function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
   throw Error("radix out of range: " + radix);
  }
  if (this.isZero()) {
   return "0";
  }
  if (this.isNegative()) {
   if (this.equals(goog.math.Long.MIN_VALUE)) {
    var radixLong = goog.math.Long.fromNumber(radix);
    var div = this.div(radixLong);
    var rem = div.multiply(radixLong).subtract(this);
    return div.toString(radix) + rem.toInt().toString(radix);
   } else {
    return "-" + this.negate().toString(radix);
   }
  }
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
  var rem = this;
  var result = "";
  while (true) {
   var remDiv = rem.div(radixToPower);
   var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
   var digits = intval.toString(radix);
   rem = remDiv;
   if (rem.isZero()) {
    return digits + result;
   } else {
    while (digits.length < 6) {
     digits = "0" + digits;
    }
    result = "" + digits + result;
   }
  }
 });
 goog.math.Long.prototype.getHighBits = (function() {
  return this.high_;
 });
 goog.math.Long.prototype.getLowBits = (function() {
  return this.low_;
 });
 goog.math.Long.prototype.getLowBitsUnsigned = (function() {
  return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
 });
 goog.math.Long.prototype.getNumBitsAbs = (function() {
  if (this.isNegative()) {
   if (this.equals(goog.math.Long.MIN_VALUE)) {
    return 64;
   } else {
    return this.negate().getNumBitsAbs();
   }
  } else {
   var val = this.high_ != 0 ? this.high_ : this.low_;
   for (var bit = 31; bit > 0; bit--) {
    if ((val & 1 << bit) != 0) {
     break;
    }
   }
   return this.high_ != 0 ? bit + 33 : bit + 1;
  }
 });
 goog.math.Long.prototype.isZero = (function() {
  return this.high_ == 0 && this.low_ == 0;
 });
 goog.math.Long.prototype.isNegative = (function() {
  return this.high_ < 0;
 });
 goog.math.Long.prototype.isOdd = (function() {
  return (this.low_ & 1) == 1;
 });
 goog.math.Long.prototype.equals = (function(other) {
  return this.high_ == other.high_ && this.low_ == other.low_;
 });
 goog.math.Long.prototype.notEquals = (function(other) {
  return this.high_ != other.high_ || this.low_ != other.low_;
 });
 goog.math.Long.prototype.lessThan = (function(other) {
  return this.compare(other) < 0;
 });
 goog.math.Long.prototype.lessThanOrEqual = (function(other) {
  return this.compare(other) <= 0;
 });
 goog.math.Long.prototype.greaterThan = (function(other) {
  return this.compare(other) > 0;
 });
 goog.math.Long.prototype.greaterThanOrEqual = (function(other) {
  return this.compare(other) >= 0;
 });
 goog.math.Long.prototype.compare = (function(other) {
  if (this.equals(other)) {
   return 0;
  }
  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
   return -1;
  }
  if (!thisNeg && otherNeg) {
   return 1;
  }
  if (this.subtract(other).isNegative()) {
   return -1;
  } else {
   return 1;
  }
 });
 goog.math.Long.prototype.negate = (function() {
  if (this.equals(goog.math.Long.MIN_VALUE)) {
   return goog.math.Long.MIN_VALUE;
  } else {
   return this.not().add(goog.math.Long.ONE);
  }
 });
 goog.math.Long.prototype.add = (function(other) {
  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 65535;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 65535;
  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 65535;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 65535;
  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 65535;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 65535;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c48 += a48 + b48;
  c48 &= 65535;
  return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
 });
 goog.math.Long.prototype.subtract = (function(other) {
  return this.add(other.negate());
 });
 goog.math.Long.prototype.multiply = (function(other) {
  if (this.isZero()) {
   return goog.math.Long.ZERO;
  } else if (other.isZero()) {
   return goog.math.Long.ZERO;
  }
  if (this.equals(goog.math.Long.MIN_VALUE)) {
   return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
  } else if (other.equals(goog.math.Long.MIN_VALUE)) {
   return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
  }
  if (this.isNegative()) {
   if (other.isNegative()) {
    return this.negate().multiply(other.negate());
   } else {
    return this.negate().multiply(other).negate();
   }
  } else if (other.isNegative()) {
   return this.multiply(other.negate()).negate();
  }
  if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) {
   return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
  }
  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 65535;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 65535;
  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 65535;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 65535;
  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 65535;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 65535;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 65535;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 65535;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 65535;
  return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
 });
 goog.math.Long.prototype.div = (function(other) {
  if (other.isZero()) {
   throw Error("division by zero");
  } else if (this.isZero()) {
   return goog.math.Long.ZERO;
  }
  if (this.equals(goog.math.Long.MIN_VALUE)) {
   if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) {
    return goog.math.Long.MIN_VALUE;
   } else if (other.equals(goog.math.Long.MIN_VALUE)) {
    return goog.math.Long.ONE;
   } else {
    var halfThis = this.shiftRight(1);
    var approx = halfThis.div(other).shiftLeft(1);
    if (approx.equals(goog.math.Long.ZERO)) {
     return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
    } else {
     var rem = this.subtract(other.multiply(approx));
     var result = approx.add(rem.div(other));
     return result;
    }
   }
  } else if (other.equals(goog.math.Long.MIN_VALUE)) {
   return goog.math.Long.ZERO;
  }
  if (this.isNegative()) {
   if (other.isNegative()) {
    return this.negate().div(other.negate());
   } else {
    return this.negate().div(other).negate();
   }
  } else if (other.isNegative()) {
   return this.div(other.negate()).negate();
  }
  var res = goog.math.Long.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
   var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
   var log2 = Math.ceil(Math.log(approx) / Math.LN2);
   var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
   var approxRes = goog.math.Long.fromNumber(approx);
   var approxRem = approxRes.multiply(other);
   while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
    approx -= delta;
    approxRes = goog.math.Long.fromNumber(approx);
    approxRem = approxRes.multiply(other);
   }
   if (approxRes.isZero()) {
    approxRes = goog.math.Long.ONE;
   }
   res = res.add(approxRes);
   rem = rem.subtract(approxRem);
  }
  return res;
 });
 goog.math.Long.prototype.modulo = (function(other) {
  return this.subtract(this.div(other).multiply(other));
 });
 goog.math.Long.prototype.not = (function() {
  return goog.math.Long.fromBits(~this.low_, ~this.high_);
 });
 goog.math.Long.prototype.and = (function(other) {
  return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
 });
 goog.math.Long.prototype.or = (function(other) {
  return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
 });
 goog.math.Long.prototype.xor = (function(other) {
  return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
 });
 goog.math.Long.prototype.shiftLeft = (function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
   return this;
  } else {
   var low = this.low_;
   if (numBits < 32) {
    var high = this.high_;
    return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits);
   } else {
    return goog.math.Long.fromBits(0, low << numBits - 32);
   }
  }
 });
 goog.math.Long.prototype.shiftRight = (function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
   return this;
  } else {
   var high = this.high_;
   if (numBits < 32) {
    var low = this.low_;
    return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits);
   } else {
    return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1);
   }
  }
 });
 goog.math.Long.prototype.shiftRightUnsigned = (function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
   return this;
  } else {
   var high = this.high_;
   if (numBits < 32) {
    var low = this.low_;
    return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits);
   } else if (numBits == 32) {
    return goog.math.Long.fromBits(high, 0);
   } else {
    return goog.math.Long.fromBits(high >>> numBits - 32, 0);
   }
  }
 });
 var navigator = {
  appName: "Modern Browser"
 };
 var dbits;
 var canary = 0xdeadbeefcafe;
 var j_lm = (canary & 16777215) == 15715070;
 function BigInteger(a, b, c) {
  if (a != null) if ("number" == typeof a) this.fromNumber(a, b, c); else if (b == null && "string" != typeof a) this.fromString(a, 256); else this.fromString(a, b);
 }
 function nbi() {
  return new BigInteger(null);
 }
 function am1(i, x, w, j, c, n) {
  while (--n >= 0) {
   var v = x * this[i++] + w[j] + c;
   c = Math.floor(v / 67108864);
   w[j++] = v & 67108863;
  }
  return c;
 }
 function am2(i, x, w, j, c, n) {
  var xl = x & 32767, xh = x >> 15;
  while (--n >= 0) {
   var l = this[i] & 32767;
   var h = this[i++] >> 15;
   var m = xh * l + h * xl;
   l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
   c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
   w[j++] = l & 1073741823;
  }
  return c;
 }
 function am3(i, x, w, j, c, n) {
  var xl = x & 16383, xh = x >> 14;
  while (--n >= 0) {
   var l = this[i] & 16383;
   var h = this[i++] >> 14;
   var m = xh * l + h * xl;
   l = xl * l + ((m & 16383) << 14) + w[j] + c;
   c = (l >> 28) + (m >> 14) + xh * h;
   w[j++] = l & 268435455;
  }
  return c;
 }
 if (j_lm && navigator.appName == "Microsoft Internet Explorer") {
  BigInteger.prototype.am = am2;
  dbits = 30;
 } else if (j_lm && navigator.appName != "Netscape") {
  BigInteger.prototype.am = am1;
  dbits = 26;
 } else {
  BigInteger.prototype.am = am3;
  dbits = 28;
 }
 BigInteger.prototype.DB = dbits;
 BigInteger.prototype.DM = (1 << dbits) - 1;
 BigInteger.prototype.DV = 1 << dbits;
 var BI_FP = 52;
 BigInteger.prototype.FV = Math.pow(2, BI_FP);
 BigInteger.prototype.F1 = BI_FP - dbits;
 BigInteger.prototype.F2 = 2 * dbits - BI_FP;
 var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
 var BI_RC = new Array;
 var rr, vv;
 rr = "0".charCodeAt(0);
 for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
 rr = "a".charCodeAt(0);
 for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
 rr = "A".charCodeAt(0);
 for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
 function int2char(n) {
  return BI_RM.charAt(n);
 }
 function intAt(s, i) {
  var c = BI_RC[s.charCodeAt(i)];
  return c == null ? -1 : c;
 }
 function bnpCopyTo(r) {
  for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
 }
 function bnpFromInt(x) {
  this.t = 1;
  this.s = x < 0 ? -1 : 0;
  if (x > 0) this[0] = x; else if (x < -1) this[0] = x + DV; else this.t = 0;
 }
 function nbv(i) {
  var r = nbi();
  r.fromInt(i);
  return r;
 }
 function bnpFromString(s, b) {
  var k;
  if (b == 16) k = 4; else if (b == 8) k = 3; else if (b == 256) k = 8; else if (b == 2) k = 1; else if (b == 32) k = 5; else if (b == 4) k = 2; else {
   this.fromRadix(s, b);
   return;
  }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while (--i >= 0) {
   var x = k == 8 ? s[i] & 255 : intAt(s, i);
   if (x < 0) {
    if (s.charAt(i) == "-") mi = true;
    continue;
   }
   mi = false;
   if (sh == 0) this[this.t++] = x; else if (sh + k > this.DB) {
    this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
    this[this.t++] = x >> this.DB - sh;
   } else this[this.t - 1] |= x << sh;
   sh += k;
   if (sh >= this.DB) sh -= this.DB;
  }
  if (k == 8 && (s[0] & 128) != 0) {
   this.s = -1;
   if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh;
  }
  this.clamp();
  if (mi) BigInteger.ZERO.subTo(this, this);
 }
 function bnpClamp() {
  var c = this.s & this.DM;
  while (this.t > 0 && this[this.t - 1] == c) --this.t;
 }
 function bnToString(b) {
  if (this.s < 0) return "-" + this.negate().toString(b);
  var k;
  if (b == 16) k = 4; else if (b == 8) k = 3; else if (b == 2) k = 1; else if (b == 32) k = 5; else if (b == 4) k = 2; else return this.toRadix(b);
  var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
  var p = this.DB - i * this.DB % k;
  if (i-- > 0) {
   if (p < this.DB && (d = this[i] >> p) > 0) {
    m = true;
    r = int2char(d);
   }
   while (i >= 0) {
    if (p < k) {
     d = (this[i] & (1 << p) - 1) << k - p;
     d |= this[--i] >> (p += this.DB - k);
    } else {
     d = this[i] >> (p -= k) & km;
     if (p <= 0) {
      p += this.DB;
      --i;
     }
    }
    if (d > 0) m = true;
    if (m) r += int2char(d);
   }
  }
  return m ? r : "0";
 }
 function bnNegate() {
  var r = nbi();
  BigInteger.ZERO.subTo(this, r);
  return r;
 }
 function bnAbs() {
  return this.s < 0 ? this.negate() : this;
 }
 function bnCompareTo(a) {
  var r = this.s - a.s;
  if (r != 0) return r;
  var i = this.t;
  r = i - a.t;
  if (r != 0) return this.s < 0 ? -r : r;
  while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;
  return 0;
 }
 function nbits(x) {
  var r = 1, t;
  if ((t = x >>> 16) != 0) {
   x = t;
   r += 16;
  }
  if ((t = x >> 8) != 0) {
   x = t;
   r += 8;
  }
  if ((t = x >> 4) != 0) {
   x = t;
   r += 4;
  }
  if ((t = x >> 2) != 0) {
   x = t;
   r += 2;
  }
  if ((t = x >> 1) != 0) {
   x = t;
   r += 1;
  }
  return r;
 }
 function bnBitLength() {
  if (this.t <= 0) return 0;
  return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
 }
 function bnpDLShiftTo(n, r) {
  var i;
  for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
  for (i = n - 1; i >= 0; --i) r[i] = 0;
  r.t = this.t + n;
  r.s = this.s;
 }
 function bnpDRShiftTo(n, r) {
  for (var i = n; i < this.t; ++i) r[i - n] = this[i];
  r.t = Math.max(this.t - n, 0);
  r.s = this.s;
 }
 function bnpLShiftTo(n, r) {
  var bs = n % this.DB;
  var cbs = this.DB - bs;
  var bm = (1 << cbs) - 1;
  var ds = Math.floor(n / this.DB), c = this.s << bs & this.DM, i;
  for (i = this.t - 1; i >= 0; --i) {
   r[i + ds + 1] = this[i] >> cbs | c;
   c = (this[i] & bm) << bs;
  }
  for (i = ds - 1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t + ds + 1;
  r.s = this.s;
  r.clamp();
 }
 function bnpRShiftTo(n, r) {
  r.s = this.s;
  var ds = Math.floor(n / this.DB);
  if (ds >= this.t) {
   r.t = 0;
   return;
  }
  var bs = n % this.DB;
  var cbs = this.DB - bs;
  var bm = (1 << bs) - 1;
  r[0] = this[ds] >> bs;
  for (var i = ds + 1; i < this.t; ++i) {
   r[i - ds - 1] |= (this[i] & bm) << cbs;
   r[i - ds] = this[i] >> bs;
  }
  if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
  r.t = this.t - ds;
  r.clamp();
 }
 function bnpSubTo(a, r) {
  var i = 0, c = 0, m = Math.min(a.t, this.t);
  while (i < m) {
   c += this[i] - a[i];
   r[i++] = c & this.DM;
   c >>= this.DB;
  }
  if (a.t < this.t) {
   c -= a.s;
   while (i < this.t) {
    c += this[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c += this.s;
  } else {
   c += this.s;
   while (i < a.t) {
    c -= a[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c -= a.s;
  }
  r.s = c < 0 ? -1 : 0;
  if (c < -1) r[i++] = this.DV + c; else if (c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
 }
 function bnpMultiplyTo(a, r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i + y.t;
  while (--i >= 0) r[i] = 0;
  for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
  r.s = 0;
  r.clamp();
  if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
 }
 function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2 * x.t;
  while (--i >= 0) r[i] = 0;
  for (i = 0; i < x.t - 1; ++i) {
   var c = x.am(i, x[i], r, 2 * i, 0, 1);
   if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
    r[i + x.t] -= x.DV;
    r[i + x.t + 1] = 1;
   }
  }
  if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
  r.s = 0;
  r.clamp();
 }
 function bnpDivRemTo(m, q, r) {
  var pm = m.abs();
  if (pm.t <= 0) return;
  var pt = this.abs();
  if (pt.t < pm.t) {
   if (q != null) q.fromInt(0);
   if (r != null) this.copyTo(r);
   return;
  }
  if (r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB - nbits(pm[pm.t - 1]);
  if (nsh > 0) {
   pm.lShiftTo(nsh, y);
   pt.lShiftTo(nsh, r);
  } else {
   pm.copyTo(y);
   pt.copyTo(r);
  }
  var ys = y.t;
  var y0 = y[ys - 1];
  if (y0 == 0) return;
  var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
  var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
  var i = r.t, j = i - ys, t = q == null ? nbi() : q;
  y.dlShiftTo(j, t);
  if (r.compareTo(t) >= 0) {
   r[r.t++] = 1;
   r.subTo(t, r);
  }
  BigInteger.ONE.dlShiftTo(ys, t);
  t.subTo(y, y);
  while (y.t < ys) y[y.t++] = 0;
  while (--j >= 0) {
   var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
   if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
    y.dlShiftTo(j, t);
    r.subTo(t, r);
    while (r[i] < --qd) r.subTo(t, r);
   }
  }
  if (q != null) {
   r.drShiftTo(ys, q);
   if (ts != ms) BigInteger.ZERO.subTo(q, q);
  }
  r.t = ys;
  r.clamp();
  if (nsh > 0) r.rShiftTo(nsh, r);
  if (ts < 0) BigInteger.ZERO.subTo(r, r);
 }
 function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a, null, r);
  if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
  return r;
 }
 function Classic(m) {
  this.m = m;
 }
 function cConvert(x) {
  if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m); else return x;
 }
 function cRevert(x) {
  return x;
 }
 function cReduce(x) {
  x.divRemTo(this.m, null, x);
 }
 function cMulTo(x, y, r) {
  x.multiplyTo(y, r);
  this.reduce(r);
 }
 function cSqrTo(x, r) {
  x.squareTo(r);
  this.reduce(r);
 }
 Classic.prototype.convert = cConvert;
 Classic.prototype.revert = cRevert;
 Classic.prototype.reduce = cReduce;
 Classic.prototype.mulTo = cMulTo;
 Classic.prototype.sqrTo = cSqrTo;
 function bnpInvDigit() {
  if (this.t < 1) return 0;
  var x = this[0];
  if ((x & 1) == 0) return 0;
  var y = x & 3;
  y = y * (2 - (x & 15) * y) & 15;
  y = y * (2 - (x & 255) * y) & 255;
  y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
  y = y * (2 - x * y % this.DV) % this.DV;
  return y > 0 ? this.DV - y : -y;
 }
 function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp & 32767;
  this.mph = this.mp >> 15;
  this.um = (1 << m.DB - 15) - 1;
  this.mt2 = 2 * m.t;
 }
 function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t, r);
  r.divRemTo(this.m, null, r);
  if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
  return r;
 }
 function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
 }
 function montReduce(x) {
  while (x.t <= this.mt2) x[x.t++] = 0;
  for (var i = 0; i < this.m.t; ++i) {
   var j = x[i] & 32767;
   var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
   j = i + this.m.t;
   x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
   while (x[j] >= x.DV) {
    x[j] -= x.DV;
    x[++j]++;
   }
  }
  x.clamp();
  x.drShiftTo(this.m.t, x);
  if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
 }
 function montSqrTo(x, r) {
  x.squareTo(r);
  this.reduce(r);
 }
 function montMulTo(x, y, r) {
  x.multiplyTo(y, r);
  this.reduce(r);
 }
 Montgomery.prototype.convert = montConvert;
 Montgomery.prototype.revert = montRevert;
 Montgomery.prototype.reduce = montReduce;
 Montgomery.prototype.mulTo = montMulTo;
 Montgomery.prototype.sqrTo = montSqrTo;
 function bnpIsEven() {
  return (this.t > 0 ? this[0] & 1 : this.s) == 0;
 }
 function bnpExp(e, z) {
  if (e > 4294967295 || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
  g.copyTo(r);
  while (--i >= 0) {
   z.sqrTo(r, r2);
   if ((e & 1 << i) > 0) z.mulTo(r2, g, r); else {
    var t = r;
    r = r2;
    r2 = t;
   }
  }
  return z.revert(r);
 }
 function bnModPowInt(e, m) {
  var z;
  if (e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e, z);
 }
 BigInteger.prototype.copyTo = bnpCopyTo;
 BigInteger.prototype.fromInt = bnpFromInt;
 BigInteger.prototype.fromString = bnpFromString;
 BigInteger.prototype.clamp = bnpClamp;
 BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
 BigInteger.prototype.drShiftTo = bnpDRShiftTo;
 BigInteger.prototype.lShiftTo = bnpLShiftTo;
 BigInteger.prototype.rShiftTo = bnpRShiftTo;
 BigInteger.prototype.subTo = bnpSubTo;
 BigInteger.prototype.multiplyTo = bnpMultiplyTo;
 BigInteger.prototype.squareTo = bnpSquareTo;
 BigInteger.prototype.divRemTo = bnpDivRemTo;
 BigInteger.prototype.invDigit = bnpInvDigit;
 BigInteger.prototype.isEven = bnpIsEven;
 BigInteger.prototype.exp = bnpExp;
 BigInteger.prototype.toString = bnToString;
 BigInteger.prototype.negate = bnNegate;
 BigInteger.prototype.abs = bnAbs;
 BigInteger.prototype.compareTo = bnCompareTo;
 BigInteger.prototype.bitLength = bnBitLength;
 BigInteger.prototype.mod = bnMod;
 BigInteger.prototype.modPowInt = bnModPowInt;
 BigInteger.ZERO = nbv(0);
 BigInteger.ONE = nbv(1);
 function bnpFromRadix(s, b) {
  this.fromInt(0);
  if (b == null) b = 10;
  var cs = this.chunkSize(b);
  var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
  for (var i = 0; i < s.length; ++i) {
   var x = intAt(s, i);
   if (x < 0) {
    if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
    continue;
   }
   w = b * w + x;
   if (++j >= cs) {
    this.dMultiply(d);
    this.dAddOffset(w, 0);
    j = 0;
    w = 0;
   }
  }
  if (j > 0) {
   this.dMultiply(Math.pow(b, j));
   this.dAddOffset(w, 0);
  }
  if (mi) BigInteger.ZERO.subTo(this, this);
 }
 function bnpChunkSize(r) {
  return Math.floor(Math.LN2 * this.DB / Math.log(r));
 }
 function bnSigNum() {
  if (this.s < 0) return -1; else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0; else return 1;
 }
 function bnpDMultiply(n) {
  this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
  ++this.t;
  this.clamp();
 }
 function bnpDAddOffset(n, w) {
  if (n == 0) return;
  while (this.t <= w) this[this.t++] = 0;
  this[w] += n;
  while (this[w] >= this.DV) {
   this[w] -= this.DV;
   if (++w >= this.t) this[this.t++] = 0;
   ++this[w];
  }
 }
 function bnpToRadix(b) {
  if (b == null) b = 10;
  if (this.signum() == 0 || b < 2 || b > 36) return "0";
  var cs = this.chunkSize(b);
  var a = Math.pow(b, cs);
  var d = nbv(a), y = nbi(), z = nbi(), r = "";
  this.divRemTo(d, y, z);
  while (y.signum() > 0) {
   r = (a + z.intValue()).toString(b).substr(1) + r;
   y.divRemTo(d, y, z);
  }
  return z.intValue().toString(b) + r;
 }
 function bnIntValue() {
  if (this.s < 0) {
   if (this.t == 1) return this[0] - this.DV; else if (this.t == 0) return -1;
  } else if (this.t == 1) return this[0]; else if (this.t == 0) return 0;
  return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0];
 }
 function bnpAddTo(a, r) {
  var i = 0, c = 0, m = Math.min(a.t, this.t);
  while (i < m) {
   c += this[i] + a[i];
   r[i++] = c & this.DM;
   c >>= this.DB;
  }
  if (a.t < this.t) {
   c += a.s;
   while (i < this.t) {
    c += this[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c += this.s;
  } else {
   c += this.s;
   while (i < a.t) {
    c += a[i];
    r[i++] = c & this.DM;
    c >>= this.DB;
   }
   c += a.s;
  }
  r.s = c < 0 ? -1 : 0;
  if (c > 0) r[i++] = c; else if (c < -1) r[i++] = this.DV + c;
  r.t = i;
  r.clamp();
 }
 BigInteger.prototype.fromRadix = bnpFromRadix;
 BigInteger.prototype.chunkSize = bnpChunkSize;
 BigInteger.prototype.signum = bnSigNum;
 BigInteger.prototype.dMultiply = bnpDMultiply;
 BigInteger.prototype.dAddOffset = bnpDAddOffset;
 BigInteger.prototype.toRadix = bnpToRadix;
 BigInteger.prototype.intValue = bnIntValue;
 BigInteger.prototype.addTo = bnpAddTo;
 var Wrapper = {
  abs: (function(l, h) {
   var x = new goog.math.Long(l, h);
   var ret;
   if (x.isNegative()) {
    ret = x.negate();
   } else {
    ret = x;
   }
   HEAP32[tempDoublePtr >> 2] = ret.low_;
   HEAP32[tempDoublePtr + 4 >> 2] = ret.high_;
  }),
  ensureTemps: (function() {
   if (Wrapper.ensuredTemps) return;
   Wrapper.ensuredTemps = true;
   Wrapper.two32 = new BigInteger;
   Wrapper.two32.fromString("4294967296", 10);
   Wrapper.two64 = new BigInteger;
   Wrapper.two64.fromString("18446744073709551616", 10);
   Wrapper.temp1 = new BigInteger;
   Wrapper.temp2 = new BigInteger;
  }),
  lh2bignum: (function(l, h) {
   var a = new BigInteger;
   a.fromString(h.toString(), 10);
   var b = new BigInteger;
   a.multiplyTo(Wrapper.two32, b);
   var c = new BigInteger;
   c.fromString(l.toString(), 10);
   var d = new BigInteger;
   c.addTo(b, d);
   return d;
  }),
  stringify: (function(l, h, unsigned) {
   var ret = (new goog.math.Long(l, h)).toString();
   if (unsigned && ret[0] == "-") {
    Wrapper.ensureTemps();
    var bignum = new BigInteger;
    bignum.fromString(ret, 10);
    ret = new BigInteger;
    Wrapper.two64.addTo(bignum, ret);
    ret = ret.toString(10);
   }
   return ret;
  }),
  fromString: (function(str, base, min, max, unsigned) {
   Wrapper.ensureTemps();
   var bignum = new BigInteger;
   bignum.fromString(str, base);
   var bigmin = new BigInteger;
   bigmin.fromString(min, 10);
   var bigmax = new BigInteger;
   bigmax.fromString(max, 10);
   if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
    var temp = new BigInteger;
    bignum.addTo(Wrapper.two64, temp);
    bignum = temp;
   }
   var error = false;
   if (bignum.compareTo(bigmin) < 0) {
    bignum = bigmin;
    error = true;
   } else if (bignum.compareTo(bigmax) > 0) {
    bignum = bigmax;
    error = true;
   }
   var ret = goog.math.Long.fromString(bignum.toString());
   HEAP32[tempDoublePtr >> 2] = ret.low_;
   HEAP32[tempDoublePtr + 4 >> 2] = ret.high_;
   if (error) throw "range error";
  })
 };
 return Wrapper;
})();
if (memoryInitializer) {
 if (typeof Module["locateFile"] === "function") {
  memoryInitializer = Module["locateFile"](memoryInitializer);
 } else if (Module["memoryInitializerPrefixURL"]) {
  memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer;
 }
 if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
  var data = Module["readBinary"](memoryInitializer);
  HEAPU8.set(data, STATIC_BASE);
 } else {
  addRunDependency("memory initializer");
  var applyMemoryInitializer = (function(data) {
   if (data.byteLength) data = new Uint8Array(data);
   HEAPU8.set(data, STATIC_BASE);
   removeRunDependency("memory initializer");
  });
  var request = Module["memoryInitializerRequest"];
  if (request) {
   if (request.response) {
    setTimeout((function() {
     applyMemoryInitializer(request.response);
    }), 0);
   } else {
    request.addEventListener("load", (function() {
     if (request.status !== 200 && request.status !== 0) {
      console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status);
     }
     if (!request.response || typeof request.response !== "object" || !request.response.byteLength) {
      console.warn("a problem seems to have happened with Module.memoryInitializerRequest response (expected ArrayBuffer): " + request.response);
     }
     applyMemoryInitializer(request.response);
    }));
   }
  } else {
   Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, (function() {
    throw "could not load memory initializer " + memoryInitializer;
   }));
  }
 }
}
function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"]) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};
Module["callMain"] = Module.callMain = function callMain(args) {
 assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
 assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
 args = args || [];
 ensureInitRuntime();
 var argc = args.length + 1;
 function pad() {
  for (var i = 0; i < 4 - 1; i++) {
   argv.push(0);
  }
 }
 var argv = [ allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL) ];
 pad();
 for (var i = 0; i < argc - 1; i = i + 1) {
  argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
  pad();
 }
 argv.push(0);
 argv = allocate(argv, "i32", ALLOC_NORMAL);
 initialStackTop = STACKTOP;
 try {
  var ret = Module["_main"](argc, argv, 0);
  exit(ret, true);
 } catch (e) {
  if (e instanceof ExitStatus) {
   return;
  } else if (e == "SimulateInfiniteLoop") {
   Module["noExitRuntime"] = true;
   return;
  } else {
   if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [ e, e.stack ]);
   throw e;
  }
 } finally {
  calledMain = true;
 }
};
function run(args) {
 args = args || Module["arguments"];
 if (preloadStartTime === null) preloadStartTime = Date.now();
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
   Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms");
  }
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  if (Module["_main"] && shouldRunNow) Module["callMain"](args);
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout((function() {
   setTimeout((function() {
    Module["setStatus"]("");
   }), 1);
   doRun();
  }), 1);
 } else {
  doRun();
 }
}
Module["run"] = Module.run = run;
function exit(status, implicit) {
 if (implicit && Module["noExitRuntime"]) {
  return;
 }
 if (Module["noExitRuntime"]) {} else {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  exitRuntime();
  if (Module["onExit"]) Module["onExit"](status);
 }
 if (ENVIRONMENT_IS_NODE) {
  process["stdout"]["once"]("drain", (function() {
   process["exit"](status);
  }));
  console.log(" ");
  setTimeout((function() {
   process["exit"](status);
  }), 500);
 } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
  quit(status);
 }
 throw new ExitStatus(status);
}
Module["exit"] = Module.exit = exit;
var abortDecorators = [];
function abort(what) {
 if (what !== undefined) {
  Module.print(what);
  Module.printErr(what);
  what = JSON.stringify(what);
 } else {
  what = "";
 }
 ABORT = true;
 EXITSTATUS = 1;
 var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
 var output = "abort(" + what + ") at " + stackTrace() + extra;
 if (abortDecorators) {
  abortDecorators.forEach((function(decorator) {
   output = decorator(output, what);
  }));
 }
 throw output;
}
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) {
 shouldRunNow = false;
}
run();






