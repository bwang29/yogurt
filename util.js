function Site(domain,distraction) {
  this.domain = domain;
  this.distraction = distraction;
}
// row represetns a style, columns represent 6 colors used in the style, you can add more rows to make more styles in the congif page
// make some wild colors!
var COLOR_CHOICES = [
	['#000000', '#FFFFFF', '#EEEEEE', '#DDDDDD', '#CCCCCC', '#FF2929'],
	['#001020', '#E0F0F0', '#607080', '#90A0B0', '#902010', '#00EFFE'],
	['#452059', '#FAFAFA', '#9B8DF3', '#C3E3BF', '#FBFFD8', '#f5a503'],
	['#161616', '#099823', '#1C0100', '#62CF6D', '#18983E', '#f5a503'],
	['#8A0528', '#F2D194', '#1C0100', '#F4CE76', '#FAA69C', '#FF1600'],
    ['#012840', '#79c7d9', '#9bf2ea', '#8DE0A9', '#9dbf8e', '#f5a503'],
    ['#FFFFFF', '#595859', '#0D131F', '#1E2E49', '#0D131F', '#000000']
];

var DEFAULT_SITES = [
        new Site('facebook.com', 3),
        new Site('renren.com', 3),
        new Site('9gag.com', 3),
        new Site('news.ycombinator.com', 3),
        new Site('lifehacker.com', 3),
        new Site('slashdot.org', 3),
        new Site('youtube.com', 3),
        new Site('reddit.com', 3),
        new Site('wikipedia.com', 1),
        new Site('engadget.com', 2),
        new Site('twitter.com', 3)
];

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function x_days_ago_date(x){
	var today = new Date();
	var ago = new Date( today.getTime() - (x * 24 * 60 * 60 * 1000) );
	var dd = ago.getDate();
	var mm = ago.getMonth() + 1;
	var yyyy = ago.getFullYear();
	if(dd < 10){
		dd = '0' + dd;
	}
	if(mm < 10){
		mm = '0' + mm;
	}
	return yyyy+'-'+mm+'-'+dd;
}

function secondsToTime(secs)
{
    var divisor_for_minutes = secs % (60 * 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var obj = {
        "h ": Math.floor(secs / (60 * 60)),
        "m ": Math.floor(divisor_for_minutes / 60),
        "s": Math.ceil(divisor_for_seconds)
    };
    var str = "";
    for (key in obj){
    	if(obj[key] != 0){
    		str += obj[key] + key;
    	}
    }
    return str;
}
function secondsSinceDay(secs)
{
    var divisor_for_minutes = secs % (60 * 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var p1  = (Math.floor(secs / (60 * 60)) < 10)? "0" + Math.floor(secs / (60 * 60)) : Math.floor(secs / (60 * 60));
    var p2  = (Math.floor(divisor_for_minutes / 60) < 10)? "0" + Math.floor(divisor_for_minutes / 60) : Math.floor(divisor_for_minutes / 60);
    var p3  = (Math.ceil(divisor_for_seconds) < 10)? "0" + Math.ceil(divisor_for_seconds) : Math.ceil(divisor_for_seconds);
    return "" + p1+":" + p2+":"+ p3;
}

/**
 *  Returns the first int we found in the str
 */
function str_to_int(str) {
	var match = str.match(/\d+/);
	return parseInt(match[0], 10);
}

/**
 *  Opens a new window with generated png file
 */
function open_window_with_img(width, height, ready) {
	$(".collection_warning").hide();
	if(daily_stats_shown == true){
		recover_to_right(false);
	}
	$(ready).fadeIn(100);
	setTimeout(function(){
		var padding_x = 300;
	    var padding_y = 150;

		$(".group_cursor").hide();
		$("line").hide();
		var svg2 = $("svg").clone();
		$("line").show();
		var svg_html = $('<div>').append(svg2).html();

		var svg_width = str_to_int($("svg").width());
		var svg_height = str_to_int($("svg").height());

		$('canvas')[0].width = svg_width + 2 * padding_x;
		$('canvas')[0].height = svg_height + 2 * padding_y;

		canvg('canvas', svg_html, {
			offsetX: padding_x,
			offsetY: padding_y,
			ignoreDimensions: true,
		});

		var can = document.getElementsByTagName('canvas')[0];
		var ctx = can.getContext('2d');
		ctx.globalCompositeOperation = "destination-over";
		// ctx.fillStyle = '#333';
		var lineargradient = ctx.createLinearGradient(0, 0, 0, svg_height);
		lineargradient.addColorStop(0, ColorLuminance(settings.color_theme[0],-0.4));
		lineargradient.addColorStop(1, settings.color_theme[0]);
		ctx.fillStyle = lineargradient;
		ctx.fillRect(0, 0, 5000, 5000);

		var w = window.open();
		$(w.document.body).html($('<img src="' + canvas.toDataURL("image/png") + '" />'));
		$(ready).hide();
		$(".collection_warning").show();
	},200);

}

// helper function to get domain from an url
// need improvement to only intercept doamin name
function get_domain(url){
	if(url == "") return "";
	var arr = url.split("/");
	// ignore non http and https headers
	if(arr[0] !== "http:" && arr[0] !== "https:") return "";
	return arr[2].split("/")[0].split("www.").join("");
}

function str_cut(str,length){
	var s = str;
	if(s.length > length){
		s = s.substr(0,length) + ".."; 
	}
	return s;
}

function format_date(date){
	var tokens = date.split("-");
	var formatted = "";

	switch(tokens[1]){
		case "01": formatted+="Jan "; break;
		case "02": formatted+="Feb "; break;
		case "03": formatted+="Mar "; break;
		case "04": formatted+="Apr "; break;
		case "05": formatted+="May "; break;
		case "06": formatted+="Jun "; break;
		case "07": formatted+="Jul "; break;
		case "08": formatted+="Aug "; break;
		case "09": formatted+="Sep "; break;
		case "10": formatted+="Oct "; break;
		case "11": formatted+="Nov "; break;
		case "12": formatted+="Dec "; break;
	}

	formatted+=tokens[2]+", "+tokens[0];
	return formatted;
}

