var langDef;
var lang = "en";

function loadJSON(path) { //unfortunately, have to duplicate
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

function saveOptions(e) {
  e.preventDefault();
  var selectElement = document.getElementById('sel1')
  var address = selectElement.options[ selectElement.selectedIndex ].value
  var isChecked = document.getElementById('cmn-toggle-1').checked;
  var langSel = document.getElementById('lang-sel');
  var language = langSel[langSel.selectedIndex].value
  chrome.storage.local.set({
    address: address
  });
  chrome.storage.local.set({
    insert: isChecked
  });
  chrome.storage.local.set({
    lang: language
  });
  lang = language;
  updateStrings();
}

/**
 * Makes a post request to the wallet to get one of the users wallet addresses
 * @return {string} wallet address
 */
function getAddressFromWallet(){
  $.ajax({
  	type: "POST",
  	url: "http://username:password@127.0.0.1:43814",
  	data: '{"method": "listreceivedbyaddress", "params":[0,true]}',
  	dataType: "json",
  	contentType: "application/json-rpc;",
  	success: function(response) {
      if(response.result !== undefined){
        addOptionsToSelect(response.result);
        selectPreviousAddress();
      }
      else{
        swal(langDef[lang].swal.error, langDef[lang].strings.walleterr, "error");
      }
  	},
  	error: function(xhr, textStatus, errorThrown) {
      swal(langDef[lang].swal.error, langDef[lang].strings.walleterr, "error");
  	}
  });
}

function updateStrings() {
  var toUpdateHTML = document.getElementsByClassName("settingLabel");
  $.each(toUpdateHTML, function(index, value) {
    value.innerText = langDef[lang].main[value.id];
  });
  document.getElementById("settings").innerText = langDef[lang].main.settings;
}

/**
 * Adds the array of addresses to the selection box
 * @param {array} optionsArray array of addresses returned from the wallet
 */
function addOptionsToSelect(optionsArray){
  select = document.getElementById('sel1');

  for (var i = 0; i < optionsArray.length; i++){
    addOptionToSelect(select, optionsArray[i].address, optionsArray[i].address)
  }
}

/**
 * Adds a new option to the passed in selection box element
 * @param {Element} selectElement selection box to add option to
 * @param {string} newOption new option to add
 */
function addOptionToSelect(selectElement, newVal, newHTML){
  var opt = document.createElement('option');
  opt.value = newVal;
  opt.innerHTML = newHTML;
  selectElement.appendChild(opt);
}

/**
 * Selects the previously used address on the selection box
 */
function selectPreviousAddress(){
  function setCurrentChoice(result) {
    if(result !== undefined && result.address !== undefined && result.address !== ""){
      var select = document.getElementById('sel1').value = result.address;
    }
    else{
      console.log("No Saved Address Found");
      return null;
    }
  }

  chrome.storage.local.get("address",setCurrentChoice);
}

/**
 * Restores the checkbox state
 */
function restoreSettings(){
  function setCurrentChoice(result) {
    if(result !== undefined && result.insert !== undefined && result.insert !== ""){
      document.getElementById('cmn-toggle-1').checked = result.insert;
    }
    else{
      console.log("No Settings Found");
      return null;
    }
  }

  chrome.storage.local.get("insert", setCurrentChoice);
  chrome.storage.local.get("lang", function(result) {
    if(result !== undefined && result.lang !== undefined && result.lang !== "") {
      lang = result.lang;
      updateStrings();
      var select = document.getElementById('lang-sel').value = result.lang;
    }
  });
}

/**
 * Generates and gets a new address from the users wallet.
 * @return {string} new wallet address
 */
function generateNewAddress(){
  $.ajax({
    type: "POST",
    url: "http://username:password@127.0.0.1:43814",
    data: '{"method": "getnewaddress", "params":[]}',
    dataType: "json",
    contentType: "application/json-rpc;",
    success: function(response) {
      select = document.getElementById('sel1');
      addOptionToSelect(select, response.result, response.result);
    },
    error: function(xhr, textStatus, errorThrown) {
      swal(langDef[lang].swal.error, langDef[lang].strings.createerr, "error");
    }
  });
}

window.onload = function() {
      document.getElementById("addNewButton").addEventListener("click", generateNewAddress);
      document.getElementById("cmn-toggle-1").addEventListener("change", saveOptions);
      document.getElementById('sel1').addEventListener("change", saveOptions);
      document.getElementById('lang-sel').addEventListener("change", saveOptions);
      langDef = JSON.parse(loadJSON("/res/lang.json"));
      for (var l in langDef) {
        addOptionToSelect(document.getElementById('lang-sel'), l, langDef[l].name);
      }
      getAddressFromWallet();
      restoreSettings();
};
