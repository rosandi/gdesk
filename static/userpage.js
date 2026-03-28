/******
 * User page
 * Required: 
 *   modal dialog div: id=dlgplace
 *   user info box div: id=userinfo
 *   user space box div: id=userspace
 */

createModal("dlgplace","place holder");


/******************************
 * TAB CONTROL
 */

function select_tab(tab) {
	let tabs = getelm('tabpool').querySelectorAll('div[id*="tab"]');
	let buts = getelm('butpool').getElementsByTagName('button');

	for (var i=0; i<buts.length; i++) {
		buts[i].setAttribute('class', 'tabbutton');
	}

	tabs.forEach((tab) => {
		let deact=tab.querySelector('button[name="leave"]');
		if (deact) {deact.click();}
		tab.style.display = "none";
	});

	const thetab=getelm(tab);
	const thebut=getelm(tab.replace('tab','sel'));
	thetab.style.display="block";
	thebut.setAttribute('class', 'tabbutton-sel');
	const but=thetab.querySelector('button[name="enter"]');
	if(but) {but.click();}
}

/*********************************
 * USER DATA/INFO
 */

function updateUserInfo(info) {
	let ss="<div class='card'>";
	let ns=0;
	let ids=[];
	ss+="<table id='uidtab' class='centering' style='width:500px'>";
	
	Object.entries(info).forEach(([key, value]) => {
		// console.log(`${key}: ${value}`);
		let idv="info-"+ns.toString();
		ss+="<tr class='dynrow'><td style='width:100px'>";
		ss+=key+"</td><td>";
		ss+="<input type='text' class='sedit' id='"+idv+"' ";
		ss+="name='"+key+"' value='"+value+"' disabled>";
		ss+="</td></tr>";
		ids.push(idv);
		ns++;
	});
	ss+="</table></div>";

	ss+="<div class='centering'>";
	ss+="<input id='uidtg' type='hidden' value='0'>";
	ss+="<div style='display:flex;flex-direction:column;gap:10px'>";
	ss+="<button id='uidbtn' class='sbutton' ";
	ss+="onclick='editToggle();'>";
	ss+="Edit user setting</button>";
	ss+="<button id='uidcancel' class='sbutton' style='display:none' ";
	ss+="onclick='editToggle(false);'>";
	ss+="Cancel</button>";
	ss+="</div></div>";
	setText("userinfo", ss);
}

function saveUserInfo(tab) {
	console.log("Save the data!");
	// fetch data from html table
	const info={};
	table=getelm(tab);
	for(let i=0; i<table.rows.length; i++) {
		let key=table.rows[i].cells[0].textContent;
		let value=table.rows[i].cells[1].querySelector("input").value;
		info[key]=value;
	}
	//console.log(info);
	postJSON("/uinfo", info, (d) => {
		console.log(d);
	});
}

function editToggle(update=true) {
	let table=getelm("uidtab");
	let tg=parseInt(getval("uidtg"));
	for(let i=0;i<table.rows.length; i++) {
		let cell=table.rows[i].cells[1];
		let edid=cell.querySelector("input").id;
		getelm(edid).disabled=tg;
	}
	if(tg) {
		if(update) saveUserInfo("uidtab");
		getelm("uidcancel").style.display="none";
		setText('uidbtn', "Edit user setting");
		setval('uidtg',"0");
	}
	else {
		setText("uidbtn", "Save changes");
		getelm("uidcancel").style.display="block";
		setval('uidtg',"1");
	}
}

function getUserInfo(edit=false) {
	getJSON("/uinfo", function(info) {
		//console.log(info);
		if(!info.status) {
			setText(
				"userinfo", 
				"<span class='warning'>Can not fetch user info</span>"
			);
			return;
		}
		updateUserInfo(info);
	});
}

getUserInfo();

/******************** DATA/INFO ENDS **********************/

/*********************
 * HPC INFO, QUEUE, & CONTROL
 */

/* Queue Info
 * div used: queueinfo
 */

function kill_job(jid) {
	const url="/cancel?id="+jid;
	getJSON(url, (job) => {
		console.log(job);
		modalText("<div class='warning'>"+job.message+"</div>");
	});
}

function show_job(elm) {
	const owner=elm.cells[0].textContent;
	const jobid=elm.cells[1].textContent;
	const user=getval('username');
	const url="/job?id="+jobid;

	getJSON(url, (job)=> {

		ss="<div class='infotext'>JobID: "+jobid;
		if (owner==user) {
			ss+="<button class='killer' onclick='kill_job("+jobid+");'>cancel job</button>";
		}
		ss+="</div>";
		ss+='<table>';
		for (i=0; i<job.length; i++) {
				if (job[i] == "") continue;
				ss+='<tr><td>'+job[i]+'</td></tr>';
			}
			ss+='</table>';
			showModal(ss);
	});

}

function getActiveQueue(divtag) {
    var url="/queue";
    getJSON(url, function(q) {

			if (q.njob==0) {
				setText(divtag, 
					"<div class='infotext'>no active jobs</div>");
				return;
			}

			let ss="<div class='infotext'>HPC queue status</div>"; 
			ss+="<table><tr>";
			for(i in q.field) ss+="<th>"+q.field[i]+"</th>";
      ss+="</tr>";

			for(var j=0;j<q.njob;j++) {
				ss+="<tr class='dynrow' onclick='show_job(this);'>";
				for (i in q.que[j]) ss+="<td>"+q.que[j][i]+"</td>";
				ss+="</tr>";
			}
			ss+="</table>";
			setText(divtag,ss);
	});
}

function show_node(elm) {
	nname=elm.cells[0].textContent;
	var url="/nodes?node="+nname;
	getJSON(url, (node)=> {
		Object.entries(node).forEach(([nodename,states]) => {
			ss="<div class='infotext'>Node: "+nodename+"</div>";
			ss+='<table>';
			ent=Object.entries(states);
			for (i=0; i<ent.length; i++) {
				ss+='<tr><td>'+ent[i][0]+'</td><td>'+ent[i][1]+'</td></tr>';
			}
			ss+='</table>';
			showModal(ss);
		});
	});
}

function getNodeInfo(divtag) {
	var url="/nodes";
	getJSON(url, (node)=>{
		let ss="<div class='infotext'>HPC node status</div>";
		ss+="<table style='width:500px'><tr>";
		ss+="<th style='width:130px'>Node</th>";
		ss+="<th style='width:130px'>State</th>";
		ss+="<th>Partition</th>";
		ss+="</tr>";

		Object.entries(node).forEach(([nodename,states])=>{
			ss+="<tr class='dynrow' onclick='show_node(this);'>";
			sta=states.State.split(" ")[0].split("=")[1];
			party=states.Partitions.split("=")[1];
			ss+="<td>"+nodename+"</td>";
			ss+="<td>"+sta+"</td>";
			ss+="<td>"+party+"</td>";
			ss+="</tr>";
		});
		ss+="</table>";
		setText(divtag, ss);
	});
}

/**
 * called from content.html->button: update, leave
 */

var queueUpdater=0;
var nodeInfoUpdater=0;

function queueUpdate() {
	sdiv=`
	<div id=queueinfo_1 class='card'></div>
	<div id=queueinfo_2 class='card'></div>
	`;
	setText('queueinfo', sdiv);
	getNodeInfo('queueinfo_1');
	getActiveQueue('queueinfo_2');
	//console.log("activating event: queueinfo");
	nodeInfoUpdater=setInterval(getNodeInfo, 600000, 'queueinfo_1'); // 10 mins
	queueUpdater=setInterval(getActiveQueue, 30000, 'queueinfo_2'); // 0.5 mins
}

function queueLeave() {
	// console.log("deactivating event: queueinfo");
	if (nodeInfoUpdater) clearInterval(nodeInfoUpdater);
	if (queueUpdater) clearInterval(queueUpdater);
	nodeInfoUpdater=0;
	queueUpdater=0;
}


/**********************
 * USER SPACE: in separate js file!
 */

