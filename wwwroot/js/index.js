import { w2ui, w2layout, w2toolbar, w2form, w2utils, w2popup, w2sidebar, w2tooltip, w2confirm, w2tabs, w2menu, w2grid, w2alert } from "../lib/w2ui.es6.min.js";
import { NWin } from "./window.js";
import { SqlREST } from "./sqlrest.js";
import { AGMap } from "./agmap.js";
w2utils.settings.dataType = "RESTFULL";

NUT.ds = SqlREST;
NUT.AGMap = AGMap;
NUT.w2ui = w2ui;
NUT.w2utils = w2utils;
NUT.w2confirm = w2confirm;
NUT.w2popup = w2popup;
NUT.w2form = w2form;
NUT.w2layout = w2layout;
NUT.w2toolbar = w2toolbar;
NUT.w2sidebar = w2sidebar;
NUT.w2tooltip = w2tooltip;
NUT.w2tabs = w2tabs;
NUT.w2menu = w2menu;
NUT.w2grid = w2grid;
NUT.w2alert=w2alert;
NUT.NWin = NWin;
window.onload = function () {
	n$.user = null;
	document.body.innerHTML = "<div id='divLogin'></div>";
	w2utils.locale(localStorage.getItem("locale") || w2utils.settings.locale).then(function (evt) {
		n$.locale = evt.data.locale.substr(0, 2);
		n$.phrases = evt.data.phrases;
		var cookie = NUT.cookie();
		(w2ui["frmLogin"] || new w2form({
			name: "frmLogin",
			style: "width:" + NUT.MOBILE_W + "px;height:230px;top:33%;margin:auto",
			header: "_NUT",
			fields: [
				{ field: 'username', type: 'text', html: { label: "_Username", text: "%site%", attr: "style='width:120px'" } },
				{ field: 'sitecode', type: 'text', html: { label: " . ", anchor: '%site%', attr: "style='width:60px'" } },
				{ field: 'password', type: 'password', html: { label: "_Password", attr: "style='width:190px'" } },
				{ field: 'savepass', type: 'checkbox', html: { label: "_SavePassword" } }
			],
			record: cookie,
			actions: {
				"_Help": function () {
					window.open('help.html');
				},
				"_Login": function () {
					var rec = this.record;
					login(rec);
					/*cookie.password ? login(rec) : NUT.w2utils.sha256(rec.password).then(function (md5) {
						rec.password = md5;
						login(rec);
					});*/
				}
			}
		})).render(divLogin);
		divLogin.z(["select", {
			style: 'position:inherit;float:right',
			innerHTML: "<option value='en-US'>🇺🇸</option><option value='vi-VN'>🇻🇳</option>",
			value: evt.data.locale,
			onchange: function () { localStorage.setItem("locale", this.value); location.reload() }
		}]);
	})
}

function login(cookie) {
	NUT.loading(divLogin);
	NUT.ds.get({ url: NUT.URL_TOKEN, data: [cookie.username, cookie.sitecode, cookie.password], method: "POST" }, function (res) {
		if (res.success) {
			n$.user = res.result;
			if(n$.user.backdrop)n$.user.backdrop=JSON.parse(n$.user.backdrop)[0];
			if(n$.user.icon)n$.user.icon=JSON.parse(n$.user.icon)[0];
			document.body.style.backgroundImage = "url("+n$.user.backdrop+")";

			SqlREST.token = "Bearer " + n$.user.token;
			NUT.cookie(cookie);
			//user select role
			var roles = [];
			for (var key in res.result.roles) if (res.result.roles.hasOwnProperty(key)) {
				roles.push(res.result.roles[key]);
			}
			var orgs = [];
			for (var key in res.result.orgs) if (res.result.orgs.hasOwnProperty(key)) {
				orgs.push(res.result.orgs[key]);
			}
			if (roles.length == 1 && orgs.length <= 1) {
				var orgid = orgs[0] ? orgs[0].id : 0;
				NUT.ds.get({ url: NUT.URL_TOKEN, data: [roles[0].id, orgid], method: "PUT" }, function (res) {
					if (res.success) {
						n$.user.roleid = roles[0].id;
						n$.user.orgid = orgid;
						NUT.access = res.result.access;
						NUT.apps = res.result.apps;
						openDesktop();
					} else NUT.notify("⛔ ERROR: " + res.result, "red");
				});
			} else {
				var fields = [{ field: 'roleid', type: 'select', html: { label: "_Role" }, options: { items: roles } }];
				var record = { roleid: roles[0].id };
				if (orgs.length) {
					fields.push({ field: 'orgid', type: 'select', html: { label: "_Org" }, options: { items: orgs } });
					record.orgid = orgs[0].id;
				}
				divLogin.innerHTML = "";
				(w2ui["frmRoleOrg"] || new w2form({
					name: "frmRoleOrg",
					style: "width:" + NUT.MOBILE_W + "px;top:33%;margin:auto;height:200px",
					header: '<img height="16" src="' + n$.user.icon + '"/> <span><b>' + n$.user.sitename + '</b> - ' + (NUT.isMobile ? n$.user.sitecode : NUT.translate(n$.user.sitedesc)) + '</span>',
					fields: fields,
					record: record,
					actions: {
						"_Cancel": function () {
							location.reload();
						},
						"_Ok": function () {
							var rec = this.record;
							NUT.ds.get({ url: NUT.URL_TOKEN, data: [rec.roleid, rec.orgid || 0], method: "PUT" }, function (res) {
								if (res.success) {
									n$.user.roleid = rec.roleid;
									n$.user.orgid = rec.orgid;
									NUT.access = res.result.access;
									NUT.apps = res.result.apps;
									openDesktop();
								} else NUT.notify("⛔ ERROR: " + res.result, "red");
							});
						}
					}
				})).render(divLogin);
			}
			//renderMain();
		} else NUT.notify("⛔ ERROR: " + res.result, "red");
		NUT.loading();
	});
}

function openDesktop(force) {
	(w2ui["layMain"] || new w2layout({
		name: "layMain",
		style: "width:100%;height:100%;top:0;margin:0",
		panels: [
			{ type: 'top', size: 38, html: '<div id="divTop" class="nut-full"></div>' },
			{ type: 'left', size: NUT.isMobile ? "100%" : 260, resizable: true, html: '<div id="divLeft" class="nut-full"></div>', hidden: true },
			{ type: 'right', size: 500, resizable: true, html: '<div id="divRight" class="nut-full"></div>', hidden: true },
			{ type: 'main', html: '<div id="divMain" class="nut-full" style="background:url(\'' + n$.user.backdrop + '\');background-size:cover"><div id="divApp" style="position:absolute;width:100%;top:40%"></div><div id="divTool" style="position:absolute;width:100%;top:10px"></div></div>' }
		],
	})).render(divLogin);
	
	(w2ui["tbrTop"] || new w2toolbar({
		name: "tbrTop",
		items: [
			{ type: 'html', id: 'logo', html: '<table width="' + (260-16) +'"><tr><td><img height="24" src="' + n$.user.icon + '"/></td><td>&nbsp;</td><td><b>' + n$.user.sitename + (n$.user.orgid ? '<i> - ' + n$.user.orgs[n$.user.orgid].text + '</i>' : '') + '</b><br/>' + (NUT.isMobile ? n$.user.sitecode : NUT.translate(n$.user.sitedesc)) + '</td></tr></table>' },
			{ type: 'spacer',id:'shot'},
			{ type: 'spacer'},
			{ type: 'button', id: "home", icon: "nut-svg-home", tooltip: "_Home" },
			{ type: 'button', id: "notify", icon: "nut-svg-notification", tooltip: "_Notify" },
			{ type: 'button', id: "job", icon: "nut-svg-information", tooltip: "_Job" },
			{ type: 'break' },
			{
				type: 'menu', id: 'user', text: n$.user.username, icon: 'w2ui-icon-colors', items: [
					{ id: 'profile', text: '_Profile' },
					{ id: 'changepass', text: '_ChangePassword' },
					{ text: '--' },
					{ id: 'logout', text: '_Logout' }]
			},
			{ type: 'break' },
			{ type: 'button', id: "apps", icon: "nut-svg-switcher" }
		],
		onClick(evt) {
			switch (evt.target) {
				case "home":
					w2ui["layMain"].hide("left");
					for(var i=0;i<this.shotcut.length;i++)this.remove(this.shotcut[i]);
					n$.windowid=null;
					openDesktop(true);
					break;
				case "user:profile":
					NUT.alert("<table><tr><td><b><i>Tài khoản:</i></b></td><td colspan='3'>" + n$.user.username + "</td></tr><tr><td><b><i>Họ tên:</i></b></td><td colspan='3'>" + n$.user.fullname + "</td></tr><tr><td><b><i>Điện thoại:</i></b></td><td>" + n$.user.phone + "</td><td><b><i>Nhóm:</i></b></td><td>" + n$.user.groupid + "</td></tr><tr><td><b><i>Trạng thái:</i></b></td><td>" + n$.user.status + "</td><td><b><i>Ghi chú:</i></b></td><td>" + n$.user.description + "</td></tr></table>", "<b>Information #<i>" + n$.user.userid + "</i></b>");
					break;
				case "user:changepass":
					NUT.openDialog({
						title: "🔑 <i>Change password</i>",
						width: NUT.MOBILE_W,
						height: 210,
						div: "<table style='margin:auto'><tr><td>*Old password:</b></td><td><input class='w2ui-input' id='txt_PasswordOld' type='password'/></td></tr><tr><td>*New password:</b></td><td><input class='w2ui-input' id='txt_PasswordNew' type='password'/></td></tr><tr><td>*Re-type password:</b></td><td><input class='w2ui-input' id='txt_PasswordNew2' type='password'/></td></tr></table>",
						actions: {
							"_Close": function () { NUT.closeDialog() },
							"_Ok": function () {
								if (txt_PasswordOld.value && txt_PasswordNew.value && txt_PasswordNew2.value) {
									if (txt_PasswordOld.value == n$.user.password && txt_PasswordNew.value == txt_PasswordNew2.value)
										NUT.ds.update({ url: NUT.URL + "n_user", data: { password: txt_PasswordNew.value }, where: [["userid", "=", n$.user.userid], ["password", "=", txt_PasswordOld.value]] }, function (res) {
											if (res.success) NUT.notify("Password change", "lime");
											else NUT.notify("⛔ ERROR: " + res.result, "red");
										})
									else NUT.notify("⚠️ Passwords not match!", "orange");
								} else NUT.notify("⚠️ Old password, new password and Retype password are all required!", "orange");
							}
						}
					});
					break;
				case "user:logout":
					w2ui.layMain.hide("left"); location.reload();
					break;
				case "apps":
					w2tooltip.show({ name: "mnuApps", html: NUT.shortcut, anchor: evt.detail.originalEvent.target, hideOn: ['doc-click'] })
					break;
				default: menu_onClick(evt.object ? evt : { object: { tag:evt.detail.subItem.tag } });
			}
		}
	})).render(divTop);

	var id = null;
	var appHtml = "<center>";
	var toolHtml = "<center>";
	var countApp = 0, idOnlyApp = null;
	for (var key in NUT.apps) if (NUT.apps.hasOwnProperty(key)) {
		var app = NUT.apps[key];
		if(!force&&app.icon)app.icon=JSON.parse(app.icon)[0];
		if (app.appid != null) {
			if (id != app.appid) {
				id = app.appid;
				app.appname = NUT.translate(app.translate) || app.appname;
				app.description = NUT.translate(app.description);
				if (app.issystem) {
					toolHtml += "<div class='nut-tool' onclick='openApp(" + id + ")' title='" + app.appname + "'><img src='" + app.icon + "'/></div>";
				} else {
					appHtml += "<div title='" + app.description + "' class='nut-tile' style='background:#" + app.color + "' onclick='openApp(" + id + ")'><br/><img src='" + app.icon + "'/><br/>" + app.appname + "</div>";
					idOnlyApp = id;
					countApp++;
				}
			}
		}
	};
	divApp.innerHTML = appHtml + "</center>";
	divTool.innerHTML = toolHtml + "</center>";
	NUT.shortcut = "<div style='transform: scale(0.75)'>" + divTool.innerHTML + "<hr/>" + divApp.innerHTML + "</div>";
	if (countApp == 1&&!force) openApp(idOnlyApp);
}

window.openApp = function (id) {
	id==1?w2tooltip.show("mnuApps"):w2tooltip.hide("mnuApps");
	//load menu
	n$.app = NUT.apps[id];
	if (n$.app.apptype == "engine") {
		var win=window.open(n$.app.linkurl+"?userid=" + n$.user.userid + "&siteid=" + n$.user.siteid+"&token="+n$.user.token);
		win.n$=n$;
		win.NUT=NUT;
	} else {
		divMain.style.backgroundImage = "";
		NUT.isGIS = (n$.app.apptype == "gis");
		w2ui["layMain"].show("left");
		if (NUT.isGIS) {
			/*var lyrMap = w2ui['layMap'] || new w2layout({
				name: 'layMap',
				panels: [
					{ type: 'top', size: 300, resizable: true, html: '<div id="divLeft" class="nut-full"></div>' },
					{ type: 'main', html: '<div id="divLeft2" class="nut-full"></div>' },
				]
			});
			w2ui["layMain"].html("left", lyrMap);*/
			NUT.ds.select({ url: NUT.URL + "nv_appservice_service", orderby: "seqno", where: [["appid", "=", id], ["servicetype", "=", "arcgis"]] }, function (res) {
				if (res.success && res.result.length) {
					var service = res.result[0];
					divMain.innerHTML = "<div id='divMap' class='nut-full'></div><div id='tbrMap' style='position:absolute;top:0;right:0'></div>";
					var url = service.url.split("home/item.html?id=");
					NUT.AGMap.post({ url: url[0] + "sharing/rest/oauth2/token?f=json&grant_type=client_credentials&client_id=" + service.accessuser + "&client_secret=" + service.accesspass + "&referer=" + location.origin }, function (res) {
						if (!res.error) new AGMap({
							divMap: divMap,
							url: url[0],
							token: res.access_token,
							id:url[1]
						});
						else NUT.notify("⛔ ERROR: " + res.result, "red");
					});
				} else NUT.notify("⚠️ Application has no map", "yellow");
			});
			divRight.innerHTML = "<div id='divTitle' style='padding:6px;font-size:10pt'></div>";
		}
		NUT.appinfo = '<img width="64" height="64" src="' + n$.app.icon + '"/><br/><h2><b style="color:brown">' + n$.app.appname + '</b></h2><br/><hr/><br/><h3>' + n$.app.description + '</h3>';
		divMain.innerHTML = '<div id="divTitle" style="padding:6px;font-size:10pt">'+NUT.appinfo+'</div>';

		NUT.ds.get({ url: NUT.URL_TOKEN + "app/" + id }, function (res) {
			if (res.success) {
				var result = res.result;
				NUT.domains = {0: {
					items: [{ id: n$.user.siteid, text: n$.user.sitecode }],
					lookdown: { [n$.user.sitecode]: n$.user.siteid },
					lookup: { [n$.user.siteid]: n$.user.sitecode }
				}};

				for (var i = 0; i < result.domains.length; i++) {
					var data = result.domains[i];
					var domain = { items: [], lookup: {}, lookdown: {} };
					var item = JSON.parse(data.domainjson);
					for (var j = 0; j < item.length; j++) {
						domain.items.push({ id: item[j][0], text: item[j][1] });
						domain.lookup[item[j][0]] = item[j][1];
						domain.lookdown[item[j][1]] = item[j][0];
					}
					NUT.domains[data.domainid] = domain;
				}
				NUT.services = result.services || {};
				NUT.relates = result.relates || {};
				NUT.tables = result.tables || {};
				//cached tables
				for (var key in NUT.tables) if (NUT.tables.hasOwnProperty(key)) {
					var table = NUT.tables[key];
					if (table.iscache) NUT.cacheDmLink(table);
				}
				var nodes = [],shotNodes = [], shotids=[], lookup = {}, openWinId = null;
				for (var i = 0; i < result.menus.length; i++) {
					var menu = result.menus[i];
					shotids.push(menu.menuid);
					var node = { id: menu.menuid, expanded: menu.isopen, tag: menu.linkwindowid || menu.execname };
					var text = NUT.translate(menu.translate) || menu.menuname;
					node.text = menu.maplayer ? "<input class='w2ui-input' type='checkbox' name='" + menu.maplayer + "' onclick='NUT.AGMap.layers[this.name].visible=this.checked;event.stopPropagation()' checked/> " + text + "<input type='range' style='float:right;width:30px;padding:0px' id='" + menu.maplayer + "' value=1 min=0 max=1 onclick='event.stopPropagation();this.tag=!this.tag;this.value=this.tag?0:1;NUT.AGMap.layers[this.id].selectable=!this.tag'/><div style='margin-left:20px'></div>": text;
					node.maplayer = menu.maplayer;
					var parent = lookup[menu.parentid];
					if (menu.icon) node.icon = menu.icon;
					if (menu.whereclause) node.where = JSON.parse(menu.whereclause);
					if (menu.linkwindowid && menu.isopen) openWinId = menu.linkwindowid;
					if (menu.menutype == "menu") {
						if (parent) {
							parent.group = true;
							if (parent.nodes) parent.nodes.push(node);
							else parent.nodes = [node];
						} else nodes.push(node);
					} else {//shotcut
						node.tooltip=node.text;
						node.text="";
						node.type = menu.haschild ? "menu" : "button";
						if (parent) {
							if (parent.items) parent.items.push(node);
							else parent.items = [node];
						} else shotNodes.push(node);
					}
					lookup[node.id] = node;
				};
				w2ui["tbrTop"].shotcut=shotids;
				if (shotNodes.length)w2ui["tbrTop"].insert('shot', shotNodes);
				var opt={
					name: "mnuMain",
					flatButton: true,
					nodes: nodes,
					topHTML:"<input class='w2ui-input' placeholder=" + NUT.w2utils.lang("_Search") + " style='width:100%'/>",
					onClick: menu_onClick,
					onFlat: function (evt) {
						var width = NUT.isMobile ? "100%" : "260px";
						w2ui["layMain"].sizeTo("left", evt.detail.goFlat ? '45px' : width, true);
						divLeft.style.width = (evt.detail.goFlat ? '45px' : width);
					}
				}
				if(NUT.isGIS)opt.onDblClick=AGMap.legend_onDblClick;
				if (openWinId) menu_onClick({ object: { tag: openWinId } });
				
				if (id == 1) {//LIST SYSTEM APPLICATIONS
					NUT.ds.get({ url: NUT.URL + "n_app",orderby: "seqno",where:["siteid","=",n$.user.siteid] }, function (res2) {
						if (res2.success) {
							var children = [];
							for (var i=0;i<res2.result.length;i++) {
								var app = res2.result[i];
								children.push({ id: "app_" + app.appid, text: app.appname, tag: (app.apptype=="engine"?5:3), where: ["appid", "=", app.appid] });
							}
							opt.nodes.push({ id: "app_", text: "_Application<span></span><a style='float:right' onclick='event.stopPropagation();menu_onClick({object:{tag:3},openNew:true})' title='Add New'>&nbsp;➕&nbsp;</a>", group: !NUT.isGIS, expanded: true, nodes: children });
							(w2ui["mnuMain"] || new w2sidebar(opt)).render(divLeft);
						}else NUT.notify("⛔ ERROR: " + res2.result, "red");
					});
				}else (w2ui["mnuMain"] || new w2sidebar(opt)).render(divLeft);
			} else NUT.notify("⛔ ERROR: " + res.result, "red");
		});
	}
}
window.menu_onClick=function(evt) {
	var tag = evt.object.tag;
	if (tag){// && tag != n$.windowid) {
		if (Number.isInteger(tag)) {
			if (NUT.isGIS) w2ui["layMain"].show("right");
			var win=new NWin(tag);
			var conf = NUT.windows[tag];
			if (conf) {
				conf.tabs[0].tempWhere = evt.object.where;
				if(evt.openNew)NUT.NWin.showNewDialog(conf.tabs[0]);
				else{
					var a = NUT.createWindowTitle(tag, divTitle);
					if(a){
						win.buildWindow(a.div, conf, 0);
						a.innerHTML = conf.windowname;
					}
				}
			} else {
				NUT.ds.get({ url: NUT.URL_TOKEN + "cache/" + tag }, function (res) {
					if (res.success) {
						var cache = res.result;
						if (cache) {
							conf = NUT.configWindow(zipson.parse(cache.configjson), cache.layoutjson ? zipson.parse(cache.layoutjson) : null);
							conf.tabs[0].tempWhere = evt.object.where;
							conf.tabid = conf.windowid;
							conf.windowname = NUT.translate(conf.translate) || conf.windowname;
							NUT.windows[tag] = conf;
							if(evt.openNew)NUT.NWin.showNewDialog(conf.tabs[0]);
							else {
								if (NUT.isObjectEmpty(conf.needCache)) win.buildWindow(a.div, conf, 0);
								else {
									var a = NUT.createWindowTitle(tag, divTitle);
									if(a){
										var needCaches = [];
										for (var key in conf.needCache) {
											if (conf.needCache.hasOwnProperty(key) && !NUT.dmlinks[key]) needCaches.push(conf.needCache[key]);
										}
										win.cacheDmAndOpenWin(a.div, conf, needCaches, 0);
										a.innerHTML = conf.windowname;
									}
								}
							}
						} else NUT.notify("⚠️ No cache for window " + tag, "yellow");
					} else NUT.notify("⛔ ERROR: " + res.result, "red");
				});
			}
			if (NUT.isMobile && !NUT.isGIS) w2ui.mnuMain.goFlat();
		} else if (tag.startsWith("https://") || tag.startsWith("http://")) {
			window.open(tag);
		} else if (tag.endsWith(".pdf") || tag.endsWith(".doc") || tag.endsWith(".xls")) {
			window.open("site/" + n$.app.siteid + "/" + n$.app.appid + "/" + tag);
		} else NUT.runComponent(tag);
	}
}