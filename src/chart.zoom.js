/*jslint browser:true, devel:true, white:true, vars:true */
/*global require*/

// Get the chart variable
var Chart = require('chart.js');
Chart = typeof(Chart) === 'function' ? Chart : window.Chart;

if (!Chart.helpers.isNullOrUndef) {
    Chart.helpers.isNullOrUndef = function (v) {
    	return typeof v === 'undefined' || v === null;
	};
}

var helpers = Chart.helpers;

// Take the zoom namespace of Chart
var zoomNS = Chart.Zoom = Chart.Zoom || {};

// Where we store functions to handle different scale types
var zoomFunctions = zoomNS.zoomFunctions = zoomNS.zoomFunctions || {};

// Default options if none are provided
var defaultOptions = zoomNS.defaults = {
	zoom: {
		enabled: true,
		mode: 'xy',
		sensitivity: 3
	}
};

function directionEnabled(mode, dir) {
	if (mode === undefined) {
		return true;
	} else if (typeof mode === 'string') {
		return mode.indexOf(dir) !== -1;
	}

	return false;
}

function limiter(optionProp, minMax) {
    return function (zoomPanOptions, newVal) {
        if (zoomPanOptions.scaleAxes && zoomPanOptions[optionProp] &&
            !helpers.isNullOrUndef(zoomPanOptions[optionProp][zoomPanOptions.scaleAxes])) {

            var limitVal = zoomPanOptions[optionProp][zoomPanOptions.scaleAxes];

            if (minMax === 'min') {
                if (newVal < limitVal) {
                    newVal = limitVal;
                }
            } else if (minMax === 'max') {
                if (newVal > limitVal) {
                    newVal = limitVal;
                }
            }
        }
        return newVal;
    }
}

var rangeMaxLimiter = limiter('rangeMax', 'max');
var rangeMinLimiter = limiter('rangeMin', 'min');
var distanceMinLimiter = limiter('distanceMin', 'min');

function zoomNumericalScale(scale, newMin, newMax, zoomOptions) {
	var oldMax = scale.options.ticks.max;

	var proposedMin = rangeMinLimiter(zoomOptions, scale.getValueForPixel(newMin));
	var proposedMax = rangeMaxLimiter(zoomOptions, scale.getValueForPixel(newMax));
	var proposedDistance = proposedMax - proposedMin;

	var maxOffset = distanceMinLimiter(zoomOptions, proposedDistance);
	proposedMax = proposedMin + maxOffset;

	if (proposedMax > oldMax) {
        proposedMin = oldMax - maxOffset;
		proposedMax = oldMax;
	}

	scale.options.ticks.min = proposedMin;
	scale.options.ticks.max = proposedMax;

	if (typeof zoomOptions.callback === 'function') {
		zoomOptions.callback(proposedMin, proposedMax);
	}
}

function zoomScale(scale, newMin, newMax, zoomOptions) {
	var fn = zoomFunctions[scale.options.type];
	if (fn) {
		fn(scale, newMin, newMax, zoomOptions);
	}
}

function doZoom(chartInstance, newMin, newMax, whichAxes) {
	var zoomOptions = chartInstance.options.zoom;

	if (zoomOptions && helpers.getValueOrDefault(zoomOptions.enabled, defaultOptions.zoom.enabled)) {
		// Do the zoom here
		var zoomMode = helpers.getValueOrDefault(chartInstance.options.zoom.mode, defaultOptions.zoom.mode);

		// Which axe should be modified when figers were used.
		var _whichAxes;
		if (zoomMode == 'xy' && whichAxes !== undefined) {
			// based on fingers positions
			_whichAxes = whichAxes;
		} else {
			// no effect
			_whichAxes = 'xy';
		}

		helpers.each(chartInstance.scales, function(scale, id) {
			if (scale.isHorizontal() && directionEnabled(zoomMode, 'x') && directionEnabled(_whichAxes, 'x')) {
				zoomOptions.scaleAxes = "x";
				zoomScale(scale, newMin, newMax, zoomOptions);
			} else if (!scale.isHorizontal() && directionEnabled(zoomMode, 'y') && directionEnabled(_whichAxes, 'y')) {
				// Do Y zoom
				zoomOptions.scaleAxes = "y";
				zoomScale(scale, newMin, newMax, zoomOptions);
			}
		});

		chartInstance.update(0);
	}
}

function getYAxis(chartInstance) {
	var scales = chartInstance.scales;

	for (var scaleId in scales) {
		var scale = scales[scaleId];

		if (!scale.isHorizontal()) {
			return scale;
		}
	}
}

// Store these for later
zoomNS.zoomFunctions.linear = zoomNumericalScale;
// Globals for catergory zoom
zoomNS.zoomCumulativeDelta = 0;

// Chartjs Zoom Plugin
var zoomPlugin = {
	afterInit: function(chartInstance) {
		helpers.each(chartInstance.scales, function(scale) {
			scale.originalOptions = JSON.parse(JSON.stringify(scale.options));
		});

		chartInstance.resetZoom = function() {
			helpers.each(chartInstance.scales, function(scale, id) {
				var timeOptions = scale.options.time;
				var tickOptions = scale.options.ticks;

				if (timeOptions) {
					delete timeOptions.min;
					delete timeOptions.max;
				}

				if (tickOptions) {
					delete tickOptions.min;
					delete tickOptions.max;
				}

				scale.options = helpers.configMerge(scale.options, scale.originalOptions);
			});

			helpers.each(chartInstance.data.datasets, function(dataset, id) {
				dataset._meta = null;
			});

			chartInstance.update();
		};

	},
	beforeInit: function(chartInstance) {
		chartInstance.zoom = {};

		var node = chartInstance.zoom.node = chartInstance.chart.ctx.canvas;

		var options = chartInstance.options;
		if (!options.zoom || !options.zoom.enabled) {
			return;
		}
		if (options.zoom.drag) {
			// Only want to zoom horizontal axis
			options.zoom.mode = 'x';

			chartInstance.zoom._mouseDownHandler = function(event) {
				chartInstance.zoom._dragZoomStart = event;
			};
			node.addEventListener('mousedown', chartInstance.zoom._mouseDownHandler);

			chartInstance.zoom._mouseMoveHandler = function(event){
				if (chartInstance.zoom._dragZoomStart) {
					chartInstance.zoom._dragZoomEnd = event;
					chartInstance.update(0);
				}
			};
			node.addEventListener('mousemove', chartInstance.zoom._mouseMoveHandler);

			chartInstance.zoom._mouseUpHandler = function(event){
				if (chartInstance.zoom._dragZoomStart) {
					var beginPoint = chartInstance.zoom._dragZoomStart;
					var offsetX = beginPoint.target.getBoundingClientRect().left;
					var startX = Math.min(beginPoint.clientX, event.clientX) - offsetX;
					var endX = Math.max(beginPoint.clientX, event.clientX) - offsetX;
					var dragDistance = endX - startX;

					if (dragDistance > 0) {
						doZoom(chartInstance, startX, endX);
					}

					chartInstance.zoom._dragZoomStart = null;
					chartInstance.zoom._dragZoomEnd = null;
				}
			};
			node.addEventListener('mouseup', chartInstance.zoom._mouseUpHandler);
		}
	},

	beforeDatasetsDraw: function(chartInstance) {
		var ctx = chartInstance.chart.ctx;
		var chartArea = chartInstance.chartArea;
		ctx.save();
		ctx.beginPath();

		if (chartInstance.zoom._dragZoomEnd) {
			var yAxis = getYAxis(chartInstance);
			var beginPoint = chartInstance.zoom._dragZoomStart;
			var endPoint = chartInstance.zoom._dragZoomEnd;
			var offsetX = beginPoint.target.getBoundingClientRect().left;
			var startX = Math.min(beginPoint.clientX, endPoint.clientX) - offsetX;
			var endX = Math.max(beginPoint.clientX, endPoint.clientX) - offsetX;
			var rectWidth = endX - startX;


			ctx.fillStyle = 'rgba(225,225,225,0.3)';
			ctx.lineWidth = 5;
			ctx.fillRect(startX, yAxis.top, rectWidth, yAxis.bottom - yAxis.top);
		}

		ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
		ctx.clip();
	},

	afterDatasetsDraw: function(chartInstance) {
		chartInstance.chart.ctx.restore();
	},

	destroy: function(chartInstance) {
		if (chartInstance.zoom) {
			var options = chartInstance.options;
			var node = chartInstance.zoom.node;

			if (options.zoom && options.zoom.drag) {
				node.removeEventListener('mousedown', chartInstance.zoom._mouseDownHandler);
				node.removeEventListener('mousemove', chartInstance.zoom._mouseMoveHandler);
				node.removeEventListener('mouseup', chartInstance.zoom._mouseUpHandler);
			}

			delete chartInstance.zoom;

			var mc = chartInstance._mc;
			if (mc) {
				mc.remove('pinchstart');
				mc.remove('pinch');
				mc.remove('pinchend');
			}
		}
	}
};

module.exports = zoomPlugin;
