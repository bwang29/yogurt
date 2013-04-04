// Saves options to localStorage.
/*
 *  Whenever adding a new property in the settings:
 *  1. check the existence and assign a default value in load_options()
 *  2. make necessary changes in update_ui() to refresh the ui
 */
/**
 *  choose a storage backend, either local or sync'd between chromes
 */
// var storage = chrome.storage.sync;
var storage = chrome.storage.local;
//this var holds all settings
var settings;
var clicked_element;

$(document).ready(function(){
  $(".nav_label").click(function(){
    $(".panel").hide(100);
    $("#"+this.id+"_wrapper").slideDown(100);
    $(".nav_label").not("#"+this.id).animate({"color":"#AAA","border-color":"#AAA"},200);
    clicked_element = this.id;
  }).hover(function(){
    $(this).animate({"color":"#000","border-color":"#292929"},200);
  },function(){
    if(this.id != clicked_element){
      $(this).animate({"color":"#AAA","border-color":"#AAA"},200);
    }
  });
  
  $("#setting_site_add").click(function(){
    $("#setting_site_add_input_text").text("Type domain name here, hit enter to save.");
    $("#setting_site_add_input").fadeIn(200);
    $("#setting_add_site_input").focus();
  });
  $("#setting_add_site_input").keypress(function(e) {
    // detect user enter input event
    if(e.which == 13) {
        var domain = get_domain($(this).val());
        if(domain == ""){
          domain = get_domain("http://" + $(this).val());
        }
        console.log(domain);
        if(contains_site(settings.site_list,domain) == false){
          settings.site_list.push(new Site(domain,1));
          save_options(true);
          build_site_options();
          $("#setting_add_site_input").val("");
        }else{
          alert(domain+" already exists in the current list of domains");
        }
    }
  });
  $("#about_yogurt_wrapper").fadeIn(500);
  load_options();
  // $('#clear').click(function() {
  //   /* clear all sites */
  //   settings.site_list = [];
  //   update_ui();
  //   console.log('sites cleared');
  //   return false;
  // });
});

/* for debug, load some test data into settings.site_list */
function load_test_data() {
  var res = [];
  settings.site_list = res;
}

function build_color_options(){
  $('#color_theme_choices').html("");
  var current_color_choice = settings.color_theme;
  for(var i=0; i< COLOR_CHOICES.length; i++){
    var colors = COLOR_CHOICES[i];
    var highlight = (arr_same(current_color_choice,colors) == false)? "" : "color_block_highlight";
    var color_block = "<div id='colors_"+i+"' class='color_block "+highlight+"'>"
    for(var j=0; j< colors.length; j++){
      color_block += "<div class='color_sub_block' style='background:"+colors[j] + "'></div>"
    }
     $('#color_theme_choices').append(color_block + "</div>");
  }
  // when user clicks on a color block, remember it
  $(".color_block").click(function(){
      $(".color_block").removeClass("color_block_highlight");
      $(this).addClass("color_block_highlight");
      settings.color_theme = COLOR_CHOICES[this.id.split("_")[1]];
      save_options(true);
  });
}

function build_site_options(){
  $("#setting_site_add_input_text").text("Add new site");
  $("#setting_site_add_input").fadeOut(200);
  $('#site_setting_entires').html("");
  var site_div_str = "";
  for(var i=0; i< settings.site_list.length;i++){
    site_div_str+='<div class="setting_site_entry">'
    +'<div class="setting_site_domain">'+settings.site_list[i].domain+'</div><div class="setting_site_level">';
    for(var level = 1; level <= 3; level ++){
      var level_null = (settings.site_list[i].distraction == level)? "" : "null";
      var id = ""+i+"_"+level;
      site_div_str+= '<span id="'+id+'" class="' + i + ' level level_'+level+' '+level_null+'"></span>';
    }
    site_div_str += '<span id="'+id+'_remove" class="remove">REMOVE</span></div></div>';
  }
  $('#site_setting_entires').append(site_div_str);
  $(".level").unbind();
  $(".remove").unbind();
  $(".level").click(function(){
      var id = this.id;
      $("."+id.split("_"[0])).addClass("null");
      $(this).removeClass("null");
      settings.site_list[id.split("_")[0]].distraction = id.split("_")[1];
      save_options(true);
  });
  $(".remove").click(function(){
      var id = this.id;
      settings.site_list.splice([id.split("_")[0]],1);
      save_options(true);
      build_site_options();
  });
}

// IO functions
function load_options() {
  // loads the settings from storage and store the settings
  // in a global var called 'settings'
  // also if the storage is empty, initialize what we needed
  storage.get(function(items) {
    settings = items;
    if (chrome.runtime.lastError) {
      console.log('Error: ' + chrome.runtime.lastError.message);
    } else {
      console.log('Settings loaded');
    }
    var should_update_storage = false;
    // check each var here and assign a default value if it doesn't
    console.log(settings);
    /* site_list */
    if (!settings.hasOwnProperty('site_list')) {
      should_update_storage = true;
      settings.site_list = DEFAULT_SITES;
    }
    /* color_theme */
    if (!settings.hasOwnProperty('color_theme')) {
      should_update_storage = true;
      settings.color_theme = COLOR_CHOICES[0];
    }
    // update the storage when necessary
    if (should_update_storage) {
      save_options(true);
    }
    // then update UI
    build_color_options();
    build_site_options();
  });
}

function save_options(quietly) {
  // Save the global var 'settings' to storage
  storage.set(settings, function() {
    if (chrome.runtime.lastError) {
      console.log('Error: ' + chrome.runtime.lastError.message);
    } else if (!quietly) {
      show_status('Option Saved', 'success');
    }
  });
}

function clear_options_in_storage(quietly) {
  // call this function to clear the settings stored in
  // storage
  storage.clear(function() {
    if (chrome.runtime.lastError) {
      console.log('Error: ' + chrome.runtime.lastError.message);
    } else if (!quietly) {
      show_status('Option Cleared', 'success');
    }
  });
}

// helper functions
function show_status(message, type) { $('#status').text(message) .attr('class', type) .slideDown(100) .delay(1500) .slideUp(100);  }
function arr_same(arr1, arr2){ return (arr1.toString() == arr2.toString()); }
function contains_site(list, domain){
  for(var i=0; i < list.length; i++){
    if(list[i].domain == domain){
      return true;
    }
  }
  return false;
}



