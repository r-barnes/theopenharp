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
    var self=this;
    vent.on('showbook', function(){self.$el.show();});
    vent.on('hidebook', function(){self.$el.hide();});
    vent.on('hidebookview', this.hidebookview.bind(self));
    vent.on('loadpage', this.loadPage.bind(this));

    $('#contents-btn').click(this.toggleContents.bind(self));

    this.imagepage  = $('#imagepage');
    this.textpage   = $('#textpage');
    this.spinner    = $('#spinner');
    this.contents   = new ContentsView();
    this.pagenumber = $('#pagenumber');
    $(document).bind('keydown', this.keydown.bind(this));
  },

  toggleContents: function(){
    this.$el.toggle();
    this.contents.$el.toggle();
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
    "click #flipleft":  "flipLeft",
    "click #flipright": "flipRight",
  },

  flipLeft:  function(){ this.flipPage(-1); },
  flipRight: function(){ this.flipPage( 1); },

  flipPage: function(inc){
    if(this.curpage+inc>=this.minpage && this.curpage+inc<=this.maxpage)
      this.loadPage(this.curpage+inc);
    return false;
  },

  loadPage: function(page){
    var self=this;
    this.curpage=page;

    this.pagenumber.html(this.curpage);

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

  keydown: function(e){
    var key = e.which;
    if(key == 33){        //Page Up
      this.flipPage(-1);
      e.stopPropagation();
      return false;
    } else if (key==34) { //Page Down
      this.flipPage( 1);
      e.stopPropagation();
      return false;
//    } else if (key==187) { //Plus Key and Equals key
//    } else if (key==189) { //Minus key
    } else if (this.booktype=="images") {
      if (key==40) { //Down key
        $('#panzoom').panzoom("pan", 0, -30, { relative: true });
      } else if (key==38) { //Up key
        $('#panzoom').panzoom("pan", 0, 30, { relative: true });
      } else if (key==37) { //Left key
        $('#panzoom').panzoom("pan", 30, 0, { relative: true });
      } else if (key==39) { //Right key
        $('#panzoom').panzoom("pan", -30, 0, { relative: true });
      }
    }
  },

  hidebookview: function(){
    this.contents.$el.hide();
    $('#contents-btn').hide();
    this.$el.hide();
  }
});


var BookListView = Backbone.View.extend({
  el: '#booklist',

  initialize: function(options){
    var self=this;
    this.bookview=options.bookview;

    $('#booklist-btn').click(this.show.bind(self));

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
  },

  show: function(){
    vent.trigger('hidebookview');
    this.$el.show();
  }
});


$(document).ready(function(){
  var booklist=new BookListView({bookview:new BookView()});
});

//  $("#curpage").draggable({containment: "#viewport", scroll: false});
/*  $("#curpage").on("drag", function(){
      $(this).css("background-position", "-" + $(this).position().left + "px -" + $(this).position().top + "px")
  });*/
