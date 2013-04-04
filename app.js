/**
 *  app.js for Yogurt
 *  borui@stanford.edu
 */

var w = 960;
var h = 600;
var min_height = 650;
var width_scale_coeffecient = 1.0;
var total_time = 0;
var lm = 0;
var tm = 3;
var TM_const = tm;
var background;
var browsing_data = {};
var domain_date_meta_hash = {};
var domain_date_meta_sortable = {};
var domain_meta_hash = {};
var domain_meta_sortable = [];
var domain_date_util_hash = {};
var dna_start_hour = 0;
var dna_end_hour = 24;
var group_ycord_start_end_pos = {};
var group_height = 30;
var group_padding = 6;
var total_days_to_load = 7;
var collapse_coef = 0.8; 
var prev_coef = 0;
var time_discount_factor = 1;

// width of the current browser window, updates upon resize
var window_width = 0;
var window_height = 0;

// svg element left margin to the left border of browser window
var group_mousemove_offset = 0;
var user_click_mouse_down = false;

// record the last x position of the range selection cursoe
var last_group_cursor_x_pos = 0;
var tooltip_data = "T.T";

// record range selection data ids
var range_start_time = "=.=";
var range_end_time = "O_O";
var range_group_id = "^_^";

// record location for animation going back
var recover_cursor_id = "";
var recover_block_id = "";
var recover_rect_ycord = "";
var dna_pushed_to_top = false;

// make the default to group cursor
var previous_highlighted_class = "group_cursor";
var dot_count = 0;
var dot_animation = "+_+";
var daily_stats_shown = false;
var show_rightmost_panel_shown = false;
var show_rightmost_panel_all_days = false;
var pause_collapse_rendering = false;
var current_url_under_mouse = "";

// configuration

var settings;
var color_config = [];

var COLOR_ECLIPSE_BORDER;
var COLOR_ECLIPSE_TEXT;
var COLOR_ECLIPSE_ARC;
var COLOR_CURSOR;
var COLOR_STATS_TEXT;
var COLOR_STATS_BG;
var COLOR_TOP;
var COLOR_DASH_BORDER_LINE;

var COLOR_RIGHT_PANEL_PROGRESS_LINE;
var COLOR_RIGHT_PANEL_TEXT;
var COLOR_RIGHT_PANEL_HEAD_TEXT;
var COLOR_RIGHT_PANEL_TEXT_DISTRACTIVE;
var COLOR_RIGHT_PANEL_PROGRESS_LINE_DISTRACTIVE;

var sites = {
	"not_in_browser": -1
};

// get data from local storage
var storage = chrome.storage.local;

storage.get(function(items) {
	background = chrome.extension.getBackgroundPage();
    settings = items;
    if (chrome.runtime.lastError) {
      console.log('Error: ' + chrome.runtime.lastError.message);
    } else {
      console.log('Settings loaded');
    }
    var should_update_storage = false;
    if (!settings.hasOwnProperty('site_list')) {
      should_update_storage = true;
      settings.site_list = DEFAULT_SITES;
    }
    if (!settings.hasOwnProperty('color_theme')) {
      should_update_storage = true;
      settings.color_theme = COLOR_CHOICES[0];
    }
    // update the storage when necessary
    if (should_update_storage) {
		storage.set(settings, function() {
		    if (chrome.runtime.lastError) {
		      console.log('Error: ' + chrome.runtime.lastError.message);
		    }else{
		      console.log("First time options saved from app.js");
		    }
		});
    }
    // assign settings to background page
    background.yogurt_settings = settings;

    // translate colors into rgb format
    for(var i=0; i< settings.site_list.length; i++){
    	sites[settings.site_list[i].domain] = settings.site_list[i].distraction;
    }
    for(var i=0 ; i< settings.color_theme.length; i++){
    	color_config.push(hexToRgb(settings.color_theme[i]));
    }
    // change some css styles
    var sheet= document.styleSheets[0];
	var rules= 'cssRules' in sheet? sheet.cssRules : sheet.rules;
	// set block highlight color
	rules[0].style.fill= "rgba("+color_config[5].r+","+color_config[5].g+","+color_config[5].b+",0.8)";
	// set tooltip colors
	rules[1].style.background= "rgba("+color_config[3].r+","+color_config[3].g+","+color_config[3].b+",0.9)";
	rules[1].style.color= "rgba("+color_config[0].r+","+color_config[0].g+","+color_config[0].b+",0.9)";
	// set color for stats blocks
	COLOR_ECLIPSE_BORDER = "rgba("+color_config[4].r+","+color_config[4].g+","+color_config[4].b+",0.9)";
	COLOR_ECLIPSE_TEXT = "rgba("+color_config[4].r+","+color_config[4].g+","+color_config[4].b+",0.9)";
	COLOR_ECLIPSE_ARC = "rgba("+color_config[4].r+","+color_config[4].g+","+color_config[4].b+",0.9)";
	COLOR_CURSOR = "rgba("+color_config[4].r+","+color_config[4].g+","+color_config[4].b+",0.9)";
	COLOR_STATS_TEXT = "rgba("+color_config[3].r+","+color_config[3].g+","+color_config[3].b+",0.9)";
	COLOR_STATS_BG = "rgba("+color_config[2].r+","+color_config[2].g+","+color_config[2].b+",0.8)";
	COLOR_TOP = settings.color_theme[0];
	COLOR_DASH_BORDER_LINE = "rgba("+color_config[1].r+","+color_config[1].g+","+color_config[1].b+",0.9)";

	COLOR_RIGHT_PANEL_PROGRESS_LINE = COLOR_ECLIPSE_ARC;
    COLOR_RIGHT_PANEL_TEXT = COLOR_STATS_TEXT;
    COLOR_RIGHT_PANEL_HEAD_TEXT = COLOR_STATS_TEXT;
    COLOR_RIGHT_PANEL_TEXT_DISTRACTIVE = "rgba(201,47,47,1.0)";
    COLOR_RIGHT_PANEL_PROGRESS_LINE_DISTRACTIVE =  "rgba(221,21,21,0.8)";

    // fire yogurt , yogurt, go yogurt!
    yogurt_start();
 });

function yogurt_start(){
	// display loading logo
	$("#loading_text").fadeIn(300);
	$('body').css('background-image','-webkit-linear-gradient(top, '+ColorLuminance(COLOR_TOP,-0.5)+' 0%, '+COLOR_TOP+'+100%)');
	// get the reference ofr background page so that we could start fetching data from our db
	window_width = $(window).width();
	window_height = Math.max(min_height,$(window).height());
	// dynamically adjust font size
	$("#loading_logo").css("padding-top",window_height/3);
	// loading dot animation
	dot_animation = setInterval(function(){
		dot_count = dot_count % 5;
		if($("#dot_"+dot_count).text() != ""){
			$("#dot_"+dot_count).text("");			
		}else{
			$("#dot_"+dot_count).text(".");
		}
		dot_count += 1;
	},40);
	group_height = window_height/9;
	h = (group_height+ group_padding)*total_days_to_load;
	$(document).mousemove(function(e){
	    $('#tooltip').css({"left":e.pageX+10,"top":e.pageY-30-$(window).scrollTop()});
	}); 
	$(window).resize(function() {
		window_width = $(window).width();
		window_height = Math.max(min_height,$(window).height());
		group_height = window_height/9;
		h = (group_height+ group_padding)*total_days_to_load;
	});
	$("#yogurt_pop_btn").hover(
		function(){$(this).css({"border-color":"#666"})},
		function(){$(this).css({"border-color":"#292929"})})
	.click(
		function(){$("#yogurt_pop_content").fadeIn(200)}
	);
	//$("#yogurt_popup_close_btn").click(function(){$("#yogurt_pop_content").fadeOut(300)});
	$("select[name='save_image']").change(function(){
		if($(this).val() != ""){
			var res = $(this).val().split("_");
			open_window_with_img(parseInt(res[0]),parseInt(res[1]),"#save_image_loading");
			// add waiting info..
		}
	});
	$(".text_btn").hover(function(){
		$(this).animate({"color": "rgba(255,255,255,1.0)"},100,function(){});
	},function(){
		$(this).animate({"color": "rgba(255,255,255,0.4)"},100,function(){});
	})
	$("#hide_daily_stats_btn").click(function(){recover_to_right(false); }); 
	$("#show_daily_stats_btn").click(function(){collapse_to_left(w*(1-collapse_coef)); }); 
	$("#show_settings").click(function() { window.open('/options.html', '_blank');})
	$("#wallpaper_btn").click(function(){$("#wallpaper_modal").fadeIn(100);});
	$(".modal_dismiss").click(function(){$(".modal").fadeOut(400)});
	draw_test();
}

function get_block_color(data){
	var distraction_level = sites[data.tab_domain];
	var c = color_config[1];
	if(typeof distraction_level !== "undefined"){
		if(distraction_level == 3){
				return "rgba("+c.r+","+c.g+","+c.b+",1.0)";
		}else if(distraction_level == 2){
				return "rgba("+c.r+","+c.g+","+c.b+",0.8)";
		}else if(distraction_level == 1){
				return "rgba("+c.r+","+c.g+","+c.b+",0.6)";
		}else if(distraction_level == -1){ // not in browser
				return "rgba(255,255,255,0.0)";
		}
	}else{ // regular browsing
			return  "rgba("+c.r+","+c.g+","+c.b+",0.1)";
	}
}

// return second
function calculate_time_diff_in_a_day(current_time,start_hour_today){
	var start_time_today = new Date(current_time.getFullYear(),current_time.getMonth(),current_time.getDate(),start_hour_today,0,0);
	return (current_time - start_time_today)/1000;
}

function calculate_and_display_total_distraction(){
	var total_distraction_time = 0;
	var total_in_browser_time = 0;
	for(var key in domain_meta_hash){
		if(sites[domain_meta_hash[key].domain] > 0){
			total_distraction_time += domain_meta_hash[key].duration;
		}
		if(domain_meta_hash[key].domain != "not_in_browser"){
			total_in_browser_time += domain_meta_hash[key].duration;
		}
	}
	var percentage = ((total_distraction_time/total_in_browser_time)*100).toFixed(2);
	if(!isNaN(percentage)){
		$("#yogurt_overall_stats").text(secondsToTime(total_distraction_time/1000) + " (" + percentage + "%)").hover(function(){
			$("#tooltip").html(
				"<div style='font-weight:bold;font-size:13px'>In the past 7 days, you've been distracted for <span style='color:#C92F2F'>" + secondsToTime(total_distraction_time/1000) + "</span> "
				+"That's <span style='color:#C92F2F'>" + percentage +"%</span> of your browsing time.</div>").show();
		},function(){
			$("#tooltip").hide();
		})
	}
}

function draw_test(){
	var svg = d3.select("#tab_history").append("svg").attr("width", w).attr("height", h);

	$("#tab_history").mouseleave(function(){
	});

	// draw border lines
	var line_num = 1;
	var segment_width = (w/line_num);
	for(var l=0;l<=line_num;l++){
	svg.append("line")
		.attr("x1",segment_width*l)
		.attr("y1",0)
		.attr("x2",segment_width*l)
		.attr("y2",h)
		.attr("stroke-dasharray","4,3")
		.attr("stroke",COLOR_DASH_BORDER_LINE)
		.attr("stroke-width",1)
		.attr("class","border_line");	
	}

	// this should be efficient as the loop only get executed once
	// because the requests are made async, we need to know when the respons are all received
	var finished_requests = 0;
	for(var d=0; d< total_days_to_load; d++){
		// async request...do not use any parameter out of the scope for the async requests
		// use total_days_to_load-d-1 for reverse order
		background.query_attention_by_date(x_days_ago_date(d),function(results){
			finished_requests += 1;
			if(results.length > 1){
				// store results in global hash
				browsing_data[results[0].date] = results;
				
				// note that the time is stored as microseconds
				width_scale_coeffecient = w/((dna_end_hour - dna_start_hour)*3600);
				var current_group_id = "g_"+results[0].date;
				var group = svg.append("g").attr("id",current_group_id).attr("class","dna_group");
				console.log("Drawing group " +  current_group_id + " width_scale_coeffecient is " + width_scale_coeffecient);

				// append background svg so that svg elements on top of it can be properly selected, and give much smoother animation
				group.append("rect")
					.attr("width",w)
					.attr("height",group_height)
					.attr("x",lm)
					.attr("y",tm)
					.attr("fill","rgba(0,0,0,0)")
					.attr("class","dna_group_bg");

				var x_offset = lm;
				for(var i=0; i<results.length; i++){
					var width = width_scale_coeffecient * (results[i].life_duration/1000);
					// note that because javascript is not floating point precise, width can be smaller than zero
					// if(lm + width > w || width <0 ) continue;
					if (width < 0) continue;
					width = Math.min(w - x_offset, width);
					// results[i].life_duration is in micro seconds
					x_offset = lm + calculate_time_diff_in_a_day(results[i].open_time,dna_start_hour)*width_scale_coeffecient;
					group.append("rect")
						.attr("width",width)
						.attr("height",group_height)
						.attr("x",x_offset)
						.attr("y",tm)
						.attr("id",i+"_"+results[0].date)
						.attr("fill",get_block_color(results[i]))
						.attr("class","blocks "+results[i].tab_domain.replace(/\./g,"_")+" url_openable");
					

					// update hashes
					if(typeof domain_meta_hash[results[i].tab_domain] == "undefined"){
						domain_meta_hash[results[i].tab_domain]  = {
							domain: results[i].tab_domain,
							visits: 0,
							duration: 0						
						};
					}
					if(typeof domain_date_util_hash[results[0].date] == "undefined"){
						domain_date_util_hash[results[0].date] = {
							distract_frequency: 0,
							distract_duration: 0,
							in_browser: 0,
						};
					}
					if(typeof domain_date_meta_hash[results[0].date] == "undefined"){
						domain_date_meta_hash[results[0].date]  = {};
					}
					if(typeof domain_date_meta_hash[results[0].date][results[i].tab_domain] == "undefined"){
						domain_date_meta_hash[results[0].date][results[i].tab_domain] = {
							domain: results[i].tab_domain,
							visits: 0,
							duration: 0
						}
					}
					// update hash values
					domain_meta_hash[results[i].tab_domain].visits += 1;
					domain_meta_hash[results[i].tab_domain].duration += results[i].life_duration;
					domain_date_meta_hash[results[0].date][results[i].tab_domain].visits += 1;
					domain_date_meta_hash[results[0].date][results[i].tab_domain].duration += results[i].life_duration;
					if(sites[results[i].tab_domain] > 0){
						domain_date_util_hash[results[0].date].distract_frequency += 1;
						domain_date_util_hash[results[0].date].distract_duration += results[i].life_duration;
					}
					if(results[i].tab_domain!= "not_in_browser"){
						domain_date_util_hash[results[0].date].in_browser += results[i].life_duration;
					}
				}

				// calculate start and end location in the y axis
				if(typeof group_ycord_start_end_pos[current_group_id] == "undefined"){
					group_ycord_start_end_pos[current_group_id] = {};
				}

				group_ycord_start_end_pos[current_group_id]["ys"] = tm;
				group_ycord_start_end_pos[current_group_id]["ye"] = tm+group_height;
			}else{
				svg.append("text")
					.attr("x",lm + 20)
					.attr("y",tm + group_height/2 + 7)
					.attr("fill",COLOR_RIGHT_PANEL_HEAD_TEXT)
					.attr("opacity",0.9)
					.attr("font-size",13)
					.attr("font-style","italic")
					.attr("class","collection_warning")
					.text("Yogurt has not collected enough data to analyze distractions for this day.");
			}

			// only start aggregate data when all requests have returned. Note that this is hard coded. We need to make it automatic
			if(finished_requests == total_days_to_load){
				console.log("Query all returned!");
				for(key in group_ycord_start_end_pos){
					var ys =  group_ycord_start_end_pos[key]["ys"];
					var ye =  group_ycord_start_end_pos[key]["ye"];
					svg.append("rect")
						.attr("width",4)
						.attr("height",group_height+4)
						.attr("x",-1000)
						.attr("y",ys-2)
						.attr("class", "group_cursor")
						.attr("id","l_"+key)
						.attr("fill",COLOR_CURSOR)
						.attr("stroke",COLOR_CURSOR)
						.attr("stroke-width",1)
						.attr("fill-opacity","0.2");
					svg.append("rect")
						.attr("width",10)
						.attr("height",group_height)
						.attr("x",-1000)
						.attr("y",ys)
						.attr("class", "group_selection_block")
						.attr("id","b_"+key)
						.attr("fill","yellow")
						.attr("fill-opacity","0.6");
				}

				// // attach go back animation to the back button
				// $("#back_button").click(function(){
				// 	dna_pushed_to_top = false;
				// 	d3.selectAll("#"+range_group_id+" rect").transition()
				// 	    .duration(750)
				// 	    .attr("y", function() { return recover_rect_ycord; });
				// 	d3.selectAll("#"+recover_block_id).transition()
				// 	    .duration(750)
				// 	    .attr("y", function() { return recover_rect_ycord; });
				// 	d3.selectAll("#l_"+recover_cursor_id).transition()
				// 	    .duration(750)
				// 	    .attr("y", function() { return recover_rect_ycord-5; });
				// 	$(".dna_group").fadeIn(500);   			
				// });

				// // attach click events to group boxes
				// $(".group_selection_block").click(function(e){
				// 	if(dna_pushed_to_top) return;
				// 	dna_pushed_to_top = true;
				// 	$(".dna_group").hide();
				// 	$("#"+range_group_id).show();
				// 	recover_rect_ycord = parseInt(e.target.getAttribute("y"));
				// 	recover_cursor_id = e.target.id.substr(2);
				// 	recover_block_id = e.target.id;
				// 	d3.selectAll("#"+range_group_id+" rect").transition()
				// 	    .duration(750)
				// 	    .attr("y", function() { return 20; });
				// 	d3.selectAll("#"+recover_block_id).transition()
				// 	    .duration(750)
				// 	    .attr("y", function() { return 20; });
				// 	d3.selectAll("#l_"+recover_cursor_id).transition()
				// 	    .duration(750)
				// 	    .attr("y", function() { return 15; });
				// 	console.log(this.id+", width - "+$(this).attr("width"));
				// }).mouseover(function(){
				// 	$("#tooltip").text("Click to zoom").show();
				// 	$(".group_cursor").hide();
				// });
					
				// attach mouseover to group cursors
				$(".dna_group").mouseover(function(e){
					// if current id is a block (by splitting and telling if the first token is a number), then display tooltip
					var ids = e.target.id.split("_");
					// potential performance improvement here - this is already pretty efficient consider we don't attach a listener to
					// an individual block element
					if(ids[0]!="" && isNaN(ids[0]) == false){
						tooltip_data = browsing_data[ids[1]][ids[0]];
						// optimized speed for tool tip
						$("."+previous_highlighted_class).removeClass("red_block");
						var class_name = tooltip_data.tab_domain.replace(/\./g,"_");
						if(class_name != "not_in_browser"){
							$("."+class_name).addClass("red_block");
							previous_highlighted_class = class_name;
							$("#tooltip").html(
								
								"<div style='border-bottom:1px dotted #999'><span class='tooltip_time'>" + secondsSinceDay(((e.pageX-group_mousemove_offset)*24*3600)/w/time_discount_factor) + "</span>"
								+"<span class='tooltip_date'>" + format_date(ids[1]) +"</span></div>"
								+"<div class='tooltip_domain'>" + tooltip_data.tab_domain + "</div>"
								+"<span style='display:block;opacity:0.8'>" + str_cut(tooltip_data.tab_path,32) + " </span>"
								+"<span class='strong'>Block duration</span> <span class='tooltip_stat_content'> " + secondsToTime(Math.round(tooltip_data.life_duration/1000)) + "</span>"
								+"<br/> <span class='strong'>Day sum</span> <span class='tooltip_stat_content'>" + secondsToTime(Math.round(domain_date_meta_hash[ids[1]][tooltip_data.tab_domain].duration/1000)) + "</span>"
								+"<br/> <span class='strong'>7 days sum</span> <span class='tooltip_stat_content'>" + secondsToTime(Math.round(domain_meta_hash[tooltip_data.tab_domain].duration/1000)) + "</span>"
								+"<br/> <span class='strong'>Mouse clicks/keystrokes</span>  <span class='tooltip_stat_content'>" + ((tooltip_data.mouse_clicks) + (tooltip_data.keystrokes)) +  " time(s)</span>"
								+"<br/> <span class='strong'>Scrolling distance</span>  <span class='tooltip_stat_content'>" + ((tooltip_data.scrolls)) +  " pixels</span>"
								+"<br/> <span class='strong'>Mouse moving distance</span>  <span class='tooltip_stat_content'>" + ((tooltip_data.mouse_movement)) +  " pixels</span>"
							).show();
							current_url_under_mouse = tooltip_data.tab_path;
						}else{
							$("#tooltip").html(
								"<div style='border-bottom:1px dotted #999'><span class='tooltip_time'>" + secondsSinceDay(((e.pageX-group_mousemove_offset)*24*3600)/w/time_discount_factor) + "</span>"
								+"<span class='tooltip_date'>" + format_date(ids[1]) +"</span></div>"
								+"<div class='tooltip_domain'>Not In browser</div>").show();
						}
					}
					// only show the cursor on the current dna group
					$(".group_cursor").hide();
					$("#l_"+this.id).show();
					// calculate the margin offset, note that the user won't be able to resize the window while mouse over
					group_mousemove_offset = Math.max((window_width-960)/2,0)+10;
				}).mousemove(function(e){
					// note that we should propagate mouse events underneath the box by using css pointer-events:none in group-selection-block
					if(user_click_mouse_down == true){
						// var width_val = e.pageX-group_mousemove_offset - last_group_cursor_x_pos;
						// if(width_val<0) return;
						// $("#b_"+this.id).attr({
						// 	width:width_val,
						// 	x:last_group_cursor_x_pos
						// });
					}else{
						last_group_cursor_x_pos = e.pageX-group_mousemove_offset;
					}
					// if user is not clicking, update cursor to follow the mouse
					$("#l_"+this.id).attr({x:e.pageX-group_mousemove_offset-2});
				});

				// attach mouse down and up to global document
				$(document).mousedown(function(e){
					if($(e.target).hasClass("url_openable")){
						console.log("sdsd");
						window.open(current_url_under_mouse,"_blank");
					}
					// if(e.target.id.split("_")[0]!="b" && !$(e.target).hasClass("ignore_global_mousedown")){
					// 	// infer current group id
					// 	// range_group_id = e.target.id.substr(2);
					// 	// range_start_time = ((e.pageX-group_mousemove_offset)*24*3600)/w;
					// 	// user_click_mouse_down = true;
					// 	// $(".group_selection_block").hide().attr({width:0}).css({"pointer-events":"none"});
					// 	// $("#b_"+range_group_id).show();
					// }
					//console.log("down "+e.target.id);
				}).mouseup(function(e){
					// range_end_time = ((e.pageX-group_mousemove_offset)*24*3600)/w;
					// $(".group_selection_block").css({"pointer-events":"all"});
					// user_click_mouse_down = false;
					//console.log("up "+e.target.id);
				});

				// make the domain hash sortable
				for(domain in domain_meta_hash){
					// filter data before adding to hash
					if(domain!= "not_in_browser") domain_meta_sortable.push(domain_meta_hash[domain]);
				}
				// make the domain date hash sortable
				for(date in domain_date_meta_hash){
					domain_date_meta_sortable[date] = [];
					// filter data before adding to hash
					for(domain in domain_date_meta_hash[date]){
						if(domain!= "not_in_browser") domain_date_meta_sortable[date].push(domain_date_meta_hash[date][domain]);
					}
				}
				// sort domain on date
				for(date in domain_date_meta_sortable){
					domain_date_meta_sortable[date].sort(function(a,b){return b.duration - a.duration});
				}
				// sort domain
				domain_meta_sortable.sort(function(a,b){return b.duration - a.duration});

				// show rendered dna graph
				$("#loading").hide();
				$(".blocks").show();

				//$("#tab_history").fadeIn(500);
				collapse_to_left(w*(1-collapse_coef));
				$(".header").fadeIn(300);	

				// now calculate total distraction score
				calculate_and_display_total_distraction();

				// make the time out at the end of the loop, it seems like all function calls after this point in the block are not executed
				clearTimeout(dot_animation);
			}
			tm+= (group_height+group_padding);
		});
	}
}


function ColorLuminance(hex, lum) {  
    // validate hex string  
    hex = String(hex).replace(/[^0-9a-f]/gi, '');  
    if (hex.length < 6) {  
        hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];  
    }  
    lum = lum || 0;  
    // convert to decimal and change luminosity  
    var rgb = "#", c, i;  
    for (i = 0; i < 3; i++) {  
        c = parseInt(hex.substr(i*2,2), 16);  
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);  
        rgb += ("00"+c).substr(c.length);  
    }  
    return rgb;  
}  

function collapse_to_left(stats_width){
	time_discount_factor = collapse_coef;
	$("#show_daily_stats_btn").hide();
	$("#hide_daily_stats_btn").fadeIn(200).animate({"color": "rgba(255,255,255,1.0)"},100,function(){});
	$(".group_cursor").hide();
	draw_stats(stats_width);
	$("#tab_history").hide();	
	d3.selectAll(".dna_group_bg")
    	.attr("x", function() { return this.getAttribute("x") * collapse_coef})
    	.attr("width", function() { return this.getAttribute("width") * collapse_coef});
	d3.selectAll(".border_line")
    	.attr("x1", function() { return this.getAttribute("x1") * collapse_coef})
    	.attr("x2", function() { return this.getAttribute("x2") * collapse_coef});
	d3.selectAll(".blocks")
    	.attr("x", function() { return this.getAttribute("x") * collapse_coef})
    	.attr("width", function() { return this.getAttribute("width") * collapse_coef});
    $("#tab_history").fadeIn(500);	
    daily_stats_shown = true;
    show_rightmost_panel_shown = false;
}

function recover_to_right(no_display){
	time_discount_factor = 1;
	$("#right_panel").remove();
	$("#hide_daily_stats_btn").hide();
	$("#show_daily_stats_btn").fadeIn(200).animate({"color": "rgba(255,255,255,1.0)"},100,function(){});;
	$(".group_cursor").hide();
	$(".stats_block").remove();
	$("#tab_history").hide();
	d3.selectAll(".dna_group_bg")
    	.attr("x", function() { return this.getAttribute("x") / collapse_coef})
    	.attr("width", function() { return this.getAttribute("width") / collapse_coef});
	d3.selectAll(".border_line")
    	.attr("x1", function() { return this.getAttribute("x1") / collapse_coef})
    	.attr("x2", function() { return this.getAttribute("x2") / collapse_coef});
	d3.selectAll(".blocks")
	    .attr("x", function() { return this.getAttribute("x") / collapse_coef})
	    .attr("width", function() { return this.getAttribute("width") / collapse_coef});
	if(no_display == false){
		$("#tab_history").fadeIn(500);	
	}
	daily_stats_shown = false;
	collapse_coef = 0.8;
	show_rightmost_panel_shown = false;

}

function show_rightmost_panel(date){
	// first recover everything
	if(show_rightmost_panel_shown){
		draw_rightmost_panel(w * (1 - prev_coef),date);
	}else{
		$("#right_panel").remove();
		if(daily_stats_shown){
			$("#tab_history").hide();
			d3.selectAll(".dna_group_bg")
		    	.attr("x", function() { return this.getAttribute("x") / collapse_coef})
		    	.attr("width", function() { return this.getAttribute("width") / collapse_coef});
			d3.selectAll(".border_line")
		    	.attr("x1", function() { return this.getAttribute("x1") / collapse_coef})
		    	.attr("x2", function() { return this.getAttribute("x2") / collapse_coef});
			d3.selectAll(".blocks")
			    .attr("x", function() { return this.getAttribute("x") / collapse_coef})
			    .attr("width", function() { return this.getAttribute("width") / collapse_coef});
		}
		prev_coef = collapse_coef;
		collapse_coef = 0.5;
		$(".stats_block").remove();
		collapse_to_left(w * (1 - prev_coef));
		draw_rightmost_panel(w * (1 - prev_coef),date);
		show_rightmost_panel_shown = true;
	}
}

function draw_rightmost_panel(stats_offset,date){
	$(".right_panel_domain").remove();
	$(".right_panel_line").remove();
	$(".right_panel_rect").remove();
	$(".right_panel_domain_freq").remove();
	$("#right_panel").remove();

	// choose proper data structure to render all 7 day or single day stats
	var data_struct = domain_meta_sortable;
	if(!show_rightmost_panel_all_days){
		data_struct = domain_date_meta_sortable[date];
	}

	var svg = d3.select("#tab_history svg");
	var start_x = w * collapse_coef + stats_offset;
	var g = svg.append("g")
			.attr("class", "")
			.attr("id", "right_panel");
	// we want to detect the start and end position
	var start_y = TM_const;
	var end_y = h - TM_const;
	var block_width = w * (1-collapse_coef) - stats_offset;
	// background rect
	g.append("rect")
		.attr("width", block_width)
		.attr("height",end_y-start_y)
		.attr("x",start_x)
		.attr("y",start_y)
		.attr("fill",COLOR_STATS_BG)
		.attr("opacity",0.2)
		.attr("class","panel_bg");
	g.append("text")
		.attr("x",start_x+8+block_width/2)
		.attr("y",end_y-start_y-6)
		.attr("fill","white")
		.attr("font-size",12)
		.attr("text-anchor","center")
		.attr("opacity",0.4)
		.attr("class","panel_show_all_day_text")
		.text("Show stats for all days");

	$(".panel_show_all_day_text").unbind().hover(function(){
		$(this).animate({"opacity":"0.9"},200);
	}, function(){
		$(this).animate({"opacity":"0.4"},200);
	}).click(function(){
		show_rightmost_panel_all_days = !show_rightmost_panel_all_days;
		draw_rightmost_panel(stats_offset,date);
	});

	var line_space = 55;
	var left_margin = 10;
	var right_margin = 70;

	g.append("image")
			.attr("x", start_x + block_width - 20)
			.attr("y", start_y+10)
			.attr("width", "14")
			.attr("height", "14")
			.attr("xlink:href","close.png")
			.attr("id","right_panel_close_btn");
	g.append("text")
			.attr("x", start_x+left_margin) // plus the image size
			.attr("y", start_y+30)
			.attr("class", "right_panel_date")
			.attr("fill",COLOR_RIGHT_PANEL_HEAD_TEXT)
			.attr("font-size",18)
			.text(format_date(date)+" Stats");

	var max_duration = 0;
	var id_counter = 0;
	for(var i=0; i< data_struct.length; i++){
		if(data_struct[i].duration > max_duration){
			max_duration = data_struct[i].duration;
		}
	}
	for(var i=0; i< data_struct.length; i++){
		id_counter += 1;
		var line_width = (block_width-right_margin-left_margin) * (data_struct[i].duration/max_duration);
		var site_text_color = COLOR_RIGHT_PANEL_TEXT;
		var site_line_color = COLOR_RIGHT_PANEL_PROGRESS_LINE;
		if(sites[data_struct[i].domain] > 0){
			site_text_color = COLOR_RIGHT_PANEL_TEXT_DISTRACTIVE;
			site_line_color = COLOR_RIGHT_PANEL_PROGRESS_LINE_DISTRACTIVE;
		}
		g.append("text")
			.attr("x", start_x+left_margin) // plus the image size
			.attr("y", start_y+line_space)
			.attr("class", "right_panel_domain")
			.attr("fill",site_text_color)
			.attr("stroke-width",0)
			.attr("opacity", "0.9")
			.attr("id", "count_"+id_counter)
			.text(data_struct[i].domain);
		var domain_text_width = parseInt($("#count_"+id_counter).width());
		g.append("text")
			.attr("x", start_x+left_margin+domain_text_width + 6) 
			.attr("y", start_y+line_space)
			.attr("fill",site_text_color)
			.attr("class","right_panel_domain_freq")
			.attr("stroke-width",0)
			.attr("opacity", "0.7")
			.attr("font-size",11)
			.attr("font-style","italic")
			.text(data_struct[i].visits + " visits");
		g.append("text")
			.attr("x", start_x+line_width+left_margin+5) // plus the image size
			.attr("y", start_y+line_space+12)
			.attr("class", "right_panel_line")
			.attr("fill",site_text_color)
			.attr("stroke-width",0)
			.attr("opacity", "0.9")
			.attr("text-anchor","left")
			.attr("font-size","10")
			.text(secondsToTime(data_struct[i].duration/1000));
		g.append("rect")
			.attr("width",  line_width) // plus the image size
			.attr("height", 2)
			.attr("x", start_x+left_margin) // plus the image size
			.attr("y", start_y+line_space+7)
			.attr("class", "right_panel_rect")
			.attr("fill",site_line_color);
		line_space += 30;
		if(line_space >= end_y-start_y-25) break;
	}

	if(!show_rightmost_panel_all_days){
		$(".panel_show_all_day_text").text("Show stats for all days");
		$(".right_panel_date").text(format_date(date)+" Stats");
	}else{
		$(".panel_show_all_day_text").text("Show stats "+date);
		$(".right_panel_date").text("Past seven days");
	}

	$("#right_panel_close_btn").unbind().click(function(){
		recover_to_right(true);
		collapse_to_left(w * (1 - prev_coef));
	});
	$(".right_panel_domain").unbind().hover(function(e){
		$(this).attr("fill-opacity","0.5");
		var domain_raw = $(this).text();
		var class_name = domain_raw.replace(/\./g,"_");
		$("."+previous_highlighted_class).removeClass("red_block");
		$("."+class_name).addClass("red_block");
		previous_highlighted_class = class_name;
		$("#tooltip").html(
				"<div class='tooltip_domain'>" + domain_raw + "</div>"
				+"<span class='strong'>Day sum</span> <span class='tooltip_stat_content'>" + ((typeof domain_date_meta_hash[date][domain_raw] === "undefined")? "0s" : secondsToTime(Math.round(domain_date_meta_hash[date][domain_raw].duration/1000))) + "</span>"
				+"<br/> <span class='strong'>7 days sum</span> <span class='tooltip_stat_content'>" + secondsToTime(Math.round(domain_meta_hash[domain_raw].duration/1000)) + "</span>"
				+"<br/>"
		).show();
	},function(){
		$(this).attr("fill-opacity","1.0");
		$("#tooltip").hide();
	});
}



function draw_stats(stats_width){
	var svg = d3.select("#tab_history svg");
	var start_x = w * collapse_coef;
	var stats_line_font_size = 11;
	var vertical_margin = 12;
	var horizontal_margin = 12;
	for(var key in group_ycord_start_end_pos){
		var start_y = group_ycord_start_end_pos[key].ys;
		var height_y = group_ycord_start_end_pos[key].ye - group_ycord_start_end_pos[key].ys;
		var radius = (height_y - vertical_margin*2) / 2;
		var date = key.split("_")[1];
		var circle_center_x = start_x + radius + horizontal_margin;
		var circle_center_y = start_y + radius + vertical_margin;
		var line_space = (stats_line_font_size+(height_y-2*vertical_margin-3*stats_line_font_size)/2)-2;
		var g = svg.append("g")
				.attr("class", "stats_block")
				.attr("id", "stats_"+date);
		g.append("ellipse")
			.attr("cx", circle_center_x)
			.attr("cy", circle_center_y)
			.attr("rx", radius)
			.attr("ry", radius)
			.attr("class", "circle")
			.attr("stroke", COLOR_ECLIPSE_BORDER)
			.attr("stroke-width", 2)
			.attr("fill", "none")
			.attr("opacity", 0.2);
		g.append("text")
			.attr("x", circle_center_x)
			.attr("y", circle_center_y + 6) // need to adjust according to font size
			.attr("class", "circle_number")
			.attr("id", "stats_1_"+date)
			.attr("text-anchor","middle")
			.attr("fill", COLOR_RIGHT_PANEL_TEXT);
		//attach the percentage of distraction
		var percentage = Math.round(domain_date_util_hash[date].distract_duration/domain_date_util_hash[date].in_browser * 100);
		$("#stats_1_"+date).text(percentage+"%");
		var arc_g = g.append("g")
					.attr("class", "arc_block")
					.attr("transform", "translate(" + circle_center_x + "," + circle_center_y + ")");

		arc_g.append("path")
			.attr("fill", COLOR_ECLIPSE_ARC)
			.attr("d", d3.svg.arc()
						.startAngle(function(){
							return 0;
						})
						.endAngle(function(){
							return (percentage/100)*2*Math.PI;
						})
						.innerRadius(function(){
							return (radius - 1);
						})
						.outerRadius(function(){
							return (radius + 1);
						})
			);
		g.append("rect")
			.attr("x", start_x)
			.attr("y", start_y)
			.attr("height", (group_ycord_start_end_pos[key].ye - group_ycord_start_end_pos[key].ys))
			.attr("width", stats_width)
			.attr("fill", COLOR_STATS_BG)
			.attr("opacity", 0.1)
			.attr("id","panbg_"+date)
			.attr("class","panbg");
		g.append("text")
			.attr("x", start_x + 2 * (radius + horizontal_margin))
			.attr("y", start_y + vertical_margin + stats_line_font_size)
			.attr("class", "stats_line")
			.attr("fill",COLOR_STATS_TEXT)
			.attr("text-anchor","left")
			.text(domain_date_util_hash[date].distract_frequency + " distractions");
		g.append("text")
			.attr("x", start_x + 2 * (radius + horizontal_margin))
			.attr("y", start_y + vertical_margin + stats_line_font_size + line_space)
			.attr("class", "stats_line")
			.attr("fill",COLOR_STATS_TEXT)
			.text(""+secondsToTime(domain_date_util_hash[date].distract_duration/1000));

		var domain_str = "";
		if(typeof domain_date_meta_sortable[date][0] == "undefined"){
			domain_str = "No distraction yet";
		}else{
			domain_str = domain_date_meta_sortable[date][0].domain;
		}
		g.append("text")
			.attr("x", start_x + 2 * (radius + horizontal_margin)) // plus the image size
			.attr("y", start_y + vertical_margin + stats_line_font_size + line_space*2)
			.attr("class", "stats_line")
			.attr("class", "stats_line_domain")
			.attr("fill",COLOR_STATS_TEXT)
			.attr("id","infodomain_"+domain_str)
			.text(str_cut(domain_str,13));

		$(".stats_block").unbind().hover(function(){
			$(this).attr("opacity",0.9);
			$("#tooltip").hide();
		},function(){
			$(this).attr("opacity",1.0);
		}).click(function(){
			show_rightmost_panel_all_days = false;
			show_rightmost_panel(this.id.split("_")[1]);
			$(".panbg").attr("opacity","0.1");
			$("#panbg_"+this.id.split("_")[1]).attr("opacity","0.2");
		});
		// $(".stats_line_domain").unbind().hover(function(){
		// 	//$(this).attr("fill-opacity","0.5");
		// 	var domain_raw = this.id.split("_")[1];
		// 	var class_name = domain_raw.replace(/\./g,"_");
		// 	$("."+previous_highlighted_class).removeClass("red_block");
		// 	if(class_name != "not_in_browser"){
		// 		$("."+class_name).addClass("red_block");
		// 		previous_highlighted_class = class_name;
		// 	}
		// },function(){
		// 	//$(this).attr("fill-opacity","1.0");
		// });
	}
}