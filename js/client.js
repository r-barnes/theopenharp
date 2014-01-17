var panzoom;

function pad(num, size){ return ('000000000' + num).substr(-size); }

var vent = {}; // or App.vent depending how you want to do this
_.extend(vent, Backbone.Events);

var ContentsView = Backbone.View.extend({
  el: '#contents',

  imageitem: _.template('<div class="btn"><a class="content" href="#" data-page="<%= i %>"><%= i %></a></div>'),

  textitem:  _.template('<div class="btn"><a class="content" href="#" data-page="<%= i %>"><%= songnumber %> <%= songname %></a></div>'),

  events: {
    "click a": "chosePage"
  },

  loadContents: function(book){
    this.$el.empty();

    if(book.booktype=="images"){
      for(var i=book.minpage;i<=book.maxpage;++i)
        this.$el.append(this.imageitem({i:i}));
    } else if (book.booktype=="text") {
      for(var i=book.minpage;i<=book.maxpage;++i)
        this.$el.append(this.textitem({i:i, songnumber: book.pages[i].number, songname:book.pages[i].name}));
    }
  },

  chosePage: function(ev){
    this.$el.hide();
    vent.trigger('showbook');
    vent.trigger('loadpage',$(ev.target).data('page'));
  }
});

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

var BookView = Backbone.View.extend({
  el: '#bookview',

  initialize: function(){
    vent.on('showbook', this.showBook.bind(this));
    vent.on('loadpage', this.loadPage.bind(this));
    this.imagepage = $('#imagepage');
    this.textpage  = $('#textpage');
    this.spinner   = $('#spinner');
    this.contents  = new ContentsView();
  },

  loadBook: function(path, booktype){
    var self=this;

    self.path=path;
    self.booktype=booktype;

    if(this.booktype=="images"){
      this.textpage.hide();
      this.imagepage.show();
      $.getJSON('data/'+self.path+'/book.json', function(data){
        _.extend(self, data);
        self.info=data;
        self.loaded=true;
        self.curpage=self.minpage;
        self.booktype="images";
        self.pages='data/'+self.path+'/'+self.prefix;
        self.padlen=self.maxpage.toString().length;
        self.contents.loadContents(self);
        self.loadPage(self.curpage);
      }).fail(function(){console.log('Failed to get book metadata.');});
    } else if (this.booktype=="text") {
      console.log('load text book');
      this.imagepage.hide();
      this.textpage.show();
      $.getJSON('data/lyrics_'+self.path+'.json', function(data){
        console.log(data);
        self.pages=data;
        self.booktype="text";
        self.loaded=true;
        self.curpage=0;
        self.minpage=0;
        self.maxpage=self.pages.length-1;
        self.contents.loadContents(self);
        self.loadPage(self.curpage);
      }).fail(function(){console.log('Failed to get book text.');});
    }
    $('#contents-btn').show();
  },

  events: {
    "click #flipleft":  "flipPage",
    "click #flipright": "flipPage",
  },

  flipPage: function(ev){
    if(!this.loaded) return;
    var inc=$(ev.target).data('inc');
    if(this.curpage+inc>=this.minpage && this.curpage+inc<=this.maxpage)
      this.loadPage(this.curpage+inc);
    return false;
  },

  loadPage: function(page){
    var self=this;
    this.curpage=page;

    if(this.booktype=="images"){
      this.spinner.show();
      var newpage = new Image();
      newpage.src = this.pages+pad(page,this.padlen)+this.suffix;
      $(newpage).load(function() { $('#curpage').attr('src',this.src); self.spinner.hide(); });
      SetupZoom();
    } else if (this.booktype=="text") {
      console.log('here');
      console.log(this.pages[this.curpage]);
      $('#textpage .name').html(this.pages[this.curpage].name);
      $('#textpage .number').html(this.pages[this.curpage].number);
      $('.words').html(this.pages[this.curpage].words);
      $('.tune').html(this.pages[this.curpage].tune);
      $('#textpage .lyrics').html(this.pages[this.curpage].lyrics);
      $('#textpage').show();
    }
    $('#pagedrop').val(this.curpage);
  },

  showBook: function(){
    this.$el.show();
  }
});


var BookListView = Backbone.View.extend({
  el: '#booklist',

  initialize: function(options){
    var self=this;
    this.bookview=options.bookview;

    $.getJSON("data/books.json", function( data ) {
      $.each(data, function(i,book){
        self.$el.append('<div class="btn"><a class="bookchoice" href="#" data-type="'+book.type+'" data-path="'+book.path+'">'+book.name+'</a></div>');
      });
    }).fail(function(){console.log('Error loading file');});
  },

  events: {
    "click .bookchoice": "bookchoice",
  },

  bookchoice: function(e){
    var item=e.currentTarget;
    this.bookview.loadBook($(item).data('path'), $(item).data('type'));
    this.$el.hide();
    vent.trigger('showbook');
  }
});


$(document).ready(function(){
  var booklist=new BookListView({bookview:new BookView()});

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

  /*$(document).bind('keydown', function(event){
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
*/
//  $("#curpage").draggable({containment: "#viewport", scroll: false});
/*  $("#curpage").on("drag", function(){
      $(this).css("background-position", "-" + $(this).position().left + "px -" + $(this).position().top + "px")
  });*/

});
