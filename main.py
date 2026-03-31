#!/usr/bin/env python
####
# Guriang-HPC user page

import os
import io
import sys
import secrets
import json
from datetime import datetime
from functools import wraps
from fabric import Connection
from werkzeug.utils import secure_filename
from flask import (
        Flask,
        render_template,
        request,
        send_file,
        jsonify,
        redirect,
        url_for,
        session
        )

user_conn={}
app=Flask(__name__)
apikey=os.environ.get('GAPIKEY')

if apikey==None:
    print('GAPIKEY enviroment not set')
    exit()

app.secret_key = apikey

##########################6###############
#--> read configuration

config_file='/etc/ghpc-config.json'
userconf='.guriang'

for arg in sys.argv:
    if arg.startswith('--config='):
        config_file=arg.replace('--config=','')

if not os.path.exists(config_file):
    print('config file not found:', config_file)
    exit()

### --> CONFIGURATION FILE <--

print('reading config file:', config_file)
with open(config_file) as cfl:
    cfg=json.load(cfl)
    hh=cfg['host'].split(':')
    if len(hh)==1:
        hpchost,hpcport=hh[0],22
    else:
        hpchost,hpcport=hh[0],hh[1]
    if 'userconf' in cfg:
        userconf=cfg['userconf']

def apiok(msg='done'):
    return jsonify({"status": True, "message": msg})

def apierr(msg='unauthorized'): # This returns jsonify's object
    return jsonify({"status": False, "message":msg})

def fix_filename(file)->str:
    if file.startswith('/'):
        targetfile=file
    else:
        targetfile=user_conn[session['token']]['home']+'/'+file
    return targetfile

# WARNING! stateless connection
# returns string
# ssh executed only with session token
#

def ssh_raw(command):
    try:
        token=session['token']
        uc=user_conn[token]
        h,u,p=uc['host'],uc['user'],uc['password']
        with Connection(host=h,user=u,connect_timeout=10,
                        connect_kwargs={"password": p}) as conn:
            r=conn.run(command, hide=True)
            return r
    except Exception as e:
        print(e)
        return None

def ssh(command) -> str:
    try:
        token=session['token']
        uc=user_conn[token]
        h,u,p=uc['host'],uc['user'],uc['password']
        with Connection(host=h,user=u,connect_timeout=10,
                        connect_kwargs={"password": p}) as conn:
            r=conn.run(command, hide=True)
            # print(f'command: {command}\n{r}')
            return r.stdout
    except Exception as e:
        #print(f'ssh error: {e}');
        return ''

def ssh_json(command):
    ss=ssh(command)
    try:
        return jsonify(ss)
    except Exception as e:
        return apierr(str(e)
                      )
# all ssh: file path corrected to $HOME, except starts with '/'

def ssh_filelist(dir) -> list:
    flst=ssh(f'ls -1 {dir}')
    flst=flst.split('\n')
    return flst

def ssh_gettext(file):
    token=session['token']
    uc=user_conn[token]
    targetfile=fix_filename(file)
    return ssh(f'cat {targetfile}')

def ssh_savetext(text, file):
    # save text into remote file:
    # if not started with / --> relative to home dir
    # print(f'saving:\n{data}\nto {file}')
    try:
        data=io.StringIO(text)
        token=session['token']
        uc=user_conn[token]
        h,u,p=uc['host'],uc['user'],uc['password']
        targetfile=fix_filename(file)
        with Connection(host=h,user=u,connect_timeout=10,
                        connect_kwargs={"password": p}) as conn:
            r=conn.put(data, targetfile)

        return f'{file} saved'
    except Exception as e:
        print(f'error: {e}')
        return ''

def ssh_putfile(localfile, remotefile):
        token=session['token']
        uc=user_conn[token]
        h,u,p=uc['host'],uc['user'],uc['password']
        targetfile=fix_filename(remotefile)
        with Connection(host=h,user=u,connect_timeout=10,
                        connect_kwargs={"password": p}) as conn:
            r=conn.put(localfile, remote=targetfile)

###########LOGIN Decorator##################

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not ('username' in session and
                'password' in session and
                'token' in session):
            return redirect(url_for('login'))

        if not session['token'] in user_conn:
            return redirect(url_for('login'))

        return f(*args, **kwargs)

    return decorated_function

def api_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not ('username' in session and
                'password' in session and
                'token' in session):

            return apierr()

        if not session['token'] in user_conn:
            return apierr()

        return f(*args, **kwargs)

    return decorated_function


###########################################

@app.route("/")
@login_required
def home():

    return render_template(
            'index.html',
            man_name=cfg['manager'],
            man_email=cfg['mail'],
            username=session["username"]
            )

@app.get("/login")
def login_form():
    return render_template(
            'login.html',
            man_name=cfg['manager'],
            man_email=cfg['mail']
            )

@app.post("/login")
def login():

    ### do LOGIN process
    #   on success set SESSION
    #   otherwise goback ro login_form

    username=request.form.get("username")
    password=request.form.get("password")
    try:
        with Connection(
            host=hpchost,
            user=username,
            connect_timeout=10,
            connect_kwargs={"password": password}
            ) as conn:

            hm=conn.run('echo $HOME')
            hm=hm.stdout.strip()


            token=secrets.token_hex(8)
            session["username"]=username
            session["password"]=password
            session['token']=token

            user_conn[token]= {
                'home': hm,
                'host': hpchost,
                'user': username,
                'password': password
                }

            ## Create user config if not exists
            if ssh(f'ls {userconf}') == '':
                print(f'creating user directory for {username}@{cfg['host']}')
                ssh(f'mkdir -p {userconf}/projects')
                accinfo={
                        'account': username,
                        'address': '',
                        'email': '',
                        'institute': '',
                        'name': username,
                        'resume': '',
                        'directory': 'ghpc'
                        }
                ssh_savetext(json.dumps(accinfo), f'{userconf}/user.json')

        print(f'connection to {hpchost} established')
        return redirect(url_for("home"))

    except Exception as e:
        print(e)
        return render_template('login.html', login_status='login failed')

@app.route('/logout')
def logout():
    token=session['token']
    if token in user_conn:
        user_conn.pop(token)

    session.clear()
    return redirect(url_for('login'))

@app.get('/subpage')
def subpage():
    subfl=request.args.get('p')
    subfl=f'templates/subfiles/{subfl}.html'
    if not os.path.exists(subfl):
        return ''
    with open(subfl) as fl:
        txt=fl.read()
    return txt

@app.post('/subpage')
def subpage_jinja():
    subfl=request.args.get('p')
    subfl=f'subfiles/{subfl}.html'
    rdata=request.get_json()

    if rdata:
        render_content=render_template(subfl, **rdata)
    else:
        render_content=render_template(subfl)

    response = make_response(rendered_content)
    response.headers['Content-Type'] = 'text/plain;charset=utf-8'
    return response

############################################# 
#   HPC Node and User API 
#

@app.get('/uinfo')
@api_login_required
def get_user_info():
    ss=ssh_gettext(userconf+'/user.json')
    uinfo=json.loads(ss)
    uinfo['status']=True
    return jsonify(uinfo)

@app.post('/uinfo')
@api_login_required
def save_user_info():
    ## DEBUGGING
    uin=request.get_json()
    if not uin:
        return apierr("update failed")

    err=ssh_savetext(json.dumps(uin), userconf+'/user.json')
    print(err);
    return get_user_info()

@app.route('/queue')
@api_login_required
def get_queue_info():
    cmd='squeue -h '
    cmd+='-O UserName,JobID,Name,Partition,State,NumCPUs,NumNodes,TimeUsed,NodeList,WorkDir:100'
    qs=ssh(cmd)
    qs=qs.split('\n')
    field=['UserName','JobID','Name','Partition','State','NumCPUs','NumNodes','TimeUsed','NodeList','WorkDir']
    que=[]
    nque=0
    for fld in qs:
        if fld=='': continue
        fld=fld.split()
        que.append(fld)
        nque+=1
    qstat={'njob':nque,'field':field, 'que':que}
    return jsonify(qstat)

@app.route('/nodes')
@api_login_required
def get_nodes_info():
    cmd='scontrol show nodes'

    specnode=request.args.get('node')
    if specnode:
        cmd=f'{cmd} {specnode}'

    qs=ssh(cmd)

    qs=qs.split('\n')
    nodes={}
    nrec={}
    nodename=''
    for nline in qs:

        nline=nline.strip()
        if nline=='': continue

        if nline.startswith('NodeName'):
            if len(nrec) != 0:
                nodes[nodename]=nrec
                nrec={}
            sn=nline.split()
            nodename=sn[0].replace('NodeName=','')

        fld=nline.split('=')[0]
        nrec[fld]=nline

    # last node in the list
    nodes[nodename]=nrec

    return jsonify(nodes)

@app.route('/job')
@api_login_required
def get_job_info():
    job=request.args.get('id')
    if not job:
        return apierr('job not exist')

    cmd=f'scontrol show job {job}'
    qs=ssh(cmd)
    qs=qs.split('\n')

    # returns array of lines
    return jsonify(qs)

@app.route('/cancel')
@api_login_required
def cancel_job():
    job=request.args.get('id')
    if not job:
        return apierr('jobid required')
    qs=ssh(f'scancel {job}')
    print(qs)
    return jsonify({'message':f'job {job} canceled','status': True});

    
#################################################### 
#  --> PROJECT API <--
# Project creation, deletion, editing, etc.
#

def list_project(pname) -> list:
    # -> list project
    #    pname: all or full project filename (gprj-XXXXXXXX.json)
    
    plst=[]
    if pname == 'all':
        lst=ssh_filelist(f'{userconf}/projects')
        prjs=[]
        for fl in lst: # prune the list
            if fl.startswith('gprj-') and fl.endswith('.json'):
                prjs.append(fl)

        for p in prjs:
            pjs=json.loads(ssh_gettext(f'{userconf}/projects/{p}'))
            pjs['filename']=p;
            plst.append(pjs)
    else:
        pjs=json.loads(ssh_gettext(f'{userconf}/projects/{pname}'))
        pjs['filename']=pname
        plst.append(pjs)

    return plst

def project_wdir(pfile):
    ufile=f'{userconf}/user.json'
    cfile=f'{userconf}/projects/{pfile}'
    ujs=json.loads(ssh_gettext(ufile))
    pjs=json.loads(ssh_gettext(cfile))
    return fix_filename(f"{ujs['directory']}/{pjs['wdir']}")

def project_chart_filename(pfile):
    ufile=f'{userconf}/user.json'
    cfile=f'{userconf}/projects/{pfile}'
    ujs=json.loads(ssh_gettext(ufile))
    pjs=json.loads(ssh_gettext(cfile))
    return fix_filename(f"{ujs['directory']}/{pjs['wdir']}/project.json")

def edit_projectinfo(pfile,pdata):
    cfile=f'{userconf}/projects/{pfile}'
    pjs=json.loads(ssh_gettext(cfile))
    for key in pdata:
        pjs[key]=pdata[key]
    ssh_savetext(json.dumps(pjs), cfile)

def fetch_project_charts(pname) -> list:
    pdata=ssh_gettext(project_chart_filename(pname))
    if(pdata==''):
        # create if not exist
        return []

    pdata=json.loads(pdata)
    return pdata

def create_newproject(pdata):
    dt=datetime.now().strftime('%Y%m%d%H%M%S')
    dt+=session['token']
    try:
        project_filename=f'{userconf}/projects/gprj-{dt}.json'
        if pdata['wdir'].strip() == '': pdata['wdir']=secrets.token_hex(8)
        if pdata['name'].strip() == '': pdata['name']=pdata['wdir']
        ssh_savetext(json.dumps(pdata), project_filename)
        uinfo=json.loads(ssh_gettext(userconf+'/user.json'))

        # 1. create directories
        ssh(f'mkdir -p {uinfo['directory']}/{pdata['wdir']}/in')
        ssh(f'mkdir -p {uinfo['directory']}/{pdata['wdir']}/out')
        ssh(f'mkdir -p {uinfo['directory']}/{pdata['wdir']}/scr')
        ssh(f'mkdir -p {uinfo['directory']}/{pdata['wdir']}/tmp')

        # 2. prepare files
        scrpath=f'{uinfo['directory']}/{pdata['wdir']}/scr'
        scrlst=os.listdir('scr')

        for scr in scrlst:
            ssh_putfile(f'scr/{scr}', f'{scrpath}/{scr}')
            ssh(f'chmod +x {scrpath}/*')

    except Exception as e:
        print('error: project not created')

def remove_projects(p, rm=''):
    rmlst=[]
    for cfl in p:
        print('delete:',cfl)
        rmlst.append(cfl)
        if rm=='purge': # warning: remove all project data!
            ssh(f'rm -rf {project_wdir(cfl)}')
        ssh(f'rm -f project {userconf}/projects/{cfl}')
    return ','.join(rmlst)

@app.route('/project', methods=["GET", "POST"])
@api_login_required
def project():
    # this function deals with: userconf/projects/*
    # uri format: project?list=all, project?list=project_name

    prj=request.args.get('list')
    if prj:
        return jsonify(list_project(prj))

    prj=request.args.get('create')
    if prj:
        pdata=request.get_json()
        create_newproject(pdata)
        return apiok(f'project {pdata['name']} created')

    prj=request.args.get('edit')
    if prj:
        pdata=request.get_json()
        edit_projectinfo(prj,pdata)
        return apiok("project info updated")

    prj=request.args.get('fetch')
    if prj:
        return jsonify(fetch_project_charts(prj))

    prj=request.args.get('save')
    if prj: # prj is project-file-name (under usercfg)
        charts=request.get_json()
        p=project_chart_filename(prj)
        ssh_savetext(json.dumps(charts), p)
        return apiok('project charts saved')

    prj=request.args.get('rm')
    if prj:
        rmp=request.get_json()
        flst=remove_projects(rmp, prj)
        return apiok(f'removed:{flst}')

    return apierr('wrong api: project');

###################################################
# --> Chart executions API <--
# 

def run_provider(c, wdir):
     
    #
    # c -> the chart: object (id<-unique)
    # cached files stored in tmp dir
    # 1. transfer files in tmp/token to wdir/in
    # 2. download using wget to wdir/in
    #    make links to wdir/in
    #
    # always cleanup!
    # returns file list @in directory

    print(f'running provider chart: {c['id']}')
    tmpdir=f'tmp/{c['id']}'
    if os.path.exists(tmpdir):
        print('1. file transfer')
        for d in os.listdir(tmpdir):
            ssh_putfile(f'{tmpdir}/{d}', f'{wdir}/in')
            os.remove(f'{tmpdir}/{d}')
        os.rmdir(tmpdir)

    print('2. download/copy/link/')
    scrprov=f'{wdir}/scr/run-provider'
    scrpath=f'{wdir}/tmp/{c['id']}.lst'
    ssh_savetext(c['execution']['script'], scrpath)
    out=ssh_raw(f'{scrprov} {scrpath}')
    inlst=ssh(f'ls -1 {wdir}/in')
    #print(f'{out.stdout}\n{out.stderr}')
    #print(inlst)
    
    return {'input': inlst.strip()}

def run_executor(c, wdir):

    ty=c['execution']['type']

    if ty == 'script':
        runner=f'{wdir}/scr/run-bash'
        scrpath=f'{wdir}/tmp/{c['id']}.sh'
        ssh_savetext(c['execution']['script'], scrpath)
        out=ssh_raw(f'{runner} {scrpath} {c['execution']['args']}')
        if out:
            return {'out': out.stdout, 'err': out.stderr}


def run_validator():
    pass

def run_analyst():
    pass


def execute_chart(p,cid):
    # arguments:
    #  p   -> project info file
    #  cid -> chart id
    
    wdir=project_wdir(p)
    charts=json.loads(ssh_gettext(f'{wdir}/project.json'))
    thechart=None
    print(f'execute: {p} {cid}')
    
    # find chart id
    for chart in charts:
        if chart['id'] == cid:
            thechart=chart
            break

    if not thechart: return

    if thechart['type'] == 'provider':
        return jsonify(run_provider(thechart, wdir))

    elif thechart['type'] == 'executor':
        return jsonify(run_executor(thechart, wdir))


    elif thechart['type'] == 'validator':
        pass

    elif thechart['type'] == 'analyst':
        pass

    return {'output': 'not implemented', 'status': True}

@app.route('/runchart')
@api_login_required
def runchart():
    # executes chart scripts
    # charts are read from project.json

    p=request.args.get('p')
    cid=request.args.get('c')
    return execute_chart(p,cid)

@app.route('/cache', methods=['POST'])
@api_login_required
def cache_file():

    # Upload file into cache template directory
    # Files will be transferred to the project directory upon chart-run
    # template dir name format: chart-id

    cid=request.args.get('c')
    if not cid: 
        return "chart-d required! no files uploaded"
    
    tmpdir=cid
    files = request.files.getlist('files[]')

    if not files or files[0].filename == '':
        return "No file to cache", 400

    saved_count = 0
    for file in files:
        if file:
            filename = secure_filename(file.filename)
            os.makedirs(f'tmp/{tmpdir}', exist_ok=True)
            file.save(f'tmp/{tmpdir}/{filename}')
            saved_count += 1

    return f"cached {saved_count} files!"

@app.route('/icons')
def icons():
    ifile=request.args.get('icon')
    if os.path.exists(f'icons/{ifile}.png'):
        return send_file(f'icons/{ifile}.png', mimetype='image/png')
        
    return send_file(f'icons/unknown.png')
    
############################################
#  --> File Browser API <--
#

@app.route('/browse')
@api_login_required
def browse():
    
    # browseable directories listed in config file (browseable)
    # home directory is always browseable
    
    bdir=request.args.get('dir')
    
    if bdir.startswith('/'): # check if directory is browseable
        browseok=False
        for allow in cfg['browseable']:
            if bdir==allow or bdir.startswith(f'{allow}/'):
                browseok=True
                break
        if not browseok: return jsonify([])
    else:
        bdir=fix_filename(bdir)
    # use long list
    lst=ssh(f'ls -l {bdir}').strip()
    lst=lst.split('\n')
    lst=lst[1:]  # first line does not belong to the file list
    flst=[]
    for ls in lst:
        ls=ls.split()
        flst.append((ls[0][0], ls[-1]))
        
    print(flst)
    return jsonify(flst)

### --> MAIN FUNCTION <-- ###
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

