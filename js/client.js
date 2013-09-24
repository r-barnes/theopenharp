var book={};
var panzoom;

function pad(num, size){ return ('000000000' + num).substr(-size); }

function SetupDropdown(){
  if(!book.loaded) return;

  var contents=$('#contents');

  contents.empty();

  if(book.type=="images"){
    for(var i=book.minpage;i<=book.maxpage;++i)
      contents.append('<div class="btn"><a class="content" href="#" data-page="'+i+'">'+i+'</a></div>');
  } else if (book.type=="text") {
    for(var i=book.minpage;i<=book.maxpage;++i)
      contents.append('<div class="btn"><a class="content" href="#" data-page="'+i+'">'+book.pages[i].number+" "+book.pages[i].name+'</a></div>');
  }

  $('#contents a').click(function(){
    if(!book.loaded) return;
    $('#contents').hide();
    if(book.type=="images")
      $('#parent').show();
    else if (book.type=="text")
      $('#textpage').show();
    LoadPage(parseInt($(this).data('page')));
  });
}

function LoadBook(path, type){
  if(type=="images"){
    $.getJSON('data/'+path+'/book.json', function(data){
      book=data;
      book.loaded=true;
      book.curpage=book.minpage;
      book.type="images";
      book.pages='data/'+path+'/'+data.prefix;
      book.padlen=book.maxpage.toString().length;
      $('#textpage').hide();
      $('#bookview').show();
      $('#parent').show();
      $('#contents-btn').show();
      SetupDropdown();
      LoadPage(book.curpage);
    }).fail(function(){console.log('Failed to get book metadata.');});
  } else if (type=="text") {
    $.getJSON('data/lyrics_'+path+'.json', function(data){
      book.pages=data;
      book.type="text";
      book.loaded=true;
      book.curpage=0;
      book.minpage=0;
      book.maxpage=data.length-1;
      $('#parent').hide();
      $('#bookview').show();
      $('#textpage').show();
      $('#contents-btn').show();
      SetupDropdown();
      LoadPage(book.curpage);
    }).fail(function(){console.log('Failed to get book text.');});
  }
}

function SetupZoom(){
  panzoom = $('#panzoom').panzoom();
  panzoom.parent().on('mousewheel.focal', function( e ) {
    e.preventDefault();
    var delta = e.delta || e.originalEvent.wheelDelta;
    var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
    panzoom.panzoom('zoom', zoomOut, {
      increment: 0.05,
      focal: e
    });
  });
}

function LoadPage(page){
  book.curpage=page;
  if(book.type=="images"){
    $('#curpage').attr('src',book.pages+pad(page,book.padlen)+book.suffix);
    SetupZoom();
  } else if (book.type=="text") {
    $('#textpage .name').html(book.pages[book.curpage].name);
    $('#textpage .number').html(book.pages[book.curpage].number);
    $('.words').html(book.pages[book.curpage].words);
    $('.tune').html(book.pages[book.curpage].tune);
    $('#textpage .lyrics').html(book.pages[book.curpage].lyrics);
  }
  $('#pagedrop').val(book.curpage);
  console.log('Page loaded.');
}

function FlipPage(inc){
  if(!book.loaded) return;
  if(book.curpage+inc>=book.minpage && book.curpage+inc<=book.maxpage)
    LoadPage(book.curpage+inc);
  return false;
}

$(document).ready(function(){
  var booklist=$('#booklist');
  $.getJSON("data/books.json", function( data ) {
    $.each(data, function(i,book){
      booklist.append('<div class="btn"><a class="bookchoice" href="#" data-type="'+book.type+'" data-path="'+book.path+'">'+book.name+'</a></div>');
    });

    $('.bookchoice').click(function(){
      LoadBook($(this).data('path'), $(this).data('type'));
      $('#booklist').hide();
    });
  }).fail(function(){console.log('Error loading file');});

  $('#booklist-btn').click(function(){
    $('#booklist').show();
    $('#contents-btn').hide();
    $('#contents').hide();
    $('#bookview').hide();
  });

  $('#contents-btn').click(function(){
    $('#contents').toggle();
    $('#bookview').toggle();
  });

  $('#flipleft') .click(function(){ FlipPage(-1); });
  $('#flipright').click(function(){ FlipPage( 1); });

  $(document).bind('keydown', function(event){
    if(!book.loaded) return;

    var img = $('#curpage');
    var key = event.which;
    //console.log(key);
    if(key == 33){        //Page Up
      FlipPage(-1);
      event.stopPropagation();
      return false;
    } else if (key==34) { //Page Down
      FlipPage( 1);
      event.stopPropagation();
      return false;
//    } else if (key==187) { //Plus Key and Equals key
//    } else if (key==189) { //Minus key
    } else if (key==40 && book.type=="images") { //Down key
      $('#panzoom').panzoom("pan", 0, -30, { relative: true });
    } else if (key==38 && book.type=="images") { //Up key
      $('#panzoom').panzoom("pan", 0, 30, { relative: true });
    } else if (key==37 && book.type=="images") { //Left key
      $('#panzoom').panzoom("pan", 30, 0, { relative: true });
    } else if (key==39 && book.type=="images") { //Right key
      $('#panzoom').panzoom("pan", -30, 0, { relative: true });
    }
  })

//  $("#curpage").draggable({containment: "#viewport", scroll: false});
/*  $("#curpage").on("drag", function(){
      $(this).css("background-position", "-" + $(this).position().left + "px -" + $(this).position().top + "px")
  });*/

});
