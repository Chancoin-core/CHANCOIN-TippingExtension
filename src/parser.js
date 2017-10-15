/**
 * Parses the values passed to it
 * @param {arr, string, number} val - value passed
 * @param {elem} base - determines base from which to derive elements
 * @return {elem, string} ret
 */
function parseValue(val, base) {
  var patt = /^(?:\\\+)?;([LPAFWBRTCIN]+):(.+)$/g;
  if (typeof val == "string") {
    var match = patt.exec(val);
    var mod = match[1];
    var v = match[2];
    var useR = false;

    if (val.indexOf("\\+") !== -1) {
      var tmp = base + parseValue(val.split('+')[1], document, special);
      return parseValue(";I:" + tmp, document, special);
    }

    if (v === null || v === undefined) {
      return undefined;
    }

    if (v.indexOf('~') !== -1) {
      v = v.split('~')[0];
    }

    if (mod.indexOf('R') !== -1) {
      useR = true;
    }

    var toRet;
    mod.split('').forEach(function(value) {
      switch (value) {
      case 'N':
        toRet = v;
        break;
      case 'L':
        var tmp = elementCheck[site];
        if (special) {
          tmp = tmp["special"];
        }
        tmp = tmp[v];
        if (tmp === null || tmp === undefined) {
          toRet = undefined;
        }
        toRet = parseValue(tmp, base, special);
        break;
      case 'P':
        toRet = parseValue(elementCheck[site][v], document, special); //for now, this is sufficient; should be refactored though
        break;
      case 'A':
        toRet = base.getAttribute(v);
        if (toRet === null) {
          toRet = base[v];
        }
        break;
      case 'C':
        var tmp = v.split("|");
        toRet = (useR ? base : document).getElementsByClassName(tmp[0]);
        if (tmp.length > 1) {
          toRet = toRet[tmp[1]];
        }
        break;
      case 'I':
        toRet = (useR ? base : document).getElementById(v);
        break;
      case 'T':
        var tmp = v.split("|");
        toRet = (useR ? base : document).getElementsByTagName(tmp[0]);
        if (tmp.length > 1) {
          toRet = toRet[tmp[1]];
        }
        break;
      case 'F':
        var tmp = v.split('^');
        var args = tmp[1].split('ˇ');
        for (var i = 0; i < args.length; i++) {
          args[i] = parseValue(args[i], base, special);
        }
        var b = mod.indexOf('W') !== -1 ? window : base;
        toRet = b[tmp[0]](args);
        break;
      default:
        break;
      }
    });
    return toRet;
  }
  else if (typeof val == "number") {
    if (val === -1) {
      return base.parentNode;
    }
    else {
      return base.children[val];
    }
  }
  else {
    var toRet = base;
    $.each(val, function(index, value) {
      var or = false;
      if (typeof value == "string") {
        or = value.indexOf('~') !== -1;
        if (value.split(':')[0].indexOf('B') !== -1) {
          toRet = parseValue(value, toRet, special);
          return true;
        }
      }
      var tmp = parseValue(value, toRet, special);
      if (or) {
        var patt = new RegExp(value.split('~')[1], "gmi");
        if (!patt.test(tmp)) {
          toRet = base;
          return true;
        }
      }
      if (tmp !== null && tmp !== undefined) {
        toRet = tmp;
        if (or) {
          return false;
        }
      }
    });
    return toRet;
  }
}

module.exports = parseValue;
