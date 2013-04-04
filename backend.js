/**
 *  This javascript file provides access to the web sql database
 *  and some helper functions.
 * 
 *  The database is saved in 
 *  ~/Library/Application Support/Google/Chrome/Default/databases
 *  then look for a folder named chrome-extension_<extension_id>
 *  It's a sqlite database that can be opened with Lita.
 */

$(document).ready(function() {
	yogurt_backend_init();
	console.log("Backend initialized.");
});

var Attention;

/**
 * Initialize the backend.
 */
function yogurt_backend_init() {
	// TODO: fallback to persistence.store.memory if window.openDatabase doesn't exist
	persistence.store.websql.config(
		persistence, 'yogurt-db', 'browsing data', 5 * 1024 * 1024);

	Attention = persistence.define('Attention', {
		tab_domain: 'TEXT',
		tab_path: 'TEXT',
		open_time: 'DATE',
		close_time: 'DATE',
		date: 'TEXT',
		life_duration: 'INT',
		scrolls: 'INT',
		mouse_clicks: 'INT',
		mouse_movement: 'INT',
		webpage_height: 'INT',
		image_density: 'INT',
		text_density: 'INT',
		keystrokes: 'INT',
		attention_flow: 'TEXT',
	});

	persistence.schemaSync(null, function(tx) {
		console.log("Backend schema sync'ed.");
	});

	/**
	 * init Attention with last_attention dict
	 */
	Attention.init_with_last_attention = function(attn, last_attention) {
		attn.tab_domain = last_attention.domain;
		attn.tab_path = last_attention.url;
		attn.life_duration = last_attention.time_end - last_attention.time_start; 
		attn.open_time = last_attention.time_start;
		attn.close_time = last_attention.time_end;
		attn.date = get_year_day(last_attention.time_start);
		attn.scrolls = last_attention.total_scroll;
		attn.keystrokes = last_attention.total_keypress;
		attn.mouse_clicks = last_attention.total_click;
		attn.mouse_movement = last_attention.total_mousemove;
		attn.image_density = last_attention.total_large_image_count;
		attn.attention_flow = last_attention.serialized_attention_flow;
	};

	/**
	 * save an object to database
	 * postpone flushing to database with should_not_flush
	 */
	Attention.save = function(attn, should_not_flush) {
		persistence.add(attn);
		if (!should_not_flush) {
			persistence.transaction(function(tx) {
				persistence.flush(tx, function() {
					console.log('persistence flushed');
				});
			});
		}
	};

	/**
	 * remove an object to database
	 * postpone flushing to database with should_not_flush
	 */
	Attention.remove = function(attn, should_not_flush) {
		persistence.remove(attn);
		if (!should_not_flush) {
			persistence.transaction(function(tx) {
				persistence.flush(tx, function() {
					console.log('persistence flushed');
				});
			});
		}
	};


	/**
	 * Query a specific day
	 * callback funtion takes results as an argument
	 *
	 * Query Example:
	 * Attention.query_date('2012-11-12', function(results) {
	 *     results.forEach(function(r) {
	 *         console.log(r.date + ' ' + r.life_duration + 's ' + r.tab_domain );
	 *     });
	 * });
	 */
	Attention.query_date = function(target_date, callback) {
		var attns = Attention.all()
			.filter("date", '=', target_date);
		attns.list(null, callback);
	};

	/**
	 * Query a date range.
	 * Returns rows in the range [from_date, to_date], inclusive
	 * callback funtion takes results as an argument
	 * if from_date is '', from_date = -Inf
	 * if to_date is '', to_date = Inf
	 *
	 * Query Example:
	 * Attention.query_date_range('2012-09-12', '2012-10-12', function(results) {
	 *     results.forEach(function(r) {
	 *         console.log(r.date + ' ' + r.life_duration + 's ' + r.tab_domain );
	 *     });
	 * });
	 */
	Attention.query_date_range = function(from_date, to_date, callback) {
		var attns = Attention.all();
		if (from_date) {
			attns = attns.filter("date", '>=', from_date);
		}
		if (to_date) {
			attns = attns.filter("date", "<=", to_date);
		}
		attns.list(null, callback);
	};

	/**
	 * Return objects satisfying a particular domain name on a particular day
	 */
	Attention.query_domain_on_date = function(target_date, domain_name, callback) {
		var attns = Attention.all()
			.filter("date", '=', target_date)
			.filter("tab_domain", '=', domain_name);
		attns.list(null, callback);
	};
}


/****************************************************************
 * Some other util functions goes here
 */

/**
 * Given a Date() object, returns a string yyyy-mm-dd
 */
function get_year_day(d) {
	var yyyy = d.getFullYear().toString();
	var mm = (d.getMonth()+101).toString().substring(1); // getMonth is 0-based
	var dd  = (d.getDate()+100).toString().substring(1);
	return yyyy + '-' + mm + '-' + dd;
}