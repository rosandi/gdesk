/****************
 * div used: userspace
 */

var chart_dirty=true
var chart_width=120
var stor=[]
var htpage={}

class Chart {
    name_= "noname"
    type_=''
    bypass_=false 

    dirty=true
    coord = [0, 0]
    inlinks=[]
    outlinks=[]
    execution={}
    status=true 
    drawn=false
    tailform=''
    dragging=false
    
    constructor(container,type,box_content,form_content='') {
        /* 
         * --> _type: chart type
         * --> _area: chart draw area
         * --> _box_content: chart html 
         * --> _form_content: chart html 
         */
        this.container=container
        this.id=crypto.randomUUID().split('-')[0]
        this.box_content=box_content
        this.form_content=form_content
        this.area=container.area
        this.type=type
    }
    
    set name(nm){
        this.name_=nm
        try {settext('box-name-'+this.id, nm)} 
        catch(e){}
    }
    
    set type(t){
        this.type_=t
        try{settext('box-type-'+this.id, t)} 
        catch(e){}
    }
    
    set bypass(b){
        this.bypass_=b
        try{
            getelm('box-check-'+this.id).checked=b
        }
        catch(e){}
    }

    get name(){return this.name_}
    get type(){return this.type_}
    get bypass(){return this.bypass_}

    json() {
        // Convert this class into json object
        let jdat={
            name:this.name,
            id:this.id,
            type:this.type,
            coord: this.coord,
            bypass:this.bypass,
            status:this.status,
            inlinks:this.inlinks,
            outlinks:this.outlinks,
            execution:this.execution
        }
        return jdat
    }
    
    set data(_data) {
        Object.assign(this, _data)
        console.log('data assigned:', this)
    }
    
    get data() {
        return this.json()
    }
    
    bind_chart_box() {
        let editbtn=getelm('box-edit-'+this.id)
        let execbtn=getelm('box-exec-'+this.id)
        let cbypass=getelm('box-check-'+this.id)
        
        editbtn.onclick=()=>{this.edit()}
        execbtn.onclick=()=>{this.exec()}
        cbypass.addEventListener('change', (e)=>{
            console.log('bypass',cbypass.checked)
            this.bypass=cbypass.checked
        })
    }
    
    /* draw set the element property 
     */
    draw() { // draw the chart_box, not the edit dialog
        let area=getelm(this.area)
        
        let htvars={
            posx:this.coord[0],
            posy:this.coord[1],
            name:this.name,
            id:this.id,
            type:this.type,
            checked: this.bypass?'checked':''
        }
        let ss=text_replace(this.box_content, htvars)
        appendtext(this.area,ss)
        getelm(this.id).style.zIndex=100
        this.drawn=true
        this.bind_chart_box()
    }

    change_coord() {
        let left=getelm(this.id).style.left.replace('px','')
        let top=getelm(this.id).style.top.replace('px','')
        left=parseInt(left, 10)
        top=parseInt(top, 10)
        
        this.coord[0]=left
        this.coord[1]=top
    }
    
    draggable() {  
        /* Click on the box surface event
         * --> this must be called from the Container!
         */
        
        if (!this.drawn) return
        let dragging = false
        let el=getelm(this.id)
        let area=getelm(this.area)
        let bucket=this.container
        // console.log('make draggable"', this.id, this.area)
        
        el.onmousedown = (e) => {
            let tag=e.target.tagName
            if (tag == 'BUTTON' || tag=='INPUT') return
            
            let posx=el.style.left
            let posy=el.style.top
            dragging = true
            const offsetX = e.clientX - el.offsetLeft
            const offsetY = e.clientY - el.offsetTop
            
            area.onmousemove = (e) => {
              if (!dragging) return
              el.style.left = (e.clientX - offsetX) + 'px'
              el.style.top = (e.clientY - offsetY) + 'px'
              this.update_connector()
            }

            area.onmouseup = () => {
                if (!dragging) return
                dragging = false
                
                if(el.style.left==posx && el.style.top==posy) {
                    if (bucket.linkto==null) { // select->initiate link
                        el.classList.toggle('highlight')
                        bucket.linkto=el.id
                    } else {
                        if (bucket.linkto != el.id) { // create link
                            this.link(bucket.linkto,el.id)
                        }
                        else { // cancel
                            el.classList.toggle('highlight')
                            bucket.linkto=null
                        }
                    }
                } 
                else this.change_coord()
                
            }
        }
    }
    
    bind_chart_form() { // must be called from manager
        const namefield=getelm('name-'+this.id)
        const bypsfield=getelm('bypass-'+this.id)
         
        namefield.addEventListener('blur', (e)=>{
            this.name=namefield.value
            console.log('name change', this.name)
        })
        
        bypsfield.addEventListener('change', (e)=>{this.bypass=bypsfield.checked})
        getelm('rm-'+this.id).addEventListener('click', (e)=>{this.container.remove(this.id)})
        getelm('accept-'+this.id).onclick=()=>{this.accept_form();hideModal();}
    }
    
    chart_typeform(){
        if(this.type=='') return
        settext('form-'+this.id, text_replace(htpage[this.type], {id:this.id}))
        setval('type-'+this.id, this.type)
        
        // --> chart type specifics
        if(this.type == 'provider') {
            let execution={script:''}
            Object.assign(execution, this.execution)
            setval('scr-'+this.id, execution['script'])
            
            getelm('file-browser').onclick=(e)=>{
                collector=()=>{
                    setval('scr-'+this.id, accumulator)
                    setval('type-'+this.id, this.type)
                    this.bind_chart_form()
                }
                update_filebrowser('.')
            }
        }

        else if(this.type == 'executor') {
            let execution={type:'',script:'',path:'',cargs:'',args:''}
            Object.assign(execution, this.execution)

            setval('exectype-'+this.id, xecution['type'])
            setval('scr-'+this.id, execution['script'])
            setval('path-'+this.id, execution['path'])
            setval('cargs-'+this.id, execution['cargs'])
            setval('args-'+this.id, execution['args'])
            //FIXME: input/output file
        }

        else if(this.type == 'validator') {
            //setval('chart-valid-type', execution['type'])
           // setval('chart-valid-script', execution['type'])

            //FIXME: validation criteria
        }
        else if(this.type == 'analyst') {
           // setval('chart-anal-script', c.execution['script'])
          // FIXME: more functions here!
        }        
    }

    accept_form() {}

/**** --> fixme: replace! */

    edit() {
        console.log('editing', this)
        let rpl={
            id: this.id,
            bypass: [this.bypass, "checked", ""],
            name: [
                this.name=='noname',
                "placeholder='Enter chart name'",
                "value='"+this.name+"'"
            ]
        }
        let ss=text_replace(htpage['editchart'],rpl)         
        showModal(ss)
        
        this.chart_typeform()
        this.bind_chart_form()
    }
    
    exec() {
        if (this.name=='noname') return
        console.log('execute:', this.id)
        this.container.save()
        getJSON("/runchart?p="+this.container.filename+"&c="+this.id, (out)=>{
            // output from execution
            console.log(out)
        })
    }

    /***** --> LINK CHARTS
     * 1. chart-id exists in io/out ==> remove link, remove line element
     * 2. otherwise ==> add link
     */
 

    link() {
        let bucket=this.container
        let ac=bucket.find_chart_by_id(bucket.linkto)
        let bc=this
        let fro=ac.id
        let to=bc.id

        if (ac.outlinks.includes(to)) { // to array
            // remove link
            ac.outlinks.splice(ac.outlinks.indexOf(to),1)
            bc.inlinks.splice(bc.inlinks.indexOf(fro),1)
            getelm("conn"+fro+to+"-1").remove()
            getelm("conn"+fro+to+"-2").remove()

        } else if (ac.inlinks.includes(to)) { // from array
            // remove link
            ac.inlinks.splice(ac.inlinks.indexOf(to),1)
            bc.outlinks.splice(bc.outlinks.indexOf(fro),1)
            getelm("conn"+to+fro+"-1").remove()
            getelm("conn"+to+fro+"-2").remove()

        } else {
            console.log(`create link: ${fro} --> ${to}`)
            ac.outlinks.push(to)
            bc.inlinks.push(fro)
            this.prepare_arrows(fro,to)
            this.update_connector()
        }
        
        getelm(fro).classList.remove('highlight')
        bucket.linkto=null
        bucket.refresh_events()

    }
    
    prepare_arrows(fro, to) { // fro&to: id FIXME! use div for arrow defs
        let arid='conn'+fro+to
        let ss="<svg class='chart-connector'>"
        ss+="<line id='"+arid+"-1' "
        ss+="x1='0' y1='0' x2='0' y2='0' "
        ss+="stroke='#3498db' stroke-width='2' marker-end='url(#arrowhead)'/>"
        ss+="<line id='"+arid+"-2' "
        ss+="x1='0' y1='0' x2='0' y2='0' "
        ss+="stroke='#3498db' stroke-width='2'/>"
        ss+="</svg>"
        appendtext(this.area,ss)
    }
    
    connect(lineto, reverse=false) {
        let canvas=getelm(this.area)
        let crec=canvas.getBoundingClientRect()
        let el=getelm(this.id)

        for (let cid in lineto) {

            let box=getelm(lineto[cid])
            let lineid1=reverse?"conn"+box.id+el.id+"-1":"conn"+el.id+box.id+"-1"
            let lineid2=reverse?"conn"+box.id+el.id+"-2":"conn"+el.id+box.id+"-2"
            let line1=getelm(lineid1)
            let line2=getelm(lineid2)
            let r1 = el.getBoundingClientRect()
            let r2 = box.getBoundingClientRect()

            if (reverse) {
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
    
    update_connector() {
        let tolist=this.outlinks
        let frolist=this.inlinks
        //console.log(to,fro)
        if(tolist.lenght!=0) this.connect(tolist)
        if(frolist.length!=0) this.connect(frolist,true)
    }

    unlink(peer) {
        let inlinks=this.inlinks
        let outlinks=this.outlinks
        let elpeer=this.container.find_chart_by_id(peer)
        let peer_inlinks=elpeer.inlinks
        let peer_outlinks=elpeer.outlinks
        
        if (inlinks.includes(peer)) {
            inlinks.splice(inlinks.indexOf(peer),1)
            peer_outlinks.splice(peer_outlinks.indexOf(this.id),1)
            getelm("conn"+peer+this.id+"-1").remove()
            getelm("conn"+peer+this.id+"-2").remove()
        }
        
        if (outlinks.includes(peer)) {
            outlinks.splice(outlinks.indexOf(peer),1)
            peer_inlinks.splice(peer_inlinks.indexOf(this.id),1)            
            getelm("conn"+this.id+peer+"-1").remove()
            getelm("conn"+this.id+peer+"-2").remove()
        }
    }

    remove() {
        let inn=Array.from(this.inlinks)
        let outn=Array.from(this.outlinks)
        
        for(let i=0; i<inn.length; i++) {
            this.unlink(inn[i])
        }
        for(let i=0; i<outn.length; i++) {
            this.unlink(outn[i])
        }
        getelm(this.id).remove()
    }

} 
// <-- class Chart

class ProviderChart extends Chart {
    constructor(container) {
        super(container, 'provider', htpage['chartbox'])
    }
    
    edit() {
        showModal(text_replace(htpage['provider'], {name:this.name,id:this.id}))
        super.bind_chart_form() // for main controls
        let execution={script:''}
        Object.assign(execution, this.execution)
        setval('scr-'+this.id, execution['script'])
        
        getelm('file-browser').onclick=(e)=>{
            collector=()=>{
                setval('scr-'+this.id, accumulator)
                this.bind_chart_form()
            }
            update_filebrowser('.')
        }
    }
    
    accept_form() { 
        this.execution['script']=getval('scr-'+this.id)
    }

}

class ExecutorChart extends Chart {
    constructor(container) {
        super(container, 'executor', htpage['chartbox'])
    }
    
    edit() {
        showModal(text_replace(htpage['executor'], {name:this.name,id:this.id}))
        super.bind_chart_form() // for main controls
        let execution={type:'',script:'',path:'',cargs:'',args:''}
        Object.assign(execution, this.execution)
        setval('extype-'+this.id, execution['type'])
        setval('scr-'+this.id, execution['script'])
        setval('path-'+this.id, execution['path'])
        setval('cargs-'+this.id, execution['cargs'])
        setval('args-'+this.id, execution['args'])
    }
    
    accept_form() {
        let execution={}
        execution['script']=getval('scr-'+this.id)
        execution['path']=getval('path-'+this.id)
        execution['cargs']=getval('cargs-'+this.id)
        execution['args']=getval('args-'+this.id)
        this.execution=execution
    }
    
}

class ValidatorChart extends Chart {
    constructor(container) {
        super(container, 'validator', htpage['chartbox'])
    }
    
    edit() { // TODO
        showModal(text_replace(htpage['validator'], {name:this.name,id:this.id}))
        super.bind_chart_form() // for main controls
        let execution={type:'',script:''}
        Object.assign(execution, this.execution)
    }
    accept_form() {
        this.execution['script']=getval('scr-'+this.id)
    }
}

class AnalystChart extends Chart {
    constructor(container) {
        super(container, 'analyst', htpage['chartbox'])
    }
    
    edit() { // TODO
        showModal(text_replace(htpage['analyst'], {name:this.name,id:this.id}))
        super.bind_chart_form() // for main controls
        let execution={type:'',script:''}
        Object.assign(execution, this.execution)
    }
    
    accept_form() {
        this.execution['script']=getval('scr-'+this.id)      
    }
        
}


/********************************************
 * => This class keeps and manages charts
 */
 
class ChartContainer {

    charts=[]
    dirty=true
    linkto=null
    
    constructor(_area, _pfname) {
        this.area=_area
        this.filename=_pfname // fixme: filename --> rearrange! ghpc-XXXXX.json
        this.name=_pfname.replace('ghpc-','').replace('.json','')
    }
    
    add_chart(name, type) { //accept json data
        var c = null
        if (type == 'provider') {
            console.log('adding provider')
            c=new ProviderChart(this)
            c.name = name
        }
        else if (type == 'executor') {
            c=new ExecutorChart(this)
            c.name = name
        }
        else if (type == 'validator') {
            c=new ValidatorChart(this)
            c.name = name
        }
        else if (type == 'analyst') {
            c=new AnalystChart(this)
            c.name = name
        }
        
        if(c) {
            this.charts.push(c)
            this.draw_charts()
        }
    }

    load() {
        this.charts=[]
        getJSON('/project?fetch='+this.filename, (p)=>{
            console.log('loading charts',p)
            for(let i=0;i<p.length;i++) {
                var c=null
                if (p[i].type == 'provider') c=new ProviderChart(this)
                else if(p[i].type == 'executor') c=new ExecutorChart(this)
                else if(p[i].type == 'validator') c=new ValidatorChart(this)
                else if(p[i].type == 'analyst') c=new AnalystChart(this)
                if(c) {
                    Object.assign(c,p[i])
                    this.charts.push(c)
                }
            }
            this.draw_charts()
        })
    }

    remove(id) {
        let cid=this.find_chart_index(id)
        this.charts[cid].remove()
        this.charts.splice(cid,1)
        this.draw_charts()
        hideModal()
    }
    
    find_chart_index(id) {
        let cid=-1 // unlikely to happen
        for (let i=0; i<this.charts.length; i++) {
            if (this.charts[i].id==id) {
                cid=i
                break
            }
        }
        return cid
    }
    
    find_chart_by_id(id){
        let cid=null
        for (let i=0; i<this.charts.length; i++) {
            if (this.charts[i].id==id) {
                cid=this.charts[i]
                break
            }
        }
        return cid
    }
    
    refresh_events() {
        // WARNING! can not use forEach!!
        for(let i=0;i<this.charts.length;i++) {
            this.charts[i].draggable()
        }
    }
    
    draw_charts() {
        setText(this.area,'')

        for (let i=0; i<this.charts.length; i++) {
            this.charts[i].draw()
        }
        
        //console.log('now create arrows', this.charts.length)
        
        for (let i=0; i<this.charts.length; i++) {
            let c=this.charts[i]
            for (let n=0; n<c.outlinks.length; n++)
                c.prepare_arrows(c.id, c.outlinks[n])
            
            c.connect(c.outlinks)
        }
       
        this.refresh_events()
    }
    
    updateLine(el) {
        const c=find_chart_by_id(el.id)
        const to=c.links.out
        const fro=c.links.in
        if (to.length!=0) draw_connectors(el.id, to)
        if (fro.length!=0) draw_connectors(el.id, fro, true)
    }
    
    save() { //--> save charts
        let chartdata=this.charts.map(data=>data.json())
        postJSON('/project?save='+this.filename, chartdata, (p)=>{
            console.log("project saved")
            this.dirty=false
        })
    }
    
}
/* <-- Chart Container */

    
/***********************************************
 * => This class controls the chart container
 * 
 * properties:
 * -> name: filename stripped
 * -> filename: projects filename
 * -> bucket: the chart container
 * -> div: display area
 * 
 * template ==> designer.html
 * this.area => all area including text and control buttons
 * this.arena => where charts live
 * 
 */

class ChartDesigner {
    
    constructor(pname, divarea) {
        getJSON('/project?list='+pname, (p) => {
            this.filename=pname
            this.name=p[0].name
            this.project=p[0]
            if (this.project==null) return
            this.area=divarea
            this.arena='chart-arena'
            this.show()
        })
    }
    
    show() {
        let rpl={
            name:this.name,
            arena:this.arena
        }
        let ss=text_replace(htpage['designer'], rpl)
        setText(this.area, ss)
        this.bucket=new ChartContainer(this.arena, this.filename)
        this.bucket.load()
        getelm('btn-add-chart').addEventListener('click', ()=>{this.new_chart_form()})
        getelm('btn-save-charts').addEventListener('click', ()=>{this.bucket.save()})
        settext('arrow-collection','')
    }
    
    new_chart_form() {
        showModal(htpage['newchart'])
        getelm('create-new-chart').onclick=()=>{
            let name= getval('new-chart-name')
            let type= getval('new-chart-type')
            if (name.trim() == '') {getelm('new-chart-name').focus()}
            else {
                this.bucket.add_chart(name, type)
                hideModal()
            }
        }
    }
}

class ProjectManager {
    projects=[]
    
    constructor(_area) {
        this.area=_area
    }
    
    save_project_info(pname) {
        let pjs={
            name: getval('prjname'),
            type: getval('prjtype'),
            wdir: getval('prjwdir'),
            note: getval('prjnote'),
            status: getval('prjstate')
        }

        postJSON('/project?edit='+pname, pjs, (p)=>{
            setText('prj_statbar', 'Project info updated')
            this.list()
        })
    }
    
    open_chart_designer(pname) {
        this.designer=new ChartDesigner(pname,this.area)
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

    edit_project(pname) {
        getJSON('/project?list='+pname, (p) => {
            //console.log(p)
            this.current_projects=p[0]
            let ss=htpage.editprj
            let sel=p[0].status

            let rpl={
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
            
            ss=text_replace(ss, rpl)
            showModal(ss)
            
            getelm('btn-save-project-info').addEventListener('click', 
                ()=>{this.save_project_info(p[0].filename)})
            
            getelm('btn-open-chart-designer').addEventListener('click',
                ()=>{this.open_chart_designer(p[0].filename)})
        })
    }

    /***
     * used form: projectform
     */

    create_new_project() {
        console.log('confirm create project')
        let btn=document.querySelector('#btn-wierd')
        let formjs={
            name: getval('prjname'),
            type: getval('prjtype'),
            wdir: getval('prjwdir'),
            node: getval('prjnote'),
            status: 'active'
        }

        postJSON("/project?create=new", formjs, (p)=>{
            console.log(p)
            btn.style.display='none'
            setText('status-new-project','Project created')
            this.list()
        })
    }
    
    create_project() {
        showModal(htpage.createprj)
        getelm('btn-wierd').addEventListener('click', ()=>{this.create_new_project()})
    }

    /***
     * to remove project
     * -> check from list
     * -> remove
     */

    remove_confirmed(slist) {
        let flst=slist.trim().split(' ')
        console.log(flst)
        postJSON('/project?rm=lst', flst, (m)=>{
            console.log(m)
            this.list()
            hideModal()
        })
    }

    remove_project() {
        console.log('remove project')
        let cells=document.querySelectorAll('#all-projects-table td:nth-child(3)')
        let nchk=0
        let rmfile=''
        let ss="<div class='warning'>the following projects will be removed:</div>"
        ss+="<table><tr><th>project file</th><th>title</th>"
        cells.forEach( (cell) => {
            let rmchk=cell.querySelector('input')
            if (rmchk.checked) {
                ss+="<tr><td>"+rmchk.name+"</td><td>"+cell.innerText+"</td></tr>"
                rmfile+=rmchk.name+' '
                nchk++
            }
        })
        if (nchk>0) {
            ss+="</table><div class='control-group'>"
            ss+="<button id='remove-confirmed'>remove</button>"
            ss+="<button onclick='hideModal()'>cancel</button>"
            ss+"</div>"
            showModal(ss)
            getelm('remove-confirmed').addEventListener('click', ()=>{this.remove_confirmed(rmfile)})
        }
        
    }
    
    bind_events() {
        for(let i=0;i<this.projects.length;i++) {
            let p=this.projects[i]
            getelm('edit-'+p.filename).addEventListener('click', (e)=>{
                this.edit_project(p.filename)
            })
            
            getelm('chart-'+p.filename).addEventListener('click', (e)=>{
                this.designer=new ChartDesigner(p.filename,this.area)
            })
        }
        
        getelm('btn-create-project').addEventListener('click', 
        ()=>{this.create_project()})
        getelm('btn-remove-project').addEventListener('click', 
        ()=>{this.remove_project()})
        
     }

    list() {
        // this sets this.projects array
        getJSON('/project?list=all', (p)=>{
            this.projects=p
            
            // TODO: move to html template! loop problem
            let ss="<div class='fullcard'>"
            ss+="<div>"
            ss+="<div class='infotext'>Project list</div>"
            ss+="<table id='all-projects-table'>"
            ss+="<tr>"
            ss+="<th style='width:120px'></th>"
            ss+="<th>Project name</th>"
            ss+="<th>Type</th><th>Working Directory</th><th>State</th></tr>"
            
            for(var i=0; i<p.length; i++) {
                ss+="<tr class='dynrow'>"
                ss+="<td hidden>"+p[i].filename+"</td>" // <-- this must be the first cell!
                ss+="<td style='width:120px;padding:0px'>"
                ss+="<div style='display:flex;gap:5px;justify-content:center'>"
                ss+="<button id='edit-"+p[i].filename+"' class='smallies'>edit</button>"
                ss+="<button id='chart-"+p[i].filename+"' class='smallies'>charts</button>"
                ss+="</div></td>"
                ss+="<td><input type='checkbox' style='margin-right:10px' name='"+p[i].filename+"'>"
                ss+=p[i].name+"</td>"
                ss+="<td>"+p[i].type+"</td><td>"+p[i].wdir+"</td><td>"+p[i].status+"</td></tr>"
            }
            
            ss+="</table>"
            ss+="</div>"

            ss+="<div>"
                ss+="<div class='control-group'>"
                ss+="<button id='btn-create-project'>create project</button>"
                ss+="<button id='btn-remove-project'>remove project</button>"
                ss+="</div>"
            ss+="</div></div>"
            
            settext(this.area, ss)
            this.bind_events()
        })
    }
}

/*****-->
 * These functions are called on entry and leave
 * Use button to call them
*/

async function get_subpages() {
    subpages={
        designer:  '/subpage?p=designer',
        newchart:  '/subpage?p=new-chartform',
        editprj:   '/subpage?p=edit-project',
        createprj: '/subpage?p=create-project',
        chartbox:  '/subpage?p=chartbox',
        editchart: '/subpage?p=edit-chart',
        executor:  '/subpage?p=chart-executor',
        validator: '/subpage?p=chart-validator',
        provider:  '/subpage?p=chart-provider',
        analyst:   '/subpage?p=chart-analyst',
        arrow:     '/subpage?p=arrow'
    }

    let pages=Object.entries(subpages)
    result=await Promise.all(
        pages.map(([key, url]) => fetch(url)
        .then(res => res.text())
        .then(text=>[key,text])
        )
    )
    htpage=Object.fromEntries(result)
}

/******-->
 * Boot strap of the tab
 */

async function projectEnter() {
    // use nesting div -> more flexible to apply style
    let sdiv="<div id='ptable' class='card'></div>"
    await get_subpages()
    setText('userspace', sdiv)
    pman=new ProjectManager('ptable')
    pman.list()
}

function projectLeave() {
    console.log('leaving userspace')
}
