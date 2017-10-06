var site;
var elementCheck;
var postNum; //not ideal to make this global but since we're not passing arguments for whatever reason, we're doing this as well

window.onload = function() {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      elementCheck = JSON.parse(loadElements());

      var patt = /https?:\/\/(?:.*\.)?(.+)\.(?:(?:org)|(?:net)).*/gi;
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
 */
function loadElements() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.extension.getURL('/res/elements.json'), false);
    xhr.send();
    while(xhr.readyState !== 4 || xhr.status !== 200)
    {
        ;; //TODO set a sanity var so we don't loop forever
    }
    return xhr.responseText;
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
  var elem;

  if (typeof mode[0] != "string") { //weird stuff
    mode[0] = mode[0][0];
  }

  elem = document.getElementById(mode[0]);

  $.each(mode, function(index, value) {
    if (index === 0) {
      return true; //continue
    }
    else if (value === -1) {
      elem = elem.parentNode;
    }
    else {
      elem = elem.children[value];
    }
  });

  elem.value = formattedAddress;
}

/**
 * Adds the tip poster button to the menu.
 * @return void
 */
function addButton(args) {
  var postAddress = args[0];
  var special = args[1];

  if (postAddress === "") {
    return;
  }

  var tmp = elementCheck[site];
  var a = document.getElementById(special ? tmp.special.menu[0] : tmp.menu[0]);

  if(!special) {
    $.each(tmp.menu, function(index, value) {
      if (index === 0) {
        return true; //continue
      }
      else if (value === -1) {
        a = a.parentNode;
      }
      else {
        a = a.children[value];
      }
    });
  }

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

  var b = document.createElement(special ? "a" : "li");
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
  if(isFocus){
    element.className += " focused";
  } else{
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
 * Searchs the elements for the posters address.
 * @return {string} postAddress
 */
function getPostAddress(X) { //TODO special autodetection
  try { //TODO refactor for cross chan
    var tmp = elementCheck[site];
    postNum = document.getElementById(X ? tmp.special.menu[0] : tmp.menu[0]);
    if(X)
    {
      postNum = postNum.parentNode.parentNode.children[0].name;
    }
    else {
      postNum = postNum.children[0].children[0].getAttribute("data-id");
    }
    var toRet = document.getElementById("pi" + postNum).children[1].children[0].innerText;
    var patt = /^\$(?:(?:4CHN)|(?:CHAN)):\s?.{34}$/mgi;
    if (!patt.test(toRet)) {
      toRet = "";
    }
    return toRet;
  } catch(e) {
    return "";
  }
}

/**
 * Gets the post address on 8ch.net
 * @return {string} postAddress
 */
function addr8ch() { //TODO refactor
  postNum = document.getElementsByClassName("post-btn-open")[0].parentNode.children[0];
  var toRet = postNum.parentNode.children[3].children[0].innerText;
  postNum = postNum.id;
  var patt = /^\$C.{33}$/mgi;
  if (!patt.test(toRet)) {
    toRet = "";
  }
  return toRet;
}

/**
 * Adds two numbers
 * @param {mutationRecords} mutationRecords
 * @return void
 */
function mutationHandler(mutationRecords) {
  mutationRecords.forEach (function(mutation) {
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
    if (node.classList.contains(className)) {
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
}
