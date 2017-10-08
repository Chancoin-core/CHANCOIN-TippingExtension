var site;
var elementCheck;
var postNum; //not ideal to make this global but since we're not passing arguments for whatever reason, we're doing this as well

window.onload = function() {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      elementCheck = JSON.parse(JSON.minify(loadElements()));

      var patt = /https?:\/\/(?:.*\.)?(.+)\.\D{2,3}\/.*/gi;
      site = patt.exec(window.location.href)[1];

      clearInterval(readyStateCheckInterval);

      var mutationObserver = window.MutationObserver;
      var myObserver       = new mutationObserver (mutationHandler);
      var obsConfig        = {
        childList: true, attributes: true,
        subtree: true,   attributeFilter: ['class']
      };

      myObserver.observe (document, obsConfig);

      //Set the classic original form name now as its already loaded in the DOM
      setAddressFromLocalStorageIfChecked(elementCheck[site].reg);
    }
  }, 10);
};

/**
 * Gets the json file containing element definitions for chans
 * @return {string} responseText
 */
function loadElements() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.extension.getURL('/res/elements.json'), false);
    xhr.send();
    while (xhr.readyState !== 4 || xhr.status !== 200)
    {
        ;; //TODO set a sanity var so we don't loop forever
    }
    return xhr.responseText;
}

function parseValue(val, base, special) {
  var patt = /^(?:\\\+)?;([LPAFWCIN]+):(.+)$/g;
  if (typeof val == "string") {
    var match = patt.exec(val);
    var mod = match[1];
    var v = match[2];

    if (val.indexOf("\\+") !== -1) {
      var tmp = base + parseValue(val.split('+')[1], document, special);
      return parseValue(";I:" + tmp, document, special);
    }

    if (v === null || v === undefined) {
      return undefined;
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
          toRet = document.getElementsByClassName(tmp[0]);
          if (tmp.length > 1) {
            toRet = toRet[tmp[1]];
          }
          break;
        case 'I':
          toRet = document.getElementById(v);
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
    $.each(val, function(index, value) { //TODO implement OR for fucking russians
      var tmp = parseValue(value, toRet, special);
      if (tmp !== null && tmp !== undefined) {
        toRet = tmp;
      }
    });
    return toRet;
  }
}

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
  var prefix = elementCheck[site].limit ? "$" : "$4CHN:";
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
function addButton(args) {
  var postAddress = args[0];
  var special = args[1];
  var type = args[2];

  if (postAddress === "") {
    return;
  }

  var tmp = elementCheck[site];
  var a = parseValue(special ? tmp.special.menu : tmp.menu, document, special);

  var doHalt = false;
  $.each(a.children, function(index, value) {
    if(value.innerHTML.indexOf("Tip poster") != -1) { //id doesn't get set if vanilla
      doHalt = true;
      return; //this just breaks the each, not the whole fn; hence the doHalt
    }
  });

  if(doHalt) {
    return;
  }

  var b = document.createElement(type);
  if (special) {
    b.id = "tipPoster";
    b.className += ' entry';
    b.click = "send4CHN()";
    b.onmouseout  = removeFocus;
    b.onmouseover = addFocus;
  }
  b.innerHTML = "<img src='https://i.imgur.com/sh8aYT1.png' style='width:15px;vertical-align:middle'/>  Tip poster";
  b.addEventListener("click", send4CHN);
  a.appendChild(b);
}

/**
 * Clears the Focused class from all child nodes in the menu element.
 * @return void
 */
function clearFocusedClassFromMenu(){
  var childNodes = document.getElementById("menu").children;

  for (var J = 0, L = childNodes.length;  J < L;  ++J) {
    if(childNodes[J].className.includes("focused")){
      setFocus(childNodes[J], false);
    }
  }
}

/**
 * Adds Focus to the tipPoster element
 * @return void
 */
function addFocus(){
  clearFocusedClassFromMenu();
  setFocus(document.getElementById("tipPoster"), true);
}

/**
 * Removes Focus to the tipPoster element
 * @return void
 */
function removeFocus(){
  setFocus(document.getElementById("tipPoster"), false);
}

/**
 * adds or removes the 'focused' class from the passed in element depending on the isFocued parameter.
 * @param {Element} element
 * @param {boolean} isFocued
 * @return {Number} sum
 */
function setFocus(element, isFocus){
  if (isFocus) {
    element.className += " focused";
  } else {
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
  return postName.split(':')[1];
}

/**
 * Sends 4CHN to the posters address. The method takes advantage of the sweetalert
 * modal windows to collect and display information to the user.
 * @return {Number} sum
 */
function send4CHN() {
  var postAddress = getPostAddress();
  if (postAddress === ""){
    postAddress = getPostAddress(true);
  }

  var address = addressFromPostName(postAddress.replace(/\s+/g, ''));

  swal({
    title: "Tip a poster",
    text: "How much 4CHN would you like to send to " + address + "?",
    type: "input",
    showCancelButton: true,
    closeOnConfirm: false,
    animation: "slide-from-top",
    inputPlaceholder: "Number of coins",
    showLoaderOnConfirm: true,
  }, function(inputValue){
    //did user cancel
    if (inputValue === false){
      return;
    }

    if (inputValue === "" || /^\D+$/.test(inputValue)) {
      //use a timeout so the loader has a chance to fire
      setTimeout(function(){
        swal("Error!", "Please enter a number.", "error");
      }, 500);
    }
    else if (parseFloat(inputValue) < 0.00000001) {
      //use a timeout so the loader has a chance to fire
      setTimeout(function() {
        swal("Error!", "Value must be greater than or equal to 0.00000001.", "error");
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
            swal("Error!", "There was an error sending the coins", "error");
          }
          else {
            swal("Success!", "You sent " + inputValue + " 4CHN to " + address + ".", "success");
          }
        }, 500);
      }).fail(function(xhr, status, error) {
        swal("Error!", "There was an error sending the coins", "error");
      });
    }
  });
}

/**
 * Searches the elements for the poster's address.
 * @return {string} postAddress
 */
function getPostAddress(special) { //TODO special autodetection
  try {
    var tmp = elementCheck[site];
    postNum = parseValue(special ? tmp.special.postNum : tmp.postNum, document, special);
    var toRet = parseValue(special ? tmp.special.addr : tmp.addr, document, special);
    if (typeof postNum != "string") {
      postNum = postNum.id;
    }
    var patt = /^\$(?:(?:(?:4CHN)|(?:CHAN)):)?\s?.{34}$/mgi;
    if (!patt.test(toRet)) {
      toRet = "";
    }
    return toRet;
  } catch(e) {
    return "";
  }
}

/**
 * Adds two numbers
 * @param {mutationRecords} mutationRecords
 * @return void
 */
function mutationHandler(mutationRecords) {
  mutationRecords.forEach(function(mutation) {
    if (mutation.type == "childList" && typeof mutation.addedNodes  == "object" && mutation.addedNodes.length) {
      for (var J = 0, L = mutation.addedNodes.length;  J < L;  ++J) {
        $.each(elementCheck[site].watch, function(index, value) {
          checkForCSS_Class(mutation.addedNodes[J], value);
        });
      }
    }
    else if (mutation.type == "attributes") {
      $.each(elementCheck[site].watch, function(index, value) {
          checkForCSS_Class(mutation.target, value);
        });
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
    var actions = elementCheck[site].actions;
    for (var action in actions) {
      if (!actions.hasOwnProperty(action)) {
        continue;
      }

      var args;

      args = actions[action][className];
      if (args === undefined || args === null) {
        continue;
      }

      console.log(args);

      if (typeof args === "string") {
        args = [elementCheck[site][args]];
      }
      else {
        try {
          var tmp = window[args[0]](args[1]);
          args = [tmp, args[1]];
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
