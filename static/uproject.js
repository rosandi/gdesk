/****************
 * div used: userspace
 */

var project_data=null // data only for current project
var project_charts=[] // chart list in one project!
var nchart=0
var ct={} // FIXME! load all pages on load
var chart_dirty=true
var chart_width=120;
var linkto=null;

function remove_chart(id) {
    cid=find_chart_index(id)
    project_charts.splice(cid,1)
    draw_charts()
    hideModal()
}

// FIXME! z-index sorting!

/*****
 * Edit chart and define process to execute
 */

async function get_subpages() {
    const ct_pages=[
        '/subpage?p=chart-executor',
        '/subpage?p=chart-validator',
        '/subpage?p=chart-provider',
        '/subpage?p=chart-analyst'
    ]

    const requests = ct_pages.map(
        url => fetch(url).then(res => res.text())
    );

    return await Promise.all(requests);
}

// find chart, otherwise return -1
function find_chart_by_id(id){
    let cid=null
    for (let i=0; i<project_charts.length; i++) {
        if (project_charts[i].id==id) {
            cid=project_charts[i]
            break
        }
    }
    return cid
}

function find_chart_index(id) {
    let cid=-1
    for (let i=0; i<project_charts.length; i++) {
        if (project_charts[i].id==id) {
            cid=i
            break
        }
    }
    return cid
}

function save_chart(cid) {
    var c=find_chart_by_id(cid)
    c.name=getval('chartname')
    c.type=getval('chart-type')
    c.act=getelm('chart-act').checked
    c.execution={}

    //console.log(c)

    // FIXME! links
    //c.links['in'].push(getval['chart-in-link'])
    //c.links['out'].push(getval['chart-out-link'])

    if(c.type == 'executor') {
        c.execution['type']=getval('chart-exec-type')
        c.execution['script']=getval('chart-exec-script')
        c.execution['path']=getval('chart-exec-path')
        c.execution['cargs']=getval('chart-exec-cargs')
        c.execution['args']=getval('chart-exec-args')

        //FIXME: input/output file
    }

    else if(c.type == 'validator') {
        c.execution['type']=getval('chart-valid-type')
        c.execution['script']=getval('chart-valid-script')

        //FIXME: validation criteria
    }
    else if(c.type == 'provider') {
        // notype but actions
        c.execution['script']=getval('chart-prov-script')
    }
    else if(c.type == 'analyst') {
        c.execution['script']=getval('chart-anal-script')
      // FIXME: more functions here!
    }

    draw_chart(c)
    console.log(project_charts)
}

function sync_editdata(c) {
    setval('chart-type', c.type)
    // FIXME!
    setval('chart-in-link', c.links['in'])
    setval('chart-out-link', c.links['out'])

    if(c.type == 'executor') {
        setval('chart-exec-type', c.execution['type'])
        setval('chart-exec-script', c.execution['script'])
        setval('chart-exec-path', c.execution['path'])
        setval('chart-exec-cargs', c.execution['cargs'])
        setval('chart-exec-args', c.execution['args'])

        //FIXME: input/output file
    }

    else if(c.type == 'validator') {
        setval('chart-valid-type', c.execution['type'])
        setval('chart-valid-script', c.execution['type'])

        //FIXME: validation criteria
    }
    else if(c.type == 'provider') {
        // TODO
        setval('chart-prov-script', c.execution['script'])
    }
    else if(c.type == 'analyst') {
        setval('chart-anal-script', c.execution['script'])
      // FIXME: more functions here!
    }
}

// parameter: the charts id, not chart array index!
function edit_chart(id) {
    var cid=0
    for(var i=0;i<project_charts.length;i++) {
        if (project_charts[i].id == id) {
            cid=i
            break
        }
    }

    var c=project_charts[cid]

    getText('/subpage?p=edit_chart', (ss)=>{

        replacement={
            id: c.id,
            boxid: c.id,
            act: [c.act, "checked",""],
            name: [
                c.name=='noname',
                "placeholder='Enter chart name'",
                "value='"+c.name+"'"
            ]
        }

        ss=text_replace(ss,replacement)
        modalText(ss)

        get_subpages().then(data => {
            ct['executor']=data[0]
            ct['validator']=data[1]
            ct['provider']=data[2]
            ct['analyst']=data[3]

            if (c.type != '') setText('chart-type-form', ct[c.type])
            exsh=getelm('chart-type')

            exsh.addEventListener('change', (e)=> {
                setText('chart-type-form', ct[exsh.value])
            })


            if (c.type == 'provider') {
                let fu=getelm('chart-prov-upload')
                fu.addEventListener('change', (ev) => {
                    console.log('files:', ev.target.files)
                    let tx=getval('chart-prov-script')
                    let files=ev.target.files
                    for (let i=0;i<files.length;i++) {
                        tx+="\nupload: "+files[i].name+"("+files[i].size+")"
                    }
                    setval('chart-prov-script', tx)
                })
                let fd=getelm('chart-prov-download')
                fd.addEventListener('focusout', (ev) => {
                    let tx=getval('chart-prov-script')
                    let td=ev.target.value
                    if(td.startsWith('http://') || td.startsWith('https://')) {
                        tx+="\ndownload: "+td
                        setval('chart-prov-script', tx)
                    }
                })
            }

        sync_editdata(c)
        showModal()
        })
    })
}

function change_chart_act(chk, id) {
    //console.log('change:', chk.checked)
    let c=find_chart_by_id(id)
    console.log(c,id,cid)
    c.act=chk.checked
}

function execute_chart(id) {
     // WARNING! all charts are saved
     c=find_chart_by_id(id)
     if (c.name='noname') return
     if (chart_dirty) save_project_charts()
     getJSON("/runchart?p="+project_data.filename+"&c="+id, (out)=>{
        // output from execution
        console.log(out)
     })
}

function draw_chart(c) {

    /* this draws internal of a chart (inside chart-id)
     * what to show:
     * - name
     * - id
     * - type
     * - check: active/passive
     * - buttons: edit
     */

    ss="<div class='chart-group'>"
    ss+="<div>"+c.name+"<br>"+c.id+"</div>"
    ss+="<div style='display:flex;gap:5px;margin-left:auto;margin-right:auto'>"
    ss+=c.type+"</div>"
    ss+="<div><input type='checkbox'"
    ss+="onclick='change_chart_act(this,\""+c.id+"\")' "
    ss+=c.act?"checked>":">"
    ss+="<label for='chart-act'>active</label></div>"
    ss+="<div style='display:flex;gap:5px;margin-left:auto;margin-right:auto'>"
    ss+="<button onclick='edit_chart(\""+c.id+"\")'>edit</button>"
    ss+="<button onclick='execute_chart(\""+c.id+"\")'>run</button>"
    ss+="</div></div>"
    setText(c.id,ss)
}

function change_coord(el) {
    let left=el.style.left.replace('px','')
    let top=el.style.top.replace('px','')
    left=parseInt(left, 10)
    top=parseInt(top, 10)
    let c=find_chart_index(el.id)
    project_charts[c].coord[0]=left
    project_charts[c].coord[1]=top
}

function draw_connectors(id, lineto, referse=false) {
    canvas=getelm('parea')
    crec=canvas.getBoundingClientRect()
    // console.log('draw conn:', id, lineto)
    el=getelm(id)
    for (cid in lineto) {

        let box=getelm(lineto[cid])
        let lineid1=referse?"conn"+box.id+el.id+"-1":"conn"+el.id+box.id+"-1"
        let lineid2=referse?"conn"+box.id+el.id+"-2":"conn"+el.id+box.id+"-2"
        let line1=getelm(lineid1)
        let line2=getelm(lineid2)
        let r1 = el.getBoundingClientRect()
        let r2 = box.getBoundingClientRect()

        if (referse) {
            const rt=r2;r2=r1;r1=rt
        }

        let x1 = r1.left + r1.width / 2 - crec.left
        let y1 = r1.top + r1.height / 2 - crec.top
        let x2 = r2.left + r2.width / 2 - crec.left
        let y2 = r2.top + r2.height / 2 - crec.top

        let xm = (x1+x2)/2
        let ym = (y1+y2)/2


        //console.log('el',el.style.left, el.style.top)
        //console.log('box', box.style.left, box.style.top)
        //console.log(x1, y1, x2, y2)

        line1.setAttribute('x1', x1)
        line1.setAttribute('y1', y1)
        line1.setAttribute('x2', xm)
        line1.setAttribute('y2', ym)

        line2.setAttribute('x1', xm)
        line2.setAttribute('y1', ym)
        line2.setAttribute('x2', x2)
        line2.setAttribute('y2', y2)
    }
}

function prepare_arrows(fro, to) { // fro&to: id
    ss="<svg class='chart-connector'>"
    ss+="<line id='conn"+fro+to+"-1' "
    ss+="x1='0' y1='0' x2='0' y2='0' "
    ss+="stroke='#3498db' stroke-width='3' marker-end='url(#arrowhead)'/>"
    ss+="<line id='conn"+fro+to+"-2' "
    ss+="x1='0' y1='0' x2='0' y2='0' "
    ss+="stroke='#3498db' stroke-width='3'/>"
    ss+="</svg>"
    appendtext('parea',ss)
}

function updateLine(el) {
    const c=find_chart_by_id(el.id)
    const to=c.links.out
    const fro=c.links.in
    if (to.length!=0) draw_connectors(el.id, to)
    if (fro.length!=0) draw_connectors(el.id, fro, true)
}

/***** --> LINK CHARTS
 * 1. chart-id exists in io/out ==> remove link, remove line element
 * 2. otherwise ==> add link
 */

function link_charts(self, to) {
    let c=find_chart_by_id(self)
    let d=find_chart_by_id(to)

    // console.log('link called:', self, to)

    if (c.links.out.includes(to)) { // to array
        // remove link
        c.links.out.splice(c.links.out.indexOf(to),1)
        d.links.in.splice(c.links.in.indexOf(to),1)
        getelm("conn"+self+to+"-1").remove()
        getelm("conn"+self+to+"-2").remove()

    } else if (c.links.in.includes(to)) { // from array
        // remove link
        c.links.in.splice(c.links.in.indexOf(to),1)
        d.links.out.splice(c.links.out.indexOf(to),1)
        getelm("conn"+to+self+"-1").remove()
        getelm("conn"+to+self+"-2").remove()

    } else {
        console.log(`create link: ${self} --> ${to}`, c.links.out)
        c.links.out.push(to)
        d.links.in.push(self)
        prepare_arrows(self,to)
        updateLine(getelm(self))
        // console.log('after link:',c.links.out)
    }

    linkto=null
    getelm(self).classList.toggle('highlight')
    refresh_draggable()
}

function draggable(el) {
    let isDragging = false
    let posx
    let posy

    el.onmousedown = (e) => {
        posx=el.style.left
        posy=el.style.top

        for (let i=0; i<project_charts.length; i++) {
            getelm(project_charts[i].id).style.zIndex=100;
        }

        el.style.zIndex=500

        isDragging = true
        const offsetX = e.clientX - el.offsetLeft
        const offsetY = e.clientY - el.offsetTop

        document.onmousemove = (e) => {
          if (!isDragging) return
          el.style.left = (e.clientX - offsetX) + 'px'
          el.style.top = (e.clientY - offsetY) + 'px'
          updateLine(el); // Update the line while dragging
        }

        document.onmouseup = () => {
            if (! isDragging) {
                return
            }

            isDragging = false

            if(el.style.left==posx && el.style.top==posy) {
                // select chart
                if (linkto==null) {
                    el.classList.toggle('highlight')
                    linkto=el.id
                }
                else {

                    if (linkto != el.id)
                       link_charts(linkto,el.id)
                    else { // cancel
                        el.classList.toggle('highlight')
                        linkto=null
                    }

                }
                console.log('chart selected', linkto)

            } else {
                change_coord(el)
            }

        }
    }
}

/* ==> must be called everytime 'parea' is changed */
function refresh_draggable() {
    for (let i=0; i< project_charts.length; i++) {
        // console.log(project_charts)
        draggable(getelm(project_charts[i].id))
    }
}

// Check number of charts

function draw_charts(div='parea') {
    setText(div,'')
    nchart=0;
    for (let i=0; i<project_charts.length; i++) {
        let c=project_charts[i]

        c.boxid=i // FIXME! maybe not needed!

        console.log(c.coord)

        ss="<div id='"+c.id+"' class='stage-box' "
        ss+="style='left:"+c.coord[0]+"px;top:"+c.coord[1]+"px;z-index:500'>";
        ss+="</div>"
        getelm(div).innerHTML+=ss
        draw_chart(c)
        nchart++
    }

    for (let i=0; i<project_charts.length; i++) {
        c=project_charts[i]
        for (let n=0; n<c.links.out.length; n++) {
            prepare_arrows(c.id, c.links.out[n])
        }
        draw_connectors(c.id, c.links.out)
    }

    refresh_draggable()
}

/***** ADDING NEW CHART
/ div ID --> parea
*/

function add_chart(div='parea') {
    // chart base object

    let c={
        id:crypto.randomUUID().split('-')[0],
        boxid: nchart,
        coord: [0, 0],
        name: "noname",
        type: "",
        links: {in: [], out: []},
        act: true
    }

    ss="<div id='"+c.id+"' class='stage-box' "
    ss+="style='left:"+c.coord[0]+"px;top:"+c.coord[1]+"px'></div>"
    getelm(div).innerHTML+=ss
    project_charts.push(c)
    draw_chart(c)
    nchart++
    refresh_draggable()
}

function save_project_charts() {
    postJSON('/project?save='+project_data.filename, project_charts, (p)=>{
        console.log("project saved")
        charts_dirty=false
    })
}

// This function check fixes minimum elements
function fix_charts_element() {
    for (let i=0; i<project_charts.length; i++) {
        let c=project_charts[i]
        if (!('name' in c)) c.name='noname'
        if (!('act' in c)) c.act=true
    }
}

function chart_designer(pname) {
    //console.log(project_data)
    hideModal()
    if (project_data==null) return

    ss="<div class='infotext'>Project: "
    ss+=project_data.name+"</div>"
    ss+="<div class='control-group'>"
    ss+="<button onclick='add_chart();'>create stage</button>"
    ss+="<button onclick='save_project_charts();'>save projects</button>"
    ss+="</div>"
    ss+=`<svg class='chart-connector'><defs><marker id="arrowhead"
    markerWidth="10" markerHeight="7" refX="9" refY="3.5"
    orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3498db" />
    </marker></defs></svg>`
    ss+="<div id='parea' class='project-area'></div>"  // project area div name: 'parea'
    setText('prjtable', ss)

    // FIXME clear charts!
    // load from browser memory would be nice!

    project_charts=[]
    getJSON('/project?fetch='+pname, (p)=>{
        if (p.length > 0) {
            project_charts=p
            fix_charts_element()
            draw_charts()
        }
    })

}

function save_project_info(pname) {
    pjs={
        name: getval('prjname'),
        type: getval('prjtype'),
        wdir: getval('prjwdir'),
        note: getval('prjnote'),
        status: getval('prjstate')
    }

    postJSON('/project?edit='+pname, pjs, (p)=>{
        setText('prj_statbar', 'Project info updated')
        listProject('prjtable')
    })

}

/**
 * Edit project:
 *   - fetch project from directory (if existed)
 *   - display
 *   - edit
 *   - pname --> project file name
 *
 * project_data is assigned HERE! -> project info (not the charts)
 */

function edit_project(elm) {
    pname=elm.cells[0].textContent
    getJSON('/project?list='+pname, (p) => {
        project_data=p[0]
        getText('/subpage?p=edit_project', (ss)=>{
            sel=p[0].status

            replacement={
                name: p[0].name,
                selactive: [sel=='active','selected',''],
                selfinished: [sel=='finished','selected',''],
                selpending: [sel=='pending','selected',''],
                selcancel: [sel=='canceled','selected',''],
                type: p[0].type,
                wdir: p[0].wdir,
                filename: p[0].filename,
                note: p[0].note
            }
            ss=text_replace(ss, replacement)
            showModal(ss)
        })
    })
}

/***
 * used form: projectform
 */

function create_new_project(btn) {
    formjs={
        name: getval('prjname'),
        type: getval('prjtype'),
        wdir: getval('prjwdir'),
        node: getval('prjnote'),
        status: 'active'
    }

    postJSON("/project?create=new", formjs, (p)=>{
        console.log(p)
        btn.style.display='none'
        setText('prj_statbar','Project created')
        listProject('prjtable')
    })
}

function create_project() {
    getText("/subpage?p=create_project", (ss)=>{
        showModal(ss)
    })
}

/***
 * to remove project
 * - select
 * - remove
 */

function remove_project() {}

function listProject(div) {
    getJSON('/project?list=all', (p)=>{
        //console.log(p)
        ss="<div class='fullcard'>"
        ss+="<div>"
            ss+="<div class='infotext'>Project list</div>"
            ss+="<table>"
            ss+="<tr><th>Project name</th><th>Type</th><th>Working Directory</th><th>State</th></tr>"
            for(var i=0; i<p.length; i++) {
                ss+="<tr class='dynrow' onclick='edit_project(this);'><td hidden>"+p[i].filename+"</td>"
                ss+="<td>"+p[i].name+"</td><td>"+p[i].type+"</td><td>"+p[i].wdir+"</td><td>"+p[i].status+"</td></tr>"
            }
            ss+="</table>"
        ss+="</div>"

        ss+="<div>"
            ss+="<div class='control-group'>"
            ss+="<button onclick='create_project();'>create project</button>"
            ss+="<button onclick='remove_project();'>remove project</button>"
            ss+="</div>"
        ss+="</div></div>"

        setText(div, ss);
    })
}


/*****
 * These functions are called on entry and leave
 * Use button to call them
*/

function projectEnter() {
    sdiv=`
    <div id='prjtable' class='card'></div>
    `
    setText('userspace', sdiv)
    listProject('prjtable')
}

function projectLeave() {}
