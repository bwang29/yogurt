/**
 *  Content script for Yogurt
 *  borui@stanford.edu
 */

//we want to know exactly how the user attention is allocated
// var attention_flow = []
var user_busy = false;
var user_busy_timer = null;
var user_busy_click = 0;
var user_busy_scroll = 0;
var user_busy_mousemove = 0;
var user_busy_keypress = 0;
var attention_idle_timeout = 5000;
var page_time_start = "";
var duration_threshold = "";
var duration_timer = null;
var time_so_far = 0;
var yogurt_pop_off = true;
var close_btn_pgn="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABV0RVh0Q3JlYXRpb24gVGltZQAxMi80LzEympf/0gAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAAAFESURBVDiNtZWhVsNAEEXvWwW2MjbfgCwyll/AFsl3cJBUgiQSG9nKVhYZG1kkdYPIpmez3aWh5/BUMnPmZnbeZlckZGYzYA6UQBGlO6AF1pL2ca0SsAq4Ba5SHwt0AFaSmiTQzK6Be9/VX9QCb5K+AVyQWFwAw9cshhfnu6sYz+oAfE7obFDhGThvQBXBXiS9AtsMrJa0jPKVmc0cvZuh9sAXgKT3BLSWtPHPqyg3d5zOrQAW3qQYeoSZWQE8RLWlzOwps6wOWA7umVkhqYtgJ1vLxYFfOj0LOwccoPFIbnKwKcBa0i4MSPog7z6OflY52NEAM8sZFapzjDdoEkY/s5K8+4NaB6zjYAI2zGxkVKKZtXxhxfhv2dJv2pybHbAB7oJYI6kJT5tHTs++qeokPcPY5WVi CVPU+lrgPw/YCHrxFfADqfGVlXMMEVYAAAAASUVORK5CYII=";
var color_range = [
	"#FF0000",
	"#FF1100",
	"#FF2200",
	"#FF3300",
	"#FF4400",
	"#FF5500",
	"#FF6600",
	"#FF7700",
	"#FF8800",
	"#FF9900",
	"#FFAA00",
	"#FFBB00",
	"#FFCC00",
	"#FFDD00",
	"#FFEE00",
	"#FFFF00",
	"#EEFF00",
	"#DDFF00",
	"#CCFF00",
	"#BBFF00",
	"#AAFF00",
	"#99FF00",
	"#88FF00",
	"#77FF00",
	"#66FF00",
	"#55FF00",
	"#44FF00",
	"#33FF00",
	"#22FF00",
	"#11FF00",
	"#00FF00"
];
$(document).ready(function(){
	page_time_start = new Date();
	attach_yogurt();
	// delay calculating complexity to allow some js content finish loading (after 3 seconds)
	setTimeout(function(){calculate_complexity();},3000);
	setTimeout(function(){append_text_box();},50);
	
});


function register_user_busy(){
	if(user_busy == false){
		chrome.extension.sendMessage({
			type:"attention",
			busy: 1,
			time:(new Date()).getTime()
		},function(response){});

		//console.log("[Yogurt] User becomes busy");
		user_busy = true;
	}
	if(user_busy_timer != null){
		clearTimeout(user_busy_timer);
	}
	user_busy_timer = setTimeout(function(){
		user_busy = false;
		chrome.extension.sendMessage({
			type:"attention",
			busy: 0,
			time:(new Date()).getTime(),
			click:user_busy_click,
			scroll:user_busy_scroll,
			mousemove:user_busy_mousemove,
			keypress:user_busy_keypress
		},function(response){});

		reset_busy_dat();
		//console.log("[Yogurt] User is no longer busy");
	},attention_idle_timeout);
}

function reset_busy_dat(){
	user_busy_click = 0;
	user_busy_scroll = 0;
	user_busy_mousemove = 0;
	user_busy_keypress = 0;
}

function get_distraction_color(){
	chrome.extension.sendMessage({"domain":window.location.href,"action":"get_site_stats","add_time":time_so_far},function(response){
		// indicating light will turn red completely after an hour of distraction
		var idx = Math.min(30,response.duration/100);
		$("#distraction_level").css({"background":color_range[30-idx]});
	});
}

function append_text_box(){
	$("body").prepend('<div id="yogurt_pop" style="-webkit-user-select: none; display:none; position:fixed;z-index:1000;bottom:30px;left:20px;font-family:Arial"> <div id="yogurt_pop_btn" style="padding:2px 5px; display:inline-block; background:#333; -webkit-box-shadow:inset 0px 1px 0px 0px #ffffff; box-shadow:inset 0px 1px 0px 0px #333; background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #333), color-stop(1, #191919) ); -webkit-border-radius:3px; border-radius:3px; border:1px solid #292929; text-shadow:1px 1px 0px #333; color:#efefef; font-weight:bold; cursor:pointer; font-size:11px; opacity: 0.9;"> <div id="distraction_level" style="display:inline-block; width:6px; height: 6px; background: #00ff00; margin 4px; -webkit-border-radius:6px; border-radius:6px;"></div> Yogurt </div> </div>'); 
	$("body").prepend('<div id="yogurt_pop_content" style="position:fixed;z-index:1000;bottom:65px;left:20px;font-family:Arial;display:none; padding:5px 0 "> <div id="yogurt_pop_stats" style="width: 200px; padding:2px 5px; display:inline-block; background:#444; -webkit-box-shadow:inset 0px 1px 0px 0px #ffffff; box-shadow:inset 0px 1px 0px 0px #666; -webkit-border-radius:3px; border-radius:3px; border:1px solid #292929; text-shadow:1px 1px 0px #333; color:#fff; font-size:11px; opacity: 0.9;"> <div class="" style="position:absolute;right:4px;top:10px;cursor:pointer"><img src="'+close_btn_pgn+'"width="12px" id="yogurt_popup_close_btn"/></div> <div class="" style="font-weight:bold; height:19px; font-size:13px;" id="yogurt_domain">loading..</div> <div class="stats_block" style="border-top:1px dotted #777; padding:3px; margin:2px 0 1; clear: both; display:block"> <div class="" style="float:left">Total time spent today</div> <div id="yogurt_protect_duration" class="" style="float:right">loading..</div> </div> <div class="stats_block" style="border-top:1px dotted #777; padding:3px; margin:2px 0; clear: both; display:block"> <div class="" style="float:left">Visited times today</div> <div id="yogurt_protect_times" class="" style="float:right">loading..</div> </div> <div class="stats_block" style="border-top:1px dotted #777; padding:3px; margin:2px 0; clear: both; display:block"> <div class="" style="float:left">Distraction level</div> <div class="" style="float:right" id="yogurt_distraction_level">loading..</div> </div> <div class="stats_block" style="border-top:1px dotted #777; padding:3px; margin:2px 0; clear: both; display:block"> <div class="" style="padding:1px 5px; display:block; background:#333; -webkit-box-shadow:inset 0px 1px 0px 0px #ffffff; box-shadow:inset 0px 1px 0px 0px #ffffff; background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #ffffff), color-stop(1, #dedede) ); -webkit-border-radius:2px; border-radius:2px; border:1px solid #dcdcdc; text-shadow:1px 1px 0px #ffffff; color:#292929; font-weight:bold; font-size:11px; opacity: 0.8; cursor:pointer; text-align:center; margin-top:3px" id="yogurt_open_app">View in yogurt</div> </div> </div> </div>');
	$("#yogurt_pop").show(); 
	get_distraction_color();
	$("#yogurt_pop_btn").hover(
		function(){$(this).css({"border-color":"#666"})},
		function(){$(this).css({"border-color":"#292929"})})
	.click(
		
		function(){
			if(yogurt_pop_off){
				time_so_far = (new Date()) - page_time_start;
				chrome.extension.sendMessage({"domain":window.location.href,"action":"get_site_stats","add_time":time_so_far},function(response){
					duration_threshold = response.duration;
					if(duration_timer != null){
						clearTimeout(duration_timer);
					}
					$("#yogurt_protect_duration").text(secondsToTime(duration_threshold));
					duration_timer = setInterval(function(){
						duration_threshold = duration_threshold + 1;
						$("#yogurt_protect_duration").text(secondsToTime(duration_threshold));
					},1000);
					$("#yogurt_protect_times").text((response.times == 0)? "1" : response.times);
					$("#yogurt_domain").text(response.domain);
					$("#yogurt_distraction_level").text(response.level);
					$("#yogurt_pop_content").fadeIn(200)
				});
				yogurt_pop_off = false;
			}else{
				$("#yogurt_pop_content").fadeOut(200);
				yogurt_pop_off = true;
			}
		}
			
	);
	$("#yogurt_open_app").click(function(){
		chrome.extension.sendMessage({"action":"open_app"},function(response){
		});
	});
	$("#yogurt_popup_close_btn").click(function(){$("#yogurt_pop_content").fadeOut(100)});

}

function calculate_complexity(){
	// we want to count the major metric of the site, for example , total number of images, total about of words
	var all_images = $("img");
	var significant_img_count = 0;
	for(var i=0; i<all_images.length; i++){
		if(all_images[i].width > 300 && all_images[i].height > 200){
			significant_img_count += 1;
		}
	}
	chrome.extension.sendMessage({"status":"ok","action":"large_image_count","data":significant_img_count},function(response){
		//console.log(response);
	});
}

function attach_yogurt(){
	$(window).click(function(){
		register_user_busy();
		user_busy_click += 1;
		chrome.extension.sendMessage({"status":"ok","action":"click"},function(response){});
	});
	$(window).scroll(function(){
		register_user_busy();
		user_busy_scroll += 1;
		chrome.extension.sendMessage({"status":"ok","action":"scroll"},function(response){});
	});
	$(window).mousemove(function(){
		register_user_busy();
		user_busy_mousemove += 1;
		chrome.extension.sendMessage({"status":"ok","action":"mousemove"},function(response){});
	});
	$(window).keypress(function(){
		register_user_busy();
		user_busy_keypress += 1;
		chrome.extension.sendMessage({"status":"ok","action":"keypress"},function(response){});
	});
}
