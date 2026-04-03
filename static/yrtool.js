// javascript tools
// (c) rosandi, 2020


function getJSON(surl, func) {
    var request = new XMLHttpRequest();
    request.open('GET', surl, true);

    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            // console.log(this.response);
            var data = JSON.parse(this.response);
            func(data);
        } else {
            console.log("not found "+surl);
        }
    }

    request.send();
}

function postJSON(surl, data, func) {
    var request = new XMLHttpRequest();
    request.open('POST', surl, true);
    request.setRequestHeader('Content-type', 'application/json');

    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            console.log(this.response);
            var data = JSON.parse(this.response);
            func(data);
        } else {
            console.log("not found "+surl);
        }
    }

    request.send(JSON.stringify(data));
}

function postObject(url,obj,func) {
    var req = new XMLHttpRequest();

    req.onload=function() {
        var data=JSON.parse(this.response);
        func(data);
    }

    var fdata = new FormData();
    for(const key in obj) {fdata.append(key, obj[key]);}
    req.open("POST", url, true);
    req.send(fdata);
}

function getText(surl, func) {
    var request = new XMLHttpRequest();
    request.open('GET', surl, true);

    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            var data=this.response;
            func(data);
        } else {
            console.log("not found "+surl);
        }
    }

    request.send();
}

function getval(elid) {
    return document.getElementById(elid).value;
}

function setval(elid,val) {
    document.getElementById(elid).value=val;
}

function checked(elid) {
    return document.getElementById(elid).checked;
}

function settext(id, text) {
    document.getElementById(id).innerHTML=text;
}
    
function setText(id, text) { // WARNING: Obsolete!
    document.getElementById(id).innerHTML=text;
}

function appendtext(id, text) {
    document.getElementById(id).innerHTML+=text;
}

function getcontent(id){
    return document.getElementById(id).textContent;
}

function getContent(id) { // WARNING: Obsolete
    return document.getElementById(id).textContent;
}

function setbgColor(id, clr) {
    document.getElementById(id).style.backgroundColor=clr;
}

function goUrl(theurl) {
    this.document.location.href = theurl;
}

function focusOn(id) {
    document.getElementById(id).focus();
}

function clickElement(id) {
    document.getElementById(id).click();
}

function getelm(id) {
    return document.getElementById(id);
}

function uniqID(len=8) {
  var st = "";
  var hex = "abcdef0123456789";

  for (var i = 0; i < len; i++) {
    st += hex.charAt(Math.floor(Math.random() * hex.length));
    st += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return st;
}

function uploadFiles(
    respond_url, // server url
    input, // file input element
    progressbar='', // div: progress bar
    percentage='', // div: percentage
    statusbar=''   // div: status
) {
    const fileInput = document.getElementById(input);
    const files = fileInput.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files[]', files[i])
    }

    const xhr = new XMLHttpRequest()

    if (progressbar!='' && percentage!='') {
        const progressBar = document.getElementById(progressbar);
        const percentageText = document.getElementById(percentage);
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete =
                    Math.round((event.loaded / event.total) * 100)
                progressBar.value = percentComplete
                percentageText.innerText = percentComplete + "%"
            }
        }
    }

    if(statusbar!='') {
        const status = document.getElementById(statusbar)
        xhr.onload = function() {
            if (xhr.status === 200) {
                status.innerText = xhr.responseText
            } else {
                status.innerText = "error: "+xhr.responseText
            }
        }
    }

    xhr.open('POST', respond_url, true);
    xhr.send(formData);
}

/** MODAL DIALOG **/

function createModal(id,txt) {

    var ht='<div id="myModal" class="modal">'
    ht+='<div id="modal-content" class="modal-content" style="left:200px;top:100px">';
    ht+='<button id="myCloser" class="close">&times;</button>';
    ht+='<div id="dlgContent">'+txt+'</div>';
    ht+='</div></div>';
    setText(id,ht);

    var modal = document.getElementById("myModal");
    var btn = document.getElementById("ctrlButton");
    var span = document.getElementsByClassName("close")[0];

    btn.onclick = function() {
        modal.style.display = "block";
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

}

function draggableModal() {
    let isDragging = false
    let el=getelm("modal-content")

    el.onmousedown = (e) => {
        isDragging = true
        const offsetX = e.clientX - el.offsetLeft
        const offsetY = e.clientY - el.offsetTop

        document.onmousemove = (e) => {
          if (!isDragging) return
          el.style.left = (e.clientX - offsetX) + 'px'
          el.style.top = (e.clientY - offsetY) + 'px'
        }

        document.onmouseup = () => {
            if (! isDragging) return
            isDragging = false
        }
    }
}

function modalText(txt) {
    setText('dlgContent', txt);
}

function showModal(txt='') {
    if(txt!='') setText('dlgContent', txt);
    getelm('ctrlButton').click();
    draggableModal()
}

function hideModal() {
    getelm("myModal").style.display="none";
}

function getModalContent() {
    return getelm('dlgContent').innerHTML
}

/******
 *  text replacement with variable
 * rep is an object, {key:value, ...}
 * key->to be replaced, value -> replacement
 * subtext format to be replaced: {{text}}
 * 
 * NO SPACE BETWEEN!
 * 
 * if: value is array(3) -> [0] condition, [1] true replacement, [2] false replacement
 * for: value is array(2) -> [start, stop]
*/

function text_replace(txt, rep) {
    Object.entries(rep).forEach(([key, value])=> {
        key='{{'+key+'}}'
        if(Array.isArray(value)) {
            if(value[0]) txt=txt.replaceAll(key,value[1])
            else txt=txt.replaceAll(key,value[2])
        }
        else txt=txt.replaceAll(key,value)
    })

/*  --> PENDING!
    // search for forstatement {%for:start:stop%}
    while(txt.includes('{%for%}')) {
        let st=txt.indexOf('{%for%}')
        let se=txt.indexOf('{%endfor%}')
        if (se<=0) throw new Error('{%for::%} statement error')
        let holetmp=txt.substring(0,st)+'{%%}'+txt.substring(se+10)
        let ss=txt.substring(st,se)
        // 1. get range
        let range=ss.substring(6,ss.indexOf('%}'))
        range=range.split(':')
        ra=parseInt(range[0],10)
        rb=parseInt(range[1],10)
        // 2. strip text
        ss=ss.replace('{%for%}').replace('{%endfor%}','')
        
        // 3. replica
        for
        ss=ss.replaceAll(key,value)
        
        
    }
*/
    return txt
}
