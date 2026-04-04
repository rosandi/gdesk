var select=[]
var stor=[]
var accumulator=''
var collector=()=>{}

function update_filebrowser(dir) {
    stor.push(getModalContent())
    getJSON('/browse?dir='+dir, (lst)=>{
        console.log(lst)
        let ss="<div class='control-group' style='height:20px;padding:20px'>"
        ss+="<div class='infotext'>Browse file: "+dir+"</div>"
        ss+="<button onclick='browse_back()'>back</button>"
        ss+="</div>"
        ss+="<div style='display:flex;gap:20px;flex-direction:column;align-contents:center:overflow:auto'>"
        ss+="<div><table id='filebrowser' style='width:400px'>"
        
        lst.forEach((d) => {
            if(d[0]=='d') { // directory
                ss+='<tr class="dynrow" onclick="follow_path(\''+dir+'\',this)">'
                ss+='<td><div style="display:flex;align-items:center">'
                ss+='<img src="icons?icon=folder" width="16" height="16">'
                ss+='<span style="margin-left:20px">'+d[1]+'</span>'
                ss+='</div></td></tr>'
            } else {
                ss+='<tr class="dynrow" onclick="select_file(\''+dir+'\',this)">'
                ss+='<td><div style="display:flex;align-items:center">'
                ss+='<img src="icons?icon=file" width="16" height="16">'
                ss+='<span style="margin-left:20px">'+d[1]+'</span>'
                ss+='</div></td></tr>'
            }
        })
        
        ss+="</table></div>"
        
        ss+="<div><div class='infotext'>Selected files</div>"
        ss+="<div id='fileselect'></div>"
        ss+="</div>"
        
        modalText(ss)
        update_selection()
	})
}

function follow_path(dir,frow) {
    fname=frow.innerText
    update_filebrowser(dir+'/'+fname)
}

function update_selection() {
    ss="<table style='width:500px;margin-left:auto;margin-right:auto'>"
    for (let i=0;i<select.length; i++) {
        d=select[i]
        ss+='<tr class="dynrow">'
        ss+='<td style="width:20px">'
        ss+='<img src="icons?icon=unselect" width="16" height="16" onclick="unselect_file(\''+d[1]+'\')">'
        ss+='</td><td><span style="margin-left:20px;margin-right:20px">'+d[1]+'</span>'
        ss+='</td><td style="width:60px"><input type="checkbox" '
        ss+='onclick="check_link(this,'+i.toString()+')" '
        ss+=(d[0]?'checked>':'>')+'link'
        ss+='</td>'
        ss+='</tr>'
    }
    ss+="</table>"
    getelm('fileselect').innerHTML=ss
}

function check_link(cb, si) {
    console.log('check:',cb.checked)
    select[si][0]=cb.checked
}

function select_file(dir,frow) {
    fname=frow.innerText
    select.push([true, dir+'/'+fname]) // [islink, file_path]
    update_selection()
}

function unselect_file(fname) {
    console.log('deselect:',fname)
    rmidx=0
    for(let i=0;i<select.length;i++) {
        if (select[i][1]==fname) {
            rmidx=i
            break
        }
    }
    select.splice(rmidx,1)
    update_selection()
}

function browse_back() {
    modalText(stor.pop())
    if (stor.length) update_selection()
    else {
        // FIXME: must be usable by other charts!!!!
        let listentry=[]
        select.forEach((d)=>{
            if (d[0]) listentry.push('link:'+d[1])
            else listentry.push('copy:'+d[1])
        })
        
        accumulator=listentry.join('\n')
        collector()
    }
}

function browse_file() {
    //file browser
	//console.log('not implemented yet')
	stor=[]
    update_filebrowser('.')
}
