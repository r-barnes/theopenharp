var book={};
var panzoom;

function pad(num, size){ return ('000000000' + num).substr(-size); }

function LoadBook(path){
  $.getJSON('data/'+path+'/book.json', function(data){
    book=data;
    book.curpage=1;
    book.pages='data/'+path+'/'+data.prefix;
    book.padlen=book.maxpage.toString().length;
    LoadPage(book.curpage);
  }).fail(function(){console.log('Failed to get book metadata.');});
}

function SetupZoom(){
  panzoom = $('#panzoom').panzoom();
  panzoom.parent().on('mousewheel.focal', function( e ) {
    e.preventDefault();
    var delta = e.delta || e.originalEvent.wheelDelta;
    var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
    panzoom.panzoom('zoom', zoomOut, {
      increment: 0.1,
      focal: e
    });
  });
}

function LoadPage(page){
  book.curpage=page;
  $('#curpage').attr('src',book.pages+pad(page,book.padlen)+book.suffix);
  SetupZoom();
}

function FlipPage(inc){
  if(!book.name) return;
  if(book.curpage+inc>0 && book.curpage+inc<=book.maxpage)
    LoadPage(book.curpage+inc);
  return false;
}

$(document).ready(function(){
  var dropdown=$('#booklist');
  $.getJSON("data/books.json", function( data ) {
    $.each(data, function(i,book){
      dropdown.append('<li><a class="bookchoice" href="#" data-path="'+book.path+'">'+book.name+'</a></li>');
    });

    $('.bookchoice').click(function(){
      LoadBook($(this).data('path'));
    });
  }).fail(function(){console.log('Error loading file');});


  $('#flipleft') .click(function(){ FlipPage(-1); });
  $('#flipright').click(function(){ FlipPage( 1); });
  $(document).bind('keydown', function(event){
    if(!book.name) return;

    var img = $('#curpage');
    var key = event.which;
    console.log(key);
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
    } else if (key==40) { //Down key
      $('#panzoom').panzoom("pan", 0, -30, { relative: true });
    } else if (key==38) { //Up key
      $('#panzoom').panzoom("pan", 0, 30, { relative: true });
    } else if (key==37) { //Left key
      $('#panzoom').panzoom("pan", 30, 0, { relative: true });
    } else if (key==39) { //Right key
      $('#panzoom').panzoom("pan", -30, 0, { relative: true });
    }
  })

//  $("#curpage").draggable({containment: "#viewport", scroll: false});
/*  $("#curpage").on("drag", function(){
      $(this).css("background-position", "-" + $(this).position().left + "px -" + $(this).position().top + "px")
  });*/

});
