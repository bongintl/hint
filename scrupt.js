var colors = ['#2D64FD','#05ffbe'];

function nextColor(color) {
	var current = colors.indexOf(color);

	if (current + 1 === colors.length) {
		return colors[0];
	} else {
		return colors[current + 1];
	}
}

// getpoints from the bloody paths
function getPoints( path ) {
    
    var points = path.getPathData({normalize: true});
    
    points = points.filter(function(point){

        return point.type !== 'Z';
        
    }).map(function( point ){
        
        if(point.type === 'M'){
            
            return { x: point.values[0], y: point.values[1] }
            
        } else {
            
            return { x: point.values[4], y: point.values[5] };
            
        }
        
    })
    
    return points;
    
}

var GRAVITY = 0.0001;

var PULL = 0.00001;

var AIR_RESISTANCE = 0.99

var gather = false;


$.get('./h.svg', function(response){
    
    var $svg = $(response).children();
    
    var svgWidth = Number( $svg.attr('width').slice(0, -2) );
    var svgHeight = Number( $svg.attr('height').slice(0, -2) );

    var $shapes = $svg.children();
    
    var data = $shapes.toArray().map(function( shape ){
        
        var $shape = $( shape );
        
        var cx, cy, r;
        
        if( $shape.is('circle') ) {
            
            cx = Number( $shape.attr('cx') );
            cy = Number( $shape.attr('cy') );
            r = Number( $shape.attr('r') );
            
        } else {
            
            var points = getPoints( shape );
            
            var min = {x: Infinity, y: Infinity};
            var max = {x: -Infinity, y: -Infinity};
            
            points.forEach(function( point ){
                
                min.x = Math.min( min.x, point.x );
                min.y = Math.min( min.y, point.y );
                
                max.x = Math.max( max.x, point.x );
                max.y = Math.max( max.y, point.y ); 
                
            })
            
            
            r = (max.x - min.x) / 2;
            cx = min.x + r;
            cy = min.y + r;
            
        }
        
        return {
            cx: (cx + window.innerWidth / 2) - svgWidth / 2,
            cy: (cy + window.innerHeight/ 2) - svgHeight / 2,
            r: r,
            fill: $shape.attr('fill')
        }
        
    });
    
    Physics( function(world){
        
        var width = window.innerWidth;
        var height = window.innerHeight;
        var bounds = Physics.aabb(0, 0, width, height);

		var renderer = Physics.renderer('canvas', {
			el: 'viewport',
			width: width,
			height: height,
			meta: false
		});
		
		world.add( renderer );
		
		world.add( Physics.behavior('body-collision-detection') );
		world.add( Physics.behavior('sweep-prune') );
		world.add( Physics.behavior('body-impulse-response') );
// 		world.add( Physics.behavior('edge-collision-detection', {
// 		    aabb: bounds
// 		} ));
		
		world.on('collisions:detected', function( data ){

			for ( i = 0; i < data.collisions.length; i++) {

		    	var bodyA = data.collisions[i].bodyA;
		    	var bodyB = data.collisions[i].bodyB;
                
                if (data.collisions[i].overlap < 0.115 || bodyA.treatment == "static" || bodyB.treatment == "static"){
                    continue;
                }
                
		    	bodyA.view = undefined;
		    	bodyB.view = undefined;

		    	bodyA.options({ styles: { fillStyle: nextColor(bodyA.styles.fillStyle) }}, true);
		    	bodyB.options({ styles: { fillStyle: nextColor(bodyB.styles.fillStyle) }}, true);

			}
				
		});
		
		
		var ceiling = Physics.body('rectangle', {
		   x: width / 2,
		   y: -52,
		   width: width, 
		   height: 100,
		   treatment: "static"
		});
		
		var floor = Physics.body('rectangle', {
		   x: width / 2,
		   y: height + 52,
		   width: width, 
		   height: 100,
		   treatment: "static"
		});
		
		var rightWall = Physics.body('rectangle', {
		   x: width + 52,
		   y: height / 2,
		   width: 100, 
		   height: height,
		   treatment: "static"
		});
		
		var leftWall = Physics.body('rectangle', {
		   x: -52,
		   y: height / 2,
		   width: 100, 
		   height: height,
		   treatment: "static"
		});
		
		
		world.add([ceiling, floor, rightWall, leftWall]);
		
		
		var bodies = data.map( function(circle){
		    
		    var body = Physics.body('circle', {
		        x: circle.cx,
		        y: circle.cy,
		        radius: circle.r,
		        restitution: 1,
		        styles: {
		            fillStyle: circle.fill
		        }
		    });
		    
		    body.origin = new Physics.vector( circle.cx, circle.cy );
		    
		    body.gravity = new Physics.vector();
		    
		    if( Math.random() > .5 ) {
		        
                body.gravity.x = Math.random() > .5 ? -GRAVITY : GRAVITY
		        
		    } else {
		        
		        body.gravity.y = Math.random() > .5 ? -GRAVITY : GRAVITY
		        
		    }
		    
		    return body;
		    
		})
		
		world.add( bodies );
		
		world.on('step', function(){
		    
		    bodies.forEach(function(body){
		        
		        if( gather ) {
		            
	                var acceleration = body.origin.clone().sub( body.state.pos.x, body.state.pos.y ).mult( PULL );
	                
	                body.accelerate( acceleration );
	                
	                body.state.vel.mult( AIR_RESISTANCE );
	                
	                //body.restitition = body.restitition - 0.999999999999999999999;

		        } else {
		        
		            body.accelerate( body.gravity );
		        
		        }
		       
		    })
		    
		    world.render();
		})
		
        Physics.util.ticker.on(function( time, dt ){
            world.step( time );
        });
        
        Physics.util.ticker.start();
        
    });
    
})

window.addEventListener('click', function(){
    
    gather = !gather;
    
})