var site;
var elementCheck;
var langDef;
var lang = "en";
var postNum;
var postAddress;
var special = false;

window.onload = function() {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);

      elementCheck = JSON.parse(JSON.minify(loadJSON("/res/elements.json")));
      langDef = JSON.parse(loadJSON("/res/lang.json"));

      var patt = /https?:\/\/(?:.*\.)?(.+)\.\D{2,3}\/.*/gi;
      site = patt.exec(window.location.href)[1];

      if (elementCheck[site].special !== undefined && elementCheck[site].special !== null) {
        var chk = parseValue(elementCheck[site].special.check, document);
        if (chk !== undefined && chk !== null) {
          special = true;
        }
      }

      var mutationObserver = window.MutationObserver;
      var myObserver = new mutationObserver (mutationHandler);
      var obsConfig = {
        childList: true, attributes: true,
        subtree: true,   attributeFilter: ['class']
      };

      myObserver.observe(document, obsConfig);

      setInterval(function() {
        chrome.storage.local.get("lang", function(result) {
          if(result !== undefined && result.lang !== undefined && result.lang !== "") {
            lang = result.lang;
          }
        });
      }, 500);

      //Set the classic original form name now as its already loaded in the DOM
      setAddressFromLocalStorageIfChecked(elementCheck[site].reg);
    }
  }, 10);
};

/**
 * Gets the json file defined by the parameter
 * @param {string} path - determines path of json to load
 * @return {string} responseText
*/
function loadJSON(path) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.extension.getURL(path), false);
    xhr.send();
    var sanity = 100;
    while (xhr.readyState !== 4 || xhr.status !== 200)
    {
        if (sanity === 0) {
          swal("Error!", "Failed to load JSON. Contact a developer with this error message.", "error");
        }
        else if (sanity > 0) {
          sanity--;
        }
    }
    return xhr.responseText;
}

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

/**
 * Checks for overlapping elements by checking every element of the passed class for overlap with passed element
 * @param {arr} args - array from which to derive the element and class to check
 * @return {elem} ret
*/
function chkOverlap(args) {
  var cls = args[0];
  var elem = args[1].getBoundingClientRect();
  var toRet = null;
  $.each(cls, function(index, value) {
    var rect = value.getBoundingClientRect();
    if (elem.top > rect.top && elem.top < rect.bottom) {
      if (elem.left > rect.left && elem.left < rect.right) {
        toRet = value;
        return;
      }
    }
  });
  return toRet;
}

/**
 * Sets the name field with the passed in wallet address. This method adds the "$4CHN:" prefix
 * @param {int} mode determines where the method should look for the name field
 */
function setAddressFromLocalStorageIfChecked(mode){
  chrome.storage.local.get("insert", function(result){
    if(result !== undefined && result.insert){
      //get the address from the storage
      chrome.storage.local.get("address", function(result){
        if(result !== undefined && result.address !== undefined && result.address !== ""){
          setNameUsingAddress(result.address, mode);
        }
        else{
          console.log("No Address Found");
          return null;
        }
      });
    }
    else {
      return null;
    }
  });

}

/**
 * Sets the name field with the passed in wallet address. This method adds the "$4CHN:" prefix
 * @param {string} addressToSet address that will be used
 * @param {string} mode determines where the method should look for the name field
 * @return void
 */
function setNameUsingAddress(addressToSet, mode){
  var prefix = elementCheck[site].limit ? "" : "$";
  var formattedAddress = prefix + addressToSet;
 
  if (typeof mode[0] != "string") { //weird stuff
    mode = mode[0];
  }

  var elem = parseValue(mode, document, true);

  elem.value = formattedAddress;
}

/**
 * Adds the tip poster button to the menu.
 * @return void
 */
function addButton(type) {
  if (postAddress === "") {
    return;
  }

  var tmp = elementCheck[site];
  var a = parseValue(special ? tmp.special.menu : tmp.menu, document, special);

  var doHalt = false;

  if (a === null || a === undefined) {
    return;
  }
  
  $.each(a.children, function(index, value) {
    if(value.innerHTML.indexOf(langDef[lang].strings.button) != -1) { //id doesn't get set if vanilla
      doHalt = true;
      return false;
    }
  });

  if(doHalt) {
    return;
  }

  var b = document.createElement(type);
  if (type == "a") {
    b.id = "tipPoster";
    b.className += ' entry';
    b.click = "send4CHN()";
    b.onmouseout  = removeFocus;
    b.onmouseover = addFocus;
  }
  b.innerHTML = "<img src='https://i.imgur.com/sh8aYT1.png' style='width:15px;vertical-align:middle'/> " + langDef[lang].strings.button;
  b.addEventListener("click", send4CHN);
  a.appendChild(b);
}


/**
 * Clears the focused class from all child nodes in the menu element.
 * @return void
 */
function clearFocusedClassFromMenu() {
  var elem = special ? elementCheck[site].special.menu : elementCheck[site].menu;
  var menu = parseValue(elem, document);

  $.each(menu.getElementsByClassName("focused"), function(index, value) {
    setFocus(value, false);
  });
}

/**
 * Adds focus to the tipPoster element
 * @return void
 */
function addFocus() {
  clearFocusedClassFromMenu();
  setFocus(document.getElementById("tipPoster"), true);
}

/**
 * Removes focus to the tipPoster element
 * @return void
 */
function removeFocus() {
  setFocus(document.getElementById("tipPoster"), false);
}

/**
 * Adds or removes the 'focused' class from the passed in element depending on the isFocused parameter.
 * @param {Element} element
 * @param {boolean} isFocused
 * @return {Number} sum
 */
function setFocus(element, isFocused) {
  if (isFocused) {
    element.className += " focused";
  }
  else {
    element.className = element.className.replace(" focused", "");
  }
}


/**
 * Returns the address, which should be the portion of the post name following
 * the colon.
 * @param {string} postName
 * @return {string} address
 */
function addressFromPostName(postName) {
  if (postName.indexOf(':') !== -1) {
    return postName.split(':')[1];
  }
  if (postName.indexOf('$') !== -1) { //in case someone sets their addr manually
    return postName.split('$')[1];
  }
  return postName;
}

/**
 * Sends 4CHN to the posters address. The method takes advantage of the sweetalert
 * modal windows to collect and display information to the user.
 * @return {Number} sum
 */
function send4CHN() {
  var address = addressFromPostName(postAddress);

  var l = langDef[lang];

  swal({
    title: l.strings.sendtitle,
    text: l.strings.sendtext + address + "?",
    type: "input",
    showCancelButton: true,
    closeOnConfirm: false,
    animation: "slide-from-top",
    inputPlaceholder: l.strings.sendph,
    showLoaderOnConfirm: true,
  }, function(inputValue){
    //did user cancel
    if (inputValue === false){
      return;
    }

    if (inputValue === "" || /^\D+$/.test(inputValue)) {
      //use a timeout so the loader has a chance to fire
      setTimeout(function(){
        swal(l.swal.error, l.strings.formaterr, "error");
      }, 500);
    }
    else if (parseFloat(inputValue) < 0.00000001) {
      //use a timeout so the loader has a chance to fire
      setTimeout(function() {
        swal(l.swal.error, l.strings.amounterr, "error");
      }, 500);
    }
    else if (inputValue !== null) {
      $.ajax({
        type: "POST",
        url: "http://username:password@127.0.0.1:43814",
        data: '{"method": "sendtoaddress", "params":["' + address + '",' + inputValue  + ',"A tip for post #' + postNum + '."]}',
        dataType: "json",
        contentType: "application/json-rpc;"
      }).done(function(data, status, xhr) {
        //use a timeout so the loader has a chance to fire
        setTimeout(function(){
          if (status.indexOf("error") != -1) {
            swal(l.swal.error, l.strings.senderr, "error");
          }
          else {
            swal(l.swal.success, l.strings.sendok[0] + inputValue + l.strings.sendok[1] + address + ".", "success");
          }
        }, 500);
      }).fail(function(xhr, status, error) {
        swal(l.swal.error, l.strings.senderr, "error");
      });
    }
  });
}

/**
 * Searches the elements for the poster's address.
 * @return void
 */
function getPostAddress() {
  var tmp = elementCheck[site];
  postNum = parseValue(special ? tmp.special.postNum : tmp.postNum, document, special);
  var addr = parseValue(special ? tmp.special.addr : tmp.addr, document, special);
  var patt = /^\$?(?:(?:(?:4CHN)|(?:CHAN)):)?\s?[^IOl0]{34}$/mg;
  if (!patt.test(addr)) {
    addr = "";
  }
  postAddress = addr;
}

/**
 * Adds two numbers
 * @param {mutationRecords} mutationRecords
 * @return void
 */
function mutationHandler(mutationRecords) {
  mutationRecords.forEach(function(mutation) {
    if (mutation.type == "childList" && typeof mutation.addedNodes == "object" && mutation.addedNodes.length) {
      for (var J = 0, L = mutation.addedNodes.length;  J < L;  ++J) {
        for (var v1 in elementCheck[site].actions) {
          for (var v2 in elementCheck[site].actions[v1]) {
            checkForCSS_Class(mutation.addedNodes[J], v2);
          }
        }
      }
    }
    else if (mutation.type == "attributes") {
      for (var v1 in elementCheck[site].actions) {
        for (var v2 in elementCheck[site].actions[v1]) {
          checkForCSS_Class(mutation.target, v2);
        }
      }
    }
  });
}

/**
 * Checks the passed in node for the passed in CSS class name.
 * Depending on the class name, different actions will be carried out.
 * @param {node} node to check
 * @param {string} class name to check
 * @return void
 */
function checkForCSS_Class(node, className) {
  if (node.nodeType === 1) {
    if (elementCheck[site].classlist) {
      if (!node.classList.contains(className)) {
        return;
      }
    }

    var actions = elementCheck[site].actions;
    for (var action in actions) {
      if (!actions.hasOwnProperty(action)) {
        continue;
      }

      var args = actions[action][className];

      if (args === undefined || args === null) {
        continue;
      }

      args = args.slice(); // noice

      if (typeof args === "string") {
        args = [elementCheck[site][args]];
      }
      else {
        try {
          try {
            window[args[0]](args[1]);
          }
          catch (e) { } // to mitigate errors with things like 'modal'
          args.splice(0, 1);
        }
        catch (e) {
          var tmp = elementCheck[site];
          $.each(args, function(index, value) {
            if (index === 0) {
              args = tmp[value];
            }
            else {
              args = args[value];
            }
          });
        }
      }

      window[action](args);
    }
  }
}
