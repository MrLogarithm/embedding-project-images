var minFreq = 1;
var imageResize = 1;
var fontResize = 1;
var fontSize = 12;
var globaldata;
function resize() {
  imageResize = document.getElementById('size').value;
  fontResize =  document.getElementById('labelsize').value;
  minFreq    =  parseInt(document.getElementById('minfreq').value);
  updateChart();
}

function cosinesim(A,B){
    var dotproduct=0;
    var mA=0;
    var mB=0;
    for(i = 0; i < A.length; i++){
        dotproduct += (A[i] * B[i]);
        mA += (A[i]*A[i]);
        mB += (B[i]*B[i]);
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    var similarity = (dotproduct)/((mA)*(mB))
    return similarity;
    //return dotproduct;
}

function getOrigEmbedding(datum) {
  return (datum.orig.split(" ").map(function(x){return parseFloat(x);}));
}

/*
 * TODO make this use the full original embedding
 */
function neighbors(datum,n){
  var near = [];
  var furthest = 10;
  var data = globaldata.filter(function(d){return d.count >= minFreq});
  for (row of data) {
    //var sim = cosinesim([row.x,row.y],[datum.x,datum.y]);
    var sim = cosinesim( getOrigEmbedding(row), getOrigEmbedding(datum) );
    if ((near.length < n) || (sim > furthest)) {
      near.push([row.name,sim]);
      //console.log(near);
      near = near.sort(function(a,b){return a[1]>b[1]});
      if (near.length > n) {
        //console.log('prune',near);
        near = near.slice(1,);
        //console.log('pruned',near);
      }
      furthest=near[0][1];
    }
  }
  return near.sort(function(a,b){return a[1]<b[1];});
}



var drawn = false;
// Set embedding plot canvas size:
const marginE = {top: 0, right: 0, bottom: 0, left: 0},
    widthE = 0.9*window.innerWidth - marginE.left - marginE.right,
    heightE = 0.9*window.innerHeight - marginE.top - marginE.bottom;

// Setup axes:
var xValue = function(d) { return d.x;}, // data -> value
    xScale = d3.scaleLinear().range([0, widthE]), // value -> display
    xAxis = d3.axisBottom().scale(xScale);
var yValue = function(d) { return d.y;}, // data -> value
    yScale = d3.scaleLinear().range([ heightE, 0]), // value -> display
    yAxis = d3.axisLeft().scale(yScale);

// Frequency controls the word size:
var freqValue = function(d) {return 1;},
    freqScale = d3.scaleLinear().domain([0,1]).range([1, 25]),
    freqMap = function(d) {return imageResize*freqScale(freqValue(d))/Math.sqrt(scale)};

// Record the zoom level:
var scale = 1;

// Add the graph canvas to the body of the webpage:
var svg = d3.select('#embedding_svg')
    .attr("width", widthE + marginE.left + marginE.right)
    .attr("height", heightE + marginE.top + marginE.bottom)
    .attr("viewBox", [0, 0, widthE + marginE.left + marginE.right, heightE + marginE.top + marginE.bottom])
    .append("g")
    .attr("transform", "translate(" + marginE.left + "," + marginE.top + ")");

// Add the wordembedtip area to the webpage
// wordembedtip is a tooltip to show information
// about a sign when hovered over that sign
var wordembedtip = d3.select("body").append("div")
    .attr("class", "wordembedtip")
    .style("opacity", 0);

function drawFirstTime() {
  drawn = true;
d3.csv(plotdata, function(error, data) {
  globaldata = data;
  data = globaldata.filter(function(d){return d.count >= minFreq;});
  var w = 30;
  var h = 30;
  // don't want dots overlapping the axis lines, so add in buffer to data domain
  xScale = d3.scaleLinear().domain([d3.min(data, xValue), d3.max(data, xValue)]).range([(widthE/2)-w,  w+(widthE/2)]);//.nice(); // value -> display
  yScale = d3.scaleLinear().domain([d3.min(data, yValue), d3.max(data, yValue)]).range([(heightE/2)-w, w+(heightE/2)]).nice(); // value -> display
  //yScale.domain([d3.min(data, yValue)-4, d3.max(data, yValue)+3]).nice();
  //freqScale.domain([d3.min(data, freqValue) , d3.max(data, freqValue)] ).nice();

  // Draw dots
  var dot = svg.selectAll(".dot")
      .data(data);

  // Add sign images overtop the dots:
  var texts = dot.enter()
      .append('text')
      .classed('scalable', true)
      .attr('x', function(d) { return xScale(d.x) + freqMap(d)/2;})
      .attr('y', function(d) { return yScale(d.y);})
      .style('font-size', function(d){return (fontResize*fontSize/scale)+"pt";})
      .text(function(d){return d.name;})
  ;
  var image = dot.enter()
      .append('image')
      .classed("embed_img",true)
      .classed("scalable",true)
      .attr('x', function(d) { return xScale(d.x) + freqMap(d)/2;})
      .attr('y', function(d) { return yScale(d.y);})
      .attr('width',  freqMap)
      //.attr('height', freqMap)
      .attr("href",function(d){return sign2img["images/"+d.name+".png"];});

  function onMouseOver(d) {
	// Reveal tooltip:
        wordembedtip.transition()
             .duration(200)
             .style("opacity", 1);

	// Get nearest neighbors in embedding space
	var neighborlist = neighbors(d,10);
	// Sort neighborlist in descending similarity
	neighborlist.sort((a, b){return a[1] - b[1]})
	// highlight 
	d3.selectAll('.embed_img').classed('hover', function(d){return neighborlist.map(function(x){return x[0];}).includes(d.name);});
	d3.selectAll('text').classed('hover', function(d){return neighborlist.map(function(x){return x[0];}).includes(d.name);});
        // Add information about hovered element:
        wordembedtip.html("<b>"+d.name + "</b><br/> Neighbors:<table><tbody><tr><td></td><td>Sign</td><td>Similarity</td></tr>" + neighborlist.map(function(x){return "<tr><td><img style='float:left;max-height:40px;max-width:40px;' src='"+sign2img['images/'+x[0]+'.png']+"'></td><td>"+x[0]+"</td><td>"+((Math.floor(x[1]*100))/100)+"</td></tr>";}).join('')+"</tbody></table>")
        //+"<br/><img src='pngs/PE_mainforms/"+d.name+".png' />")
             .style("left", (d3.event.pageX + 20) + "px")
             .style("top", (d3.event.pageY + 0) + "px")
             .style("z-index", "5");
      }
  function onMouseOut(d) {
	d3.selectAll('.embed_img').classed('hover', false);
	d3.selectAll('text').classed('hover', false);
        wordembedtip.transition()
             .duration(500)
             .style("opacity", 0);
        ;
      }
  // Set image hover event:
  var imageEvent = image/*image*/
      .on("mouseover", onMouseOver )
      // Hide tooltip on mouseout
      .on("mouseout", onMouseOut );
  var txtEvent = texts
      .on("mouseover", onMouseOver )
      // Hide tooltip on mouseout
      .on("mouseout", onMouseOut );

  // Make whole background zoomable/draggable:
  var zoom_handler = d3.zoom()
    	.extent([[0, 0], [widthE, heightE]])
    	.scaleExtent([0.5, 40])
      .on("zoom", zoomed);
  var drag = d3.drag()
      .subject(function (d) { return d; })
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  var zoomable = svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", widthE)
      .attr("height", heightE)
      .style("fill", "white")
      .lower();
  svg.call(zoom_handler)
      .call(drag);

  function zoomed() {
    scale = d3.event.transform.k;
    // rescale images on zoom to make the dense clusters navigable when zoomed in
    // not quite semantic zoom but also not straight geometric zoom
    d3.selectAll(".scalable").attr("transform", d3.event.transform);
    d3.selectAll("text.scalable").style("font-size", function(d){return (fontResize*fontSize/scale)+"pt";});
    d3.selectAll(".embed_img").attr("width", function(d){return freqMap(d);});
    };

  function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this).classed("dragging", true);
  }

  function dragged(d) {
      d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
  }

  function dragended(d) {
      d3.select(this).classed("dragging", false);
  }

  function slided(d) {
      zoom_handler.scaleTo(zoomable.transition().duration(100), d3.select(this).property("value"));
  };

});
}

// A function that update the embedding method to the plot
function updateChart() {
  var csv_file = plotdata;
  // Get the data again
  d3.csv(csv_file, function(error, data) {
    globaldata = data;
    data = globaldata.filter(function(d){return d.count >= minFreq;});
    // // draw dots
    var dot = svg.selectAll(".dot")
        .data(data);
    xScale.domain([d3.min(data, xValue)-2.5, d3.max(data, xValue)+1]).nice();
    yScale.domain([d3.min(data, yValue)-4, d3.max(data, yValue)+3]).nice();
    //freqScale.domain([d3.min(data, freqValue) , d3.max(data, freqValue)] ).nice();

    svg.selectAll('.embed_img').attr('href','');
    svg.selectAll('text').text('');
    texts = svg.selectAll('text')
        .data(data)
        //.transition()
        //.duration(1000)
        .attr('x', function(d) { return xScale(d.x) + freqMap(d)/2;})
        .attr('y', function(d) { return yScale(d.y);})
        .attr('width',  freqMap)
        //.attr('height', freqMap)
      .style('font-size', function(d){return (fontResize*fontSize/scale)+"pt";})
      .text(function(d){return d.name;})
    ;
    image = svg.selectAll('.embed_img')
        .data(data)
        //.transition()
        //.duration(1000)
        .attr('x', function(d) { return xScale(d.x) + freqMap(d)/2;})
        .attr('y', function(d) { return yScale(d.y);})
        .attr('width',  freqMap)
        //.attr('height', freqMap)
        .attr("href",function(d){return sign2img["images/"+d.name+".png"];})
    ;

  });
}

