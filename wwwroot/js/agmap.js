export class AGMap {
	static token = null;
	static map = null;
	static view = null;
	static layers = {};
	static extent = null;
	static backStack = [];
	static nextStack = [];
	static grids = {};
	constructor(para) {
		NUT.loading(para.divMap);
		document.head.z(["script", {
			src: "https://js.arcgis.com/4.31/", onload: function () {
				require(["esri/identity/IdentityManager", "esri/WebMap", "esri/views/MapView", "esri/views/draw/Draw", "esri/Graphic", "esri/symbols/support/symbolUtils", "esri/widgets/Editor", "esri/widgets/Measurement", "esri/widgets/Print"], function (esriId, WebMap, MapView, Draw, Graphic, symbolUtils, Editor, Measurement, Print) {
					AGMap.symbolUtils = symbolUtils;
					AGMap.Editor = Editor;
					(NUT.w2ui["tbrMap"] || new NUT.w2toolbar({
						name: "tbrMap",
						items: [
							{ type: 'radio', id: "zoomin", group: 1, icon: "zoomin-png", tooltip: "_ZoomIn" },
							{ type: 'radio', id: "zoomout", group: 1, icon: "zoomout-png", tooltip: "_ZoomOut" },
							{ type: 'radio', id: "pan", group: 1, icon: "hand-png", tooltip: "_Pan" },
							{ type: 'break' },
							{ type: 'radio', id: "identify", group: 1, icon: "info-png", tooltip: "_Identify" },
							{ type: 'radio', id: "select", group: 1, icon: "select-png", tooltip: "_Select" },
							{ type: 'button', id: "unselect", icon: "unselect-png", tooltip: "_ClearSelect" },
							{ type: 'break' },
							{ type: 'button', id: "fullextent", icon: "world-png", tooltip: "_FullExtent" },
							{ type: 'text', id: "scale" },
							{ type: 'button', id: "backextent", icon: "back-png", tooltip: "_BackExtent" },
							{ type: 'button', id: "nextextent", icon: "next-png", tooltip: "_NextExtent" },
							{ type: 'break' },
							{ type: 'radio', id: "measure", group: 1, icon: "ruler-png", tooltip: "_Measure" },
							{ type: 'button', id: "print", icon: "printer-png", tooltip: "_Print" },
							{ type: 'break' },
							{ type: 'tools', id: "print", icon: "zoomout-png", tooltip: "_ZoomOut" }
						],
						onClick(evt) {
							var tool = evt.detail.item.id;
							AGMap.view.popupEnabled = (tool == "identify");
							var style = AGMap.view.container.style;
							var action = null;
							switch (tool) {
								case "pan":
									style.cursor = "grab";
									AGMap.draw.reset();
									break;
								case "identify":
									style.cursor = "help";
									AGMap.draw.reset();
									break;
								case "zoomin":
									style.cursor = "zoom-in";
									action = AGMap.draw.create("rectangle");
									break;
								case "zoomout":
									style.cursor = "zoom-out"
									action = AGMap.draw.create("rectangle");
									break;
								case "select":
									style.cursor = "default";
									action = AGMap.draw.create("rectangle");
									break;
								case "unselect":
									for(var key in AGMap.layers)if(AGMap.layers.hasOwnProperty(key)){
										var layer=AGMap.layers[key];
										if(layer.highlight)layer.highlight.remove();
									}
									break;
								case "fullextent":
									AGMap.view.goTo(n$.windowid ? AGMap.extent.expand(0.5) : AGMap.extent);
									break;
								case "backextent":
									var ext = AGMap.backStack.pop();
									if (ext) {
										AGMap.skipme = true;
										AGMap.nextStack.push(AGMap.view.extent);
										AGMap.view.goTo(ext);
									}
									break;
								case "nextextent":
									var ext = AGMap.nextStack.pop();
									if (ext) {
										AGMap.skipme = true;
										AGMap.view.goTo(ext);
									}
									break;
								case "measure":
									var a = NUT.createWindowTitle("measure", divTitle);
									var widget = new Measurement({
										container: a.div,
										view: AGMap.view,
										activeTool: "area"
									});
									widget.renderNow();
									a.innerHTML = "Measure";
									break;
								case "print":
									var a = NUT.createWindowTitle("print", divTitle);
									var widget = new Print({
										container: a.div,
										view: AGMap.view,
										printServiceUrl: "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
									});
									widget.renderNow();
									a.innerHTML = "Print";
									break;
							}
							if (action) {
								action.on("cursor-update", function (evt) {
									var p = evt.vertices;
									if (p.length == 2) {
										var lyr = AGMap.view.graphics;
										var g = lyr.getItemAt(0);
										var ext = {
											type: "extent",
											xmin: p[0][0], ymin: p[0][1], xmax: p[1][0], ymax: p[1][1],
											spatialReference: NUT.AGMap.view.spatialReference
										};
										if (g) g.geometry = ext;
										else {
											g = new Graphic({
												geometry: ext,
												symbol: {
													type: "simple-fill",
													style: "none",
													outline: { color: "lime", width: 1 }
												}
											});
											lyr.add(g);
										};
									}
								});
								action.on("draw-complete", function (evt) {
									if (AGMap.view.graphics.length) {
										var geometry = AGMap.view.graphics.getItemAt(0).geometry;
										switch (tool) {
											case "zoomin":
												AGMap.view.goTo(geometry);
												break;
											case "zoomout":
												AGMap.view.goTo(geometry.expand(AGMap.view.extent.width / geometry.width + AGMap.view.extent.height / geometry.height));
												break;
											case "select":
												style.cursor = "default";
												action = AGMap.draw.create("rectangle");
												AGMap.view.allLayerViews.forEach(function (lyrView) {
													var layer = lyrView.layer;
													if (layer.selectable) {
														lyrView.queryObjectIds({
															geometry: {
																type: "polygon",
																rings: [[[geometry.xmin, geometry.ymin], [geometry.xmin, geometry.ymax], [geometry.xmax, geometry.ymax], [geometry.xmax, geometry.ymin], [geometry.xmin, geometry.ymin]]],
																spatialReference: geometry.spatialReference
															}
														}).then(function (oid) {
															if (layer.highlight) layer.highlight.remove();
															layer.highlight = lyrView.highlight(oid);
															layer.highlight.oid = oid;
															var grid = AGMap.grids[layer.id];
															if (grid) {
																grid.selectNone(true);
																var conf = grid.box.parentNode.parentNode.tag;
																NUT.NWin.switchFormGrid(conf, grid.select(oid) == 1);
															}
														});
													}
												});
												break;
										}
										AGMap.view.graphics.removeAll();
									}
									NUT.w2ui["tbrMap"].onClick({ detail: { item: { id: tool } } });
								})
							}
						}
					})).render(para.divMap.nextSibling);
					esriId.registerToken({ server: para.url, token: para.token });
					AGMap.map = new WebMap({
						portalItem: { id: para.id },
						basemap: "topo-vector"
					});
					var callback = function () {
						NUT.loading();
						AGMap.view = new MapView({
							container: divMap,
							map: AGMap.map,
							popupEnabled: false
						});
						AGMap.draw = new Draw({
							view: AGMap.view
						});
						AGMap.map.loadAll().then(function () {
							for (var i = 0; i < AGMap.map.allLayers.length; i++) {
								var lyr = AGMap.map.allLayers.getItemAt(i);
								if (lyr.type == "feature") {
									lyr.outFields = "*";
									lyr.selectable = true;
									AGMap.layers[lyr.id] = lyr;
								}
							}
							AGMap.extent = AGMap.view.extent;
							AGMap.view.watch("stationary", function (oldVal, newVal) {
								if (newVal) {
									if (AGMap.skipme) AGMap.skipme = false;
									else AGMap.backStack.push(AGMap.view.extent);
								}
							})
						});
					};
					AGMap.map.load().then(callback).catch(function (err) {
						NUT.notify("⛔ " + err + ". <a onclick='location.reload()'>Reload</a>", "red");
					});
					AGMap.token = para.token;
				});
			}
		}]);
	}
	static legend_onDblClick(evt) {
		var node = evt.detail.originalEvent.target.firstElementChild.lastChild;
		if (node.innerHTML) node.innerHTML = "";
		else {
			var lyr = AGMap.layers[evt.object.maplayer];
			switch (lyr.renderer.type) {
				case "simple":
					AGMap.symbolUtils.renderPreviewHTML(lyr.renderer.symbol, { node: node });
					break;
				case "unique-value":
					var table = node.z(["table"]);
					var cap = table.createCaption();
					var field = "<b>" + lyr.renderer.field + "</b>";
					if (lyr.renderer.field2) field += ", " + lyr.renderer.field2;
					cap.innerHTML = field;
					var infos = lyr.renderer.uniqueValueInfos;
					infos.push({ symbol: lyr.renderer.defaultSymbol, label: lyr.renderer.defaultLabel })
					for (var i = 0; i < infos.length; i++) {
						var row = table.insertRow();
						AGMap.symbolUtils.renderPreviewHTML(infos[i].symbol, { node: row.insertCell(0) });
						row.insertCell(1).innerHTML = "<i>&nbsp;" + infos[i].label + "</i>";
					}
					break;
			}
		}
	}
	static zoomToSelect(maplayer){
		var layer = AGMap.layers[maplayer];
		if (layer.highlight) layer.queryExtent({
			objectIds: layer.highlight.oid
		}).then(function (res) {
			AGMap.view.goTo(res.extent.expand(1.3));
		});
	}
	static selectByOID(maplayer, oid) {
		var layer = AGMap.layers[maplayer];
		if(layer.selectable)AGMap.view.whenLayerView(layer).then(function (lyrView) {
			if (layer.highlight) layer.highlight.remove();
			layer.highlight = lyrView.highlight(oid);
			layer.highlight.oid = oid;
		});
	}
	static selectByWhere(maplayer, where) {
		var layer = AGMap.layers[maplayer];
		if (layer.selectable) AGMap.view.whenLayerView(layer).then(function (lyrView) {
			lyrView.queryObjectIds({where: where}).then(function (oid) {
				if (layer.highlight) layer.highlight.remove();
				layer.highlight = lyrView.highlight(oid);
				layer.highlight.oid = oid;
			});
		});
	}
	static showEditor(maplayer) {
		var a = NUT.createWindowTitle("editor", divTitle);
		var widget = new AGMap.Editor({
			container:a.div,
			view: AGMap.view
		});
		widget.renderNow();
		a.innerHTML = "Editor";
	}
	static get(p, onok) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (this.readyState == XMLHttpRequest.DONE) {
				if (this.status == 0 || (this.status >= 200 && this.status < 400)) {
					if (onok) onok(JSON.parse(this.response));
				} else this.onerror(this.status);
			}
		};
		xhr.onerror = this.onerror;
		xhr.open(p.method || "GET", p.url + (this.token ? "&token=" + this.token:""), true);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		p.data ? xhr.send(JSON.stringify(p.data)) : xhr.send();
	}
	static post(p, onok) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (this.readyState == XMLHttpRequest.DONE) {
				if (this.status == 0 || (this.status >= 200 && this.status < 400)) {
					if (onok) onok(JSON.parse(this.response));
				} else this.onerror(this.status);
			}
		};
		xhr.onerror = this.onerror;
		xhr.open("POST", p.url + (this.token ? "&token=" + this.token : ""), true);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(p.data));
	}
	static submit(p, onok) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (this.readyState == XMLHttpRequest.DONE) {
				if (this.status == 0 || (this.status >= 200 && this.status < 400)) {
					if (onok) onok(JSON.parse(this.response));
				} else this.onerror(this.status);
			}
		};
		xhr.onerror = this.onerror;
		xhr.open("POST", NUT.URL_PROXY+p.url + (this.token ? "&token=" + this.token : ""), true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
		xhr.send(new URLSearchParams(p.data));
	}
	static onerror(err) {
		alert("⛔ ERROR: " + err);
	}
}