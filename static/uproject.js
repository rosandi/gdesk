/* **********************************************
 * HPC Work Desktop
 * 
 * (c) 2026, Rosandi: Guriang-HPC 
 * https://www.guriang.net
 * 
 * -> Manage jobs
 * -> Workflow designer
 * -> Job status monitoring
 * -> Simulation Result Analysis
 * 
 */

/* ==> this object stores all sub-pages: assigned <- onload */
var htpage={}
var pman  // The project manager 

/*--------------------------*
 * Chart Base Class
 * 
 * div used: this.area -> Container.arena: check!
 * 
 */

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
    message=''
    drawn=false
    tailform=''
    dragging=false
    requires=[] // -> [file, ...]
    provides=[] // -> [file, ...] 
    
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
            requires:this.requires,
            provides:this.provides,
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
    
    /* *** *** ***
     * => Binds basic control elements
     * -> name field: onblur (out-focus)
     * -> bypass checkbox
     * -> rm-(id): remove
     * -> accept-(id): values accumulation
    */
    
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
        getelm('edit-link-'+this.id).onclick=()=>{this.edit_link()}
    }
    
    chart_typeform(){
        if(this.type=='') return
        settext('form-'+this.id, text_replace(htpage[this.type], {id:this.id}))
        setval('type-'+this.id, this.type)
    }

    /**** >>--> fixme: replace! */

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
    

    // -> take data from form: must be reimplemented in child class
    accept_form() {}

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
            // add link only when not previously made
            this.link_reqs(fro,to, ac, bc)
        }
        
        getelm(fro).classList.remove('highlight')
        bucket.linkto=null
        bucket.refresh_events()

    }
    
    link_reqs(fro,to, ac, bc) {
        
        showModal(text_replace(htpage['linkreqs'], {fro:fro,to:to}))
        let addid=0
        const ptable=document.createElement('table')
        const phead=document.createElement('thead')
        const pbody=document.createElement('tbody')
        ptable.id='link-reqs-table'
        
        phead.innerHTML='<tr><th colspan="2">Available files</th><th>as input</th></tr>'
        ptable.appendChild(phead)
        
        
        getJSON('/inout?p='+this.container.filename+'&c='+fro, (d)=>{
            const frochart=this.container.find_chart_by_id(fro)
            frochart.provides.forEach((pro) =>{
                let row=document.createElement('tr')
                let ss=`<td>${pro}</td><td><input type='checkbox'></td>`
                ss+=`<td><input type='text' value='${pro}'></td>`
                row.innerHTML=ss
                pbody.appendChild(row)
            })
    
            let data=d.out.trim()
            if(data!='') {
                let rowtext=data.split('\n')
                rowtext.forEach((outfile) => {
                    let row=document.createElement('tr')
                    let ss=`<td>${outfile}</td><td><input type='checkbox'></td>`
                    ss+=`<td><input type='text' value='${outfile}'></td>`
                    row.innerHTML=ss
                    pbody.appendChild(row)
                })
            }
            ptable.appendChild(pbody)
            getelm('files-provided').appendChild(ptable)
        })
        
        getelm('add-provided-file').addEventListener('click', ()=>{
            let row=document.createElement('tr')
            let ss=`<td colspan='3'>`
            ss+=`<input type='text' 
            style='
            width:100%;
            box-sizing:border-box;
            text-align: center;
            border:none;
            outline:none' 
            id='reqs-add-field-${addid}'
            placeholder='all -> any files'></td>`
            row.innerHTML=ss
            pbody.appendChild(row)
            addid++
        })
        
        // -> confirm and make link!
        getelm('confirm-link').addEventListener('click', ()=>{
            console.log(`create link: ${fro} --> ${to}`)
            ac.outlinks.push(to)
            bc.inlinks.push(fro)
            this.link_assign(fro,to)
            this.prepare_arrows(fro,to)
            this.update_connector()
            hideModal()
        })
        
        getelm('cancel-link').addEventListener('click', ()=>{hideModal()})
    }
    
    // -> Do create link!
    link_assign(fro,to) {
        const prov=this.container.find_chart_by_id(fro).provides
        const reqs=this.container.find_chart_by_id(to).requires
        const rows=getelm('link-reqs-table').rows
        
        for (let i=1;i<rows.length;i++) {
            let check=rows[i].querySelector('input')
            if(check) { // output file list
                if (!check.checked) continue
                let reqfile=rows[i].cells[0].innerText
                if(!prov.includes(reqfile)) prov.push(reqfile)
                reqs.push(reqfile)
            } else { // additional requirements
                let reqfile=rows[i].cells[0].innerText
                if (reqfile='') continue                
                if(!prov.includes(reqfile)) prov.push(reqfile)
                reqs.push(reqfile)
            }
        }
    }
    
    //-> edit requires and provides    
    edit_link() {
        // FIXME!
        
        showModal(text_replace(htpage['editlink'],{id:this.id}))
        const table=getelm('file-requires')
        this.requires.forEach((d)=>{
            let tr=document.createElement('tr')
            let ss='<td>'+d+'</td>'
            ss+=`<td><img 
            src="/icons?icon=remove" 
            width="16" height="16"
            onclick='this.parentElement.parentElement.remove()'
            ></td>`
            tr.innerHTML=ss
            table.appendChild(tr)
        })
 
        const ptable=getelm('file-provides')
        this.provides.forEach((d)=>{
            let tr=document.createElement('tr')
            let ss='<td>'+d+'</td>'
            ss+=`<td><img 
            src="/icons?icon=remove" 
            width="16" height="16"
            onclick='this.parentElement.parentElement.remove()'
            ></td>`
            tr.innerHTML=ss
            ptable.appendChild(tr)
        })
        
        let radd=0
        let padd=0
        getelm('add-required-file').addEventListener('click', ()=>{
            let row=document.createElement('tr')
            let ss=`<td colspan='2'>`
            ss+=`<input type='text' 
            style='
            width:100%;
            box-sizing:border-box;
            text-align: center;
            border:none;
            outline:none' 
            id='reqs-add-field-${radd}'
            placeholder='all -> any files'></td>`
            row.innerHTML=ss
            table.appendChild(row)
            getelm(`reqs-add-field-${padd}`).focus()
            radd++
        })
        
        getelm('add-provided-file').addEventListener('click', ()=>{
            let row=document.createElement('tr')
            let ss=`<td colspan='2'>`
            ss+=`<input type='text' 
            style='
            width:100%;
            box-sizing:border-box;
            text-align: center;
            border:none;
            outline:none' 
            id='prov-add-field-${padd}'
            placeholder='all -> any files'></td>`
            row.innerHTML=ss
            ptable.appendChild(row)
            getelm(`prov-add-field-${padd}`).focus()
            padd++
        })
        
        getelm('update-link-reqs-prov').addEventListener('click', ()=>{
            // parse required&provides
            let rows=getelm('file-requires').rows
            this.requires=[]
            for (let r=1;r<rows.length;r++) {
                let rr=rows[r].innerText.trim()
                if(rr=='') continue
                this.requires.push(rr)
            }
            console.log(this.requires)
            rows=getelm('file-provides').rows
            this.provides=[]
            for (let r=1;r<rows.length;r++) {
                let ed=rows[r].querySelector('input')
                var rr
                if(ed) {rr=ed.value}
                else {rr=rows[r].innerText.trim()}
                if(rr=='') continue
                this.provides.push(rr)
            }
            console.log(this.provides)
            
        })
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

/*-----------------------*
 * Provider Chart 
 *-----------------------*/

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

/*-----------------------*
 * Executor Chart 
 *-----------------------*/

class ExecutorChart extends Chart {
    constructor(container) {
        super(container, 'executor', htpage['chartbox'])
    }
    
    edit() {
        showModal(text_replace(htpage['executor'], {name:this.name,id:this.id}))
        super.bind_chart_form() // for main controls
        
        let execution={type:'script'}
        Object.assign(execution, this.execution)
        if(execution.type=='script') {
            execution={type:'script',script:'',path:'bash',cargs:'',args:''} // in case undefined yet
            Object.assign(execution, this.execution)
            setval('extype-'+this.id, execution['type'])
            setval('scr-'+this.id, execution['script'])
            setval('path-'+this.id, execution['path'])
            setval('cargs-'+this.id, execution['cargs'])
            setval('args-'+this.id, execution['args'])
        }
        else if(execution.type=='queue') {
            Object.assign(execution, this.execution)
            console.log(execution)
            setval('extype-'+this.id, execution['type'])
            setval('queue-script', execution['script'])
            setval('queue-job-name', execution['jobname'])
            setval('queue-partition', execution['partition'])
            setval('queue-node-number', execution['numnode'])
            setval('queue-proc-number', execution['numproc'])
            setval('queue-task-number', execution['numtask'])
        }
        else if(execution.type='mpi') {
            Object.assign(execution, this.execution)
            setval('extype-'+this.id, execution['type'])
            setval('mpi-proc-number', execution['numproc']) 
            setval('mpi-program-path', execution['path'])
            setval('mpi-cargs', execution['cargs'])
            setval('mpi-program-args'+this.id, execution['args'])            
        }
        
        getelm('exec-type-'+execution.type).style.display='block'
        getelm('extype-'+this.id).addEventListener('change', (e)=>{this.select_exec_type_form(e)})
    }
    
    select_exec_type_form(slc) {
        getelm('exec-type-script').style.display='none'    
        getelm('exec-type-queue').style.display='none'    
        getelm('exec-type-mpi').style.display='none'
        getelm('exec-type-'+slc.target.value).style.display='block'
    }
    
    accept_form() {
        let execution={}
        let etype=getval('extype-'+this.id)
        execution['type']=etype
        
        if (etype=='script') {
            execution['script']=getval('scr-'+this.id)
            execution['path']=getval('path-'+this.id)
            execution['cargs']=getval('cargs-'+this.id)
            execution['args']=getval('args-'+this.id)
        }
        else if(etype=='queue') {
            execution['script']=getval('queue-script')
            execution['jobname']=getval('queue-job-name')
            execution['partition']=getval('queue-partition')
            execution['numnode']=getval('queue-node-number')
            execution['numproc']=getval('queue-proc-number')
            execution['numtask']=getval('queue-task-number')
            
            if(execution['numnode']=='') execution['numnode']='1'
            if(execution['numproc']=='') execution['numproc']='1'
            if(execution['numtask']=='') execution['numtask']='1'
        }
        else if(etype=='mpi') {
            execution['numproc']=getval('mpi-proc-number')
            execution['path']=getval('mpi-program-path')
            execution['cargs']=getval('mpi-cargs')
            execution['args']=getval('mpi-program-args')
        }
            
        this.execution=execution
    }
    
}

/*-----------------------*
 * Validator Chart 
 *-----------------------*/

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

/*-----------------------*
 * Analyst Chart 
 *-----------------------*/

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
 * 
 * DOM area -> designer.arena
 * 
 */
 
class ChartContainer {

    charts=[]
    dirty=true
    linkto=null
    
    constructor(area, pfname) {
        this.area=area
        this.filename=pfname 
        this.name=pfname.replace('ghpc-','').replace('.json','')
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
            fetch('/newc?c='+c.id+'&p='+this.filename)
            this.charts.push(c)
            this.draw_charts()
            this.dirty=true
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
/* <-- Chart Container  */

    
/*
 **********************************************************
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
        getelm('btn-project-list').addEventListener('click', ()=>{pman.list()})
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

/*
 * ********************************
 * Project Manager 
 * 
 * => This class manage user projects
 * -> creation
 * -> list
 * -> edition
 * -> deletion
 * 
 * Project identity (name)--> filename: ghpc-datehash.json
 * 
 * DOM-id used: this.area -> ptable @userspace
 * 
 */

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
     * used form: project form
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
     * to remove project:
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
/* <-- ProjectManager */

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
        arrow:     '/subpage?p=arrow',
        linkreqs:  '/subpage?p=link-requires',
        editlink:  '/subpage?p=edit-link'
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
 * Bootstrap of the tab
 */

async function projectEnter() {
    // use nesting div -> more flexible to apply style
    let sdiv="<div id='ptable' class='fullcard'></div>"
    await get_subpages()
    setText('userspace', sdiv)
    pman=new ProjectManager('ptable')
    pman.list()
}

function projectLeave() {
    console.log('leaving userspace')
}
