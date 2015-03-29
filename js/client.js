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
    return false;
  }
});

function SetupZoom(){
  panzoom = $('#panzoom').panzoom();
  panzoom.parent().unbind('mousewheel.focal');
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
    return false;
  },

  loadBook: function(path, booktype, whichpage){
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
        if(typeof(whichpage)!=="undefined")
          self.curpage=whichpage;
        else
          self.curpage=self.minpage;
        self.booktype="images";
        self.pages='data/'+self.path+'/'+self.prefix;
        self.padlen=self.maxpage.toString().length;
        self.contents.loadContents(self);
        self.loadPage(self.curpage);
      }).fail(function(){console.log('Failed to get book metadata.');});
    } else if (this.booktype=="text") {
      this.imagepage.hide();
      this.textpage.show();
      $.getJSON('data/lyrics_'+self.path+'.json', function(data){
        self.pages=data;
        self.booktype="text";
        self.loaded=true;
        if(typeof(whichpage)!=="undefined")
          self.curpage=whichpage;
        else
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
    app_router.navigate("books/"+self.path+"/"+this.curpage);

    if(this.booktype=="images"){
      this.spinner.show();
      var newpage = new Image();
      newpage.src = this.pages+pad(page,this.padlen)+this.suffix;
      $(newpage).load(function() { $('#curpage').attr('src',this.src); self.spinner.hide(); });
      SetupZoom();
    } else if (this.booktype=="text") {
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
    this.bookview=new BookView();

    $('#booklist-btn').click(this.show.bind(self));

    vent.on('loadbook', this.loadBook.bind(self));

    $.getJSON("data/books.json", function( data ) {
      $.each(data, function(i,book){
        self.$el.append('<div class="btn"><a class="bookchoice" href="#" data-type="'+book.type+'" data-path="'+book.path+'">'+book.name+'</a></div>');
      });
    }).fail(function(){console.log('Error loading file');})
    .done(function(){
      app_router=new AppRouter();
      Backbone.history.start();
    });
  },

  events: {
    "click .bookchoice": "bookchoice",
  },

  loadBook: function(bookpath,whichpage){
    var self=this;
    $('.bookchoice').each(function(i,obj){
      if($(obj).data('path')==bookpath){
        self.bookview.loadBook($(obj).data('path'), $(obj).data('type'),parseInt(whichpage));
        self.$el.hide();
        vent.trigger('showbook');
        return false;
      }
    });
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

var AppRouter = Backbone.Router.extend({

  routes: {
    "books/:book/:page": "loadBookPage",
  },

  loadBookPage: function(book, page) {
    vent.trigger('loadbook',book,page);
  }
});





var VizView = Backbone.View.extend({
  el: '#vizview',

  initialize: function(){},

  display: function(data){
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var parseDate  = d3.time.format("%Y-%m-%d").parse;
    var parseTime  = d3.time.format("%H:%M").parse;
    var bisectDate = d3.bisector(function(d) { return d.date; }).left;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var area = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(function(d) { return y(d.low); })
        .y1(function(d) { return y(d.high); });

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d3.csv("zbob", function(error, data) {
      data.forEach(function(d) {
        d.date = parseDate(d.Date);
        console.log(parseTime(d.Wake.trim()));
        d.low      = parseTime(d.Wake.trim());
        d.low      = d.low.getHours()+d.low.getMinutes()/60.0;
        d.high     = parseTime(d.FirstAttempt.trim());
        d.high     = d.high.getHours()+d.high.getMinutes()/60.0;
        if(d.high<18)
          d.high+=24;
        d.duration = d.high-d.low
        console.log(d);
      });

      x.domain(d3.extent(data, function(d) { return d.date; }));
      y.domain([d3.min(data, function(d) { return d.low; }), d3.max(data, function(d) { return d.high; })]);

      svg.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("d", area)
          .on("mouseover", function() { focus.style("display", null  ); dateline.style("display",null  ); })
          .on("mouseout",  function() { focus.style("display", "none"); dateline.style("display","none"); })
          .on("mousemove", mousemove);

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Hour of Day");

      var focus = svg.append("g")
          .attr("class", "focus")
          .style("display", "none");

      focus.append("circle")
          .attr("r", 4.5);

      focus.append("text")
          .attr("x", 9)
          .attr("dy", ".35em")
          .attr("class", "times");
      focus.append("text")
          .attr("x", 9)
          .attr("dy", "1.35em")
          .attr("class", "duration");

      var dateline = svg.append('line')
                        .attr({
                            'x1': 0,
                            'y1': 8,
                            'x2': 0,
                            'y2': 20
                        })
                        .attr("stroke", "black")
                        .attr('class', 'verticalLine');

      function mousemove() {
          var x0 = x.invert(d3.mouse(this)[0]),
              i = bisectDate(data, x0, 1),
              d0 = data[i - 1],
              d1 = data[i],
              d = x0 - d0.date > d1.date - x0 ? d1 : d0;
          focus.attr("transform", "translate(" + x(d.date) + "," + y(18) + ")");
          focus.select(".times").text(d.Wake + " - " + d.FirstAttempt);
          focus.select(".duration").text(d.duration.toFixed(2) + "hrs");
          dateline.attr({
            x1:x(d.date),
            x2:x(d.date),
            y1:y(d.low),
            y2:y(d.high)
          });
        }
    });
  }
});


var booklist = new BookListView();






//  $("#curpage").draggable({containment: "#viewport", scroll: false});
/*  $("#curpage").on("drag", function(){
      $(this).css("background-position", "-" + $(this).position().left + "px -" + $(this).position().top + "px")
  });*/
