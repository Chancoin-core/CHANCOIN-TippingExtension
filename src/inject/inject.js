window.onload = function() {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);

      var mutationObserver = window.MutationObserver;
      var myObserver       = new mutationObserver (mutationHandler);
      var obsConfig        = {
        childList: true, attributes: true,
        subtree: true,   attributeFilter: ['class']
      };

      myObserver.observe (document, obsConfig);

      //Set the classic original form name now as its already loaded in the DOM
      setAddressFromLocalStorageIfChecked(fourChanVanilla);
    }
  }, 10);
};

var fourChanVanillaQR = 0;
var fourChanXQR = 1;
var fourChanVanilla = 2;

/**
 * Sets the name field with the passed in wallet address. This method adds the "$4CHN:" prefix
 * @param {int} mode determines where the method should look for the name field
 */
function setAddressFromLocalStorageIfChecked(mode){

  chrome.storage.local.get("insert",function(result){
    if(result !== undefined && result.insert){
      //get the address from the storage
      chrome.storage.local.get("address",function(result){
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
  var formattedAddress = "$4CHN:" + addressToSet;
  var tmp;

  if(mode === fourChanXQR) {
    tmp = document.getElementById("qr").children[1].children[0].children[2];
  } else if(mode === fourChanVanillaQR){
    tmp = document.getElementById("qrForm").children[0].children[0];
  } else if(mode === fourChanVanilla){
    tmp = document.getElementById("postForm").children[0].children[0].children[1].children[0];
  }
  tmp.value = formattedAddress;
}

var postAddressPrefixes = ["$4chn:", "$4CHN:", "$CHAN:", "$chan:"];

function startsWithPostAddressPrefixes (postAddress) {
  return postAddressPrefixes.filter( function (e) { return postAddress.startsWith(e); }).length > 0;
}

/**
 * Adds the tip poster button to the menu.
 * The parameter @param {boolean} is4ChanXPresent can be optionally passed to indicate that 4ChanX is installed,
 * since the DOM node to which the menu item will be appended to is different in that case.
 * @return void
 */
function addButton(postAddress, is4ChanXPresent) {
  // transforms undefined into false, in case is4ChanXPresent is not passed
  // also transforms any other truthy value into true
  is4ChanXPresent = !!is4ChanXPresent;

  postAddress = postAddress.toLowerCase();

  if (!startsWithPostAddressPrefixes(postAddress)){
    return;
  }

  var menuDomRef;
  var menuItemDomRef;

  if (is4ChanXPresent){
    menuDomRef = document.getElementById("menu");
    menuItemDomRef = document.createElement("a");
    menuItemDomRef.id = "tipPoster";
    menuItemDomRef.className += ' entry';
    menuItemDomRef.click = "send4CHN()";
    menuItemDomRef.onmouseout  = removeFocus;
    menuItemDomRef.onmouseover = addFocus;
  } else {
    menuDomRef = document.getElementById("post-menu").children[0];
    menuItemDomRef = document.createElement("li");
  }

    menuItemDomRef.innerHTML = "<img src='http://i.imgur.com/sh8aYT1.png' style='width:15px;vertical-align:middle'/>  Tip poster";
    menuItemDomRef.addEventListener("click", send4CHN);
    menuDomRef.appendChild(menuItemDomRef);

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
 * @param {string} address
 * @param {Number} amount
 * @return {Number} sum
 */
function send4CHN(address, amount) {
  var postAddress = getPostAddress();
  if(postAddress === ""){
    postAddress = getPostAddressX();
  }

  address = addressFromPostName(postAddress.replace(/\s+/g, ''));

  swal({
    title: "Tip a poster",
    text: "How much 4CHN would you like to send to " + address + "?",
    type: "input",
    showCancelButton: true,
    closeOnConfirm: false,
    animation: "slide-from-top",
    inputPlaceholder: "Number of coins",
    showLoaderOnConfirm: true,
  },
       function(inputValue){

         //did user cancel
         if(inputValue === false){
           return;
         }

         if(inputValue==="" || /^\D+$/.test(inputValue)) {
           //use a timeout so the loader has a chance to fire
           setTimeout(function(){
             swal("Error!", "Please enter a number.", "error");
           }, 500);
         }
         else if(parseFloat(inputValue) < 0.00000001) {
           //use a timeout so the loader has a chance to fire
           setTimeout(function(){
             swal("Error!", "Value must be greater than or equal to 0.00000001.", "error");
           }, 500);
         }
         else if(inputValue!==null) {

           $.ajax({
             type: "POST",
             url: "http://username:password@127.0.0.1:43814",
             data: '{"method": "sendtoaddress", "params":["' + address + '",' + inputValue  + ',"A tip for post #' + postNum + '."]}',
             dataType: "json",
             contentType: "application/json-rpc;",
             success: function(response) {
               //use a timeout so the loader has a chance to fire
               setTimeout(function(){
                 if(response.error !== null) {
                   swal("Error!", "There was an error sending the coins", "error");
                 }
                 else {
                   swal("Success!", "You sent " + inputValue + " 4CHN to " + address + ".", "success");
                 }
               }, 500);

             },
             error: function(xhr, textStatus, errorThrown) {
               swal("Error!", "There was an error sending the coins", "error");
             }
           });
         }
       });
}

/**
 * Searchs the elements for the posters address.
 * To be used with vanilla 4chan.
 * @return {string} postAddress
 */
function getPostAddress() {
  try {
    postNum = document.getElementById("post-menu").children[0].children[0].getAttribute("data-id");
    return document.getElementById("pc" + document.getElementById("post-menu").children[0].children[0].getAttribute("data-id")).getElementsByClassName("name")[1].innerText;
  } catch(e) {
    return "";
  }
}

/**
 * Searchs the elements for the posters address.
 * To be used with 4chanX.
 * @return {string} postAddress
 */
function getPostAddressX(){
  try {
    postNum = document.getElementById("menu").parentNode.parentNode.children[0].name;
    return document.getElementById("menu").parentNode.parentNode.getElementsByClassName("name")[0].innerText;
  } catch(e) {
    return "";
  }
}

/**
 * Adds two numbers
 * @param {mutationRecords} mutationRecords
 * @return void
 */
function mutationHandler (mutationRecords) {
  mutationRecords.forEach ( function (mutation) {
    if (mutation.type == "childList" && typeof mutation.addedNodes  == "object" && mutation.addedNodes.length) {
      for (var J = 0, L = mutation.addedNodes.length;  J < L;  ++J) {
        checkForCSS_Class (mutation.addedNodes[J], "dd-menu");
        checkForCSS_Class (mutation.addedNodes[J], "dialog");
        checkForCSS_Class (mutation.addedNodes[J], "reply-to-thread");
        checkForCSS_Class (mutation.addedNodes[J], "reply");
      }
    }
    else if (mutation.type == "attributes") {
      checkForCSS_Class (mutation.target, "dd-menu");
      checkForCSS_Class (mutation.target, "reply-to-thread");
      checkForCSS_Class (mutation.target, "dialog");
      checkForCSS_Class (mutation.target, "reply");

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
function checkForCSS_Class (node, className) {
  if (node.nodeType === 1) {
    if (node.classList.contains (className) ) {
      switch (className) {
        case "dialog":
          // Adding a button with 4ChanX
          addButton(getPostAddressX(), true);
          break;
        case "dd-menu":
          // adding a button with vanilla 4chan
          addButton(getPostAddress());
          break;
        case "reply-to-thread":
          // adding the wallet address to the name field with 4chanX
          setAddressFromLocalStorageIfChecked(fourChanXQR);
          break;
        case "reply":
          // adding the wallet address to the name field with vanilla 4chan
          setAddressFromLocalStorageIfChecked(fourChanVanillaQR);
          break;
      }
    }
  }
}
