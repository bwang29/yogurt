/**
 *  background JS process for Yogurt
 *  borui@stanford.edu
 */

// yogurt background launched
console.log("Background page for Yogurt fired");

// attach listeners to tab actions
attach_tab_listeners();

// attach listeners to window actions
attach_window_listeners();

// attach listener to app icon
attach_browser_action();

// attach listener to content scripts
attach_content_script_listeners();

// this object records the last attention from a web browser tab
var last_attention = {
	domain : "",
	url: "",
	time_start : "",
	time_end : "",
	attention_flow:[],
	total_keypress : 0,
	total_scroll : 0,
	total_click : 0,
	total_mousemove : 0,
	total_large_image_count : 0,
	serialized_attention_flow : ""
};


// temporary variables to keep the current state of the web browsers
var app_page_addr = "app.html";
var app_page_tab_id = 0;
var current_highlight_tab_index = 0;
var log_level = 2;
var yogurt_settings;


// fetch setting
// get data from local storage
var storage = chrome.storage.local;

storage.get(function(items) {
    yogurt_settings = items;
    if (chrome.runtime.lastError) {
      console.log('Error: ' + chrome.runtime.lastError.message);
    } else {
      console.log('Settings loaded');
    }
    var should_update_storage = false;
    if (!yogurt_settings.hasOwnProperty('site_list')) {
      should_update_storage = true;
      yogurt_settings.site_list = DEFAULT_SITES;
    }
    if (!yogurt_settings.hasOwnProperty('color_theme')) {
      should_update_storage = true;
      yogurt_settings.color_theme = COLOR_CHOICES[0];
    }
    // update the storage when necessary
    if (should_update_storage) {
		storage.set(yogurt_settings, function() {
		    if (chrome.runtime.lastError) {
		      console.log('Error: ' + chrome.runtime.lastError.message);
		    }else{
		      console.log("First time options saved from app.js");
		    }
		});
    }
 });

// generate user attention from a tab/domain
function gen_attention(full_url, time){

	// only preserve site name
	domain_trimed = get_domain(full_url);

	// ignore devtool window and chrome new tab and chrome configuration pages
	if(domain_trimed=="" || domain_trimed =="devtools" || domain_trimed =="newtab" || domain_trimed =="chrome"){
		return; 
	}

	// ignore if attention does not change
	if (domain_trimed == last_attention.domain){
		return;
	}

	// update the end time for last attention and get ready to start a new attention
	last_attention.time_end = time;
	last_attention.serialized_attention_flow = serialize_attention_flow(last_attention.attention_flow);
	save_last_attention(time);

	// refresh last attention
	console.log("Current: " + domain_trimed +"  at " + time.toISOString());
	last_attention.domain = domain_trimed;
	last_attention.url = full_url;
	last_attention.time_start = time;
	last_attention.attention_flow = [];
	last_attention.total_keypress = 0;
	last_attention.total_scroll = 0;
	last_attention.total_click = 0;
	last_attention.total_mousemove = 0;
	last_attention.total_large_image_count = 0;
	last_attention.serialized_attention_flow = "";

}

// print stats for last attention
function save_last_attention(time){
	console.log("Stats: "
		+ last_attention.domain
		+ " time_start:" + last_attention.time_start
		+ " time_end:" + last_attention.time_end
		+ " total_keypress:" + last_attention.total_keypress
		+ " total_scroll:" + last_attention.total_scroll
		+ " total_click:" + last_attention.total_click
		+ " total_mousemove:" + last_attention.total_mousemove
	);
	// console.log(last_attention.attention_flow);

	// build a new attention object compatable with the database
	if(last_attention.time_start!=""){
		var attn = new Attention();
		Attention.init_with_last_attention(attn, last_attention);
		Attention.save(attn);
		// console.log(attn);
	}
	// update_app_page(last_attention);
}

// handle multiple broser windows and the condition where all window lose focus
function attach_window_listeners(){
	// check if window focus changed
	chrome.windows.onFocusChanged.addListener(function(windowId) {
		
		// window lost focus
		if(windowId == chrome.windows.WINDOW_ID_NONE){
			gen_attention("http://not_in_browser", new Date());
		}else{
			chrome.windows.getCurrent({populate:true}, function(window){
				chrome.tabs.query({windowId:window.id,highlighted:true}, function(tabs){
					for(var t=0;t<tabs.length;t++){
						//console.log(tabs[t].url);
						gen_attention(tabs[t].url, new Date());
						break; // because only one tab can be highlighted
					}
				})
			});
		}
		
	});
}

// attach listeners to activities in web browser tabs
function attach_tab_listeners(){
	// listen to onCreated event
	chrome.tabs.onCreated.addListener(function(tab) {
		if(log_level == 3){
			console.log('tabs.onCreated --'
						+ ' window: ' + tab.windowId
						+ ' tab: '    + tab.id
						+ ' index: '  + tab.index
						+ ' url: '    + tab.url);
		}
		// we need this when user opens a new tab and then changes the url (the default tab is removed and a new tab is opened)
		gen_attention(tab.url,new Date());
	});

	// listen to onUpdated event
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
		//only capture update when page load is completed
		if (changeInfo.status == "loading"){
			return;
		}
		if(log_level == 3){
			console.log('tabs.onUpdated --'
						+ ' window: ' + tab.windowId
						+ ' tab: '    + tab.id
						+ ' index: '  + tab.index
						+ ' url: '    + tab.url
						+ ' changeinfo: ' + changeInfo.status);
		}
		// only create when user pay attention to current tab, don't use id because id might change once the tab is updated
		if(current_highlight_tab_index == tab.index){
			gen_attention(tab.url,new Date());
		}
		
	});

	// listen to onRemoved event
	chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
		//only capture remove then remove is complete
		if(removeInfo.isWindowClosing == true){
			return;
		}
		if(log_level == 3){
			console.log('tabs.onRemoved --'
					+ ' tab: '    + tabId
					+ ' removeInfo: ' + removeInfo.isWindowClosing);
		}
	});

	// listen to onHighlighted event
	chrome.tabs.onHighlighted.addListener(function(highlightInfo){
		if(log_level == 3){
			console.log('tabs.onHighlighted --'
					+ ' window: '    + highlightInfo.windowId
					+ ' tabs: ' + highlightInfo.tabIds);
		}
		try{
			chrome.tabs.get(highlightInfo.tabIds[0], function(tab){
				current_highlight_tab_index = tab.index;
				gen_attention(tab.url,new Date());
			});
		}catch(err){
			//tab window closed
		}
		
	});

}

// open the yogurt app
function open_app(){
	var viewTabUrl = chrome.extension.getURL(app_page_addr);
	var views = chrome.extension.getViews();
	var app_page_already_open = false;

	chrome.windows.getCurrent({populate:false}, function(current_window){
		var current_window_id = current_window.id;
		console.log("CURRENT WINDOW ID "+current_window_id);
		var yogurt_tab_window_id = -1;
		for (var i = 0; i < views.length; i++) {
			if (views[i].location.href == viewTabUrl) {
				console.log("Extention is already open");
				app_page_already_open = true;
				// find the existing app page and hightlight it
				chrome.tabs.get(app_page_tab_id, function(tab){
					yogurt_tab_window_id = tab.windowId;
					if(yogurt_tab_window_id == current_window_id){
						chrome.tabs.highlight({tabs:tab.index}, function(){});
					}else{
						console.log("ATTEMPT TO OPEN APP IN NEW WINDOW");
						chrome.tabs.create({"url":app_page_addr}, function(tab){
							console.log("App page for yogurt fired! Id is " + tab.id + " , index is "+tab.index);
							app_page_tab_id = tab.id;
						});
					}
				});
				break;
			}
		}
		if(!app_page_already_open){
			chrome.tabs.create({"url":app_page_addr}, function(tab){
				console.log("App page for yogurt fired! Id is " + tab.id + " , index is "+tab.index);
				app_page_tab_id = tab.id;
			});
		}
	});
}

// attach browser action page if not exist
function attach_browser_action(){
	chrome.browserAction.onClicked.addListener(function(tab) {
		open_app();
	});
}

// listen to content scripts
function attach_content_script_listeners(){
	// listen to contont scripts
	chrome.extension.onMessage.addListener(
		function(request,sender,sendResponse){
			//console.log(sender.tab? "from a content script:" + sender.tab.url : "from the extention");
			if(request.type == "attention"){
				last_attention.attention_flow.push(request);
			}
			
			if(request.action == "click"){
				last_attention.total_click += 1;
				//console.log("user mouse click");
			}else if(request.action == "scroll"){
				last_attention.total_scroll += 1;
				//console.log("user scroll");
			}else if(request.action == "mousemove"){
				last_attention.total_mousemove += 1;
				//console.log("user moves mouse");
			}else if(request.action == "keypress"){
				last_attention.total_keypress += 1;
				//console.log("user presses key");
			}else if(request.action == "large_image_count"){
				last_attention.total_large_image_count += request.data;
				//console.log("user presses key");
			}else if(request.action == "get_site_stats"){
				var date = x_days_ago_date(0);
				query_attention_by_domain_on_date(date,get_domain(request.domain),function(results){
					var dura = 0;
					for(var r =0; r<results.length; r++){
						dura += results[r].life_duration;
					}
					var level = " Not distractive ";
					var clean_domain = get_domain(request.domain);
					for(var i=0 ; i< yogurt_settings.site_list.length; i++){
						if(yogurt_settings.site_list[i].domain == clean_domain && yogurt_settings.site_list[i].distraction > 0){
							level = " level " + yogurt_settings.site_list[i].distraction;
						}
					}
					sendResponse({"times":results.length,
						"duration":Math.round((dura+request.add_time)/1000),
						"domain":clean_domain,
						"level":level
					});
				});
			}else if(request.action == "update_site_distraction"){
				for(var i=0; i< yogurt_settings.site_list; i++){
					if(yogurt_settings.site_list[i].domain == request.domain){
						yogurt_settings.site_list[i].distraction = request.level;
						storage.set(yogurt_settings, function() {
						    if (chrome.runtime.lastError) {
						      console.log('Error: ' + chrome.runtime.lastError.message);
						    }
						});
					}
				}
			}else if(request.action == "open_app"){
				open_app();
			}
			return true;
			//sendResponse({"status":"ok"});
			
	});
	return true;
}

// turn the array of attention flow into serialized string
function serialize_attention_flow(attention_flow){
	var str = "";
	for(var i=0; i< attention_flow.length; i++){
		var activity = attention_flow[i];
		if(activity.busy == 1){
			str+= (activity.time+".");
		}else{
			str+= (".."+activity.time
				+"."+activity.click
				+"."+activity.scroll
				+"."+activity.mousemove
				+"."+activity.keypress+"..");
		}
	}
	if(log_level == 1){
		console.log("serialized_attention_flow: "+str);
	}
	return str;
}


function update_app_page(attention_dat){
	var viewTabUrl = chrome.extension.getURL('app.html');
	var views = chrome.extension.getViews();
	for (var i = 0; i < views.length; i++) {
		var view = views[i];
		if (view.location.href == viewTabUrl) {
			console.log("view found");
			view.add_block(attention_dat);
			// view.attr = something;
			break; // we're done
		}
	}
}

function query_attention_by_date(date,callback){
	Attention.query_date(date, function(results) {
		callback(results);
	});
}

function query_attention_by_domain_on_date(date, domain,callback){
	Attention.query_domain_on_date(date, domain, function(results) {
		callback(results);
	});
}
